#!/usr/bin/env python3
"""Transfer high-confidence niqqud from a DOCX siddur into local Siddur JSON.

The importer deliberately keeps the application's existing letters, punctuation,
HTML tags, section structure and prayer order.  It only:

* replaces Hebrew combining marks when an entire line has an exact letter-for-
  letter match in the source document;
* removes cantillation and meteg from every line;
* inserts a missing space only when the matched source has whitespace between
  two Hebrew letters that are directly glued together locally;
* skips ambiguous matches whose source occurrences disagree about pointing.

No third-party Python packages are required; DOCX text is read directly from
the OOXML archive.

Usage:
    python scripts/import_siddur_nikud_from_docx.py SOURCE.docx
    python scripts/import_siddur_nikud_from_docx.py SOURCE.docx --apply
"""

from __future__ import annotations

import argparse
import hashlib
import html
import json
import re
import sys
import unicodedata
import zipfile
from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable
from xml.etree import ElementTree as ET


ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "src" / "data" / "siddur"
DEFAULT_TARGET = DATA_DIR / "siddur_sefard.json"
DEFAULT_REPORT = ROOT / "reports" / "siddur-nikud-import-report.json"

W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
HTML_TAG_RE = re.compile(r"<[^>]+>")
HEBREW_WORD_RE = re.compile(r"(?:[\u05d0-\u05ea][\u0591-\u05c7]*)+")


def is_hebrew_letter(char: str) -> bool:
    return "\u05d0" <= char <= "\u05ea"


def is_hebrew_mark(char: str) -> bool:
    code = ord(char)
    return 0x0591 <= code <= 0x05C7 and unicodedata.category(char) == "Mn"


def is_cantillation_or_meteg(char: str) -> bool:
    code = ord(char)
    return 0x0591 <= code <= 0x05AF or code == 0x05BD


def is_kept_nikud(char: str) -> bool:
    code = ord(char)
    return 0x05B0 <= code <= 0x05BC or code in (0x05C1, 0x05C2, 0x05C7)


def visible_text(value: str) -> str:
    return html.unescape(HTML_TAG_RE.sub("", value))


def hebrew_letters(value: str) -> str:
    return "".join(char for char in unicodedata.normalize("NFD", visible_text(value)) if is_hebrew_letter(char))


def count_chars(data: object, predicate) -> int:
    total = 0
    if isinstance(data, str):
        return sum(1 for char in data if predicate(char))
    if isinstance(data, list):
        for item in data:
            total += count_chars(item, predicate)
    elif isinstance(data, dict):
        for value in data.values():
            total += count_chars(value, predicate)
    return total


def extract_docx_text(path: Path) -> str:
    """Extract paragraph text in document order from word/document.xml."""
    with zipfile.ZipFile(path) as archive:
        root = ET.fromstring(archive.read("word/document.xml"))

    paragraphs: list[str] = []
    for paragraph in root.iter(f"{{{W_NS}}}p"):
        pieces: list[str] = []
        for node in paragraph.iter():
            if node.tag == f"{{{W_NS}}}t" and node.text:
                pieces.append(node.text)
            elif node.tag == f"{{{W_NS}}}tab":
                pieces.append("\t")
            elif node.tag in (f"{{{W_NS}}}br", f"{{{W_NS}}}cr"):
                pieces.append("\n")
        text = "".join(pieces)
        if text.strip():
            paragraphs.append(text)
    return "\n".join(paragraphs)


@dataclass(frozen=True)
class SourceCluster:
    letter: str
    nikud: str
    start: int
    end: int


def source_clusters(text: str) -> list[SourceCluster]:
    clusters: list[SourceCluster] = []
    current_letter: str | None = None
    current_marks: list[str] = []
    current_start = -1
    current_end = -1

    def flush() -> None:
        nonlocal current_letter, current_marks, current_start, current_end
        if current_letter is not None:
            clusters.append(
                SourceCluster(
                    letter=current_letter,
                    nikud="".join(mark for mark in current_marks if is_kept_nikud(mark)),
                    start=current_start,
                    end=current_end,
                )
            )
        current_letter = None
        current_marks = []

    normalized = unicodedata.normalize("NFD", text)
    for index, char in enumerate(normalized):
        if is_hebrew_letter(char):
            flush()
            current_letter = char
            current_start = index
            current_end = index + 1
        elif current_letter is not None and is_hebrew_mark(char):
            current_marks.append(char)
            current_end = index + 1
        elif current_letter is not None:
            flush()
    flush()
    return clusters


def build_candidate_index(source_letters: str, sequences: Iterable[str], prefix_length: int = 12) -> dict[str, list[int]]:
    needed = {sequence[:prefix_length] for sequence in sequences if len(sequence) >= prefix_length}
    result: dict[str, list[int]] = defaultdict(list)
    if not needed:
        return result
    last = len(source_letters) - prefix_length + 1
    for position in range(max(last, 0)):
        prefix = source_letters[position : position + prefix_length]
        if prefix in needed:
            result[prefix].append(position)
    return result


def build_unique_word_map(source: str, minimum_letters: int = 3) -> dict[str, tuple[str, ...]]:
    """Return source words that have exactly one pointed form in the DOCX."""
    variants: dict[str, set[tuple[str, ...]]] = defaultdict(set)
    for match in HEBREW_WORD_RE.finditer(source):
        word_clusters = source_clusters(match.group(0))
        letters = "".join(cluster.letter for cluster in word_clusters)
        marks = tuple(cluster.nikud for cluster in word_clusters)
        if len(letters) >= minimum_letters and any(marks):
            variants[letters].add(marks)
    return {
        letters: next(iter(pointings))
        for letters, pointings in variants.items()
        if len(pointings) == 1
    }


def boundary_has_whitespace(source: str, left: SourceCluster, right: SourceCluster) -> bool:
    return any(char.isspace() for char in source[left.end : right.start])


def fingerprint(source: str, clusters: list[SourceCluster], start: int, length: int) -> tuple[tuple[str, ...], tuple[bool, ...]]:
    selected = clusters[start : start + length]
    marks = tuple(cluster.nikud for cluster in selected)
    boundaries = tuple(
        boundary_has_whitespace(source, selected[index], selected[index + 1])
        for index in range(len(selected) - 1)
    )
    return marks, boundaries


def strip_unwanted_marks(value: str) -> tuple[str, int]:
    removed = sum(1 for char in value if is_cantillation_or_meteg(char))
    return "".join(char for char in value if not is_cantillation_or_meteg(char)), removed


def apply_pointing(value: str, marks: tuple[str, ...], boundaries: tuple[bool, ...]) -> tuple[str, int]:
    """Apply source pointing while preserving local HTML and punctuation."""
    parts = re.split(r"(<[^>]+>)", unicodedata.normalize("NFD", value))
    output: list[str] = []
    letter_index = 0
    inserted_spaces = 0

    for part in parts:
        if not part:
            continue
        if part.startswith("<") and part.endswith(">"):
            output.append(part)
            continue

        index = 0
        while index < len(part):
            char = part[index]
            if is_hebrew_letter(char):
                lookahead = index + 1
                while lookahead < len(part) and is_hebrew_mark(part[lookahead]):
                    lookahead += 1

                existing_nikud = "".join(
                    mark for mark in part[index + 1 : lookahead] if is_kept_nikud(mark)
                )
                source_nikud = marks[letter_index] if letter_index < len(marks) else ""
                output.append(char)
                # A source paragraph can contain unpointed instructions.  Such
                # a blank is not evidence that existing valid niqqud is wrong.
                output.append(source_nikud or existing_nikud)

                if (
                    lookahead < len(part)
                    and is_hebrew_letter(part[lookahead])
                    and letter_index < len(boundaries)
                    and boundaries[letter_index]
                ):
                    output.append(" ")
                    inserted_spaces += 1

                letter_index += 1
                index = lookahead
                continue

            if is_hebrew_mark(char):
                index += 1
                continue

            output.append(char)
            index += 1

    result = unicodedata.normalize("NFC", "".join(output))
    return result, inserted_spaces


def apply_unique_word_pointing(value: str, word_map: dict[str, tuple[str, ...]]) -> tuple[str, int]:
    """Point words only when the DOCX contains one unambiguous pointed form."""
    parts = re.split(r"(<[^>]+>)", unicodedata.normalize("NFD", value))
    output: list[str] = []
    changed_words = 0

    for part in parts:
        if not part:
            continue
        if part.startswith("<") and part.endswith(">"):
            output.append(part)
            continue

        last = 0
        for match in HEBREW_WORD_RE.finditer(part):
            output.append(part[last : match.start()])
            word = match.group(0)
            letters = hebrew_letters(word)
            marks = word_map.get(letters)
            if marks:
                pointed, _ = apply_pointing(word, marks, tuple(False for _ in range(max(len(marks) - 1, 0))))
                output.append(pointed)
                if unicodedata.normalize("NFC", word) != pointed:
                    changed_words += 1
            else:
                output.append(word)
            last = match.end()
        output.append(part[last:])

    return unicodedata.normalize("NFC", "".join(output)), changed_words


def iter_line_records(data: dict) -> Iterable[tuple[str, int, int, dict, int]]:
    for category_id, category in data.items():
        for section_index, section in enumerate(category.get("sections", [])):
            for line_index, _line in enumerate(section.get("lines", [])):
                yield category_id, section_index, line_index, section, line_index


def write_json(path: Path, payload: object, *, pretty: bool = False) -> None:
    if pretty:
        serialized = json.dumps(payload, ensure_ascii=False, indent=2)
    else:
        serialized = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
    path.write_text(serialized, encoding="utf-8")


def write_split_files(data: dict, target_path: Path) -> None:
    nusach = target_path.stem.removeprefix("siddur_")
    for category_id, category in data.items():
        split_path = target_path.parent / f"siddur_{nusach}_{category_id}.json"
        write_json(
            split_path,
            {"name": category.get("name", category_id), "sections": category.get("sections", [])},
        )


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path, help="Pointed Siddur DOCX source")
    parser.add_argument("--target", type=Path, default=DEFAULT_TARGET)
    parser.add_argument("--report", type=Path, default=DEFAULT_REPORT)
    parser.add_argument("--apply", action="store_true", help="Write updated full and split JSON files")
    parser.add_argument("--min-letters", type=int, default=12)
    args = parser.parse_args()

    source_path = args.source.resolve()
    target_path = args.target.resolve()
    report_path = args.report.resolve()
    if not source_path.exists():
        parser.error(f"Source not found: {source_path}")
    if not target_path.exists():
        parser.error(f"Target not found: {target_path}")

    data = json.loads(target_path.read_text(encoding="utf-8"))
    original_serialized = json.dumps(data, ensure_ascii=False, sort_keys=True)
    # Keep cluster offsets and whitespace-boundary slices in the same Unicode
    # representation.  Pointed Hebrew is frequently stored as decomposed text.
    source_text = unicodedata.normalize("NFD", extract_docx_text(source_path))
    clusters = source_clusters(source_text)
    source_letters = "".join(cluster.letter for cluster in clusters)

    sequences = {
        hebrew_letters(section["lines"][line_index])
        for _category_id, _section_index, _line_index, section, line_index in iter_line_records(data)
        if len(hebrew_letters(section["lines"][line_index])) >= args.min_letters
    }
    prefix_length = min(12, args.min_letters)
    candidate_index = build_candidate_index(source_letters, sequences, prefix_length)
    unique_word_map = build_unique_word_map(source_text)

    stats = {
        "total_lines": 0,
        "eligible_lines": 0,
        "matched_lines": 0,
        "ambiguous_lines": 0,
        "not_found_lines": 0,
        "short_lines": 0,
        "changed_lines": 0,
        "matched_hebrew_letters": 0,
        "inserted_spaces": 0,
        "word_fallback_lines": 0,
        "word_fallback_changed_words": 0,
        "removed_cantillation_or_meteg": 0,
    }
    categories: dict[str, dict[str, int]] = defaultdict(lambda: defaultdict(int))
    unresolved: list[dict[str, object]] = []

    for category_id, section_index, line_index, section, _ in iter_line_records(data):
        stats["total_lines"] += 1
        categories[category_id]["total_lines"] += 1
        original = section["lines"][line_index]
        sequence = hebrew_letters(original)

        stripped, removed = strip_unwanted_marks(original)
        stats["removed_cantillation_or_meteg"] += removed
        updated = stripped
        exact_line_matched = False

        if len(sequence) < args.min_letters:
            stats["short_lines"] += 1
            categories[category_id]["short_lines"] += 1
        else:
            stats["eligible_lines"] += 1
            categories[category_id]["eligible_lines"] += 1
            positions = [
                position
                for position in candidate_index.get(sequence[:prefix_length], [])
                if source_letters.startswith(sequence, position)
            ]
            if not positions:
                stats["not_found_lines"] += 1
                categories[category_id]["not_found_lines"] += 1
                if len(unresolved) < 250:
                    unresolved.append(
                        {
                            "reason": "not_found",
                            "category": category_id,
                            "section_index": section_index,
                            "section_title": section.get("title", ""),
                            "line_index": line_index,
                            "text": visible_text(original)[:300],
                        }
                    )
            else:
                fingerprints = {
                    fingerprint(source_text, clusters, position, len(sequence)) for position in positions
                }
                if len(fingerprints) != 1:
                    stats["ambiguous_lines"] += 1
                    categories[category_id]["ambiguous_lines"] += 1
                    if len(unresolved) < 250:
                        unresolved.append(
                            {
                                "reason": "ambiguous",
                                "occurrences": len(positions),
                                "category": category_id,
                                "section_index": section_index,
                                "section_title": section.get("title", ""),
                                "line_index": line_index,
                                "text": visible_text(original)[:300],
                            }
                        )
                else:
                    marks, boundaries = next(iter(fingerprints))
                    updated, inserted = apply_pointing(stripped, marks, boundaries)
                    if hebrew_letters(updated) != sequence:
                        raise RuntimeError(
                            f"Letter preservation failed at {category_id}/{section_index}/{line_index}"
                        )
                    if re.findall(r"<[^>]+>", updated) != re.findall(r"<[^>]+>", original):
                        raise RuntimeError(
                            f"HTML preservation failed at {category_id}/{section_index}/{line_index}"
                        )
                    stats["matched_lines"] += 1
                    stats["matched_hebrew_letters"] += len(sequence)
                    stats["inserted_spaces"] += inserted
                    categories[category_id]["matched_lines"] += 1
                    categories[category_id]["matched_hebrew_letters"] += len(sequence)
                    categories[category_id]["inserted_spaces"] += inserted
                    exact_line_matched = True

        if not exact_line_matched:
            fallback_updated, changed_words = apply_unique_word_pointing(updated, unique_word_map)
            if changed_words:
                updated = fallback_updated
                stats["word_fallback_lines"] += 1
                stats["word_fallback_changed_words"] += changed_words
                categories[category_id]["word_fallback_lines"] += 1
                categories[category_id]["word_fallback_changed_words"] += changed_words

        if updated != original:
            stats["changed_lines"] += 1
            categories[category_id]["changed_lines"] += 1
        section["lines"][line_index] = updated

    before = json.loads(original_serialized)
    validation = {
        "letters_preserved": count_chars(before, is_hebrew_letter) == count_chars(data, is_hebrew_letter),
        "cantillation_after": count_chars(data, lambda char: 0x0591 <= ord(char) <= 0x05AF),
        "meteg_after": count_chars(data, lambda char: ord(char) == 0x05BD),
        "nikud_before": count_chars(before, is_kept_nikud),
        "nikud_after": count_chars(data, is_kept_nikud),
    }
    if not validation["letters_preserved"]:
        raise RuntimeError("Global Hebrew letter count changed")
    if validation["cantillation_after"] or validation["meteg_after"]:
        raise RuntimeError("Cantillation/meteg remained after import")

    report = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "mode": "apply" if args.apply else "dry-run",
        "source": {
            "path": str(source_path),
            "sha256": hashlib.sha256(source_path.read_bytes()).hexdigest(),
            "bytes": source_path.stat().st_size,
            "hebrew_letters": len(source_letters),
        },
        "target": str(target_path),
        "policy": {
            "nusach": "sefard",
            "minimum_letters": args.min_letters,
            "full_line_exact_letter_match_required": True,
            "ambiguous_matches_skipped": True,
            "cantillation_removed": True,
            "meteg_removed": True,
            "letters_punctuation_html_preserved": True,
            "missing_spaces_inserted_only_from_exact_match": True,
            "word_fallback_requires_one_unique_pointed_form_in_source": True,
        },
        "stats": stats,
        "categories": {key: dict(value) for key, value in categories.items()},
        "validation": validation,
        "unresolved_sample": unresolved,
    }

    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")

    if args.apply:
        # The full source file is intentionally review-friendly; the split
        # runtime assets remain compact for fast browser/Android loading.
        write_json(target_path, data, pretty=True)
        write_split_files(data, target_path)

    coverage = 100 * stats["matched_lines"] / max(stats["eligible_lines"], 1)
    print(f"Mode: {'APPLY' if args.apply else 'DRY RUN'}")
    print(f"Matched lines: {stats['matched_lines']}/{stats['eligible_lines']} ({coverage:.1f}%)")
    print(f"Changed lines: {stats['changed_lines']}")
    print(f"Matched Hebrew letters: {stats['matched_hebrew_letters']}")
    print(f"Inserted missing spaces: {stats['inserted_spaces']}")
    print(
        "Unique-word fallback: "
        f"{stats['word_fallback_changed_words']} words in {stats['word_fallback_lines']} lines"
    )
    print(f"Removed cantillation/meteg: {stats['removed_cantillation_or_meteg']}")
    print(f"Niqqud: {validation['nikud_before']} -> {validation['nikud_after']}")
    print(f"Report: {report_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

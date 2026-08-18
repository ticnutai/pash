"""Download complete Hebrew Tehillim commentaries for offline app bundling.

Run only when refreshing the bundled source data. The Android/web app reads the
generated JSON files locally and never calls Sefaria during normal use.
"""

from __future__ import annotations

import json
import pathlib
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor
import time


ROOT = pathlib.Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT / "src" / "data" / "sefaria"

COMMENTARIES = {
    "Rashi": "Rashi on Psalms",
    "Ibn_Ezra": "Ibn Ezra on Psalms",
    "Radak": "Radak on Psalms",
    "Metzudat_David": "Metzudat David on Psalms",
    "Malbim": "Malbim on Psalms",
}


def fetch_ref(ref_text: str) -> dict:
    ref = urllib.parse.quote(ref_text)
    url = f"https://www.sefaria.org/api/v3/texts/{ref}?version=primary"
    request = urllib.request.Request(url, headers={"Accept": "application/json"})
    last_error: Exception | None = None
    for attempt in range(5):
        try:
            with urllib.request.urlopen(request, timeout=180) as response:
                return json.load(response)
        except Exception as error:  # transient reset/rate-limit from source server
            last_error = error
            time.sleep(2 ** attempt)
    raise RuntimeError(f"Failed to download {ref_text} after retries") from last_error


def hebrew_version(payload: dict, title: str) -> dict:

    versions = payload.get("versions", [])
    version = next((item for item in versions if item.get("language") == "he"), None)
    if not version or not isinstance(version.get("text"), list):
        raise RuntimeError(f"No Hebrew text returned for {title}")
    return version


def download(title: str) -> dict:
    version = hebrew_version(fetch_ref(title), title)
    text = version["text"]
    if len(text) != 150:
        print(f"  bulk response had {len(text)} chapters; fetching all chapters...", flush=True)

        def fetch_chapter(chapter: int) -> list:
            chapter_version = hebrew_version(fetch_ref(f"{title} {chapter}"), f"{title} {chapter}")
            return chapter_version["text"]

        with ThreadPoolExecutor(max_workers=3) as executor:
            text = list(executor.map(fetch_chapter, range(1, 151)))
    if len(text) != 150 or any(not isinstance(chapter, list) for chapter in text):
        raise RuntimeError(f"Incomplete chapter data returned for {title}")

    return {
        "title": title,
        "source": "https://www.sefaria.org/",
        "versionTitle": version.get("versionTitle", ""),
        "license": version.get("license", ""),
        "text": text,
    }


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    for file_stem, title in COMMENTARIES.items():
        target = OUTPUT_DIR / f"{file_stem}_on_Psalms.json"
        if target.exists():
            try:
                existing = json.loads(target.read_text(encoding="utf-8"))
                if len(existing.get("text", [])) == 150:
                    print(f"Skipping complete {target.name}", flush=True)
                    continue
            except (OSError, json.JSONDecodeError):
                pass
        print(f"Downloading {title}...", flush=True)
        data = download(title)
        target.write_text(
            json.dumps(data, ensure_ascii=False, separators=(",", ":")),
            encoding="utf-8",
        )
        print(f"  wrote {target.name} ({target.stat().st_size / 1024 / 1024:.2f} MiB)", flush=True)


if __name__ == "__main__":
    main()

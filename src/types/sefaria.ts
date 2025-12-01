// Types for Sefaria commentaries integration

export interface SefariaCommentary {
  mefaresh: string;        // Hebrew name: "רש\"י"
  mefareshEn: string;      // English name: "Rashi"
  text: string;            // Commentary text in Hebrew
  id: number;              // Unique ID
}

export interface SefariaPerek {
  [pasukNum: string]: SefariaCommentary[];
}

export interface SefariaData {
  [perekNum: string]: SefariaPerek;
}

// Mapping of internal book names to Sefaria names
export const SEFARIA_BOOK_NAMES: Record<string, string> = {
  bereishit: "Genesis",
  shemot: "Exodus",
  vayikra: "Leviticus",
  bamidbar: "Numbers",
  devarim: "Deuteronomy"
};

// Mapping of Hebrew commentator names to English
export const MEFARESH_MAPPING: Record<string, string> = {
  "רש\"י": "Rashi",
  "רמב\"ן": "Ramban",
  "אבן עזרא": "Ibn_Ezra",
  "ספורנו": "Sforno",
  "אור החיים": "Or_HaChaim",
  "כלי יקר": "Kli_Yakar",
  "רשב\"ם": "Rashbam",
  "חזקוני": "Chizkuni",
  "בעל הטורים": "Baal_HaTurim"
};

// Available commentaries for each book
export const AVAILABLE_COMMENTARIES = [
  { hebrew: "רש\"י", english: "Rashi" },
  { hebrew: "רמב\"ן", english: "Ramban" },
  { hebrew: "אבן עזרא", english: "Ibn_Ezra" },
  { hebrew: "ספורנו", english: "Sforno" },
  { hebrew: "אור החיים", english: "Or_HaChaim" },
  { hebrew: "כלי יקר", english: "Kli_Yakar" },
  { hebrew: "רשב\"ם", english: "Rashbam" },
  { hebrew: "חזקוני", english: "Chizkuni" },
  { hebrew: "בעל הטורים", english: "Baal_HaTurim" },
];

export const normalizeMefareshName = (name?: string): string => {
  if (!name) return "";
  let n = name.trim();

  // Common misspellings and variants
  const fixes: Array<[RegExp, string]> = [
    [/אבן\s?עזרה/g, "אבן עזרא"], // fix heh->aleph
    [/אִבְּן\s?עֶזְרָה/g, "אבן עזרא"], // niqqud variant
    [/Ibn\s?Ezra/gi, "אבן עזרא"],
  ];

  for (const [re, to] of fixes) {
    n = n.replace(re, to);
  }

  return n;
};

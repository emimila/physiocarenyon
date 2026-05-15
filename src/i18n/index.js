import { translations } from "./translations";

export function getText(lang) {
  const dict = translations[lang] || translations.it;
  const en = translations.en || {};
  const it = translations.it || {};

  function walk(root, path) {
    return path.split(".").reduce((obj, key) => obj?.[key], root);
  }

  function tt(path) {
    return walk(dict, path) ?? walk(en, path) ?? walk(it, path) ?? null;
  }

  return tt;
}
import { translations } from "./translations";

export function getText(lang) {
  const dict = translations[lang] || translations.it;

  function tt(path) {
    const result = path.split(".").reduce((obj, key) => obj?.[key], dict);
    return result ?? null;
  }

  return tt;
}
/**
 * Nomi dei mesi localizzati per `antecedentiChirurgici` (lista datata) e UI affini.
 * Niente dipendenza da Intl: lista statica per mantenere build deterministica
 * e per essere coerente con il resto delle traduzioni manuali del progetto.
 */
const MONTHS = {
  it: {
    long: [
      "gennaio",
      "febbraio",
      "marzo",
      "aprile",
      "maggio",
      "giugno",
      "luglio",
      "agosto",
      "settembre",
      "ottobre",
      "novembre",
      "dicembre",
    ],
    short: [
      "gen",
      "feb",
      "mar",
      "apr",
      "mag",
      "giu",
      "lug",
      "ago",
      "set",
      "ott",
      "nov",
      "dic",
    ],
  },
  en: {
    long: [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ],
    short: [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ],
  },
  fr: {
    long: [
      "janvier",
      "f\u00e9vrier",
      "mars",
      "avril",
      "mai",
      "juin",
      "juillet",
      "ao\u00fbt",
      "septembre",
      "octobre",
      "novembre",
      "d\u00e9cembre",
    ],
    short: [
      "janv.",
      "f\u00e9vr.",
      "mars",
      "avr.",
      "mai",
      "juin",
      "juil.",
      "ao\u00fbt",
      "sept.",
      "oct.",
      "nov.",
      "d\u00e9c.",
    ],
  },
  de: {
    long: [
      "Januar",
      "Februar",
      "M\u00e4rz",
      "April",
      "Mai",
      "Juni",
      "Juli",
      "August",
      "September",
      "Oktober",
      "November",
      "Dezember",
    ],
    short: [
      "Jan.",
      "Feb.",
      "M\u00e4rz",
      "Apr.",
      "Mai",
      "Juni",
      "Juli",
      "Aug.",
      "Sept.",
      "Okt.",
      "Nov.",
      "Dez.",
    ],
  },
  es: {
    long: [
      "enero",
      "febrero",
      "marzo",
      "abril",
      "mayo",
      "junio",
      "julio",
      "agosto",
      "septiembre",
      "octubre",
      "noviembre",
      "diciembre",
    ],
    short: [
      "ene.",
      "feb.",
      "mar.",
      "abr.",
      "may.",
      "jun.",
      "jul.",
      "ago.",
      "sept.",
      "oct.",
      "nov.",
      "dic.",
    ],
  },
};

function pickLocale(lang) {
  const code = String(lang || "").toLowerCase().split(/[-_]/)[0];
  return MONTHS[code] ? code : "it";
}

/** "1".."12" -> nome mese intero localizzato; valori non validi -> "". */
export function getMonthLong(lang, monthValue) {
  const m = Number(monthValue);
  if (!Number.isInteger(m) || m < 1 || m > 12) return "";
  return MONTHS[pickLocale(lang)].long[m - 1];
}

/** "1".."12" -> abbreviazione localizzata (per stampa scheda). */
export function getMonthShort(lang, monthValue) {
  const m = Number(monthValue);
  if (!Number.isInteger(m) || m < 1 || m > 12) return "";
  return MONTHS[pickLocale(lang)].short[m - 1];
}

/** Opzioni `<select>` 1..12 con label intera localizzata. */
export function monthOptionsLong(lang) {
  return MONTHS[pickLocale(lang)].long.map((label, i) => ({
    value: String(i + 1),
    label,
  }));
}

/** Espone la mappa per chi vuole iterarla altrove. */
export const MONTHS_BY_LOCALE = MONTHS;

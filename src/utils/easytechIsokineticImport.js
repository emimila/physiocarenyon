/**
 * Easytech "Microsoft Print to PDF" -> isokinetic table importer.
 *
 * The PDF has a real text layer (one page per speed). After we collapse the
 * text items into lines (sorted top-to-bottom, left-to-right), each line that
 * starts with one of the labels below carries a DROITE / GAUCHE pair (and
 * sometimes a third Rapport scalar pair).
 *
 * This file exposes:
 *  - EASYTECH_FIELD_RULES: declarative rules for each row.
 *  - parseEasytechPdfText(linesArray): parse the joined text lines.
 *  - validateField(rule, raw): check format + plausibility.
 *  - swapSidesInRows(rows): swap DROITE / GAUCHE on every row.
 *  - pageResultToIsokineticPatch(pageResult, opts): build the patch the form
 *    can apply to iso.rows for a given side (DX / SX).
 *  - ISO_OVERWRITE_MAP: human-readable label per iso column (for UI warnings).
 */

const NUM_RE = /[-+]?\d+(?:[.,]\d+)?/g;
const PAIR_RE =
  /(?:[-+]?\d+(?:[.,]\d+)?|\*)\s*\/\s*(?:[-+]?\d+(?:[.,]\d+)?|\*)/g;

// Use a unicode escape for e-acute (kept as a constant so this file is
// ASCII-safe and not affected by source encoding quirks).
const E_ACUTE = "\u00e9";

function num(v) {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s) return null;
  if (s === "*" || s === "\u2014" || s === "\u2013" || s === "-") return null;
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function inRange(n, min, max) {
  return n != null && Number.isFinite(n) && n >= min && n <= max;
}

function splitPair(raw) {
  if (raw == null) return [null, null];
  const s = String(raw).trim();
  if (!s) return [null, null];
  const parts = s.split("/").map((x) => x.trim());
  return [parts[0] ?? null, parts[1] ?? null];
}

// Rules for each of the 13 known rows.
//
// `labelRegex` is anchored at the start of a line and captures the rest of
// the line. `columns` is 2 for DROITE/GAUCHE rows or 3 when an extra Rapport
// scalar pair appears at the right of the line.
//
// `type` describes what the captured raw value should look like:
//   - "intPair":            "<intA>/<intB>"
//   - "intPairSignedFirst": same but A may be signed (negative)
//   - "starPair":           either star/star (allowed) or "<intA>/<intB>"
//   - "decimalPair":        "<numA>/<numB>" with optional decimals
//   - "oneOf":              a single token from `allowed` (e.g. "60/60")
//   - "rapportFlexExt":     three scalar decimals (no slash pairs)
//
// `plausibility` (if defined) constrains both members of the pair (or each
// scalar for rapportFlexExt). Star placeholders never trigger plausibility.
export const EASYTECH_FIELD_RULES = [
  {
    jsonKey: "vitesseExtFlex",
    label: "Vitesse Ext/Flex",
    labelRegex: /^Vitesse\s+Ext\/Flex\s+(.*)$/,
    columns: 2,
    type: "oneOf",
    allowed: ["60/60", "180/180", "300/300"],
  },
  {
    jsonKey: "cote",
    label: "Côté",
    labelRegex: /^C[oô]t[eé]\s+(.*)$/iu,
    columns: 2,
    type: "coteTokens",
  },
  {
    jsonKey: "repsSetExec",
    label: "# Rep. Set/Exec.",
    labelRegex: /^#\s*Rep\.\s+Set\/Exec\.\s+(.*)$/,
    columns: 2,
    type: "intPair",
    plausibility: { minA: 1, maxA: 50, minB: 1, maxB: 50 },
  },
  {
    jsonKey: "angleMouvementLimitSet",
    label: "Angle de mouvement limit Set",
    labelRegex: /^Angle de mouvement limit Set\s+(.*)$/,
    columns: 2,
    type: "starPair",
  },
  {
    jsonKey: "angleMouvementMaximal",
    label: "Angle de mouvement maximal",
    labelRegex: /^Angle de mouvement maximal\s+(.*)$/,
    columns: 3,
    type: "intPairSignedFirst",
    plausibility: { minA: -50, maxA: 30, minB: 50, maxB: 150 },
  },
  {
    jsonKey: "moyenneCoupleMaximal",
    label: "Moyenne Couple Maximal [Nm]",
    labelRegex: /^Moyenne Couple Maximal\s*\[Nm\]\s+(.*)$/,
    columns: 3,
    type: "intPair",
    plausibility: { minA: 15, maxA: 400, minB: 15, maxB: 400 },
  },
  {
    jsonKey: "coupleMaximal",
    label: "Couple Maximal[Nm]",
    labelRegex: /^Couple Maximal\[Nm\](?!\s*\/)\s+(.*)$/,
    columns: 3,
    type: "intPair",
    plausibility: { minA: 20, maxA: 400, minB: 20, maxB: 400 },
  },
  {
    jsonKey: "coupleMaximalPoids",
    label: "Couple Maximal[Nm] / Poids",
    labelRegex: /^Couple Maximal\[Nm\]\s*\/\s*Poids\s+(.*)$/,
    columns: 3,
    type: "decimalPair",
    plausibility: { minA: 0.3, maxA: 6.0, minB: 0.3, maxB: 6.0 },
  },
  {
    jsonKey: "angleAtCM",
    label: "Angle @CM",
    labelRegex: /^Angle\s*@CM\s+(.*)$/,
    columns: 2,
    type: "intPair",
    plausibility: { minA: 0, maxA: 110, minB: 0, maxB: 110 },
  },
  {
    jsonKey: "maxPuissance",
    label: "Max Puissance",
    labelRegex: /^Max Puissance\s+(.*)$/,
    columns: 3,
    type: "intPair",
    plausibility: { minA: 30, maxA: 600, minB: 30, maxB: 600 },
  },
  {
    jsonKey: "angleAtMaxPuissance",
    label: "Angle @Max Puissance",
    labelRegex: /^Angle\s*@Max Puissance\s+(.*)$/,
    columns: 3,
    type: "intPair",
    plausibility: { minA: 0, maxA: 130, minB: 0, maxB: 130 },
  },
  {
    jsonKey: "totTravail",
    label: "Tot. Travail",
    labelRegex: /^Tot\.\s+Travail\s+(.*)$/,
    columns: 2,
    type: "intPair",
    plausibility: { minA: 50, maxA: 3000, minB: 50, maxB: 3000 },
  },
  {
    jsonKey: "indexResistance",
    label: "Index de r" + E_ACUTE + "sistance %",
    labelRegex: new RegExp(
      "^Index de r" + E_ACUTE + "sistance\\s*%\\s+(.*)$"
    ),
    columns: 2,
    type: "starPair",
  },
  {
    jsonKey: "rapportFlexExt",
    label: "Rapport Flex/Ext %",
    labelRegex: /^Rapport Flex\/Ext\s*%:?\s+(.*)$/,
    columns: 3,
    type: "rapportFlexExt",
  },
];

/** Field labels for the iso.rows columns we may overwrite. */
export const ISO_OVERWRITE_MAP = {
  ptExt: "Couple max \u2014 extension (Nm)",
  ptFlex: "Couple max \u2014 flexion (Nm)",
  anglePtExt: "Angle @CM extension (\u00b0)",
  anglePtFlex: "Angle @CM flexion (\u00b0)",
  romExt: "ROM extension (\u00b0)",
  romFlex: "ROM flexion (\u00b0)",
  workExt: "Travail total \u2014 extension (J)",
  workFlex: "Travail total \u2014 flexion (J)",
};

function pickValueRows(line, rule) {
  if (rule.type === "coteTokens") {
    const s = String(line || "").trim();
    if (s.includes("/")) {
      const parts = s.split("/").map((x) => x.trim());
      return {
        droite: parts[0] || "",
        gauche: parts[1] || "",
        rapport: "",
      };
    }
    const parts = s.split(/\s+/).filter(Boolean);
    return {
      droite: parts[0] || "",
      gauche: parts[1] || "",
      rapport: "",
    };
  }
  // For lines following the rule label, pull pair-shaped substrings. Even if
  // line carries a Rapport pair (third column), the first two pairs are
  // DROITE / GAUCHE.
  const pairs = String(line).match(PAIR_RE) || [];
  const droite = pairs[0] ?? "";
  const gauche = pairs[1] ?? "";
  let rapport = "";
  if (rule.columns === 3) {
    if (rule.type === "rapportFlexExt") {
      // Three scalar decimals.
      const scalars = String(line).match(NUM_RE) || [];
      const last = scalars.slice(-3);
      rapport = last.join(" ");
    } else if (pairs[2]) {
      rapport = pairs[2];
    } else {
      // Some Rapport columns are a single decimal scalar (rare), capture last
      // number on the line.
      const tail = String(line).slice(
        pairs[1] ? line.indexOf(pairs[1]) + pairs[1].length : 0
      );
      const last = (tail.match(NUM_RE) || []).slice(-1)[0];
      rapport = last ?? "";
    }
  }
  return { droite, gauche, rapport };
}

/**
 * Main parser. Accepts an array of text lines (already grouped by Y / sorted
 * left-to-right). Returns the structured table + best-effort header.
 */
export function parseEasytechPdfText(linesArray) {
  const lines = (linesArray || [])
    .map((l) => String(l || "").replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const rows = [];
  for (const rule of EASYTECH_FIELD_RULES) {
    let raw = null;
    for (const ln of lines) {
      const m = rule.labelRegex.exec(ln);
      if (m) {
        raw = (m[1] || "").trim();
        break;
      }
    }
    if (raw == null) {
      rows.push({
        key: rule.jsonKey,
        label: rule.label,
        columns: rule.columns,
        droiteRaw: "",
        gaucheRaw: "",
        rapportRaw: "",
        missing: true,
      });
      continue;
    }
    const { droite, gauche, rapport } = pickValueRows(raw, rule);
    rows.push({
      key: rule.jsonKey,
      label: rule.label,
      columns: rule.columns,
      droiteRaw: droite,
      gaucheRaw: gauche,
      rapportRaw: rapport,
      missing: false,
    });
  }

  // Header best-effort. Defaults to empty strings; not strictly required by
  // the import flow.
  const header = {
    nom: lines[0] || "",
    dateNaissance: "",
    poids: "",
    taille: "",
    bmi: "",
    coteDominant: "",
    dateAccident: "",
  };
  for (let i = 0; i < lines.length - 1; i++) {
    if (/Date de Naissance/i.test(lines[i])) {
      const tokens = lines[i + 1].split(/\s+/);
      if (tokens.length >= 6) {
        header.dateNaissance = tokens[0];
        header.poids = tokens[1];
        header.taille = tokens[2];
        header.bmi = tokens[3];
        header.coteDominant = tokens[4];
        header.dateAccident = tokens[5];
      }
      break;
    }
  }

  return { ok: rows.some((r) => !r.missing), rows, header };
}

/**
 * Se il referto stampa più velocità sulla stessa pagina, le righe ripartono
 * più volte da "Vitesse Ext/Flex". Suddivide le righe in un array di sezioni,
 * ciascuna parsabile con {@link parseEasytechPdfText}.
 *
 * @param {string[]} linesArray
 * @returns {string[][]}
 */
export function splitEasytechPdfLinesIntoSections(linesArray) {
  const lines = (linesArray || [])
    .map((l) => String(l || "").replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const starts = [];
  for (let i = 0; i < lines.length; i++) {
    if (/^Vitesse\s+Ext\/Flex\s+/i.test(lines[i])) starts.push(i);
  }
  if (starts.length <= 1) return [lines];
  return starts.map((start, idx) =>
    lines.slice(start, idx + 1 < starts.length ? starts[idx + 1] : lines.length)
  );
}

/**
 * Validate a single field's raw value against its rule. Returns
 * `{ valid, normalized, message? }`.
 *
 * `normalized` shape depends on rule.type:
 *   - "oneOf"           -> the matched canonical token (e.g. "60/60")
 *   - "starPair" with all stars -> null
 *   - "starPair" with numbers -> [a, b] (numbers)
 *   - intPair / intPairSignedFirst / decimalPair -> [a, b] (numbers)
 *   - "rapportFlexExt"  -> [s1, s2, s3] (numbers, may include null)
 */
export function validateField(rule, raw) {
  const value = String(raw == null ? "" : raw).trim();

  if (rule.type === "coteTokens") {
    if (!value) {
      return { valid: true, normalized: "", message: null };
    }
    return { valid: true, normalized: value, message: null };
  }

  // For "Rapport Flex/Ext %" rows, the DROITE and GAUCHE columns are
  // intentionally empty (only the third "Rapport" column carries scalars).
  // Treat the empty side cell as "not applicable" rather than invalid.
  if (rule.type === "rapportFlexExt" && !value) {
    return { valid: true, normalized: null, notApplicable: true };
  }

  if (!value) {
    return { valid: false, normalized: null, message: "Vuoto" };
  }

  if (rule.type === "oneOf") {
    if (rule.allowed.includes(value)) {
      return { valid: true, normalized: value };
    }
    return {
      valid: false,
      normalized: null,
      message: "Atteso uno tra: " + rule.allowed.join(", "),
    };
  }

  if (rule.type === "rapportFlexExt") {
    const scalars = (value.match(NUM_RE) || []).map(num);
    if (scalars.length < 3) {
      return {
        valid: false,
        normalized: null,
        message: "Attesi 3 valori numerici",
      };
    }
    const triple = scalars.slice(0, 3);
    return { valid: true, normalized: triple };
  }

  if (rule.type === "starPair") {
    const [a, b] = splitPair(value);
    if (a == null || b == null) {
      return {
        valid: false,
        normalized: null,
        message: "Formato atteso: A/B oppure */*",
      };
    }
    if (a === "*" && b === "*") {
      return { valid: true, normalized: null };
    }
    if (a === "*" || b === "*") {
      return { valid: true, normalized: [num(a), num(b)] };
    }
    const aN = num(a);
    const bN = num(b);
    if (aN == null || bN == null) {
      return {
        valid: false,
        normalized: null,
        message: "Valori non numerici",
      };
    }
    return { valid: true, normalized: [aN, bN] };
  }

  // intPair, intPairSignedFirst, decimalPair
  const [aRaw, bRaw] = splitPair(value);
  if (aRaw == null || bRaw == null) {
    return {
      valid: false,
      normalized: null,
      message: "Formato atteso: A/B",
    };
  }
  const a = num(aRaw);
  const b = num(bRaw);
  if (a == null || b == null) {
    return {
      valid: false,
      normalized: null,
      message: "Valori non numerici",
    };
  }
  if (rule.type === "intPair") {
    if (!Number.isInteger(a) || !Number.isInteger(b)) {
      return {
        valid: false,
        normalized: null,
        message: "Attesi numeri interi",
      };
    }
    if (a < 0 || b < 0) {
      return {
        valid: false,
        normalized: null,
        message: "Attesi numeri non negativi",
      };
    }
  }
  if (rule.type === "intPairSignedFirst") {
    if (!Number.isInteger(a) || !Number.isInteger(b)) {
      return {
        valid: false,
        normalized: null,
        message: "Attesi numeri interi",
      };
    }
  }
  if (rule.plausibility) {
    const { minA, maxA, minB, maxB } = rule.plausibility;
    if (!inRange(a, minA, maxA)) {
      return {
        valid: false,
        normalized: [a, b],
        message:
          "Valore A fuori range plausibile (" +
          minA +
          "\u2026" +
          maxA +
          "): " +
          a,
      };
    }
    if (!inRange(b, minB, maxB)) {
      return {
        valid: false,
        normalized: [a, b],
        message:
          "Valore B fuori range plausibile (" +
          minB +
          "\u2026" +
          maxB +
          "): " +
          b,
      };
    }
  }
  return { valid: true, normalized: [a, b] };
}

/** Returns a copy of rows with droiteRaw and gaucheRaw swapped. */
export function swapSidesInRows(rows) {
  return (rows || []).map((r) => ({
    ...r,
    droiteRaw: r.gaucheRaw,
    gaucheRaw: r.droiteRaw,
  }));
}

function rowByKey(rows, key) {
  return (rows || []).find((r) => r.key === key) || null;
}

function getValidatedPair(rows, key) {
  const r = rowByKey(rows, key);
  if (!r) return { droite: null, gauche: null };
  const rule = EASYTECH_FIELD_RULES.find((x) => x.jsonKey === key);
  if (!rule) return { droite: null, gauche: null };
  const dr = validateField(rule, r.droiteRaw);
  const ga = validateField(rule, r.gaucheRaw);
  return { droite: dr, gauche: ga };
}

function detectSpeed(rows) {
  const r = rowByKey(rows, "vitesseExtFlex");
  if (!r) return null;
  const rule = EASYTECH_FIELD_RULES.find((x) => x.jsonKey === "vitesseExtFlex");
  for (const raw of [r.droiteRaw, r.gaucheRaw]) {
    const v = validateField(rule, String(raw || "").trim());
    if (v.valid && typeof v.normalized === "string") {
      const head = v.normalized.split("/")[0];
      const n = Number(head);
      if ([60, 180, 300].includes(n)) return n;
    }
  }
  return null;
}

/**
 * Build a side-specific patch from the parsed rows. Returns
 *   { speed, side, fields: { ptExt, ptFlex, anglePtExt, anglePtFlex,
 *                            workExt, workFlex, romExt, romFlex } }.
 *
 * Mapping (per the legacy importer):
 *   - ptExt / ptFlex            <- Couple Maximal[Nm] (A/B = ext/flex)
 *   - anglePtExt / anglePtFlex  <- Angle @CM (A/B = ext/flex)
 *   - workExt / workFlex        <- Tot. Travail (A/B = ext/flex)
 *   - romExt / romFlex          <- Angle de mouvement maximal:
 *                                  single ROM = max - min (B - A) per side;
 *                                  same value reused for ext and flex (only
 *                                  one motion range is reported per side per
 *                                  speed).
 */
export function pageResultToIsokineticPatch(pageResult, opts) {
  const { side } = opts || {};
  if (!pageResult || !Array.isArray(pageResult.rows)) return null;

  const speed = detectSpeed(pageResult.rows);

  const couple = getValidatedPair(pageResult.rows, "coupleMaximal");
  const angleCM = getValidatedPair(pageResult.rows, "angleAtCM");
  const work = getValidatedPair(pageResult.rows, "totTravail");
  const rom = getValidatedPair(pageResult.rows, "angleMouvementMaximal");

  const which = side === "DX" ? "droite" : "gauche";

  function pairOrNulls(slot) {
    if (!slot) return [null, null];
    const v = slot[which];
    if (!v || !v.valid || !Array.isArray(v.normalized)) return [null, null];
    return v.normalized;
  }

  const [ptExt, ptFlex] = pairOrNulls(couple);
  const [anglePtExt, anglePtFlex] = pairOrNulls(angleCM);
  const [workExt, workFlex] = pairOrNulls(work);

  let romValue = null;
  const romSlot = rom ? rom[which] : null;
  if (romSlot && romSlot.valid && Array.isArray(romSlot.normalized)) {
    const [a, b] = romSlot.normalized;
    if (Number.isFinite(a) && Number.isFinite(b)) {
      romValue = b - a;
    }
  }

  const fmtInt = (n) => (Number.isFinite(n) ? String(Math.round(n)) : "");
  const fmt2 = (n) => (Number.isFinite(n) ? String(n) : "");

  return {
    speed,
    side: side === "DX" ? "DX" : "SX",
    fields: {
      ptExt: fmtInt(ptExt),
      ptFlex: fmtInt(ptFlex),
      anglePtExt: fmtInt(anglePtExt),
      anglePtFlex: fmtInt(anglePtFlex),
      workExt: fmtInt(workExt),
      workFlex: fmtInt(workFlex),
      romExt: fmt2(romValue),
      romFlex: fmt2(romValue),
    },
  };
}

/** Helper used by both the panel preview and the import button. */
export function getRowRule(key) {
  return EASYTECH_FIELD_RULES.find((r) => r.jsonKey === key) || null;
}

/** Righe Easytech che alimentano direttamente la tabella isocinetica (UI). */
export const EASYTECH_TARGET_FIELDS = new Set([
  "coupleMaximal",
  "angleAtCM",
  "totTravail",
  "angleMouvementMaximal",
]);

function splitPairFromIsoField(field) {
  if (!field?.valid) return [null, null];
  const s = String(field.value ?? field.raw ?? "").trim();
  if (!s) return [null, null];
  const m = s.match(/^(-?\d+(?:[.,]\d+)?)\s*\/\s*(-?\d+(?:[.,]\d+)?)$/);
  if (!m) return [null, null];
  const a = Number(m[1].replace(",", "."));
  const b = Number(m[2].replace(",", "."));
  return [
    Number.isFinite(a) ? a : null,
    Number.isFinite(b) ? b : null,
  ];
}

/**
 * Costruisce l'oggetto lato (right/left) della riga isocinetica dai campi
 * validati del pannello import (coppie ext/flex, ROM da min/max).
 */
export function buildIsokineticSideFromFields(fields) {
  if (!fields || typeof fields !== "object") return null;
  const out = {};
  const setPair = (keyExt, keyFlex, f) => {
    const [a, b] = splitPairFromIsoField(f);
    if (a != null) out[keyExt] = String(Math.round(a));
    if (b != null) out[keyFlex] = String(Math.round(b));
  };
  setPair("ptExt", "ptFlex", fields.coupleMaximal);
  setPair("anglePtExt", "anglePtFlex", fields.angleAtCM);
  setPair("workExt", "workFlex", fields.totTravail);
  const [ra, rb] = splitPairFromIsoField(fields.angleMouvementMaximal);
  if (ra != null && rb != null) {
    const rom = String(Math.abs(Math.round(rb - ra)));
    out.romExt = rom;
    out.romFlex = rom;
  }
  const keys = Object.keys(out).filter(
    (k) => out[k] != null && String(out[k]).trim() !== ""
  );
  if (!keys.length) return null;
  return out;
}

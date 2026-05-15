/**
 * Modulo dedicato al grafico «Coppia massimale» del report isocinetico (PDF).
 * Usa solo riassunti numerici (ptExt / ptFlex) — non curve raw.
 */

import {
  ISOKINETIC_SPEEDS,
  classifySymmetryMinMax,
  parseIsokineticNum,
} from "./isokineticCalculations";

export const PEAK_TORQUE_MOVEMENT = {
  EXTENSION: "EXTENSION",
  FLEXION: "FLEXION",
};

export const PEAK_TORQUE_SIDE = {
  RIGHT: "RIGHT",
  LEFT: "LEFT",
};

export const PEAK_TORQUE_DATA_SOURCE = {
  PDF_NUMERIC_SUMMARY: "PDF_NUMERIC_SUMMARY",
};

export const PEAK_TORQUE_CONTRACTION = {
  CONCENTRIC: "CONCENTRIC",
};

/**
 * @typedef {Object} PeakTorqueEntry
 * @property {"EXTENSION"|"FLEXION"} movement
 * @property {60|180|300} velocityDegPerSec
 * @property {number|null} rightTorqueNm
 * @property {number|null} leftTorqueNm
 * @property {"RIGHT"|"LEFT"|null} involvedSide
 * @property {"CONCENTRIC"} contractionType
 * @property {"PDF_NUMERIC_SUMMARY"} dataSource
 */

/**
 * @typedef {Object} PeakTorqueComparison
 * @property {"EXTENSION"|"FLEXION"} movement
 * @property {60|180|300} velocityDegPerSec
 * @property {number|null} rightTorqueNm
 * @property {number|null} leftTorqueNm
 * @property {"RIGHT"|"LEFT"|null} strongerSide
 * @property {number|null} absoluteDifferenceNm
 * @property {number|null} percentDifference
 * @property {number|null} directionalLsi
 * @property {number|null} symmetryIndex
 * @property {number|null} asymmetryVsMaxPercent — (max−min)/max×100 (= 100 − simmetria min/max).
 * @property {string|null} interpretationLabel
 */

function injuredSideToPeak(side) {
  if (side === "right") return PEAK_TORQUE_SIDE.RIGHT;
  if (side === "left") return PEAK_TORQUE_SIDE.LEFT;
  return null;
}

function oppositePeakSide(side) {
  if (side === PEAK_TORQUE_SIDE.RIGHT) return PEAK_TORQUE_SIDE.LEFT;
  if (side === PEAK_TORQUE_SIDE.LEFT) return PEAK_TORQUE_SIDE.RIGHT;
  return null;
}

function torqueForMovement(sideObj, movement) {
  if (!sideObj) return null;
  return movement === PEAK_TORQUE_MOVEMENT.EXTENSION
    ? parseIsokineticNum(sideObj.ptExt)
    : parseIsokineticNum(sideObj.ptFlex);
}

/**
 * @param {PeakTorqueEntry} entry
 * @returns {PeakTorqueComparison|null}
 */
export function computePeakTorqueComparison(entry) {
  const dx = entry.rightTorqueNm;
  const sx = entry.leftTorqueNm;
  if (
    dx == null ||
    sx == null ||
    !Number.isFinite(dx) ||
    !Number.isFinite(sx) ||
    dx < 0 ||
    sx < 0
  ) {
    return null;
  }

  const strongerSide =
    dx > sx
      ? PEAK_TORQUE_SIDE.RIGHT
      : sx > dx
        ? PEAK_TORQUE_SIDE.LEFT
        : null;
  const hi = Math.max(dx, sx);
  const lo = Math.min(dx, sx);
  const absoluteDifferenceNm = hi - lo;
  const percentDifference =
    lo > 0 ? ((hi - lo) / lo) * 100 : hi > 0 ? 100 : 0;

  let directionalLsi = null;
  const involved = entry.involvedSide;
  if (involved) {
    const contra = oppositePeakSide(involved);
    const involvedNm = involved === PEAK_TORQUE_SIDE.RIGHT ? dx : sx;
    const contraNm = contra === PEAK_TORQUE_SIDE.RIGHT ? dx : sx;
    if (contraNm > 0) {
      directionalLsi = (involvedNm / contraNm) * 100;
    }
  }

  const symmetryIndex = hi > 0 ? (lo / hi) * 100 : null;
  const asymmetryVsMaxPercent =
    hi > 0 ? ((hi - lo) / hi) * 100 : null;

  let interpretationLabel = null;
  if (directionalLsi != null && involved) {
    if (directionalLsi > 100.5) {
      interpretationLabel = "involved_higher";
    } else if (directionalLsi < 99.5) {
      interpretationLabel = "involved_lower";
    } else {
      interpretationLabel = "involved_similar";
    }
  } else if (strongerSide) {
    interpretationLabel =
      strongerSide === PEAK_TORQUE_SIDE.RIGHT ? "right_higher" : "left_higher";
  } else {
    interpretationLabel = "equal";
  }

  return {
    movement: entry.movement,
    velocityDegPerSec: entry.velocityDegPerSec,
    rightTorqueNm: dx,
    leftTorqueNm: sx,
    strongerSide,
    absoluteDifferenceNm,
    percentDifference,
    directionalLsi,
    symmetryIndex,
    asymmetryVsMaxPercent,
    interpretationLabel,
  };
}

function validateTorquePair(dx, sx, movement, speed, errors) {
  const mov =
    movement === PEAK_TORQUE_MOVEMENT.EXTENSION ? "Ext" : "Flex";
  if (dx == null || !Number.isFinite(dx)) {
    errors.push(`peakTorqueMissingDx${mov}${speed}`);
  } else if (dx < 0) {
    errors.push(`peakTorqueNegativeDx${mov}${speed}`);
  }
  if (sx == null || !Number.isFinite(sx)) {
    errors.push(`peakTorqueMissingSx${mov}${speed}`);
  } else if (sx < 0) {
    errors.push(`peakTorqueNegativeSx${mov}${speed}`);
  }
}

/**
 * @param {Array} rows — righe normalizzate 60/180/300
 * @param {string} injuredSide — "left" | "right" | ""
 * @returns {{ valid: boolean, errors: string[], entries: PeakTorqueEntry[], comparisons: { extension: PeakTorqueComparison[], flexion: PeakTorqueComparison[] } }}
 */
export function buildPeakTorqueReportData(rows, injuredSide) {
  const errors = [];
  const involved = injuredSideToPeak(injuredSide);
  if (!involved) {
    errors.push("peakTorqueMissingInvolvedSide");
  }

  const rowBySpeed = new Map((rows || []).map((r) => [Number(r.speed), r]));
  for (const speed of ISOKINETIC_SPEEDS) {
    if (!rowBySpeed.has(speed)) {
      errors.push(`peakTorqueMissingSpeed${speed}`);
    }
  }

  /** @type {PeakTorqueEntry[]} */
  const entries = [];

  for (const speed of ISOKINETIC_SPEEDS) {
    const row = rowBySpeed.get(speed);
    if (!row) continue;

    const dxExt = parseIsokineticNum(row.right?.ptExt);
    const sxExt = parseIsokineticNum(row.left?.ptExt);
    const dxFlex = parseIsokineticNum(row.right?.ptFlex);
    const sxFlex = parseIsokineticNum(row.left?.ptFlex);

    validateTorquePair(dxExt, sxExt, PEAK_TORQUE_MOVEMENT.EXTENSION, speed, errors);
    validateTorquePair(dxFlex, sxFlex, PEAK_TORQUE_MOVEMENT.FLEXION, speed, errors);

    entries.push({
      movement: PEAK_TORQUE_MOVEMENT.EXTENSION,
      velocityDegPerSec: speed,
      rightTorqueNm: dxExt,
      leftTorqueNm: sxExt,
      involvedSide: involved,
      contractionType: PEAK_TORQUE_CONTRACTION.CONCENTRIC,
      dataSource: PEAK_TORQUE_DATA_SOURCE.PDF_NUMERIC_SUMMARY,
    });
    entries.push({
      movement: PEAK_TORQUE_MOVEMENT.FLEXION,
      velocityDegPerSec: speed,
      rightTorqueNm: dxFlex,
      leftTorqueNm: sxFlex,
      involvedSide: involved,
      contractionType: PEAK_TORQUE_CONTRACTION.CONCENTRIC,
      dataSource: PEAK_TORQUE_DATA_SOURCE.PDF_NUMERIC_SUMMARY,
    });
  }

  const comparisons = {
    extension: [],
    flexion: [],
  };

  for (const entry of entries) {
    const cmp = computePeakTorqueComparison(entry);
    if (!cmp) continue;
    if (entry.movement === PEAK_TORQUE_MOVEMENT.EXTENSION) {
      comparisons.extension.push(cmp);
    } else {
      comparisons.flexion.push(cmp);
    }
  }

  comparisons.extension.sort((a, b) => a.velocityDegPerSec - b.velocityDegPerSec);
  comparisons.flexion.sort((a, b) => a.velocityDegPerSec - b.velocityDegPerSec);

  const hasCompletePairs =
    comparisons.extension.length === ISOKINETIC_SPEEDS.length &&
    comparisons.flexion.length === ISOKINETIC_SPEEDS.length;

  const valid = errors.length === 0 && hasCompletePairs && involved != null;

  return {
    valid,
    errors,
    entries,
    comparisons,
    involvedSide: involved,
  };
}

export function formatPeakTorqueNm(n) {
  if (n == null || !Number.isFinite(n)) return "—";
  return n >= 100 ? String(Math.round(n)) : n.toFixed(1);
}

export function formatPeakTorquePct(n) {
  if (n == null || !Number.isFinite(n)) return "—";
  return `${n.toFixed(1)}%`;
}

function sideShortLabel(side, tt) {
  if (side === PEAK_TORQUE_SIDE.RIGHT) {
    return tt("tests.isokinetic.peakTorqueSideRight") || "DX";
  }
  if (side === PEAK_TORQUE_SIDE.LEFT) {
    return tt("tests.isokinetic.peakTorqueSideLeft") || "SX";
  }
  return "—";
}

function movementLabel(movement, tt) {
  return movement === PEAK_TORQUE_MOVEMENT.EXTENSION
    ? tt("tests.isokinetic.peakTorqueMovementExt") || "estensione"
    : tt("tests.isokinetic.peakTorqueMovementFlex") || "flessione";
}

function interpolateSynth(template, vars) {
  let s = template;
  for (const [k, v] of Object.entries(vars)) {
    s = s.split(`{${k}}`).join(v);
  }
  return s;
}

/**
 * Testo breve sotto la tabella di un singolo movimento (ext / flex).
 * @param {"EXTENSION"|"FLEXION"} movement
 * @param {Array} comparisons — PeakTorqueComparison[]
 * @param {"RIGHT"|"LEFT"} involvedPeakSide
 * @param {(k: string) => string | null} tt
 */
export function buildPeakTorqueMovementMiniConclusion(
  movement,
  comparisons,
  involvedPeakSide,
  tt
) {
  const list = (comparisons || []).filter(Boolean);
  if (list.length < 3 || !involvedPeakSide) return "";

  const symVals = list
    .map((c) => c.symmetryIndex)
    .filter((x) => x != null && Number.isFinite(x));
  const symSpread =
    symVals.length >= 2 ? Math.max(...symVals) - Math.min(...symVals) : 0;

  let worstSymCmp = list[0];
  for (const c of list) {
    if (
      c.symmetryIndex != null &&
      worstSymCmp.symmetryIndex != null &&
      c.symmetryIndex < worstSymCmp.symmetryIndex
    ) {
      worstSymCmp = c;
    } else if (worstSymCmp.symmetryIndex == null && c.symmetryIndex != null) {
      worstSymCmp = c;
    }
  }

  let symFrag = "";
  if (
    symSpread >= 4 &&
    worstSymCmp?.velocityDegPerSec != null &&
    worstSymCmp.symmetryIndex != null
  ) {
    symFrag = (tt("tests.isokinetic.peakMiniSymLowestFragment") || "")
      .replace("{speed}", String(worstSymCmp.velocityDegPerSec))
      .replace("{sym}", formatPeakTorquePct(worstSymCmp.symmetryIndex));
  }

  const directionalLsIs = list
    .map((c) => c.directionalLsi)
    .filter((x) => x != null && Number.isFinite(x));
  const lsiMin = directionalLsIs.length ? Math.min(...directionalLsIs) : null;
  const lsiMax = directionalLsIs.length ? Math.max(...directionalLsIs) : null;

  const winners = list.map((c) => c.strongerSide);
  const w0 = winners[0];
  const allSameWinner =
    w0 != null && winners.every((w) => w === w0);

  const invStrongerAll = list.every(
    (c) => c.directionalLsi != null && c.directionalLsi > 100.5
  );
  const invWeakerAll = list.every(
    (c) => c.directionalLsi != null && c.directionalLsi < 99.5
  );

  const invShort = sideShortLabel(involvedPeakSide, tt);
  const contraShort = sideShortLabel(oppositePeakSide(involvedPeakSide), tt);

  const dominantLabel =
    w0 === PEAK_TORQUE_SIDE.RIGHT
      ? sideShortLabel(PEAK_TORQUE_SIDE.RIGHT, tt)
      : w0 === PEAK_TORQUE_SIDE.LEFT
        ? sideShortLabel(PEAK_TORQUE_SIDE.LEFT, tt)
        : "";
  const otherLabel =
    w0 === PEAK_TORQUE_SIDE.RIGHT
      ? sideShortLabel(PEAK_TORQUE_SIDE.LEFT, tt)
      : w0 === PEAK_TORQUE_SIDE.LEFT
        ? sideShortLabel(PEAK_TORQUE_SIDE.RIGHT, tt)
        : "";

  const ext = movement === PEAK_TORQUE_MOVEMENT.EXTENSION;

  if (ext && invStrongerAll) {
    const raw =
      tt("tests.isokinetic.peakMiniExt_invStrongerAllSpeeds") || "";
    return raw
      .replace("{inv}", invShort)
      .replace("{contra}", contraShort)
      .replace("{symFrag}", symFrag);
  }

  if (ext && invWeakerAll) {
    const raw =
      tt("tests.isokinetic.peakMiniExt_invWeakerAllSpeeds") || "";
    return raw
      .replace("{inv}", invShort)
      .replace("{contra}", contraShort)
      .replace("{symFrag}", symFrag);
  }

  if (!ext && invStrongerAll) {
    const raw =
      tt("tests.isokinetic.peakMiniFlex_invStrongerAllSpeeds") || "";
    return raw
      .replace("{inv}", invShort)
      .replace("{contra}", contraShort)
      .replace("{symFrag}", symFrag);
  }

  if (
    !ext &&
    invWeakerAll &&
    lsiMin != null &&
    lsiMax != null &&
    contraShort
  ) {
    const raw =
      tt("tests.isokinetic.peakMiniFlex_invWeakerAllSpeeds") || "";
    return raw
      .replace("{inv}", invShort)
      .replace("{contra}", contraShort)
      .replace("{lsiMin}", formatPeakTorquePct(lsiMin))
      .replace("{lsiMax}", formatPeakTorquePct(lsiMax))
      .replace("{symFrag}", symFrag);
  }

  if (allSameWinner && w0 != null && dominantLabel && otherLabel) {
    const key = ext
      ? "tests.isokinetic.peakMiniExt_sameWinnerMixedDir"
      : "tests.isokinetic.peakMiniFlex_sameWinnerMixedDir";
    const raw = tt(key) || "";
    return raw
      .replace("{dominant}", dominantLabel)
      .replace("{other}", otherLabel)
      .replace("{inv}", invShort);
  }

  return tt("tests.isokinetic.peakMiniMixedPattern") || "";
}

function symmetrySpreadInList(list) {
  const s = (list || [])
    .map((c) => c.symmetryIndex)
    .filter((x) => x != null && Number.isFinite(x));
  if (s.length < 2) return 0;
  return Math.max(...s) - Math.min(...s);
}

/**
 * Nota descrittiva tabella (non diagnostica).
 * @param {object} cmp — PeakTorqueComparison
 * @param {object[]} movementList
 * @param {"RIGHT"|"LEFT"} involvedPeakSide
 */
export function peakTorqueBriefInterpretationRow(
  cmp,
  movementList,
  involvedPeakSide,
  tt
) {
  if (
    !cmp ||
    !involvedPeakSide ||
    !Array.isArray(movementList) ||
    movementList.length === 0
  ) {
    return "—";
  }

  const spread = symmetrySpreadInList(movementList);
  const ranked = [...movementList]
    .filter((c) => c.symmetryIndex != null && Number.isFinite(c.symmetryIndex))
    .sort((a, b) => a.symmetryIndex - b.symmetryIndex);
  const worst = ranked[0];
  const best = ranked[ranked.length - 1];
  const isWorst =
    ranked.length >= 2 &&
    worst &&
    cmp.velocityDegPerSec === worst.velocityDegPerSec;
  const isBest =
    ranked.length >= 2 &&
    best &&
    cmp.velocityDegPerSec === best.velocityDegPerSec;

  const symClass = classifySymmetryMinMax(cmp.symmetryIndex);

  let symLabelKey = `tests.isokinetic.peakBriefSym_${symClass}`;
  if (spread >= 5 && isWorst) {
    symLabelKey = "tests.isokinetic.peakBriefSym_relativeWorst";
  } else if (spread >= 5 && isBest) {
    symLabelKey = "tests.isokinetic.peakBriefSym_relativeBest";
  }

  let symPart = tt(symLabelKey);
  if (!symPart || symPart === symLabelKey) {
    const fb = tt(`tests.isokinetic.peakBriefSym_${symClass}`);
    symPart =
      fb && fb !== `tests.isokinetic.peakBriefSym_${symClass}`
        ? fb
        : tt("tests.isokinetic.peakBriefSym_fallback") || "—";
  }

  const invShort = sideShortLabel(involvedPeakSide, tt);

  let dirPart = tt("tests.isokinetic.peakBriefDir_equal") || "—";
  if (!cmp.strongerSide) {
    dirPart = (tt("tests.isokinetic.peakBriefDir_equal") || "").replace(
      "{inv}",
      invShort
    );
  } else if (cmp.strongerSide === involvedPeakSide) {
    dirPart = (tt("tests.isokinetic.peakBriefDir_invHigher") || "").replace(
      "{inv}",
      invShort
    );
  } else {
    const slight =
      cmp.directionalLsi != null &&
      cmp.directionalLsi >= 93 &&
      cmp.directionalLsi < 99.5;
    const tplKey = slight
      ? "tests.isokinetic.peakBriefDir_invLowerSlight"
      : "tests.isokinetic.peakBriefDir_invLower";
    dirPart = (tt(tplKey) || "").replace("{inv}", invShort);
  }

  const combinedTpl = tt("tests.isokinetic.peakBriefCombined");
  if (!combinedTpl || combinedTpl === "tests.isokinetic.peakBriefCombined") {
    return `${dirPart}; ${symPart}`;
  }
  return combinedTpl.replace("{dir}", dirPart).replace("{sym}", symPart);
}

function aggregateMovementPhrase(arr, involvedPeakSide, tt, baseKey) {
  const opp = oppositePeakSide(involvedPeakSide);
  const invShort = sideShortLabel(involvedPeakSide, tt);
  const allInv = (arr || []).every((c) => c.strongerSide === involvedPeakSide);
  const allOpp = (arr || []).every((c) => c.strongerSide === opp);
  if (allInv && arr?.length) {
    const key = `tests.isokinetic.${baseKey}_invHigherAll`;
    const raw = tt(key);
    return raw && raw !== key ? raw.replace("{inv}", invShort) : invShort;
  }
  if (allOpp && arr?.length) {
    const key = `tests.isokinetic.${baseKey}_invLowerAll`;
    const raw = tt(key);
    return raw && raw !== key ? raw.replace("{inv}", invShort) : invShort;
  }
  const kMixed = `tests.isokinetic.${baseKey}_mixed`;
  const rawM = tt(kMixed);
  return rawM && rawM !== kMixed ? rawM.replace("{inv}", invShort) : invShort;
}

/**
 * Sintesi finale pagina «Coppia massimale» (solo picchi).
 */
export function buildPeakTorqueSynthesis(comparisons, tt, injuredSide) {
  const involved = injuredSideToPeak(injuredSide);
  const ext60 =
    comparisons.extension.find((c) => c.velocityDegPerSec === 60) || null;
  const flex60 =
    comparisons.flexion.find((c) => c.velocityDegPerSec === 60) || null;

  if (!involved || !ext60 || !flex60) {
    const parts = [];
    if (ext60?.strongerSide) {
      const dx = formatPeakTorqueNm(ext60.rightTorqueNm);
      const sx = formatPeakTorqueNm(ext60.leftTorqueNm);
      const strongerLabel = sideShortLabel(ext60.strongerSide, tt);
      const raw =
        tt("tests.isokinetic.peakTorqueSynthExt60Stronger") ||
        "At 60°/s extension peak torque is higher on the {side} side vs the contralateral side, {dx} vs {sx} Nm.";
      parts.push(interpolateSynth(raw, { side: strongerLabel, dx, sx }));
    }
    if (flex60?.strongerSide) {
      const dx = formatPeakTorqueNm(flex60.rightTorqueNm);
      const sx = formatPeakTorqueNm(flex60.leftTorqueNm);
      const strongerLabel = sideShortLabel(flex60.strongerSide, tt);
      const raw =
        tt("tests.isokinetic.peakTorqueSynthFlex60Stronger") ||
        "In flexion, the {side} side is higher, {dx} vs {sx} Nm.";
      parts.push(interpolateSynth(raw, { side: strongerLabel, dx, sx }));
    }
    parts.push(
      tt("tests.isokinetic.peakTorqueSynthDisclaimer") ||
        "Il grafico descrive solo il picco massimo di coppia."
    );
    return parts.filter(Boolean).join(" ");
  }

  const invShort = sideShortLabel(involved, tt);
  const invNmExt =
    involved === PEAK_TORQUE_SIDE.RIGHT
      ? ext60.rightTorqueNm
      : ext60.leftTorqueNm;
  const coNmExt =
    involved === PEAK_TORQUE_SIDE.RIGHT
      ? ext60.leftTorqueNm
      : ext60.rightTorqueNm;
  const invNmFlex =
    involved === PEAK_TORQUE_SIDE.RIGHT
      ? flex60.rightTorqueNm
      : flex60.leftTorqueNm;
  const coNmFlex =
    involved === PEAK_TORQUE_SIDE.RIGHT
      ? flex60.leftTorqueNm
      : flex60.rightTorqueNm;

  const fmtPair = (a, b) =>
    `${formatPeakTorqueNm(a)} vs ${formatPeakTorqueNm(b)}`;

  let lineExt60 = "";
  if (
    invNmExt != null &&
    coNmExt != null &&
    Number.isFinite(invNmExt) &&
    Number.isFinite(coNmExt)
  ) {
    if (invNmExt > coNmExt + 0.05) {
      lineExt60 = (tt("tests.isokinetic.peakSynthExt60_invHigher") || "")
        .replace("{inv}", invShort)
        .replace("{pair}", fmtPair(invNmExt, coNmExt));
    } else if (invNmExt < coNmExt - 0.05) {
      lineExt60 = (tt("tests.isokinetic.peakSynthExt60_invLower") || "")
        .replace("{inv}", invShort)
        .replace("{pair}", fmtPair(invNmExt, coNmExt));
    } else {
      lineExt60 = (tt("tests.isokinetic.peakSynthExt60_similar") || "")
        .replace("{inv}", invShort)
        .replace("{pair}", fmtPair(invNmExt, coNmExt));
    }
  }

  let lineFlex60 = "";
  if (
    invNmFlex != null &&
    coNmFlex != null &&
    Number.isFinite(invNmFlex) &&
    Number.isFinite(coNmFlex)
  ) {
    const slight = Math.abs(invNmFlex - coNmFlex) <= 6;
    if (invNmFlex > coNmFlex + 0.05) {
      lineFlex60 = (tt("tests.isokinetic.peakSynthFlex60_invHigher") || "")
        .replace("{inv}", invShort)
        .replace("{pair}", fmtPair(invNmFlex, coNmFlex));
    } else if (invNmFlex < coNmFlex - 0.05) {
      const key = slight
        ? "tests.isokinetic.peakSynthFlex60_invLowerSlight"
        : "tests.isokinetic.peakSynthFlex60_invLower";
      lineFlex60 = (tt(key) || "")
        .replace("{inv}", invShort)
        .replace("{pair}", fmtPair(invNmFlex, coNmFlex));
    } else {
      lineFlex60 = (tt("tests.isokinetic.peakSynthFlex60_similar") || "")
        .replace("{inv}", invShort)
        .replace("{pair}", fmtPair(invNmFlex, coNmFlex));
    }
  }

  const extAgg = aggregateMovementPhrase(
    comparisons.extension,
    involved,
    tt,
    "peakSynthAgg_ext"
  );
  const flexAgg = aggregateMovementPhrase(
    comparisons.flexion,
    involved,
    tt,
    "peakSynthAgg_flex"
  );

  const lineAll =
    (tt("tests.isokinetic.peakSynthAllSpeeds") || "")
      .replace("{extAgg}", extAgg)
      .replace("{flexAgg}", flexAgg) || "";

  const disclaimer =
    tt("tests.isokinetic.peakTorqueSynthDisclaimer") ||
    "Il grafico descrive solo il picco massimo di coppia.";

  return [lineExt60, lineFlex60, lineAll, disclaimer].filter(Boolean).join(" ");
}

export function peakTorqueErrorMessage(code, tt) {
  const key = `tests.isokinetic.${code}`;
  const msg = tt(key);
  if (msg && msg !== key) return msg;
  if (code.startsWith("peakTorqueMissing")) {
    return (
      tt("tests.isokinetic.peakTorqueErrorMissingValue") ||
      "Valore di coppia massimale mancante o non valido."
    );
  }
  return tt("tests.isokinetic.peakTorqueErrorGeneric") || code;
}

export { movementLabel, sideShortLabel };

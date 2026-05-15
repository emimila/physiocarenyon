/** Velocità standard test isocinetico (°/s). */
export const ISOKINETIC_SPEEDS = [60, 180, 300];

/** Ripetizioni fisse per velocità (protocollo attuale). */
export function fixedRepsForSpeed(speed) {
  if (speed === 60) return "5";
  if (speed === 180) return "20";
  if (speed === 300) return "15";
  return "";
}

export function parseIsokineticNum(v) {
  if (v === "" || v == null) return null;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

/**
 * Stima coppia media (Nm) da lavoro ÷ arco angolare: θ = ripetizioni × ROM (°) in radianti.
 * Utile quando il dinamometro non espone la media esplicita; richiede ROM e lavoro coerenti (es. J).
 */
export function estimateMeanTorqueFromWorkNm(workStr, romDegStr, speed) {
  const W = parseIsokineticNum(workStr);
  const romDeg = parseIsokineticNum(romDegStr);
  const repsStr = fixedRepsForSpeed(speed);
  const reps = parseIsokineticNum(repsStr);
  const repsN = reps != null && reps > 0 ? reps : 1;
  if (W == null || W <= 0) return null;
  if (romDeg == null || romDeg <= 0) return null;
  const thetaRad = (repsN * romDeg * Math.PI) / 180;
  if (thetaRad <= 1e-9) return null;
  return W / thetaRad;
}

/** H/Q % = PT flessori / PT estensori × 100 */
export function hqPercent(ptFlex, ptExt) {
  if (ptExt == null || ptExt === 0) return null;
  if (ptFlex == null) return null;
  return (ptFlex / ptExt) * 100;
}

/** LSI = lato leso / lato sano × 100 */
export function lsiPercent(ptInjured, ptHealthy) {
  if (ptHealthy == null || ptHealthy === 0) return null;
  if (ptInjured == null) return null;
  return (ptInjured / ptHealthy) * 100;
}

/** Deficit % = (sano − leso) / sano × 100 */
export function deficitPercent(ptHealthy, ptInjured) {
  if (ptHealthy == null || ptHealthy === 0) return null;
  if (ptInjured == null) return null;
  return ((ptHealthy - ptInjured) / ptHealthy) * 100;
}

/** Differenza (leso − sano) per ROM o angolo */
export function diffInjuredMinusHealthy(vInjured, vHealthy) {
  if (vInjured == null || vHealthy == null) return null;
  return vInjured - vHealthy;
}

/**
 * Vecchia macro-classificazione LSI (% coinvolto / controlaterale).
 * Non va usata come «simmetria» quando il rapporto supera 100%.
 * Preferire classifyDirectionalLsiVsContralateral + classifySymmetryMinMax.
 */
export function classifyLsi(pct) {
  if (pct == null || !Number.isFinite(pct)) return null;
  if (pct > 95) return "optimal";
  if (pct >= 90) return "acceptable";
  return "deficit";
}

/** Simmetria assoluta picchi DX/SX: min/max × 100 (mai >100%). */
export function symmetryMinMaxPercent(dx, sx) {
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
  const hi = Math.max(dx, sx);
  const lo = Math.min(dx, sx);
  if (hi <= 0) return null;
  return (lo / hi) * 100;
}

/**
 * Fascia clinica sulla simmetria min/max (non sul LSI direzionale >100%).
 * @returns {"symHigh"|"symAcceptable"|"symModerateAsym"|"symSevereAsym"|null}
 */
export function classifySymmetryMinMax(symPct) {
  if (symPct == null || !Number.isFinite(symPct)) return null;
  if (symPct >= 95) return "symHigh";
  if (symPct >= 90) return "symAcceptable";
  if (symPct >= 80) return "symModerateAsym";
  return "symSevereAsym";
}

/**
 * Rapporto lato interessato / controlaterale (può superare 100%).
 * @returns {"dirInvolvedHigher"|"dirInvolvedSimilar"|"dirInvolvedLower"|null}
 */
export function classifyDirectionalLsiVsContralateral(lsiPct) {
  if (lsiPct == null || !Number.isFinite(lsiPct)) return null;
  if (lsiPct > 100.5) return "dirInvolvedHigher";
  if (lsiPct < 99.5) return "dirInvolvedLower";
  return "dirInvolvedSimilar";
}

/** Chi ha il picco più alto (solo anatomico). */
export function comparePeakTorqueSides(dr, dl) {
  if (dr == null || dl == null || !Number.isFinite(dr) || !Number.isFinite(dl))
    return null;
  if (Math.abs(dr - dl) < 0.05) return "equal";
  return dr > dl ? "rightHigher" : "leftHigher";
}

/**
 * Classificazione H/Q concentrico per velocità (bande guida clinica).
 * Ritorna: low | expected | transition | high
 */
export function classifyHqBand(speed, hq) {
  if (hq == null || !Number.isFinite(hq)) return null;
  if (speed === 60) {
    if (hq < 55) return "low";
    if (hq <= 65) return "expected";
    if (hq <= 70) return "transition";
    return "high";
  }
  if (speed === 180) {
    if (hq < 60) return "low";
    if (hq <= 75) return "expected";
    if (hq <= 80) return "transition";
    return "high";
  }
  if (speed === 300) {
    if (hq < 65) return "low";
    if (hq <= 85) return "expected";
    if (hq < 90) return "transition";
    return "high";
  }
  return null;
}

export function formatPct1(n) {
  if (n == null || !Number.isFinite(n)) return null;
  return `${n.toFixed(1)}%`;
}

export function formatDeg1(n) {
  if (n == null || !Number.isFinite(n)) return null;
  return `${n.toFixed(1)}°`;
}

export function healthySideFromInjured(injuredSide) {
  if (injuredSide === "left") return "right";
  if (injuredSide === "right") return "left";
  return null;
}

export function computeRowMetrics(row, injuredSide) {
  const healthy = healthySideFromInjured(injuredSide);
  if (!healthy || !row) return null;

  const inj = row[injuredSide] || {};
  const hel = row[healthy] || {};

  const ptExtI = parseIsokineticNum(inj.ptExt);
  const ptFlexI = parseIsokineticNum(inj.ptFlex);
  const ptExtH = parseIsokineticNum(hel.ptExt);
  const ptFlexH = parseIsokineticNum(hel.ptFlex);

  const hqI = hqPercent(ptFlexI, ptExtI);
  const hqH = hqPercent(ptFlexH, ptExtH);

  const lsiExt = lsiPercent(ptExtI, ptExtH);
  const lsiFlex = lsiPercent(ptFlexI, ptFlexH);

  const ptExtR = parseIsokineticNum(row.right?.ptExt);
  const ptExtL = parseIsokineticNum(row.left?.ptExt);
  const ptFlexR = parseIsokineticNum(row.right?.ptFlex);
  const ptFlexL = parseIsokineticNum(row.left?.ptFlex);

  const symmetryExt = symmetryMinMaxPercent(ptExtR, ptExtL);
  const symmetryFlex = symmetryMinMaxPercent(ptFlexR, ptFlexL);

  const defExt = deficitPercent(ptExtH, ptExtI);
  const defFlex = deficitPercent(ptFlexH, ptFlexI);

  const romExtI = parseIsokineticNum(inj.romExt);
  const romExtH = parseIsokineticNum(hel.romExt);
  const romFlexI = parseIsokineticNum(inj.romFlex);
  const romFlexH = parseIsokineticNum(hel.romFlex);

  const angExtI = parseIsokineticNum(inj.anglePtExt);
  const angExtH = parseIsokineticNum(hel.anglePtExt);
  const angFlexI = parseIsokineticNum(inj.anglePtFlex);
  const angFlexH = parseIsokineticNum(hel.anglePtFlex);

  return {
    speed: row.speed,
    hqInjured: hqI,
    hqHealthy: hqH,
    hqBandInjured: classifyHqBand(row.speed, hqI),
    hqBandHealthy: classifyHqBand(row.speed, hqH),
    lsiExt,
    lsiFlex,
    symmetryExt,
    symmetryFlex,
    symmetryExtClass: classifySymmetryMinMax(symmetryExt),
    symmetryFlexClass: classifySymmetryMinMax(symmetryFlex),
    directionalExtClass: classifyDirectionalLsiVsContralateral(lsiExt),
    directionalFlexClass: classifyDirectionalLsiVsContralateral(lsiFlex),
    compareExt: comparePeakTorqueSides(ptExtR, ptExtL),
    compareFlex: comparePeakTorqueSides(ptFlexR, ptFlexL),
    deficitExt: defExt,
    deficitFlex: defFlex,
    diffRomExt: diffInjuredMinusHealthy(romExtI, romExtH),
    diffRomFlex: diffInjuredMinusHealthy(romFlexI, romFlexH),
    diffAngleExt: diffInjuredMinusHealthy(angExtI, angExtH),
    diffAngleFlex: diffInjuredMinusHealthy(angFlexI, angFlexH),
  };
}

function emptyIsokineticSide() {
  return {
    ptExt: "",
    ptFlex: "",
    anglePtExt: "",
    anglePtFlex: "",
    romExt: "",
    romFlex: "",
    workExt: "",
    workFlex: "",
  };
}

/** Riga isocinetica completa (stesso schema del form / sanitize). */
export function normalizeIsokineticRow(existing, speed) {
  const ex = existing && Number(existing.speed) === speed ? existing : null;
  return {
    ...(ex || {}),
    speed,
    reps: fixedRepsForSpeed(speed),
    left: { ...emptyIsokineticSide(), ...(ex?.left || {}) },
    right: { ...emptyIsokineticSide(), ...(ex?.right || {}) },
  };
}

export function ensureIsokineticShape(iso) {
  const wc = iso?.weightConfirmation;
  const weightConfirmation =
    wc === "chart" || wc === "manual" || wc === "pending" ? wc : "pending";
  const rawFocus = Number(iso?.clinicalFocusSpeed);
  const clinicalFocusSpeed = [60, 180, 300].includes(rawFocus) ? rawFocus : 60;
  const chartsIn = iso?.easytechPdfCharts60;
  const easytechPdfCharts60 =
    chartsIn &&
    typeof chartsIn === "object" &&
    Number(chartsIn.version) === 1 &&
    Array.isArray(chartsIn.images) &&
    chartsIn.images.length
      ? {
          version: 1,
          images: chartsIn.images.filter(
            (im) =>
              im &&
              typeof im.dataUrl === "string" &&
              im.dataUrl.startsWith("data:") &&
              Number(im.nativeW) > 0 &&
              Number(im.nativeH) > 0
          ),
        }
      : null;
  const base = {
    injuredSide: iso?.injuredSide ?? "",
    clinicalFocusSpeed,
    weightConfirmation,
    manualWeightKg: iso?.manualWeightKg ?? "",
    bodyWeightKgUsed: iso?.bodyWeightKgUsed ?? "",
    rows: ISOKINETIC_SPEEDS.map((speed) => {
      const existing = (iso?.rows || []).find((r) => Number(r.speed) === speed);
      return normalizeIsokineticRow(existing, speed);
    }),
  };
  if (easytechPdfCharts60?.images?.length) {
    base.easytechPdfCharts60 = easytechPdfCharts60;
  }
  return base;
}

/** Righe normalizzate per report / PDF (stesso schema del form). */
/** Coppia (Nm) / peso corporeo (kg) → Nm/kg */
export function torquePerBodyWeightNmPerKg(torqueNm, weightKg) {
  if (torqueNm == null || !Number.isFinite(torqueNm)) return null;
  if (weightKg == null || !Number.isFinite(weightKg) || weightKg === 0)
    return null;
  return torqueNm / weightKg;
}

export function formatTorquePerWeight(n) {
  if (n == null || !Number.isFinite(n)) return null;
  return n.toFixed(2);
}

/** Peso (kg) usato per CM/peso: scheda se confermato, altrimenti manuale. */
export function effectiveIsokineticBodyWeightKg(patient, iso) {
  if (!iso || iso.weightConfirmation === "pending") return null;
  if (iso.weightConfirmation === "manual") {
    return parseIsokineticNum(iso.manualWeightKg);
  }
  return parseIsokineticNum(patient?.peso);
}

export function normalizeIsokineticRowsForReport(iso) {
  return ISOKINETIC_SPEEDS.map((speed) => {
    const existing = (iso?.rows || []).find((r) => Number(r.speed) === speed);
    return {
      speed,
      reps: fixedRepsForSpeed(speed),
      left: { ...emptyIsokineticSide(), ...(existing?.left || {}) },
      right: { ...emptyIsokineticSide(), ...(existing?.right || {}) },
    };
  });
}

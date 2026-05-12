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

/** LSI estensori/flessori: >95 ottimale, 90–95 accettabile, <90 deficit */
export function classifyLsi(pct) {
  if (pct == null || !Number.isFinite(pct)) return null;
  if (pct > 95) return "optimal";
  if (pct >= 90) return "acceptable";
  return "deficit";
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
    lsiExtClass: classifyLsi(lsiExt),
    lsiFlexClass: classifyLsi(lsiFlex),
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
  return {
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

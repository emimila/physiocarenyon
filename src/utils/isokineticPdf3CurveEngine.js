/**
 * PDF3 — Confronto qualitativo curva coppia-angolo (60°/s).
 *
 * Il modello dati attuale salva solo picchi, ROM, lavoro e angoli al picco per lato.
 * Non sono disponibili campionamenti raw per singola ripetizione: i valori di picco
 * (ptExt / ptFlex) rappresentano già il massimo della sessione a quella velocità.
 * Qui ricostruiamo curve torque–angolo plausibili e coerenti con tali riassunti,
 * per alimentare confronto visivo e metriche qualitative (forma, build-up, ecc.).
 */

import {
  computeRowMetrics,
  hqPercent,
  parseIsokineticNum,
} from "./isokineticCalculations";

const SPEED = 60;

function clamp(n, a, b) {
  return Math.min(b, Math.max(a, n));
}

/** Campiona una campana attorno al picco (estensione o flessione) su un intervallo angolare fissato. */
function bellBranch({
  peakTorque,
  peakAngleDeg,
  romDeg,
  angleMin,
  angleMax,
  nPoints,
  irregularity, // 0–1, più alto = più “rumore” e micro-oscillazioni
  phaseSeed,
}) {
  const pt = peakTorque > 0 ? peakTorque : 0;
  const span = Math.max(12, angleMax - angleMin);
  const peakRaw = Number.isFinite(peakAngleDeg)
    ? peakAngleDeg
    : angleMin + span * 0.45;
  const peak = clamp(peakRaw, angleMin + span * 0.08, angleMax - span * 0.08);
  const rom = Number.isFinite(romDeg) && romDeg > 10 ? romDeg : 55;
  /* Sigma leggermente più ampia → lobi un po’ più “lunghi” sull’asse angolare (PDF3/4). */
  const sigma = clamp(rom / 2.62, 6, span * 0.46);
  const out = [];
  const step = (angleMax - angleMin) / Math.max(1, nPoints - 1);
  for (let i = 0; i < nPoints; i++) {
    const ang = angleMin + i * step;
    const d = ang - peak;
    let t = pt * Math.exp(-(d * d) / (2 * sigma * sigma));
    if (irregularity > 0.02) {
      const wobble =
        irregularity *
        pt *
        0.06 *
        (Math.sin(ang * 0.35 + phaseSeed * 2.1) +
          0.45 * Math.sin(ang * 0.72 - phaseSeed * 1.3));
      t = Math.max(0, t + wobble);
    }
    out.push({ angle: ang, torque: t });
  }
  return out;
}

/** Concatena ext + flex (due lobi su asse comune, come referto clinico). */
function concatExtensionFlexion(extPts, flexPts) {
  return [...extPts, ...flexPts].sort((a, b) => a.angle - b.angle);
}

/**
 * Irregularità sintetica: maggiore deficit estensori / minor work relativo → curva più “nervosa”.
 */
function irregularityForSide(side, otherSide, injuredSide, sideKey) {
  const ptE = parseIsokineticNum(side?.ptExt) || 0;
  const ptEO = parseIsokineticNum(otherSide?.ptExt) || 0;
  const wE = parseIsokineticNum(side?.workExt);
  const wEO = parseIsokineticNum(otherSide?.workExt);
  let base = 0.12;
  if (ptEO > 0 && ptE > 0) {
    const ratio = ptE / ptEO;
    if (injuredSide === sideKey && ratio < 0.92) base += (0.92 - ratio) * 0.55;
    if (injuredSide !== sideKey && ratio > 1.08) base += 0.04;
  }
  if (wE != null && wEO != null && wEO > 0 && wE < wEO * 0.88) {
    base += 0.08;
  }
  return clamp(base, 0.08, 0.62);
}

/**
 * Coppia «Angle de mouvement maximal» del referto: due estremi reali dell'arco (°),
 * non «ROM ext» e «ROM flex» come ampiezze separate. Esempio -2 / 101 → arco [-2°, 101°].
 */
function movementArcEndpoints(side) {
  const a = parseIsokineticNum(side?.romExt);
  const b = parseIsokineticNum(side?.romFlex);
  if (a == null || b == null || !Number.isFinite(a) || !Number.isFinite(b)) return null;
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  if (hi - lo < 12) return null;
  return { lo, hi };
}

/** Unione arco destro/sinistro per assi e campionamento comuni (PDF3/4). */
function movementArcUnion(row60) {
  const L = row60?.left || {};
  const R = row60?.right || {};
  const l = movementArcEndpoints(L);
  const r = movementArcEndpoints(R);
  if (l && r) return { lo: Math.min(l.lo, r.lo), hi: Math.max(l.hi, r.hi) };
  return l || r || null;
}

/**
 * Se «Angle @CM» ext > flex, i due angoli sono quasi sempre invertiti in digitazione:
 * per il grafico li scambiamo (coppie max restano ptExt / ptFlex).
 */
function chartAnglesForSide(side) {
  let ae = parseIsokineticNum(side?.anglePtExt);
  let af = parseIsokineticNum(side?.anglePtFlex);
  if (
    ae != null &&
    af != null &&
    Number.isFinite(ae) &&
    Number.isFinite(af) &&
    ae > af
  ) {
    const ta = ae;
    ae = af;
    af = ta;
  }
  return { ae, af };
}

function globalXBoundsFromRow(row60) {
  const arc = movementArcUnion(row60);
  if (arc) {
    const pad = 6;
    const xMin = Math.max(-20, Math.floor((arc.lo - pad) / 5) * 5);
    const xMax = Math.min(155, Math.ceil((arc.hi + pad) / 5) * 5);
    return { xMin, xMax: Math.max(xMax, xMin + 35), arc };
  }
  /* Fallback: nessun arco valido — stima dagli angoli @ CM (non usare re/rf come ROM). */
  const L = row60?.left || {};
  const R = row60?.right || {};
  let lo = Infinity;
  let hi = -Infinity;
  for (const s of [L, R]) {
    const { ae, af } = chartAnglesForSide(s);
    const e = ae ?? 35;
    const f = af ?? 90;
    lo = Math.min(lo, e - 35, f - 35);
    hi = Math.max(hi, e + 35, f + 35);
  }
  const pad = 8;
  const xMin = Math.max(-20, Math.floor((lo - pad) / 5) * 5);
  const xMax = Math.min(155, Math.ceil((hi + pad) / 5) * 5);
  return { xMin, xMax: Math.max(xMax, xMin + 35), arc: null };
}

function bellWindowsForSide(side, xGlobMin, xGlobMax) {
  const { ae, af } = chartAnglesForSide(side);
  const sideArc = movementArcEndpoints(side);
  const lo = sideArc
    ? clamp(Math.max(xGlobMin, sideArc.lo), xGlobMin, xGlobMax - 15)
    : xGlobMin;
  const hi = sideArc
    ? clamp(Math.min(xGlobMax, sideArc.hi), xGlobMin + 15, xGlobMax)
    : xGlobMax;
  const e = ae ?? lo + (hi - lo) * 0.32;
  const f = af ?? lo + (hi - lo) * 0.68;
  let split = (e + f) / 2;
  split = clamp(split, lo + 8, hi - 8);
  const gap = 4;
  let extMin = lo;
  let extMax = split - gap / 2;
  let flexMin = split + gap / 2;
  let flexMax = hi;
  extMin = Math.min(extMin, e - 6);
  extMax = Math.max(extMax, e + 6);
  extMin = clamp(extMin, lo, split - gap - 1);
  extMax = clamp(extMax, lo + 8, split - gap / 2);
  flexMin = Math.min(flexMin, f - 6);
  flexMax = Math.max(flexMax, f + 6);
  flexMin = clamp(flexMin, split + gap / 2, hi - 8);
  flexMax = clamp(flexMax, split + gap + 1, hi);
  if (extMax <= extMin + 6) extMax = Math.min(split - gap / 2, extMin + 22);
  if (flexMax <= flexMin + 6) flexMax = Math.min(hi, flexMin + 22);
  return {
    extAngleMin: extMin,
    extAngleMax: extMax,
    flexAngleMin: flexMin,
    flexAngleMax: flexMax,
    split,
  };
}

/**
 * @param {{ left: object, right: object }} row60 riga 60°/s
 * @param {string} injuredSide 'left' | 'right' | ''
 */
export function buildPdf3CurveBundle(row60, injuredSide) {
  const L = row60?.left || {};
  const R = row60?.right || {};
  const inj = injuredSide === "left" || injuredSide === "right" ? injuredSide : "";

  const ptExtL = parseIsokineticNum(L.ptExt) || 0;
  const ptFlexL = parseIsokineticNum(L.ptFlex) || 0;
  const ptExtR = parseIsokineticNum(R.ptExt) || 0;
  const ptFlexR = parseIsokineticNum(R.ptFlex) || 0;

  const irrL = irregularityForSide(L, R, inj, "left");
  const irrR = irregularityForSide(R, L, inj, "right");

  const { xMin: xGlobMin, xMax: xGlobMax } = globalXBoundsFromRow(row60);
  const winL = bellWindowsForSide(L, xGlobMin, xGlobMax);
  const winR = bellWindowsForSide(R, xGlobMin, xGlobMax);
  const splitAngle = (winL.split + winR.split) / 2;

  const nExt = 90;
  const nFlex = 90;

  const { ae: aeL, af: afL } = chartAnglesForSide(L);
  const { ae: aeR, af: afR } = chartAnglesForSide(R);

  const romExtSpanL = Math.max(14, winL.extAngleMax - winL.extAngleMin);
  const romFlexSpanL = Math.max(14, winL.flexAngleMax - winL.flexAngleMin);
  const romExtSpanR = Math.max(14, winR.extAngleMax - winR.extAngleMin);
  const romFlexSpanR = Math.max(14, winR.flexAngleMax - winR.flexAngleMin);

  const extL = bellBranch({
    peakTorque: ptExtL,
    peakAngleDeg: aeL,
    romDeg: romExtSpanL,
    angleMin: winL.extAngleMin,
    angleMax: winL.extAngleMax,
    nPoints: nExt,
    irregularity: irrL,
    phaseSeed: 1.2,
  });
  const flexL = bellBranch({
    peakTorque: ptFlexL,
    peakAngleDeg: afL,
    romDeg: romFlexSpanL,
    angleMin: winL.flexAngleMin,
    angleMax: winL.flexAngleMax,
    nPoints: nFlex,
    irregularity: irrL * 0.85,
    phaseSeed: 3.4,
  });
  const extR = bellBranch({
    peakTorque: ptExtR,
    peakAngleDeg: aeR,
    romDeg: romExtSpanR,
    angleMin: winR.extAngleMin,
    angleMax: winR.extAngleMax,
    nPoints: nExt,
    irregularity: irrR,
    phaseSeed: 0.7,
  });
  const flexR = bellBranch({
    peakTorque: ptFlexR,
    peakAngleDeg: afR,
    romDeg: romFlexSpanR,
    angleMin: winR.flexAngleMin,
    angleMax: winR.flexAngleMax,
    nPoints: nFlex,
    irregularity: irrR * 0.85,
    phaseSeed: 2.9,
  });

  const curveExtLeft = extL;
  const curveFlexLeft = flexL;
  const curveExtRight = extR;
  const curveFlexRight = flexR;
  const curveLeft = concatExtensionFlexion(extL, flexL);
  const curveRight = concatExtensionFlexion(extR, flexR);

  const m = inj ? computeRowMetrics(row60, inj) : null;

  const pts = [...extL, ...flexL, ...extR, ...flexR];
  const peakT = Math.max(
    20,
    ptExtL,
    ptFlexL,
    ptExtR,
    ptFlexR,
    ...pts.map((p) => p.torque)
  );
  const yHi = Math.max(140, Math.ceil((peakT * 1.06) / 20) * 20);

  const chartAxes = {
    xMin: xGlobMin,
    xMax: xGlobMax,
    yMin: -20,
    yMax: yHi,
    splitAngle,
  };

  return {
    speed: SPEED,
    curveLeft,
    curveRight,
    curveExtLeft,
    curveFlexLeft,
    curveExtRight,
    curveFlexRight,
    chartAxes,
    peaks: {
      left: {
        ext: ptExtL,
        flex: ptFlexL,
        angleExt: aeL,
        angleFlex: afL,
      },
      right: {
        ext: ptExtR,
        flex: ptFlexR,
        angleExt: aeR,
        angleFlex: afR,
      },
    },
    hq: {
      left: hqPercent(parseIsokineticNum(L.ptFlex), parseIsokineticNum(L.ptExt)),
      right: hqPercent(parseIsokineticNum(R.ptFlex), parseIsokineticNum(R.ptExt)),
    },
    metricsRow: m,
    irregularity: { left: irrL, right: irrR },
    dataNote: "syntheticFromSummary",
  };
}

function trapzArea(points) {
  if (!points.length) return 0;
  let s = 0;
  for (let i = 1; i < points.length; i++) {
    const da = points[i].angle - points[i - 1].angle;
    s += da * (points[i].torque + points[i - 1].torque) * 0.5;
  }
  return s;
}

/** Indice estensione: punti con angolo < picco flessione medio (due masse). */
function extensionSlice(points, peakFlexAngle) {
  const split =
    peakFlexAngle != null && Number.isFinite(peakFlexAngle)
      ? peakFlexAngle - 5
      : 55;
  return points.filter((p) => p.angle <= split);
}

function smooth3(arr) {
  const y = arr.map((p) => p.torque);
  const out = [];
  for (let i = 0; i < arr.length; i++) {
    const a = y[i - 1] ?? y[i];
    const b = y[i];
    const c = y[i + 1] ?? y[i];
    out.push((a + 2 * b + c) / 4);
  }
  return arr.map((p, i) => ({ ...p, torque: out[i] }));
}

/** Build-up: frazione dell’intervallo angolare estensione per passare da 25% a 90% del picco ext. */
function buildUpFraction(extPoints) {
  if (!extPoints.length) return null;
  const peak = Math.max(...extPoints.map((p) => p.torque), 1e-6);
  const t25 = 0.25 * peak;
  const t90 = 0.9 * peak;
  let i25 = 0;
  let i90 = 0;
  for (let i = 0; i < extPoints.length; i++) {
    if (extPoints[i].torque >= t25) {
      i25 = i;
      break;
    }
  }
  for (let i = i25; i < extPoints.length; i++) {
    if (extPoints[i].torque >= t90) {
      i90 = i;
      break;
    }
  }
  if (i90 <= i25) return 0.35;
  return (i90 - i25) / Math.max(1, extPoints.length - 1);
}

/** Oscillazioni: energia delle differenze seconde normalizzata. */
function oscillationScore(points) {
  if (points.length < 5) return 0;
  const sm = smooth3(points);
  let e = 0;
  for (let i = 2; i < sm.length; i++) {
    const d2 =
      sm[i].torque - 2 * sm[i - 1].torque + sm[i - 2].torque;
    e += d2 * d2;
  }
  const peak = Math.max(...sm.map((p) => p.torque), 1e-6);
  return Math.sqrt(e / sm.length) / peak;
}

/** Decadimento: coppia nell’ultimo quarto angolare estensione / picco. */
function postPeakRetention(extPoints) {
  if (!extPoints.length) return null;
  const sm = smooth3(extPoints);
  const peak = Math.max(...sm.map((p) => p.torque), 1e-6);
  const iPeak = sm.findIndex((p) => p.torque >= peak * 0.995);
  if (iPeak < 0) return null;
  const tail = sm.slice(Math.min(sm.length - 1, iPeak + Math.floor((sm.length - iPeak) * 0.35)));
  if (!tail.length) return null;
  const meanTail =
    tail.reduce((s, p) => s + p.torque, 0) / tail.length;
  return meanTail / peak;
}

/**
 * Metriche qualitative per commento automatico.
 * @param {ReturnType<typeof buildPdf3CurveBundle>} bundle
 */
export function computePdf3QualMetrics(bundle) {
  const {
    curveLeft,
    curveRight,
    peaks,
    curveExtLeft,
    curveExtRight,
  } = bundle;
  const extL = curveExtLeft?.length ? curveExtLeft : extensionSlice(curveLeft, peaks.left.angleFlex ?? 60);
  const extR = curveExtRight?.length ? curveExtRight : extensionSlice(curveRight, peaks.right.angleFlex ?? 60);

  const sumL =
    trapzArea(bundle.curveExtLeft || []) + trapzArea(bundle.curveFlexLeft || []);
  const sumR =
    trapzArea(bundle.curveExtRight || []) + trapzArea(bundle.curveFlexRight || []);
  const areaL = sumL > 1e-6 ? sumL : trapzArea(curveLeft);
  const areaR = sumR > 1e-6 ? sumR : trapzArea(curveRight);

  return {
    areaLeft: areaL,
    areaRight: areaR,
    areaRatio:
      areaR > 1e-6 ? areaL / areaR : areaL > 0 ? 1 : null,
    buildUpLeft: buildUpFraction(extL),
    buildUpRight: buildUpFraction(extR),
    oscillationLeft: oscillationScore(extL),
    oscillationRight: oscillationScore(extR),
    retentionLeft: postPeakRetention(extL),
    retentionRight: postPeakRetention(extR),
  };
}

/**
 * Seleziona chiavi i18n `patient.testCharts.isoPdf3*` (narrativa + bullet + impatto).
 */
export function selectPdf3NarrativeKeys(bundle, qual) {
  const m = bundle.metricsRow;
  const keys = [];

  const lsiExt = m?.lsiExt;
  if (lsiExt != null && Number.isFinite(lsiExt)) {
    if (lsiExt >= 90) keys.push("isoPdf3N_symExtGood");
    else if (lsiExt >= 80) keys.push("isoPdf3N_symExtMod");
    else keys.push("isoPdf3N_symExtLow");
  }

  const oscL = qual.oscillationLeft ?? 0;
  const oscR = qual.oscillationRight ?? 0;
  const oscDelta = oscL - oscR;
  if (Math.abs(oscDelta) > 0.04) {
    keys.push(oscDelta > 0 ? "isoPdf3N_shapeMoreVarLeft" : "isoPdf3N_shapeMoreVarRight");
  } else if ((oscL + oscR) / 2 > 0.11) {
    keys.push("isoPdf3N_shapeBothSomeVar");
  } else {
    keys.push("isoPdf3N_shapeRelSmooth");
  }

  const buL = qual.buildUpLeft ?? 0.4;
  const buR = qual.buildUpRight ?? 0.4;
  if (Math.abs(buL - buR) > 0.08) {
    keys.push(buL < buR ? "isoPdf3N_buildFasterLeft" : "isoPdf3N_buildFasterRight");
  } else {
    keys.push("isoPdf3N_buildSimilar");
  }

  const retL = qual.retentionLeft;
  const retR = qual.retentionRight;
  if (retL != null && retR != null) {
    if (retL < retR - 0.06) keys.push("isoPdf3N_decayEarlierLeft");
    else if (retR < retL - 0.06) keys.push("isoPdf3N_decayEarlierRight");
    else keys.push("isoPdf3N_decaySimilar");
  }

  const ar = qual.areaRatio;
  if (ar != null && Number.isFinite(ar)) {
    if (ar < 0.88) keys.push("isoPdf3N_workVolumeLowerLeft");
    else if (ar > 1.12) keys.push("isoPdf3N_workVolumeLowerRight");
    else keys.push("isoPdf3N_workVolumeSimilar");
  }

  if (m?.lsiExt != null && m.lsiExt < 88) {
    const hqL = bundle.hq.left;
    const hqR = bundle.hq.right;
    if (hqL != null && hqR != null && Math.abs(hqL - hqR) > 8) {
      keys.push("isoPdf3N_hqSupportShift");
    }
  }

  const uniq = [...new Set(keys)].slice(0, 6);

  const bulletKeys = [];
  if (m?.lsiExt != null && m.lsiExt < 92) bulletKeys.push("isoPdf3BulletPeak");
  if (uniq.some((k) => k.includes("shape"))) bulletKeys.push("isoPdf3BulletShape");
  if (uniq.some((k) => k.includes("build"))) bulletKeys.push("isoPdf3BulletBuild");
  if (uniq.some((k) => k.includes("decay"))) bulletKeys.push("isoPdf3BulletDecay");
  if (uniq.some((k) => k.includes("work"))) bulletKeys.push("isoPdf3BulletWork");
  if (bulletKeys.length < 3) bulletKeys.push("isoPdf3BulletControl");

  const impactKeys = [];
  if (lsiExt != null && lsiExt < 85) impactKeys.push("isoPdf3Impact1");
  if ((oscL + oscR) / 2 > 0.12) impactKeys.push("isoPdf3Impact2");
  if (m?.deficitExt != null && m.deficitExt > 12) impactKeys.push("isoPdf3Impact3");
  impactKeys.push("isoPdf3Impact4");

  return {
    narrativeKeys: uniq,
    bulletKeys: [...new Set(bulletKeys)].slice(0, 4),
    impactKeys: [...new Set(impactKeys)].slice(0, 4),
  };
}

/** Assi clinici condivisi (derivati da arco «Angle de mouvement maximal» / angoli @CM in `buildPdf3CurveBundle`). */
export function getPdf3ClinicalAxes(bundle, padTorque = 1.06) {
  if (bundle.chartAxes && Number.isFinite(bundle.chartAxes.xMin)) {
    return bundle.chartAxes;
  }
  const pts = [
    ...(bundle.curveExtLeft || []),
    ...(bundle.curveFlexLeft || []),
    ...(bundle.curveExtRight || []),
    ...(bundle.curveFlexRight || []),
  ];
  const peakT = Math.max(
    20,
    bundle.peaks?.right?.ext || 0,
    bundle.peaks?.right?.flex || 0,
    bundle.peaks?.left?.ext || 0,
    bundle.peaks?.left?.flex || 0,
    ...pts.map((p) => p.torque)
  );
  const yHi = Math.max(140, Math.ceil((peakT * padTorque) / 20) * 20);
  const angles = pts.map((p) => p.angle).filter((a) => Number.isFinite(a));
  let xMin = -20;
  let xMax = 150;
  if (angles.length) {
    const lo = Math.min(...angles);
    const hi = Math.max(...angles);
    const pad = 8;
    xMin = Math.max(-20, Math.floor((lo - pad) / 5) * 5);
    xMax = Math.min(155, Math.ceil((hi + pad) / 5) * 5);
    xMax = Math.max(xMax, xMin + 35);
  }
  const pl = bundle.peaks?.left;
  const pr = bundle.peaks?.right;
  const splitCandidates = [
    pl?.angleExt,
    pl?.angleFlex,
    pr?.angleExt,
    pr?.angleFlex,
  ].filter((x) => Number.isFinite(x));
  const splitAngle =
    splitCandidates.length >= 2
      ? (Math.min(...splitCandidates) + Math.max(...splitCandidates)) / 2
      : 60;
  return {
    xMin,
    xMax,
    yMin: -20,
    yMax: yHi,
    splitAngle,
  };
}

/** @deprecated Usare getPdf3ClinicalAxes(bundle). */
export function scaleCurvesForChart(curveLeft, curveRight, padTorque = 1.12) {
  const all = [...curveLeft, ...curveRight];
  const maxT = Math.max(10, ...all.map((p) => p.torque));
  const minA = Math.min(...all.map((p) => p.angle), 0);
  const maxA = Math.max(...all.map((p) => p.angle), 100);
  return {
    yMax: maxT * padTorque,
    xMin: minA,
    xMax: maxA,
  };
}

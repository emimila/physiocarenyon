/**
 * PDF4 — campionamento angolo-specifico e zone di deficit su curve
 * ricostruite da `buildPdf3CurveBundle` (stesso modello di PDF3).
 */

/**
 * @param {Array<{ angle: number, torque: number }>} pts sorted by angle ascending
 * @param {number} angleDeg
 */
export function interpolateTorqueAtAngle(pts, angleDeg) {
  if (!pts?.length || !Number.isFinite(angleDeg)) return null;
  const a = angleDeg;
  if (a <= pts[0].angle) return pts[0].torque;
  const last = pts[pts.length - 1];
  if (a >= last.angle) return last.torque;
  let lo = 0;
  let hi = pts.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (pts[mid].angle <= a) lo = mid;
    else hi = mid;
  }
  const p0 = pts[lo];
  const p1 = pts[hi];
  const da = p1.angle - p0.angle;
  if (da < 1e-9) return p0.torque;
  const t = (a - p0.angle) / da;
  return p0.torque + t * (p1.torque - p0.torque);
}

/**
 * LSI convenzionale: (lato coinvolto / controlaterale) × 100.
 * @param {'left'|'right'|''} injuredSide
 * @param {number} tLeft
 * @param {number} tRight
 * @returns {number|null}
 */
export function lsiInvolvedVsContralateral(injuredSide, tLeft, tRight) {
  if (!Number.isFinite(tLeft) || !Number.isFinite(tRight)) return null;
  if (tLeft <= 0 || tRight <= 0) return null;
  if (injuredSide === "left") return (tLeft / tRight) * 100;
  if (injuredSide === "right") return (tRight / tLeft) * 100;
  return null;
}

/**
 * Simmetria bilaterale senza lato coinvolto: min/max × 100.
 */
export function bilateralSymmetryPct(tLeft, tRight) {
  if (!Number.isFinite(tLeft) || !Number.isFinite(tRight)) return null;
  const hi = Math.max(tLeft, tRight);
  if (hi <= 0) return null;
  return (Math.min(tLeft, tRight) / hi) * 100;
}

/**
 * @param {object} bundle risultato di buildPdf3CurveBundle
 * @param {{ stepDeg?: number, lsiGood?: number, lsiWarn?: number, injuredSide?: string }} opts
 */
export function buildPdf4AngleSampleTable(bundle, opts = {}) {
  const stepDeg = opts.stepDeg ?? 5;
  const lsiGood = opts.lsiGood ?? 90;
  const lsiWarn = opts.lsiWarn ?? 80;
  const injured = opts.injuredSide === "left" || opts.injuredSide === "right" ? opts.injuredSide : "";

  const ax = bundle.chartAxes;
  const xMin = ax?.xMin ?? -10;
  const xMax = ax?.xMax ?? 130;
  const split = ax?.splitAngle ?? 60;

  const cL = bundle.curveLeft || [];
  const cR = bundle.curveRight || [];

  const rows = [];
  const start = Math.ceil(xMin / stepDeg) * stepDeg;
  for (let ang = start; ang <= xMax + 1e-6; ang += stepDeg) {
    const a = Math.round(ang * 10) / 10;
    const phase = a <= split ? "ext" : "flex";
    const tL = interpolateTorqueAtAngle(cL, a);
    const tR = interpolateTorqueAtAngle(cR, a);
    const lsiInv = lsiInvolvedVsContralateral(injured, tL, tR);
    const sym = bilateralSymmetryPct(tL, tR);
    const lsi = lsiInv != null ? lsiInv : sym;

    let severity = "ok";
    if (lsi != null && Number.isFinite(lsi)) {
      if (lsi < lsiWarn) severity = "low";
      else if (lsi < lsiGood) severity = "mod";
    }

    rows.push({
      angle: a,
      phase,
      torqueLeft: tL,
      torqueRight: tR,
      lsiInvolved: lsiInv,
      symmetryPct: sym,
      lsiDisplay: lsi,
      severity,
    });
  }

  return { rows, splitAngle: split, xMin, xMax, stepDeg, injuredSide: injured };
}

/**
 * Unisce angoli consecutivi con severity !== 'ok' (stesso ramo ext|flex).
 * @param {ReturnType<typeof buildPdf4AngleSampleTable>['rows']} rows
 */
export function mergeDeficitZones(rows, stepDeg = 5) {
  if (!rows?.length) return [];
  const gap = stepDeg * 1.51;
  /** @type {{ phase: string, lo: number, hi: number, minLsi: number }[]} */
  const zones = [];
  let cur = null;
  for (const r of rows) {
    if (r.severity === "ok") {
      if (cur) {
        zones.push(cur);
        cur = null;
      }
      continue;
    }
    const lsi = r.lsiDisplay;
    if (!cur) {
      cur = {
        phase: r.phase,
        lo: r.angle,
        hi: r.angle,
        minLsi: lsi != null ? lsi : 999,
      };
    } else if (r.phase === cur.phase && r.angle <= cur.hi + gap) {
      cur.hi = r.angle;
      if (lsi != null && lsi < cur.minLsi) cur.minLsi = lsi;
    } else {
      zones.push(cur);
      cur = {
        phase: r.phase,
        lo: r.angle,
        hi: r.angle,
        minLsi: lsi != null ? lsi : 999,
      };
    }
  }
  if (cur) zones.push(cur);
  return zones.map((z) => ({
    ...z,
    minLsi: z.minLsi > 200 ? null : z.minLsi,
  }));
}

/**
 * @param {ReturnType<typeof buildPdf4AngleSampleTable>} table
 */
export function pdf4WorstAngle(table) {
  const rows = table.rows || [];
  let worst = null;
  for (const r of rows) {
    if (r.lsiDisplay == null || !Number.isFinite(r.lsiDisplay)) continue;
    if (!worst || r.lsiDisplay < worst.lsi) worst = { angle: r.angle, lsi: r.lsiDisplay, phase: r.phase };
  }
  return worst;
}

/**
 * Chiavi i18n `patient.testCharts.isoPdf4Op*` — opinioni prudente, non diagnosi.
 * @param {{
 *   zones: ReturnType<typeof mergeDeficitZones>,
 *   worst: ReturnType<typeof pdf4WorstAngle>,
 *   qual: object|null,
 *   injuredSide: string,
 *   lsiExt: number|null,
 * }} p
 * @returns {string[]}
 */
export function buildPdf4OpinionKeys(p) {
  const { zones, worst, qual, injuredSide, lsiExt } = p;
  const keys = ["isoPdf4OpIntro"];

  const hasBadExt = (zones || []).some(
    (z) => z.phase === "ext" && z.minLsi != null && z.minLsi < 90
  );
  const hasBadFlex = (zones || []).some(
    (z) => z.phase === "flex" && z.minLsi != null && z.minLsi < 90
  );

  if (hasBadExt && hasBadFlex) keys.push("isoPdf4OpDeficitBothPhases");
  else if (hasBadExt) keys.push("isoPdf4OpDeficitDominatesExt");
  else if (hasBadFlex) keys.push("isoPdf4OpDeficitDominatesFlex");

  if (worst?.lsi != null && worst.lsi < 85 && (hasBadExt || hasBadFlex)) {
    keys.push("isoPdf4OpNotUniform");
  }

  if (lsiExt != null && Number.isFinite(lsiExt) && lsiExt >= 90 && (hasBadExt || hasBadFlex)) {
    keys.push("isoPdf4OpPeakMisleading");
  }

  if (injuredSide === "left" || injuredSide === "right") {
    const rI =
      injuredSide === "left" ? qual?.retentionLeft : qual?.retentionRight;
    const rO =
      injuredSide === "left" ? qual?.retentionRight : qual?.retentionLeft;
    if (rI != null && rO != null && rI < rO - 0.06) {
      keys.push("isoPdf4OpDecayInvolved");
    }
  }

  keys.push("isoPdf4OpClosing");
  return [...new Set(keys)].slice(0, 9);
}

export const YB_DIRS = ["anterior", "posteromedial", "posterolateral"];

function numAt(arr, i) {
  if (!Array.isArray(arr)) return null;
  const n = Number(arr[i]);
  return Number.isFinite(n) ? n : null;
}

export function ybTrials(side, dir) {
  const a = side?.[dir];
  return [0, 1, 2].map((i) => numAt(a, i));
}

export function ybBest(side, dir) {
  const t = ybTrials(side, dir).filter((x) => x != null);
  return t.length ? Math.max(...t) : null;
}

export function ybMaxForScale(test) {
  const vals = [];
  for (const side of [test?.right, test?.left]) {
    if (!side) continue;
    for (const dir of YB_DIRS) {
      ybTrials(side, dir).forEach((v) => {
        if (v != null) vals.push(v);
      });
      const b = ybBest(side, dir);
      if (b != null) vals.push(b);
    }
  }
  if (!vals.length) return 100;
  const m = Math.max(...vals);
  return Math.max(20, Math.ceil(m / 10) * 10);
}

/** Dominio Y per grafici a linee (prove): simile a ref. 60–150, adattato ai dati. */
export function ybLineChartDomain(test) {
  const vals = [];
  for (const side of [test?.right, test?.left]) {
    if (!side) continue;
    for (const dir of YB_DIRS) {
      ybTrials(side, dir).forEach((v) => {
        if (v != null) vals.push(v);
      });
    }
  }
  if (!vals.length) return { minY: 0, maxY: 100 };
  const lo = Math.min(...vals);
  const hi = Math.max(...vals);
  const minY = Math.max(0, Math.floor(lo / 10) * 10 - 10);
  const maxY = Math.max(minY + 20, Math.ceil(hi / 10) * 10 + 10);
  return { minY, maxY };
}

/** Differenza best DX − SX in cm per direzione (destra − sinistra). */
export function ybBestDiffDxSx(test) {
  const r = test?.right || {};
  const l = test?.left || {};
  return YB_DIRS.map((dir) => {
    const br = ybBest(r, dir);
    const bl = ybBest(l, dir);
    const d =
      br != null && bl != null ? br - bl : null;
    const pct =
      br != null && bl != null && bl !== 0
        ? ((br - bl) / bl) * 100
        : null;
    return { dir, br, bl, diffCm: d, diffPct: pct };
  });
}

/** Direzione con massima |DX−SX| in cm tra i best. */
export function ybMaxAsymmetryDirection(rows) {
  let best = null;
  for (const r of rows) {
    if (r.br == null || r.bl == null) continue;
    const ad = Math.abs(r.br - r.bl);
    if (best == null || ad > best.ad) {
      best = { ad, dir: r.dir };
    }
  }
  return best;
}

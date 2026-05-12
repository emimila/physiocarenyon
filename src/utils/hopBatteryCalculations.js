function emptyPair() {
  return { dx: "", sx: "" };
}

export function ensureHopBatteryShape(raw) {
  const base = {
    injuredSide: "",
    dominantSide: "",
    tripleHop: emptyPair(),
    singleHop: emptyPair(),
    sideHop: emptyPair(),
    crossoverHop: emptyPair(),
  };
  if (!raw || typeof raw !== "object") return base;
  const mergePair = (p) => ({
    dx: p?.dx != null ? String(p.dx) : "",
    sx: p?.sx != null ? String(p.sx) : "",
  });
  return {
    injuredSide:
      raw.injuredSide === "left" || raw.injuredSide === "right"
        ? raw.injuredSide
        : "",
    dominantSide:
      raw.dominantSide === "left" || raw.dominantSide === "right"
        ? raw.dominantSide
        : "",
    tripleHop: mergePair(raw.tripleHop),
    singleHop: mergePair(raw.singleHop),
    sideHop: mergePair(raw.sideHop),
    crossoverHop: mergePair(raw.crossoverHop),
  };
}

export function parseHopNum(v) {
  if (v == null || String(v).trim() === "") return NaN;
  return Number(String(v).replace(",", ".").trim());
}

/**
 * LSI = (arto lesionato / arto sano) × 100 (stesso criterio referto Hop Test Battery).
 * `injuredSide`: "left" = SX lesionato, "right" = DX lesionato.
 */
export function hopLsiPercent(injuredSide, dxVal, sxVal) {
  if (injuredSide !== "left" && injuredSide !== "right") return null;
  const dx = parseHopNum(dxVal);
  const sx = parseHopNum(sxVal);
  if (!Number.isFinite(dx) || !Number.isFinite(sx)) return null;
  const healthy = injuredSide === "left" ? dx : sx;
  const injured = injuredSide === "left" ? sx : dx;
  if (healthy <= 0) return null;
  return (injured / healthy) * 100;
}

export function formatHopLsiOneDecimal(pct) {
  if (pct == null || !Number.isFinite(pct)) return null;
  return `${pct.toFixed(1)}%`;
}

export function meanHopLsi(lsies) {
  const ok = lsies.filter((x) => x != null && Number.isFinite(x));
  if (!ok.length) return null;
  return ok.reduce((a, b) => a + b, 0) / ok.length;
}

/** Chiavi test nell’ordine referto. */
export const HOP_BATTERY_ROW_KEYS = [
  "tripleHop",
  "singleHop",
  "sideHop",
  "crossoverHop",
];

/**
 * Fascia LSI come da legenda referto: ≥95 ottimo, 90–94 buono, 85–89 attenzione, &lt;85 deficit.
 */
export function hopLsiBand(pct) {
  if (pct == null || !Number.isFinite(pct)) return null;
  if (pct >= 95) return "optimal";
  if (pct >= 90) return "good";
  if (pct >= 85) return "attention";
  return "deficit";
}

export function hopLsiBandColors(band) {
  const map = {
    optimal: { bg: "#bbf7d0", fg: "#14532d", bar: "#22c55e", labelKey: "optimal" },
    good: { bg: "#fef08a", fg: "#713f12", bar: "#ca8a04", labelKey: "good" },
    attention: { bg: "#fed7aa", fg: "#9a3412", bar: "#ea580c", labelKey: "attention" },
    deficit: { bg: "#fecaca", fg: "#991b1b", bar: "#dc2626", labelKey: "deficit" },
  };
  return map[band] || { bg: "#e2e8f0", fg: "#475569", bar: "#64748b", labelKey: "na" };
}

/** Arto sano per soglia 90%: opposto al lesionato; senza lato → max(DX, SX). */
export function hopHealthyReferenceValue(injuredSide, dxVal, sxVal) {
  const dx = parseHopNum(dxVal);
  const sx = parseHopNum(sxVal);
  if (injuredSide === "left") {
    return Number.isFinite(dx) ? dx : null;
  }
  if (injuredSide === "right") {
    return Number.isFinite(sx) ? sx : null;
  }
  if (Number.isFinite(dx) && Number.isFinite(sx)) {
    return Math.max(dx, sx);
  }
  return Number.isFinite(dx) ? dx : Number.isFinite(sx) ? sx : null;
}

/** 90% del valore di riferimento lato sano (referto «SOGLIA 90%»). */
export function hopSoglia90Percent(healthyVal) {
  if (healthyVal == null || !Number.isFinite(healthyVal) || healthyVal <= 0) {
    return null;
  }
  return healthyVal * 0.9;
}

/** Scala orizzontale massima di default (come referto clinico). */
export const HOP_AXIS_MAX_BY_KEY = {
  tripleHop: 500,
  singleHop: 250,
  sideHop: 35,
  crossoverHop: 500,
};

/**
 * Estremo asse X: max tra scala referto, dati e soglia (+ margine).
 */
export function hopAxisSpanMax(hopKey, dxVal, sxVal, sogliaVal) {
  const cap = HOP_AXIS_MAX_BY_KEY[hopKey] ?? 100;
  const dx = parseHopNum(dxVal);
  const sx = parseHopNum(sxVal);
  const m = Math.max(
    cap,
    Number.isFinite(dx) ? dx : 0,
    Number.isFinite(sx) ? sx : 0,
    sogliaVal != null && Number.isFinite(sogliaVal) ? sogliaVal : 0
  );
  return m * 1.02;
}

/**
 * Formula di Epley (1RM stimato da carico e ripetizioni).
 * 1RM (kg) ≈ peso × (1 + 0.0333 × ripetizioni)
 */
export function epleyOneRmKg(weightKg, reps) {
  const w = Number(weightKg);
  const r = Number(reps);
  if (!Number.isFinite(w) || w <= 0 || !Number.isFinite(r) || r < 1) {
    return null;
  }
  return w * (1 + 0.0333 * r);
}

export function formatOneRmKg(value) {
  if (value == null || !Number.isFinite(value)) return null;
  const rounded = Math.round(value * 10) / 10;
  return `${rounded} kg`;
}

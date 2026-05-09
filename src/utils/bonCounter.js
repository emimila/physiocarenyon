/** «Bon N»: progressivo per ogni paziente (1, 2, 3…), testo «Bon» uguale in tutte le lingue. */

/**
 * Prossimo numero Bon da assegnare a una nuova voce di storico,
 * guardando solo gli snapshot già presenti per quel paziente.
 */
export function nextBonNumberForPatient(storicoQuadroClinico) {
  const list = Array.isArray(storicoQuadroClinico)
    ? storicoQuadroClinico
    : [];
  let max = 0;
  for (const s of list) {
    const n = Number(s?.bonNumero);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return max + 1;
}

/**
 * Rinumera lo storico in ordine (prima voce = Bon 1, …) e imposta il dossier paziente a Bon 1.
 * Da chiamare al caricamento per correggere dati migrati da contatore globale.
 */
export function migratePatientsBonNumbers(patients) {
  if (!Array.isArray(patients) || patients.length === 0) return patients;

  return patients.map((p) => {
    const q = { ...p };
    const raw = Array.isArray(q.storicoQuadroClinico)
      ? q.storicoQuadroClinico
      : [];
    if (raw.length === 0) {
      return { ...q, storicoQuadroClinico: [], bonNumero: "" };
    }
    const storicoQuadroClinico = raw.map((s, idx) => ({
      ...s,
      bonNumero: idx + 1,
    }));
    return {
      ...q,
      storicoQuadroClinico,
      bonNumero: 1,
    };
  });
}

export function formatBonLabel(n) {
  if (n == null || n === "" || !Number.isFinite(Number(n))) return "";
  return `Bon ${Number(n)}`;
}

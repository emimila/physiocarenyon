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

/**
 * Etichetta progressivo storico (ex «Bon N»).
 * Con `tt` si usa la stringa localizzata `patient.historyEntryLabel` (`{{n}}` = numero).
 */
export function formatBonLabel(n, tt) {
  if (n == null || n === "" || !Number.isFinite(Number(n))) return "";
  const num = Number(n);
  if (typeof tt === "function") {
    const tpl = tt("patient.historyEntryLabel");
    if (tpl && String(tpl).includes("{{n}}")) {
      return String(tpl).replace(/\{\{n\}\}/g, String(num));
    }
  }
  return `Visita ${num}`;
}

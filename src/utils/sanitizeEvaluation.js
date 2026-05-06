const SCORE_KEYS = [
  "forza",
  "funzione",
  "mobilitaPassiva",
  "mobilitaAttiva",
  "qualitaMovimento",
];
const DOLORE_KEYS = [
  "riposo",
  "mattino",
  "sera",
  "duranteAttivita",
  "dopoAttivita",
];

function typedBlocks(d) {
  return (d?.blocks || []).filter((b) => b && b.type);
}

function hasAnyScore(side) {
  if (!side) return false;
  return SCORE_KEYS.some((k) => {
    const v = side[k];
    return v !== "" && v != null;
  });
}

function hasAnyDolore(side) {
  const dol = side?.dolore;
  if (!dol) return false;
  return DOLORE_KEYS.some((k) => {
    const v = dol[k];
    return v !== "" && v != null;
  });
}

function hasLegacyTopDolore(d) {
  const dol = d?.dolore;
  if (!dol || typeof dol !== "object") return false;
  return DOLORE_KEYS.some((k) => {
    const v = dol[k];
    return v !== "" && v != null;
  });
}

function blocksHaveKiviat(blocks) {
  return blocks.some((b) => b.type === "KIVIAT" || b.type === "KIVIAT_PAIN");
}

/** Distretto mostra tabella punteggi (Kiviat / condizione base) */
export function distrettoHasKiviat(d) {
  const blocks = typedBlocks(d);
  if (blocksHaveKiviat(blocks)) return true;
  if (blocks.length > 0) return false;
  return hasAnyScore(d?.destro) || hasAnyScore(d?.sinistro);
}

/** VAS lato destro/sinistro (tabella classica) */
export function distrettoHasSidePainTable(d) {
  const blocks = typedBlocks(d);
  if (blocks.some((b) => ["PAIN_VAS", "KIVIAT_PAIN"].includes(b.type)))
    return true;
  if (blocks.length > 0) return false;
  return (
    hasAnyDolore(d?.destro) ||
    hasAnyDolore(d?.sinistro) ||
    hasLegacyTopDolore(d)
  );
}

/** Blocco dolore generale (VAS unico 1–10). */
export function distrettoHasGeneralPainVAS(d) {
  const blocks = typedBlocks(d);
  return blocks.some((b) => b.type === "GENERAL_PAIN");
}

/** Distretto: qualsiasi contenuto dolore (lato e/o generale / legacy). */
export function distrettoHasPainVAS(d) {
  return distrettoHasSidePainTable(d) || distrettoHasGeneralPainVAS(d);
}

function pruneSide(lato, { keepScores, keepDolore }) {
  const side = { ...(lato || {}) };
  if (!keepScores) {
    for (const k of SCORE_KEYS) {
      delete side[k];
    }
  }
  if (!keepDolore) {
    delete side.dolore;
  }
  return side;
}

function pruneTest(t) {
  if (!t?.type) return null;
  if (t.type === "Y_BALANCE") {
    return {
      id: t.id,
      type: t.type,
      noteAltro: t.noteAltro ?? "",
      left: t.left || {},
      right: t.right || {},
    };
  }
  if (t.type === "GRIP_STRENGTH") {
    return {
      id: t.id,
      type: t.type,
      noteAltro: t.noteAltro ?? "",
      grip: { ...(t.grip || {}) },
    };
  }
  if (t.type === "STRENGTH_MAXIMALS") {
    return {
      id: t.id,
      type: t.type,
      noteAltro: t.noteAltro ?? "",
      lifts: (t.lifts || []).map((line) => ({
        id: line.id,
        exercise: line.exercise ?? "",
        exerciseOther: line.exerciseOther ?? "",
        reps: line.reps ?? "",
        weightKg: line.weightKg ?? "",
      })),
    };
  }
  return { id: t.id, type: t.type, noteAltro: t.noteAltro ?? "" };
}

/**
 * Salva solo blocchi con tipo, dati lato coerenti con i blocchi scelti e test tipizzati senza payload incrociato.
 */
export function sanitizeEvaluationForSave(evaluation) {
  const raw =
    typeof structuredClone === "function"
      ? structuredClone(evaluation)
      : JSON.parse(JSON.stringify(evaluation));

  raw.distretti = (raw.distretti || []).map((d) => {
    const blocks = typedBlocks(d);
    const keepScores = distrettoHasKiviat(d);
    const keepDolore = distrettoHasPainVAS(d);

    const destro = pruneSide(d.destro, { keepScores, keepDolore });
    const sinistro = pruneSide(d.sinistro, { keepScores, keepDolore });

    const tests = (d.tests || []).map(pruneTest).filter(Boolean);

    const { dolore: _legacyDolore, ...rest } = d;
    const out = {
      ...rest,
      blocks,
      destro,
      sinistro,
      tests,
    };
    if (!keepDolore) {
      delete out.dolore;
    }
    return out;
  });

  return raw;
}

export function distrettoActiveTests(d) {
  return (d?.tests || []).filter((t) => t && t.type);
}

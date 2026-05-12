import { fixedRepsForSpeed } from "./isokineticCalculations";

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
  if (t.type === "ISOKINETIC") {
    const iso = t.isokinetic && typeof t.isokinetic === "object" ? t.isokinetic : {};
    const pruneSide = (s) => ({
      ptExt: s?.ptExt ?? "",
      ptFlex: s?.ptFlex ?? "",
      anglePtExt: s?.anglePtExt ?? "",
      anglePtFlex: s?.anglePtFlex ?? "",
      romExt: s?.romExt ?? "",
      romFlex: s?.romFlex ?? "",
      workExt: s?.workExt ?? "",
      workFlex: s?.workFlex ?? "",
    });
    const rows = (iso.rows || []).map((r) => ({
      speed: r.speed,
      reps: fixedRepsForSpeed(r.speed) || String(r.reps ?? ""),
      left: pruneSide(r.left),
      right: pruneSide(r.right),
    }));
    const wc = iso.weightConfirmation;
    const weightConfirmation =
      wc === "chart" || wc === "manual" || wc === "pending" ? wc : "pending";
    const rawFocus = Number(iso.clinicalFocusSpeed);
    const clinicalFocusSpeed = [60, 180, 300].includes(rawFocus)
      ? rawFocus
      : 60;
    return {
      id: t.id,
      type: t.type,
      noteAltro: t.noteAltro ?? "",
      isokinetic: {
        injuredSide:
          iso.injuredSide === "left" || iso.injuredSide === "right"
            ? iso.injuredSide
            : "",
        clinicalFocusSpeed,
        weightConfirmation,
        manualWeightKg: iso.manualWeightKg ?? "",
        bodyWeightKgUsed: iso.bodyWeightKgUsed ?? "",
        rows,
      },
    };
  }
  if (t.type === "HOP_BATTERY") {
    const hb = t.hopBattery && typeof t.hopBattery === "object" ? t.hopBattery : {};
    const pair = (p) => ({
      dx: p?.dx ?? "",
      sx: p?.sx ?? "",
    });
    return {
      id: t.id,
      type: t.type,
      noteAltro: t.noteAltro ?? "",
      hopBattery: {
        injuredSide:
          hb.injuredSide === "left" || hb.injuredSide === "right"
            ? hb.injuredSide
            : "",
        dominantSide:
          hb.dominantSide === "left" || hb.dominantSide === "right"
            ? hb.dominantSide
            : "",
        tripleHop: pair(hb.tripleHop),
        singleHop: pair(hb.singleHop),
        sideHop: pair(hb.sideHop),
        crossoverHop: pair(hb.crossoverHop),
      },
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

    /* I test clinici vivono solo in `patient.sessioniTest`, non nelle valutazioni. */
    const tests = [];

    const rest = { ...(d || {}) };
    delete rest.dolore;
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

/** Sessione test: solo distretti con array `tests` tipizzati. */
export function sanitizeTestSessionForSave(session) {
  const raw =
    typeof structuredClone === "function"
      ? structuredClone(session)
      : JSON.parse(JSON.stringify(session));

  raw.distretti = (raw.distretti || []).map((d) => ({
    id: d.id,
    nome: d.nome,
    numeroValutazioneDistretto: d.numeroValutazioneDistretto ?? "",
    tests: (d.tests || []).map(pruneTest).filter(Boolean),
  }));

  return raw;
}

export function distrettoActiveTests(d) {
  return (d?.tests || []).filter((t) => t && t.type);
}

import { uid } from "./helpers";

export const emptyScores = {
  forza: "",
  funzione: "",
  mobilitaPassiva: "",
  mobilitaAttiva: "",
  qualitaMovimento: "",
};

export function createEvaluation(numeroValutazione = "") {
  return {
    id: uid(),
    data: new Date().toISOString().split("T")[0],
    buono: "",
    sessione: "",
    numeroValutazione,
    note: "",
    distretti: [],
  };
}

export function createDistretto(nome) {
  return {
    id: uid(),
    nome,
    numeroValutazioneDistretto: "",
    doloreGeneraleVAS: "",
    destro: { ...emptyScores },
    sinistro: { ...emptyScores },
    dolore: {
      riposo: "",
      mattino: "",
      sera: "",
      duranteAttivita: "",
      dopoAttivita: "",
    },
  };
}

/** Riga test attiva per tipo (allineata a DistrictTestsPanel / onChange del Select). */
export function createActiveTestByType(type, patient = null) {
  const base = {
    id: uid(),
    type: type || "",
    noteAltro: "",
    grip: {},
    left: {},
    right: {},
    lifts: [],
  };
  if (!type) return base;
  if (type === "GRIP_STRENGTH") {
    base.grip = {
      manoDominante: patient?.manoDominante || "",
      manoDestraForza1: "",
      manoDestraForza2: "",
      manoDestraForza3: "",
      manoSinistraForza1: "",
      manoSinistraForza2: "",
      manoSinistraForza3: "",
    };
  }
  if (type === "Y_BALANCE") {
    base.left = {
      legLength: "",
      anterior: [],
      posteromedial: [],
      posterolateral: [],
    };
    base.right = {
      legLength: "",
      anterior: [],
      posteromedial: [],
      posterolateral: [],
    };
  }
  if (type === "STRENGTH_MAXIMALS") {
    base.lifts = [
      {
        id: uid(),
        exercise: "",
        exerciseOther: "",
        reps: "",
        weightKg: "",
      },
    ];
  }
  return base;
}

/** Distretto usato solo in `sessioniTest` (solo elenco test, niente Kiviat/VAS). */
export function createDistrettoTestOnly(nome, patient = null, initialTestType = null) {
  const tests = initialTestType
    ? [createActiveTestByType(initialTestType, patient)]
    : [
        {
          id: uid(),
          type: "",
          noteAltro: "",
          grip: {},
          left: {},
          right: {},
          lifts: [],
        },
      ];
  return {
    id: uid(),
    nome,
    numeroValutazioneDistretto: "",
    tests,
  };
}

export function createTestSession(numeroTest = "") {
  return {
    id: uid(),
    data: new Date().toISOString().split("T")[0],
    numeroTest,
    note: "",
    distretti: [],
  };
}
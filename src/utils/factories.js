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

/** Distretto usato solo in `sessioniTest` (solo elenco test, niente Kiviat/VAS). */
export function createDistrettoTestOnly(nome) {
  return {
    id: uid(),
    nome,
    numeroValutazioneDistretto: "",
    tests: [
      {
        id: uid(),
        type: "",
        noteAltro: "",
        grip: {},
        left: {},
        right: {},
        lifts: [],
      },
    ],
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
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
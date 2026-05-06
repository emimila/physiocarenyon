import { uid } from "./helpers";

export const emptyScores = {
  forza: "",
  funzione: "",
  mobilitaPassiva: "",
  mobilitaAttiva: "",
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
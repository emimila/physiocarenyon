import { patientTrim } from "./helpers";
import { parseIsokineticNum } from "./isokineticCalculations";

export function findFirstIsokineticManualWeightKg(sessionForm) {
  for (const d of sessionForm.distretti || []) {
    for (const t of d.tests || []) {
      if (t.type !== "ISOKINETIC") continue;
      const iso = t.isokinetic || {};
      if (iso.weightConfirmation !== "manual") continue;
      const kg = parseIsokineticNum(iso.manualWeightKg);
      if (kg != null && kg > 0) return String(iso.manualWeightKg).trim();
    }
  }
  return null;
}

export function finalizeIsokineticWeightFields(sessionForm, patient, hadManualPatch) {
  const usedW = patientTrim(patient?.peso);
  return {
    ...sessionForm,
    distretti: (sessionForm.distretti || []).map((d) => ({
      ...d,
      tests: (d.tests || []).map((t) => {
        if (t.type !== "ISOKINETIC") return t;
        const iso = { ...(t.isokinetic || {}) };
        if (hadManualPatch && iso.weightConfirmation === "manual") {
          iso.weightConfirmation = "chart";
          iso.manualWeightKg = "";
        }
        if (iso.weightConfirmation === "chart" && usedW) {
          iso.bodyWeightKgUsed = usedW;
        } else if (
          iso.weightConfirmation === "manual" &&
          patientTrim(iso.manualWeightKg)
        ) {
          iso.bodyWeightKgUsed = String(iso.manualWeightKg).trim();
        }
        return { ...t, isokinetic: iso };
      }),
    })),
  };
}

export function isokineticSaveValidationError(sessionForm, patient, tt) {
  for (const d of sessionForm.distretti || []) {
    for (const t of d.tests || []) {
      if (t.type !== "ISOKINETIC") continue;
      const iso = t.isokinetic || {};
      if (!iso.injuredSide) continue;
      if (iso.weightConfirmation === "pending") {
        return (
          tt("tests.isokinetic.weightConfirmRequired") ||
          "Confermare il peso paziente."
        );
      }
      if (iso.weightConfirmation === "manual") {
        const kg = parseIsokineticNum(iso.manualWeightKg);
        if (kg == null || kg <= 0) {
          return (
            tt("tests.isokinetic.weightManualInvalid") ||
            "Peso non valido."
          );
        }
      }
      if (iso.weightConfirmation === "chart") {
        const kg = parseIsokineticNum(patient?.peso);
        if (kg == null || kg <= 0) {
          return (
            tt("tests.isokinetic.weightMissingOnChart") ||
            "Peso mancante in scheda."
          );
        }
      }
    }
  }
  return null;
}

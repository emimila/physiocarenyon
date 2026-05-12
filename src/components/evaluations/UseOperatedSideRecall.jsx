import { useState } from "react";
import { patientTrim } from "../../utils/helpers";

/**
 * Pulsante inline "Usa lato operato": precompila il lato testato
 * a partire da `patient.latoOperato` (destro / sinistro / bilaterale).
 * In caso di "bilaterale" mostra una mini scelta DX / SX.
 *
 * Props:
 * - tt: funzione di traduzione
 * - patient: oggetto paziente (legge `latoOperato`, `distrettoOperato`)
 * - currentSide: valore attuale del campo lato del test ("right" | "left" | "")
 * - onPick(side): callback chiamato con "right" o "left"
 */
export default function UseOperatedSideRecall({
  tt,
  patient,
  currentSide,
  onPick,
}) {
  const [showBilateralChoice, setShowBilateralChoice] = useState(false);

  const lato = patientTrim(patient?.latoOperato);
  if (!lato) return null;

  const distretto = patientTrim(patient?.distrettoOperato);
  const distrettoLabel = distretto
    ? tt(`options.distretti.${distretto}`) || distretto
    : "";

  const latoLabel =
    lato === "destro"
      ? tt("evaluation.right") || "Destro"
      : lato === "sinistro"
        ? tt("evaluation.left") || "Sinistro"
        : tt("evaluation.bilateral") || "Bilaterale";

  const summaryParts = [];
  if (distrettoLabel) {
    summaryParts.push(
      `${tt("patient.operatedDistrict") || "Distretto"}: ${distrettoLabel}`
    );
  }
  summaryParts.push(`${tt("patient.surgerySide") || "Lato"}: ${latoLabel}`);
  const summary = summaryParts.join(", ");

  function handleClick() {
    if (lato === "destro") {
      onPick("right");
      setShowBilateralChoice(false);
      return;
    }
    if (lato === "sinistro") {
      onPick("left");
      setShowBilateralChoice(false);
      return;
    }
    setShowBilateralChoice(true);
  }

  const disabled = Boolean(currentSide);

  return (
    <div style={{ marginTop: 6 }}>
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        title={summary}
        style={{
          fontSize: 12,
          padding: "4px 8px",
          borderRadius: 6,
          border: "1px solid #cbd5e1",
          background: disabled ? "#f1f5f9" : "#fff",
          color: disabled ? "#94a3b8" : "#0f172a",
          cursor: disabled ? "not-allowed" : "pointer",
        }}
      >
        {`${tt("tests.useOperatedSide") || "Usa lato operato"} (${summary})`}
      </button>

      {showBilateralChoice && lato === "bilaterale" && !disabled ? (
        <div
          style={{
            marginTop: 6,
            padding: "8px 10px",
            border: "1px dashed #cbd5e1",
            borderRadius: 6,
            background: "#f8fafc",
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            alignItems: "center",
          }}
        >
          <span style={{ fontSize: 12, color: "#475569" }}>
            {tt("evaluation.bilateral") || "Bilaterale"}:
          </span>
          <button
            type="button"
            onClick={() => {
              onPick("right");
              setShowBilateralChoice(false);
            }}
            style={{ fontSize: 12, padding: "3px 8px" }}
          >
            {`${tt("evaluation.right") || "Destro"} (DX)`}
          </button>
          <button
            type="button"
            onClick={() => {
              onPick("left");
              setShowBilateralChoice(false);
            }}
            style={{ fontSize: 12, padding: "3px 8px" }}
          >
            {`${tt("evaluation.left") || "Sinistro"} (SX)`}
          </button>
        </div>
      ) : null}
    </div>
  );
}

import { Fragment } from "react";
import ScoreSelect from "../ui/ScoreSelect";

/**
 * Condizione base (Kiviat): stessa griglia compatta del Dolore VAS —
 * Sinistro | Destro solo in cima; righe = Forza, Funzione, Mob. passiva/attiva, Qualità di movimento.
 */
export default function SideScores({
  tt,
  sinistro,
  destro,
  onSinistroChange,
  onDestroChange,
  /** Etichetta accessibile del gruppo (es. tipo blocco KIVIAT / KIVIAT_PAIN). */
  ariaGroupLabel,
}) {
  const rows = [
    { key: "forza", label: tt("evaluation.strength") },
    { key: "funzione", label: tt("evaluation.function") },
    { key: "mobilitaPassiva", label: tt("evaluation.passiveMobility") },
    { key: "mobilitaAttiva", label: tt("evaluation.activeMobility") },
    { key: "qualitaMovimento", label: tt("evaluation.movementQuality") },
  ];

  return (
    <div
      className="evaluation-pain-vas-grid"
      role="group"
      aria-label={
        ariaGroupLabel || tt("evaluation.blockType.KIVIAT")
      }
    >
      <span className="evaluation-pain-vas-grid__corner" aria-hidden />
      <span className="evaluation-pain-vas-grid__colhead">
        {tt("evaluation.left")}
      </span>
      <span className="evaluation-pain-vas-grid__colhead">
        {tt("evaluation.right")}
      </span>
      {rows.map(({ key, label }, idx) => (
        <Fragment key={key}>
          <span
            className={`evaluation-pain-vas-grid__rowlabel${
              idx === 0 ? " evaluation-pain-vas-grid__rowlabel--first" : ""
            }`}
          >
            {label}
          </span>
          <ScoreSelect
            hideLabel
            ariaLabel={`${label} — ${tt("evaluation.left")}`}
            label={label}
            value={sinistro?.[key]}
            onChange={(v) => onSinistroChange(key, v)}
          />
          <ScoreSelect
            hideLabel
            ariaLabel={`${label} — ${tt("evaluation.right")}`}
            label={label}
            value={destro?.[key]}
            onChange={(v) => onDestroChange(key, v)}
          />
        </Fragment>
      ))}
    </div>
  );
}

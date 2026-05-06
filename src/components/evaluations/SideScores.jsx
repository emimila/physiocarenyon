import ScoreSelect from "../ui/ScoreSelect";

export default function SideScores({ title, scores, onChange, tt }) {
  return (
    <div
      style={{
        border: "1px solid #eee",
        padding: 10,
        borderRadius: 8,
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      <h4>{title}</h4>

      <ScoreSelect
        label={tt("evaluation.strength")}
        value={scores.forza}
        onChange={(v) => onChange("forza", v)}
      />

      <ScoreSelect
        label={tt("evaluation.function")}
        value={scores.funzione}
        onChange={(v) => onChange("funzione", v)}
      />

      <ScoreSelect
        label={tt("evaluation.passiveMobility")}
        value={scores.mobilitaPassiva}
        onChange={(v) => onChange("mobilitaPassiva", v)}
      />

      <ScoreSelect
        label={tt("evaluation.activeMobility")}
        value={scores.mobilitaAttiva}
        onChange={(v) => onChange("mobilitaAttiva", v)}
      />
    </div>
  );
}
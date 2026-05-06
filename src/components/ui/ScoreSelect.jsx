export default function ScoreSelect({
  label,
  value,
  onChange,
  /** Solo select; `ariaLabel` o `label` per accessibilità (griglia condizione base / VAS). */
  hideLabel = false,
  ariaLabel,
}) {
  const a11y = ariaLabel || label;

  const selectStyle = { padding: 8, width: "100%" };

  if (hideLabel) {
    return (
      <div className="score-select score-select--hide-label">
        <select
          aria-label={a11y}
          value={value ?? ""}
          onChange={(e) => onChange(Number(e.target.value))}
          style={selectStyle}
        >
          <option value="">--</option>
          <option value="0">0</option>
          <option value="1">1</option>
          <option value="2">2</option>
          <option value="3">3</option>
          <option value="4">4</option>
          <option value="5">5</option>
        </select>
      </div>
    );
  }

  return (
    <label style={{ display: "block", marginBottom: 8 }}>
      <strong>{label}</strong>
      <br />
      <select
        value={value ?? ""}
        onChange={(e) => onChange(Number(e.target.value))}
        style={selectStyle}
      >
        <option value="">--</option>
        <option value="0">0</option>
        <option value="1">1</option>
        <option value="2">2</option>
        <option value="3">3</option>
        <option value="4">4</option>
        <option value="5">5</option>
      </select>
    </label>
  );
}
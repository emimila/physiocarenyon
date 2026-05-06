export default function Score10({
  label,
  value,
  onChange,
  min = 0,
  max = 10,
  /** Stessa scala/spaziatura delle etichette compatte (Select/Textarea nel blocco valutazione). */
  compact = false,
  /** Con `compact`: solo select, etichetta in aria (griglia Dolore VAS con header unico). */
  hideLabel = false,
}) {
  const opts = [];
  for (let i = min; i <= max; i += 1) opts.push(i);

  const selectStyle = {
    padding: 8,
    width: "100%",
    maxWidth: compact ? "100%" : 420,
  };

  if (compact && hideLabel) {
    return (
      <div className="score10 score10--compact score10--hide-label">
        <select
          aria-label={label}
          value={value === 0 || value === "0" ? String(value) : value || ""}
          onChange={(e) => onChange(e.target.value)}
          style={selectStyle}
        >
          <option value="">--</option>
          {opts.map((i) => (
            <option key={i} value={String(i)}>
              {i}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (compact) {
    return (
      <label className="score10 score10--compact">
        <span className="score10__label">{label}</span>
        <select
          value={value === 0 || value === "0" ? String(value) : value || ""}
          onChange={(e) => onChange(e.target.value)}
          style={selectStyle}
        >
          <option value="">--</option>
          {opts.map((i) => (
            <option key={i} value={String(i)}>
              {i}
            </option>
          ))}
        </select>
      </label>
    );
  }

  return (
    <label style={{ display: "block", marginBottom: 6 }}>
      <strong>{label}</strong>
      <br />
      <select
        value={value === 0 || value === "0" ? String(value) : value || ""}
        onChange={(e) => onChange(e.target.value)}
        style={selectStyle}
      >
        <option value="">--</option>
        {opts.map((i) => (
          <option key={i} value={String(i)}>
            {i}
          </option>
        ))}
      </select>
    </label>
  );
}

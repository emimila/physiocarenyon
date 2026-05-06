export default function Select({ label, value, onChange, options }) {
  const hasEmptyChoice = (options || []).some((opt) => {
    const v = typeof opt === "object" ? opt.value : opt;
    return v === "" || v == null;
  });

  return (
    <label style={{ display: "block", marginBottom: 10 }}>
      <strong>{label}</strong>
      <br />

      <select
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        style={{ padding: 8, width: "100%", maxWidth: 420 }}
      >
        {!hasEmptyChoice ? (
          <option value="">--</option>
        ) : null}

        {(options || []).map((opt, optIndex) => {
          const optionValue = typeof opt === "object" ? opt.value : opt;
          const optionLabel = typeof opt === "object" ? opt.label : opt;

          return (
            <option
              key={`opt-${optIndex}-${String(optionLabel)}`}
              value={optionValue}
            >
              {optionLabel}
            </option>
          );
        })}
      </select>
    </label>
  );
}
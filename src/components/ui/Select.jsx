export default function Select({ label, value, onChange, options }) {
  return (
    <label style={{ display: "block", marginBottom: 10 }}>
      <strong>{label}</strong>
      <br />

      <select
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        style={{ padding: 8, width: "100%", maxWidth: 420 }}
      >
        <option value="">--</option>

        {options.map((opt) => {
          const optionValue = typeof opt === "object" ? opt.value : opt;
          const optionLabel = typeof opt === "object" ? opt.label : opt;

          return (
            <option key={optionValue} value={optionValue}>
              {optionLabel}
            </option>
          );
        })}
      </select>
    </label>
  );
}
export default function SelectWithLabels({ label, value, onChange, options }) {
  return (
    <label style={{ display: "block", marginBottom: 10 }}>
      <strong>{label}</strong>
      <br />
      <select
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        style={{ padding: 8, width: "100%", maxWidth: 520 }}
      >
        <option value="">--</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}
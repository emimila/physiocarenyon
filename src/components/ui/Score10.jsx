export default function Score10({ label, value, onChange }) {
  return (
    <label style={{ display: "block", marginBottom: 6 }}>
      <strong>{label}</strong>
      <br />
      <select
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        style={{ padding: 8, width: "100%", maxWidth: 420 }}
      >
        <option value="">--</option>
        {[...Array(11)].map((_, i) => (
          <option key={i} value={i}>
            {i}
          </option>
        ))}
      </select>
    </label>
  );
}
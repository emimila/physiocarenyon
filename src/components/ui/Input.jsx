export default function Input({ label, value, onChange, type = "text" }) {
  return (
    <label style={{ display: "block", marginBottom: 10 }}>
      <strong>{label}</strong>
      <br />
      <input
        type={type}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        style={{ padding: 8, width: "100%", maxWidth: 420 }}
      />
    </label>
  );
}
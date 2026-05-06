export default function Textarea({ label, value, onChange }) {
  return (
    <label style={{ display: "block", marginBottom: 10 }}>
      <strong>{label}</strong>
      <br />
      <textarea
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        style={{ padding: 8, width: "100%", maxWidth: 600 }}
      />
    </label>
  );
}
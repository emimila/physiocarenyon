export default function ScoreSelect({ label, value, onChange }) {
  return (
    <label style={{ display: "block", marginBottom: 8 }}>
      <strong>{label}</strong>
      <br />
      <select
        value={value ?? ""}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ padding: 8, width: "100%" }}
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
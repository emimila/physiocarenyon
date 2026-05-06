export default function Score10({
  label,
  value,
  onChange,
  min = 0,
  max = 10,
}) {
  const opts = [];
  for (let i = min; i <= max; i += 1) opts.push(i);

  return (
    <label style={{ display: "block", marginBottom: 6 }}>
      <strong>{label}</strong>
      <br />
      <select
        value={value === 0 || value === "0" ? String(value) : value || ""}
        onChange={(e) => onChange(e.target.value)}
        style={{ padding: 8, width: "100%", maxWidth: 420 }}
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
export default function Textarea({
  label,
  value,
  onChange,
  fullWidth = false,
  compact = false,
  /** 1 = stessa scala verticale di select / data (espandibile); ≥2 per più righe iniziali. */
  minRows = 1,
}) {
  const rows = Math.max(1, minRows);
  const controlLike = rows === 1;
  return (
    <label
      style={{
        display: "block",
        marginBottom: compact ? 4 : 10,
      }}
    >
      <strong>{label}</strong>
      <br />
      <textarea
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        style={{
          padding: 8,
          width: "100%",
          maxWidth: fullWidth ? "100%" : 600,
          minHeight: controlLike ? "2.375rem" : "3.35rem",
          lineHeight: 1.35,
          boxSizing: "border-box",
          resize: "vertical",
        }}
      />
    </label>
  );
}

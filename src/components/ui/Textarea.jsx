export default function Textarea({
  label,
  value,
  onChange,
  fullWidth = false,
  compact = false,
}) {
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
        rows={2}
        style={{
          padding: 8,
          width: "100%",
          maxWidth: fullWidth ? "100%" : 600,
          minHeight: "3.35rem",
          lineHeight: 1.35,
          boxSizing: "border-box",
          resize: "vertical",
        }}
      />
    </label>
  );
}
export default function Input({
  label,
  value,
  onChange,
  type = "text",
  fullWidth = false,
  dense = false,
}) {
  const shortField = type === "number" || type === "date";
  return (
    <label
      style={{
        display: "block",
        marginBottom: dense ? 4 : 10,
      }}
    >
      <strong>{label}</strong>
      <br />
      <input
        type={type}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        style={{
          padding: 8,
          width: "100%",
          maxWidth: fullWidth ? "100%" : 420,
          lineHeight: 1.35,
          boxSizing: "border-box",
          ...(shortField
            ? {}
            : { minHeight: "2.375rem", verticalAlign: "top" }),
        }}
      />
    </label>
  );
}

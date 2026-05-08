export default function Input({ label, value, onChange, type = "text" }) {
  const shortField = type === "number" || type === "date";
  return (
    <label style={{ display: "block", marginBottom: 10 }}>
      <strong>{label}</strong>
      <br />
      <input
        type={type}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        style={{
          padding: 8,
          width: "100%",
          maxWidth: 420,
          lineHeight: 1.35,
          boxSizing: "border-box",
          ...(shortField
            ? {}
            : { minHeight: "3.35rem", verticalAlign: "top" }),
        }}
      />
    </label>
  );
}
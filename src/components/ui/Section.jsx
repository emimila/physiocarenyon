export default function Section({ title, children }) {
  return (
    <div
      style={{
        border: "1px solid #ddd",
        borderRadius: 10,
        padding: 15,
        marginBottom: 15,
      }}
    >
      <h3>{title}</h3>
      {children}
    </div>
  );
}
export default function Section({ title, titleAside, children }) {
  return (
    <div
      className="section-card"
      style={{
        border: "1px solid #ddd",
        borderRadius: 10,
        padding: 15,
        marginBottom: 15,
      }}
    >
      {titleAside != null && titleAside !== false ? (
        <div
          className="section-card__header"
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            marginBottom: 12,
          }}
        >
          <h3 style={{ margin: 0 }}>{title}</h3>
          {titleAside}
        </div>
      ) : (
        <h3>{title}</h3>
      )}
      {children}
    </div>
  );
}
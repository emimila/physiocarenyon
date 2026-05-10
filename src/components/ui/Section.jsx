export default function Section({ title, titleAside, children, compact }) {
  return (
    <div
      className={
        compact ? "section-card section-card--compact" : "section-card"
      }
      style={{
        border: "1px solid #ddd",
        borderRadius: compact ? 8 : 10,
        padding: compact ? 10 : 15,
        marginBottom: compact ? 10 : 15,
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
            marginBottom: compact ? 8 : 12,
          }}
        >
          <h3 style={{ margin: 0, fontSize: compact ? "0.95rem" : undefined }}>
            {title}
          </h3>
          {titleAside}
        </div>
      ) : (
        <h3 style={{ fontSize: compact ? "0.95rem" : undefined }}>{title}</h3>
      )}
      {children}
    </div>
  );
}
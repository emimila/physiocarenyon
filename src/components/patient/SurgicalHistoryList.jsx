import { useMemo } from "react";
import { monthOptionsLong } from "../../utils/monthNames";
import { migrateAntecedentiToLineRows } from "../../utils/clinicalHistory";

/**
 * Lista per «Antecedenti e operazioni chirurgiche rilevanti».
 *
 * Righe indipendenti `{ line: "kind" | "date", ... }` in ordine. Il pulsante +
 * sulla riga Tipo inserisce una riga Tipo subito dopo; + sulla riga Data
 * inserisce una riga Data subito dopo. × rimuove solo quella riga.
 *
 * Oggetti legacy (tipo e data nello stesso record) vengono espansi in sequenza
 * alla lettura (`migrateAntecedentiToLineRows`). Le righe vuote sono omesse al
 * salvataggio (`normalizeAntecedentiList`).
 */
export default function SurgicalHistoryList({
  rows,
  onChange,
  tt,
  lang = "it",
  label,
  highlightChange = false,
  disabled = false,
}) {
  const safeRows = Array.isArray(rows) ? rows : [];
  const monthOptions = useMemo(() => monthOptionsLong(lang), [lang]);

  const migrated = useMemo(
    () => migrateAntecedentiToLineRows(safeRows),
    [safeRows]
  );

  const showPlaceholder =
    safeRows.length === 0 || migrated.length === 0;

  const renderRows = showPlaceholder
    ? [
        { line: "kind", kind: "", kindDetail: "" },
        { line: "date", year: "", month: "", text: "" },
      ]
    : migrated;

  function sanitizeYear(raw) {
    return String(raw ?? "").replace(/\D/g, "").slice(0, 4);
  }

  function patchRow(index, partial) {
    const next = renderRows.map((r, i) =>
      i === index ? { ...r, ...partial } : { ...r }
    );
    onChange(next);
  }

  function insertRowAfter(index) {
    const row = renderRows[index];
    const line = row?.line === "date" ? "date" : "kind";
    const insert =
      line === "date"
        ? { line: "date", year: "", month: "", text: "" }
        : { line: "kind", kind: "", kindDetail: "" };
    onChange([
      ...renderRows.slice(0, index + 1),
      insert,
      ...renderRows.slice(index + 1),
    ]);
  }

  function removeRow(index) {
    const next = renderRows.filter((_, i) => i !== index);
    onChange(next.length === 0 ? [] : next);
  }

  const wrapperStyle = highlightChange
    ? {
        padding: 6,
        borderRadius: 6,
        boxShadow: "0 0 0 2px #f4c430",
        background: "#fff8e0",
      }
    : {};

  const kindLabel = tt("patient.surgeryKind", "Tipo");
  const kindDetailPlaceholder = tt("patient.surgeryKindDetail", "Specifica");
  const kindOptions = [
    { value: "generico", label: tt("patient.surgeryKindGenerico", "Generico") },
    {
      value: "ricorrente",
      label: tt("patient.surgeryKindRicorrente", "Ricorrente"),
    },
    { value: "altro", label: tt("patient.surgeryKindAltro", "Altro") },
  ];
  const yearPlaceholder = tt("patient.year", "Anno");
  const monthPlaceholder = tt("patient.month", "Mese");
  const textPlaceholder = tt("patient.surgeryDescription", "Descrizione");
  const removeAria = tt("patient.removeRow", "Rimuovi questa riga");
  const insertKindAria = tt(
    "patient.insertSurgeryKindRowAfter",
    "Aggiungi riga Tipo dopo questa"
  );
  const insertDateAria = tt(
    "patient.insertSurgeryDateRowAfter",
    "Aggiungi riga Data dopo questa"
  );

  const rowActionBtn = {
    width: 28,
    height: 28,
    borderRadius: 6,
    lineHeight: 1,
    padding: 0,
    cursor: disabled ? "default" : "pointer",
    background: "#fff",
    border: "1px solid #ccc",
    fontSize: 16,
    fontWeight: 600,
    flexShrink: 0,
  };

  const rowActions = (index, line) => {
    const insertAria = line === "date" ? insertDateAria : insertKindAria;
    return (
      <div
        style={{
          display: "flex",
          gap: 4,
          alignItems: "center",
          marginLeft: "auto",
          flexShrink: 0,
        }}
      >
        <button
          type="button"
          aria-label={insertAria}
          title={insertAria}
          disabled={disabled}
          onClick={() => insertRowAfter(index)}
          style={rowActionBtn}
        >
          +
        </button>
        <button
          type="button"
          aria-label={removeAria}
          title={removeAria}
          disabled={disabled}
          onClick={() => removeRow(index)}
          style={{
            ...rowActionBtn,
            color: "#b91c1c",
            borderColor: "#fecaca",
          }}
        >
          ×
        </button>
      </div>
    );
  };

  const inputBase = {
    padding: 6,
    boxSizing: "border-box",
    lineHeight: 1.35,
    fontFamily: "inherit",
    fontSize: "inherit",
  };

  const rowShell = {
    display: "flex",
    flexWrap: "wrap",
    gap: 6,
    alignItems: "center",
    width: "100%",
    padding: "6px 8px",
    border: "1px solid #e2e8f0",
    borderRadius: 6,
    background: "#fafbfc",
  };

  return (
    <div style={{ marginBottom: 10 }}>
      {label ? (
        <strong style={{ display: "block", marginBottom: 6 }}>{label}</strong>
      ) : null}
      <div style={wrapperStyle}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {renderRows.map((row, index) => {
            const key = `surg-line-${index}-${row.line || "x"}`;
            if (row.line === "date") {
              return (
                <div key={key} style={rowShell}>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="\d{0,4}"
                    maxLength={4}
                    placeholder={yearPlaceholder}
                    aria-label={yearPlaceholder}
                    value={row.year || ""}
                    disabled={disabled}
                    onChange={(e) =>
                      patchRow(index, { year: sanitizeYear(e.target.value) })
                    }
                    style={{
                      ...inputBase,
                      width: 80,
                    }}
                  />
                  <select
                    value={row.month || ""}
                    disabled={disabled}
                    aria-label={monthPlaceholder}
                    onChange={(e) => patchRow(index, { month: e.target.value })}
                    style={{
                      ...inputBase,
                      width: 130,
                    }}
                  >
                    <option value="">{monthPlaceholder}</option>
                    {monthOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder={textPlaceholder}
                    aria-label={textPlaceholder}
                    value={row.text || ""}
                    disabled={disabled}
                    onChange={(e) => patchRow(index, { text: e.target.value })}
                    style={{
                      ...inputBase,
                      flex: "1 1 200px",
                      minWidth: 160,
                    }}
                  />
                  {rowActions(index, "date")}
                </div>
              );
            }
            return (
              <div key={key} style={rowShell}>
                <select
                  value={row.kind || ""}
                  disabled={disabled}
                  aria-label={kindLabel}
                  onChange={(e) => patchRow(index, { kind: e.target.value })}
                  style={{
                    ...inputBase,
                    width: 140,
                  }}
                >
                  <option value="">{kindLabel}</option>
                  {kindOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder={kindDetailPlaceholder}
                  aria-label={kindDetailPlaceholder}
                  value={row.kindDetail || ""}
                  disabled={disabled}
                  onChange={(e) =>
                    patchRow(index, { kindDetail: e.target.value })
                  }
                  style={{
                    ...inputBase,
                    flex: "1 1 200px",
                    minWidth: 160,
                  }}
                />
                {rowActions(index, "kind")}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

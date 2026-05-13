import { useMemo } from "react";
import { monthOptionsLong } from "../../utils/monthNames";

/**
 * Lista datata per «Antecedenti e operazioni chirurgiche rilevanti».
 *
 * Componente controllato. Ogni voce è composta da DUE righe in linea:
 *   Riga A:  [ tipo (generico|ricorrente|altro) ] [ "specifica" testo libero ]
 *   Riga B:  [ anno (4 cifre) ] [ mese ] [ descrizione testo libero ]
 * Pulsante × elimina l'intera voce; "+ Aggiungi riga" appende una voce vuota.
 *
 * Nessun campo è obbligatorio: una voce con tutti i campi vuoti viene ignorata
 * lato salvataggio (`normalizeAntecedentiList`).
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
  const isEmpty = safeRows.length === 0;
  const blank = { kind: "", kindDetail: "", year: "", month: "", text: "" };
  const renderRows = isEmpty ? [blank] : safeRows;

  function sanitizeYear(raw) {
    return String(raw ?? "").replace(/\D/g, "").slice(0, 4);
  }

  function patchRow(index, partial) {
    if (isEmpty) {
      onChange([{ ...blank, ...partial }]);
      return;
    }
    const next = safeRows.map((r, i) =>
      i === index ? { ...blank, ...r, ...partial } : r
    );
    onChange(next);
  }

  function removeRow(index) {
    if (isEmpty) return;
    onChange(safeRows.filter((_, i) => i !== index));
  }

  function addRow() {
    if (isEmpty) {
      onChange([{ ...renderRows[0] }, { ...blank }]);
      return;
    }
    onChange([...safeRows, { ...blank }]);
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
  const addLabel = tt("patient.addRow", "+ Aggiungi riga");
  const removeAria = tt("patient.removeRow", "Rimuovi riga");

  const inputBase = {
    padding: 6,
    boxSizing: "border-box",
    lineHeight: 1.35,
    fontFamily: "inherit",
    fontSize: "inherit",
  };

  return (
    <div style={{ marginBottom: 10 }}>
      {label ? (
        <strong style={{ display: "block", marginBottom: 6 }}>{label}</strong>
      ) : null}
      <div style={wrapperStyle}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {renderRows.map((row, index) => (
            <div
              key={`surg-entry-${index}`}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 4,
                padding: "6px 8px",
                border: "1px solid #e2e8f0",
                borderRadius: 6,
                background: "#fafbfc",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 6,
                  alignItems: "center",
                }}
              >
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
                {!isEmpty ? (
                  <button
                    type="button"
                    aria-label={removeAria}
                    title={removeAria}
                    disabled={disabled}
                    onClick={() => removeRow(index)}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 6,
                      lineHeight: 1,
                      padding: 0,
                      cursor: "pointer",
                      background: "transparent",
                      border: "1px solid #ccc",
                    }}
                  >
                    ×
                  </button>
                ) : (
                  <span
                    style={{ width: 28, height: 28, display: "inline-block" }}
                    aria-hidden="true"
                  />
                )}
              </div>

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 6,
                  alignItems: "center",
                }}
              >
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
                <span
                  style={{ width: 28, height: 28, display: "inline-block" }}
                  aria-hidden="true"
                />
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addRow}
          disabled={disabled}
          aria-label={addLabel}
          style={{
            marginTop: 8,
            padding: "6px 10px",
            borderRadius: 6,
            cursor: "pointer",
            border: "1px solid #bbb",
            background: "#f5f5f5",
            fontSize: "0.875rem",
          }}
        >
          {addLabel}
        </button>
      </div>
    </div>
  );
}

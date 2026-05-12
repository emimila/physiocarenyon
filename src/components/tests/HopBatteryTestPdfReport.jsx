import {
  calcBMI,
  formatDateDMY,
  formatPatientListDisplayName,
  patientTrim,
  timeSinceYWD,
} from "../../utils/helpers";
import {
  ensureHopBatteryShape,
  formatHopLsiOneDecimal,
  HOP_BATTERY_ROW_KEYS,
  hopLsiBand,
  hopLsiBandColors,
  hopLsiPercent,
  meanHopLsi,
  parseHopNum,
} from "../../utils/hopBatteryCalculations";
import HopBatteryReportCharts from "./HopBatteryReportCharts";

const NAVY = "#0d5c68";
const MUTED = "#64748b";

const thPdf = {
  border: "1px solid #cbd5e1",
  padding: "5px 6px",
  fontSize: 10,
  fontWeight: 600,
  background: "#f1f5f9",
  textAlign: "center",
  verticalAlign: "middle",
};

const tdPdf = {
  border: "1px solid #cbd5e1",
  padding: "4px 6px",
  fontSize: 10,
  textAlign: "center",
  verticalAlign: "middle",
};

function disp(v) {
  if (v === "" || v == null) return "—";
  return String(v);
}

function dispMeasure(value, isReps, tt) {
  const n = parseHopNum(value);
  if (!Number.isFinite(n)) return "—";
  const suffix = isReps
    ? ` ${tt("tests.hopBattery.unitRepsShort")}`
    : ` ${tt("tests.hopBattery.unitCm")}`;
  const s = Number.isInteger(n) ? String(n) : String(n).replace(".", ",");
  return `${s}${suffix}`;
}

function patientSportLine(patient, tt) {
  const list = (patient?.sportMultipli || [])
    .filter(Boolean)
    .map((s) => {
      const lower = String(s).toLowerCase();
      const upper = String(s).charAt(0).toUpperCase() + String(s).slice(1);
      return (
        tt(`options.sport.${lower}`) ||
        tt(`options.sport.${upper}`) ||
        s
      );
    })
    .join(", ");
  const extra = patient?.sportAltro ? String(patient.sportAltro).trim() : "";
  return list && extra ? `${list}, ${extra}` : list || extra || "";
}

function sideLabel(side, tt) {
  if (side === "left") return `${tt("evaluation.left")} (SX)`;
  if (side === "right") return `${tt("evaluation.right")} (DX)`;
  return "—";
}

function PatientField({ label, value }) {
  if (!value) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <span
        style={{
          fontSize: 9,
          fontWeight: 600,
          color: MUTED,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </span>
      <span style={{ fontSize: 11, color: "#0f172a", fontWeight: 600 }}>
        {value}
      </span>
    </div>
  );
}

/**
 * Report PDF Hop Battery Test: brand → titolo → blocco paziente → tabella risultati →
 * sintesi LSI → (page-break) → grafici (HopBatteryReportCharts).
 * Stesso flusso html2pdf di IsokineticTestPdfReport: classi `.pdf-figure` / `.pdf-avoid-break`
 * vengono prese in carico da `pdf.css` durante l'export.
 */
export default function HopBatteryTestPdfReport({
  patient,
  session,
  test,
  districtLabel,
  tt,
}) {
  const hb = ensureHopBatteryShape(test?.hopBattery);
  const sessionDate = session?.data;

  const ageStr = patient?.dataNascita
    ? timeSinceYWD(patient.dataNascita, tt) || ""
    : "";
  const heightStr = patientTrim(patient?.altezza)
    ? `${patientTrim(patient.altezza)} cm`
    : "";
  const weightStr = patientTrim(patient?.peso)
    ? `${patientTrim(patient.peso)} kg`
    : "";
  const bmiVal = calcBMI(patient?.peso, patient?.altezza);
  const bmiStr = patientTrim(bmiVal) ? String(bmiVal) : "";
  const sportLine = patientSportLine(patient, tt);
  const noteAltro =
    test?.noteAltro && String(test.noteAltro).trim() !== ""
      ? String(test.noteAltro).trim()
      : "";

  const rows = HOP_BATTERY_ROW_KEYS.map((key) => {
    const p = hb[key] || {};
    const lsi = hopLsiPercent(hb.injuredSide, p.dx, p.sx);
    const band = hopLsiBand(lsi);
    const colors = hopLsiBandColors(band);
    const isReps = key === "sideHop";
    return {
      key,
      isReps,
      dx: p.dx,
      sx: p.sx,
      lsi,
      colors,
    };
  });
  const meanLsi = meanHopLsi(rows.map((r) => r.lsi));
  const meanBand = hopLsiBand(meanLsi);
  const meanColors = hopLsiBandColors(meanBand);

  const headerSubtitleParts = [
    `${tt("testSession.cardHeading")} ${session?.numeroTest ?? "—"}`,
    districtLabel || "",
    sessionDate ? formatDateDMY(sessionDate) : "",
  ].filter(Boolean);

  return (
    <div
      className="hop-battery-test-pdf-report pdf-figure"
      style={{
        marginTop: 8,
        fontFamily:
          'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
        color: "#0f172a",
        maxWidth: "100%",
        boxSizing: "border-box",
      }}
    >
      <div
        className="pdf-avoid-break hop-battery-test-pdf-header"
        style={{
          padding: "10px 12px",
          borderBottom: "1px solid #e2e8f0",
          marginBottom: 10,
        }}
      >
        <h2
          style={{
            margin: "0 0 2px",
            fontSize: 22,
            fontWeight: 800,
            color: NAVY,
            lineHeight: 1.1,
            letterSpacing: "-0.01em",
          }}
        >
          {tt("tests.hopBattery.hopPdfTitle")}
        </h2>
        {headerSubtitleParts.length > 0 ? (
          <div style={{ marginTop: 4, fontSize: 11, color: "#475569" }}>
            {headerSubtitleParts.join(" · ")}
          </div>
        ) : null}
      </div>

      <div
        className="pdf-avoid-break hop-battery-test-pdf-patient"
        style={{
          marginBottom: 12,
          padding: "10px 12px",
          border: "1px solid #e2e8f0",
          borderRadius: 10,
          background: "#f8fafc",
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: NAVY,
            marginBottom: 8,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}
        >
          {tt("tests.hopBattery.hopPdfPatientSection")}
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: "10px 16px",
          }}
        >
          <PatientField
            label={`${tt("patient.firstName")} ${tt("patient.lastName")}`}
            value={formatPatientListDisplayName(patient) || "—"}
          />
          <PatientField
            label={tt("patient.birthDate")}
            value={
              patient?.dataNascita
                ? `${formatDateDMY(patient.dataNascita)}${
                    ageStr ? ` (${ageStr})` : ""
                  }`
                : ""
            }
          />
          <PatientField
            label={tt("patient.height")}
            value={heightStr}
          />
          <PatientField
            label={tt("patient.weight")}
            value={weightStr}
          />
          <PatientField label={tt("patient.bmi")} value={bmiStr} />
          <PatientField
            label={tt("tests.hopBattery.dominantSideLabel")}
            value={hb.dominantSide ? sideLabel(hb.dominantSide, tt) : ""}
          />
          <PatientField
            label={tt("tests.hopBattery.injuredSideLabel")}
            value={hb.injuredSide ? sideLabel(hb.injuredSide, tt) : ""}
          />
          <PatientField
            label={tt("patient.injuryDate")}
            value={
              patient?.dataInfortunio
                ? formatDateDMY(patient.dataInfortunio)
                : ""
            }
          />
          <PatientField
            label={tt("tests.hopBattery.pdfSportActivity")}
            value={sportLine}
          />
        </div>
        {noteAltro ? (
          <div
            style={{
              marginTop: 10,
              padding: "8px 10px",
              borderRadius: 8,
              background: "#fff",
              border: "1px solid #e2e8f0",
              fontSize: 10,
              lineHeight: 1.45,
              color: "#334155",
            }}
          >
            <strong>{tt("evaluation.otherDetailsOptional")}:</strong>{" "}
            {noteAltro}
          </div>
        ) : null}
      </div>

      <div
        className="pdf-avoid-break hop-battery-test-pdf-results"
        style={{ marginBottom: 12 }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: NAVY,
            marginBottom: 8,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}
        >
          {tt("tests.hopBattery.hopPdfResultsSection")}
        </div>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            tableLayout: "fixed",
          }}
        >
          <colgroup>
            <col />
            <col style={{ width: "20%" }} />
            <col style={{ width: "20%" }} />
            <col style={{ width: "18%" }} />
          </colgroup>
          <thead>
            <tr>
              <th style={thPdf}>{tt("evaluation.test")}</th>
              <th style={thPdf}>{tt("evaluation.right")} (DX)</th>
              <th style={thPdf}>{tt("evaluation.left")} (SX)</th>
              <th style={thPdf}>{tt("tests.hopBattery.lsiLabel")} %</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key}>
                <td style={{ ...tdPdf, textAlign: "left", fontWeight: 600 }}>
                  {tt(`tests.hopBattery.${r.key}`)}
                </td>
                <td style={tdPdf}>{dispMeasure(r.dx, r.isReps, tt)}</td>
                <td style={tdPdf}>{dispMeasure(r.sx, r.isReps, tt)}</td>
                <td
                  style={{
                    ...tdPdf,
                    fontWeight: 700,
                    color: r.lsi != null ? r.colors.fg : "#475569",
                    background:
                      r.lsi != null ? `${r.colors.bg}` : undefined,
                  }}
                >
                  {disp(formatHopLsiOneDecimal(r.lsi))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div
        className="pdf-avoid-break hop-battery-test-pdf-lsi"
        style={{
          marginBottom: 14,
          padding: "10px 12px",
          border: "1px solid #e2e8f0",
          borderRadius: 10,
          background: "#fff",
        }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            gap: 12,
            alignItems: "center",
            marginBottom: 8,
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: NAVY,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            {tt("tests.hopBattery.hopPdfLsiSection")}
          </div>
          {meanLsi != null ? (
            <div
              style={{
                display: "inline-flex",
                alignItems: "baseline",
                gap: 8,
                padding: "6px 12px",
                borderRadius: 999,
                background: meanColors.bg,
                border: `1px solid ${meanColors.bar}66`,
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: NAVY,
                }}
              >
                {tt("tests.hopBattery.meanLsi")}
              </span>
              <span
                style={{
                  fontSize: 16,
                  fontWeight: 800,
                  color: meanColors.fg,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {formatHopLsiOneDecimal(meanLsi)}
              </span>
            </div>
          ) : null}
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: 8,
          }}
        >
          {rows.map((r) => (
            <div
              key={`lsi-${r.key}`}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 8,
                padding: "6px 10px",
                borderRadius: 8,
                background: r.lsi != null ? r.colors.bg : "#f1f5f9",
                border: `1px solid ${
                  r.lsi != null ? `${r.colors.bar}55` : "#e2e8f0"
                }`,
                fontSize: 11,
              }}
            >
              <span style={{ color: "#334155", fontWeight: 600 }}>
                {tt(`tests.hopBattery.${r.key}`)}
              </span>
              <span
                style={{
                  fontWeight: 800,
                  color: r.lsi != null ? r.colors.fg : "#475569",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {disp(formatHopLsiOneDecimal(r.lsi))}
              </span>
            </div>
          ))}
        </div>
        <p
          style={{
            margin: "10px 0 0",
            fontSize: 9,
            color: MUTED,
            lineHeight: 1.4,
          }}
        >
          {tt("tests.hopBattery.pdfSidebarFormula")}
        </p>
      </div>

      <div
        className="hop-battery-test-pdf-charts-page"
        style={{ marginTop: 8 }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: NAVY,
            marginBottom: 8,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}
        >
          {tt("tests.hopBattery.hopPdfChartsSection")}
        </div>
        <HopBatteryReportCharts
          test={test}
          tt={tt}
          patient={patient}
          session={session}
          sessionDate={sessionDate}
          districtLabel={districtLabel}
        />
      </div>
    </div>
  );
}

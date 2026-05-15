import { formatDateDMY, formatPatientListDisplayName } from "../../utils/helpers";
import {
  computeRowMetrics,
  formatPct1,
  formatTorquePerWeight,
  hqPercent,
  normalizeIsokineticRowsForReport,
  parseIsokineticNum,
  torquePerBodyWeightNmPerKg,
} from "../../utils/isokineticCalculations";
import {
  ISOKINETIC_FIELD_I18N,
  ISOKINETIC_SIDE_TABLE_FIELDS,
} from "../evaluations/IsokineticTestFields";
import {
  IsokineticCommentList,
  IsokineticContralateralPanel,
  IsokineticReferencePanel,
  metricsForClinicalFocusRow,
} from "../evaluations/IsokineticClinicalPanels";
import IsokineticPeakTorqueReportChart from "./IsokineticPeakTorqueReportChart";

function disp(v) {
  if (v === "" || v == null) return "—";
  return String(v);
}

const thPdf = {
  border: "1px solid #cbd5e1",
  padding: "4px 4px",
  fontSize: 9,
  fontWeight: 600,
  background: "#f1f5f9",
  textAlign: "center",
  verticalAlign: "middle",
};

const tdPdf = {
  border: "1px solid #cbd5e1",
  padding: "3px 4px",
  fontSize: 9,
  textAlign: "center",
  verticalAlign: "middle",
};

/**
 * Report isocinetico per export PDF (stesso flusso di Y Balance / html2pdf).
 */
export default function IsokineticTestPdfReport({
  patient,
  session,
  test,
  districtLabel,
  tt,
}) {
  const iso = test?.isokinetic || {};
  const rows = normalizeIsokineticRowsForReport(iso);
  const injured = iso.injuredSide;
  const { metrics: clinicalSel, speed: clinicalSpeed } =
    metricsForClinicalFocusRow(rows, injured, iso.clinicalFocusSpeed);

  const headerSubtitle = [
    tt("tests.isokinetic.title"),
    `${tt("testSession.cardHeading")} ${session?.numeroTest ?? "—"}`,
    districtLabel || "—",
    session?.data ? formatDateDMY(session.data) : "—",
  ].join(" · ");

  const injuredLabel =
    injured === "left"
      ? `${tt("evaluation.left")} (SX)`
      : injured === "right"
        ? `${tt("evaluation.right")} (DX)`
        : "—";

  const weightKg =
    parseIsokineticNum(iso.bodyWeightKgUsed) ??
    parseIsokineticNum(patient?.peso);

  function dispNmPerKg(torqueStr) {
    const tq = parseIsokineticNum(torqueStr);
    const r = torquePerBodyWeightNmPerKg(tq, weightKg);
    return formatTorquePerWeight(r) ?? "—";
  }

  return (
    <div
      className="isokinetic-pdf-report pdf-figure"
      style={{
        marginTop: 8,
        fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
        color: "#0f172a",
        maxWidth: "100%",
        boxSizing: "border-box",
      }}
    >
      <div
        className="pdf-avoid-break isokinetic-pdf-header"
        style={{
          marginBottom: 12,
          padding: "10px 12px",
          borderBottom: "1px solid #e2e8f0",
          fontSize: 12,
          lineHeight: 1.45,
        }}
      >
        <div style={{ fontWeight: 600 }}>
          {formatPatientListDisplayName(patient) || "—"}
        </div>
        {patient?.dataNascita ? (
          <div style={{ color: "#64748b", fontSize: 11 }}>
            {tt("patient.birthDate")}: {formatDateDMY(patient.dataNascita)}
          </div>
        ) : null}
        <div style={{ marginTop: 8, fontSize: 11, color: "#334155" }}>
          {headerSubtitle}
        </div>
        <div style={{ fontSize: 11, color: "#475569", marginTop: 4 }}>
          <strong>{tt("tests.isokinetic.injuredSideQuestion")}:</strong>{" "}
          {injuredLabel}
        </div>
        {injured && weightKg != null && weightKg > 0 ? (
          <div style={{ fontSize: 11, color: "#475569", marginTop: 4 }}>
            <strong>{tt("tests.isokinetic.pdfWeightUsed")}:</strong> {weightKg}{" "}
            kg
          </div>
        ) : null}
      </div>

      <h4
        style={{
          margin: "10px 0 10px",
          fontSize: 14,
          textAlign: "center",
          letterSpacing: "0.04em",
        }}
      >
        {tt("patient.testCharts.isokineticReportHeading")}
      </h4>

      <p
        className="isokinetic-pdf-table-legend pdf-avoid-break"
        style={{
          margin: "0 0 12px",
          padding: "8px 10px",
          fontSize: 10,
          lineHeight: 1.45,
          color: "#334155",
          background: "#f8fafc",
          border: "1px solid #e2e8f0",
          borderRadius: 8,
        }}
      >
        {tt("tests.isokinetic.tableMeasuresLegend")}
      </p>

      {["right", "left"].map((side) => (
        <div
          key={side}
          className="pdf-avoid-break isokinetic-pdf-block"
          style={{ marginBottom: 12 }}
        >
          <div style={{ fontWeight: 700, marginBottom: 6, fontSize: 11 }}>
            {side === "right"
              ? tt("tests.isokinetic.blockRight")
              : tt("tests.isokinetic.blockLeft")}
          </div>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              tableLayout: "fixed",
            }}
          >
            <thead>
              <tr>
                <th style={thPdf}>{tt("tests.isokinetic.speedColumnShort")}</th>
                <th style={thPdf}>
                  {tt("tests.isokinetic.contractionColumnShort")}
                </th>
                <th style={thPdf}>{tt("tests.isokinetic.repsColumnShort")}</th>
                {ISOKINETIC_SIDE_TABLE_FIELDS.map((f) => (
                  <th key={f} style={thPdf}>
                    {tt(`tests.isokinetic.${ISOKINETIC_FIELD_I18N[f]}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={`${side}-${row.speed}`}>
                  <td style={tdPdf}>{row.speed}°/s</td>
                  <td style={tdPdf}>
                    {tt("tests.isokinetic.concentricAbbrev")}
                  </td>
                  <td style={tdPdf}>{row.reps}</td>
                  {ISOKINETIC_SIDE_TABLE_FIELDS.map((f) => (
                    <td key={f} style={tdPdf}>
                      {disp(row[side]?.[f])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      <div
        className="pdf-avoid-break isokinetic-pdf-block"
        style={{ marginBottom: 12 }}
      >
        <div style={{ fontWeight: 700, marginBottom: 6, fontSize: 11 }}>
          {tt("tests.isokinetic.blockAuto")}
        </div>
        <table
          style={{
            width: "100%",
            maxWidth: "100%",
            borderCollapse: "collapse",
            tableLayout: "fixed",
          }}
        >
          <thead>
            <tr>
              <th style={thPdf}>{tt("tests.isokinetic.speedColumnShort")}</th>
              <th style={thPdf}>{tt("tests.isokinetic.hqRightShort")}</th>
              <th style={thPdf}>{tt("tests.isokinetic.hqLeftShort")}</th>
              <th style={thPdf}>{tt("tests.isokinetic.lsiExtShort")}</th>
              <th style={thPdf}>{tt("tests.isokinetic.lsiFlexShort")}</th>
              <th style={thPdf}>{tt("tests.isokinetic.cmPerKgRightExtShort")}</th>
              <th style={thPdf}>{tt("tests.isokinetic.cmPerKgRightFlexShort")}</th>
              <th style={thPdf}>{tt("tests.isokinetic.cmPerKgLeftExtShort")}</th>
              <th style={thPdf}>{tt("tests.isokinetic.cmPerKgLeftFlexShort")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const m = computeRowMetrics(row, injured);
              return (
                <tr key={`calc-${row.speed}`}>
                  <td style={tdPdf}>{row.speed}°/s</td>
                  <td style={tdPdf}>
                    {formatPct1(
                      hqPercent(
                        parseIsokineticNum(row.right?.ptFlex),
                        parseIsokineticNum(row.right?.ptExt)
                      )
                    ) ?? "—"}
                  </td>
                  <td style={tdPdf}>
                    {formatPct1(
                      hqPercent(
                        parseIsokineticNum(row.left?.ptFlex),
                        parseIsokineticNum(row.left?.ptExt)
                      )
                    ) ?? "—"}
                  </td>
                  <td style={tdPdf}>
                    {injured ? formatPct1(m?.lsiExt) ?? "—" : "—"}
                  </td>
                  <td style={tdPdf}>
                    {injured ? formatPct1(m?.lsiFlex) ?? "—" : "—"}
                  </td>
                  <td style={tdPdf}>{dispNmPerKg(row.right?.ptExt)}</td>
                  <td style={tdPdf}>{dispNmPerKg(row.right?.ptFlex)}</td>
                  <td style={tdPdf}>{dispNmPerKg(row.left?.ptExt)}</td>
                  <td style={tdPdf}>{dispNmPerKg(row.left?.ptFlex)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div
        className="isokinetic-pdf-torque-chart-wide"
        style={{
          width: "100%",
          maxWidth: "100%",
          marginTop: 10,
          marginBottom: 12,
          boxSizing: "border-box",
        }}
      >
        <IsokineticPeakTorqueReportChart
          rows={rows}
          injuredSide={injured}
          tt={tt}
          variant="pdf"
        />
      </div>

      <div
        className="isokinetic-pdf-clinical pdf-avoid-break"
        style={{ marginTop: 10, marginBottom: 12 }}
      >
        <div
          style={{
            fontWeight: 700,
            marginBottom: 10,
            fontSize: 11,
            color: "#0f172a",
          }}
        >
          {tt("patient.testCharts.isokineticPdfClinicalTitle")}{" "}
          <span style={{ fontWeight: 500, color: "#64748b" }}>
            ({clinicalSpeed}°/s)
          </span>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: 12,
            alignItems: "start",
          }}
        >
          <div
            style={{
              border: "1px solid #e2e8f0",
              borderRadius: 8,
              padding: 12,
              background: "#fafafa",
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 13 }}>
              {tt("tests.isokinetic.commentSelected")}{" "}
              <span style={{ color: "#64748b", fontWeight: 500 }}>
                ({clinicalSpeed}°/s)
              </span>
            </div>
            <IsokineticCommentList
              injuredSide={injured}
              sel={clinicalSel}
              tt={tt}
            />
          </div>
          <div
            style={{
              border: "1px solid #e2e8f0",
              borderRadius: 8,
              padding: 12,
              background: "#fafafa",
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 13 }}>
              {tt("tests.isokinetic.contralateralTitle")}
            </div>
            <IsokineticContralateralPanel
              injuredSide={injured}
              sel={clinicalSel}
              tt={tt}
            />
          </div>
        </div>
      </div>

      <div className="pdf-avoid-break" style={{ marginTop: 12, width: "100%" }}>
        <IsokineticReferencePanel tt={tt} />
      </div>

      {test?.noteAltro && String(test.noteAltro).trim() !== "" ? (
        <div
          className="pdf-avoid-break"
          style={{
            marginTop: 12,
            padding: "8px 10px",
            border: "1px solid #e2e8f0",
            borderRadius: 8,
            fontSize: 10,
          }}
        >
          <strong>{tt("evaluation.otherDetailsOptional")}:</strong>{" "}
          {String(test.noteAltro).trim()}
        </div>
      ) : null}
    </div>
  );
}

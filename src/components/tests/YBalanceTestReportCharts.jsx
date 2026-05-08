import { calculateYBalance, formatDateDMY } from "../../utils/helpers";
import {
  YB_DIRS,
  ybBest,
  ybBestDiffDxSx,
  ybLineChartDomain,
  ybMaxAsymmetryDirection,
  ybMaxForScale,
  ybTrials,
} from "../../utils/yBalanceChartModels";

/** Palette PhysioCare Nyon (index.css theme-pcn-try). */
const PCN_TEAL = "#1cbfd9";
const PCN_TEAL_DARK = "#0d5c68";
const PCN_TEAL_MID = "#127b8c";
const PCN_GREEN = "#00ab5b";
const COLOR_DX = PCN_TEAL_MID;
const COLOR_SX = PCN_GREEN;
const HEADER_DX = "rgba(28, 191, 217, 0.14)";
const HEADER_SX = "rgba(0, 171, 91, 0.12)";
const TABLE_SECTION_BG = PCN_TEAL_DARK;
const TABLE_HEAD_BG = "rgba(28, 191, 217, 0.08)";

const tdBase = {
  border: "1px solid rgba(13, 92, 104, 0.18)",
  padding: "6px 8px",
  fontSize: 12,
  textAlign: "center",
};

function fmt(v, d = 1) {
  if (v == null || !Number.isFinite(v)) return "—";
  return Number(v).toFixed(d);
}

function barH(val, maxY, h) {
  if (val == null || !Number.isFinite(val) || maxY <= 0) return 0;
  return Math.min(h, (Math.max(0, val) / maxY) * h);
}

function patientSportsLine(patient, tt) {
  const list = (patient?.sportMultipli || [])
    .filter(Boolean)
    .map((s) => {
      const lower = String(s).toLowerCase();
      const upper =
        String(s).charAt(0).toUpperCase() + String(s).slice(1);
      return (
        tt(`options.sport.${lower}`) ||
        tt(`options.sport.${upper}`) ||
        s
      );
    })
    .join(", ");
  const extra = patient?.sportAltro
    ? String(patient.sportAltro).trim()
    : "";
  return list && extra ? `${list}, ${extra}` : list || extra || "—";
}

/**
 * Report Y-Balance: tabelle a sinistra, grafici a destra (layout ref. clinica).
 */
export default function YBalanceTestReportCharts({
  test,
  tt,
  patient,
  sessionDate,
  districtLabel,
}) {
  const cy = calculateYBalance(test);
  const maxYBar = ybMaxForScale(test);
  const { minY: minLineY, maxY: maxLineY } = ybLineChartDomain(test);
  const asymRows = ybBestDiffDxSx(test);
  const maxAsym = ybMaxAsymmetryDirection(asymRows);
  const chartH = 200;

  const diffComposite = cy.right.composite - cy.left.composite;
  const limitedLeg =
    cy.right.composite < cy.left.composite
      ? tt("patient.testCharts.legRightLabel")
      : cy.left.composite < cy.right.composite
        ? tt("patient.testCharts.legLeftLabel")
        : "—";

  const deficientDirLabel =
    maxAsym?.dir != null
      ? tt(`patient.testCharts.dir.${maxAsym.dir}`)
      : "—";

  const ASYM_CM_THRESHOLD = 4;

  return (
    <div
      className="y-balance-full-report pdf-figure"
      style={{
        marginTop: 12,
        fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
        border: "1px solid rgba(13, 92, 104, 0.14)",
        borderRadius: 12,
        padding: 16,
        background: "rgba(28, 191, 217, 0.03)",
        maxWidth: "100%",
        boxSizing: "border-box",
        overflowX: "hidden",
        isolation: "isolate",
      }}
    >
      <h4
        style={{
          margin: "0 0 14px",
          fontSize: 16,
          textAlign: "center",
          letterSpacing: "0.03em",
        }}
      >
        {tt("patient.testCharts.yBalanceReportHeading")}
      </h4>

      <div
        className="yb-meta-grid pdf-avoid-break"
        style={{
          display: "grid",
          gap: "6px 20px",
          marginBottom: 16,
          fontSize: 12,
          color: "#334155",
        }}
      >
        <p style={{ margin: 0 }}>
          <strong>{tt("patient.testCharts.metaAthlete")}:</strong>{" "}
          {[patient?.nome, patient?.cognome].filter(Boolean).join(" ") || "—"}
        </p>
        <p style={{ margin: 0 }}>
          <strong>{tt("patient.testCharts.metaSport")}:</strong>{" "}
          {patientSportsLine(patient, tt)}
        </p>
        <p style={{ margin: 0 }}>
          <strong>{tt("patient.testCharts.metaDate")}:</strong>{" "}
          {sessionDate ? formatDateDMY(sessionDate) : "—"}
        </p>
        {districtLabel ? (
          <p style={{ margin: 0 }}>
            <strong>{tt("evaluation.district")}:</strong> {districtLabel}
          </p>
        ) : null}
        <p style={{ margin: 0 }}>
          <strong>{tt("patient.testCharts.metaLimbLength")}:</strong>{" "}
          {tt("patient.testCharts.legShortRight")}{" "}
          {test?.right?.legLength ?? "—"} {tt("patient.testCharts.cmUnit")} ·{" "}
          {tt("patient.testCharts.legShortLeft")}{" "}
          {test?.left?.legLength ?? "—"} {tt("patient.testCharts.cmUnit")}
        </p>
      </div>

      <div
        className="yb-report-main-grid"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 28,
          alignItems: "stretch",
          width: "100%",
          maxWidth: "100%",
          boxSizing: "border-box",
        }}
      >
        <div
          className="yb-report-tables"
          style={{ minWidth: 0, width: "100%", maxWidth: "100%" }}
        >
          <RawResultsTable test={test} tt={tt} />
          <NormalizedTable cy={cy} tt={tt} />
          <AsymmetryTable
            asymRows={asymRows}
            threshold={ASYM_CM_THRESHOLD}
            tt={tt}
          />
          <SynthesisTable
            cy={cy}
            diffComposite={diffComposite}
            maxAsym={maxAsym}
            deficientDirLabel={deficientDirLabel}
            limitedLeg={limitedLeg}
            tt={tt}
          />
          <p
            style={{
              margin: "12px 0 0",
              fontSize: 10,
              color: "#64748b",
              lineHeight: 1.4,
            }}
          >
            {tt("patient.testCharts.compositeFormula")}
          </p>
        </div>

        <div
          className="yb-report-charts"
          style={{
            minWidth: 0,
            width: "100%",
            maxWidth: "100%",
            boxSizing: "border-box",
          }}
        >
          <div
            className="yb-charts-pair-row"
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
              gap: 20,
              alignItems: "start",
              width: "100%",
              maxWidth: "100%",
              minWidth: 0,
              boxSizing: "border-box",
            }}
          >
            <div
              className="yb-chart-card"
              style={{
                border: `1px solid rgba(13, 92, 104, 0.22)`,
                borderRadius: 12,
                padding: 14,
                background: "#fff",
                boxSizing: "border-box",
                minWidth: 0,
                width: "100%",
                maxWidth: "100%",
                position: "relative",
                zIndex: 1,
              }}
            >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                flexWrap: "wrap",
                gap: 10,
                marginBottom: 10,
              }}
            >
              <h5 style={{ margin: 0, fontSize: 12, color: PCN_TEAL_DARK }}>
                {tt("patient.testCharts.chart1Title")}
              </h5>
              <div style={{ fontSize: 10, display: "flex", gap: 12, flexWrap: "wrap" }}>
                <span>
                  <strong style={{ color: PCN_TEAL }}>■</strong>{" "}
                  {tt("patient.testCharts.legendDxBest")}
                </span>
                <span>
                  <strong style={{ color: PCN_GREEN }}>■</strong>{" "}
                  {tt("patient.testCharts.legendSxBest")}
                </span>
              </div>
            </div>
            <p style={{ margin: "0 0 10px", fontSize: 10, color: "#475569" }}>
              {tt("patient.testCharts.axisDistanceCm")} (0 – {fmt(maxYBar, 0)}{" "}
              {tt("patient.testCharts.cmUnit")})
            </p>

            <div
              className="yb-c1-inner"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 14,
                width: "100%",
                minWidth: 0,
              }}
            >
              <div
                className="yb-bar-chart-grid"
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                  gap: 16,
                  width: "100%",
                  minWidth: 0,
                  minHeight: chartH + 40,
                  boxSizing: "border-box",
                  padding: "4px 0 0",
                }}
              >
                {YB_DIRS.map((dir) => {
                  const br = ybBest(test?.right, dir);
                  const bl = ybBest(test?.left, dir);
                  return (
                    <div
                      key={dir}
                      style={{
                        textAlign: "center",
                        minWidth: 0,
                        maxWidth: "100%",
                      }}
                    >
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: 10,
                          alignItems: "end",
                          justifyContent: "center",
                          height: chartH,
                          borderBottom: `1px solid rgba(13, 92, 104, 0.25)`,
                          paddingBottom: 2,
                          boxSizing: "border-box",
                          paddingInline: 4,
                        }}
                      >
                        {[br, bl].map((val, i) => (
                          <div
                            key={i}
                            style={{
                              minWidth: 0,
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                            }}
                          >
                            <div
                              style={{
                                fontSize: 10,
                                fontWeight: 700,
                                marginBottom: 4,
                                minHeight: 14,
                                color: i === 0 ? COLOR_DX : COLOR_SX,
                              }}
                            >
                              {fmt(val, 1)}
                            </div>
                            <div
                              style={{
                                width: "100%",
                                maxWidth: 48,
                                height: barH(val, maxYBar, chartH - 22),
                                background: i === 0 ? COLOR_DX : COLOR_SX,
                                borderRadius: "3px 3px 0 0",
                              }}
                            />
                          </div>
                        ))}
                      </div>
                      <div
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          marginTop: 8,
                          color: PCN_TEAL_DARK,
                          lineHeight: 1.25,
                          padding: "0 4px",
                          wordBreak: "break-word",
                        }}
                      >
                        {tt(`patient.testCharts.dir.${dir}`)}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div
                style={{
                  border: `1px solid rgba(28, 191, 217, 0.35)`,
                  borderRadius: 10,
                  padding: 12,
                  background: "rgba(28, 191, 217, 0.06)",
                  fontSize: 11,
                  width: "100%",
                  boxSizing: "border-box",
                }}
              >
                <div
                  style={{
                    fontWeight: 700,
                    marginBottom: 8,
                    color: PCN_TEAL_DARK,
                  }}
                >
                  {tt("patient.testCharts.diffBoxTitle")}
                </div>
                {asymRows.map((r) => (
                  <div
                    key={r.dir}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      marginBottom: 6,
                      alignItems: "baseline",
                    }}
                  >
                    <span style={{ flexShrink: 0 }}>
                      {tt(`patient.testCharts.dir.${r.dir}`)}
                    </span>
                    <strong style={{ color: PCN_TEAL_DARK }}>
                      {fmt(r.diffCm, 1)}
                    </strong>
                  </div>
                ))}
              </div>
            </div>
          </div>

            <div
              className="yb-chart-card"
              style={{
                border: `1px solid rgba(13, 92, 104, 0.22)`,
                borderRadius: 12,
                padding: 14,
                background: "#fff",
                boxSizing: "border-box",
                minWidth: 0,
                width: "100%",
                maxWidth: "100%",
                position: "relative",
                zIndex: 1,
              }}
            >
            <h5 style={{ margin: "0 0 8px", fontSize: 12, color: PCN_TEAL_DARK }}>
              {tt("patient.testCharts.chart2Title")}
            </h5>
            <p style={{ margin: "0 0 12px", fontSize: 10, color: "#475569" }}>
              {tt("patient.testCharts.axisDistanceCm")} ({fmt(minLineY, 0)} –{" "}
              {fmt(maxLineY, 0)} {tt("patient.testCharts.cmUnit")})
            </p>
            <div
              className="yb-chart2-panels"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 18,
                width: "100%",
                maxWidth: "100%",
                minWidth: 0,
              }}
            >
              {YB_DIRS.map((dir) => (
                <div
                  key={dir}
                  style={{
                    minWidth: 0,
                    width: "100%",
                    maxWidth: "100%",
                  }}
                >
                  <TrialsLinePanel
                    label={tt(`patient.testCharts.dir.${dir}`)}
                    rightT={ybTrials(test?.right, dir)}
                    leftT={ybTrials(test?.left, dir)}
                    minY={minLineY}
                    maxY={maxLineY}
                    height={200}
                    tt={tt}
                  />
                </div>
              ))}
            </div>
            <div
              style={{
                marginTop: 10,
                fontSize: 10,
                display: "flex",
                gap: 14,
                justifyContent: "center",
                flexWrap: "wrap",
              }}
            >
              <span>
                <strong style={{ color: PCN_TEAL_MID }}>●</strong>{" "}
                {tt("patient.testCharts.lineLegendDx")}
              </span>
              <span>
                <strong style={{ color: PCN_GREEN }}>●</strong>{" "}
                {tt("patient.testCharts.lineLegendSx")}
              </span>
            </div>
          </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 959px) {
          .yb-charts-pair-row {
            grid-template-columns: 1fr !important;
          }
        }
        @media (min-width: 1200px) {
          .yb-bar-chart-grid {
            gap: 20px !important;
          }
        }
      `}</style>
    </div>
  );
}

function RawResultsTable({ test, tt }) {
  return (
    <table
      style={{
        width: "100%",
        borderCollapse: "collapse",
        marginBottom: 12,
        background: "#fff",
      }}
    >
      <thead>
        <tr>
          <th
            colSpan={6}
            style={{
              ...tdBase,
              background: TABLE_SECTION_BG,
              color: "#fff",
              textAlign: "left",
              fontWeight: 700,
            }}
          >
            {tt("patient.testCharts.tableRawTitle")}
          </th>
        </tr>
        <tr>
          <th style={{ ...tdBase, background: TABLE_HEAD_BG }}>
            {tt("patient.testCharts.colLeg")}
          </th>
          <th style={{ ...tdBase, background: TABLE_HEAD_BG }}>
            {tt("patient.testCharts.colDirection")}
          </th>
          <th style={{ ...tdBase, background: TABLE_HEAD_BG }}>
            {tt("patient.testCharts.colTrial1")}
          </th>
          <th style={{ ...tdBase, background: TABLE_HEAD_BG }}>
            {tt("patient.testCharts.colTrial2")}
          </th>
          <th style={{ ...tdBase, background: TABLE_HEAD_BG }}>
            {tt("patient.testCharts.colTrial3")}
          </th>
          <th style={{ ...tdBase, background: TABLE_HEAD_BG }}>
            {tt("patient.testCharts.colBest")}
          </th>
        </tr>
      </thead>
      <tbody>
        {["right", "left"].map((side) => {
          const s = test?.[side] || {};
          const isR = side === "right";
          const legLabel = isR
            ? tt("patient.testCharts.legRightLabel")
            : tt("patient.testCharts.legLeftLabel");
          const rowBg = isR ? HEADER_DX : HEADER_SX;
          return YB_DIRS.map((dir, di) => {
            const trials = ybTrials(s, dir);
            const best = ybBest(s, dir);
            return (
              <tr key={`${side}-${dir}`}>
                {di === 0 ? (
                  <td
                    rowSpan={3}
                    style={{
                      ...tdBase,
                      background: rowBg,
                      fontWeight: 700,
                      verticalAlign: "middle",
                    }}
                  >
                    {legLabel}
                  </td>
                ) : null}
                <td style={{ ...tdBase, textAlign: "left", fontWeight: 600 }}>
                  {tt(`patient.testCharts.dir.${dir}`)}
                </td>
                {[0, 1, 2].map((i) => (
                  <td key={i} style={tdBase}>
                    {fmt(trials[i], 1)}
                  </td>
                ))}
                <td
                  style={{
                    ...tdBase,
                    fontWeight: 700,
                    color: isR ? COLOR_DX : COLOR_SX,
                  }}
                >
                  {fmt(best, 1)}
                </td>
              </tr>
            );
          });
        })}
      </tbody>
    </table>
  );
}

function NormalizedTable({ cy, tt }) {
  return (
    <table
      style={{
        width: "100%",
        borderCollapse: "collapse",
        marginBottom: 12,
        background: "#fff",
      }}
    >
      <thead>
        <tr>
          <th
            colSpan={5}
            style={{
              ...tdBase,
              background: TABLE_SECTION_BG,
              color: "#fff",
              textAlign: "left",
              fontWeight: 700,
            }}
          >
            {tt("patient.testCharts.tableNormTitle")}
          </th>
        </tr>
        <tr>
          <th style={{ ...tdBase, background: TABLE_HEAD_BG }}>
            {tt("patient.testCharts.colLeg")}
          </th>
          {YB_DIRS.map((dir) => (
            <th key={dir} style={{ ...tdBase, background: TABLE_HEAD_BG }}>
              {tt(`patient.testCharts.dir.${dir}`)} %
            </th>
          ))}
          <th style={{ ...tdBase, background: TABLE_HEAD_BG }}>
            {tt("patient.testCharts.colCompositePct")}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td
            style={{
              ...tdBase,
              textAlign: "left",
              fontWeight: 700,
              background: HEADER_DX,
            }}
          >
            {tt("patient.testCharts.legRightLabel")}
          </td>
          {YB_DIRS.map((dir) => (
            <td
              key={dir}
              style={{ ...tdBase, fontWeight: 600, color: COLOR_DX }}
            >
              {fmt(cy.right[dir]?.norm, 1)}
            </td>
          ))}
          <td style={{ ...tdBase, fontWeight: 700, color: COLOR_DX }}>
            {fmt(cy.right.composite, 1)}
          </td>
        </tr>
        <tr>
          <td
            style={{
              ...tdBase,
              textAlign: "left",
              fontWeight: 700,
              background: HEADER_SX,
            }}
          >
            {tt("patient.testCharts.legLeftLabel")}
          </td>
          {YB_DIRS.map((dir) => (
            <td
              key={dir}
              style={{ ...tdBase, fontWeight: 600, color: COLOR_SX }}
            >
              {fmt(cy.left[dir]?.norm, 1)}
            </td>
          ))}
          <td style={{ ...tdBase, fontWeight: 700, color: COLOR_SX }}>
            {fmt(cy.left.composite, 1)}
          </td>
        </tr>
      </tbody>
    </table>
  );
}

function AsymmetryTable({ asymRows, threshold, tt }) {
  return (
    <table
      style={{
        width: "100%",
        borderCollapse: "collapse",
        marginBottom: 12,
        background: "#fff",
      }}
    >
      <thead>
        <tr>
          <th
            colSpan={6}
            style={{
              ...tdBase,
              background: TABLE_SECTION_BG,
              color: "#fff",
              textAlign: "left",
              fontWeight: 700,
            }}
          >
            {tt("patient.testCharts.tableAsymTitle")}
          </th>
        </tr>
        <tr>
          <th style={{ ...tdBase, background: TABLE_HEAD_BG }}>
            {tt("patient.testCharts.colDirection")}
          </th>
          <th style={{ ...tdBase, background: TABLE_HEAD_BG }}>
            {tt("patient.testCharts.colDxBestCm")}
          </th>
          <th style={{ ...tdBase, background: TABLE_HEAD_BG }}>
            {tt("patient.testCharts.colSxBestCm")}
          </th>
          <th style={{ ...tdBase, background: TABLE_HEAD_BG }}>
            {tt("patient.testCharts.colDiffCmDxSx")}
          </th>
          <th style={{ ...tdBase, background: TABLE_HEAD_BG }}>
            {tt("patient.testCharts.colDiffPctDxVsSx")}
          </th>
          <th style={{ ...tdBase, background: TABLE_HEAD_BG }}>
            {tt("patient.testCharts.colNote")}
          </th>
        </tr>
      </thead>
      <tbody>
        {asymRows.map((r) => {
          const ad = r.br != null && r.bl != null ? Math.abs(r.br - r.bl) : null;
          const risk = ad != null && ad > threshold;
          return (
            <tr key={r.dir}>
              <td style={{ ...tdBase, textAlign: "left", fontWeight: 600 }}>
                {tt(`patient.testCharts.dir.${r.dir}`)}
              </td>
              <td style={{ ...tdBase, color: COLOR_DX, fontWeight: 600 }}>
                {fmt(r.br, 1)}
              </td>
              <td style={{ ...tdBase, color: COLOR_SX, fontWeight: 600 }}>
                {fmt(r.bl, 1)}
              </td>
              <td style={tdBase}>{fmt(r.diffCm, 1)}</td>
              <td style={tdBase}>{fmt(r.diffPct, 1)}%</td>
              <td
                style={{
                  ...tdBase,
                  textAlign: "left",
                  color: risk ? "#b91c1c" : PCN_GREEN,
                  fontWeight: risk ? 600 : 400,
                }}
              >
                {risk
                  ? String(
                      tt("patient.testCharts.noteAsymRisk") || ""
                    ).replace("{cm}", String(threshold))
                  : tt("patient.testCharts.noteAsymOk")}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function SynthesisTable({
  cy,
  diffComposite,
  maxAsym,
  deficientDirLabel,
  limitedLeg,
  tt,
}) {
  return (
    <table
      style={{
        width: "100%",
        borderCollapse: "collapse",
        marginBottom: 4,
        background: "#fff",
      }}
    >
      <thead>
        <tr>
          <th
            colSpan={2}
            style={{
              ...tdBase,
              background: TABLE_SECTION_BG,
              color: "#fff",
              textAlign: "left",
              fontWeight: 700,
            }}
          >
            {tt("patient.testCharts.tableSynthesisTitle")}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style={{ ...tdBase, textAlign: "left", width: "42%" }}>
            <strong>{tt("patient.testCharts.synthCompositeDx")}</strong>
          </td>
          <td style={{ ...tdBase, color: COLOR_DX, fontWeight: 700 }}>
            {fmt(cy.right.composite, 1)}%
          </td>
        </tr>
        <tr>
          <td style={{ ...tdBase, textAlign: "left" }}>
            <strong>{tt("patient.testCharts.synthCompositeSx")}</strong>
          </td>
          <td style={{ ...tdBase, color: COLOR_SX, fontWeight: 700 }}>
            {fmt(cy.left.composite, 1)}%
          </td>
        </tr>
        <tr>
          <td style={{ ...tdBase, textAlign: "left" }}>
            <strong>{tt("patient.testCharts.synthCompositeDiff")}</strong>
          </td>
          <td style={tdBase}>{fmt(diffComposite, 1)}%</td>
        </tr>
        <tr>
          <td style={{ ...tdBase, textAlign: "left" }}>
            <strong>{tt("patient.testCharts.synthMaxAsymmetry")}</strong>
          </td>
          <td style={tdBase}>
            {maxAsym != null ? `${fmt(maxAsym.ad, 1)} cm` : "—"}
          </td>
        </tr>
        <tr>
          <td style={{ ...tdBase, textAlign: "left" }}>
            <strong>{tt("patient.testCharts.synthDeficientDirection")}</strong>
          </td>
          <td style={tdBase}>{deficientDirLabel}</td>
        </tr>
        <tr>
          <td style={{ ...tdBase, textAlign: "left" }}>
            <strong>{tt("patient.testCharts.synthLimitedLeg")}</strong>
          </td>
          <td style={tdBase}>{limitedLeg}</td>
        </tr>
        <tr>
          <td
            colSpan={2}
            style={{
              ...tdBase,
              textAlign: "left",
              verticalAlign: "top",
              background: "#f8fafc",
            }}
          >
            <strong>{tt("patient.testCharts.synthClinicalComment")}</strong>
            <div
              style={{
                marginTop: 8,
                minHeight: 48,
                border: "1px dashed rgba(28, 191, 217, 0.35)",
                borderRadius: 6,
                padding: 8,
                color: "#94a3b8",
                fontSize: 11,
              }}
            >
              {tt("patient.testCharts.synthCommentPlaceholder")}
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  );
}

function TrialsLinePanel({ label, rightT, leftT, minY, maxY, height, tt }) {
  const w = 220;
  const padL = 34;
  const padR = 8;
  const padT = 14;
  const padB = 36;
  const innerW = w - padL - padR;
  const innerH = height - padT - padB;
  const span = Math.max(1e-6, maxY - minY);
  const xAt = (i) => padL + (innerW * i) / 2;
  const yAt = (v) => {
    if (v == null || !Number.isFinite(v)) return null;
    return padT + innerH - ((v - minY) / span) * innerH;
  };

  function polylinePoints(trials) {
    return [0, 1, 2]
      .map((i) => {
        const y = yAt(trials[i]);
        if (y == null) return null;
        return `${xAt(i)},${y}`;
      })
      .filter(Boolean)
      .join(" ");
  }

  const pr = polylinePoints(rightT);
  const pl = polylinePoints(leftT);
  const gridSteps = [0, 0.25, 0.5, 0.75, 1];

  return (
    <div
      className="pdf-avoid-break"
      style={{
        border: "1px solid rgba(13, 92, 104, 0.18)",
        borderRadius: 10,
        padding: 8,
        background: "#fff",
        minWidth: 0,
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          textAlign: "center",
          marginBottom: 6,
          color: PCN_TEAL_DARK,
        }}
      >
        {label}
      </div>
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${w} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ display: "block", maxWidth: "100%" }}
      >
        {gridSteps.map((t) => {
          const val = minY + span * t;
          const y = padT + innerH - t * innerH;
          return (
            <g key={t}>
              <line
                x1={padL}
                x2={w - padR}
                y1={y}
                y2={y}
                stroke="rgba(28, 191, 217, 0.15)"
                strokeWidth={1}
              />
              <text x={2} y={y + 3} fontSize={8} fill="#64748b">
                {Math.round(val)}
              </text>
            </g>
          );
        })}
        {[0, 1, 2].map((i) => (
          <text
            key={i}
            x={xAt(i)}
            y={height - 6}
            fontSize={9}
            textAnchor="middle"
            fill="#334155"
          >
            {i === 0
              ? tt("patient.testCharts.colTrial1")
              : i === 1
                ? tt("patient.testCharts.colTrial2")
                : tt("patient.testCharts.colTrial3")}
          </text>
        ))}
        {pr && (
          <polyline
            fill="none"
            stroke={COLOR_DX}
            strokeWidth={2.5}
            points={pr}
          />
        )}
        {pl && (
          <polyline
            fill="none"
            stroke={COLOR_SX}
            strokeWidth={2.5}
            points={pl}
          />
        )}
        {[0, 1, 2].map((i) => {
          const yr = yAt(rightT[i]);
          const yl = yAt(leftT[i]);
          return (
            <g key={i}>
              {yr != null && (
                <circle cx={xAt(i)} cy={yr} r={4} fill={COLOR_DX} />
              )}
              {yl != null && (
                <circle cx={xAt(i)} cy={yl} r={4} fill={COLOR_SX} />
              )}
              {yr != null && (
                <text
                  x={xAt(i)}
                  y={yr - 8}
                  fontSize={8}
                  textAnchor="middle"
                  fill={COLOR_DX}
                  fontWeight={600}
                >
                  {fmt(rightT[i], 0)}
                </text>
              )}
              {yl != null && (
                <text
                  x={xAt(i)}
                  y={yl + (yr != null && Math.abs(yl - yr) < 14 ? 14 : -8)}
                  fontSize={8}
                  textAnchor="middle"
                  fill={COLOR_SX}
                  fontWeight={600}
                >
                  {fmt(leftT[i], 0)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

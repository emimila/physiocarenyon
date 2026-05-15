import {
  ISOKINETIC_TORQUE_CHART_COLOR_DX,
  ISOKINETIC_TORQUE_CHART_COLOR_SX,
} from "../evaluations/IsokineticMaxTorqueGridChart";
import { fixedRepsForSpeed } from "../../utils/isokineticCalculations";
import {
  buildPeakTorqueMovementMiniConclusion,
  buildPeakTorqueReportData,
  buildPeakTorqueSynthesis,
  formatPeakTorqueNm,
  formatPeakTorquePct,
  PEAK_TORQUE_MOVEMENT,
  peakTorqueBriefInterpretationRow,
  peakTorqueErrorMessage,
  sideShortLabel,
} from "../../utils/isokineticPeakTorqueReport";

const thStyle = {
  border: "1px solid #cbd5e1",
  padding: "4px 5px",
  fontSize: 9,
  fontWeight: 600,
  background: "#f1f5f9",
  textAlign: "center",
};

const tdStyle = {
  border: "1px solid #cbd5e1",
  padding: "3px 5px",
  fontSize: 9,
  textAlign: "center",
};

const tdInterpretStyle = {
  ...tdStyle,
  textAlign: "left",
  fontSize: 8.5,
  lineHeight: 1.35,
};

function maxPositive(vals) {
  const nums = vals.filter((x) => x != null && Number.isFinite(x) && x > 0);
  if (!nums.length) return null;
  return Math.max(...nums);
}

function niceAxisTop(rawMax) {
  if (rawMax == null || rawMax <= 0) return 50;
  const padded = rawMax * 1.15;
  const exp = Math.floor(Math.log10(padded));
  const f = padded / 10 ** exp;
  let nf;
  if (f <= 1) nf = 1;
  else if (f <= 2) nf = 2;
  else if (f <= 5) nf = 5;
  else nf = 10;
  return nf * 10 ** exp;
}

function buildTicks(axisTop, steps = 5) {
  const out = [];
  for (let i = 0; i < steps; i += 1) {
    out.push((axisTop * i) / (steps - 1));
  }
  return out;
}

function fmtTick(tv) {
  if (!Number.isFinite(tv)) return "—";
  if (Math.abs(tv - Math.round(tv)) < 0.001) return String(Math.round(tv));
  if (tv >= 100) return tv.toFixed(0);
  return tv.toFixed(1);
}

function formatDiffNm(cmp, tt) {
  if (cmp == null || cmp.absoluteDifferenceNm == null) return "—";
  if (!cmp.strongerSide || cmp.absoluteDifferenceNm < 0.05) return "0 Nm";
  const side = sideShortLabel(cmp.strongerSide, tt);
  return `+${formatPeakTorqueNm(cmp.absoluteDifferenceNm)} Nm (${side})`;
}

/** Etichetta sopra barra: valore + unità Nm (solo riepilogo numerico PDF). */
function formatTorqueAboveBarNm(v) {
  if (v == null || !Number.isFinite(v)) return "—";
  return `${formatPeakTorqueNm(v)} Nm`;
}

function legendChip(color) {
  return (
    <div
      aria-hidden
      style={{
        width: 12,
        height: 12,
        borderRadius: 3,
        flexShrink: 0,
        background: color,
        border: "1px solid rgba(15,23,42,0.12)",
      }}
    />
  );
}

/** Legenda compatta sopra il grafico (DX/SX anatomico + ruolo clinico se noto). */
function PeakTorqueCompactLegend({
  tt,
  isPdf,
  injuredSide,
  shortD,
  shortS,
}) {
  const font = isPdf ? 9 : 10;
  const unitNote = tt("tests.isokinetic.peakTorqueUnitNm");
  const row = (color, text) => (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        color: "#0f172a",
        fontWeight: 600,
        fontSize: font,
      }}
    >
      {legendChip(color)}
      <span>{text}</span>
    </div>
  );

  let first;
  let second;
  if (injuredSide === "right") {
    first = row(
      ISOKINETIC_TORQUE_CHART_COLOR_DX,
      (tt("tests.isokinetic.peakLegendInvolvedBar") || "").replace(
        "{short}",
        shortD
      )
    );
    second = row(
      ISOKINETIC_TORQUE_CHART_COLOR_SX,
      (tt("tests.isokinetic.peakLegendContralateralBar") || "").replace(
        "{short}",
        shortS
      )
    );
  } else if (injuredSide === "left") {
    first = row(
      ISOKINETIC_TORQUE_CHART_COLOR_SX,
      (tt("tests.isokinetic.peakLegendInvolvedBar") || "").replace(
        "{short}",
        shortS
      )
    );
    second = row(
      ISOKINETIC_TORQUE_CHART_COLOR_DX,
      (tt("tests.isokinetic.peakLegendContralateralBar") || "").replace(
        "{short}",
        shortD
      )
    );
  } else {
    first = row(
      ISOKINETIC_TORQUE_CHART_COLOR_DX,
      `${shortD} — ${tt("tests.isokinetic.torqueChartLegendD")}`
    );
    second = row(
      ISOKINETIC_TORQUE_CHART_COLOR_SX,
      `${shortS} — ${tt("tests.isokinetic.torqueChartLegendS")}`
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: "10px 18px",
        margin: isPdf ? "6px 10px 8px" : "8px 14px 10px",
      }}
    >
      {first}
      {second}
      <span
        style={{
          fontSize: font - 0.5,
          fontWeight: 500,
          color: "#64748b",
          flexBasis: "100%",
          marginTop: 2,
        }}
      >
        {unitNote}
      </span>
    </div>
  );
}

function PeakTorqueBarSvg({ comparisons, tt, isPdf, shortD, shortS }) {
  const axisFont = isPdf ? 10 : 12;
  const valueFont = isPdf ? 10 : 12;
  const padL = isPdf ? 58 : 76;
  const padR = isPdf ? 22 : 30;
  const padT = isPdf ? 8 : 10;
  const padB = isPdf ? 54 : 62;
  const innerPlotH = isPdf ? 120 : 150;
  const speedStackH = isPdf ? 44 : 48;
  const W = 960;
  const nSpeed = Math.max(comparisons.length, 1);
  const innerW = W - padL - padR;
  const clusterW = innerW / nSpeed;

  const vals = comparisons.flatMap((c) => [c.rightTorqueNm, c.leftTorqueNm]);
  const axisTop = niceAxisTop(maxPositive(vals) || 1);
  const ticks = buildTicks(axisTop, 5);
  const plotTop = padT;
  const baseLineY = plotTop + innerPlotH;
  const svgH = plotTop + innerPlotH + padB + speedStackH + 8;

  const clusters = comparisons.map((c, i) => {
    const vD = c.rightTorqueNm;
    const vS = c.leftTorqueNm;
    const cx = padL + (i + 0.5) * clusterW;
    const groupW = Math.min(160, clusterW * 0.68);
    const barGap = isPdf ? 10 : 12;
    const barW = (groupW - barGap) / 2;
    const x0 = cx - groupW / 2;
    const xD = x0;
    const xS = x0 + barW + barGap;
    const hD =
      vD != null && Number.isFinite(vD) && axisTop > 0
        ? (vD / axisTop) * innerPlotH
        : 0;
    const hS =
      vS != null && Number.isFinite(vS) && axisTop > 0
        ? (vS / axisTop) * innerPlotH
        : 0;
    return { speed: c.velocityDegPerSec, cx, xD, xS, barW, hD, hS, vD, vS };
  });

  return (
    <div
      style={{
        width: "100%",
        aspectRatio: `${W} / ${svgH}`,
        maxHeight: isPdf ? 260 : 320,
        padding: isPdf ? "0 4px" : "0 8px",
        boxSizing: "border-box",
      }}
    >
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${W} ${svgH}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ display: "block" }}
      >
        <rect
          x={10}
          y={4}
          width={W - 20}
          height={svgH - 10}
          rx={10}
          fill="#ffffff"
          stroke="#cbd5e1"
        />
        {ticks.map((tv) => {
          const y = plotTop + innerPlotH - (tv / axisTop) * innerPlotH;
          const isBase = Math.abs(tv) < 1e-6;
          return (
            <g key={`grid-${tv}`}>
              <line
                x1={padL}
                x2={W - padR}
                y1={y}
                y2={y}
                stroke={isBase ? "#64748b" : "#cbd5e1"}
                strokeWidth={isBase ? 1.4 : 1}
                strokeDasharray={isBase ? "0" : "5 4"}
              />
              <text
                x={padL - 10}
                y={y + 4}
                fontSize={axisFont}
                textAnchor="end"
                fill="#475569"
                fontWeight={600}
              >
                {fmtTick(tv)}
              </text>
            </g>
          );
        })}
        {clusters.map((c) => {
          const topD = baseLineY - c.hD - 5;
          const topS = baseLineY - c.hS - 5;
          const minTop = plotTop + 12;
          const yD = c.hD >= 14 ? Math.max(minTop, topD) : baseLineY + 16;
          const yS = c.hS >= 14 ? Math.max(minTop, topS) : baseLineY + 28;
          return (
            <g key={`bars-${c.speed}`}>
              <rect
                x={c.xD}
                y={baseLineY - c.hD}
                width={c.barW}
                height={Math.max(c.hD, c.vD != null ? 2 : 0)}
                fill={ISOKINETIC_TORQUE_CHART_COLOR_DX}
                rx={4}
              />
              <rect
                x={c.xS}
                y={baseLineY - c.hS}
                width={c.barW}
                height={Math.max(c.hS, c.vS != null ? 2 : 0)}
                fill={ISOKINETIC_TORQUE_CHART_COLOR_SX}
                rx={4}
              />
              <text
                x={c.xD + c.barW / 2}
                y={yD}
                fontSize={valueFont}
                textAnchor="middle"
                fill="#0f172a"
                fontWeight={700}
              >
                {formatTorqueAboveBarNm(c.vD)}
              </text>
              <text
                x={c.xS + c.barW / 2}
                y={yS}
                fontSize={valueFont}
                textAnchor="middle"
                fill="#0f172a"
                fontWeight={700}
              >
                {formatTorqueAboveBarNm(c.vS)}
              </text>
              <text
                x={c.xD + c.barW / 2}
                y={baseLineY + 16}
                fontSize={axisFont}
                textAnchor="middle"
                fill={ISOKINETIC_TORQUE_CHART_COLOR_DX}
                fontWeight={700}
              >
                {shortD}
              </text>
              <text
                x={c.xS + c.barW / 2}
                y={baseLineY + 16}
                fontSize={axisFont}
                textAnchor="middle"
                fill={ISOKINETIC_TORQUE_CHART_COLOR_SX}
                fontWeight={700}
              >
                {shortS}
              </text>
              <text
                x={c.cx}
                y={baseLineY + 34}
                fontSize={axisFont + 1}
                textAnchor="middle"
                fill="#0f172a"
                fontWeight={700}
              >
                {c.speed}°/s
              </text>
            </g>
          );
        })}
        <text
          x={12}
          y={plotTop + innerPlotH / 2}
          fontSize={axisFont}
          fill="#64748b"
          fontWeight={600}
          transform={`rotate(-90, 12, ${plotTop + innerPlotH / 2})`}
          textAnchor="middle"
        >
          {tt("tests.isokinetic.peakTorqueAxisNm")}
        </text>
      </svg>
    </div>
  );
}

function PeakTorqueMetricsTable({
  comparisons,
  tt,
  isPdf,
  involvedPeakSide,
}) {
  return (
    <div style={{ padding: isPdf ? "0 10px 10px" : "0 14px 14px" }}>
      <div
        style={{
          fontSize: isPdf ? 10 : 11,
          fontWeight: 700,
          marginBottom: 6,
          color: "#0f172a",
        }}
      >
        {tt("tests.isokinetic.peakTorqueMetricsTitle")}
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
            <th style={thStyle}>{tt("tests.isokinetic.speedColumnShort")}</th>
            <th style={thStyle}>{tt("tests.isokinetic.peakTorqueColN")}</th>
            <th style={thStyle}>
              {tt("tests.isokinetic.peakTorqueSideRight")} (Nm)
            </th>
            <th style={thStyle}>
              {tt("tests.isokinetic.peakTorqueSideLeft")} (Nm)
            </th>
            <th style={thStyle}>
              {tt("tests.isokinetic.peakTorqueColStronger")}
            </th>
            <th style={thStyle}>{tt("tests.isokinetic.peakTorqueColDiff")}</th>
            <th style={thStyle}>
              {tt("tests.isokinetic.peakTorqueColDirectionalLsi")}
            </th>
            <th style={thStyle}>
              {tt("tests.isokinetic.peakTorqueColSymmetry")}
            </th>
            <th style={thStyle}>
              {tt("tests.isokinetic.peakTorqueColAsymmetryVsMax")}
            </th>
            <th style={{ ...thStyle, width: "22%" }}>
              {tt("tests.isokinetic.peakTorqueColBriefInterpretation")}
            </th>
          </tr>
        </thead>
        <tbody>
          {comparisons.map((cmp) => (
            <tr key={cmp.velocityDegPerSec}>
              <td style={tdStyle}>{cmp.velocityDegPerSec}°/s</td>
              <td style={tdStyle}>{fixedRepsForSpeed(cmp.velocityDegPerSec)}</td>
              <td style={tdStyle}>{formatTorqueAboveBarNm(cmp.rightTorqueNm)}</td>
              <td style={tdStyle}>{formatTorqueAboveBarNm(cmp.leftTorqueNm)}</td>
              <td style={tdStyle}>
                {cmp.strongerSide
                  ? sideShortLabel(cmp.strongerSide, tt)
                  : "—"}
              </td>
              <td style={tdStyle}>{formatDiffNm(cmp, tt)}</td>
              <td style={tdStyle}>
                {formatPeakTorquePct(cmp.directionalLsi)}
              </td>
              <td style={tdStyle}>
                {formatPeakTorquePct(cmp.symmetryIndex)}
              </td>
              <td style={tdStyle}>
                {formatPeakTorquePct(cmp.asymmetryVsMaxPercent)}
              </td>
              <td style={tdInterpretStyle}>
                {involvedPeakSide != null
                  ? peakTorqueBriefInterpretationRow(
                      cmp,
                      comparisons,
                      involvedPeakSide,
                      tt
                    )
                  : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div
        style={{
          marginTop: 6,
          fontSize: isPdf ? 8 : 9,
          color: "#64748b",
          lineHeight: 1.45,
        }}
      >
        {tt("tests.isokinetic.peakTorqueTableRepsFootnote")}
      </div>
    </div>
  );
}

function PeakTorqueMovementPanel({
  title,
  comparisons,
  tt,
  variant,
  shortD,
  shortS,
  movementEnum,
  involvedPeakSide,
  injuredSide,
}) {
  const isPdf = variant === "pdf";
  const titleFont = isPdf ? 13 : 15;
  const axisFont = isPdf ? 10 : 11;
  const headerPad = {
    paddingLeft: isPdf ? 10 : 14,
    paddingRight: isPdf ? 10 : 14,
  };

  const mini =
    involvedPeakSide != null
      ? buildPeakTorqueMovementMiniConclusion(
          movementEnum,
          comparisons,
          involvedPeakSide,
          tt
        )
      : "";

  return (
    <div
      className="isokinetic-peak-torque-panel"
      style={{
        width: "100%",
        maxWidth: "100%",
        border: "1px solid #94a3b8",
        borderRadius: 10,
        background: "#eef2f7",
        padding: isPdf ? "8px 0 0" : "12px 0 0",
        boxSizing: "border-box",
        marginBottom: isPdf ? 12 : 16,
      }}
    >
      <div
        style={{
          fontSize: titleFont,
          fontWeight: 700,
          color: "#0f172a",
          marginBottom: 4,
          ...headerPad,
        }}
      >
        {title}
      </div>
      <div
        style={{
          fontSize: axisFont,
          color: "#64748b",
          marginBottom: 6,
          lineHeight: 1.45,
          ...headerPad,
        }}
      >
        {tt("tests.isokinetic.peakTorquePanelSubtitle")}
      </div>

      <PeakTorqueCompactLegend
        tt={tt}
        isPdf={isPdf}
        injuredSide={injuredSide}
        shortD={shortD}
        shortS={shortS}
      />
      <PeakTorqueBarSvg
        comparisons={comparisons}
        tt={tt}
        isPdf={isPdf}
        shortD={shortD}
        shortS={shortS}
      />
      <PeakTorqueMetricsTable
        comparisons={comparisons}
        tt={tt}
        isPdf={isPdf}
        involvedPeakSide={involvedPeakSide}
      />
      {mini ? (
        <div
          style={{
            ...headerPad,
            paddingBottom: isPdf ? 10 : 12,
            marginTop: 6,
            fontSize: isPdf ? 9.5 : 11,
            lineHeight: 1.5,
            color: "#334155",
            borderTop: "1px solid #cbd5e1",
            paddingTop: 10,
          }}
        >
          <strong>{tt("tests.isokinetic.peakTorqueMiniConclusionTitle")}</strong>{" "}
          {mini}
        </div>
      ) : null}
    </div>
  );
}

function PeakTorqueSeparateScalesNote({ tt, isPdf }) {
  return (
    <div
      style={{
        fontSize: isPdf ? 8.5 : 10,
        color: "#64748b",
        margin: isPdf ? "4px 10px 10px" : "6px 14px 12px",
        lineHeight: 1.45,
      }}
    >
      {tt("tests.isokinetic.peakTorqueSeparateScalesNote")}
    </div>
  );
}

/**
 * Sezione report PDF: solo coppia massimale (picco Nm) DX vs SX per estensione e flessione.
 */
export default function IsokineticPeakTorqueReportChart({
  rows,
  injuredSide,
  tt,
  variant = "pdf",
}) {
  const isPdf = variant === "pdf";
  const report = buildPeakTorqueReportData(rows, injuredSide);
  const shortD = tt("tests.isokinetic.torqueChartShortD") || "D";
  const shortS = tt("tests.isokinetic.torqueChartShortS") || "S";

  if (!report.valid) {
    return (
      <div
        className="isokinetic-peak-torque-report isokinetic-peak-torque-report--invalid"
        style={{
          padding: "10px 12px",
          border: "1px solid #fecaca",
          borderRadius: 8,
          background: "#fef2f2",
          fontSize: isPdf ? 10 : 11,
          color: "#991b1b",
        }}
      >
        <strong>{tt("tests.isokinetic.peakTorqueValidationTitle")}</strong>
        <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
          {report.errors.map((code) => (
            <li key={code}>{peakTorqueErrorMessage(code, tt)}</li>
          ))}
        </ul>
      </div>
    );
  }

  const synthesis = buildPeakTorqueSynthesis(
    report.comparisons,
    tt,
    injuredSide
  );

  const leadClass =
    isPdf === true ? "isokinetic-peak-torque-report-lead" : undefined;

  return (
    <div
      className={`isokinetic-peak-torque-report isokinetic-peak-torque-report--${variant}`}
      style={{ width: "100%", maxWidth: "100%", boxSizing: "border-box" }}
    >
      <div className={leadClass}>
        <div
          style={{
            fontSize: isPdf ? 13 : 15,
            fontWeight: 700,
            marginBottom: 6,
            color: "#0f172a",
          }}
        >
          {tt("tests.isokinetic.peakTorqueMainTitle")}
        </div>
        <div
          style={{
            fontSize: isPdf ? 8.5 : 10,
            fontWeight: 600,
            color: "#475569",
            marginBottom: 8,
            lineHeight: 1.45,
            letterSpacing: 0.2,
          }}
        >
          {tt("tests.isokinetic.peakTorqueDataTypeLabel")}
        </div>
        <div
          style={{
            fontSize: isPdf ? 10 : 11,
            color: "#64748b",
            marginBottom: 10,
            lineHeight: 1.45,
          }}
        >
          {tt("tests.isokinetic.peakTorqueMainQuestion")}
        </div>

        <PeakTorqueMovementPanel
          title={tt("tests.isokinetic.peakTorquePanelExt")}
          comparisons={report.comparisons.extension}
          tt={tt}
          variant={variant}
          shortD={shortD}
          shortS={shortS}
          movementEnum={PEAK_TORQUE_MOVEMENT.EXTENSION}
          involvedPeakSide={report.involvedSide}
          injuredSide={injuredSide}
        />
      </div>

      <PeakTorqueSeparateScalesNote tt={tt} isPdf={isPdf} />

      <PeakTorqueMovementPanel
        title={tt("tests.isokinetic.peakTorquePanelFlex")}
        comparisons={report.comparisons.flexion}
        tt={tt}
        variant={variant}
        shortD={shortD}
        shortS={shortS}
        movementEnum={PEAK_TORQUE_MOVEMENT.FLEXION}
        involvedPeakSide={report.involvedSide}
        injuredSide={injuredSide}
      />

      <div
        className="pdf-avoid-break"
        style={{
          marginTop: 4,
          marginBottom: 10,
          padding: "10px 12px",
          border: "1px solid #e2e8f0",
          borderRadius: 8,
          background: "#f8fafc",
          fontSize: isPdf ? 10 : 11,
          lineHeight: 1.5,
          color: "#334155",
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: 4, color: "#0f172a" }}>
          {tt("tests.isokinetic.peakTorqueSynthTitle")}
        </div>
        <p style={{ margin: 0 }}>{synthesis}</p>
      </div>

      <div
        style={{
          padding: "8px 10px",
          border: "1px solid #e2e8f0",
          borderRadius: 8,
          fontSize: isPdf ? 9 : 10,
          lineHeight: 1.45,
          color: "#64748b",
          background: "#fafafa",
        }}
      >
        <strong>{tt("tests.isokinetic.peakTorqueLimitsTitle")}</strong>{" "}
        {tt("tests.isokinetic.peakTorqueLimitsBody")}
      </div>

      <div
        style={{
          marginTop: 8,
          fontSize: isPdf ? 8 : 9,
          color: "#94a3b8",
          lineHeight: 1.4,
        }}
      >
        {tt("tests.isokinetic.peakTorqueLsiNote")}
      </div>
    </div>
  );
}

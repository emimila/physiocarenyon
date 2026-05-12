import { parseIsokineticNum } from "../../utils/isokineticCalculations";

/** Destro = blu, sinistro = rosso. */
export const ISOKINETIC_TORQUE_CHART_COLOR_DX = "#1d4ed8";
export const ISOKINETIC_TORQUE_CHART_COLOR_SX = "#b91c1c";

function fmtTorque(v) {
  if (v == null || !Number.isFinite(v)) return "—";
  return v >= 100 ? String(Math.round(v)) : v.toFixed(1);
}

function fmtWorkJ(v) {
  if (v == null || !Number.isFinite(v)) return "—";
  if (v >= 1000) return String(Math.round(v));
  if (v >= 100) return v.toFixed(0);
  return v.toFixed(1);
}

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
  if (tv >= 1000) return tv.toFixed(0);
  if (tv >= 100) return tv.toFixed(0);
  return tv.toFixed(1);
}

function TorqueWorkLegendTable({ legendD, legendS, legendUnit, legendFont }) {
  return (
    <table
      className="isokinetic-torque-legend"
      style={{
        marginTop: 8,
        marginLeft: 12,
        marginRight: 12,
        marginBottom: 10,
        borderCollapse: "separate",
        borderSpacing: "0 5px",
        fontSize: Math.max(legendFont, 11),
        color: "#0f172a",
        width: "calc(100% - 24px)",
        maxWidth: 420,
      }}
      aria-label={`${legendD}; ${legendS}; ${legendUnit}`}
    >
      <tbody>
        <tr>
          <td style={{ width: 22, verticalAlign: "middle", paddingRight: 8 }}>
            <div
              style={{
                width: 16,
                height: 16,
                borderRadius: 3,
                background: ISOKINETIC_TORQUE_CHART_COLOR_DX,
                border: "1px solid rgba(15,23,42,0.12)",
                boxSizing: "border-box",
              }}
            />
          </td>
          <td style={{ verticalAlign: "middle", fontWeight: 700, textAlign: "left" }}>
            {legendD}
          </td>
        </tr>
        <tr>
          <td style={{ width: 22, verticalAlign: "middle", paddingRight: 8 }}>
            <div
              style={{
                width: 16,
                height: 16,
                borderRadius: 3,
                background: ISOKINETIC_TORQUE_CHART_COLOR_SX,
                border: "1px solid rgba(15,23,42,0.12)",
                boxSizing: "border-box",
              }}
            />
          </td>
          <td style={{ verticalAlign: "middle", fontWeight: 700, textAlign: "left" }}>
            {legendS}
          </td>
        </tr>
        <tr>
          <td />
          <td
            style={{
              verticalAlign: "middle",
              fontSize: Math.max(legendFont - 1, 10),
              color: "#64748b",
              fontWeight: 500,
              textAlign: "left",
              paddingTop: 2,
            }}
          >
            {legendUnit}
          </td>
        </tr>
      </tbody>
    </table>
  );
}

/**
 * Coppia massimale (Nm) e lavoro totale (J): stessa struttura a 3 velocità.
 * Righe: EXT sopra, FLEX sotto; legenda dentro il box grigio sotto ogni SVG.
 */
export default function IsokineticMaxTorqueGridChart({ rows, tt, variant = "form" }) {
  const isPdf = variant === "pdf";

  const legendD =
    tt("tests.isokinetic.torqueChartLegendD") || "Destro (D)";
  const legendS =
    tt("tests.isokinetic.torqueChartLegendS") || "Sinistro (S)";
  const legendUnitNm =
    tt("tests.isokinetic.torqueCompareChartUnit") || "Scala: Nm";
  const legendUnitJ =
    tt("tests.isokinetic.workCompareChartUnit") || "Scala: J";

  const innerPlotH = isPdf ? 100 : 132;
  const titleRowH = isPdf ? 22 : 26;
  const padL = isPdf ? 58 : 76;
  const padR = isPdf ? 22 : 30;
  const padT = isPdf ? 6 : 8;
  const padB = isPdf ? 54 : 62;
  const speedStackH = isPdf ? 44 : 48;
  const axisFont = isPdf ? 10 : 12;
  const titleFont = isPdf ? 12 : 14;
  const rowTitleFont = isPdf ? 12 : 14;
  const valueFont = isPdf ? 10 : 12;
  const legendFont = isPdf ? 10 : 12;

  const flexVals = rows.flatMap((row) => [
    parseIsokineticNum(row.right?.ptFlex),
    parseIsokineticNum(row.left?.ptFlex),
  ]);
  const extVals = rows.flatMap((row) => [
    parseIsokineticNum(row.right?.ptExt),
    parseIsokineticNum(row.left?.ptExt),
  ]);

  const flexRawMax = maxPositive(flexVals) ?? 0;
  const extRawMax = maxPositive(extVals) ?? 0;
  const flexTop = niceAxisTop(flexRawMax || 1);
  const extTop = niceAxisTop(extRawMax || 1);

  const flexTicks = buildTicks(flexTop, 5);
  const extTicks = buildTicks(extTop, 5);

  const workExtVals = rows.flatMap((row) => [
    parseIsokineticNum(row.right?.workExt),
    parseIsokineticNum(row.left?.workExt),
  ]);
  const workFlexVals = rows.flatMap((row) => [
    parseIsokineticNum(row.right?.workFlex),
    parseIsokineticNum(row.left?.workFlex),
  ]);
  const workExtRawMax = maxPositive(workExtVals) ?? 0;
  const workFlexRawMax = maxPositive(workFlexVals) ?? 0;
  const workExtTop = niceAxisTop(workExtRawMax || 1);
  const workFlexTop = niceAxisTop(workFlexRawMax || 1);
  const workExtTicks = buildTicks(workExtTop, 5);
  const workFlexTicks = buildTicks(workFlexTop, 5);

  const W = 960;
  const nSpeed = rows.length || 3;
  const innerW = W - padL - padR;
  const clusterW = innerW / nSpeed;

  const rowBlockH = titleRowH + padT + innerPlotH + padB + speedStackH;
  const topMargin = 10;
  const gapBetweenRows = 14;
  const svgPlotH = topMargin + rowBlockH * 2 + gapBetweenRows + 10;

  function drawRow(
    yRow,
    axisTop,
    ticks,
    rowTitle,
    getPair,
    keyPrefix,
    formatValue,
    shortD,
    shortS
  ) {
    const plotTop = yRow + titleRowH + padT;
    const baseLineY = plotTop + innerPlotH;

    const clusters = rows.map((row, i) => {
      const { vD, vS } = getPair(row);
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
      return {
        speed: row.speed,
        cx,
        xD,
        xS,
        barW,
        hD,
        hS,
        vD,
        vS,
        baseLineY,
      };
    });

    return (
      <g key={keyPrefix}>
        <text
          x={W / 2}
          y={yRow + titleRowH - 4}
          fontSize={rowTitleFont}
          textAnchor="middle"
          fill="#0f172a"
          fontWeight={700}
        >
          {rowTitle}
        </text>

        {ticks.map((tv) => {
          const y = plotTop + innerPlotH - (tv / axisTop) * innerPlotH;
          const isBase = Math.abs(tv) < 1e-6;
          return (
            <g key={`${keyPrefix}-g-${tv}`}>
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

        {clusters.map((c) => (
          <g key={`${keyPrefix}-b-${c.speed}`}>
            <rect
              x={c.xD}
              y={c.baseLineY - c.hD}
              width={c.barW}
              height={Math.max(c.hD, c.vD != null && Number.isFinite(c.vD) ? 2 : 0)}
              fill={ISOKINETIC_TORQUE_CHART_COLOR_DX}
              rx={4}
            />
            <rect
              x={c.xS}
              y={c.baseLineY - c.hS}
              width={c.barW}
              height={Math.max(c.hS, c.vS != null && Number.isFinite(c.vS) ? 2 : 0)}
              fill={ISOKINETIC_TORQUE_CHART_COLOR_SX}
              rx={4}
            />
            {(() => {
              const topD = c.baseLineY - c.hD - 5;
              const topS = c.baseLineY - c.hS - 5;
              const minTop = plotTop + 12;
              const yD = c.hD >= 14 ? Math.max(minTop, topD) : c.baseLineY + 16;
              const yS = c.hS >= 14 ? Math.max(minTop, topS) : c.baseLineY + 28;
              return (
                <>
                  <text
                    x={c.xD + c.barW / 2}
                    y={yD}
                    fontSize={valueFont}
                    textAnchor="middle"
                    fill="#0f172a"
                    fontWeight={700}
                  >
                    {formatValue(c.vD)}
                  </text>
                  <text
                    x={c.xS + c.barW / 2}
                    y={yS}
                    fontSize={valueFont}
                    textAnchor="middle"
                    fill="#0f172a"
                    fontWeight={700}
                  >
                    {formatValue(c.vS)}
                  </text>
                </>
              );
            })()}
            <text
              x={c.xD + c.barW / 2}
              y={c.baseLineY + 16}
              fontSize={axisFont}
              textAnchor="middle"
              fill={ISOKINETIC_TORQUE_CHART_COLOR_DX}
              fontWeight={700}
            >
              {shortD}
            </text>
            <text
              x={c.xS + c.barW / 2}
              y={c.baseLineY + 16}
              fontSize={axisFont}
              textAnchor="middle"
              fill={ISOKINETIC_TORQUE_CHART_COLOR_SX}
              fontWeight={700}
            >
              {shortS}
            </text>
            <text
              x={c.cx}
              y={c.baseLineY + 34}
              fontSize={axisFont + 1}
              textAnchor="middle"
              fill="#0f172a"
              fontWeight={700}
            >
              {c.speed}°/s
            </text>
          </g>
        ))}
      </g>
    );
  }

  const shortD = tt("tests.isokinetic.torqueChartShortD") || "D";
  const shortS = tt("tests.isokinetic.torqueChartShortS") || "S";

  /** EXT sopra, FLEX sotto */
  const yExtRow = topMargin;
  const yFlexRow = yExtRow + rowBlockH + gapBetweenRows;

  const panelShell = {
    width: "100%",
    maxWidth: "100%",
    border: "1px solid #94a3b8",
    borderRadius: 10,
    background: "#eef2f7",
    padding: isPdf ? "6px 0 0" : "10px 0 0",
    boxSizing: "border-box",
    marginBottom: isPdf ? 12 : 16,
  };

  const headerPad = { paddingLeft: isPdf ? 10 : 14, paddingRight: isPdf ? 10 : 14 };

  return (
    <div
      className={`isokinetic-max-torque-grid-chart isokinetic-max-torque-grid-chart--${variant}`}
      style={{
        width: "100%",
        maxWidth: "100%",
        boxSizing: "border-box",
        marginTop: isPdf ? 6 : 10,
        marginBottom: isPdf ? 10 : 14,
      }}
    >
      {/* Pannello 1: coppia massimale */}
      <div style={panelShell}>
        <div
          style={{
            fontSize: titleFont,
            fontWeight: 700,
            color: "#0f172a",
            marginBottom: 4,
            ...headerPad,
          }}
        >
          {tt("tests.isokinetic.torqueHistogramMainTitle")}
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
          {tt("tests.isokinetic.torqueCompareChartSubtitle")}
          <span style={{ display: "block", marginTop: 4, fontSize: axisFont - 1 }}>
            {tt("tests.isokinetic.torqueAxisHint")}
          </span>
        </div>

        <div
          style={{
            width: "100%",
            aspectRatio: `${W} / ${svgPlotH}`,
            maxHeight: isPdf ? 380 : 480,
            padding: isPdf ? "0 4px" : "0 8px",
            boxSizing: "border-box",
          }}
        >
          <svg
            width="100%"
            height="100%"
            viewBox={`0 0 ${W} ${svgPlotH}`}
            preserveAspectRatio="xMidYMid meet"
            style={{ display: "block" }}
          >
            <rect
              x={10}
              y={6}
              width={W - 20}
              height={svgPlotH - 14}
              rx={10}
              fill="#ffffff"
              stroke="#cbd5e1"
            />
            {drawRow(
              yExtRow,
              extTop,
              extTicks,
              tt("tests.isokinetic.torqueChartRowExt"),
              (row) => ({
                vD: parseIsokineticNum(row.right?.ptExt),
                vS: parseIsokineticNum(row.left?.ptExt),
              }),
              "peak-ext",
              fmtTorque,
              shortD,
              shortS
            )}
            {drawRow(
              yFlexRow,
              flexTop,
              flexTicks,
              tt("tests.isokinetic.torqueChartRowFlex"),
              (row) => ({
                vD: parseIsokineticNum(row.right?.ptFlex),
                vS: parseIsokineticNum(row.left?.ptFlex),
              }),
              "peak-flex",
              fmtTorque,
              shortD,
              shortS
            )}
          </svg>
        </div>

        <TorqueWorkLegendTable
          legendD={legendD}
          legendS={legendS}
          legendUnit={legendUnitNm}
          legendFont={legendFont}
        />
      </div>

      {/* Pannello 2: lavoro totale */}
      <div style={{ ...panelShell, marginBottom: isPdf ? 10 : 14 }}>
        <div
          style={{
            fontSize: titleFont,
            fontWeight: 700,
            color: "#0f172a",
            marginBottom: 4,
            ...headerPad,
          }}
        >
          {tt("tests.isokinetic.workHistogramWideTitle")}
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
          {tt("tests.isokinetic.workCompareChartSubtitle")}
          <span style={{ display: "block", marginTop: 4, fontSize: axisFont - 1 }}>
            {tt("tests.isokinetic.workAxisHint")}
          </span>
        </div>

        <div
          style={{
            width: "100%",
            aspectRatio: `${W} / ${svgPlotH}`,
            maxHeight: isPdf ? 380 : 480,
            padding: isPdf ? "0 4px" : "0 8px",
            boxSizing: "border-box",
          }}
        >
          <svg
            width="100%"
            height="100%"
            viewBox={`0 0 ${W} ${svgPlotH}`}
            preserveAspectRatio="xMidYMid meet"
            style={{ display: "block" }}
          >
            <rect
              x={10}
              y={6}
              width={W - 20}
              height={svgPlotH - 14}
              rx={10}
              fill="#ffffff"
              stroke="#cbd5e1"
            />
            {drawRow(
              yExtRow,
              workExtTop,
              workExtTicks,
              tt("tests.isokinetic.workChartRowExt"),
              (row) => ({
                vD: parseIsokineticNum(row.right?.workExt),
                vS: parseIsokineticNum(row.left?.workExt),
              }),
              "work-ext",
              fmtWorkJ,
              shortD,
              shortS
            )}
            {drawRow(
              yFlexRow,
              workFlexTop,
              workFlexTicks,
              tt("tests.isokinetic.workChartRowFlex"),
              (row) => ({
                vD: parseIsokineticNum(row.right?.workFlex),
                vS: parseIsokineticNum(row.left?.workFlex),
              }),
              "work-flex",
              fmtWorkJ,
              shortD,
              shortS
            )}
          </svg>
        </div>

        <TorqueWorkLegendTable
          legendD={legendD}
          legendS={legendS}
          legendUnit={legendUnitJ}
          legendFont={legendFont}
        />
      </div>
    </div>
  );
}

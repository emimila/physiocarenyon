import { useMemo } from "react";
import {
  formatDateDMY,
  formatPatientListDisplayName,
} from "../../utils/helpers";
import {
  ensureIsokineticShape,
  formatPct1,
  normalizeIsokineticRowsForReport,
} from "../../utils/isokineticCalculations";
import {
  buildPdf3CurveBundle,
  computePdf3QualMetrics,
  getPdf3ClinicalAxes,
  selectPdf3NarrativeKeys,
} from "../../utils/isokineticPdf3CurveEngine";
import {
  buildPdf4AngleSampleTable,
  buildPdf4OpinionKeys,
  mergeDeficitZones,
  pdf4WorstAngle,
} from "../../utils/isokineticPdf4Analysis";

const HEADER_BG = "#0f172a";
const PAGE_SHELL = "#e8ecf2";
const CARD_WHITE = "#ffffff";
const GRID_MAJOR = "#dde3ea";
const AXIS_TEXT = "#475569";
const TITLE_MUTED = "#64748b";
const TEAL = "#2a9d8f";
const ORANGE = "#e76f51";
const NEG = "#b91c1c";

function mapX(angle, xMin, xMax, w, padL, padR) {
  const iw = w - padL - padR;
  return padL + ((angle - xMin) / Math.max(1e-6, xMax - xMin)) * iw;
}

function mapY(val, yMin, yMax, h, padT, padB) {
  const ih = h - padT - padB;
  return padT + ih - ((val - yMin) / Math.max(1e-6, yMax - yMin)) * ih;
}

function polylinePts(curve, xMin, xMax, yMin, yMax, w, h, padL, padT, padR, padB) {
  return curve
    .map((p) => {
      const x = mapX(p.angle, xMin, xMax, w, padL, padR);
      const y = mapY(p.torque, yMin, yMax, h, padT, padB);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

function lsiPolyline(table, xMin, xMax, yMin, yMax, w, h, padL, padT, padR, padB) {
  const pts = [];
  for (const r of table.rows || []) {
    if (r.lsiDisplay == null || !Number.isFinite(r.lsiDisplay)) continue;
    const x = mapX(r.angle, xMin, xMax, w, padL, padR);
    const y = mapY(r.lsiDisplay, yMin, yMax, h, padT, padB);
    pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return pts.join(" ");
}

function OverlayExtFlexPanel({
  title,
  curveA,
  curveB,
  labelA,
  labelB,
  colorA,
  colorB,
  axes,
  torqueYLabel,
  angleAxisLabel,
}) {
  const w = 520;
  const h = 220;
  const padL = 44;
  const padR = 12;
  const padT = 22;
  const padB = 46;
  const { xMin, xMax, yMin, yMax } = axes;
  const plA = polylinePts(curveA, xMin, xMax, yMin, yMax, w, h, padL, padT, padR, padB);
  const plB = polylinePts(curveB, xMin, xMax, yMin, yMax, w, h, padL, padT, padR, padB);
  const xStep = 20;
  const xTicks = [];
  for (let xv = Math.ceil(xMin / xStep) * xStep; xv <= xMax + 0.01; xv += xStep) {
    xTicks.push(Math.round(xv));
  }
  const yTicks = [];
  const yStart = Math.floor(yMin / 20) * 20;
  for (let t = yStart; t <= yMax + 0.01; t += 20) {
    if (t >= yMin - 1e-6) yTicks.push(t);
  }

  return (
    <div
      style={{
        borderRadius: 12,
        border: `1px solid ${GRID_MAJOR}`,
        background: CARD_WHITE,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: HEADER_BG,
          padding: "8px 12px",
          borderBottom: `1px solid ${GRID_MAJOR}`,
          background: "#f8fafc",
        }}
      >
        {title}
        <span style={{ marginLeft: 10, fontWeight: 600, color: colorA }}>{labelA}</span>
        <span style={{ margin: "0 6px", color: TITLE_MUTED }}>·</span>
        <span style={{ fontWeight: 600, color: colorB }}>{labelB}</span>
      </div>
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} role="img" aria-label={title}>
        <rect x={0} y={0} width={w} height={h} fill="#fafbfc" />
        {xTicks.map((xv) => {
          const x = mapX(xv, xMin, xMax, w, padL, padR);
          return (
            <line
              key={`gx-${xv}`}
              x1={x}
              y1={padT}
              x2={x}
              y2={h - padB}
              stroke={GRID_MAJOR}
              strokeWidth={1}
            />
          );
        })}
        {yTicks.map((tv) => {
          const y = mapY(tv, yMin, yMax, h, padT, padB);
          return (
            <line
              key={`gy-${tv}`}
              x1={padL}
              y1={y}
              x2={w - padR}
              y2={y}
              stroke={tv === 0 ? "#94a3b8" : GRID_MAJOR}
              strokeWidth={1}
            />
          );
        })}
        <polyline fill="none" stroke={colorA} strokeWidth={2.2} points={plA} />
        <polyline fill="none" stroke={colorB} strokeWidth={2.2} points={plB} />
        {yTicks.map((tv) => {
          const y = mapY(tv, yMin, yMax, h, padT, padB);
          return (
            <text
              key={`yl-${tv}`}
              x={padL - 6}
              y={y + 3}
              fill={AXIS_TEXT}
              fontSize="9"
              textAnchor="end"
              fontWeight="600"
            >
              {tv}
            </text>
          );
        })}
        {xTicks.map((xv) => {
          const x = mapX(xv, xMin, xMax, w, padL, padR);
          return (
            <text
              key={`xl-${xv}`}
              x={x}
              y={h - padB + 18}
              fill={AXIS_TEXT}
              fontSize="9"
              textAnchor="middle"
              fontWeight="600"
            >
              {xv}
            </text>
          );
        })}
        <text
          x={padL - 2}
          y={padT - 6}
          fill={AXIS_TEXT}
          fontSize="9"
          fontWeight="700"
        >
          {torqueYLabel}
        </text>
        <text
          x={(padL + w - padR) / 2}
          y={h - 6}
          fill={AXIS_TEXT}
          fontSize="9"
          fontWeight="700"
          textAnchor="middle"
        >
          {angleAxisLabel}
        </text>
      </svg>
    </div>
  );
}

function LsiStripChart({ table, axes, tt }) {
  const w = 520;
  const h = 200;
  const padL = 44;
  const padR = 12;
  const padT = 22;
  const padB = 46;
  const xMin = axes.xMin;
  const xMax = axes.xMax;
  const yMin = 48;
  const yMax = 118;
  const pl = lsiPolyline(table, xMin, xMax, yMin, yMax, w, h, padL, padT, padR, padB);
  const ref90 = mapY(90, yMin, yMax, h, padT, padB);
  const ref80 = mapY(80, yMin, yMax, h, padT, padB);
  const xStep = 20;
  const xTicks = [];
  for (let xv = Math.ceil(xMin / xStep) * xStep; xv <= xMax + 0.01; xv += xStep) {
    xTicks.push(Math.round(xv));
  }
  const yStep = 10;
  const yTicks = [];
  const yStart = Math.floor(yMin / yStep) * yStep;
  for (let t = yStart; t <= yMax + 0.01; t += yStep) {
    if (t + 1e-6 >= yMin) yTicks.push(t);
  }

  return (
    <div
      style={{
        borderRadius: 12,
        border: `1px solid ${GRID_MAJOR}`,
        background: CARD_WHITE,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: HEADER_BG,
          padding: "8px 12px",
          borderBottom: `1px solid ${GRID_MAJOR}`,
          background: "#f8fafc",
        }}
      >
        {tt("patient.testCharts.isoPdf4LsiStripTitle")}
      </div>
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} role="img">
        <rect x={0} y={0} width={w} height={h} fill="#fafbfc" />
        {xTicks.map((xv) => {
          const x = mapX(xv, xMin, xMax, w, padL, padR);
          return (
            <line
              key={`lsx-${xv}`}
              x1={x}
              y1={padT}
              x2={x}
              y2={h - padB}
              stroke={GRID_MAJOR}
              strokeWidth={1}
            />
          );
        })}
        {yTicks.map((tv) => {
          const y = mapY(tv, yMin, yMax, h, padT, padB);
          return (
            <line
              key={`lsy-${tv}`}
              x1={padL}
              y1={y}
              x2={w - padR}
              y2={y}
              stroke={tv === 90 || tv === 80 ? "transparent" : GRID_MAJOR}
              strokeWidth={1}
            />
          );
        })}
        <line
          x1={padL}
          y1={ref90}
          x2={w - padR}
          y2={ref90}
          stroke="#16a34a"
          strokeDasharray="4 3"
          strokeWidth={1.2}
        />
        <line
          x1={padL}
          y1={ref80}
          x2={w - padR}
          y2={ref80}
          stroke="#ca8a04"
          strokeDasharray="4 3"
          strokeWidth={1.2}
        />
        <polyline fill="none" stroke="#334155" strokeWidth={2} points={pl} />
        {yTicks.map((tv) => {
          const y = mapY(tv, yMin, yMax, h, padT, padB);
          return (
            <text
              key={`lsyl-${tv}`}
              x={padL - 6}
              y={y + 3}
              fill={AXIS_TEXT}
              fontSize="9"
              textAnchor="end"
              fontWeight="600"
            >
              {tv}%
            </text>
          );
        })}
        {xTicks.map((xv) => {
          const x = mapX(xv, xMin, xMax, w, padL, padR);
          return (
            <text
              key={`lsxl-${xv}`}
              x={x}
              y={h - padB + 18}
              fill={AXIS_TEXT}
              fontSize="9"
              textAnchor="middle"
              fontWeight="600"
            >
              {xv}
            </text>
          );
        })}
        <text
          x={padL - 2}
          y={padT - 6}
          fill={AXIS_TEXT}
          fontSize="9"
          fontWeight="700"
        >
          {tt("patient.testCharts.isoPdf4LsiAxisShort")}
        </text>
        <text
          x={(padL + w - padR) / 2}
          y={h - 6}
          fill={AXIS_TEXT}
          fontSize="9"
          fontWeight="700"
          textAnchor="middle"
        >
          {tt("patient.testCharts.isoPdf3AxisAngle")}
        </text>
        <text x={w - padR - 2} y={ref90 - 4} fontSize={9} fill="#15803d" textAnchor="end">
          90%
        </text>
        <text x={w - padR - 2} y={ref80 - 4} fontSize={9} fill="#a16207" textAnchor="end">
          80%
        </text>
      </svg>
    </div>
  );
}

export default function IsokineticCurveAnalysisPdf4({
  patient,
  session,
  test,
  districtLabel,
  tt,
}) {
  const iso = ensureIsokineticShape(test?.isokinetic || {});
  const rows = normalizeIsokineticRowsForReport(iso);
  const row60 = rows.find((r) => r.speed === 60);
  const injured = iso.injuredSide === "left" || iso.injuredSide === "right" ? iso.injuredSide : "";

  const bundle = useMemo(
    () => (row60 ? buildPdf3CurveBundle(row60, injured) : null),
    [row60, injured]
  );

  const axes = useMemo(
    () => (bundle ? bundle.chartAxes ?? getPdf3ClinicalAxes(bundle) : null),
    [bundle]
  );

  const angleTable = useMemo(() => {
    if (!bundle) return null;
    return buildPdf4AngleSampleTable(bundle, {
      stepDeg: 5,
      injuredSide: injured,
    });
  }, [bundle, injured]);

  const zones = useMemo(() => {
    if (!angleTable) return [];
    return mergeDeficitZones(angleTable.rows, angleTable.stepDeg);
  }, [angleTable]);

  const worst = useMemo(() => (angleTable ? pdf4WorstAngle(angleTable) : null), [angleTable]);

  const qual = useMemo(
    () => (bundle ? computePdf3QualMetrics(bundle) : null),
    [bundle]
  );

  const narrativePick = useMemo(
    () => (bundle && qual ? selectPdf3NarrativeKeys(bundle, qual) : null),
    [bundle, qual]
  );

  const opinionKeys = useMemo(() => {
    if (!bundle || !qual || !angleTable) return [];
    const lsiExtRaw = bundle.metricsRow?.lsiExt;
    const lsiExt =
      lsiExtRaw != null && Number.isFinite(lsiExtRaw) ? lsiExtRaw : null;
    return buildPdf4OpinionKeys({
      zones,
      worst,
      qual,
      injuredSide: injured,
      lsiExt,
    });
  }, [bundle, qual, angleTable, zones, worst, injured]);

  const name = formatPatientListDisplayName(patient) || "—";

  if (!bundle || !axes || !row60 || !angleTable) {
    return (
      <div
        className="isokinetic-curve-pdf4 pdf-figure"
        style={{
          fontFamily: 'Inter, system-ui, sans-serif',
          background: PAGE_SHELL,
          color: AXIS_TEXT,
          padding: 24,
          borderRadius: 16,
        }}
      >
        <p style={{ margin: 0, color: TITLE_MUTED }}>{tt("patient.testCharts.isoPdf4NoData")}</p>
      </div>
    );
  }

  const m = bundle.metricsRow;
  const lsiGlobal = m?.lsiExt != null ? formatPct1(m.lsiExt) : "—";

  return (
    <div
      className="isokinetic-curve-pdf4 pdf-figure"
      style={{
        fontFamily: 'Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
        background: PAGE_SHELL,
        color: "#0f172a",
        padding: "14px 14px 18px",
        boxSizing: "border-box",
        width: "100%",
        maxWidth: "min(100%, 1180px)",
        margin: "0 auto",
        borderRadius: 14,
        WebkitPrintColorAdjust: "exact",
        printColorAdjust: "exact",
      }}
    >
      <header
        style={{
          background: HEADER_BG,
          color: "#f8fafc",
          borderRadius: 12,
          padding: "12px 16px",
          marginBottom: 12,
        }}
      >
        <div style={{ fontSize: 11, letterSpacing: "0.12em", opacity: 0.85, fontWeight: 700 }}>
          {tt("patient.testCharts.isoPdf4Kicker")}
        </div>
        <div style={{ fontSize: 18, fontWeight: 800, marginTop: 4 }}>
          {tt("patient.testCharts.isoPdf4Title")}
        </div>
        <div style={{ fontSize: 12, opacity: 0.88, marginTop: 6 }}>
          {name}
          {session?.data ? ` · ${formatDateDMY(session.data)}` : ""}
          {districtLabel ? ` · ${districtLabel}` : ""}
          {" · "}
          {tt("patient.testCharts.isoPdf4SpeedOnly")}
        </div>
      </header>

      <div
        style={{
          background: "#fff7ed",
          border: "1px solid #fdba74",
          borderRadius: 10,
          padding: "10px 12px",
          fontSize: 12,
          color: "#7c2d12",
          marginBottom: 12,
        }}
      >
        {tt("patient.testCharts.isoPdf4Disclaimer")}
      </div>

      <div style={{ fontSize: 12, color: TITLE_MUTED, marginBottom: 10 }}>
        {tt("patient.testCharts.isoPdf4LsiGlobalHint").replace("{{lsi}}", lsiGlobal)}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: 12,
          marginBottom: 14,
        }}
      >
        <OverlayExtFlexPanel
          title={tt("patient.testCharts.isoPdf4OverlayExt")}
          curveA={bundle.curveExtRight}
          curveB={bundle.curveExtLeft}
          labelA={tt("patient.testCharts.isoPdf4LegRight")}
          labelB={tt("patient.testCharts.isoPdf4LegLeft")}
          colorA={TEAL}
          colorB={ORANGE}
          axes={axes}
          torqueYLabel={tt("patient.testCharts.isoPdf3AxisTorque")}
          angleAxisLabel={tt("patient.testCharts.isoPdf3AxisAngle")}
        />
        <OverlayExtFlexPanel
          title={tt("patient.testCharts.isoPdf4OverlayFlex")}
          curveA={bundle.curveFlexRight}
          curveB={bundle.curveFlexLeft}
          labelA={tt("patient.testCharts.isoPdf4LegRight")}
          labelB={tt("patient.testCharts.isoPdf4LegLeft")}
          colorA={TEAL}
          colorB={ORANGE}
          axes={axes}
          torqueYLabel={tt("patient.testCharts.isoPdf3AxisTorque")}
          angleAxisLabel={tt("patient.testCharts.isoPdf3AxisAngle")}
        />
      </div>

      <div style={{ marginBottom: 14 }}>
        <LsiStripChart table={angleTable} axes={axes} tt={tt} />
      </div>

      <div
        style={{
          background: "#f0fdf4",
          border: "1px solid #86efac",
          borderRadius: 12,
          padding: "12px 14px",
          marginBottom: 14,
        }}
      >
        <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 8, color: "#14532d" }}>
          {tt("patient.testCharts.isoPdf4EvalTitle")}
        </div>
        {narrativePick?.narrativeKeys?.length ? (
          <div style={{ marginBottom: 12 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "#166534",
                marginBottom: 6,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              {tt("patient.testCharts.isoPdf4EvalFromPdf3")}
            </div>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: "#14532d", lineHeight: 1.45 }}>
              {narrativePick.narrativeKeys.slice(0, 4).map((k) => (
                <li key={k} style={{ marginBottom: 4 }}>
                  {tt(`patient.testCharts.${k}`)}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: "#166534",
            marginBottom: 6,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          {tt("patient.testCharts.isoPdf4EvalFromAngle")}
        </div>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: "#14532d", lineHeight: 1.45 }}>
          {(opinionKeys || []).map((k) => (
            <li key={k} style={{ marginBottom: 4 }}>
              {tt(`patient.testCharts.${k}`)}
            </li>
          ))}
        </ul>
      </div>

      <div
        style={{
          background: CARD_WHITE,
          borderRadius: 12,
          border: `1px solid ${GRID_MAJOR}`,
          padding: "10px 12px 12px",
          marginBottom: 12,
        }}
      >
        <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 8 }}>
          {tt("patient.testCharts.isoPdf4ZonesTitle")}
        </div>
        {zones.length === 0 ? (
          <p style={{ margin: 0, fontSize: 12, color: TITLE_MUTED }}>
            {tt("patient.testCharts.isoPdf4ZonesNone")}
          </p>
        ) : (
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12 }}>
            {zones.map((z, i) => (
              <li key={`${z.phase}-${z.lo}-${i}`} style={{ marginBottom: 4 }}>
                <strong>
                  {z.phase === "ext"
                    ? tt("patient.testCharts.isoPdf4PhaseExt")
                    : tt("patient.testCharts.isoPdf4PhaseFlex")}
                </strong>{" "}
                {z.lo}°–{z.hi}°
                {z.minLsi != null
                  ? ` — ${tt("patient.testCharts.isoPdf4ZoneMin").replace("{{lsi}}", z.minLsi.toFixed(0))}`
                  : ""}
              </li>
            ))}
          </ul>
        )}
        {worst ? (
          <p style={{ margin: "8px 0 0", fontSize: 12, color: "#b45309" }}>
            {tt("patient.testCharts.isoPdf4WorstHint")
              .replace("{{angle}}", String(worst.angle))
              .replace("{{lsi}}", worst.lsi.toFixed(0))
              .replace(
                "{{phase}}",
                worst.phase === "ext"
                  ? tt("patient.testCharts.isoPdf4PhaseExt")
                  : tt("patient.testCharts.isoPdf4PhaseFlex")
              )}
          </p>
        ) : null}
      </div>

      <div
        style={{
          background: CARD_WHITE,
          borderRadius: 12,
          border: `1px solid ${GRID_MAJOR}`,
          padding: "10px 12px 12px",
        }}
      >
        <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 8 }}>
          {tt("patient.testCharts.isoPdf4TableTitle").replace("{{step}}", String(angleTable.stepDeg))}
        </div>
        <div style={{ maxHeight: 280, overflow: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 11,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            <thead>
              <tr style={{ background: "#f1f5f9", textAlign: "left" }}>
                <th style={{ padding: "6px 8px" }}>{tt("patient.testCharts.isoPdf4ColAngle")}</th>
                <th style={{ padding: "6px 8px" }}>{tt("patient.testCharts.isoPdf4ColPhase")}</th>
                <th style={{ padding: "6px 8px" }}>{tt("patient.testCharts.isoPdf4ColRight")}</th>
                <th style={{ padding: "6px 8px" }}>{tt("patient.testCharts.isoPdf4ColLeft")}</th>
                <th style={{ padding: "6px 8px" }}>{tt("patient.testCharts.isoPdf4ColLsi")}</th>
              </tr>
            </thead>
            <tbody>
              {(angleTable.rows || []).map((r) => {
                const bad = r.severity !== "ok";
                return (
                  <tr
                    key={`a-${r.angle}`}
                    style={{
                      borderTop: `1px solid ${GRID_MAJOR}`,
                      background: bad ? "#fff1f2" : undefined,
                      color: bad ? NEG : undefined,
                    }}
                  >
                    <td style={{ padding: "5px 8px" }}>{r.angle}</td>
                    <td style={{ padding: "5px 8px", fontWeight: 700 }}>
                      {r.phase === "ext"
                        ? tt("patient.testCharts.isoPdf4PhaseExtShort")
                        : tt("patient.testCharts.isoPdf4PhaseFlexShort")}
                    </td>
                    <td style={{ padding: "5px 8px" }}>
                      {r.torqueRight != null ? r.torqueRight.toFixed(1) : "—"}
                    </td>
                    <td style={{ padding: "5px 8px" }}>
                      {r.torqueLeft != null ? r.torqueLeft.toFixed(1) : "—"}
                    </td>
                    <td style={{ padding: "5px 8px" }}>
                      {r.lsiDisplay != null ? `${r.lsiDisplay.toFixed(1)}%` : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <p style={{ margin: "12px 0 0", fontSize: 11, color: TITLE_MUTED, lineHeight: 1.45 }}>
        {tt("patient.testCharts.isoPdf4Footnote")}
      </p>
    </div>
  );
}

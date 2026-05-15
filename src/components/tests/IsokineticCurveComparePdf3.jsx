import { useMemo } from "react";
import {
  formatDateDMY,
  formatPatientListDisplayName,
} from "../../utils/helpers";
import {
  ensureIsokineticShape,
  formatPct1,
  normalizeIsokineticRowsForReport,
  parseIsokineticNum,
} from "../../utils/isokineticCalculations";
import {
  buildPdf3CurveBundle,
  computePdf3QualMetrics,
  getPdf3ClinicalAxes,
  selectPdf3NarrativeKeys,
} from "../../utils/isokineticPdf3CurveEngine";

const HEADER_BG = "#0f172a";
const PAGE_SHELL = "#e8ecf2";
const CARD_WHITE = "#ffffff";
const STRIP_BG = "#eceff4";
const PLOT_BG = "#fafbfc";
const GRID_MAJOR = "#dde3ea";
const GRID_MINOR = "rgba(148, 163, 184, 0.35)";
const AXIS_TEXT = "#475569";
const TITLE_MUTED = "#64748b";
const TEAL = "#2a9d8f";
const ORANGE = "#e76f51";
const NEG_PCT = "#dc2626";
const POS_PCT = "#16a34a";

function mapX(angle, xMin, xMax, w, padL, padR) {
  const iw = w - padL - padR;
  return padL + ((angle - xMin) / Math.max(1e-6, xMax - xMin)) * iw;
}

function mapY(torque, yMin, yMax, h, padT, padB) {
  const ih = h - padT - padB;
  return padT + ih - ((torque - yMin) / Math.max(1e-6, yMax - yMin)) * ih;
}

function clampSplit(split, xMin, xMax) {
  const s = Number(split);
  if (!Number.isFinite(s)) return (xMin + xMax) / 2;
  const pad = (xMax - xMin) * 0.02 + 1;
  return Math.min(xMax - pad, Math.max(xMin + pad, s));
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

function areaToZero(curve, xMin, xMax, yMin, yMax, w, h, padL, padT, padR, padB) {
  if (!curve.length) return "";
  const y0 = mapY(0, yMin, yMax, h, padT, padB);
  const pts = curve.map((p) => ({
    x: mapX(p.angle, xMin, xMax, w, padL, padR),
    y: mapY(p.torque, yMin, yMax, h, padT, padB),
  }));
  let d = `M ${pts[0].x.toFixed(1)} ${y0.toFixed(1)} L ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    d += ` L ${pts[i].x.toFixed(1)} ${pts[i].y.toFixed(1)}`;
  }
  d += ` L ${pts[pts.length - 1].x.toFixed(1)} ${y0.toFixed(1)} Z`;
  return d;
}

function peakMarkFromCurve(
  curve,
  tablePeakTorque,
  xMin,
  xMax,
  yMin,
  yMax,
  w,
  h,
  padL,
  padT,
  padR,
  padB
) {
  const ptTable = tablePeakTorque > 0 ? tablePeakTorque : 0;
  if (!curve.length) {
    const ang = (xMin + xMax) / 2;
    return {
      x: mapX(ang, xMin, xMax, w, padL, padR),
      y: mapY(ptTable, yMin, yMax, h, padT, padB),
      ang,
      pt: ptTable,
    };
  }
  const best = curve.reduce((b, p) => (p.torque > b.torque ? p : b), curve[0]);
  const ang = Math.min(xMax, Math.max(xMin, best.angle));
  const pt = ptTable > 0 ? ptTable : best.torque;
  return {
    x: mapX(ang, xMin, xMax, w, padL, padR),
    y: mapY(pt, yMin, yMax, h, padT, padB),
    ang,
    pt,
  };
}

function ClinicalDualTorquePanel({
  title,
  accent,
  extCurve,
  flexCurve,
  peaks,
  axes,
  fillExtId,
  fillFlexId,
  tt,
  peakExtLabel,
  peakFlexLabel,
}) {
  const w = 440;
  const h = 268;
  const padL = 52;
  const padR = 14;
  const padT = 26;
  const padB = 44;
  const { xMin, xMax, yMin, yMax } = axes;

  const plExt = polylinePts(extCurve, xMin, xMax, yMin, yMax, w, h, padL, padT, padR, padB);
  const plFlex = polylinePts(flexCurve, xMin, xMax, yMin, yMax, w, h, padL, padT, padR, padB);
  const apExt = areaToZero(extCurve, xMin, xMax, yMin, yMax, w, h, padL, padT, padR, padB);
  const apFlex = areaToZero(flexCurve, xMin, xMax, yMin, yMax, w, h, padL, padT, padR, padB);

  const pe = peakMarkFromCurve(
    extCurve,
    peaks.ext,
    xMin,
    xMax,
    yMin,
    yMax,
    w,
    h,
    padL,
    padT,
    padR,
    padB
  );
  const pf = peakMarkFromCurve(
    flexCurve,
    peaks.flex,
    xMin,
    xMax,
    yMin,
    yMax,
    w,
    h,
    padL,
    padT,
    padR,
    padB
  );

  const xStep = 20;
  const xTicks = [];
  for (let xv = Math.ceil(xMin / xStep) * xStep; xv <= xMax + 0.01; xv += xStep) {
    xTicks.push(Math.round(xv));
  }
  const yTicks = [];
  for (let t = yMin; t <= yMax; t += 20) yTicks.push(t);

  const split =
    axes.splitAngle != null && Number.isFinite(axes.splitAngle)
      ? clampSplit(axes.splitAngle, xMin, xMax)
      : clampSplit(60, xMin, xMax);
  const xSplit = mapX(split, xMin, xMax, w, padL, padR);

  return (
    <div
      style={{
        flex: 1,
        minWidth: 280,
        borderRadius: 12,
        border: `1px solid ${GRID_MAJOR}`,
        background: CARD_WHITE,
        boxSizing: "border-box",
        overflow: "hidden",
        boxShadow: "0 1px 3px rgba(15,23,42,0.06)",
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 800,
          letterSpacing: "0.1em",
          color: accent,
          padding: "10px 12px 6px",
          textTransform: "uppercase",
          borderBottom: `1px solid ${GRID_MAJOR}`,
          background: accent === TEAL ? "rgba(42,157,143,0.07)" : "rgba(231,111,81,0.08)",
        }}
      >
        {title}
      </div>
      <div style={{ padding: "8px 10px 6px", background: PLOT_BG }}>
        <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{ display: "block" }}>
          <defs>
            <linearGradient id={fillExtId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={accent} stopOpacity="0.38" />
              <stop offset="100%" stopColor={accent} stopOpacity="0.04" />
            </linearGradient>
            <linearGradient id={fillFlexId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={accent} stopOpacity="0.32" />
              <stop offset="100%" stopColor={accent} stopOpacity="0.03" />
            </linearGradient>
          </defs>
          <rect
            x={padL}
            y={padT}
            width={w - padL - padR}
            height={h - padT - padB}
            fill="#ffffff"
            stroke={GRID_MINOR}
            strokeWidth="1"
            rx="2"
          />
          {yTicks.map((tv) => {
            const y = mapY(tv, yMin, yMax, h, padT, padB);
            return (
              <line
                key={`h-${tv}`}
                x1={padL}
                y1={y}
                x2={w - padR}
                y2={y}
                stroke={tv === 0 ? "rgba(42,157,143,0.35)" : GRID_MAJOR}
                strokeWidth={tv === 0 ? 1.2 : 1}
              />
            );
          })}
          {xTicks.map((xv) => {
            const x = mapX(xv, xMin, xMax, w, padL, padR);
            return (
              <line
                key={`v-${xv}`}
                x1={x}
                y1={padT}
                x2={x}
                y2={h - padB}
                stroke={Math.abs(xv - split) < 0.51 ? "transparent" : GRID_MAJOR}
                strokeWidth="1"
              />
            );
          })}
          <line
            x1={xSplit}
            y1={padT}
            x2={xSplit}
            y2={h - padB}
            stroke={AXIS_TEXT}
            strokeWidth="1"
            strokeDasharray="4 4"
            opacity={0.45}
          />
          {yTicks.map((tv) => (
            <text
              key={`yl-${tv}`}
              x={padL - 8}
              y={mapY(tv, yMin, yMax, h, padT, padB) + 3}
              fill={AXIS_TEXT}
              fontSize="9"
              textAnchor="end"
              fontWeight="600"
            >
              {tv}
            </text>
          ))}
          {xTicks.map((xv) => (
            <text
              key={`xl-${xv}`}
              x={mapX(xv, xMin, xMax, w, padL, padR)}
              y={h - padB + 22}
              fill={AXIS_TEXT}
              fontSize="9"
              textAnchor="middle"
              fontWeight="600"
            >
              {xv}
            </text>
          ))}
          <text
            x={padL - 2}
            y={padT - 6}
            fill={AXIS_TEXT}
            fontSize="9"
            fontWeight="700"
          >
            {tt("patient.testCharts.isoPdf3AxisTorque")}
          </text>
          <text
            x={(padL + w - padR) / 2}
            y={h - 8}
            fill={AXIS_TEXT}
            fontSize="9"
            fontWeight="700"
            textAnchor="middle"
          >
            {tt("patient.testCharts.isoPdf3AxisAngle")}
          </text>
          <path d={apExt} fill={`url(#${fillExtId})`} stroke="none" />
          <path d={apFlex} fill={`url(#${fillFlexId})`} stroke="none" />
          <polyline
            points={plExt}
            fill="none"
            stroke={accent}
            strokeWidth="2.35"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <polyline
            points={plFlex}
            fill="none"
            stroke={accent}
            strokeWidth="2.1"
            strokeLinejoin="round"
            strokeLinecap="round"
            opacity={0.95}
          />
          <circle cx={pe.x} cy={pe.y} r="5.5" fill={CARD_WHITE} stroke={accent} strokeWidth="2.4" />
          <circle cx={pf.x} cy={pf.y} r="5" fill={CARD_WHITE} stroke={accent} strokeWidth="2.1" />
          <g>
            <rect
              x={Math.min(pe.x + 6, w - 132)}
              y={Math.max(pe.y - 38, padT + 2)}
              width={124}
              height={22}
              rx="4"
              fill={CARD_WHITE}
              stroke={accent}
              strokeWidth="1.4"
            />
            <text
              x={Math.min(pe.x + 14, w - 124)}
              y={Math.max(pe.y - 22, padT + 16)}
              fill="#0f172a"
              fontSize="8.5"
              fontWeight="800"
            >
              {peakExtLabel(pe.pt)}
            </text>
          </g>
          <g>
            <rect
              x={Math.min(pf.x + 4, w - 128)}
              y={Math.min(pf.y + 14, h - padB - 8)}
              width={120}
              height={22}
              rx="4"
              fill={CARD_WHITE}
              stroke={accent}
              strokeWidth="1.3"
            />
            <text
              x={Math.min(pf.x + 12, w - 120)}
              y={Math.min(pf.y + 29, h - padB + 6)}
              fill="#0f172a"
              fontSize="8.5"
              fontWeight="800"
            >
              {peakFlexLabel(pf.pt)}
            </text>
          </g>
        </svg>
      </div>
    </div>
  );
}

function relPct(leftVal, rightVal) {
  if (leftVal == null || rightVal == null) return null;
  if (!Number.isFinite(leftVal) || !Number.isFinite(rightVal) || rightVal <= 0) return null;
  return ((leftVal - rightVal) / rightVal) * 100;
}

export default function IsokineticCurveComparePdf3({
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

  const refertoCharts = iso.easytechPdfCharts60;
  const hasReferto =
    refertoCharts?.version === 1 &&
    Array.isArray(refertoCharts.images) &&
    refertoCharts.images.length > 0;

  const bundle = useMemo(
    () => (row60 ? buildPdf3CurveBundle(row60, injured) : null),
    [row60, injured]
  );

  const qual = useMemo(
    () => (bundle ? computePdf3QualMetrics(bundle) : null),
    [bundle]
  );

  const narrativePick = useMemo(
    () => (bundle && qual ? selectPdf3NarrativeKeys(bundle, qual) : null),
    [bundle, qual]
  );

  const axes = useMemo(
    () => (bundle ? bundle.chartAxes ?? getPdf3ClinicalAxes(bundle) : null),
    [bundle]
  );

  const name = formatPatientListDisplayName(patient) || "—";
  const m = bundle?.metricsRow;

  if (!bundle || !axes || !row60) {
    return (
      <div
        className="isokinetic-curve-pdf3 pdf-figure"
        style={{
          fontFamily: 'Inter, system-ui, sans-serif',
          background: PAGE_SHELL,
          color: AXIS_TEXT,
          padding: 24,
          borderRadius: 16,
        }}
      >
        <p style={{ margin: 0, color: TITLE_MUTED }}>{tt("patient.testCharts.isoPdf3NoData")}</p>
      </div>
    );
  }

  const ptRE = parseIsokineticNum(row60.right?.ptExt) || 0;
  const ptLE = parseIsokineticNum(row60.left?.ptExt) || 0;
  const ptRF = parseIsokineticNum(row60.right?.ptFlex) || 0;
  const ptLF = parseIsokineticNum(row60.left?.ptFlex) || 0;

  const lsiExtStr = formatPct1(m?.lsiExt);
  const relExt = relPct(ptLE, ptRE);
  const relFlex = relPct(ptLF, ptRF);
  const extPctStr =
    relExt != null && Number.isFinite(relExt)
      ? `${relExt >= 0 ? "+" : ""}${relExt.toFixed(1)}%`
      : "—";
  const flexPctStr =
    relFlex != null && Number.isFinite(relFlex)
      ? `${relFlex >= 0 ? "+" : ""}${relFlex.toFixed(1)}%`
      : "—";
  const extPctColor = relExt != null && relExt < 0 ? NEG_PCT : POS_PCT;
  const flexPctColor = relFlex != null && relFlex < 0 ? NEG_PCT : POS_PCT;

  const hqL = bundle.hq.left;
  const hqR = bundle.hq.right;
  const hqDelta =
    hqL != null && hqR != null && Number.isFinite(hqL) && Number.isFinite(hqR)
      ? `${hqL >= hqR ? "+" : ""}${(hqL - hqR).toFixed(1)} p.p.`
      : "—";

  const narrativeText = (narrativePick?.narrativeKeys || [])
    .map((k) => tt(`patient.testCharts.${k}`))
    .join(" ");

  const fillRExt = "pdf3fillRExt";
  const fillRFlex = "pdf3fillRFlex";
  const fillLExt = "pdf3fillLExt";
  const fillLFlex = "pdf3fillLFlex";

  const sintesiShort =
    narrativeText.length > 140 ? `${narrativeText.slice(0, 137)}…` : narrativeText;

  return (
    <div
      className="isokinetic-curve-pdf3 pdf-figure"
      style={{
        fontFamily: 'Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
        background: PAGE_SHELL,
        color: "#0f172a",
        padding: "14px 14px 18px",
        boxSizing: "border-box",
        width: "100%",
        maxWidth: "min(100%, 1120px)",
        margin: "0 auto",
        borderRadius: 14,
        WebkitPrintColorAdjust: "exact",
        printColorAdjust: "exact",
      }}
    >
      <div
        style={{
          borderRadius: 12,
          overflow: "hidden",
          border: "1px solid #cbd5e1",
          boxShadow: "0 10px 40px rgba(15,23,42,0.08)",
          background: CARD_WHITE,
        }}
      >
        <header
          style={{
            background: HEADER_BG,
            color: "#f8fafc",
            padding: "16px 20px 18px",
            borderBottom: "1px solid #1e293b",
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: "0.16em",
              color: "#5eead4",
              textTransform: "uppercase",
            }}
          >
            {tt("patient.testCharts.isoPdf3Kicker")}
          </div>
          <h1
            style={{
              margin: "8px 0 0",
              fontSize: 20,
              fontWeight: 900,
              letterSpacing: "0.03em",
              lineHeight: 1.2,
              textTransform: "uppercase",
            }}
          >
            {tt("patient.testCharts.isoPdf3Title")}
          </h1>
          <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 10, letterSpacing: "0.04em" }}>
            {districtLabel ? `${districtLabel} · ` : ""}
            {session?.data ? formatDateDMY(session.data) : "—"}
            {" · "}
            <strong style={{ color: "#e2e8f0" }}>{name}</strong>
          </div>
        </header>

        <div style={{ padding: "14px 16px 18px", background: CARD_WHITE }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(88px, 0.75fr) repeat(4, minmax(0, 1fr))",
              gap: 10,
              marginBottom: 14,
              padding: "12px 14px",
              borderRadius: 10,
              background: STRIP_BG,
              border: "1px solid #dfe6ee",
            }}
          >
            <div>
              <div style={{ fontSize: 8, fontWeight: 800, letterSpacing: "0.12em", color: TITLE_MUTED }}>
                {tt("patient.testCharts.isoPdf3StripVel")}
              </div>
              <div style={{ fontSize: 22, fontWeight: 900, color: TEAL, marginTop: 4 }}>60°/s</div>
            </div>
            <div>
              <div style={{ fontSize: 8, fontWeight: 800, letterSpacing: "0.1em", color: TITLE_MUTED }}>
                {tt("patient.testCharts.isoPdf3StripPeakExt")}
              </div>
              <div style={{ fontSize: 13, fontWeight: 800, marginTop: 6, lineHeight: 1.35 }}>
                <span style={{ color: TEAL }}>{Math.round(ptRE)} Nm</span>
                <span style={{ color: "#94a3b8", fontWeight: 600 }}> {tt("patient.testCharts.isoPdf3StripVs")} </span>
                <span style={{ color: ORANGE }}>{Math.round(ptLE)} Nm</span>
              </div>
              <div style={{ fontSize: 11, fontWeight: 800, marginTop: 4, color: extPctColor }}>{extPctStr}</div>
            </div>
            <div>
              <div style={{ fontSize: 8, fontWeight: 800, letterSpacing: "0.1em", color: TITLE_MUTED }}>
                {tt("patient.testCharts.isoPdf3StripPeakFlex")}
              </div>
              <div style={{ fontSize: 13, fontWeight: 800, marginTop: 6, lineHeight: 1.35 }}>
                <span style={{ color: TEAL }}>{Math.round(ptRF)} Nm</span>
                <span style={{ color: "#94a3b8", fontWeight: 600 }}> {tt("patient.testCharts.isoPdf3StripVs")} </span>
                <span style={{ color: ORANGE }}>{Math.round(ptLF)} Nm</span>
              </div>
              <div style={{ fontSize: 11, fontWeight: 800, marginTop: 4, color: flexPctColor }}>
                {flexPctStr}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 8, fontWeight: 800, letterSpacing: "0.1em", color: TITLE_MUTED }}>
                {tt("patient.testCharts.isoPdf3KpiHq")}
              </div>
              <div style={{ fontSize: 13, fontWeight: 800, marginTop: 6, lineHeight: 1.35 }}>
                <span style={{ color: TEAL }}>{hqR != null ? `${hqR.toFixed(1)}%` : "—"}</span>
                <span style={{ color: "#94a3b8", fontWeight: 600 }}> / </span>
                <span style={{ color: ORANGE }}>{hqL != null ? `${hqL.toFixed(1)}%` : "—"}</span>
              </div>
              <div style={{ fontSize: 10, fontWeight: 700, marginTop: 4, color: AXIS_TEXT }}>
                {tt("patient.testCharts.isoPdf3KpiHqDelta")}: {hqDelta}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 8, fontWeight: 800, letterSpacing: "0.1em", color: TITLE_MUTED }}>
                {tt("patient.testCharts.isoPdf3StripSym")}
              </div>
              <div style={{ fontSize: 18, fontWeight: 900, marginTop: 4, color: "#0f172a" }}>{lsiExtStr ?? "—"}</div>
              <div style={{ fontSize: 8, color: TITLE_MUTED, marginTop: 4, lineHeight: 1.35 }}>
                {tt("patient.testCharts.isoPdf3StripSymHint")}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "stretch" }}>
            <div style={{ flex: "1.15 1 360px", minWidth: 0, display: "flex", gap: 12, flexWrap: "wrap" }}>
              {hasReferto ? (
                <section
                  style={{
                    flex: "1 1 100%",
                    minWidth: 0,
                    borderRadius: 12,
                    border: `1px solid ${GRID_MAJOR}`,
                    background: PLOT_BG,
                    padding: "12px 12px 10px",
                    boxSizing: "border-box",
                  }}
                >
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 800,
                      letterSpacing: "0.12em",
                      color: TEAL,
                      marginBottom: 8,
                      textTransform: "uppercase",
                    }}
                  >
                    {tt("patient.testCharts.isoPdf3RefertoTitle")}
                  </div>
                  <p style={{ margin: "0 0 10px", fontSize: 9.5, color: AXIS_TEXT, lineHeight: 1.45 }}>
                    {tt("patient.testCharts.isoPdf3RefertoCaption")}
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {refertoCharts.images.map((im, idx) => (
                      <img
                        key={`${im.objId || "img"}-${idx}`}
                        src={im.dataUrl}
                        alt=""
                        width={im.nativeW}
                        height={im.nativeH}
                        style={{
                          width: "100%",
                          height: "auto",
                          display: "block",
                          borderRadius: 8,
                          border: `1px solid ${GRID_MAJOR}`,
                          background: "#fff",
                          WebkitPrintColorAdjust: "exact",
                          printColorAdjust: "exact",
                        }}
                      />
                    ))}
                  </div>
                </section>
              ) : (
                <>
                  <ClinicalDualTorquePanel
                    title={tt("patient.testCharts.isoPdf3PanelRight")}
                    accent={TEAL}
                    extCurve={bundle.curveExtRight}
                    flexCurve={bundle.curveFlexRight}
                    peaks={bundle.peaks.right}
                    axes={axes}
                    fillExtId={fillRExt}
                    fillFlexId={fillRFlex}
                    tt={tt}
                    peakExtLabel={(v) =>
                      `${tt("patient.testCharts.isoPdf3PeakExt")} ${Math.round(v)} Nm`
                    }
                    peakFlexLabel={(v) =>
                      `${tt("patient.testCharts.isoPdf3PeakFlex")} ${Math.round(v)} Nm`
                    }
                  />
                  <ClinicalDualTorquePanel
                    title={tt("patient.testCharts.isoPdf3PanelLeft")}
                    accent={ORANGE}
                    extCurve={bundle.curveExtLeft}
                    flexCurve={bundle.curveFlexLeft}
                    peaks={bundle.peaks.left}
                    axes={axes}
                    fillExtId={fillLExt}
                    fillFlexId={fillLFlex}
                    tt={tt}
                    peakExtLabel={(v) =>
                      `${tt("patient.testCharts.isoPdf3PeakExt")} ${Math.round(v)} Nm`
                    }
                    peakFlexLabel={(v) =>
                      `${tt("patient.testCharts.isoPdf3PeakFlex")} ${Math.round(v)} Nm`
                    }
                  />
                </>
              )}
            </div>

            <aside
              style={{
                flex: "0.5 1 200px",
                minWidth: 188,
                borderRadius: 12,
                border: `1px solid #e5dff7`,
                padding: "12px 12px 10px",
                background: "linear-gradient(180deg, #f7f5ff 0%, #ffffff 55%)",
                boxSizing: "border-box",
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 900,
                  letterSpacing: "0.1em",
                  color: "#6d28d9",
                  marginBottom: 10,
                }}
              >
                {tt("patient.testCharts.isoPdf3ShapeTitle")}
              </div>
              <ul
                style={{
                  margin: 0,
                  paddingLeft: 16,
                  color: AXIS_TEXT,
                  fontSize: 9.5,
                  lineHeight: 1.5,
                }}
              >
                {(narrativePick?.bulletKeys || []).map((k) => (
                  <li key={k} style={{ marginBottom: 8 }}>
                    <span style={{ color: "#0f172a" }}>{tt(`patient.testCharts.${k}`)}</span>
                  </li>
                ))}
              </ul>
              <div
                style={{
                  marginTop: 10,
                  paddingTop: 10,
                  borderTop: "1px solid rgba(148,163,184,0.25)",
                  fontSize: 9,
                  color: TITLE_MUTED,
                  lineHeight: 1.45,
                }}
              >
                {tt("patient.testCharts.isoPdf3SymGaugeHint").replace("{{pct}}", lsiExtStr ?? "—")}
              </div>
              {sintesiShort ? (
                <div
                  style={{
                    marginTop: 10,
                    paddingTop: 10,
                    borderTop: "1px solid rgba(148,163,184,0.2)",
                    fontSize: 9,
                    color: "#334155",
                    lineHeight: 1.45,
                  }}
                >
                  <strong style={{ color: "#0f172a" }}>{tt("patient.testCharts.isoPdf3StripSintesi")}:</strong>{" "}
                  {sintesiShort}
                </div>
              ) : null}
            </aside>
          </div>

          <section style={{ marginTop: 14 }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 900,
                letterSpacing: "0.1em",
                color: ORANGE,
                marginBottom: 6,
              }}
            >
              {tt("patient.testCharts.isoPdf3ReadTitle")}
            </div>
            <p style={{ margin: 0, fontSize: 10.5, lineHeight: 1.55, color: "#334155", maxWidth: "96%" }}>
              {narrativeText}
            </p>
          </section>

          <section
            style={{
              marginTop: 12,
              borderRadius: 10,
              padding: "12px 14px",
              background: "#f0fdf4",
              border: "1px solid #bbf7d0",
            }}
          >
            <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: "0.08em", marginBottom: 6, color: "#166534" }}>
              {tt("patient.testCharts.isoPdf3ImpactTitle")}
            </div>
            <ul style={{ margin: 0, paddingLeft: 16, fontSize: 9.5, color: "#365314", lineHeight: 1.5 }}>
              {(narrativePick?.impactKeys || []).map((k) => (
                <li key={k} style={{ marginBottom: 5 }}>
                  {tt(`patient.testCharts.${k}`)}
                </li>
              ))}
            </ul>
          </section>

          <p
            style={{
              margin: "12px 0 0",
              fontSize: 7.5,
              color: "#94a3b8",
              lineHeight: 1.45,
            }}
          >
            {tt(
              hasReferto
                ? "patient.testCharts.isoPdf3FootnotePdfRasters"
                : "patient.testCharts.isoPdf3Footnote"
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

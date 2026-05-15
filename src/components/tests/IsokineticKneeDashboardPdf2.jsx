import {
  calcBMI,
  formatDateDMY,
  formatPatientListDisplayName,
} from "../../utils/helpers";
import {
  computeRowMetrics,
  ensureIsokineticShape,
  hqPercent,
  normalizeIsokineticRowsForReport,
  parseIsokineticNum,
  formatPct1,
} from "../../utils/isokineticCalculations";

/** Mock dashboard isocinetico — palette tipo ref. (teal / arancio / navy) */
function fillTemplate(str, vars) {
  if (str == null || typeof str !== "string") return "—";
  return Object.keys(vars).reduce(
    (acc, k) => acc.replaceAll(`{{${k}}}`, String(vars[k] ?? "")),
    str
  );
}

const PCN = {
  bg: "#0b111b",
  card: "#121a28",
  card2: "#0e1522",
  border: "rgba(38, 166, 154, 0.35)",
  teal: "#26a69a",
  tealHi: "#4db6ac",
  tealFill: "rgba(38, 166, 154, 0.18)",
  orange: "#f57c00",
  orangeFill: "rgba(245, 124, 0, 0.16)",
  purple: "#ba68c8",
  text: "#ffffff",
  muted: "#9aa5b8",
  red: "#ef5350",
  amber: "#ffb74d",
  green: "#66bb6a",
};

/**
 * Griglia righe misura (solo colonna centrale dashboard): stessa su 60/180/300 °/s.
 * Obiettivo proporzioni ~ label movimento 28–32% | barre DX/SX 36–40% | anello simmetria ~14–18%
 * della somma label+bars+ring (il contenitore anello resta leggibile, non comprime le barre).
 */
const ISO_MEASURE_COLS = {
  labelPx: 118,
  barsPx: 128,
  ringPx: 74,
  gap: 14,
};

/** Fascia sinistra velocità+titolo: leggibile (pre-line), non rubare troppo spazio ai dati. */
const ISO_SPEED_STRIP_WIDTH_PX = 80;

/** Riga intestazioni DX / SX / SIMMETRIA — altezza compatta (non usa l’altezza delle barre). */
const ISO_HEADER_ROW_H = 22;

/** Barre verticali — traccia più larga, coppia DX/SX più distanziata dal cerchio (columnGap). */
const ISO_BAR_TRACK_W = 30;
const ISO_BAR_PAIR_GAP_PX = 18;
const ISO_BAR_H_MAX = 50;
/** Altezza fissa riga dati: numeri + gap + barre (allineate a destra con anello simmetria). */
const ISO_BAR_WRAP_H = 72;
/** Spazio tra valore numerico e barra (coppia DX / SX). */
const ISO_NUM_BAR_GAP_PX = 5;

function isoMeasureGridTemplateColumns() {
  const { labelPx, barsPx, ringPx } = ISO_MEASURE_COLS;
  return `${labelPx}px ${barsPx}px ${ringPx}px`;
}

function num(v) {
  return parseIsokineticNum(v);
}

function symBand(pct, tt) {
  const t = (key) => tt(`patient.testCharts.${key}`);
  if (pct == null || !Number.isFinite(pct))
    return { color: PCN.muted, label: "—", key: "none" };
  if (pct < 80)
    return { color: PCN.red, label: t("isoPdf2SymSevere"), key: "severe" };
  if (pct < 90)
    return { color: PCN.amber, label: t("isoPdf2SymModerate"), key: "mod" };
  return { color: PCN.green, label: t("isoPdf2SymGood"), key: "good" };
}

function ageYearsFromIsoDob(dob) {
  if (!dob || typeof dob !== "string") return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(dob).trim());
  if (!m) return null;
  const b = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (Number.isNaN(b.getTime())) return null;
  const t = new Date();
  let a = t.getFullYear() - b.getFullYear();
  const mo = t.getMonth() - b.getMonth();
  if (mo < 0 || (mo === 0 && t.getDate() < b.getDate())) a--;
  return a >= 0 && a < 130 ? a : null;
}

function PatientAvatar() {
  return (
    <div
      style={{
        width: 48,
        height: 48,
        borderRadius: "50%",
        background: `linear-gradient(145deg, ${PCN.teal}33, ${PCN.card2})`,
        border: `2px solid ${PCN.border}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="12" cy="5" r="2.2" fill={PCN.tealHi} />
        <path
          d="M12 7.5 L12 14 M9 9 L15 9 M10 14 L8 20 M14 14 L16 20 M12 14 L12 17"
          stroke={PCN.tealHi}
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

function IconBicep() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M8 10c0-2 1.5-3.5 4-3.5s4 1.5 4 3.5v5c0 2-1.5 3-4 3s-4-1-4-3v-5z"
        stroke={PCN.tealHi}
        strokeWidth="1.3"
        fill={PCN.tealFill}
      />
      <path d="M6 12h3M15 12h3" stroke={PCN.tealHi} strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function IconCycle() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 5a7 7 0 1 1-6.9 8"
        stroke={PCN.tealHi}
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path
        d="M12 19a7 7 0 1 1 6.9-8"
        stroke={PCN.orange}
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path d="M17 4v4h4" stroke={PCN.tealHi} strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function IconBolt() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M13 2L4 14h7l-1 8 10-14h-7l0-6z"
        fill={PCN.amber}
        stroke="#ffc107"
        strokeWidth="0.5"
      />
    </svg>
  );
}

/** Legenda LSI: semicerchio stilizzato (tre segmenti) — forma stabile in PDF */
function SymmetrySemiGauge({ tt }) {
  const w = 132;
  const t = (key) => tt(`patient.testCharts.${key}`);
  return (
    <div style={{ marginTop: 4 }}>
      <div
        style={{
          height: 10,
          borderRadius: "12px 12px 0 0",
          overflow: "hidden",
          display: "flex",
          border: `1px solid ${PCN.border}`,
        }}
      >
        <div style={{ flex: 1, background: PCN.red, opacity: 0.92 }} title={t("isoPdf2SymTierLt80")} />
        <div style={{ flex: 1, background: PCN.amber, opacity: 0.95 }} title={t("isoPdf2SymTier80to89")} />
        <div style={{ flex: 1, background: PCN.green, opacity: 0.9 }} title={t("isoPdf2SymTierGte90")} />
      </div>
      <svg width="100%" height={22} viewBox={`0 0 ${w} 22`} style={{ display: "block", marginTop: -1 }}>
        <path
          d={`M 6 0 Q ${w / 2} 18 ${w - 6} 0`}
          fill="none"
          stroke="rgba(255,255,255,0.12)"
          strokeWidth="1"
        />
      </svg>
    </div>
  );
}

/** Due barre verticali (Destro / Sinistro), valore sopra — come mock */
function VerticalPairBars({ valDx, valSx }) {
  const dx = num(valDx);
  const sx = num(valSx);
  const max = Math.max(dx ?? 0, sx ?? 0, 1);
  const hMax = ISO_BAR_H_MAX;
  const bw = ISO_BAR_TRACK_W;
  const hDx = dx != null && Number.isFinite(dx) ? Math.max(3, (dx / max) * hMax) : 0;
  const hSx = sx != null && Number.isFinite(sx) ? Math.max(3, (sx / max) * hMax) : 0;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        gap: ISO_BAR_PAIR_GAP_PX,
        height: ISO_BAR_WRAP_H,
        width: ISO_MEASURE_COLS.barsPx,
        minWidth: ISO_MEASURE_COLS.barsPx,
        maxWidth: ISO_MEASURE_COLS.barsPx,
        boxSizing: "border-box",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: ISO_NUM_BAR_GAP_PX }}>
        <span
          style={{
            fontSize: 13.5,
            fontWeight: 800,
            color: PCN.teal,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {dx != null && Number.isFinite(dx) ? Math.round(dx) : "—"}
        </span>
        <div
          style={{
            width: bw,
            height: hMax,
            borderRadius: 4,
            background: "rgba(0,0,0,0.35)",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            border: `1px solid ${PCN.border}`,
          }}
        >
          <div
            style={{
              width: "100%",
              height: hDx,
              borderRadius: "3px 3px 0 0",
              background: PCN.teal,
            }}
          />
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: ISO_NUM_BAR_GAP_PX }}>
        <span
          style={{
            fontSize: 13.5,
            fontWeight: 800,
            color: PCN.orange,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {sx != null && Number.isFinite(sx) ? Math.round(sx) : "—"}
        </span>
        <div
          style={{
            width: bw,
            height: hMax,
            borderRadius: 4,
            background: "rgba(0,0,0,0.35)",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            border: `1px solid ${PCN.border}`,
          }}
        >
          <div
            style={{
              width: "100%",
              height: hSx,
              borderRadius: "3px 3px 0 0",
              background: PCN.orange,
            }}
          />
        </div>
      </div>
    </div>
  );
}

/** Anello sottile simmetria % (+ etichetta stato opzionale, se non già affiancata alle barre). */
function SymmetryRing({ pct, tt, omitCaption = false }) {
  const b = symBand(pct, tt);
  const R = omitCaption ? 22 : 21;
  const c = 2 * Math.PI * R;
  const p = pct != null && Number.isFinite(pct) ? Math.min(130, Math.max(0, pct)) : 0;
  const dash = (Math.min(p, 100) / 100) * c;
  const svgPx = 56;
  const pctFont = 12.5;
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: omitCaption ? 0 : 3,
        width: ISO_MEASURE_COLS.ringPx,
        minWidth: ISO_MEASURE_COLS.ringPx,
        maxWidth: ISO_MEASURE_COLS.ringPx,
        overflow: "hidden",
        padding: omitCaption ? "0 3px" : "0 4px 4px",
        boxSizing: "border-box",
      }}
    >
      <svg width={svgPx} height={svgPx} viewBox="-4 -4 60 60" style={{ overflow: "hidden", display: "block" }}>
        <circle cx="26" cy="26" r={R} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="4" />
        <circle
          cx="26"
          cy="26"
          r={R}
          fill="none"
          stroke={b.color}
          strokeWidth="4"
          strokeDasharray={`${dash} ${c}`}
          strokeLinecap="round"
          transform="rotate(-90 26 26)"
        />
        <text
          x="26"
          y="31"
          textAnchor="middle"
          fill={PCN.text}
          fontSize={pctFont}
          fontWeight="800"
          fontFamily="system-ui,sans-serif"
        >
          {pct != null && Number.isFinite(pct) ? `${Math.round(pct)}%` : "—"}
        </text>
      </svg>
      {omitCaption ? null : (
      <span
        style={{
          fontSize: 7,
          fontWeight: 700,
          color: b.color,
          textAlign: "center",
          lineHeight: 1.15,
          maxWidth: "100%",
          textTransform: "uppercase",
          wordBreak: "break-word",
          hyphens: "auto",
        }}
      >
        {b.label}
      </span>
      )}
    </div>
  );
}

function MeasurementRow({ label, valDx, valSx, lsi, unit, borderTop, tt }) {
  const pct = typeof lsi === "number" && Number.isFinite(lsi) ? lsi : null;
  const sym = symBand(pct, tt);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: isoMeasureGridTemplateColumns(),
        columnGap: ISO_MEASURE_COLS.gap,
        alignItems: "center",
        padding: "8px 0",
        borderTop: borderTop ? "1px solid rgba(255,255,255,0.06)" : "none",
      }}
    >
      <div
        style={{
          minWidth: 0,
          maxWidth: ISO_MEASURE_COLS.labelPx,
          fontSize: 7.35,
          fontWeight: 700,
          color: PCN.muted,
          lineHeight: 1.18,
          paddingRight: 2,
          paddingTop: 1,
          paddingBottom: 1,
          overflow: "hidden",
          wordBreak: "break-word",
          hyphens: "manual",
        }}
      >
        <div style={{ color: PCN.muted }}>{label}</div>
        <div
          style={{
            marginTop: 2,
            fontSize: 7.35,
            fontWeight: 800,
            color: sym.color,
            lineHeight: 1.2,
            textTransform: "uppercase",
            letterSpacing: "0.02em",
          }}
        >
          {sym.label}
        </div>
        {unit ? (
          <div
            style={{
              marginTop: 2,
              fontWeight: 600,
              fontSize: 6.85,
              color: "rgba(255,255,255,0.4)",
              lineHeight: 1.15,
            }}
          >
            {unit}
          </div>
        ) : null}
      </div>
      <div style={{ display: "flex", justifyContent: "center", alignSelf: "center" }}>
        <VerticalPairBars valDx={valDx} valSx={valSx} />
      </div>
      <div
        style={{
          width: ISO_MEASURE_COLS.ringPx,
          minWidth: ISO_MEASURE_COLS.ringPx,
          height: ISO_BAR_WRAP_H,
          alignSelf: "center",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          overflow: "hidden",
        }}
      >
        <SymmetryRing pct={pct} tt={tt} omitCaption />
      </div>
    </div>
  );
}

function SpeedTierBlock({ speed, speedTitle, unitLabel, row, injured, mode, tt }) {
  if (!row) return null;
  const t = (key) => tt(`patient.testCharts.${key}`);
  const m = computeRowMetrics(row, injured);
  const r = row.right || {};
  const l = row.left || {};

  const extDx = r.ptExt;
  const extSx = l.ptExt;
  const flexDx = r.ptFlex;
  const flexSx = l.ptFlex;
  const wExtDx = r.workExt;
  const wExtSx = l.workExt;
  const wFlexDx = r.workFlex;
  const wFlexSx = l.workFlex;

  const lsiExt = m?.lsiExt;
  const lsiFlex = m?.lsiFlex;
  const wLsiExt =
    num(wExtDx) > 0 && num(wExtSx) != null ? (num(wExtSx) / num(wExtDx)) * 100 : null;
  const wLsiFlex =
    num(wFlexDx) > 0 && num(wFlexSx) != null ? (num(wFlexSx) / num(wFlexDx)) * 100 : null;

  return (
    <div
      className="iso-dash-card"
      style={{
        display: "flex",
        gap: 8,
        borderRadius: 12,
        border: `1px solid ${PCN.border}`,
        background: PCN.card,
        padding: "10px 12px 11px",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
        minHeight: 0,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: ISO_SPEED_STRIP_WIDTH_PX,
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          borderRight: `1px solid ${PCN.border}`,
          padding: "7px 8px",
          boxSizing: "border-box",
          alignSelf: "stretch",
        }}
      >
        <div
          style={{
            fontSize: 15,
            fontWeight: 900,
            color: PCN.tealHi,
            lineHeight: 1.05,
            width: "100%",
          }}
        >
          {speed}°/s
        </div>
        <div
          style={{
            marginTop: 6,
            fontSize: 8,
            fontWeight: 800,
            color: PCN.text,
            letterSpacing: "0.02em",
            lineHeight: 1.28,
            width: "100%",
            maxWidth: "100%",
            wordBreak: "normal",
            overflowWrap: "normal",
            hyphens: "none",
            whiteSpace: "pre-line",
          }}
        >
          {speedTitle}
        </div>
      </div>
      <div
        style={{
          flex: 1,
          minWidth: 0,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-start",
          alignItems: "center",
          padding: "0 6px 0 5px",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            width: "fit-content",
            maxWidth: "100%",
            marginLeft: "auto",
            marginRight: "auto",
            boxSizing: "border-box",
          }}
        >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isoMeasureGridTemplateColumns(),
            columnGap: ISO_MEASURE_COLS.gap,
            alignItems: "center",
            paddingTop: 0,
            paddingBottom: 1,
            marginBottom: 1,
            borderBottom: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          <div aria-hidden style={{ height: ISO_HEADER_ROW_H }} />
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: ISO_BAR_PAIR_GAP_PX,
              width: ISO_MEASURE_COLS.barsPx,
              minWidth: ISO_MEASURE_COLS.barsPx,
              maxWidth: ISO_MEASURE_COLS.barsPx,
              height: ISO_HEADER_ROW_H,
              fontSize: 6.85,
              fontWeight: 800,
              letterSpacing: "0.03em",
              color: PCN.muted,
              boxSizing: "border-box",
            }}
          >
            <span style={{ width: ISO_BAR_TRACK_W, textAlign: "center", color: PCN.teal, lineHeight: 1.05 }}>{t("isoPdf2HeaderRight")}</span>
            <span style={{ width: ISO_BAR_TRACK_W, textAlign: "center", color: PCN.orange, lineHeight: 1.05 }}>{t("isoPdf2HeaderLeft")}</span>
          </div>
          <div
            style={{
              width: ISO_MEASURE_COLS.ringPx,
              minWidth: ISO_MEASURE_COLS.ringPx,
              maxWidth: ISO_MEASURE_COLS.ringPx,
              height: ISO_HEADER_ROW_H,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              fontSize: 6.75,
              fontWeight: 800,
              letterSpacing: "0.04em",
              color: PCN.muted,
              boxSizing: "border-box",
              padding: "0 1px",
              lineHeight: 1.05,
            }}
          >
            {t("isoPdf2HeaderSymmetry")}
          </div>
        </div>
        {mode === "pt" ? (
          <>
            <MeasurementRow
              label={t("isoPdf2MeasureExtQuad")}
              valDx={extDx}
              valSx={extSx}
              lsi={lsiExt}
              unit={unitLabel}
              borderTop={false}
              tt={tt}
            />
            <MeasurementRow
              label={t("isoPdf2MeasureFlexHam")}
              valDx={flexDx}
              valSx={flexSx}
              lsi={lsiFlex}
              unit={unitLabel}
              borderTop
              tt={tt}
            />
          </>
        ) : (
          <>
            <MeasurementRow
              label={t("isoPdf2MeasureExtQuad")}
              valDx={wExtDx}
              valSx={wExtSx}
              lsi={wLsiExt}
              unit={unitLabel}
              borderTop={false}
              tt={tt}
            />
            <MeasurementRow
              label={t("isoPdf2MeasureFlexHam")}
              valDx={wFlexDx}
              valSx={wFlexSx}
              lsi={wLsiFlex}
              unit={unitLabel}
              borderTop
              tt={tt}
            />
          </>
        )}
        </div>
      </div>
    </div>
  );
}

/** Radar H/Q (Kiviat): titoli in HTML; area SVG scalata e centrata verticalmente tra sottotitolo e legenda. */
function HqRadarChart({ rows, tt }) {
  /*
   * Perché aumentare R e viewBox nello stesso rapporto non ingrandisce il grafico a schermo:
   * lo SVG ha width 100% + preserveAspectRatio "meet": il browser ridimensiona l'intero viewBox
   * per adattarlo al rettangolo CSS (larghezza colonna × altezza disponibile). Se vbW, vbH e R
   * si moltiplicano tutti per k, il triangolo occupa la stessa frazione del viewBox → stesso
   * risultato in pixel. Per ingrandire solo il Kiviat: aumentare R (e proporzionalmente etichette
   * e tratti) lasciando vbW/vbH invariati; eventualmente spostare cy per i margini.
   */
  const vbW = 648;
  const vbH = 480;
  const R = 276;
  const cx = vbW / 2;
  /** Triangolo zoom (+lati); cy e inset etichetta “60” evitano clip in alto. */
  const cy = (314 / 480) * vbH;
  const angles = [-Math.PI / 2, -Math.PI / 2 + (2 * Math.PI) / 3, -Math.PI / 2 + (4 * Math.PI) / 3];
  const maxHq = 130;
  const cornerLabelPad = 25;
  const cornerLabelR = R + cornerLabelPad;
  /** Sposta solo l’etichetta in cima verso il centro: resta leggibile senza clip (overflow card). */
  const topCornerLabelInset = 16;

  function poly(side) {
    const pts = rows.map((row, i) => {
      const s = row[side] || {};
      const hq = hqPercent(num(s.ptFlex), num(s.ptExt));
      const v = hq != null && Number.isFinite(hq) ? Math.min(Math.max(hq, 0), maxHq) : 0;
      const r = (v / maxHq) * R;
      const a = angles[i];
      return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
    });
    return pts.join(" ");
  }

  const grid = [0.35, 0.55, 0.75, 1].map((ringScale) => (
    <polygon
      key={ringScale}
      fill="none"
      stroke="rgba(255,255,255,0.16)"
      strokeWidth="2.864"
      points={angles
        .map((a) => {
          const rr = R * ringScale;
          return `${cx + rr * Math.cos(a)},${cy + rr * Math.sin(a)}`;
        })
        .join(" ")}
    />
  ));

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: 0,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          flexShrink: 0,
          textAlign: "center",
          padding: "2px 8px 4px",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            fontSize: 10.5,
            fontWeight: 800,
            color: PCN.text,
            letterSpacing: "0.04em",
            lineHeight: 1.2,
          }}
        >
          {tt("patient.testCharts.isoPdf2RadarTitle")}
        </div>
        <div
          style={{
            marginTop: 6,
            fontSize: 8.35,
            fontWeight: 600,
            color: PCN.muted,
            lineHeight: 1.42,
            maxWidth: "100%",
            paddingLeft: 4,
            paddingRight: 4,
          }}
        >
          {tt("patient.testCharts.isoPdf2RadarValueHint")}
        </div>
      </div>
      <div
        style={{
          flex: "1 1 0",
          minHeight: 0,
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 4px 4px",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "100%",
            maxHeight: "100%",
            aspectRatio: `${vbW} / ${vbH}`,
            flexShrink: 1,
            alignSelf: "center",
            minWidth: 0,
            minHeight: 0,
          }}
        >
          <svg
            width="100%"
            height="100%"
            viewBox={`0 0 ${vbW} ${vbH}`}
            preserveAspectRatio="xMidYMid meet"
            style={{ display: "block", overflow: "visible" }}
          >
            {grid}
            {[0, 1, 2].map((i) => (
              <line
                key={i}
                x1={cx}
                y1={cy}
                x2={cx + R * Math.cos(angles[i])}
                y2={cy + R * Math.sin(angles[i])}
                stroke="rgba(255,255,255,0.2)"
                strokeWidth="2.795"
              />
            ))}
            {angles.map((a, i) => {
              const spd = rows[i]?.speed;
              if (spd == null) return null;
              const labelR =
                i === 0 ? cornerLabelR - topCornerLabelInset : cornerLabelR;
              const lx = cx + labelR * Math.cos(a);
              const ly = cy + labelR * Math.sin(a);
              const anchor =
                i === 0 ? "middle" : i === 1 ? "start" : "end";
              const dy = i === 0 ? "0.12em" : "0.32em";
              return (
                <text
                  key={`corner-${spd}`}
                  x={lx}
                  y={ly}
                  dy={dy}
                  textAnchor={anchor}
                  fill={PCN.tealHi}
                  fontSize="28.31"
                  fontWeight="800"
                  fontFamily="system-ui,sans-serif"
                  style={{ userSelect: "none" }}
                >
                  {spd}
                </text>
              );
            })}
            <polygon
              fill={PCN.tealFill}
              stroke={PCN.teal}
              strokeWidth="5.749"
              points={poly("right")}
            />
            <polygon
              fill={PCN.orangeFill}
              stroke={PCN.orange}
              strokeWidth="5.749"
              points={poly("left")}
            />
            <circle cx={cx} cy={cy} r="4.953" fill={PCN.text} />
          </svg>
        </div>
      </div>
      <div
        style={{
          flexShrink: 0,
          marginTop: 4,
          paddingTop: 6,
          paddingBottom: 6,
          borderTop: `1px solid ${PCN.border}`,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: 8,
            textAlign: "center",
            fontSize: 8.75,
            lineHeight: 1.4,
            color: PCN.muted,
            paddingLeft: 2,
            paddingRight: 2,
            boxSizing: "border-box",
          }}
        >
          {rows.map((row) => {
            const hqR = hqPercent(num(row.right?.ptFlex), num(row.right?.ptExt));
            const hqL = hqPercent(num(row.left?.ptFlex), num(row.left?.ptExt));
            return (
              <div
                key={row.speed}
                style={{
                  minWidth: 0,
                  display: "flex",
                  flexDirection: "column",
                  gap: 3,
                  padding: "0 2px 0",
                }}
              >
                <div style={{ fontWeight: 800, color: PCN.text }}>{row.speed}°/s</div>
                <div style={{ color: PCN.teal, fontWeight: 800 }}>
                  {tt("patient.testCharts.isoPdf2HeaderRight")} {formatPct1(hqR) ?? "—"}
                </div>
                <div style={{ color: PCN.orange, fontWeight: 800 }}>
                  {tt("patient.testCharts.isoPdf2HeaderLeft")} {formatPct1(hqL) ?? "—"}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function buildSynthesis(rows, injured, healthy, tt) {
  if (!injured || !healthy) return "—";
  const tp = (key) => tt(`patient.testCharts.${key}`);
  const parts = [];
  let worstExt = 100;
  for (const row of rows) {
    const m = computeRowMetrics(row, injured);
    if (m?.lsiExt != null && m.lsiExt < worstExt) worstExt = m.lsiExt;
  }
  const lsiStr = formatPct1(worstExt) || "—";
  if (worstExt < 90) {
    const key =
      injured === "left" ? "isoPdf2SynthExtDeficitLeft" : "isoPdf2SynthExtDeficitRight";
    parts.push(fillTemplate(tp(key), { lsi: lsiStr }));
  } else {
    const key = injured === "left" ? "isoPdf2SynthExtOkLeft" : "isoPdf2SynthExtOkRight";
    parts.push(tp(key));
  }
  const hqs = rows.map((r) => {
    const s = r[injured] || {};
    return hqPercent(num(s.ptFlex), num(s.ptExt));
  });
  const maxHq = Math.max(...hqs.filter((x) => x != null), 0);
  const minHq = Math.min(...hqs.filter((x) => x != null), 999);
  if (maxHq - minHq > 15 && hqs.every((x) => x != null)) {
    parts.push(tp("isoPdf2SynthHqVaries"));
  }
  return parts.filter(Boolean).join("") || "—";
}

function buildRehabBullets(rows, injured, tt) {
  if (!injured) return [];
  const tp = (key) => tt(`patient.testCharts.${key}`);
  const out = [];
  const m60 = computeRowMetrics(rows.find((r) => r.speed === 60) || {}, injured);
  const m180 = computeRowMetrics(rows.find((r) => r.speed === 180) || {}, injured);
  const m300 = computeRowMetrics(rows.find((r) => r.speed === 300) || {}, injured);
  if (m60?.lsiExt != null && m60.lsiExt < 90) {
    out.push(tp("isoPdf2RehabQuadSlowFast"));
  }
  if (m180?.lsiExt != null && m180.lsiExt < 92) {
    out.push(tp("isoPdf2RehabEndurance180"));
  }
  if (m300?.lsiExt != null && m300.lsiExt < 95) {
    out.push(tp("isoPdf2RehabRapid300"));
  }
  if (!out.length) {
    out.push(tp("isoPdf2RehabDefault"));
  }
  return out.filter(Boolean).slice(0, 4);
}

export default function IsokineticKneeDashboardPdf2({
  patient,
  session,
  test,
  districtLabel,
  tt,
}) {
  const iso = ensureIsokineticShape(test?.isokinetic || {});
  const rows = normalizeIsokineticRowsForReport(iso);
  const injured = iso.injuredSide;
  const healthy = injured === "left" ? "right" : injured === "right" ? "left" : null;

  const name = formatPatientListDisplayName(patient) || "—";
  const dob = patient?.dataNascita ? formatDateDMY(patient.dataNascita) : "—";
  const age = ageYearsFromIsoDob(patient?.dataNascita);
  const h = num(patient?.altezza);
  const wKg = num(patient?.peso);
  const bmi = calcBMI(patient?.peso, patient?.altezza);
  const dom =
    patient?.manoDominante &&
    (tt(`dominantHand.${patient.manoDominante}`) || patient.manoDominante);
  const injDate = patient?.dataInfortunio
    ? formatDateDMY(patient.dataInfortunio)
    : "—";

  const synthesis = buildSynthesis(rows, injured, healthy, tt);
  const rehab = buildRehabBullets(rows, injured, tt);

  const destroLegenda =
    injured === "right"
      ? `${tt("evaluation.right")?.toUpperCase() ?? ""} — ${tt("patient.testCharts.isoPdf2SideEvaluated") ?? ""}`
      : `${tt("evaluation.right")?.toUpperCase() ?? ""} — ${tt("patient.testCharts.isoPdf2SideHealthy") ?? ""}`;
  const sinistroLegenda =
    injured === "left"
      ? `${tt("evaluation.left")?.toUpperCase() ?? ""} — ${tt("patient.testCharts.isoPdf2SideEvaluated") ?? ""}`
      : `${tt("evaluation.left")?.toUpperCase() ?? ""} — ${tt("patient.testCharts.isoPdf2SideHealthy") ?? ""}`;

  const r60 = rows.find((r) => r.speed === 60);
  const r180 = rows.find((r) => r.speed === 180);
  const r300 = rows.find((r) => r.speed === 300);

  return (
    <div
      className="isokinetic-dashboard-pdf2 pdf-figure"
      style={{
        fontFamily: 'Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
        background: PCN.bg,
        color: PCN.text,
        padding: "18px 24px 20px",
        boxSizing: "border-box",
        width: "100%",
        maxWidth: "min(100%, 1060px)",
        margin: "0 auto",
        borderRadius: 16,
        border: `1px solid ${PCN.border}`,
        boxShadow: "0 14px 44px rgba(0,0,0,0.38)",
        overflow: "visible",
        WebkitPrintColorAdjust: "exact",
        printColorAdjust: "exact",
      }}
    >
      <header
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 16,
          marginBottom: 11,
          padding: "4px 4px 11px",
          boxSizing: "border-box",
          borderBottom: `1px solid ${PCN.border}`,
        }}
      >
        <div style={{ minWidth: 0, flex: "1 1 auto", paddingRight: 8 }}>
          <div
            style={{
              fontSize: 16,
              fontWeight: 900,
              letterSpacing: "0.07em",
              color: PCN.text,
              lineHeight: 1.1,
              textTransform: "uppercase",
            }}
          >
            {tt("patient.testCharts.isoPdf2Title")}
          </div>
          <div
            style={{
              fontSize: 9.5,
              color: PCN.muted,
              marginTop: 4,
              letterSpacing: "0.1em",
              fontWeight: 600,
              textTransform: "uppercase",
            }}
          >
            {tt("patient.testCharts.isoPdf2Subtitle")}
          </div>
          <div style={{ fontSize: 8.75, color: PCN.muted, marginTop: 5, letterSpacing: "0.02em" }}>
            {districtLabel ? `${districtLabel} · ` : ""}
            {session?.data ? formatDateDMY(session.data) : "—"}
          </div>
        </div>
        <div
          style={{
            fontSize: 9.5,
            color: PCN.muted,
            textAlign: "right",
            maxWidth: 240,
            lineHeight: 1.45,
            flexShrink: 0,
            paddingLeft: 12,
            paddingTop: 2,
          }}
        >
          <div>
            <span style={{ color: PCN.teal }}>●</span> <span style={{ color: PCN.text, fontWeight: 700 }}>{destroLegenda}</span>
          </div>
          <div style={{ marginTop: 4 }}>
            <span style={{ color: PCN.orange }}>●</span>{" "}
            <span style={{ color: PCN.text, fontWeight: 700 }}>{sinistroLegenda}</span>
          </div>
        </div>
      </header>

      <div
        className="iso-dash-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(182px, 1fr) minmax(468px, 1.68fr) minmax(182px, 0.98fr)",
          gap: 11,
          alignItems: "stretch",
        }}
      >
        <aside
          className="iso-dash-aside iso-dash-aside--left"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
            minWidth: 0,
            alignSelf: "stretch",
            height: "100%",
          }}
        >
          <div style={{ flex: "1 1 0", minHeight: 0, display: "flex", flexDirection: "column" }}>
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                borderRadius: 12,
                border: `1px solid ${PCN.border}`,
                padding: "11px 12px",
                background: PCN.card,
                boxSizing: "border-box",
                minHeight: 0,
              }}
            >
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <PatientAvatar />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 900, fontSize: 15, color: PCN.text }}>{name}</div>
                <div style={{ fontSize: 9, color: PCN.muted, marginTop: 5, lineHeight: 1.42 }}>
                  {tt("patient.birthDate")}: {dob}
                  {age != null ? ` · ${tt("patient.testCharts.isoPdf2AgeShort")} ${age}` : ""}
                  <br />
                  {h ? `${h} cm` : ""}
                  {wKg ? ` · ${wKg} kg` : ""}
                  {bmi ? ` · BMI ${bmi}` : ""}
                  <br />
                  {dom ? (
                    <>
                      {tt("patient.dominantHand")}:{" "}
                      <strong style={{ color: PCN.teal }}>{dom}</strong>
                      <br />
                    </>
                  ) : null}
                  {tt("patient.injuryDate")}: {injDate}
                </div>
              </div>
            </div>
            </div>
          </div>

          <div style={{ flex: "1 1 0", minHeight: 0, display: "flex", flexDirection: "column" }}>
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                borderRadius: 12,
                border: `1px solid ${PCN.border}`,
                padding: "11px 12px",
                background: PCN.card,
                boxSizing: "border-box",
                minHeight: 0,
              }}
            >
            <div
              style={{
                fontWeight: 900,
                color: PCN.purple,
                marginBottom: 9,
                fontSize: 10,
                letterSpacing: "0.07em",
              }}
            >
              {tt("patient.testCharts.isoPdf2WhatMeasures")?.toUpperCase()}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                <IconBicep />
                <div style={{ fontSize: 9, color: PCN.muted, lineHeight: 1.42 }}>
                  <strong style={{ color: PCN.text }}>60°/s</strong> —{" "}
                  {tt("patient.testCharts.isoPdf2What60")}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                <IconCycle />
                <div style={{ fontSize: 9, color: PCN.muted, lineHeight: 1.42 }}>
                  <strong style={{ color: PCN.text }}>180°/s</strong> —{" "}
                  {tt("patient.testCharts.isoPdf2What180")}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                <IconBolt />
                <div style={{ fontSize: 9, color: PCN.muted, lineHeight: 1.42 }}>
                  <strong style={{ color: PCN.text }}>300°/s</strong> —{" "}
                  {tt("patient.testCharts.isoPdf2What300")}
                </div>
              </div>
            </div>
            </div>
          </div>

          <div style={{ flex: "1 1 0", minHeight: 0, display: "flex", flexDirection: "column" }}>
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                borderRadius: 12,
                border: `1px solid ${PCN.border}`,
                padding: "11px 12px 10px",
                background: PCN.card2,
                boxSizing: "border-box",
                minHeight: 0,
              }}
            >
            <div
              style={{
                fontWeight: 900,
                color: PCN.tealHi,
                fontSize: 10.5,
                marginBottom: 5,
                letterSpacing: "0.06em",
              }}
            >
              {tt("patient.testCharts.isoPdf2SymmetryLegendTitle")?.toUpperCase()}
            </div>
            <SymmetrySemiGauge tt={tt} />
            <div style={{ fontSize: 8.85, color: PCN.muted, lineHeight: 1.45, marginTop: 6 }}>
              <span style={{ color: PCN.red }}>●</span> {tt("patient.testCharts.isoPdf2SymLegendLt80")}
              <br />
              <span style={{ color: PCN.amber }}>●</span> {tt("patient.testCharts.isoPdf2SymLegend80to89")}
              <br />
              <span style={{ color: PCN.green }}>●</span> {tt("patient.testCharts.isoPdf2SymLegendGte90")}
            </div>
            </div>
          </div>

          <div style={{ flex: "1 1 0", minHeight: 0, display: "flex", flexDirection: "column" }}>
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                fontSize: 9.5,
                fontWeight: 700,
                color: PCN.tealHi,
                borderRadius: 12,
                padding: "11px 12px",
                lineHeight: 1.45,
                background: "rgba(38,166,154,0.12)",
                border: `1px solid ${PCN.border}`,
                textAlign: "left",
                boxSizing: "border-box",
                minHeight: 0,
              }}
            >
            ★ {tt("patient.testCharts.isoPdf2FooterGoal")}
            </div>
          </div>
        </aside>

        <section className="iso-dash-center" style={{ minWidth: 0, alignSelf: "stretch", display: "flex", flexDirection: "column" }}>
          <div className="iso-dash-cards" style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
            <SpeedTierBlock
              speed={60}
              speedTitle={tt("patient.testCharts.isoPdf2SpeedForceMax")}
              unitLabel={tt("patient.testCharts.isoPdf2UnitNm")}
              row={r60}
              injured={injured}
              mode="pt"
              tt={tt}
            />
            <SpeedTierBlock
              speed={180}
              speedTitle={tt("patient.testCharts.isoPdf2SpeedResist")}
              unitLabel={tt("patient.testCharts.isoPdf2UnitWork")}
              row={r180}
              injured={injured}
              mode="work"
              tt={tt}
            />
            <SpeedTierBlock
              speed={300}
              speedTitle={tt("patient.testCharts.isoPdf2SpeedFast")}
              unitLabel={tt("patient.testCharts.isoPdf2UnitNm")}
              row={r300}
              injured={injured}
              mode="pt"
              tt={tt}
            />
          </div>
        </section>

        <aside
          className="iso-dash-aside iso-dash-aside--right"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
            minWidth: 0,
            alignSelf: "stretch",
            height: "100%",
          }}
        >
          <div
            style={{
              flex: "1 1 0",
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
              borderRadius: 12,
              border: `1px solid ${PCN.border}`,
              padding: "10px 11px 10px",
              background: PCN.card,
              overflow: "hidden",
              boxSizing: "border-box",
            }}
          >
            <HqRadarChart rows={rows} tt={tt} />
          </div>

          <div
            style={{
              flex: "0 0 auto",
              borderRadius: 12,
              border: `1px solid ${PCN.border}`,
              padding: "11px 12px",
              background: PCN.card2,
            }}
          >
            <div
              style={{
                fontWeight: 900,
                color: PCN.tealHi,
                fontSize: 10,
                marginBottom: 7,
                letterSpacing: "0.06em",
              }}
            >
              {tt("patient.testCharts.isoPdf2Synthesis")?.toUpperCase()}
            </div>
            <p style={{ margin: 0, fontSize: 9, lineHeight: 1.48, color: PCN.text }}>{synthesis}</p>
          </div>

          <div
            style={{
              flex: "0 0 auto",
              borderRadius: 12,
              border: `1px solid ${PCN.border}`,
              padding: "11px 12px",
              background: PCN.card,
            }}
          >
            <div
              style={{
                fontWeight: 900,
                color: PCN.purple,
                fontSize: 10,
                marginBottom: 7,
                letterSpacing: "0.06em",
              }}
            >
              {tt("patient.testCharts.isoPdf2Rehab")?.toUpperCase()}
            </div>
            <ul style={{ margin: 0, paddingLeft: 14, fontSize: 9, lineHeight: 1.52, color: PCN.text }}>
              {rehab.map((line, i) => (
                <li key={i} style={{ marginBottom: 3 }}>
                  <span style={{ color: PCN.purple }}>✓</span> {line}
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}

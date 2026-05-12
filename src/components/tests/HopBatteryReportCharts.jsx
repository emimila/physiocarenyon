import { formatDateDMY, formatPatientListDisplayName } from "../../utils/helpers";
import {
  ensureHopBatteryShape,
  formatHopLsiOneDecimal,
  HOP_AXIS_MAX_BY_KEY,
  HOP_BATTERY_ROW_KEYS,
  hopAxisSpanMax,
  hopHealthyReferenceValue,
  hopLsiBand,
  hopLsiBandColors,
  hopLsiPercent,
  hopSoglia90Percent,
  meanHopLsi,
  parseHopNum,
} from "../../utils/hopBatteryCalculations";

/** Allineato a Y Balance / tema PhysioCare: DX teal, SX verde. */
const NAVY = "#0d5c68";
const DX_COLOR = "#127b8c";
const SX_COLOR = "#00ab5b";
const THRESHOLD_ORANGE = "#f97316";
const MUTED = "#64748b";
const TRACK_BG = "#f1f5f9";

function rowTitle(tt, key) {
  return tt(`tests.hopBattery.${key}`);
}

function quadDescription(tt, key) {
  return tt(`tests.hopBattery.pdfQuadDesc.${key}`);
}

function formatMeasure(valStr, isReps, tt) {
  if (valStr === "" || valStr == null) return "—";
  const n = parseHopNum(valStr);
  if (!Number.isFinite(n)) return String(valStr);
  const suf = isReps
    ? ` ${tt("tests.hopBattery.unitRepsShort")}`
    : ` ${tt("tests.hopBattery.unitCm")}`;
  const s = Number.isInteger(n) ? String(n) : String(n).replace(".", ",");
  return `${s}${suf}`;
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
  return list && extra ? `${list}, ${extra}` : list || extra || "—";
}

function dotsOnSegment(xStart, xEnd, y, count, fill, maxDots = 32) {
  const n = Math.max(0, Math.floor(count));
  if (n < 1 || xEnd <= xStart) return null;
  const show = Math.min(n, maxDots);
  const els = [];
  for (let i = 1; i <= show; i += 1) {
    const t = i / (show + 1);
    const cx = xStart + t * (xEnd - xStart);
    els.push(
      <circle key={`${fill}-${i}`} cx={cx} cy={y} r={2.2} fill={fill} />
    );
  }
  return <g>{els}</g>;
}

/**
 * Traccia orizzontale: scala come referto (max per tipo test), soglia 90% arancio.
 * Side hop: pallini lungo la linea (ripetizioni). Crossover: arco tratteggiato decorativo.
 */
function HopQuadrantTrack({ hopKey, dxStr, sxStr, injuredSide, tt }) {
  const dx = parseHopNum(dxStr);
  const sx = parseHopNum(sxStr);
  const healthy = hopHealthyReferenceValue(injuredSide, dxStr, sxStr);
  const soglia = hopSoglia90Percent(healthy);
  const span = hopAxisSpanMax(hopKey, dxStr, sxStr, soglia);
  const isReps = hopKey === "sideHop";
  const isCross = hopKey === "crossoverHop";
  const hasDx = Number.isFinite(dx);
  const hasSx = Number.isFinite(sx);

  const vbW = 300;
  const vbH = 82;
  const padL = 44;
  const plotW = 232;
  const x0 = padL;
  const x1 = padL + plotW;
  const yDx = 26;
  const ySx = 52;
  const yBase = 66;
  const xAt = (v) => x0 + (Math.min(Math.max(v, 0), span) / span) * plotW;
  const axisCap = HOP_AXIS_MAX_BY_KEY[hopKey] ?? span;

  return (
    <svg
      width="100%"
      height={88}
      viewBox={`0 0 ${vbW} ${vbH}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ display: "block", maxWidth: "100%" }}
    >
      <rect
        x={x0 - 2}
        y={10}
        width={plotW + 4}
        height={yBase - 8}
        rx={6}
        fill={TRACK_BG}
        stroke="#e2e8f0"
      />
      <line x1={x0} y1={yBase} x2={x1} y2={yBase} stroke="#cbd5e1" strokeWidth={1} />
      {[0, 0.5, 1].map((t) => {
        const xv = x0 + t * plotW;
        const val = t * axisCap;
        const lab =
          axisCap >= 100 ? String(Math.round(val)) : val.toFixed(0).replace(".", ",");
        return (
          <text key={t} x={xv} y={vbH - 4} fontSize={8} fill={MUTED} textAnchor={t === 1 ? "end" : t === 0 ? "start" : "middle"}>
            {lab}
            {isReps ? "" : ""}
          </text>
        );
      })}
      {soglia != null && Number.isFinite(soglia) && soglia > 0 ? (
        <g>
          <line
            x1={xAt(soglia)}
            y1={12}
            x2={xAt(soglia)}
            y2={yBase - 2}
            stroke={THRESHOLD_ORANGE}
            strokeWidth={2}
            strokeDasharray="5 4"
          />
          <text
            x={Math.min(xAt(soglia) + 3, x1 - 2)}
            y={16}
            fontSize={7}
            fill={THRESHOLD_ORANGE}
            fontWeight={700}
          >
            {tt("tests.hopBattery.pdfSoglia90Short")}
          </text>
        </g>
      ) : null}
      {hasDx ? (
        <g>
          <text x={8} y={yDx + 4} fontSize={10} fill={DX_COLOR} fontWeight={700}>
            DX
          </text>
          <line
            x1={x0}
            y1={yDx}
            x2={xAt(dx)}
            y2={yDx}
            stroke={DX_COLOR}
            strokeWidth={3.5}
            strokeLinecap="round"
          />
          {isReps
            ? dotsOnSegment(x0, xAt(dx), yDx, dx, DX_COLOR)
            : null}
          {!isReps ? <circle cx={xAt(dx)} cy={yDx} r={5} fill={DX_COLOR} /> : null}
          {isCross ? (
            <path
              d={`M ${x0} ${yDx} Q ${(x0 + xAt(dx)) / 2} ${yDx - 16} ${xAt(dx)} ${yDx}`}
              fill="none"
              stroke={DX_COLOR}
              strokeWidth={1.2}
              strokeDasharray="3 3"
              opacity={0.75}
            />
          ) : null}
        </g>
      ) : (
        <text x={8} y={yDx + 4} fontSize={10} fill="#94a3b8">
          DX
        </text>
      )}
      {hasSx ? (
        <g>
          <text x={8} y={ySx + 4} fontSize={10} fill={SX_COLOR} fontWeight={700}>
            SX
          </text>
          <line
            x1={x0}
            y1={ySx}
            x2={xAt(sx)}
            y2={ySx}
            stroke={SX_COLOR}
            strokeWidth={3.5}
            strokeLinecap="round"
          />
          {isReps
            ? dotsOnSegment(x0, xAt(sx), ySx, sx, SX_COLOR)
            : null}
          {!isReps ? <circle cx={xAt(sx)} cy={ySx} r={5} fill={SX_COLOR} /> : null}
          {isCross ? (
            <path
              d={`M ${x0} ${ySx} Q ${(x0 + xAt(sx)) / 2} ${ySx - 14} ${xAt(sx)} ${ySx}`}
              fill="none"
              stroke={SX_COLOR}
              strokeWidth={1.2}
              strokeDasharray="3 3"
              opacity={0.75}
            />
          ) : null}
        </g>
      ) : (
        <text x={8} y={ySx + 4} fontSize={10} fill="#94a3b8">
          SX
        </text>
      )}
    </svg>
  );
}

function HopQuadrant({ index, hopKey, hb, tt }) {
  const p = hb[hopKey] || {};
  const isReps = hopKey === "sideHop";
  const sogliaVal = hopSoglia90Percent(
    hopHealthyReferenceValue(hb.injuredSide, p.dx, p.sx)
  );
  return (
    <div
      className="hop-battery-quad pdf-avoid-break"
      style={{
        border: "1px solid #e2e8f0",
        borderRadius: 14,
        overflow: "hidden",
        background: "#fff",
        boxShadow: "0 1px 3px rgba(15,23,42,0.06)",
      }}
    >
      <div
        style={{
          background: `linear-gradient(135deg, ${NAVY} 0%, #127b8c 100%)`,
          color: "#fff",
          padding: "10px 12px",
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: "0.02em",
        }}
      >
        {index}. {rowTitle(tt, hopKey)}
      </div>
      <div style={{ padding: "10px 12px 8px", fontSize: 11, color: MUTED, lineHeight: 1.4 }}>
        {quadDescription(tt, hopKey)}
      </div>
      <div style={{ padding: "0 10px 4px" }}>
        <HopQuadrantTrack
          hopKey={hopKey}
          dxStr={p.dx}
          sxStr={p.sx}
          injuredSide={hb.injuredSide}
          tt={tt}
        />
      </div>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "8px 14px",
          padding: "8px 12px 12px",
          fontSize: 12,
          fontWeight: 600,
          color: "#0f172a",
        }}
      >
        <span style={{ color: DX_COLOR }}>
          DX: {formatMeasure(p.dx, isReps, tt)}
        </span>
        <span style={{ color: SX_COLOR }}>
          SX: {formatMeasure(p.sx, isReps, tt)}
        </span>
        {sogliaVal != null && Number.isFinite(sogliaVal) ? (
          <span style={{ color: THRESHOLD_ORANGE, fontWeight: 700 }}>
            {tt("tests.hopBattery.pdfSoglia90Label")}{" "}
            {isReps
              ? `${Math.round(sogliaVal)} ${tt("tests.hopBattery.unitRepsShort")}`
              : `${String(sogliaVal.toFixed(0)).replace(".", ",")} ${tt("tests.hopBattery.unitCm")}`}
          </span>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Report Hop Test Battery — layout 2×2 + sidebar LSI (estetica referto, colori PhysioCare).
 */
export default function HopBatteryReportCharts({
  test,
  tt,
  patient,
  session,
  sessionDate,
  districtLabel,
}) {
  const hb = ensureHopBatteryShape(test?.hopBattery);
  const injuredLabel =
    hb.injuredSide === "left"
      ? `${tt("evaluation.left")} (SX)`
      : hb.injuredSide === "right"
        ? `${tt("evaluation.right")} (DX)`
        : "—";
  const dominantLabel =
    hb.dominantSide === "left"
      ? `${tt("evaluation.left")} (SX)`
      : hb.dominantSide === "right"
        ? `${tt("evaluation.right")} (DX)`
        : tt("tests.hopBattery.pdfDominantPlaceholder");

  const dateStr =
    sessionDate || session?.data
      ? formatDateDMY(sessionDate || session.data)
      : "—";

  const rows = HOP_BATTERY_ROW_KEYS.map((key) => {
    const p = hb[key] || {};
    const lsi = hopLsiPercent(hb.injuredSide, p.dx, p.sx);
    const band = hopLsiBand(lsi);
    const colors = hopLsiBandColors(band);
    return { key, lsi, colors };
  });
  const meanLsi = meanHopLsi(rows.map((r) => r.lsi));
  const meanBand = hopLsiBand(meanLsi);
  const meanColors = hopLsiBandColors(meanBand);

  return (
    <div
      className="hop-battery-report hop-battery-pdf-report pdf-figure"
      style={{
        marginTop: 12,
        fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
        color: "#0f172a",
        maxWidth: "100%",
        boxSizing: "border-box",
        background: "linear-gradient(180deg, #f8fafc 0%, #fff 120px)",
        border: "1px solid #e2e8f0",
        borderRadius: 16,
        padding: "18px 20px 22px",
      }}
    >
      <div
        className="hop-battery-pdf-header pdf-avoid-break"
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 16,
          marginBottom: 20,
          paddingBottom: 16,
          borderBottom: "2px solid rgba(13,92,104,0.15)",
        }}
      >
        <div style={{ flex: "1 1 260px", minWidth: 0 }}>
          <div
            className="hop-brand-text-onscreen-only"
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: NAVY,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
            }}
          >
            Physiocare Nyon
          </div>
          <h2
            style={{
              margin: "6px 0 4px",
              fontSize: 26,
              fontWeight: 800,
              color: NAVY,
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
            }}
          >
            {tt("tests.hopBattery.pdfMainTitle")}
          </h2>
          <div style={{ fontSize: 13, color: MUTED, fontWeight: 500 }}>
            {tt("tests.hopBattery.pdfMainSubtitle")}
          </div>
        </div>
        <div
          style={{
            flex: "0 1 280px",
            display: "grid",
            gridTemplateColumns: "auto 1fr",
            gap: "6px 14px",
            fontSize: 11,
            lineHeight: 1.35,
            padding: "12px 14px",
            background: "#fff",
            borderRadius: 12,
            border: "1px solid #e2e8f0",
          }}
        >
          <span style={{ color: MUTED, fontWeight: 600 }}>
            {tt("tests.hopBattery.pdfPatient")}
          </span>
          <span style={{ fontWeight: 700 }}>
            {formatPatientListDisplayName(patient) || "—"}
          </span>
          <span style={{ color: MUTED, fontWeight: 600 }}>
            {tt("tests.hopBattery.pdfTestDate")}
          </span>
          <span>{dateStr}</span>
          {patient?.dataNascita ? (
            <>
              <span style={{ color: MUTED, fontWeight: 600 }}>
                {tt("patient.birthDate")}
              </span>
              <span>{formatDateDMY(patient.dataNascita)}</span>
            </>
          ) : null}
          <span style={{ color: MUTED, fontWeight: 600 }}>
            {tt("tests.hopBattery.pdfDominantSide")}
          </span>
          <span>{dominantLabel}</span>
          <span style={{ color: MUTED, fontWeight: 600 }}>
            {tt("tests.hopBattery.injuredSideLabel")}
          </span>
          <span>{injuredLabel}</span>
          <span style={{ color: MUTED, fontWeight: 600 }}>
            {tt("tests.hopBattery.pdfSportActivity")}
          </span>
          <span>{patientSportLine(patient, tt)}</span>
          {districtLabel ? (
            <>
              <span style={{ color: MUTED, fontWeight: 600 }}>
                {tt("evaluation.district")}
              </span>
              <span>{districtLabel}</span>
            </>
          ) : null}
          {session?.numeroTest != null && String(session.numeroTest).trim() !== "" ? (
            <>
              <span style={{ color: MUTED, fontWeight: 600 }}>
                {tt("testSession.cardHeading")}
              </span>
              <span>{session.numeroTest}</span>
            </>
          ) : null}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "flex-start",
          gap: 18,
        }}
      >
        <div style={{ flex: "1 1 480px", minWidth: 0 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: 14,
            }}
          >
            {HOP_BATTERY_ROW_KEYS.map((key, i) => (
              <HopQuadrant
                key={key}
                index={i + 1}
                hopKey={key}
                hb={hb}
                tt={tt}
              />
            ))}
          </div>
        </div>

        <aside
          className="hop-battery-sidebar pdf-avoid-break"
          style={{
            flex: "0 0 248px",
            width: "100%",
            maxWidth: 320,
            minWidth: 220,
            borderRadius: 14,
            border: "1px solid #e2e8f0",
            background: "#fff",
            padding: "14px 14px 16px",
            alignSelf: "stretch",
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 800,
              color: NAVY,
              marginBottom: 8,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            {tt("tests.hopBattery.pdfSidebarTitle")}
          </div>
          <p style={{ margin: "0 0 12px", fontSize: 10, color: MUTED, lineHeight: 1.45 }}>
            {tt("tests.hopBattery.pdfSidebarFormula")}
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {rows.map((r) => {
              const pct = formatHopLsiOneDecimal(r.lsi) ?? "—";
              return (
                <div
                  key={r.key}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 11,
                  }}
                >
                  <span style={{ color: "#334155", fontWeight: 600 }}>
                    {rowTitle(tt, r.key)}
                  </span>
                  <span
                    style={{
                      fontSize: 18,
                      fontWeight: 800,
                      fontVariantNumeric: "tabular-nums",
                      color: r.colors.fg,
                    }}
                  >
                    {pct}
                  </span>
                </div>
              );
            })}
          </div>
          {meanLsi != null ? (
            <div
              style={{
                marginTop: 14,
                padding: "12px 10px",
                borderRadius: 12,
                textAlign: "center",
                background: meanColors.bg,
                border: `1px solid ${meanColors.bar}44`,
              }}
            >
              <div style={{ fontSize: 10, fontWeight: 700, color: NAVY, marginBottom: 4 }}>
                {tt("tests.hopBattery.meanLsi")}
              </div>
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 800,
                  fontVariantNumeric: "tabular-nums",
                  color: meanColors.fg,
                }}
              >
                {formatHopLsiOneDecimal(meanLsi)}
              </div>
            </div>
          ) : null}

          <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: NAVY, marginBottom: 8 }}>
              {tt("tests.hopBattery.pdfLegendTitle")}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 9 }}>
              {[
                ["legendOptimal", "#22c55e"],
                ["legendGood", "#ca8a04"],
                ["legendAttention", "#ea580c"],
                ["legendDeficit", "#dc2626"],
              ].map(([msgKey, col]) => (
                <div key={msgKey} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 3,
                      background: col,
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ color: "#475569", lineHeight: 1.35 }}>
                    {tt(`tests.hopBattery.${msgKey}`)}
                  </span>
                </div>
              ))}
            </div>
            <p style={{ margin: "10px 0 0", fontSize: 9, color: MUTED, lineHeight: 1.4 }}>
              {tt("tests.hopBattery.pdfConsultNote")}
            </p>
          </div>
        </aside>
      </div>

      <div
        className="hop-battery-pdf-footer pdf-avoid-break"
        style={{
          marginTop: 20,
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: 10,
        }}
      >
        {[
          { key: "pdfFooterShield", accent: NAVY },
          { key: "pdfFooterClipboard", accent: DX_COLOR },
          { key: "pdfFooterHeart", accent: SX_COLOR },
        ].map((f) => (
          <div
            key={f.key}
            style={{
              padding: "10px 12px",
              borderRadius: 12,
              background: "#f1f5f9",
              border: "1px solid #e2e8f0",
              borderLeft: `3px solid ${f.accent}`,
              fontSize: 9,
              lineHeight: 1.45,
              color: "#334155",
            }}
          >
            {tt(`tests.hopBattery.${f.key}`)}
          </div>
        ))}
      </div>
    </div>
  );
}

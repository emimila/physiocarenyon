import {
  computeRowMetrics,
  formatDeg1,
  formatPct1,
} from "../../utils/isokineticCalculations";

/** Palette allineata a `IsokineticTestFields.jsx`. */
export const ISOKINETIC_STATUS_COLOR = {
  optimal: "#16a34a",
  acceptable: "#ca8a04",
  deficit: "#dc2626",
  critical: "#b91c1c",
  ok: "#16a34a",
  attention: "#ca8a04",
  warn: "#ea580c",
};

function lsiBarWidthPct(lsi) {
  if (lsi == null || !Number.isFinite(lsi)) return 0;
  return Math.min(100, Math.max(0, lsi));
}

export function isokineticHqComment(band, tt) {
  if (!band) return null;
  if (band === "low") return tt("tests.isokinetic.hqCommentLow");
  if (band === "high") return tt("tests.isokinetic.hqCommentHigh");
  if (band === "transition") return tt("tests.isokinetic.hqCommentTransition");
  return tt("tests.isokinetic.hqCommentExpected");
}

/** Barra LSI (stesso layout scheda / PDF). */
export function IsokineticLsiBar({ label, value, statusClass, tt }) {
  const C = ISOKINETIC_STATUS_COLOR;
  const w = lsiBarWidthPct(value);
  const color =
    statusClass === "optimal"
      ? C.optimal
      : statusClass === "acceptable"
        ? C.acceptable
        : statusClass === "deficit"
          ? C.deficit
          : "#94a3b8";
  const statusLabel =
    statusClass === "optimal"
      ? tt("tests.isokinetic.statusOptimal")
      : statusClass === "acceptable"
        ? tt("tests.isokinetic.statusAcceptable")
        : statusClass === "deficit"
          ? tt("tests.isokinetic.statusDeficit")
          : "—";
  return (
    <div style={{ marginBottom: 10 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 12,
          marginBottom: 4,
        }}
      >
        <span>{label}</span>
        <span style={{ fontWeight: 600 }}>
          {value != null && Number.isFinite(value) ? formatPct1(value) : "—"}{" "}
          <span style={{ color, fontSize: 11 }}>({statusLabel})</span>
        </span>
      </div>
      <div
        style={{
          height: 8,
          background: "#e2e8f0",
          borderRadius: 4,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${w}%`,
            height: "100%",
            background: color,
            transition: "width 0.2s",
          }}
        />
      </div>
    </div>
  );
}

/** Barra differenza angolo/ROM (stesso layout scheda / PDF). */
export function IsokineticDiffBar({ label, valueDeg, tt }) {
  const C = ISOKINETIC_STATUS_COLOR;
  const v = valueDeg;
  const isBad = v != null && Number.isFinite(v) && Math.abs(v) >= 10;
  const isMid =
    v != null && Number.isFinite(v) && Math.abs(v) >= 5 && Math.abs(v) < 10;
  const color = isBad ? C.critical : isMid ? C.attention : C.ok;
  const statusLabel = isBad
    ? tt("tests.isokinetic.statusCritical")
    : isMid
      ? tt("tests.isokinetic.statusAttention")
      : v != null && Number.isFinite(v)
        ? tt("tests.isokinetic.statusOk")
        : "—";
  const w =
    v != null && Number.isFinite(v)
      ? Math.min(100, (Math.abs(v) / 30) * 100)
      : 0;
  return (
    <div style={{ marginBottom: 10 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 12,
          marginBottom: 4,
        }}
      >
        <span>{label}</span>
        <span style={{ fontWeight: 600 }}>
          {formatDeg1(v) ?? "—"}{" "}
          <span style={{ color, fontSize: 11 }}>({statusLabel})</span>
        </span>
      </div>
      <div
        style={{
          height: 8,
          background: "#e2e8f0",
          borderRadius: 4,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${w}%`,
            height: "100%",
            background: color,
          }}
        />
      </div>
    </div>
  );
}

/** Allineati a `thTiny` / `tdTiny` in `IsokineticTestFields.jsx`. */
const thRefForm = {
  border: "1px solid #cbd5e1",
  padding: 4,
  textAlign: "left",
};

const tdRefForm = {
  border: "1px solid #cbd5e1",
  padding: 4,
};

/** Tabella valori di riferimento H/Q + elenco LSI — identica alla terza colonna scheda. */
export function IsokineticReferencePanel({ tt }) {
  return (
    <div
      style={{
        border: "1px solid #e2e8f0",
        borderRadius: 8,
        padding: 12,
        background: "#fafafa",
        fontSize: 11,
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 13 }}>
        {tt("tests.isokinetic.referenceTitle")}
      </div>
      <p style={{ margin: "0 0 8px", fontWeight: 600 }}>
        {tt("tests.isokinetic.hqRefTitle")}
      </p>
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 12 }}>
        <thead>
          <tr style={{ background: "#e2e8f0" }}>
            <th style={thRefForm}>°/s</th>
            <th style={thRefForm}>{tt("tests.isokinetic.hqLow")}</th>
            <th style={thRefForm}>{tt("tests.isokinetic.hqExpected")}</th>
            <th style={thRefForm}>{tt("tests.isokinetic.hqHigh")}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={tdRefForm}>60</td>
            <td style={tdRefForm}>&lt;55%</td>
            <td style={tdRefForm}>55–65%</td>
            <td style={tdRefForm}>&gt;70%</td>
          </tr>
          <tr>
            <td style={tdRefForm}>180</td>
            <td style={tdRefForm}>&lt;60%</td>
            <td style={tdRefForm}>60–75%</td>
            <td style={tdRefForm}>&gt;80%</td>
          </tr>
          <tr>
            <td style={tdRefForm}>300</td>
            <td style={tdRefForm}>&lt;65%</td>
            <td style={tdRefForm}>65–85%</td>
            <td style={tdRefForm}>&gt;90%</td>
          </tr>
        </tbody>
      </table>
      <p style={{ margin: "0 0 8px", fontWeight: 600 }}>
        {tt("tests.isokinetic.lsiRefTitle")}
      </p>
      <ul style={{ margin: 0, paddingLeft: 16, lineHeight: 1.45 }}>
        <li>{tt("tests.isokinetic.lsiRefOptimal")}</li>
        <li>{tt("tests.isokinetic.lsiRefAcceptable")}</li>
        <li>{tt("tests.isokinetic.lsiRefDeficit")}</li>
      </ul>
    </div>
  );
}

/** Elenco puntato «commento test selezionato» con pallini colorati. */
export function IsokineticCommentList({ injuredSide, sel, tt }) {
  const C = ISOKINETIC_STATUS_COLOR;
  if (!injuredSide) {
    return (
      <p style={{ margin: 0, fontSize: 12, color: "#94a3b8" }}>
        {tt("tests.isokinetic.needInjuredSide")}
      </p>
    );
  }
  if (!sel) {
    return <p style={{ margin: 0, fontSize: 12 }}>—</p>;
  }
  return (
    <ul
      style={{
        margin: 0,
        paddingLeft: 18,
        fontSize: 12,
        lineHeight: 1.5,
        color: "#334155",
      }}
    >
      <li style={{ marginBottom: 6 }}>
        <span
          style={{
            display: "inline-block",
            width: 8,
            height: 8,
            borderRadius: 999,
            background:
              sel.lsiExtClass === "optimal"
                ? C.optimal
                : sel.lsiExtClass === "acceptable"
                  ? C.acceptable
                  : C.deficit,
            marginRight: 6,
            verticalAlign: "middle",
          }}
        />
        <strong>{tt("tests.isokinetic.extensors")} (LSI):</strong>{" "}
        {formatPct1(sel.lsiExt) ?? "—"} —{" "}
        {sel.lsiExtClass === "optimal"
          ? tt("tests.isokinetic.lsiLineOptimal")
          : sel.lsiExtClass === "acceptable"
            ? tt("tests.isokinetic.lsiLineAcceptable")
            : tt("tests.isokinetic.lsiLineDeficit")}
      </li>
      <li style={{ marginBottom: 6 }}>
        <span
          style={{
            display: "inline-block",
            width: 8,
            height: 8,
            borderRadius: 999,
            background:
              sel.lsiFlexClass === "optimal"
                ? C.optimal
                : sel.lsiFlexClass === "acceptable"
                  ? C.acceptable
                  : C.deficit,
            marginRight: 6,
            verticalAlign: "middle",
          }}
        />
        <strong>{tt("tests.isokinetic.flexors")} (LSI):</strong>{" "}
        {formatPct1(sel.lsiFlex) ?? "—"} —{" "}
        {sel.lsiFlexClass === "optimal"
          ? tt("tests.isokinetic.lsiLineOptimal")
          : sel.lsiFlexClass === "acceptable"
            ? tt("tests.isokinetic.lsiLineAcceptable")
            : tt("tests.isokinetic.lsiLineDeficit")}
      </li>
      <li style={{ marginBottom: 6 }}>
        <span
          style={{
            display: "inline-block",
            width: 8,
            height: 8,
            borderRadius: 999,
            background:
              sel.hqBandInjured === "low" || sel.hqBandInjured === "high"
                ? C.attention
                : C.ok,
            marginRight: 6,
            verticalAlign: "middle",
          }}
        />
        <strong>H/Q ({tt("tests.isokinetic.injuredSideShort")}):</strong>{" "}
        {formatPct1(sel.hqInjured) ?? "—"} —{" "}
        {isokineticHqComment(sel.hqBandInjured, tt)}
      </li>
      <li style={{ marginBottom: 6 }}>
        <span
          style={{
            display: "inline-block",
            width: 8,
            height: 8,
            borderRadius: 999,
            background:
              sel.diffAngleExt != null && Math.abs(sel.diffAngleExt) >= 8
                ? C.attention
                : C.ok,
            marginRight: 6,
            verticalAlign: "middle",
          }}
        />
        <strong>{tt("tests.isokinetic.diffAngleExt")}:</strong>{" "}
        {formatDeg1(sel.diffAngleExt) ?? "—"}
      </li>
      <li style={{ marginBottom: 6 }}>
        <span
          style={{
            display: "inline-block",
            width: 8,
            height: 8,
            borderRadius: 999,
            background:
              sel.diffAngleFlex != null && Math.abs(sel.diffAngleFlex) >= 8
                ? C.attention
                : C.ok,
            marginRight: 6,
            verticalAlign: "middle",
          }}
        />
        <strong>{tt("tests.isokinetic.diffAngleFlex")}:</strong>{" "}
        {formatDeg1(sel.diffAngleFlex) ?? "—"}
      </li>
      <li>
        <span
          style={{
            display: "inline-block",
            width: 8,
            height: 8,
            borderRadius: 999,
            background:
              sel.diffRomExt != null && Math.abs(sel.diffRomExt) >= 5
                ? C.deficit
                : C.ok,
            marginRight: 6,
            verticalAlign: "middle",
          }}
        />
        <strong>{tt("tests.isokinetic.diffRomExt")}:</strong>{" "}
        {formatDeg1(sel.diffRomExt) ?? "—"}
      </li>
      <li style={{ marginTop: 6 }}>
        <span
          style={{
            display: "inline-block",
            width: 8,
            height: 8,
            borderRadius: 999,
            background:
              sel.diffRomFlex != null && Math.abs(sel.diffRomFlex) >= 5
                ? C.deficit
                : C.ok,
            marginRight: 6,
            verticalAlign: "middle",
          }}
        />
        <strong>{tt("tests.isokinetic.diffRomFlex")}:</strong>{" "}
        {formatDeg1(sel.diffRomFlex) ?? "—"}
      </li>
    </ul>
  );
}

/** Pannello confronto controlaterale (barre LSI + diff). */
export function IsokineticContralateralPanel({ injuredSide, sel, tt }) {
  if (!injuredSide || !sel) {
    return <p style={{ margin: 0, fontSize: 12, color: "#94a3b8" }}>—</p>;
  }
  return (
    <>
      <IsokineticLsiBar
        label={tt("tests.isokinetic.lsiExtShort")}
        value={sel.lsiExt}
        statusClass={sel.lsiExtClass}
        tt={tt}
      />
      <IsokineticLsiBar
        label={tt("tests.isokinetic.lsiFlexShort")}
        value={sel.lsiFlex}
        statusClass={sel.lsiFlexClass}
        tt={tt}
      />
      <IsokineticDiffBar
        label={tt("tests.isokinetic.diffAngleExt")}
        valueDeg={sel.diffAngleExt}
        tt={tt}
      />
      <IsokineticDiffBar
        label={tt("tests.isokinetic.diffAngleFlex")}
        valueDeg={sel.diffAngleFlex}
        tt={tt}
      />
      <IsokineticDiffBar
        label={tt("tests.isokinetic.diffRomExt")}
        valueDeg={sel.diffRomExt}
        tt={tt}
      />
      <IsokineticDiffBar
        label={tt("tests.isokinetic.diffRomFlex")}
        valueDeg={sel.diffRomFlex}
        tt={tt}
      />
    </>
  );
}

/** Metriche per la riga salvata come «focus» commento PDF (velocità °/s). */
export function metricsForClinicalFocusRow(isoRows, injuredSide, clinicalFocusSpeed) {
  const raw = Number(clinicalFocusSpeed);
  const speed = [60, 180, 300].includes(raw) ? raw : 60;
  const row = (isoRows || []).find((r) => Number(r.speed) === speed) || isoRows?.[0];
  if (!row) return { row: null, metrics: null, speed };
  return {
    row,
    metrics: computeRowMetrics(row, injuredSide),
    speed: Number(row.speed),
  };
}

import { useMemo, useState } from "react";
import Select from "../ui/Select";
import {
  ISOKINETIC_SPEEDS,
  computeRowMetrics,
  effectiveIsokineticBodyWeightKg,
  fixedRepsForSpeed,
  formatDeg1,
  formatPct1,
  formatTorquePerWeight,
  hqPercent,
  parseIsokineticNum,
  torquePerBodyWeightNmPerKg,
} from "../../utils/isokineticCalculations";
import { patientTrim } from "../../utils/helpers";
import Input from "../ui/Input";

const STATUS_COLOR = {
  optimal: "#16a34a",
  acceptable: "#ca8a04",
  deficit: "#dc2626",
  critical: "#b91c1c",
  ok: "#16a34a",
  attention: "#ca8a04",
  warn: "#ea580c",
};

/** Ordine colonne dati lato (condiviso con export PDF). */
export const ISOKINETIC_SIDE_TABLE_FIELDS = [
  "ptExt",
  "ptFlex",
  "anglePtExt",
  "anglePtFlex",
  "romExt",
  "romFlex",
  "workExt",
  "workFlex",
];

/** Chiavi i18n `tests.isokinetic.*` per intestazioni colonne. */
export const ISOKINETIC_FIELD_I18N = {
  ptExt: "coupleMaxExt",
  ptFlex: "coupleMaxFlex",
  anglePtExt: "angleCmExt",
  anglePtFlex: "angleCmFlex",
  romExt: "romExtShort",
  romFlex: "romFlexShort",
  workExt: "workTotalExt",
  workFlex: "workTotalFlex",
};

function normalizeIsokineticRow(existing, speed) {
  const ex = existing && Number(existing.speed) === speed ? existing : null;
  return {
    ...(ex || {}),
    speed,
    reps: fixedRepsForSpeed(speed),
    left: {
      ptExt: "",
      ptFlex: "",
      anglePtExt: "",
      anglePtFlex: "",
      romExt: "",
      romFlex: "",
      workExt: "",
      workFlex: "",
      ...(ex?.left || {}),
    },
    right: {
      ptExt: "",
      ptFlex: "",
      anglePtExt: "",
      anglePtFlex: "",
      romExt: "",
      romFlex: "",
      workExt: "",
      workFlex: "",
      ...(ex?.right || {}),
    },
  };
}

function ensureIsokineticShape(iso) {
  const wc = iso?.weightConfirmation;
  const weightConfirmation =
    wc === "chart" || wc === "manual" || wc === "pending" ? wc : "pending";
  return {
    injuredSide: iso?.injuredSide ?? "",
    weightConfirmation,
    manualWeightKg: iso?.manualWeightKg ?? "",
    bodyWeightKgUsed: iso?.bodyWeightKgUsed ?? "",
    rows: ISOKINETIC_SPEEDS.map((speed) => {
      const existing = (iso?.rows || []).find((r) => Number(r.speed) === speed);
      return normalizeIsokineticRow(existing, speed);
    }),
  };
}

function mergeIso(test, iso) {
  return { ...test, isokinetic: iso };
}

function sideCell(iso, rowIndex, side, field, value, setEvaluationForm, evaluationForm, distrettoId, testId) {
  const nextRows = iso.rows.map((row, i) =>
    i === rowIndex
      ? {
          ...row,
          [side]: { ...(row[side] || {}), [field]: value },
        }
      : row
  );
  setEvaluationForm({
    ...evaluationForm,
    distretti: evaluationForm.distretti.map((dist) =>
      dist.id === distrettoId
        ? {
            ...dist,
            tests: (dist.tests || []).map((t) =>
              t.id === testId ? mergeIso(t, { ...iso, rows: nextRows }) : t
            ),
          }
        : dist
    ),
  });
}

function lsiBarWidthPct(lsi) {
  if (lsi == null || !Number.isFinite(lsi)) return 0;
  return Math.min(100, Math.max(0, lsi));
}

function LsiBar({ label, value, statusClass, tt }) {
  const w = lsiBarWidthPct(value);
  const color =
    statusClass === "optimal"
      ? STATUS_COLOR.optimal
      : statusClass === "acceptable"
        ? STATUS_COLOR.acceptable
        : statusClass === "deficit"
          ? STATUS_COLOR.deficit
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

function DiffBar({ label, valueDeg, tt }) {
  const v = valueDeg;
  const isBad =
    v != null && Number.isFinite(v) && Math.abs(v) >= 10;
  const isMid =
    v != null && Number.isFinite(v) && Math.abs(v) >= 5 && Math.abs(v) < 10;
  const color = isBad
    ? STATUS_COLOR.critical
    : isMid
      ? STATUS_COLOR.attention
      : STATUS_COLOR.ok;
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

export default function IsokineticTestFields({
  tt,
  patient,
  distrettoId,
  test,
  evaluationForm,
  setEvaluationForm,
}) {
  const iso = useMemo(() => ensureIsokineticShape(test.isokinetic), [test.isokinetic]);
  const [selectedRow, setSelectedRow] = useState(0);

  const metricsByRow = useMemo(() => {
    return iso.rows.map((row) => computeRowMetrics(row, iso.injuredSide));
  }, [iso.rows, iso.injuredSide]);

  const bodyWeightKg = useMemo(
    () => effectiveIsokineticBodyWeightKg(patient, iso),
    [patient, iso]
  );

  const sel = metricsByRow[selectedRow];
  const selRow = iso.rows[selectedRow];

  const chartKgDisp = patientTrim(patient?.peso) || "—";

  function patchIso(partial) {
    setEvaluationForm({
      ...evaluationForm,
      distretti: evaluationForm.distretti.map((dist) =>
        dist.id === distrettoId
          ? {
              ...dist,
              tests: (dist.tests || []).map((t) =>
                t.id === test.id ? mergeIso(t, { ...iso, ...partial }) : t
              ),
            }
          : dist
      ),
    });
  }

  function setInjuredSide(v) {
    const cleared =
      !v
        ? {
            weightConfirmation: "pending",
            manualWeightKg: "",
            bodyWeightKgUsed: "",
          }
        : {};
    patchIso({ injuredSide: v, ...cleared });
  }

  function cellTorquePerKg(torqueStr) {
    const tq = parseIsokineticNum(torqueStr);
    const r = torquePerBodyWeightNmPerKg(tq, bodyWeightKg);
    return formatTorquePerWeight(r) ?? "—";
  }

  const hqComment = (band) => {
    if (!band) return null;
    if (band === "low") return tt("tests.isokinetic.hqCommentLow");
    if (band === "high") return tt("tests.isokinetic.hqCommentHigh");
    if (band === "transition") return tt("tests.isokinetic.hqCommentTransition");
    return tt("tests.isokinetic.hqCommentExpected");
  };

  return (
    <div className="isokinetic-test-fields" style={{ marginTop: 12 }}>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 16,
          alignItems: "flex-start",
          marginBottom: 14,
        }}
      >
        <div style={{ flex: "1 1 220px", maxWidth: 420, minWidth: 0 }}>
          <Select
            label={tt("tests.isokinetic.injuredSideQuestion")}
            value={iso.injuredSide}
            onChange={setInjuredSide}
            options={[
              { value: "", label: tt("tests.isokinetic.injuredSidePlaceholder") },
              {
                value: "left",
                label: `${tt("evaluation.left")} (SX)`,
              },
              {
                value: "right",
                label: `${tt("evaluation.right")} (DX)`,
              },
            ]}
          />
          <p style={{ margin: "6px 0 0", fontSize: 12, color: "#64748b" }}>
            {tt("tests.isokinetic.injuredSideHint")}
          </p>
        </div>

        {iso.injuredSide ? (
          <div
            style={{
              flex: "1 1 280px",
              maxWidth: 440,
              border: "1px solid #fde68a",
              borderRadius: 10,
              padding: "12px 14px",
              background: "#fffbeb",
              minWidth: 0,
            }}
          >
            <div
              style={{
                fontWeight: 700,
                fontSize: 12,
                color: "#92400e",
                marginBottom: 8,
              }}
            >
              {iso.injuredSide === "left"
                ? `${tt("evaluation.left")} (SX)`
                : `${tt("evaluation.right")} (DX)`}{" "}
              · {tt("tests.isokinetic.weightPanelTitle")}
            </div>

            {iso.weightConfirmation === "pending" ? (
              <>
                <p style={{ margin: "0 0 10px", fontSize: 12, color: "#78350f" }}>
                  {tt("tests.isokinetic.weightConfirmQuestion").replace(
                    "{kg}",
                    chartKgDisp
                  )}
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  <button
                    type="button"
                    style={{ padding: "6px 12px", fontSize: 12 }}
                    onClick={() => patchIso({ weightConfirmation: "chart" })}
                  >
                    {tt("tests.isokinetic.weightConfirmYes")}
                  </button>
                  <button
                    type="button"
                    style={{ padding: "6px 12px", fontSize: 12 }}
                    onClick={() =>
                      patchIso({
                        weightConfirmation: "manual",
                        manualWeightKg: patientTrim(patient?.peso) || "",
                      })
                    }
                  >
                    {tt("tests.isokinetic.weightConfirmNo")}
                  </button>
                </div>
              </>
            ) : null}

            {iso.weightConfirmation === "chart" ? (
              <div>
                <p style={{ margin: "0 0 8px", fontSize: 12, color: "#78350f" }}>
                  {tt("tests.isokinetic.weightStatusChart").replace(
                    "{kg}",
                    chartKgDisp === "—" ? "—" : chartKgDisp
                  )}
                </p>
                <button
                  type="button"
                  style={{ padding: "6px 12px", fontSize: 12 }}
                  onClick={() =>
                    patchIso({
                      weightConfirmation: "manual",
                      manualWeightKg: patientTrim(patient?.peso) || "",
                    })
                  }
                >
                  {tt("tests.isokinetic.weightEditButton")}
                </button>
              </div>
            ) : null}

            {iso.weightConfirmation === "manual" ? (
              <div>
                <Input
                  label={tt("tests.isokinetic.weightManualLabel")}
                  type="text"
                  value={iso.manualWeightKg ?? ""}
                  onChange={(v) =>
                    patchIso({ weightConfirmation: "manual", manualWeightKg: v })
                  }
                />
                <p style={{ margin: "6px 0 0", fontSize: 11, color: "#92400e" }}>
                  {tt("tests.isokinetic.weightManualHint")}
                </p>
              </div>
            ) : null}

            {iso.weightConfirmation !== "pending" &&
            bodyWeightKg != null &&
            Number.isFinite(bodyWeightKg) &&
            bodyWeightKg > 0 ? (
              <p
                style={{
                  margin: "10px 0 0",
                  fontSize: 11,
                  color: "#57534e",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {tt("tests.isokinetic.cmPerKgUsingWeight").replace(
                  "{kg}",
                  String(bodyWeightKg)
                )}
              </p>
            ) : iso.weightConfirmation !== "pending" ? (
              <p style={{ margin: "10px 0 0", fontSize: 11, color: "#b45309" }}>
                {tt("tests.isokinetic.weightNeedValidKg")}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      <h4 style={{ margin: "16px 0 8px", fontSize: "1rem" }}>
        {tt("tests.isokinetic.dataTitle")}
      </h4>
      <div className="isokinetic-data-three-columns" style={{ marginBottom: 8 }}>
        {[
          {
            key: "right",
            title: tt("tests.isokinetic.blockRight"),
            side: "right",
          },
          {
            key: "left",
            title: tt("tests.isokinetic.blockLeft"),
            side: "left",
          },
        ].map((block) => (
          <div
            key={block.key}
            style={{
              border: "1px solid #e2e8f0",
              borderRadius: 10,
              padding: "10px 12px",
              background: "#fff",
              minWidth: 0,
            }}
          >
            <div
              style={{
                fontWeight: 700,
                marginBottom: 8,
                fontSize: 13,
                color: "#0f172a",
              }}
            >
              {block.title}
            </div>
            <div style={{ overflowX: "auto" }}>
              <table
                className="isokinetic-side-table"
                style={{
                  borderCollapse: "collapse",
                  fontSize: 11,
                  width: "100%",
                  tableLayout: "fixed",
                }}
              >
                <colgroup>
                  <col style={{ width: "3.5rem" }} />
                  <col style={{ width: "2.75rem" }} />
                  <col style={{ width: "2rem" }} />
                  <col />
                  <col />
                  <col />
                  <col />
                  <col />
                  <col />
                  <col />
                  <col />
                </colgroup>
                <thead>
                  <tr style={{ background: "#f1f5f9" }}>
                    <th
                      title={tt("tests.isokinetic.speed")}
                      style={{ ...th, ...thCompact }}
                    >
                      {tt("tests.isokinetic.speedColumnShort")}
                    </th>
                    <th
                      title={tt("tests.isokinetic.contraction")}
                      style={{ ...th, ...thCompact }}
                    >
                      {tt("tests.isokinetic.contractionColumnShort")}
                    </th>
                    <th
                      title={tt("tests.isokinetic.reps")}
                      style={{ ...th, ...thCompact }}
                    >
                      {tt("tests.isokinetic.repsColumnShort")}
                    </th>
                    {ISOKINETIC_SIDE_TABLE_FIELDS.map((field) => (
                      <th key={field} style={thSmall}>
                        {tt(`tests.isokinetic.${ISOKINETIC_FIELD_I18N[field]}`)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {iso.rows.map((row, ri) => {
                    const selected = ri === selectedRow;
                    return (
                      <tr
                        key={`${block.key}-${row.speed}`}
                        onClick={() => setSelectedRow(ri)}
                        style={{
                          background: selected ? "#e0f2fe" : undefined,
                          cursor: "pointer",
                        }}
                      >
                        <td
                          style={{ ...td, ...tdCompactMeta }}
                          title={tt("tests.isokinetic.speed")}
                        >
                          {row.speed}°/s
                        </td>
                        <td
                          style={{ ...td, ...tdCompactMeta }}
                          title={tt("tests.isokinetic.concentric")}
                        >
                          {tt("tests.isokinetic.concentricAbbrev")}
                        </td>
                        <td
                          style={tdRepN}
                          title={tt("tests.isokinetic.reps")}
                        >
                          {fixedRepsForSpeed(row.speed)}
                        </td>
                        {ISOKINETIC_SIDE_TABLE_FIELDS.map((field) => (
                          <td key={field} style={tdTight}>
                            <input
                              type="text"
                              inputMode="decimal"
                              value={row[block.side]?.[field] ?? ""}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) =>
                                sideCell(
                                  iso,
                                  ri,
                                  block.side,
                                  field,
                                  e.target.value,
                                  setEvaluationForm,
                                  evaluationForm,
                                  distrettoId,
                                  test.id
                                )
                              }
                              style={inputStyle}
                            />
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}

        <div
          style={{
            border: "1px solid #e2e8f0",
            borderRadius: 10,
            padding: "10px 12px",
            background: "#f8fafc",
            minWidth: 0,
          }}
        >
          <div
            style={{
              fontWeight: 700,
              marginBottom: 8,
              fontSize: 13,
              color: "#0f172a",
            }}
          >
            {tt("tests.isokinetic.blockAuto")}
          </div>
          <div style={{ overflowX: "auto" }}>
            <table
              className="isokinetic-calc-table"
              style={{
                borderCollapse: "collapse",
                fontSize: 11,
                width: "100%",
                maxWidth: "920px",
                tableLayout: "fixed",
              }}
            >
              <colgroup>
                <col style={{ width: "3.25rem" }} />
                <col />
                <col />
                <col />
                <col />
                <col />
                <col />
                <col />
                <col />
              </colgroup>
              <thead>
                <tr style={{ background: "#e2e8f0" }}>
                  <th
                    title={tt("tests.isokinetic.speed")}
                    style={{ ...th, ...thCompact }}
                  >
                    {tt("tests.isokinetic.speedColumnShort")}
                  </th>
                  <th style={thSmall}>{tt("tests.isokinetic.hqRightShort")}</th>
                  <th style={thSmall}>{tt("tests.isokinetic.hqLeftShort")}</th>
                  <th style={thSmall}>{tt("tests.isokinetic.lsiExtShort")}</th>
                  <th style={thSmall}>{tt("tests.isokinetic.lsiFlexShort")}</th>
                  <th style={thSmall} title={tt("tests.isokinetic.cmPerKgRightExtHint")}>
                    {tt("tests.isokinetic.cmPerKgRightExtShort")}
                  </th>
                  <th style={thSmall} title={tt("tests.isokinetic.cmPerKgRightFlexHint")}>
                    {tt("tests.isokinetic.cmPerKgRightFlexShort")}
                  </th>
                  <th style={thSmall} title={tt("tests.isokinetic.cmPerKgLeftExtHint")}>
                    {tt("tests.isokinetic.cmPerKgLeftExtShort")}
                  </th>
                  <th style={thSmall} title={tt("tests.isokinetic.cmPerKgLeftFlexHint")}>
                    {tt("tests.isokinetic.cmPerKgLeftFlexShort")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {iso.rows.map((row, ri) => {
                  const m = metricsByRow[ri];
                  const selected = ri === selectedRow;
                  return (
                    <tr
                      key={`calc-${row.speed}`}
                      onClick={() => setSelectedRow(ri)}
                      style={{
                        background: selected ? "#e0f2fe" : undefined,
                        cursor: "pointer",
                      }}
                    >
                      <td style={{ ...td, ...tdCompactMeta }}>{row.speed}°/s</td>
                      <td style={tdMono}>
                        {formatPct1(
                          hqPercent(
                            parseIsokineticNum(row.right?.ptFlex),
                            parseIsokineticNum(row.right?.ptExt)
                          )
                        ) ?? "—"}
                      </td>
                      <td style={tdMono}>
                        {formatPct1(
                          hqPercent(
                            parseIsokineticNum(row.left?.ptFlex),
                            parseIsokineticNum(row.left?.ptExt)
                          )
                        ) ?? "—"}
                      </td>
                      <td style={tdMono}>
                        {iso.injuredSide ? formatPct1(m?.lsiExt) ?? "—" : "—"}
                      </td>
                      <td style={tdMono}>
                        {iso.injuredSide ? formatPct1(m?.lsiFlex) ?? "—" : "—"}
                      </td>
                      <td style={tdMono}>{cellTorquePerKg(row.right?.ptExt)}</td>
                      <td style={tdMono}>{cellTorquePerKg(row.right?.ptFlex)}</td>
                      <td style={tdMono}>{cellTorquePerKg(row.left?.ptExt)}</td>
                      <td style={tdMono}>{cellTorquePerKg(row.left?.ptFlex)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <p style={{ fontSize: 11, color: "#64748b", marginBottom: 16 }}>
        {tt("tests.isokinetic.selectRowHint")}
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 16,
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
              ({selRow?.speed}°/s)
            </span>
          </div>
          {!iso.injuredSide ? (
            <p style={{ margin: 0, fontSize: 12, color: "#94a3b8" }}>
              {tt("tests.isokinetic.needInjuredSide")}
            </p>
          ) : !sel ? (
            <p style={{ margin: 0, fontSize: 12 }}>—</p>
          ) : (
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
                        ? STATUS_COLOR.optimal
                        : sel.lsiExtClass === "acceptable"
                          ? STATUS_COLOR.acceptable
                          : STATUS_COLOR.deficit,
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
                        ? STATUS_COLOR.optimal
                        : sel.lsiFlexClass === "acceptable"
                          ? STATUS_COLOR.acceptable
                          : STATUS_COLOR.deficit,
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
                        ? STATUS_COLOR.attention
                        : STATUS_COLOR.ok,
                    marginRight: 6,
                    verticalAlign: "middle",
                  }}
                />
                <strong>H/Q ({tt("tests.isokinetic.injuredSideShort")}):</strong>{" "}
                {formatPct1(sel.hqInjured) ?? "—"} — {hqComment(sel.hqBandInjured)}
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
                        ? STATUS_COLOR.attention
                        : STATUS_COLOR.ok,
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
                        ? STATUS_COLOR.attention
                        : STATUS_COLOR.ok,
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
                        ? STATUS_COLOR.deficit
                        : STATUS_COLOR.ok,
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
                        ? STATUS_COLOR.deficit
                        : STATUS_COLOR.ok,
                    marginRight: 6,
                    verticalAlign: "middle",
                  }}
                />
                <strong>{tt("tests.isokinetic.diffRomFlex")}:</strong>{" "}
                {formatDeg1(sel.diffRomFlex) ?? "—"}
              </li>
            </ul>
          )}
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
          {!iso.injuredSide || !sel ? (
            <p style={{ margin: 0, fontSize: 12, color: "#94a3b8" }}>—</p>
          ) : (
            <>
              <LsiBar
                label={tt("tests.isokinetic.lsiExtShort")}
                value={sel.lsiExt}
                statusClass={sel.lsiExtClass}
                tt={tt}
              />
              <LsiBar
                label={tt("tests.isokinetic.lsiFlexShort")}
                value={sel.lsiFlex}
                statusClass={sel.lsiFlexClass}
                tt={tt}
              />
              <DiffBar
                label={tt("tests.isokinetic.diffAngleExt")}
                valueDeg={sel.diffAngleExt}
                tt={tt}
              />
              <DiffBar
                label={tt("tests.isokinetic.diffAngleFlex")}
                valueDeg={sel.diffAngleFlex}
                tt={tt}
              />
              <DiffBar
                label={tt("tests.isokinetic.diffRomExt")}
                valueDeg={sel.diffRomExt}
                tt={tt}
              />
              <DiffBar
                label={tt("tests.isokinetic.diffRomFlex")}
                valueDeg={sel.diffRomFlex}
                tt={tt}
              />
            </>
          )}
        </div>

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
                <th style={thTiny}>°/s</th>
                <th style={thTiny}>{tt("tests.isokinetic.hqLow")}</th>
                <th style={thTiny}>{tt("tests.isokinetic.hqExpected")}</th>
                <th style={thTiny}>{tt("tests.isokinetic.hqHigh")}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={tdTiny}>60</td>
                <td style={tdTiny}>&lt;55%</td>
                <td style={tdTiny}>55–65%</td>
                <td style={tdTiny}>&gt;70%</td>
              </tr>
              <tr>
                <td style={tdTiny}>180</td>
                <td style={tdTiny}>&lt;60%</td>
                <td style={tdTiny}>60–75%</td>
                <td style={tdTiny}>&gt;80%</td>
              </tr>
              <tr>
                <td style={tdTiny}>300</td>
                <td style={tdTiny}>&lt;65%</td>
                <td style={tdTiny}>65–85%</td>
                <td style={tdTiny}>&gt;90%</td>
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
      </div>
    </div>
  );
}

const th = {
  border: "1px solid #cbd5e1",
  padding: "6px 4px",
  fontSize: 10,
  fontWeight: 600,
};
const thCompact = {
  padding: "4px 2px",
  fontSize: 9,
  whiteSpace: "nowrap",
  lineHeight: 1.2,
};
const thSmall = {
  border: "1px solid #cbd5e1",
  padding: "4px 2px",
  fontSize: 9,
  fontWeight: 600,
};
const tdCompactMeta = {
  padding: "3px 2px",
  fontSize: 10,
  whiteSpace: "nowrap",
};
const tdRepN = {
  border: "1px solid #cbd5e1",
  padding: "2px 1px",
  textAlign: "center",
  verticalAlign: "middle",
  fontWeight: 700,
  fontSize: 11,
  color: "#334155",
  fontVariantNumeric: "tabular-nums",
  lineHeight: 1.2,
};
const thTiny = {
  border: "1px solid #cbd5e1",
  padding: 4,
  textAlign: "left",
};
const td = {
  border: "1px solid #cbd5e1",
  padding: 4,
  textAlign: "center",
  verticalAlign: "middle",
};
const tdTight = {
  border: "1px solid #cbd5e1",
  padding: 2,
};
const tdMono = {
  ...td,
  fontFamily: "ui-monospace, monospace",
  fontSize: 10,
};
const inputStyle = {
  width: "100%",
  minWidth: 0,
  boxSizing: "border-box",
  fontSize: 11,
  padding: "2px 4px",
};
const tdTiny = { border: "1px solid #cbd5e1", padding: 4 };

import { useMemo } from "react";
import Select from "../ui/Select";
import {
  ISOKINETIC_SPEEDS,
  computeRowMetrics,
  effectiveIsokineticBodyWeightKg,
  ensureIsokineticShape,
  fixedRepsForSpeed,
  formatPct1,
  formatTorquePerWeight,
  hqPercent,
  normalizeIsokineticRowsForReport,
  parseIsokineticNum,
  torquePerBodyWeightNmPerKg,
} from "../../utils/isokineticCalculations";
import IsokineticMaxTorqueGridChart from "./IsokineticMaxTorqueGridChart";
import {
  IsokineticCommentList,
  IsokineticContralateralPanel,
  IsokineticReferencePanel,
} from "./IsokineticClinicalPanels";
import { patientTrim } from "../../utils/helpers";
import Input from "../ui/Input";
import UseOperatedSideRecall from "./UseOperatedSideRecall";
import EasytechIsokineticImportPanel from "./EasytechIsokineticImportPanel";
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

function clinicalFocusRowIndex(isoLike) {
  const rows = isoLike?.rows || [];
  const raw = Number(isoLike?.clinicalFocusSpeed);
  const speed = [60, 180, 300].includes(raw) ? raw : 60;
  const i = rows.findIndex((r) => Number(r.speed) === speed);
  return i >= 0 ? i : 0;
}

function mergeIso(test, iso) {
  return { ...test, isokinetic: iso };
}

function applyEasytechPatchToIso(iso0, patch) {
  const iso = ensureIsokineticShape(iso0);
  const speed = Number(patch.speed);
  if (!Number.isFinite(speed)) return iso;
  const rows = iso.rows.map((row) => {
    if (Number(row.speed) !== speed) return row;
    const next = { ...row };
    if (patch.right && typeof patch.right === "object") {
      next.right = { ...(row.right || {}), ...patch.right };
    }
    if (patch.left && typeof patch.left === "object") {
      next.left = { ...(row.left || {}), ...patch.left };
    }
    return next;
  });
  let outIso = { ...iso, rows };
  if (
    speed === 60 &&
    patch.easytechPdfCharts60 &&
    typeof patch.easytechPdfCharts60 === "object" &&
    Number(patch.easytechPdfCharts60.version) === 1 &&
    Array.isArray(patch.easytechPdfCharts60.images) &&
    patch.easytechPdfCharts60.images.length
  ) {
    const images = patch.easytechPdfCharts60.images.filter(
      (im) =>
        im &&
        typeof im.dataUrl === "string" &&
        im.dataUrl.startsWith("data:") &&
        Number(im.nativeW) > 0 &&
        Number(im.nativeH) > 0
    );
    if (images.length) {
      outIso = { ...outIso, easytechPdfCharts60: { version: 1, images } };
    }
  }
  return outIso;
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

export default function IsokineticTestFields({
  tt,
  patient,
  distrettoId,
  test,
  evaluationForm,
  setEvaluationForm,
}) {
  const iso = useMemo(() => ensureIsokineticShape(test.isokinetic), [test.isokinetic]);
  const selectedRow = clinicalFocusRowIndex(iso);

  const metricsByRow = useMemo(() => {
    return iso.rows.map((row) => computeRowMetrics(row, iso.injuredSide));
  }, [iso.rows, iso.injuredSide]);

  const chartRows = useMemo(
    () => normalizeIsokineticRowsForReport(iso),
    [iso]
  );

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

  function applyEasytechImportPatch(payload) {
    const patches = Array.isArray(payload?.patches)
      ? payload.patches
      : payload &&
          typeof payload === "object" &&
          (payload.speed != null || payload.right != null || payload.left != null)
        ? [payload]
        : [];
    if (patches.length === 0) return;
    let nextIso = iso;
    for (const p of patches) {
      nextIso = applyEasytechPatchToIso(nextIso, p);
    }
    const partial = { rows: nextIso.rows };
    if (nextIso.easytechPdfCharts60?.images?.length) {
      partial.easytechPdfCharts60 = nextIso.easytechPdfCharts60;
    }
    patchIso(partial);
  }

  function selectRow(ri) {
    const r = iso.rows[ri];
    if (!r) return;
    const s = Number(r.speed);
    if ([60, 180, 300].includes(s)) {
      patchIso({ clinicalFocusSpeed: s });
    }
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

  return (
    <div className="isokinetic-test-fields" style={{ marginTop: 12 }}>
      <EasytechIsokineticImportPanel
        tt={tt}
        iso={iso}
        onApplyPatch={applyEasytechImportPatch}
      />
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
          <UseOperatedSideRecall
            tt={tt}
            patient={patient}
            currentSide={iso.injuredSide}
            onPick={setInjuredSide}
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
      <p
        className="isokinetic-table-measures-legend"
        style={{
          margin: "0 0 10px",
          fontSize: 12,
          lineHeight: 1.45,
          color: "#475569",
          padding: "8px 10px",
          background: "#f8fafc",
          borderRadius: 8,
          border: "1px solid #e2e8f0",
        }}
      >
        {tt("tests.isokinetic.tableMeasuresLegend")}
      </p>
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
                        onClick={() => selectRow(ri)}
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
                      onClick={() => selectRow(ri)}
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
            gridColumn: "1 / -1",
            width: "100%",
            minWidth: 0,
            border: "1px solid #cbd5e1",
            borderRadius: 10,
            padding: "14px 16px 16px",
            background: "#fff",
            boxSizing: "border-box",
          }}
        >
          <IsokineticMaxTorqueGridChart rows={chartRows} tt={tt} variant="form" />
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
            {tt("tests.isokinetic.commentSelected")}{" "}
            <span style={{ color: "#64748b", fontWeight: 500 }}>
              ({selRow?.speed}°/s)
            </span>
          </div>
          <IsokineticCommentList
            injuredSide={iso.injuredSide}
            sel={sel}
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
            injuredSide={iso.injuredSide}
            sel={sel}
            tt={tt}
          />
        </div>

        <IsokineticReferencePanel tt={tt} />
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

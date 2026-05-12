import { useRef, useState } from "react";
import Select from "../ui/Select";
import Input from "../ui/Input";
import HopBatteryReportCharts from "../tests/HopBatteryReportCharts";
import HopBatteryTestPdfReport from "../tests/HopBatteryTestPdfReport";
import {
  ensureHopBatteryShape,
  formatHopLsiOneDecimal,
  hopLsiPercent,
  meanHopLsi,
  parseHopNum,
} from "../../utils/hopBatteryCalculations";
import { exportHtmlToPdf } from "../../utils/exportHtmlToPdf";
import UseOperatedSideRecall from "./UseOperatedSideRecall";

const SUB_KEYS = [
  { key: "tripleHop", i18n: "tripleHop" },
  { key: "singleHop", i18n: "singleHop" },
  { key: "sideHop", i18n: "sideHop" },
  { key: "crossoverHop", i18n: "crossoverHop" },
];

function safeFilenamePart(s) {
  return String(s ?? "").replace(/[^\w.-]+/g, "_");
}

function hopBatteryHasAnyData(hb) {
  return SUB_KEYS.some(({ key }) => {
    const p = hb[key] || {};
    return Number.isFinite(parseHopNum(p.dx)) || Number.isFinite(parseHopNum(p.sx));
  });
}

function updateHopBattery(setEvaluationForm, distrettoId, testId, patch) {
  setEvaluationForm((prev) => ({
    ...prev,
    distretti: prev.distretti.map((dist) =>
      dist.id === distrettoId
        ? {
            ...dist,
            tests: (dist.tests || []).map((t) => {
              if (t.id !== testId) return t;
              const cur = ensureHopBatteryShape(t.hopBattery);
              return { ...t, hopBattery: { ...cur, ...patch } };
            }),
          }
        : dist
    ),
  }));
}

function updatePair(
  setEvaluationForm,
  distrettoId,
  testId,
  subKey,
  side,
  value
) {
  setEvaluationForm((prev) => ({
    ...prev,
    distretti: prev.distretti.map((dist) =>
      dist.id === distrettoId
        ? {
            ...dist,
            tests: (dist.tests || []).map((t) => {
              if (t.id !== testId) return t;
              const cur = ensureHopBatteryShape(t.hopBattery);
              const pair = { ...(cur[subKey] || {}), [side]: value };
              return { ...t, hopBattery: { ...cur, [subKey]: pair } };
            }),
          }
        : dist
    ),
  }));
}

export default function HopBatteryTestFields({
  tt,
  distrettoId,
  test,
  setEvaluationForm,
  patient,
  sessionDate,
  numeroTest,
  districtLabel,
}) {
  const hb = ensureHopBatteryShape(test.hopBattery);

  const sideOptions = (placeholderKey) => [
    { value: "", label: tt(placeholderKey) },
    { value: "right", label: tt("tests.hopBattery.injuredRight") },
    { value: "left", label: tt("tests.hopBattery.injuredLeft") },
  ];
  const injuredOptions = sideOptions("tests.hopBattery.injuredSidePlaceholder");
  const dominantOptions = sideOptions("tests.hopBattery.dominantSidePlaceholder");

  const lsies = SUB_KEYS.map(({ key }) =>
    hopLsiPercent(hb.injuredSide, hb[key]?.dx, hb[key]?.sx)
  );
  const meanLsi = meanHopLsi(lsies);

  const pdfRef = useRef(null);
  const [isExportingHopPdf, setIsExportingHopPdf] = useState(false);
  const hopHasData = hopBatteryHasAnyData(hb);

  async function handleExportHopPdf() {
    const el = pdfRef.current;
    if (!el || !hopHasData) return;
    setIsExportingHopPdf(true);
    try {
      await new Promise((r) => requestAnimationFrame(() => r()));
      await new Promise((r) => setTimeout(r, 200));
      const filename = `Test_HopBattery_${safeFilenamePart(
        patient?.nome
      )}_${safeFilenamePart(patient?.cognome)}_${safeFilenamePart(
        sessionDate
      )}.pdf`;
      await exportHtmlToPdf(el, { filename });
    } catch (e) {
      console.error(e);
      alert(tt("patient.testCharts.saveTestPdfError"));
    } finally {
      setIsExportingHopPdf(false);
    }
  }

  return (
    <div className="hop-battery-test-fields" style={{ marginTop: 8 }}>
      <div
        className="no-pdf"
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <button
          type="button"
          disabled={isExportingHopPdf || !hopHasData}
          onClick={handleExportHopPdf}
          title={
            hopHasData
              ? undefined
              : tt("tests.hopBattery.hopPdfNoData")
          }
        >
          {isExportingHopPdf
            ? tt("common.loading", "…")
            : tt("tests.hopBattery.hopExportPdf")}
        </button>
        {!hopHasData ? (
          <span style={{ fontSize: 12, color: "#64748b" }}>
            {tt("tests.hopBattery.hopPdfNoData")}
          </span>
        ) : null}
      </div>

      <p
        style={{
          margin: "0 0 12px",
          fontSize: 12,
          lineHeight: 1.45,
          color: "#475569",
        }}
      >
        {tt("tests.hopBattery.intro")}
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          gap: 14,
          maxWidth: 720,
          marginBottom: 16,
        }}
      >
        <Select
          label={tt("tests.hopBattery.dominantSideLabel")}
          value={hb.dominantSide ?? ""}
          onChange={(v) =>
            updateHopBattery(setEvaluationForm, distrettoId, test.id, {
              dominantSide: v,
            })
          }
          options={dominantOptions}
        />
        <div>
          <Select
            label={tt("tests.hopBattery.injuredSideLabel")}
            value={hb.injuredSide}
            onChange={(v) =>
              updateHopBattery(setEvaluationForm, distrettoId, test.id, {
                injuredSide: v,
              })
            }
            options={injuredOptions}
          />
          <UseOperatedSideRecall
            tt={tt}
            patient={patient}
            currentSide={hb.injuredSide}
            onPick={(v) =>
              updateHopBattery(setEvaluationForm, distrettoId, test.id, {
                injuredSide: v,
              })
            }
          />
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gap: 14,
        }}
      >
        {SUB_KEYS.map(({ key, i18n }) => {
          const pair = hb[key] || {};
          const isSideHop = key === "sideHop";
          const unitLabel = isSideHop
            ? tt("tests.hopBattery.unitReps")
            : tt("tests.hopBattery.unitCm");
          const lsi = hopLsiPercent(hb.injuredSide, pair.dx, pair.sx);
          return (
            <div
              key={key}
              style={{
                border: "1px solid #e2e8f0",
                borderRadius: 10,
                padding: "12px 14px",
                background: "#fff",
              }}
            >
              <div
                style={{
                  fontWeight: 700,
                  fontSize: 13,
                  color: "#0f172a",
                  marginBottom: 8,
                }}
              >
                {tt(`tests.hopBattery.${i18n}`)}
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 10,
                }}
              >
                <Input
                  label={`${tt("evaluation.right")} (DX) — ${unitLabel}`}
                  type="text"
                  inputMode="decimal"
                  value={pair.dx ?? ""}
                  onChange={(v) =>
                    updatePair(
                      setEvaluationForm,
                      distrettoId,
                      test.id,
                      key,
                      "dx",
                      v
                    )
                  }
                />
                <Input
                  label={`${tt("evaluation.left")} (SX) — ${unitLabel}`}
                  type="text"
                  inputMode="decimal"
                  value={pair.sx ?? ""}
                  onChange={(v) =>
                    updatePair(
                      setEvaluationForm,
                      distrettoId,
                      test.id,
                      key,
                      "sx",
                      v
                    )
                  }
                />
              </div>
              {hb.injuredSide && lsi != null ? (
                <p
                  style={{
                    margin: "10px 0 0",
                    fontSize: 12,
                    color: "#334155",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {tt("tests.hopBattery.lsiLabel")}:{" "}
                  <strong>{formatHopLsiOneDecimal(lsi)}</strong>
                </p>
              ) : null}
            </div>
          );
        })}
      </div>

      {hb.injuredSide && meanLsi != null ? (
        <p
          style={{
            marginTop: 14,
            padding: "10px 12px",
            background: "#f1f5f9",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            color: "#0f172a",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {tt("tests.hopBattery.meanLsi")}:{" "}
          {formatHopLsiOneDecimal(meanLsi)}
        </p>
      ) : null}

      <div
        style={{
          marginTop: 20,
          paddingTop: 16,
          borderTop: "1px solid #e2e8f0",
        }}
      >
        <HopBatteryReportCharts
          test={test}
          tt={tt}
          patient={patient}
          session={{
            data: sessionDate,
            numeroTest: numeroTest ?? "",
          }}
          sessionDate={sessionDate}
          districtLabel={districtLabel}
        />
      </div>

      <div
        aria-hidden="true"
        className="no-pdf"
        style={{
          position: "fixed",
          left: -10000,
          top: 0,
          width: 794,
          pointerEvents: "none",
        }}
      >
        <div
          ref={pdfRef}
          className={`pdf-root ${isExportingHopPdf ? "pdf-exporting" : ""}`}
        >
          <HopBatteryTestPdfReport
            patient={patient}
            session={{
              data: sessionDate,
              numeroTest: numeroTest ?? "",
            }}
            test={test}
            districtLabel={districtLabel}
            tt={tt}
          />
        </div>
      </div>
    </div>
  );
}

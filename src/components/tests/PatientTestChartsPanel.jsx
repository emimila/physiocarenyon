import { useEffect, useMemo, useRef, useState } from "react";
import Select from "../ui/Select";
import { distrettoActiveTests } from "../../utils/sanitizeEvaluation";
import { exportHtmlToPdf } from "../../utils/exportHtmlToPdf";
import YBalanceTestReportCharts from "./YBalanceTestReportCharts";

const CHART_Y_BALANCE = "y_balance";

function safeFilenamePart(s) {
  return String(s ?? "").replace(/[^\w.-]+/g, "_");
}

export default function PatientTestChartsPanel({ selected, tt }) {
  const [chartType, setChartType] = useState(CHART_Y_BALANCE);
  const [sessionId, setSessionId] = useState("");
  const testPdfRef = useRef(null);
  const [isExportingTestPdf, setIsExportingTestPdf] = useState(false);

  const sessionsWithY = useMemo(() => {
    return (selected.sessioniTest || []).filter((s) =>
      (s.distretti || []).some((d) =>
        (distrettoActiveTests(d) || []).some((t) => t.type === "Y_BALANCE")
      )
    );
  }, [selected.sessioniTest]);

  useEffect(() => {
    if (!sessionsWithY.length) {
      setSessionId("");
      return;
    }
    if (!sessionId || !sessionsWithY.some((s) => s.id === sessionId)) {
      setSessionId(sessionsWithY[sessionsWithY.length - 1].id);
    }
  }, [sessionsWithY, sessionId]);

  const session = sessionsWithY.find((s) => s.id === sessionId);

  const distrettiChoices = useMemo(() => {
    if (!session) return [];
    return (session.distretti || []).filter((d) =>
      (distrettoActiveTests(d) || []).some((t) => t.type === "Y_BALANCE")
    );
  }, [session]);

  const [distrettoId, setDistrettoId] = useState("");
  useEffect(() => {
    if (!distrettiChoices.length) {
      setDistrettoId("");
      return;
    }
    if (!distrettoId || !distrettiChoices.some((d) => d.id === distrettoId)) {
      setDistrettoId(distrettiChoices[0].id);
    }
  }, [distrettiChoices, distrettoId]);

  const yTest = useMemo(() => {
    if (!session || !distrettoId) return null;
    const d = (session.distretti || []).find((x) => x.id === distrettoId);
    if (!d) return null;
    const tests = distrettoActiveTests(d);
    return tests.find((t) => t.type === "Y_BALANCE") || null;
  }, [session, distrettoId]);

  const districtLabel = useMemo(() => {
    if (!session || !distrettoId) return "";
    const d = (session.distretti || []).find((x) => x.id === distrettoId);
    if (!d?.nome) return "";
    return (
      tt(`options.distretti.${String(d.nome).toLowerCase()}`) || d.nome
    );
  }, [session, distrettoId, tt]);

  return (
    <div>
      <h3 style={{ marginTop: 0, marginBottom: 12 }}>
        {tt("patient.testCharts.panelTitle")}
      </h3>
      <p style={{ margin: "0 0 12px", fontSize: 13, color: "#475569" }}>
        {tt("patient.testCharts.pickChart")}
      </p>
      <ul
        style={{
          listStyle: "none",
          padding: 0,
          margin: "0 0 16px",
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <li>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              cursor: "pointer",
              fontWeight: chartType === CHART_Y_BALANCE ? 600 : 400,
            }}
          >
            <input
              type="radio"
              name="patient-test-chart"
              checked={chartType === CHART_Y_BALANCE}
              onChange={() => setChartType(CHART_Y_BALANCE)}
            />
            {tt("patient.testCharts.optionYBalance")}
          </label>
        </li>
      </ul>

      {!sessionsWithY.length ? (
        <p style={{ color: "#64748b" }}>{tt("patient.testCharts.noYBalanceSessions")}</p>
      ) : (
        <>
          <div style={{ maxWidth: 420, marginBottom: 12 }}>
            <Select
              label={tt("patient.testCharts.sessionLabel")}
              value={sessionId}
              onChange={setSessionId}
              options={sessionsWithY.map((s) => ({
                value: s.id,
                label:
                  `${tt("testSession.cardHeading")} ${s.numeroTest || ""} — ${s.data ? String(s.data) : ""}`.trim(),
              }))}
            />
          </div>
          {distrettiChoices.length > 1 ? (
            <div style={{ maxWidth: 420, marginBottom: 12 }}>
              <Select
                label={tt("evaluation.district")}
                value={distrettoId}
                onChange={setDistrettoId}
                options={distrettiChoices.map((d) => ({
                  value: d.id,
                  label:
                    tt(`options.distretti.${String(d.nome).toLowerCase()}`) ||
                    d.nome,
                }))}
              />
            </div>
          ) : null}

          {chartType === CHART_Y_BALANCE && yTest ? (
            <>
              <div className="no-pdf" style={{ marginBottom: 12 }}>
                <button
                  type="button"
                  disabled={isExportingTestPdf}
                  onClick={async () => {
                    const el = testPdfRef.current;
                    if (!el) return;
                    setIsExportingTestPdf(true);
                    await new Promise((r) => requestAnimationFrame(() => r()));
                    try {
                      await exportHtmlToPdf(el, {
                        filename: `Test_YBalance_${safeFilenamePart(selected?.nome)}_${safeFilenamePart(selected?.cognome)}_${safeFilenamePart(session?.data)}.pdf`,
                      });
                    } catch (e) {
                      console.error(e);
                      alert(tt("patient.testCharts.saveTestPdfError"));
                    } finally {
                      setIsExportingTestPdf(false);
                    }
                  }}
                >
                  {isExportingTestPdf
                    ? tt("common.loading", "…")
                    : tt("patient.testCharts.saveTestPdf")}
                </button>
              </div>
              <div
                ref={testPdfRef}
                className={`pdf-root ${isExportingTestPdf ? "pdf-exporting" : ""}`}
              >
                <YBalanceTestReportCharts
                  test={yTest}
                  tt={tt}
                  patient={selected}
                  sessionDate={session?.data}
                  districtLabel={districtLabel}
                />
              </div>
            </>
          ) : chartType === CHART_Y_BALANCE ? (
            <p style={{ color: "#64748b" }}>{tt("patient.testCharts.noYBalanceInPick")}</p>
          ) : null}
        </>
      )}
    </div>
  );
}

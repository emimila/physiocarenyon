import { useEffect, useMemo, useRef, useState } from "react";
import Select from "../ui/Select";
import { distrettoActiveTests } from "../../utils/sanitizeEvaluation";
import { exportHtmlToPdf } from "../../utils/exportHtmlToPdf";
import YBalanceTestReportCharts from "./YBalanceTestReportCharts";
import IsokineticTestPdfReport from "./IsokineticTestPdfReport";

const CHART_Y_BALANCE = "y_balance";
const CHART_ISOKINETIC = "isokinetic";

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

  const sessionsWithIso = useMemo(() => {
    return (selected.sessioniTest || []).filter((s) =>
      (s.distretti || []).some((d) =>
        (distrettoActiveTests(d) || []).some((t) => t.type === "ISOKINETIC")
      )
    );
  }, [selected.sessioniTest]);

  const sessionsForChart = useMemo(
    () =>
      chartType === CHART_Y_BALANCE ? sessionsWithY : sessionsWithIso,
    [chartType, sessionsWithY, sessionsWithIso]
  );

  useEffect(() => {
    if (!sessionsForChart.length) {
      setSessionId("");
      return;
    }
    if (!sessionId || !sessionsForChart.some((s) => s.id === sessionId)) {
      setSessionId(sessionsForChart[sessionsForChart.length - 1].id);
    }
  }, [sessionsForChart, sessionId]);

  const session = useMemo(
    () => sessionsForChart.find((s) => s.id === sessionId),
    [sessionsForChart, sessionId]
  );

  const distrettiChoices = useMemo(() => {
    if (!session) return [];
    const testType =
      chartType === CHART_Y_BALANCE ? "Y_BALANCE" : "ISOKINETIC";
    return (session.distretti || []).filter((d) =>
      (distrettoActiveTests(d) || []).some((t) => t.type === testType)
    );
  }, [session, chartType]);

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
    if (!session || !distrettoId || chartType !== CHART_Y_BALANCE) return null;
    const d = (session.distretti || []).find((x) => x.id === distrettoId);
    if (!d) return null;
    const tests = distrettoActiveTests(d);
    return tests.find((t) => t.type === "Y_BALANCE") || null;
  }, [session, distrettoId, chartType]);

  const isoTest = useMemo(() => {
    if (!session || !distrettoId || chartType !== CHART_ISOKINETIC) return null;
    const d = (session.distretti || []).find((x) => x.id === distrettoId);
    if (!d) return null;
    const tests = distrettoActiveTests(d);
    return tests.find((t) => t.type === "ISOKINETIC") || null;
  }, [session, distrettoId, chartType]);

  const districtLabel = useMemo(() => {
    if (!session || !distrettoId) return "";
    const d = (session.distretti || []).find((x) => x.id === distrettoId);
    if (!d?.nome) return "";
    return (
      tt(`options.distretti.${String(d.nome).toLowerCase()}`) || d.nome
    );
  }, [session, distrettoId, tt]);

  async function runExportPdf(filename) {
    const el = testPdfRef.current;
    if (!el) return;
    setIsExportingTestPdf(true);
    await new Promise((r) => requestAnimationFrame(() => r()));
    try {
      await exportHtmlToPdf(el, { filename });
    } catch (e) {
      console.error(e);
      alert(tt("patient.testCharts.saveTestPdfError"));
    } finally {
      setIsExportingTestPdf(false);
    }
  }

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
        <li>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              cursor: "pointer",
              fontWeight: chartType === CHART_ISOKINETIC ? 600 : 400,
            }}
          >
            <input
              type="radio"
              name="patient-test-chart"
              checked={chartType === CHART_ISOKINETIC}
              onChange={() => setChartType(CHART_ISOKINETIC)}
            />
            {tt("patient.testCharts.optionIsokinetic")}
          </label>
        </li>
      </ul>

      {!sessionsForChart.length ? (
        <p style={{ color: "#64748b" }}>
          {chartType === CHART_Y_BALANCE
            ? tt("patient.testCharts.noYBalanceSessions")
            : tt("patient.testCharts.noIsokineticSessions")}
        </p>
      ) : (
        <>
          <div style={{ maxWidth: 420, marginBottom: 12 }}>
            <Select
              label={tt("patient.testCharts.sessionLabel")}
              value={sessionId}
              onChange={setSessionId}
              options={sessionsForChart.map((s) => ({
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
                  onClick={() =>
                    runExportPdf(
                      `Test_YBalance_${safeFilenamePart(selected?.nome)}_${safeFilenamePart(selected?.cognome)}_${safeFilenamePart(session?.data)}.pdf`
                    )
                  }
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
            <p style={{ color: "#64748b" }}>
              {tt("patient.testCharts.noYBalanceInPick")}
            </p>
          ) : null}

          {chartType === CHART_ISOKINETIC && isoTest ? (
            <>
              <div className="no-pdf" style={{ marginBottom: 12 }}>
                <button
                  type="button"
                  disabled={isExportingTestPdf}
                  onClick={() =>
                    runExportPdf(
                      `Test_Isokinetic_${safeFilenamePart(selected?.nome)}_${safeFilenamePart(selected?.cognome)}_${safeFilenamePart(session?.data)}.pdf`
                    )
                  }
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
                <IsokineticTestPdfReport
                  patient={selected}
                  session={session}
                  test={isoTest}
                  districtLabel={districtLabel}
                  tt={tt}
                />
              </div>
            </>
          ) : chartType === CHART_ISOKINETIC ? (
            <p style={{ color: "#64748b" }}>
              {tt("patient.testCharts.noIsokineticInPick")}
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}

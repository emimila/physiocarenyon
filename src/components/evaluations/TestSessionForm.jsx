import { useEffect, useRef, useState } from "react";
import Input from "../ui/Input";
import Select from "../ui/Select";
import { distretti } from "../../data/options";
import DistrictTestsPanel from "./DistrictTestsPanel";

const TEST_TYPE_IDS = ["Y_BALANCE", "GRIP_STRENGTH", "STRENGTH_MAXIMALS"];

export default function TestSessionForm({
  tt,
  patient,
  testSessionForm,
  setTestSessionForm,
  addDistrettoWithFirstTest,
  removeDistretto,
  saveTestSession,
  cancel,
}) {
  const [pickDistretto, setPickDistretto] = useState("");
  const [pickTestType, setPickTestType] = useState("");
  const pickDistrettoRef = useRef("");
  const pickTestTypeRef = useRef("");

  useEffect(() => {
    pickDistrettoRef.current = pickDistretto;
  }, [pickDistretto]);
  useEffect(() => {
    pickTestTypeRef.current = pickTestType;
  }, [pickTestType]);

  function clearDistrictPickers() {
    pickDistrettoRef.current = "";
    pickTestTypeRef.current = "";
    setPickDistretto("");
    setPickTestType("");
  }

  function tryFlushDistrictAdd() {
    const d = pickDistrettoRef.current;
    const t = pickTestTypeRef.current;
    if (!d || !t) return;
    const ok = addDistrettoWithFirstTest(d, t);
    if (ok) clearDistrictPickers();
  }

  return (
    <div className="evaluation-form">
      <div
        className="section-card"
        style={{
          border: "1px solid #ddd",
          borderRadius: 10,
          padding: 15,
          marginBottom: 15,
        }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: 16,
            marginBottom: 12,
          }}
        >
          <p style={{ margin: 0 }}>
            <strong>{tt("testSession.number")}:</strong>{" "}
            {testSessionForm.numeroTest || "—"}
          </p>
          <div style={{ flex: "1 1 220px", maxWidth: 420 }}>
            <Input
              label={tt("testSession.date")}
              type="date"
              value={testSessionForm.data}
              onChange={(v) =>
                setTestSessionForm({ ...testSessionForm, data: v })
              }
            />
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 12,
            alignItems: "flex-start",
            marginBottom: 12,
          }}
        >
          <div style={{ flex: "1 1 200px", minWidth: 0 }}>
            <Select
              label={tt("evaluation.district")}
              value={pickDistretto}
              onChange={(v) => {
                pickDistrettoRef.current = v;
                setPickDistretto(v);
                if (v && pickTestTypeRef.current) tryFlushDistrictAdd();
              }}
              options={[
                { value: "", label: "--" },
                ...distretti.map((d) => ({
                  value: d,
                  label:
                    tt(`options.distretti.${d}`) ||
                    tt(`options.distretti.${d.toLowerCase()}`) ||
                    d,
                })),
              ]}
            />
          </div>
          <div style={{ flex: "1 1 200px", minWidth: 0 }}>
            <Select
              label={tt("testSession.possibleTests")}
              value={pickTestType}
              onChange={(v) => {
                pickTestTypeRef.current = v;
                setPickTestType(v);
                if (v && pickDistrettoRef.current) tryFlushDistrictAdd();
              }}
              options={[
                { value: "", label: "--" },
                ...TEST_TYPE_IDS.map((id) => ({
                  value: id,
                  label:
                    id === "Y_BALANCE"
                      ? tt("tests.yBalance.title") ?? "Y Balance Test"
                      : id === "GRIP_STRENGTH"
                        ? tt("tests.gripStrength.title") ?? "Grip test (Jamar)"
                        : tt("tests.strengthMaximals.title") ??
                          "Massimali pesistica",
                })),
              ]}
            />
          </div>
        </div>

        <div
          style={{
            marginBottom: 16,
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            alignItems: "center",
          }}
        >
          <button type="button" onClick={cancel}>
            {tt("common.cancel")}
          </button>
        </div>

        {testSessionForm.distretti.map((d, idx) => (
          <div
            key={d.id}
            style={{
              marginTop: idx === 0 ? 20 : 24,
              paddingTop: idx === 0 ? 16 : 20,
              borderTop: "1px solid #e2e8f0",
            }}
          >
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                marginBottom: 12,
              }}
            >
              <h3 style={{ margin: 0, fontSize: "1.05rem" }}>
                {tt(`options.distretti.${d.nome}`) ||
                  tt(`options.distretti.${String(d.nome).toLowerCase()}`) ||
                  d.nome}
              </h3>
              <button type="button" onClick={() => removeDistretto(d.id)}>
                {tt("evaluation.removeDistrict")}
              </button>
            </div>

            <DistrictTestsPanel
              tt={tt}
              patient={patient}
              d={d}
              evaluationForm={testSessionForm}
              setEvaluationForm={setTestSessionForm}
              onSaveTestSession={saveTestSession}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

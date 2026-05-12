import { useEffect } from "react";
import { uid } from "../../utils/helpers";
import { createActiveTestByType } from "../../utils/factories";
import Input from "../ui/Input";
import Select from "../ui/Select";
import Textarea from "../ui/Textarea";
import {
  GripStrengthEvaluationFields,
  StrengthMaximalsEvaluationFields,
} from "./evaluationTestFields";
import IsokineticTestFields from "./IsokineticTestFields";
import HopBatteryTestFields from "./HopBatteryTestFields";

function emptyTestRow() {
  return {
    id: uid(),
    type: "",
    noteAltro: "",
    grip: {},
    left: {},
    right: {},
    lifts: [],
    hopBattery: {},
  };
}

/**
 * Editor test (Y Balance / Grip / Massimali) per un distretto.
 * `evaluationForm` è un oggetto con `data` e `distretti` (stessa forma di valutazione o sessione test).
 */
export default function DistrictTestsPanel({
  tt,
  patient,
  d,
  evaluationForm,
  setEvaluationForm,
  onSaveTestSession,
}) {
  useEffect(() => {
    setEvaluationForm((prev) => {
      const dist = prev.distretti.find((x) => x.id === d.id);
      if (!dist || (dist.tests || []).length > 0) return prev;
      return {
        ...prev,
        distretti: prev.distretti.map((dist) =>
          dist.id === d.id
            ? { ...dist, tests: [emptyTestRow()] }
            : dist
        ),
      };
    });
  }, [d.id, setEvaluationForm]);

  return (
    <div style={{ marginTop: 4 }}>
      {(d.tests || []).map((test) => (
        <div key={test.id} className="evaluation-test-card">
          <Select
            label={tt("evaluation.test")}
            value={test.type}
            onChange={(value) =>
              setEvaluationForm({
                ...evaluationForm,
                distretti: evaluationForm.distretti.map((dist) =>
                  dist.id === d.id
                    ? {
                        ...dist,
                        tests: (dist.tests || []).map((t) =>
                          t.id === test.id
                            ? (() => {
                                const fresh = createActiveTestByType(
                                  value,
                                  patient
                                );
                                return {
                                  ...fresh,
                                  id: t.id,
                                  noteAltro: t.noteAltro || "",
                                  lifts:
                                    value === "STRENGTH_MAXIMALS" &&
                                    t.type === "STRENGTH_MAXIMALS" &&
                                    Array.isArray(t.lifts) &&
                                    t.lifts.length > 0
                                      ? t.lifts
                                      : fresh.lifts,
                                  isokinetic:
                                    value === "ISOKINETIC" &&
                                    t.type === "ISOKINETIC" &&
                                    t.isokinetic &&
                                    typeof t.isokinetic === "object"
                                      ? t.isokinetic
                                      : fresh.isokinetic,
                                  hopBattery:
                                    value === "HOP_BATTERY" &&
                                    t.type === "HOP_BATTERY" &&
                                    t.hopBattery &&
                                    typeof t.hopBattery === "object"
                                      ? t.hopBattery
                                      : fresh.hopBattery,
                                };
                              })()
                            : t
                        ),
                      }
                    : dist
                ),
              })
            }
            options={[
              {
                value: "Y_BALANCE",
                label: tt("tests.yBalance.title") ?? "Y Balance Test",
              },
              {
                value: "GRIP_STRENGTH",
                label:
                  tt("tests.gripStrength.title") ?? "Grip test (Jamar)",
              },
              {
                value: "STRENGTH_MAXIMALS",
                label:
                  tt("tests.strengthMaximals.title") ??
                  "Massimali pesistica",
              },
              {
                value: "ISOKINETIC",
                label: tt("tests.isokinetic.title") ?? "Test isocinetico",
              },
              {
                value: "HOP_BATTERY",
                label: tt("tests.hopBattery.title") ?? "Hop test battery",
              },
            ]}
          />

          {test.type === "Y_BALANCE" && (
            <div className="evaluation-y-sides-grid">
              {["left", "right"].map((side) => (
                <div key={side}>
                  <div className="evaluation-side-heading">
                    {side === "left"
                      ? tt("evaluation.left")
                      : tt("evaluation.right")}
                  </div>

                  <Input
                    label="Leg length (cm)"
                    type="number"
                    value={test[side]?.legLength || ""}
                    onChange={(v) =>
                      setEvaluationForm({
                        ...evaluationForm,
                        distretti: evaluationForm.distretti.map((dist) =>
                          dist.id === d.id
                            ? {
                                ...dist,
                                tests: (dist.tests || []).map((t) =>
                                  t.id === test.id
                                    ? {
                                        ...t,
                                        [side]: {
                                          ...(t[side] || {}),
                                          legLength: v,
                                        },
                                      }
                                    : t
                                ),
                              }
                            : dist
                        ),
                      })
                    }
                  />

                  {[
                    { key: "anterior", label: "Anterior" },
                    { key: "posteromedial", label: "Posteromedial" },
                    { key: "posterolateral", label: "Posterolateral" },
                  ].map((direction) => (
                    <div
                      key={direction.key}
                      className="evaluation-y-direction"
                    >
                      <span className="evaluation-y-direction__title">
                        {direction.label}
                      </span>

                      <div className="evaluation-y-trials-grid">
                        {[0, 1, 2].map((trialIndex) => (
                          <Input
                            key={trialIndex}
                            label={`Test ${trialIndex + 1}`}
                            type="number"
                            value={
                              test[side]?.[direction.key]?.[trialIndex] || ""
                            }
                            onChange={(v) =>
                              setEvaluationForm({
                                ...evaluationForm,
                                distretti: evaluationForm.distretti.map(
                                  (dist) =>
                                    dist.id === d.id
                                      ? {
                                          ...dist,
                                          tests: (dist.tests || []).map(
                                            (t) =>
                                              t.id === test.id
                                                ? {
                                                    ...t,
                                                    [side]: {
                                                      ...(t[side] || {}),
                                                      [direction.key]: [
                                                        0, 1, 2,
                                                      ].map((_, i) =>
                                                        i === trialIndex
                                                          ? v
                                                          : t[side]?.[
                                                                direction.key
                                                              ]?.[i] || ""
                                                      ),
                                                    },
                                                  }
                                                : t
                                          ),
                                        }
                                      : dist
                                ),
                              })
                            }
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {test.type === "GRIP_STRENGTH" && (
            <GripStrengthEvaluationFields
              tt={tt}
              patient={patient}
              evaluationDate={evaluationForm.data}
              distrettoId={d.id}
              test={test}
              evaluationForm={evaluationForm}
              setEvaluationForm={setEvaluationForm}
            />
          )}

          {test.type === "STRENGTH_MAXIMALS" && (
            <StrengthMaximalsEvaluationFields
              tt={tt}
              distrettoId={d.id}
              test={test}
              evaluationForm={evaluationForm}
              setEvaluationForm={setEvaluationForm}
            />
          )}

          {test.type === "ISOKINETIC" && (
            <IsokineticTestFields
              tt={tt}
              patient={patient}
              distrettoId={d.id}
              test={test}
              evaluationForm={evaluationForm}
              setEvaluationForm={setEvaluationForm}
            />
          )}

          {test.type === "HOP_BATTERY" && (
            <HopBatteryTestFields
              tt={tt}
              distrettoId={d.id}
              test={test}
              setEvaluationForm={setEvaluationForm}
              patient={patient}
              sessionDate={evaluationForm?.data}
              numeroTest={evaluationForm?.numeroTest}
              districtLabel={
                tt(`options.distretti.${String(d.nome).toLowerCase()}`) ||
                d.nome
              }
            />
          )}

          {test.type ? (
            <div style={{ marginTop: 12 }}>
              <Textarea
                compact
                fullWidth
                label={tt("evaluation.otherDetailsOptional")}
                value={test.noteAltro || ""}
                onChange={(value) =>
                  setEvaluationForm({
                    ...evaluationForm,
                    distretti: evaluationForm.distretti.map((dist) =>
                      dist.id === d.id
                        ? {
                            ...dist,
                            tests: (dist.tests || []).map((t) =>
                              t.id === test.id
                                ? { ...t, noteAltro: value }
                                : t
                            ),
                          }
                        : dist
                    ),
                  })
                }
              />
            </div>
          ) : null}
        </div>
      ))}

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          alignItems: "center",
          marginTop: 12,
        }}
      >
        <button
          type="button"
          onClick={() =>
            setEvaluationForm({
              ...evaluationForm,
              distretti: evaluationForm.distretti.map((dist) =>
                dist.id === d.id
                  ? {
                      ...dist,
                      tests: [...(dist.tests || []), emptyTestRow()],
                    }
                  : dist
              ),
            })
          }
        >
          {tt("evaluation.addTest")}
        </button>
        {onSaveTestSession ? (
          <button type="button" onClick={onSaveTestSession}>
            {tt("testSession.save")}
          </button>
        ) : null}
      </div>
    </div>
  );
}

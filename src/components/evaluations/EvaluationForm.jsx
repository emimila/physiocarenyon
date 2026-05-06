import Section from "../ui/Section";
import { uid } from "../../utils/helpers";
import Input from "../ui/Input";
import Select from "../ui/Select";
import Textarea from "../ui/Textarea";
import Score10 from "../ui/Score10";
import SideScores from "./SideScores";
import { distretti, strengthLiftExerciseIds } from "../../data/options";
import { assessGrip } from "../../utils/gripAssessment";
import { epleyOneRmKg, formatOneRmKg } from "../../utils/epley1rm";

export const OTHER_EXERCISE = "__other_exercise__";

function StrengthMaximalsEvaluationFields({
  tt,
  distrettoId,
  test,
  evaluationForm,
  setEvaluationForm,
}) {
  const lifts = test.lifts?.length
    ? test.lifts
    : [{ id: uid(), exercise: "", exerciseOther: "", reps: "", weightKg: "" }];

  function setLifts(nextLifts) {
    setEvaluationForm({
      ...evaluationForm,
      distretti: evaluationForm.distretti.map((dist) =>
        dist.id === distrettoId
          ? {
              ...dist,
              tests: (dist.tests || []).map((t) =>
                t.id === test.id ? { ...t, lifts: nextLifts } : t
              ),
            }
          : dist
      ),
    });
  }

  function updateLift(liftId, patch) {
    setLifts(
      lifts.map((L) => (L.id === liftId ? { ...L, ...patch } : L))
    );
  }

  function addLift() {
    setLifts([
      ...lifts,
      { id: uid(), exercise: "", exerciseOther: "", reps: "", weightKg: "" },
    ]);
  }

  function removeLift(liftId) {
    if (lifts.length <= 1) return;
    setLifts(lifts.filter((L) => L.id !== liftId));
  }

  const exerciseOptions = [
    { value: "", label: "--" },
    ...strengthLiftExerciseIds.map((id) => ({
      value: id,
      label:
        tt(`tests.strengthMaximals.exercises.${id}`) ||
        id,
    })),
    {
      value: OTHER_EXERCISE,
      label: tt("evaluation.otherExercise") || "Altro",
    },
  ];

  return (
    <div style={{ marginTop: 12 }}>
      <p style={{ fontSize: 12, color: "#555", marginBottom: 10 }}>
        {tt("tests.strengthMaximals.epleyFootnote")}
      </p>

      {lifts.map((line) => {
        const oneRm = epleyOneRmKg(line.weightKg, line.reps);
        const oneRmLabel = formatOneRmKg(oneRm) ?? "—";

        return (
          <div
            key={line.id}
            style={{
              marginTop: 10,
              padding: 10,
              border: "1px solid #e0e0e0",
              borderRadius: 8,
              background: "#fff",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
                alignItems: "start",
              }}
            >
              <Select
                label={tt("tests.strengthMaximals.exercise")}
                value={line.exercise || ""}
                onChange={(v) =>
                  updateLift(line.id, {
                    exercise: v,
                    exerciseOther:
                      v === OTHER_EXERCISE ? line.exerciseOther || "" : "",
                  })
                }
                options={exerciseOptions}
              />

              <div style={{ marginTop: 22 }}>
                <button type="button" onClick={() => removeLift(line.id)}>
                  {tt("tests.strengthMaximals.removeLift")}
                </button>
              </div>
            </div>

            {line.exercise === OTHER_EXERCISE && (
              <Input
                label={tt("evaluation.otherExerciseSpecify")}
                value={line.exerciseOther || ""}
                onChange={(v) => updateLift(line.id, { exerciseOther: v })}
              />
            )}

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
                marginTop: 8,
              }}
            >
              <Input
                label={tt("tests.strengthMaximals.reps")}
                type="number"
                value={line.reps ?? ""}
                onChange={(v) => updateLift(line.id, { reps: v })}
              />
              <Input
                label={tt("tests.strengthMaximals.weightKg")}
                type="number"
                value={line.weightKg ?? ""}
                onChange={(v) => updateLift(line.id, { weightKg: v })}
              />
            </div>

            <p style={{ marginTop: 10, fontSize: 13 }}>
              <strong>{tt("tests.strengthMaximals.theor1RM")}:</strong>{" "}
              {oneRmLabel}
            </p>
          </div>
        );
      })}

      <button type="button" style={{ marginTop: 12 }} onClick={addLift}>
        {tt("tests.strengthMaximals.addLift")}
      </button>
    </div>
  );
}

function GripStrengthEvaluationFields({
  tt,
  patient,
  evaluationDate,
  distrettoId,
  test,
  evaluationForm,
  setEvaluationForm,
}) {
  function updateGrip(patch) {
    setEvaluationForm({
      ...evaluationForm,
      distretti: evaluationForm.distretti.map((dist) =>
        dist.id === distrettoId
          ? {
              ...dist,
              tests: (dist.tests || []).map((t) =>
                t.id === test.id
                  ? {
                      ...t,
                      grip: {
                        ...(t.grip || {}),
                        ...patch,
                      },
                    }
                  : t
              ),
            }
          : dist
      ),
    });
  }

  const assessmentDate = (() => {
    const d = evaluationDate ? new Date(evaluationDate) : new Date();
    return Number.isFinite(d.getTime()) ? d : new Date();
  })();

  const gripPatient = {
    sesso: patient?.sesso || "",
    dataNascita: patient?.dataNascita || "",
    altezza: patient?.altezza || "",
    manoDominante:
      test.grip?.manoDominante || patient?.manoDominante || "",
    manoDestraForza1: test.grip?.manoDestraForza1 ?? "",
    manoDestraForza2: test.grip?.manoDestraForza2 ?? "",
    manoDestraForza3: test.grip?.manoDestraForza3 ?? "",
    manoSinistraForza1: test.grip?.manoSinistraForza1 ?? "",
    manoSinistraForza2: test.grip?.manoSinistraForza2 ?? "",
    manoSinistraForza3: test.grip?.manoSinistraForza3 ?? "",
  };

  const grip = assessGrip(gripPatient, assessmentDate);

  const gripHintStyle = {
    display: "block",
    fontSize: 12,
    color: "#555",
    marginTop: 4,
    lineHeight: 1.35,
    maxWidth: 560,
  };

  return (
    <div style={{ marginTop: 10 }}>
      <Select
        label={tt("patient.dominantHand")}
        value={test.grip?.manoDominante || patient?.manoDominante || ""}
        onChange={(v) => updateGrip({ manoDominante: v })}
        options={[
          { value: "", label: "--" },
          { value: "Destra", label: tt("dominantHand.Destra") },
          { value: "Sinistra", label: tt("dominantHand.Sinistra") },
          { value: "Ambidestro", label: tt("dominantHand.Ambidestro") },
        ]}
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
          marginTop: 10,
        }}
      >
        <div>
          <strong>{tt("evaluation.right")}</strong>
          <Input
            label={`${tt("patient.trial1") ?? "Prova 1"} (kg)`}
            type="number"
            value={test.grip?.manoDestraForza1 || ""}
            onChange={(v) => updateGrip({ manoDestraForza1: v })}
          />
          <Input
            label={`${tt("patient.trial2") ?? "Prova 2"} (kg)`}
            type="number"
            value={test.grip?.manoDestraForza2 || ""}
            onChange={(v) => updateGrip({ manoDestraForza2: v })}
          />
          <Input
            label={`${tt("patient.trial3") ?? "Prova 3"} (kg)`}
            type="number"
            value={test.grip?.manoDestraForza3 || ""}
            onChange={(v) => updateGrip({ manoDestraForza3: v })}
          />
        </div>

        <div>
          <strong>{tt("evaluation.left")}</strong>
          <Input
            label={`${tt("patient.trial1") ?? "Prova 1"} (kg)`}
            type="number"
            value={test.grip?.manoSinistraForza1 || ""}
            onChange={(v) => updateGrip({ manoSinistraForza1: v })}
          />
          <Input
            label={`${tt("patient.trial2") ?? "Prova 2"} (kg)`}
            type="number"
            value={test.grip?.manoSinistraForza2 || ""}
            onChange={(v) => updateGrip({ manoSinistraForza2: v })}
          />
          <Input
            label={`${tt("patient.trial3") ?? "Prova 3"} (kg)`}
            type="number"
            value={test.grip?.manoSinistraForza3 || ""}
            onChange={(v) => updateGrip({ manoSinistraForza3: v })}
          />
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <strong>{tt("tests.gripStrength.summary") ?? "Risultato"}</strong>

        <p style={{ marginTop: 8 }}>
          <strong>{tt("patient.dominantHand")}:</strong>{" "}
          {tt(`dominantHand.${gripPatient.manoDominante}`) ||
            gripPatient.manoDominante ||
            "-"}
        </p>

        <p>
          <strong>{tt("grip.mean")}:</strong> {grip?.average ?? "-"} kg
        </p>

        <p>
          <strong>
            {tt("grip.percentile")} (kg):
          </strong>{" "}
          {grip?.absolutePercentile ? `P${grip.absolutePercentile}` : "-"}
          {grip?.ready && grip?.absolutePercentile != null && (
            <span style={gripHintStyle}>
              {tt("grip.clinicalHint.percentileKg")}
            </span>
          )}
        </p>

        <p>
          <strong>
            {tt("grip.percentile")} (kg/m²):
          </strong>{" "}
          {grip?.normalizedPercentile ? `P${grip.normalizedPercentile}` : "-"}
          {grip?.ready && grip?.normalizedPercentile != null && (
            <span style={gripHintStyle}>
              {tt("grip.clinicalHint.percentileKgM2")}
            </span>
          )}
        </p>

        <p>
          <strong>{tt("grip.interpretation")}:</strong>{" "}
          {grip?.absoluteInterpretationKey
            ? tt(`grip.${grip.absoluteInterpretationKey}`) ||
              grip.absoluteInterpretationKey
            : "-"}
          {grip?.ready && grip?.absoluteInterpretationKey && (
            <span style={gripHintStyle}>
              {tt(`grip.clinicalHint.${grip.absoluteInterpretationKey}`)}
            </span>
          )}
        </p>

        <p>
          <strong>{tt("grip.right")}:</strong> {grip?.bestRight ?? "-"} kg{" "}
          <strong>{tt("grip.left")}:</strong> {grip?.bestLeft ?? "-"} kg{" "}
          <strong>{tt("grip.best")}:</strong> {grip?.bestOverall ?? "-"} kg
        </p>

        {grip?.ready && (
          <p style={{ ...gripHintStyle, marginTop: 10, fontSize: 11, color: "#777" }}>
            {tt("grip.referenceShort")}
          </p>
        )}
      </div>
    </div>
  );
}

export default function EvaluationForm({
  tt,
  patient,
  evaluationForm,
  setEvaluationForm,
  distrettoToAdd,
  setDistrettoToAdd,
  addDistretto,
  removeDistretto,
  updateScore,
  saveEvaluation,
  cancel,
}) {
  function patchDistretto(distrettoId, patch) {
    setEvaluationForm({
      ...evaluationForm,
      distretti: evaluationForm.distretti.map((dist) =>
        dist.id === distrettoId ? { ...dist, ...patch } : dist
      ),
    });
  }

  function updateDolore(distrettoId, lato, key, value) {
    setEvaluationForm({
      ...evaluationForm,
      distretti: evaluationForm.distretti.map((d) =>
        d.id === distrettoId
          ? {
              ...d,
              [lato]: {
                ...(d[lato] || {}),
                dolore: {
                  ...(d[lato]?.dolore || {}),
                  [key]: value,
                },
              },
            }
          : d
      ),
    });
  }

  return (
    <div>
      <h2>{tt("evaluation.title")}</h2>

      <Section title={tt("evaluation.title")}>
        <Input
          label={tt("evaluation.date")}
          type="date"
          value={evaluationForm.data}
          onChange={(v) => setEvaluationForm({ ...evaluationForm, data: v })}
        />

        <p style={{ margin: "6px 0 10px" }}>
          <strong>{tt("evaluation.number")}:</strong>{" "}
          {evaluationForm.numeroValutazione || "—"}
        </p>

        <Textarea
          label={tt("evaluation.notes")}
          value={evaluationForm.note}
          onChange={(v) => setEvaluationForm({ ...evaluationForm, note: v })}
        />
      </Section>

      <Section title={tt("evaluation.addDistrict")}>
        <Select
          label={tt("evaluation.district")}
          value={distrettoToAdd}
          onChange={setDistrettoToAdd}
          options={distretti.map((d) => ({
            value: d,
            label: tt(`options.distretti.${d.toLowerCase()}`),
          }))}
        />

        <button onClick={addDistretto}>
          {tt("evaluation.addDistrict")}
        </button>
      </Section>

      {evaluationForm.distretti.map((d) => (
        <Section key={d.id} title={tt(`options.distretti.${d.nome}`)}>
          <button onClick={() => removeDistretto(d.id)}>
            {tt("evaluation.removeDistrict")}
          </button>

          <div style={{ marginTop: 15 }}>
            <button
              type="button"
              onClick={() =>
                setEvaluationForm({
                  ...evaluationForm,
                  distretti: evaluationForm.distretti.map((dist) =>
                    dist.id === d.id
                      ? {
                          ...dist,
                          blocks: [
                            ...(dist.blocks || []),
                            { id: uid(), type: "", noteAltro: "" },
                          ],
                        }
                      : dist
                  ),
                })
              }
            >
              {tt("evaluation.addEvaluationBlock")}
            </button>

            {(d.blocks || []).map((block) => (
              <div
                key={block.id}
                style={{
                  marginTop: 12,
                  padding: 12,
                  border: "1px solid #e2e2e2",
                  borderRadius: 10,
                  background: "#fafafa",
                }}
              >
                <Select
                  label={tt("evaluation.evaluationBlock")}
                  value={block.type}
                  onChange={(value) =>
                    setEvaluationForm({
                      ...evaluationForm,
                      distretti: evaluationForm.distretti.map((dist) =>
                        dist.id === d.id
                          ? {
                              ...dist,
                              blocks: (dist.blocks || []).map((b) =>
                                b.id === block.id ? { ...b, type: value } : b
                              ),
                            }
                          : dist
                      ),
                    })
                  }
                  options={[
                    {
                      value: "KIVIAT",
                      label: tt("evaluation.blockType.KIVIAT"),
                    },
                    {
                      value: "PAIN_VAS",
                      label: tt("evaluation.blockType.PAIN_VAS"),
                    },
                    {
                      value: "GENERAL_PAIN",
                      label: tt("evaluation.blockType.GENERAL_PAIN"),
                    },
                  ]}
                />
                <Textarea
                  label={tt("evaluation.otherDetailsOptional")}
                  value={block.noteAltro || ""}
                  onChange={(value) =>
                    setEvaluationForm({
                      ...evaluationForm,
                      distretti: evaluationForm.distretti.map((dist) =>
                        dist.id === d.id
                          ? {
                              ...dist,
                              blocks: (dist.blocks || []).map((b) =>
                                b.id === block.id
                                  ? { ...b, noteAltro: value }
                                  : b
                              ),
                            }
                          : dist
                      ),
                    })
                  }
                />

                {block.type === "KIVIAT" && (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 20,
                      marginTop: 12,
                    }}
                  >
                    <SideScores
                      tt={tt}
                      title={tt("evaluation.right")}
                      scores={d.destro}
                      onChange={(key, value) =>
                        updateScore(d.id, "destro", key, value)
                      }
                    />
                    <SideScores
                      tt={tt}
                      title={tt("evaluation.left")}
                      scores={d.sinistro}
                      onChange={(key, value) =>
                        updateScore(d.id, "sinistro", key, value)
                      }
                    />
                  </div>
                )}

                {block.type === "PAIN_VAS" && (
                  <div style={{ marginTop: 12 }}>
                    <strong>{tt("evaluation.painVAS")}</strong>
                    {[
                      { key: "riposo", label: tt("evaluation.rest") },
                      { key: "mattino", label: tt("evaluation.morning") },
                      { key: "sera", label: tt("evaluation.evening") },
                      {
                        key: "duranteAttivita",
                        label: tt("evaluation.duringActivity"),
                      },
                      {
                        key: "dopoAttivita",
                        label: tt("evaluation.afterActivity"),
                      },
                    ].map(({ key, label }) => (
                      <div
                        key={key}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: 20,
                          marginTop: 10,
                        }}
                      >
                        <Score10
                          label={`${label} — ${tt("evaluation.right")}`}
                          value={d.destro?.dolore?.[key]}
                          onChange={(v) =>
                            updateDolore(d.id, "destro", key, v)
                          }
                        />
                        <Score10
                          label={`${label} — ${tt("evaluation.left")}`}
                          value={d.sinistro?.dolore?.[key]}
                          onChange={(v) =>
                            updateDolore(d.id, "sinistro", key, v)
                          }
                        />
                      </div>
                    ))}
                  </div>
                )}

                {block.type === "GENERAL_PAIN" && (
                  <div style={{ marginTop: 12 }}>
                    <strong>{tt("evaluation.generalPainVAS")}</strong>
                    <Score10
                      min={1}
                      max={10}
                      label={tt("evaluation.painVAS")}
                      value={d.doloreGeneraleVAS || ""}
                      onChange={(v) =>
                        patchDistretto(d.id, { doloreGeneraleVAS: v })
                      }
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

<div style={{ marginTop: 15 }}>
  <button
    type="button"
    onClick={() =>
      setEvaluationForm({
        ...evaluationForm,
                distretti: evaluationForm.distretti.map((dist) =>
                  dist.id === d.id
                    ? {
                        ...dist,
                        tests: [
                          ...(dist.tests || []),
                          {
                            id: uid(),
                            type: "",
                            noteAltro: "",
                            grip: {},
                            left: {},
                            right: {},
                            lifts: [],
                          },
                        ],
                      }
                    : dist
                ),
      })
    }
  >
    {tt("evaluation.addTest")}
  </button>

            {(d.tests || []).map((test) => (
              <div
                key={test.id}
                style={{
                  marginTop: 12,
                  padding: 10,
                  border: "1px solid #ddd",
                  borderRadius: 8,
                  background: "#fafafa",
                }}
              >
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
                                  ? {
                                      ...t,
                                      type: value,
                                      grip:
                                        value === "GRIP_STRENGTH"
                                          ? {
                                              manoDominante:
                                                patient?.manoDominante || "",
                                              manoDestraForza1: "",
                                              manoDestraForza2: "",
                                              manoDestraForza3: "",
                                              manoSinistraForza1: "",
                                              manoSinistraForza2: "",
                                              manoSinistraForza3: "",
                                            }
                                          : {},
                                      left:
                                        value === "Y_BALANCE"
                                          ? {
                                              legLength: "",
                                              anterior: [],
                                              posteromedial: [],
                                              posterolateral: [],
                                            }
                                          : value === "GRIP_STRENGTH"
                                            ? {}
                                            : {},
                                      right:
                                        value === "Y_BALANCE"
                                          ? {
                                              legLength: "",
                                              anterior: [],
                                              posteromedial: [],
                                              posterolateral: [],
                                            }
                                          : value === "GRIP_STRENGTH"
                                            ? {}
                                            : {},
                                      lifts:
                                        value === "STRENGTH_MAXIMALS"
                                          ? t.type === "STRENGTH_MAXIMALS" &&
                                            Array.isArray(t.lifts) &&
                                            t.lifts.length > 0
                                            ? t.lifts
                                            : [
                                                {
                                                  id: uid(),
                                                  exercise: "",
                                                  exerciseOther: "",
                                                  reps: "",
                                                  weightKg: "",
                                                },
                                              ]
                                          : undefined,
                                    }
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
                  ]}
                />

                <Textarea
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

                {test.type && (
                  <div style={{ marginTop: 8, color: "#555", fontSize: 13 }}>
                    <strong>
                      {tt("evaluation.selectedTest") ?? "Test selezionato"}:
                    </strong>{" "}
                    {test.type === "Y_BALANCE"
                      ? tt("tests.yBalance.title") ?? "Y Balance Test"
                      : test.type === "GRIP_STRENGTH"
                        ? tt("tests.gripStrength.title") ?? "Grip test (Jamar)"
                        : test.type === "STRENGTH_MAXIMALS"
                          ? tt("tests.strengthMaximals.title") ??
                            "Massimali pesistica"
                          : test.type}
                  </div>
                )}

                {test.type === "Y_BALANCE" && (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 20,
                      marginTop: 10,
                    }}
                  >
                    {["right", "left"].map((side) => (
                      <div key={side}>
                        <h4>
                          {side === "right"
                            ? tt("evaluation.right")
                            : tt("evaluation.left")}
                        </h4>

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
                          <div key={direction.key} style={{ marginTop: 10 }}>
                            <strong>{direction.label}</strong>

                            <div
                              style={{
                                display: "grid",
                                gridTemplateColumns: "1fr 1fr 1fr",
                                gap: 8,
                              }}
                            >
                              {[0, 1, 2].map((trialIndex) => (
                                <Input
                                key={trialIndex}
                                label={`Test ${trialIndex + 1}`}
                                type="number"
                                value={test[side]?.[direction.key]?.[trialIndex] || ""}
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
                                                      [direction.key]: [0, 1, 2].map((_, i) =>
  i === trialIndex ? v : t[side]?.[direction.key]?.[i] || ""
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
              </div>
            ))}
          </div>
        </Section>
      ))}

      <button onClick={saveEvaluation}>
        {tt("evaluation.saveEvaluation")}
      </button>{" "}
      <button onClick={cancel}>
        {tt("common.cancel")}
      </button>
    </div>
  );
}
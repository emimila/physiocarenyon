import Section from "../ui/Section";
import { uid } from "../../utils/helpers";
import Input from "../ui/Input";
import Select from "../ui/Select";
import Textarea from "../ui/Textarea";
import Score10 from "../ui/Score10";
import SideScores from "./SideScores";
import { distretti } from "../../data/options";

export default function EvaluationForm({
  tt,
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

        <Select
          label={tt("evaluation.voucher")}
          value={evaluationForm.buono}
          onChange={(v) => setEvaluationForm({ ...evaluationForm, buono: v })}
          options={["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"]}
        />

        <Select
          label={tt("evaluation.session")}
          value={evaluationForm.sessione}
          onChange={(v) =>
            setEvaluationForm({ ...evaluationForm, sessione: v })
          }
          options={[
            "1", "2", "3", "4", "5",
            "6", "7", "8", "9", "10",
            "11", "12", "13", "14", "15",
            "16", "17", "18", "19", "20",
          ]}
        />

        <Select
          label={tt("evaluation.number")}
          value={evaluationForm.numeroValutazione}
          onChange={(v) =>
            setEvaluationForm({ ...evaluationForm, numeroValutazione: v })
          }
          options={["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"]}
        />

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
                            { id: uid(), type: "" },
                          ],
                        }
                      : dist
                  ),
                })
              }
            >
              Add evaluation block
            </button>

            {(d.blocks || []).map((block) => (
              <div key={block.id} style={{ marginTop: 10 }}>
                <Select
                  label="Block"
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
                    { value: "KIVIAT", label: "Kiviat" },
                    { value: "PAIN_VAS", label: "Pain VAS" },
                    { value: "GENERAL_PAIN", label: "General pain" },
                  ]}
                />
              </div>
            ))}
          </div>

          {(d.blocks || []).some((b) => b.type === "KIVIAT") && (
  <div
    style={{
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 20,
      marginTop: 15,
    }}
  >
    <SideScores
      tt={tt}
      title={tt("evaluation.right")}
      scores={d.destro}
      onChange={(key, value) => updateScore(d.id, "destro", key, value)}
    />

    <SideScores
      tt={tt}
      title={tt("evaluation.left")}
      scores={d.sinistro}
      onChange={(key, value) => updateScore(d.id, "sinistro", key, value)}
    />
  </div>
)}

{(d.blocks || []).some((b) => b.type === "PAIN_VAS") && (
  <div style={{ marginTop: 15 }}>
    <strong>{tt("evaluation.painVAS")}</strong>

    {[
      { key: "riposo", label: tt("evaluation.rest") },
      { key: "mattino", label: tt("evaluation.morning") },
      { key: "sera", label: tt("evaluation.evening") },
      { key: "duranteAttivita", label: tt("evaluation.duringActivity") },
      { key: "dopoAttivita", label: tt("evaluation.afterActivity") },
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
          onChange={(v) => updateDolore(d.id, "destro", key, v)}
        />

        <Score10
          label={`${label} — ${tt("evaluation.left")}`}
          value={d.sinistro?.dolore?.[key]}
          onChange={(v) => updateDolore(d.id, "sinistro", key, v)}
        />
      </div>
    ))}
  </div>
)}

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
                    left: {},
                    right: {},
                  },
                ],
              }
            : dist
        ),
      })
    }
  >
    Add test
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
                  label="Test"
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
                                      left:
                                        value === "Y_BALANCE"
                                          ? {
                                              legLength: "",
                                              anterior: [],
                                              posteromedial: [],
                                              posterolateral: [],
                                            }
                                          : {},
                                      right:
                                        value === "Y_BALANCE"
                                          ? {
                                              legLength: "",
                                              anterior: [],
                                              posteromedial: [],
                                              posterolateral: [],
                                            }
                                          : {},
                                    }
                                  : t
                              ),
                            }
                          : dist
                      ),
                    })
                  }
                  options={[{ value: "Y_BALANCE", label: "Y Balance Test" }]}
                />

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
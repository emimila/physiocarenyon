import { Fragment } from "react";
import Section from "../ui/Section";
import { uid } from "../../utils/helpers";
import Input from "../ui/Input";
import Select from "../ui/Select";
import Textarea from "../ui/Textarea";
import Score10 from "../ui/Score10";
import SideScores from "./SideScores";
import { distretti } from "../../data/options";

/** Un blocco = tipo + note + (subito sotto) sole celle/griglie di quel blocco — nulla tra un blocco e il successivo. */
function EvaluationBlockCard({
  tt,
  block,
  d,
  evaluationForm,
  setEvaluationForm,
  updateScore,
  updateDolore,
  patchDistretto,
}) {
  const showKiviat =
    block.type === "KIVIAT" || block.type === "KIVIAT_PAIN";

  return (
    <article
      className="evaluation-block-unit"
      data-evaluation-block-id={block.id}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      <div className="evaluation-block-fields">
        <div className="evaluation-block-note-group">
        <Select
          compact
          fullWidth
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
          compact
          fullWidth
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
                        b.id === block.id ? { ...b, noteAltro: value } : b
                      ),
                    }
                  : dist
              ),
            })
          }
        />
        </div>
      </div>

      {showKiviat && (
        <div className="evaluation-block-kiviat">
          <strong className="evaluation-pain-vas-title">
            {tt(`evaluation.blockType.${block.type}`) ||
              tt("evaluation.blockType.KIVIAT")}
          </strong>
          <SideScores
            tt={tt}
            ariaGroupLabel={
              tt(`evaluation.blockType.${block.type}`) ||
              tt("evaluation.blockType.KIVIAT")
            }
            sinistro={d.sinistro}
            destro={d.destro}
            onSinistroChange={(key, value) =>
              updateScore(d.id, "sinistro", key, value)
            }
            onDestroChange={(key, value) =>
              updateScore(d.id, "destro", key, value)
            }
          />
        </div>
      )}

      {block.type === "PAIN_VAS" && (
        <div className="evaluation-block-pain-vas">
          <strong className="evaluation-pain-vas-title">
            {tt("evaluation.painVAS")}
          </strong>
          <div className="evaluation-pain-vas-grid" role="group" aria-label={tt("evaluation.painVAS")}>
            <span className="evaluation-pain-vas-grid__corner" aria-hidden />
            <span className="evaluation-pain-vas-grid__colhead">
              {tt("evaluation.left")}
            </span>
            <span className="evaluation-pain-vas-grid__colhead">
              {tt("evaluation.right")}
            </span>
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
            ].map(({ key, label }, idx) => (
              <Fragment key={key}>
                <span
                  className={`evaluation-pain-vas-grid__rowlabel${
                    idx === 0 ? " evaluation-pain-vas-grid__rowlabel--first" : ""
                  }`}
                >
                  {label}
                </span>
                <Score10
                  compact
                  hideLabel
                  label={`${label} — ${tt("evaluation.left")}`}
                  value={d.sinistro?.dolore?.[key]}
                  onChange={(v) => updateDolore(d.id, "sinistro", key, v)}
                />
                <Score10
                  compact
                  hideLabel
                  label={`${label} — ${tt("evaluation.right")}`}
                  value={d.destro?.dolore?.[key]}
                  onChange={(v) => updateDolore(d.id, "destro", key, v)}
                />
              </Fragment>
            ))}
          </div>
        </div>
      )}

      {block.type === "GENERAL_PAIN" && (
        <div className="evaluation-block-general-pain">
          <strong className="evaluation-pain-vas-title">
            {tt("evaluation.generalPainVAS")}
          </strong>
          <Score10
            compact
            min={1}
            max={10}
            label={tt("evaluation.painVAS")}
            value={d.doloreGeneraleVAS || ""}
            onChange={(v) => patchDistretto(d.id, { doloreGeneraleVAS: v })}
          />
        </div>
      )}
    </article>
  );
}

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
    <div className="evaluation-form">
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

        <div style={{ marginTop: 18 }}>
          <Select
            label={tt("evaluation.district")}
            value={distrettoToAdd}
            onChange={setDistrettoToAdd}
            options={distretti.map((d) => ({
              value: d,
              label:
                tt(`options.distretti.${d}`) ||
                tt(`options.distretti.${d.toLowerCase()}`) ||
                d,
            }))}
          />

          <button type="button" onClick={addDistretto} style={{ marginTop: 10 }}>
            {tt("evaluation.addDistrict")}
          </button>
        </div>
      </Section>

      {evaluationForm.distretti.map((d) => (
        <Section
          key={d.id}
          title={
            tt(`options.distretti.${d.nome}`) ||
            tt(`options.distretti.${String(d.nome).toLowerCase()}`) ||
            d.nome
          }
        >
          <button onClick={() => removeDistretto(d.id)}>
            {tt("evaluation.removeDistrict")}
          </button>

          <div
            className="evaluation-blocks-stack"
            style={{ marginTop: 15 }}
            data-eval-ui="blocks-v2"
          >
            {(d.blocks || []).map((block) => (
              <EvaluationBlockCard
                key={block.id}
                tt={tt}
                block={block}
                d={d}
                evaluationForm={evaluationForm}
                setEvaluationForm={setEvaluationForm}
                updateScore={updateScore}
                updateDolore={updateDolore}
                patchDistretto={patchDistretto}
              />
            ))}

            <button
              type="button"
              style={{ alignSelf: "flex-start" }}
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
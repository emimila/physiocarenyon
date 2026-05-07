import { Fragment, useEffect, useRef, useState } from "react";
import { uid } from "../../utils/helpers";
import Input from "../ui/Input";
import Select from "../ui/Select";
import Textarea from "../ui/Textarea";
import Score10 from "../ui/Score10";
import SideScores from "./SideScores";
import { distretti } from "../../data/options";

/** Un blocco: scelta tipo, poi griglia dati; note opzionali sempre sotto la griglia del tipo selezionato. */
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

  function patchBlockNote(value) {
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
    });
  }

  const noteTextarea = (
    <div style={{ marginTop: 12 }}>
      <Textarea
        compact
        fullWidth
        label={tt("evaluation.otherDetailsOptional")}
        value={block.noteAltro || ""}
        onChange={patchBlockNote}
      />
    </div>
  );

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
          {noteTextarea}
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
          {noteTextarea}
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
          {noteTextarea}
        </div>
      )}
    </article>
  );
}

const EVALUATION_BLOCK_TYPE_IDS = ["KIVIAT", "PAIN_VAS", "GENERAL_PAIN"];

export default function EvaluationForm({
  tt,
  evaluationForm,
  setEvaluationForm,
  addDistrettoWithFirstBlock,
  removeDistretto,
  updateScore,
  saveEvaluation,
  cancel,
}) {
  const [pickDistretto, setPickDistretto] = useState("");
  const [pickBlockType, setPickBlockType] = useState("");
  const pickDistrettoRef = useRef("");
  const pickBlockTypeRef = useRef("");

  useEffect(() => {
    pickDistrettoRef.current = pickDistretto;
  }, [pickDistretto]);
  useEffect(() => {
    pickBlockTypeRef.current = pickBlockType;
  }, [pickBlockType]);

  function clearDistrictPickers() {
    pickDistrettoRef.current = "";
    pickBlockTypeRef.current = "";
    setPickDistretto("");
    setPickBlockType("");
  }

  function tryFlushDistrictAdd() {
    const d = pickDistrettoRef.current;
    const b = pickBlockTypeRef.current;
    if (!d || !b) return;
    addDistrettoWithFirstBlock(d, b);
    clearDistrictPickers();
  }

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
            <strong>{tt("evaluation.number")}:</strong>{" "}
            {evaluationForm.numeroValutazione || "—"}
          </p>
          <div style={{ flex: "1 1 220px", maxWidth: 420 }}>
            <Input
              label={tt("evaluation.date")}
              type="date"
              value={evaluationForm.data}
              onChange={(v) =>
                setEvaluationForm({ ...evaluationForm, data: v })
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
                if (v && pickBlockTypeRef.current) tryFlushDistrictAdd();
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
              label={tt("evaluation.possibleEvaluations")}
              value={pickBlockType}
              onChange={(v) => {
                pickBlockTypeRef.current = v;
                setPickBlockType(v);
                if (v && pickDistrettoRef.current) tryFlushDistrictAdd();
              }}
              options={[
                { value: "", label: "--" },
                ...EVALUATION_BLOCK_TYPE_IDS.map((id) => ({
                  value: id,
                  label: tt(`evaluation.blockType.${id}`) || id,
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

        {evaluationForm.distretti.map((d, idx) => (
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

            <div
              className="evaluation-blocks-stack"
              style={{ marginTop: 4 }}
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
                <button type="button" onClick={saveEvaluation}>
                  {tt("evaluation.saveEvaluation")}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
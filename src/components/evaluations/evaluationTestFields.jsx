import { uid } from "../../utils/helpers";
import Input from "../ui/Input";
import Select from "../ui/Select";
import { strengthLiftExerciseIds } from "../../data/options";
import { assessGrip } from "../../utils/gripAssessment";
import { epleyOneRmKg, formatOneRmKg } from "../../utils/epley1rm";

export const OTHER_EXERCISE = "__other_exercise__";

export function StrengthMaximalsEvaluationFields({
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
      <p className="evaluation-help-text">
        {tt("tests.strengthMaximals.epleyFootnote")}
      </p>

      {lifts.map((line) => {
        const oneRm = epleyOneRmKg(line.weightKg, line.reps);
        const oneRmLabel = formatOneRmKg(oneRm) ?? "—";

        return (
          <div key={line.id} className="evaluation-lift-card">
            <div className="evaluation-lift-inner-grid">
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

            <div className="evaluation-lift-inner-grid evaluation-lift-inner-grid--spaced">
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

            <p style={{ marginTop: 10, fontSize: "0.875rem", color: "var(--text)" }}>
              <strong style={{ color: "var(--text-h)", fontWeight: 600 }}>
                {tt("tests.strengthMaximals.theor1RM")}:
              </strong>{" "}
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

export function GripStrengthEvaluationFields({
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
          <div className="evaluation-side-heading">{tt("evaluation.left")}</div>
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

        <div>
          <div className="evaluation-side-heading">{tt("evaluation.right")}</div>
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
      </div>

      <div className="evaluation-grip-summary">
        <div className="evaluation-side-heading" style={{ marginBottom: 4 }}>
          {tt("tests.gripStrength.summary") ?? "Risultato"}
        </div>

        <p style={{ marginTop: 4 }}>
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
            <span className="evaluation-grip-hint">
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
            <span className="evaluation-grip-hint">
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
            <span className="evaluation-grip-hint">
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
          <p className="evaluation-grip-hint evaluation-grip-hint--footer">
            {tt("grip.referenceShort")}
          </p>
        )}
      </div>
    </div>
  );
}

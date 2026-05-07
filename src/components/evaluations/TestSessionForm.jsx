import Section from "../ui/Section";
import Input from "../ui/Input";
import Select from "../ui/Select";
import Textarea from "../ui/Textarea";
import { distretti } from "../../data/options";
import DistrictTestsPanel from "./DistrictTestsPanel";

export default function TestSessionForm({
  tt,
  patient,
  testSessionForm,
  setTestSessionForm,
  distrettoToAdd,
  setDistrettoToAdd,
  addDistretto,
  removeDistretto,
  saveTestSession,
  cancel,
}) {
  return (
    <div className="evaluation-form">
      <h2>{tt("testSession.title")}</h2>

      <Section title={tt("testSession.sectionTitle")}>
        <Input
          label={tt("testSession.date")}
          type="date"
          value={testSessionForm.data}
          onChange={(v) =>
            setTestSessionForm({ ...testSessionForm, data: v })
          }
        />

        <p style={{ margin: "6px 0 10px" }}>
          <strong>{tt("testSession.number")}:</strong>{" "}
          {testSessionForm.numeroTest || "—"}
        </p>

        <Textarea
          label={tt("testSession.notes")}
          value={testSessionForm.note}
          onChange={(v) =>
            setTestSessionForm({ ...testSessionForm, note: v })
          }
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

      {testSessionForm.distretti.map((d) => (
        <Section
          key={d.id}
          title={
            tt(`options.distretti.${d.nome}`) ||
            tt(`options.distretti.${String(d.nome).toLowerCase()}`) ||
            d.nome
          }
          titleAside={
            <button type="button" onClick={() => removeDistretto(d.id)}>
              {tt("evaluation.removeDistrict")}
            </button>
          }
        >
          <DistrictTestsPanel
            tt={tt}
            patient={patient}
            d={d}
            evaluationForm={testSessionForm}
            setEvaluationForm={setTestSessionForm}
          />
        </Section>
      ))}

      <button type="button" onClick={saveTestSession}>
        {tt("testSession.save")}
      </button>{" "}
      <button type="button" onClick={cancel}>
        {tt("common.cancel")}
      </button>
    </div>
  );
}

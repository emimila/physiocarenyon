import { assessGrip } from "./utils/gripAssessment";
import html2pdf from "html2pdf.js";
import ReportView from "./components/reports/ReportView";
import { useEffect, useMemo, useRef, useState } from "react";
import DataBackup from "./components/storage/DataBackup";
import { getText } from "./i18n";
import EvaluationForm from "./components/evaluations/EvaluationForm";
import Textarea from "./components/ui/Textarea";
import Section from "./components/ui/Section";
import SelectWithLabels from "./components/ui/SelectWithLabels";
import Select from "./components/ui/Select";
import Input from "./components/ui/Input";
import { createEvaluation, createDistretto } from "./utils/factories";
import {
  uid,
  calcBMI,
  bmiCategory,
  timeSince,
  calculateYBalance,
  classifyYBalance,
} from "./utils/helpers";
import { sportOptions, tegnerInfo } from "./data/options";

const STORAGE_KEY = "physiocare_nyon_stabile";

const emptyPatient = {
  id: "",
  nome: "",
  cognome: "",
  sesso: "",
  dataNascita: "",
  sportMultipli: [],
  sportAltro: "",
  tegner: "",
  oreSport: "",
  peso: "",
  altezza: "",
  manoDominante: "",
  diagnosi: "",
  diagnosiDettagli: "",
  diagnostica: "",
  diagnosticaDettagli: "",
  dataInfortunio: "",
  dataOperazione: "",
  artoOperato: "",
  tipoOperazione: "",
  variazionePeso: "",
motivoVariazionePeso: "",

manoDestraForza1: "",
manoDestraForza2: "",
manoDestraForza3: "",
manoSinistraForza1: "",
manoSinistraForza2: "",
manoSinistraForza3: "",

dominioLavoro: "",
rischiProfessionali: "",
motivoAccesso: "",

sportLivello: "",
running10km: "",
runningMezza: "",
runningMaratona: "",

fitnessTipo: "",
squatSerie: "",
squatRipetizioni: "",
squatPeso: "",
pancaSerie: "",
pancaRipetizioni: "",
pancaPeso: "",
deadliftSerie: "",
deadliftRipetizioni: "",
deadliftPeso: "",
  valutazioni: [],
  
};

export default function App() {
  const [patients, setPatients] = useState(() => {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  });

  const [query, setQuery] = useState("");
  const [lang, setLang] = useState("it");
  const tt = getText(lang);

  const [selected, setSelected] = useState(null);
  const [editingPatient, setEditingPatient] = useState(false);
  const [editingEvaluation, setEditingEvaluation] = useState(false);
  const [form, setForm] = useState(emptyPatient);
  const [evaluationForm, setEvaluationForm] = useState(createEvaluation());
  const [distrettoToAdd, setDistrettoToAdd] = useState("");

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(patients));
  }, [patients]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return patients.filter((p) =>
      `${p.nome} ${p.cognome} ${(p.sportMultipli || []).join(" ")}`
        .toLowerCase()
        .includes(q)
    );
  }, [patients, query]);

  function syncSelected(updatedPatient) {
    setPatients((prev) =>
      prev.map((p) => (p.id === updatedPatient.id ? updatedPatient : p))
    );
    setSelected(updatedPatient);
  }

  function update(key, value) {
    setForm({ ...form, [key]: value });
  }

  function newPatient() {
    setForm({ ...emptyPatient, id: uid() });
    setSelected(null);
    setEditingPatient(true);
    setEditingEvaluation(false);
  }

  function editPatient(p) {
    setForm({
      ...p,
      sportMultipli: p.sportMultipli || [],
      valutazioni: p.valutazioni || [],
    });
    setSelected(p);
    setEditingPatient(true);
    setEditingEvaluation(false);
  }

  function savePatient() {
    if (!form.nome.trim() || !form.cognome.trim()) {
      alert("Nome e cognome sono obbligatori");
      return;
    }

    const cleanForm = {
      ...form,
      valutazioni: form.valutazioni || [],
      sportMultipli: form.sportMultipli || [],
    };

    const exists = patients.some((p) => p.id === cleanForm.id);
    const updatedPatients = exists
      ? patients.map((p) => (p.id === cleanForm.id ? cleanForm : p))
      : [...patients, cleanForm];

    setPatients(updatedPatients);
    setSelected(cleanForm);
    setEditingPatient(false);
  }

  function removePatient(id) {
    if (!confirm("Eliminare paziente?")) return;
    setPatients(patients.filter((p) => p.id !== id));
    setSelected(null);
  }

  function startNewEvaluation() {
    if (!selected) return;

    const nextVal =
      Math.max(
        0,
        ...(selected.valutazioni || []).map((v) =>
          Number(v.numeroValutazione || 0)
        )
      ) + 1;

    setEvaluationForm(createEvaluation(String(nextVal)));
    setDistrettoToAdd("");
    setEditingEvaluation(true);
    setEditingPatient(false);
  }

  function editEvaluation(ev) {
    setEvaluationForm(JSON.parse(JSON.stringify(ev)));
    setDistrettoToAdd("");
    setEditingEvaluation(true);
    setEditingPatient(false);
  }

  function addDistretto() {
    if (!distrettoToAdd) return;

    const alreadyExists = evaluationForm.distretti.some(
      (d) => d.nome === distrettoToAdd
    );

    if (alreadyExists) {
      alert("Questo distretto è già presente nella valutazione.");
      return;
    }

    setEvaluationForm({
      ...evaluationForm,
      distretti: [...evaluationForm.distretti, createDistretto(distrettoToAdd)],
    });

    setDistrettoToAdd("");
  }

  function removeDistretto(id) {
    setEvaluationForm({
      ...evaluationForm,
      distretti: evaluationForm.distretti.filter((d) => d.id !== id),
    });
  }

  function updateScore(distrettoId, lato, key, value) {
    setEvaluationForm({
      ...evaluationForm,
      distretti: evaluationForm.distretti.map((d) =>
        d.id === distrettoId
          ? {
              ...d,
              [lato]: {
                ...d[lato],
                [key]: value,
              },
            }
          : d
      ),
    });
  }

  function saveEvaluation() {
    if (!selected) return;

    if (evaluationForm.distretti.length === 0) {
      alert("Aggiungi almeno un distretto.");
      return;
    }

    const existing = (selected.valutazioni || []).some(
      (v) => v.id === evaluationForm.id
    );

    const valutazioni = existing
      ? selected.valutazioni.map((v) =>
          v.id === evaluationForm.id ? evaluationForm : v
        )
      : [...(selected.valutazioni || []), evaluationForm];

    const updatedPatient = { ...selected, valutazioni };
    syncSelected(updatedPatient);
    setEditingEvaluation(false);
  }

  function deleteEvaluation(id) {
    if (!confirm("Eliminare valutazione?")) return;

    const updatedPatient = {
      ...selected,
      valutazioni: (selected.valutazioni || []).filter((v) => v.id !== id),
    };

    syncSelected(updatedPatient);
  }

  return (
    <div

  style={{

    padding: 20,

    fontFamily: "Arial",

    maxWidth: 1200,

    margin: "0 auto",

    fontSize: "14px",

  }}

>
<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
  <h1>{tt("app.title")}</h1>

  <select value={lang} onChange={(e) => setLang(e.target.value)}>
    <option value="it">Italiano</option>
    <option value="fr">Français</option>
    <option value="de">Deutsch</option>
    <option value="es">Español</option>
    <option value="en">English</option>
  </select>
</div>
  
      
  
      {selected && selected.valutazioni?.[0] && (
        <div>
          <div style={{ position: "absolute", left: "-9999px", top: 0 }}>
            <ReportView
              patient={selected}
              evaluation={selected.valutazioni[0]}
            />
          </div>
  
          
        </div>
      )}
  
      

<p>{tt("app.subtitle")}</p>

<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
    <button onClick={newPatient}>
      {tt("common.newPatient")}
    </button>

    <input
      placeholder={tt("common.searchPatient")}
      value={query}
      onChange={(e) => setQuery(e.target.value)}
      style={{ padding: 8 }}
    />
  </div>

  <div style={{ display: "flex", gap: 6 }}>
    <DataBackup patients={patients} setPatients={setPatients} compact />
  </div>
</div>

      <hr />

      <div style={{ display: "flex", gap: 20 }}>
        <div style={{ width: 280 }}>
        <h3>{tt("app.patients")}</h3>

          {filtered.map((p) => (
            <div
              key={p.id}
              onClick={() => {
                setSelected(p);
                setEditingPatient(false);
                setEditingEvaluation(false);
              }}
              style={{
                padding: 10,
                border: "1px solid #ccc",
                marginBottom: 6,
                cursor: "pointer",
                borderRadius: 8,
              }}
            >
              <strong>
                {p.cognome} {p.nome}
              </strong>
              <br />
              <small>
  {(p.valutazioni || []).length} {tt("evaluation.evaluations")}
</small>
            </div>
          ))}
        </div>

        <div style={{ flex: 1 }}>
          {editingPatient && (
            <PatientForm
            tt={tt}
              form={form}
              update={update}
              setForm={setForm}
              savePatient={savePatient}
              cancel={() => setEditingPatient(false)}
            />
          )}

          {editingEvaluation && selected && (
            <EvaluationForm
              tt={tt}
              evaluationForm={evaluationForm}
              setEvaluationForm={setEvaluationForm}
              distrettoToAdd={distrettoToAdd}
              setDistrettoToAdd={setDistrettoToAdd}
              addDistretto={addDistretto}
              removeDistretto={removeDistretto}
              updateScore={updateScore}
              saveEvaluation={saveEvaluation}
              cancel={() => setEditingEvaluation(false)}
            />
          )}

{selected && !editingPatient && !editingEvaluation && (
              <PatientDetail
              selected={selected}
              tt={tt}
              editPatient={editPatient}
              removePatient={removePatient}
              startNewEvaluation={startNewEvaluation}
              editEvaluation={editEvaluation}
              deleteEvaluation={deleteEvaluation}
            />
          )}

          {!selected && !editingPatient && !editingEvaluation && (
            <p>{tt("app.noSelection")}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function PatientForm({ form, update, setForm, savePatient, cancel, tt }) {
  const bmi = calcBMI(form.peso, form.altezza);

  function t(path, fallback) {
    return tt(path) || fallback;
  }

  function option(path, value) {
    return {
      value,
      label: t(`${path}.${value}`, value),
    };
  }

  const sexOptions = ["Uomo", "Donna", "Altro", "Non specificato"].map((v) =>
    option("options.sex", v)
  );

  const sportOptionsTranslated = sportOptions.map((sport) => ({
    value: sport,
    label: t(`options.sport.${sport}`, sport),
  }));

  const weeklySportOptions = [
    "0",
    "1-3 ore",
    "3-5 ore",
    "5-7 ore",
    "7+ ore",
  ].map((v) => option("options.weeklySportHours", v));

  const dominantHandOptions = ["Destra", "Sinistra", "Ambidestro"].map((v) =>
    option("options.dominantHand", v)
  );

  const yesNoOptions = ["No", "Sì"].map((v) => option("options.yesNo", v));

  const sportLevelOptions = ["Amatoriale", "Professionale"].map((v) =>
    option("options.sportLevel", v)
  );

  const accessReasonOptions = ["Referral", "Già cliente", "Internet"].map((v) =>
    option("options.accessReason", v)
  );

  const fitnessTypeOptions = ["Macchine", "Pesi liberi", "Corsi"].map((v) =>
    option("options.fitnessType", v)
  );

  const diagnosisOptions = [
    "Lombalgia",
    "Cervicalgia",
    "Cervico-brachialgia",
    "Sciatalgia",
    "Tendinopatia",
    "Distorsione",
    "Lesione muscolare",
    "Frattura",
    "Post-operatorio",
    "LCA",
    "Menisco",
    "Cuffia dei rotatori",
    "Instabilità spalla",
    "Protesi anca",
    "Protesi ginocchio",
    "Altro",
  ].map((v) => option("options.diagnosis", v));

  const imagingOptions = [
    "Nessuna",
    "RX",
    "RMN",
    "Ecografia",
    "TAC",
    "Infiltrazione",
    "EMG",
    "Referto medico",
    "Altro",
  ].map((v) => option("options.imaging", v));

  const operatedLimbOptions = [
    "Non operato",
    "Spalla destra",
    "Spalla sinistra",
    "Gomito destro",
    "Gomito sinistro",
    "Polso/mano destra",
    "Polso/mano sinistra",
    "Anca destra",
    "Anca sinistra",
    "Ginocchio destro",
    "Ginocchio sinistro",
    "Caviglia/piede destro",
    "Caviglia/piede sinistro",
    "Rachide",
    "Altro",
  ].map((v) => option("options.operatedLimb", v));

  const surgeryTypeOptions = [
    "Nessuna",
    "Artroscopia",
    "Ricostruzione legamentosa",
    "Sutura tendinea",
    "Protesi",
    "Osteotomia",
    "Stabilizzazione",
    "Decompressione",
    "Meniscectomia",
    "Riparazione meniscale",
    "Altro",
  ].map((v) => option("options.surgeryType", v));

  return (
    <div>
      <h2>{t("patient.title", "Scheda paziente")}</h2>

      <Section title={t("patient.identity", "Identità")}>
        <Input
          label={t("patient.firstName", "Nome")}
          value={form.nome}
          onChange={(v) => update("nome", v)}
        />

        <Input
          label={t("patient.lastName", "Cognome")}
          value={form.cognome}
          onChange={(v) => update("cognome", v)}
        />

        <Select
          label={t("patient.sex", "Sesso")}
          value={form.sesso}
          onChange={(v) => update("sesso", v)}
          options={sexOptions}
        />

        <Input
          label={t("patient.birthDate", "Data di nascita")}
          type="date"
          value={form.dataNascita}
          onChange={(v) => update("dataNascita", v)}
        />
      </Section>

      <Section title={t("patient.physicalData", "Dati fisici")}>
        <Input
          label={t("patient.weight", "Peso (kg)")}
          type="number"
          value={form.peso}
          onChange={(v) => update("peso", v)}
        />

        <Select
          label={t(
            "patient.weightChange",
            "Variazione di peso negli ultimi mesi?"
          )}
          value={form.variazionePeso}
          onChange={(v) => update("variazionePeso", v)}
          options={yesNoOptions}
        />

        {form.variazionePeso === "Sì" && (
          <Textarea
            label={t("patient.weightChangeReason", "Perché?")}
            value={form.motivoVariazionePeso}
            onChange={(v) => update("motivoVariazionePeso", v)}
          />
        )}

        <Input
          label={t("patient.height", "Altezza (cm)")}
          type="number"
          value={form.altezza}
          onChange={(v) => update("altezza", v)}
        />

        {bmi && (
          <p>
            <strong>{t("patient.bmi", "BMI")}:</strong> {bmi} (
            {bmiCategory(bmi)})
          </p>
        )}

        <Select
          label={t("patient.dominantHand", "Mano dominante")}
          value={form.manoDominante}
          onChange={(v) => update("manoDominante", v)}
          options={dominantHandOptions}
        />

        <h4>{t("patient.rightHandDynamometer", "Dinamometro mano destra")}</h4>

        <Input
          label={t("patient.trial1", "Prova 1")}
          type="number"
          value={form.manoDestraForza1}
          onChange={(v) => update("manoDestraForza1", v)}
        />

        <Input
          label={t("patient.trial2", "Prova 2")}
          type="number"
          value={form.manoDestraForza2}
          onChange={(v) => update("manoDestraForza2", v)}
        />

        <Input
          label={t("patient.trial3", "Prova 3")}
          type="number"
          value={form.manoDestraForza3}
          onChange={(v) => update("manoDestraForza3", v)}
        />

        <h4>{t("patient.leftHandDynamometer", "Dinamometro mano sinistra")}</h4>

        <Input
          label={t("patient.trial1", "Prova 1")}
          type="number"
          value={form.manoSinistraForza1}
          onChange={(v) => update("manoSinistraForza1", v)}
        />

        <Input
          label={t("patient.trial2", "Prova 2")}
          type="number"
          value={form.manoSinistraForza2}
          onChange={(v) => update("manoSinistraForza2", v)}
        />

        <Input
          label={t("patient.trial3", "Prova 3")}
          type="number"
          value={form.manoSinistraForza3}
          onChange={(v) => update("manoSinistraForza3", v)}
        />
      </Section>

      <Section title={t("patient.workEducation", "Dominio di lavoro / formazione")}>
        <Input
          label={t("patient.workEducation", "Dominio di lavoro / formazione")}
          value={form.dominioLavoro}
          onChange={(v) => update("dominioLavoro", v)}
        />

        <Textarea
          label={t(
            "patient.professionalRiskNotes",
            "Note su eventuali rischi professionali"
          )}
          value={form.rischiProfessionali}
          onChange={(v) => update("rischiProfessionali", v)}
        />

        <Select
          label={t("patient.accessReason", "Perché sei da noi?")}
          value={form.motivoAccesso}
          onChange={(v) => update("motivoAccesso", v)}
          options={accessReasonOptions}
        />
      </Section>

      <Section title={t("patient.sportLevel", "Sport e livello")}>
        <label>
          <strong>{t("patient.sports", "Sport praticati")}</strong>
        </label>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: 6,
            marginBottom: 10,
          }}
        >
          {sportOptionsTranslated.map((sport) => (
            <label key={sport.value}>
              <input
                type="checkbox"
                checked={(form.sportMultipli || []).includes(sport.value)}
                onChange={(e) => {
                  const current = form.sportMultipli || [];
                  setForm({
                    ...form,
                    sportMultipli: e.target.checked
                      ? [...current, sport.value]
                      : current.filter((s) => s !== sport.value),
                  });
                }}
              />{" "}
              {sport.label}
            </label>
          ))}
        </div>

        <Select
          label={t("patient.sportPracticeLevel", "Livello sportivo")}
          value={form.sportLivello}
          onChange={(v) => update("sportLivello", v)}
          options={sportLevelOptions}
        />

        {(form.sportMultipli || []).some(s => s.toLowerCase() === "running") && (
          <>
            <h4>{t("patient.running", "Running")}</h4>

            <Input
              label={t("patient.running10km", "Tempo sui 10 km")}
              value={form.running10km}
              onChange={(v) => update("running10km", v)}
            />

            <Input
              label={t("patient.runningHalfMarathon", "Tempo mezza maratona")}
              value={form.runningMezza}
              onChange={(v) => update("runningMezza", v)}
            />

            <Input
              label={t("patient.runningMarathon", "Tempo maratona")}
              value={form.runningMaratona}
              onChange={(v) => update("runningMaratona", v)}
            />
          </>
        )}

        {(form.sportMultipli || []).some(s => s.toLowerCase() === "fitness") && (
          <>
            <h4>{t("patient.fitness", "Fitness")}</h4>

            <Select
              label={t("patient.fitnessType", "Tipo di fitness")}
              value={form.fitnessTipo}
              onChange={(v) => update("fitnessTipo", v)}
              options={fitnessTypeOptions}
            />

            {form.fitnessTipo === "Pesi liberi" && (
              <>
                <h4>{t("patient.freeWeights", "Pesi liberi")}</h4>

                <Input
                  label={t("patient.squatSets", "Squat — serie")}
                  type="number"
                  value={form.squatSerie}
                  onChange={(v) => update("squatSerie", v)}
                />

                <Input
                  label={t("patient.squatReps", "Squat — ripetizioni")}
                  type="number"
                  value={form.squatRipetizioni}
                  onChange={(v) => update("squatRipetizioni", v)}
                />
<Input
  label={t("patient.squatWeight", "Squat — peso sollevato")}
  type="number"
  value={form.squatPeso}
  onChange={(v) => update("squatPeso", v)}
/>
                <Input
                  label={t("patient.benchSets", "Panca piana — serie")}
                  type="number"
                  value={form.pancaSerie}
                  onChange={(v) => update("pancaSerie", v)}
                />

                <Input
                  label={t("patient.benchReps", "Panca piana — ripetizioni")}
                  type="number"
                  value={form.pancaRipetizioni}
                  onChange={(v) => update("pancaRipetizioni", v)}
                />

<Input
  label={t("patient.benchWeight", "Panca piana — peso sollevato")}
  type="number"
  value={form.pancaPeso}
  onChange={(v) => update("pancaPeso", v)}
/>

                <Input
                  label={t("patient.deadliftSets", "Deadlift — serie")}
                  type="number"
                  value={form.deadliftSerie}
                  onChange={(v) => update("deadliftSerie", v)}
                />

<Input
  label={t("patient.deadliftReps", "Deadlift — ripetizioni")}
  type="number"
  value={form.deadliftRipetizioni}
  onChange={(v) => update("deadliftRipetizioni", v)}
/>

<Input
  label={t("patient.deadliftWeight", "Deadlift — peso sollevato")}
  type="number"
  value={form.deadliftPeso}
  onChange={(v) => update("deadliftPeso", v)}
/>
              </>
            )}
          </>
        )}

        <Input
          label={t("patient.otherSports", "Altri sport / dettagli")}
          value={form.sportAltro}
          onChange={(v) => update("sportAltro", v)}
        />

        <Select
          label={t("patient.tegner", "Scala Tegner")}
          value={form.tegner}
          onChange={(v) => update("tegner", v)}
          options={["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"]}
        />

{form.tegner !== "" && form.tegner != null && (
  <p>
    <strong>{t("patient.tegnerDefinition")}:</strong>{" "}
    {t(`options.tegner.${form.tegner}`) || tegnerInfo[form.tegner]}
  </p>
)}

        <div
          style={{
            fontSize: 13,
            background: "#f5f5f5",
            padding: 10,
            borderRadius: 8,
            marginBottom: 10,
          }}
        >
          <strong>{t("patient.tegnerGuide", "Guida scala Tegner")}:</strong>

          {Object.entries(tegnerInfo).map(([k, v]) => (
            <div key={k}>
              {k} = {t(`options.tegner.${k}`, v)}
            </div>
          ))}
        </div>

        <Select
          label={t("patient.weeklySportHours", "Ore settimanali di sport")}
          value={form.oreSport}
          onChange={(v) => update("oreSport", v)}
          options={weeklySportOptions}
        />
      </Section>

      <Section title={t("patient.clinicalFrame", "Quadro clinico")}>
        <Select
          label={t("patient.diagnosis", "Diagnosi / problema principale")}
          value={form.diagnosi}
          onChange={(v) => update("diagnosi", v)}
          options={diagnosisOptions}
        />

<Select
  label={tt("evaluation.district")}
  value={form.distrettoDiagnosi}
  onChange={(v) => update("distrettoDiagnosi", v)}
  options={[
    { value: "anca_destra", label: `${tt("options.distretti.anca")} ${tt("evaluation.right")}` },
    { value: "anca_sinistra", label: `${tt("options.distretti.anca")} ${tt("evaluation.left")}` },

    { value: "ginocchio_destro", label: `${tt("options.distretti.ginocchio")} ${tt("evaluation.right")}` },
    { value: "ginocchio_sinistro", label: `${tt("options.distretti.ginocchio")} ${tt("evaluation.left")}` },

    { value: "caviglia_destra", label: `${tt("options.distretti.caviglia")} ${tt("evaluation.right")}` },
    { value: "caviglia_sinistra", label: `${tt("options.distretti.caviglia")} ${tt("evaluation.left")}` },

    { value: "piede_destro", label: `${tt("options.distretti.piede")} ${tt("evaluation.right")}` },
    { value: "piede_sinistro", label: `${tt("options.distretti.piede")} ${tt("evaluation.left")}` },

    { value: "spalla_destra", label: `${tt("options.distretti.spalla")} ${tt("evaluation.right")}` },
    { value: "spalla_sinistra", label: `${tt("options.distretti.spalla")} ${tt("evaluation.left")}` },

    { value: "gomito_destro", label: `${tt("options.distretti.gomito")} ${tt("evaluation.right")}` },
    { value: "gomito_sinistro", label: `${tt("options.distretti.gomito")} ${tt("evaluation.left")}` },

    { value: "polso_destro", label: `${tt("options.distretti.polso")} ${tt("evaluation.right")}` },
    { value: "polso_sinistro", label: `${tt("options.distretti.polso")} ${tt("evaluation.left")}` },

    { value: "mano_destra", label: `${tt("options.distretti.mano")} ${tt("evaluation.right")}` },
    { value: "mano_sinistra", label: `${tt("options.distretti.mano")} ${tt("evaluation.left")}` },

    { value: "cervicale", label: tt("options.distretti.cervicale") },
    { value: "toracica", label: tt("options.distretti.toracica") },
    { value: "lombare", label: tt("options.distretti.lombare") },
  ]}
/>

        <Textarea
          label={t("patient.diagnosisDetails", "Dettagli diagnosi")}
          value={form.diagnosiDettagli}
          onChange={(v) => update("diagnosiDettagli", v)}
        />

        <Select
          label={t("patient.imaging", "Diagnostica")}
          value={form.diagnostica}
          onChange={(v) => update("diagnostica", v)}
          options={imagingOptions}
        />

        <Textarea
          label={t("patient.imagingDetails", "Dettagli diagnostica")}
          value={form.diagnosticaDettagli}
          onChange={(v) => update("diagnosticaDettagli", v)}
        />

        <Input
          label={t("patient.injuryDate", "Data infortunio")}
          type="date"
          value={form.dataInfortunio}
          onChange={(v) => update("dataInfortunio", v)}
        />

        {form.dataInfortunio && (
          <p>
            <strong>{t("patient.timeSinceInjury", "Tempo da infortunio")}:</strong>{" "}
            {timeSince(form.dataInfortunio, tt)}
          </p>
        )}

        <Input
          label={t("patient.surgeryDate", "Data operazione chirurgica")}
          type="date"
          value={form.dataOperazione}
          onChange={(v) => update("dataOperazione", v)}
        />

        {form.dataOperazione && (
          <p>
            <strong>{t("patient.timeSinceSurgery", "Tempo post-operatorio")}:</strong>{" "}
            {timeSince(form.dataOperazione, tt)}
          </p>
        )}

        <Select
          label={t("patient.operatedLimb", "Arto operato / localizzazione")}
          value={form.artoOperato}
          onChange={(v) => update("artoOperato", v)}
          options={operatedLimbOptions}
        />

        <Select
          label={t("patient.surgeryType", "Tipo operazione")}
          value={form.tipoOperazione}
          onChange={(v) => update("tipoOperazione", v)}
          options={surgeryTypeOptions}
        />
      </Section>

      <button onClick={savePatient}>{t("common.save", "Salva")}</button>{" "}
      <button onClick={cancel}>{t("common.cancel", "Annulla")}</button>
    </div>
  );
}

function PatientDetail({
  selected,
  tt,
  editPatient,
  removePatient,
  startNewEvaluation,
  editEvaluation,
  deleteEvaluation,
}) {
  const grip = assessGrip(selected);
  const pdfRef = useRef(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  async function exportPdf() {
    const element = pdfRef.current;
    if (!element) return;

    setIsExportingPdf(true);
    await new Promise((r) => requestAnimationFrame(() => r()));

    try {
      const opt = {
        margin: 0.5,
        filename: `${selected.nome}_${selected.cognome}.pdf`,
        html2canvas: { scale: 2 },
        jsPDF: { unit: "in", format: "a4", orientation: "portrait" },
      };

      await html2pdf().set(opt).from(element).save();
    } finally {
      setIsExportingPdf(false);
    }
  }

  return (
    <div ref={pdfRef} className={`pdf-root ${isExportingPdf ? "pdf-exporting" : ""}`}>
      <div className="pdf-controls no-pdf">
        <button onClick={exportPdf} disabled={isExportingPdf}>
          {isExportingPdf ? tt("common.loading", "Preparazione...") : tt("common.generatePdf")}
        </button>
      </div>

      <header className="pdf-header">
        <div className="pdf-brand">
          <img
            className="pdf-logo"
            src="/physiocare-nyon-logo.png"
            alt="Physiocare Nyon"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
          <div className="pdf-brandText">
            <div className="pdf-clinic">Physiocare Nyon</div>
            <div className="pdf-subtitle">{tt("app.subtitle") ?? ""}</div>
          </div>
        </div>
      </header>

      <h2>
  {selected.nome || "-"} {selected.cognome || "-"}{" "}
  {selected.dataNascita ? `— ${selected.dataNascita}` : ""}
</h2>

<p>
  <strong>{tt("patient.weight")}:</strong> {selected.peso || "-"} kg{" "}
  <strong>{tt("patient.height")}:</strong> {selected.altezza || "-"} cm{" "}
  <strong>{tt("patient.bmi")}:</strong>{" "}
  {calcBMI(selected.peso, selected.altezza) || "-"}
</p>

<p>
  <strong>{tt("patient.dominantHand")}:</strong>{" "}
  {tt(`options.dominantHand.${selected.manoDominante}`) || selected.manoDominante || "-"}
</p>

<p>
  <strong>{tt("grip.mean")}:</strong> {grip?.average ?? "-"} kg
</p>

<p>
  <strong>{tt("grip.percentile")} (kg):</strong>{" "}
  {grip?.absolutePercentile ? `P${grip.absolutePercentile}` : "-"}
</p>

<p>
  <strong>{tt("grip.percentile")} (kg/m²):</strong>{" "}
  {grip?.normalizedPercentile ? `P${grip.normalizedPercentile}` : "-"}
</p>

<p>
  <strong>{tt("grip.interpretation")}:</strong>{" "}
  {grip?.absoluteInterpretationKey
    ? tt(`grip.${grip.absoluteInterpretationKey}`) ||
      grip.absoluteInterpretationKey
    : "-"}
</p>

<p>
  <strong>{tt("grip.right")}:</strong> {grip?.bestRight ?? "-"} kg{" "}
  <strong>{tt("grip.left")}:</strong> {grip?.bestLeft ?? "-"} kg{" "}
  <strong>{tt("grip.best")}:</strong> {grip?.bestOverall ?? "-"} kg
</p>

<p>
  <strong>{tt("patient.sports")}:</strong>{" "}
  {(selected.sportMultipli || [])
    .map((s) => {
      const lower = String(s).toLowerCase();
      const upper = String(s).charAt(0).toUpperCase() + String(s).slice(1);
      return tt(`options.sport.${lower}`) || tt(`options.sport.${upper}`) || s;
    })
    .join(", ") || "-"}
  {selected.sportAltro ? `, ${selected.sportAltro}` : ""}
</p>

{(selected.sportMultipli || []).some(
  (s) => String(s).toLowerCase() === "running"
) && (
  <p>
    <strong>{tt("patient.running")}:</strong>{" "}
    {tt("patient.running10km")}: {selected.running10km || "-"}{" "}
    | {tt("patient.runningHalfMarathon")}: {selected.runningMezza || "-"}{" "}
    | {tt("patient.runningMarathon")}: {selected.runningMaratona || "-"}
  </p>
)}

{(selected.sportMultipli || []).some(
  (s) => String(s).toLowerCase() === "fitness"
) && (
  <p>
    <strong>{tt("patient.fitness")}:</strong>{" "}
    Squat: {selected.squatSerie || "-"} x {selected.squatRipetizioni || "-"} @{" "}
    {selected.squatPeso || "-"} kg | Bench: {selected.pancaSerie || "-"} x{" "}
    {selected.pancaRipetizioni || "-"} @ {selected.pancaPeso || "-"} kg |
    Deadlift: {selected.deadliftSerie || "-"} x{" "}
    {selected.deadliftRipetizioni || "-"} @ {selected.deadliftPeso || "-"} kg
  </p>
)}

<p>
  <strong>{tt("patient.tegner")}:</strong> {selected.tegner || "-"}{" "}
  {selected.tegner !== "" && selected.tegner != null
    ? `- ${tt(`options.tegner.${selected.tegner}`) || tegnerInfo[selected.tegner]}`
    : ""}
</p>

<p>
  <strong>{tt("patient.weeklySportHours")}:</strong>{" "}
  {tt(`options.weeklySportHours.${selected.oreSport}`) ||
    selected.oreSport ||
    "-"}
</p>

<p>
<strong>{tt("patient.diagnosisShort")}:</strong>{" "}
{tt(`options.diagnosis.${selected.diagnosi}`) || selected.diagnosi || "-"}{" "}
{selected.distrettoDiagnosi
  ? `— ${tt(`options.distretti.${selected.distrettoDiagnosi}`) || selected.distrettoDiagnosi}`
  : ""}
  {tt(`options.diagnosis.${selected.diagnosi}`) || selected.diagnosi || "-"}
</p>




<p>
  <strong>{tt("patient.diagnosisDetails")}:</strong>{" "}
  {selected.diagnosiDettagli || "-"}
</p>

<p>
  <strong>{tt("patient.imaging")}:</strong>{" "}
  {tt(`options.imaging.${selected.diagnostica}`) ||
    selected.diagnostica ||
    "-"}
</p>

<p>
  <strong>{tt("patient.injuryDate")}:</strong>{" "}
  {selected.dataInfortunio || "-"}{" "}
  {selected.dataInfortunio
    ? `— ${timeSince(selected.dataInfortunio, tt).replace("\n+", " + ")}`
    : ""}
</p>

<p>
  <strong>{tt("patient.surgeryDateShort")}:</strong>{" "}
  {selected.dataOperazione || "-"}{" "}
  {selected.dataOperazione
    ? `— ${timeSince(selected.dataOperazione, tt).replace("\n+ ", " + ")}`
    : ""}
</p>

<p>
  <strong>{tt("patient.operatedLimbShort")}:</strong>{" "}
  {tt(`options.operatedLimb.${selected.artoOperato}`) ||
    selected.artoOperato ||
    "-"}
</p>

<p>
  <strong>{tt("patient.surgeryType")}:</strong>{" "}
  {tt(`options.surgeryType.${selected.tipoOperazione}`) ||
    selected.tipoOperazione ||
    "-"}
</p>
      <button onClick={() => editPatient(selected)}>
        {tt("common.edit")}
      </button>{" "}
      <button onClick={() => removePatient(selected.id)}>
        {tt("common.delete")}
      </button>{" "}
      <button onClick={startNewEvaluation}>
        {tt("common.newEvaluation")}
      </button>

      <hr />

      <KiviatComparison selected={selected} tt={tt} />

      <h3>{tt("evaluation.evaluations")}</h3>

      {(selected.valutazioni || []).length === 0 && (
        <p>{tt("evaluation.noEvaluations")}</p>
      )}

      {(selected.valutazioni || []).map((v) => (
        <div
          key={v.id}
          style={{
            border: "1px solid #ccc",
            borderRadius: 10,
            padding: 12,
            marginBottom: 12,
          }}
        >
          <h4>{`${tt("evaluation.number")} ${v.numeroValutazione || "-"} — ${tt("evaluation.session")} ${v.sessione || "-"} — ${v.data || "-"}`}</h4>

          <p>
            <strong>{tt("evaluation.voucher")}:</strong>{" "}
            {v.buono || "-"}
          </p>

          {v.note && (
            <p>
              <strong>{tt("evaluation.notes")}:</strong> {v.note}
            </p>
          )}

          {(v.distretti || []).map((d) => (
            <div key={d.id} style={{ marginBottom: 10 }}>
              <strong>
  {tt(`options.distretti.${d.nome.toLowerCase()}`) || d.nome}
</strong>

              <table
                border="1"
                cellPadding="6"
                style={{
                  borderCollapse: "collapse",
                  marginTop: 5,
                  width: "100%",
                }}
              >
                <thead>
                  <tr>
                    <th></th>
                    <th>{tt("evaluation.strength")}</th>
                    <th>{tt("evaluation.function")}</th>
                    <th>{tt("evaluation.passiveMobilityShort")}</th>
                    <th>{tt("evaluation.activeMobilityShort")}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>{tt("evaluation.right")}</td>
                    <td>{d.destro?.forza || "-"}</td>
                    <td>{d.destro?.funzione || "-"}</td>
                    <td>{d.destro?.mobilitaPassiva || "-"}</td>
                    <td>{d.destro?.mobilitaAttiva || "-"}</td>
                  </tr>
                  <tr>
                    <td>{tt("evaluation.left")}</td>
                    <td>{d.sinistro?.forza || "-"}</td>
                    <td>{d.sinistro?.funzione || "-"}</td>
                    <td>{d.sinistro?.mobilitaPassiva || "-"}</td>
                    <td>{d.sinistro?.mobilitaAttiva || "-"}</td>
                  </tr>
                </tbody>
              </table>

              <div style={{ marginTop: 8 }}>
                <strong>{tt("evaluation.painVAS")}:</strong>

                <table
                  border="1"
                  cellPadding="6"
                  style={{
                    borderCollapse: "collapse",
                    marginTop: 5,
                    width: "100%",
                  }}
                >
                  <thead>
                    <tr>
                      <th>{tt("evaluation.rest")}</th>
                      <th>{tt("evaluation.morning")}</th>
                      <th>{tt("evaluation.evening")}</th>
                      <th>{tt("evaluation.duringActivity")}</th>
                      <th>{tt("evaluation.afterActivity")}</th>
                    </tr>
                  </thead>
                  <tbody>
  <tr>
    <td colSpan="5">
      <strong>{tt("evaluation.right")}</strong>
    </td>
  </tr>
  <tr>
    <td>{d.destro?.dolore?.riposo ?? d.dolore?.riposo ?? "-"}</td>
    <td>{d.destro?.dolore?.mattino ?? d.dolore?.mattino ?? "-"}</td>
    <td>{d.destro?.dolore?.sera ?? d.dolore?.sera ?? "-"}</td>
    <td>{d.destro?.dolore?.duranteAttivita ?? d.dolore?.duranteAttivita ?? "-"}</td>
    <td>{d.destro?.dolore?.dopoAttivita ?? d.dolore?.dopoAttivita ?? "-"}</td>
  </tr>

  <tr>
    <td colSpan="5">
      <strong>{tt("evaluation.left")}</strong>
    </td>
  </tr>
  <tr>
    <td>{d.sinistro?.dolore?.riposo ?? d.dolore?.riposo ?? "-"}</td>
    <td>{d.sinistro?.dolore?.mattino ?? d.dolore?.mattino ?? "-"}</td>
    <td>{d.sinistro?.dolore?.sera ?? d.dolore?.sera ?? "-"}</td>
    <td>{d.sinistro?.dolore?.duranteAttivita ?? d.dolore?.duranteAttivita ?? "-"}</td>
    <td>{d.sinistro?.dolore?.dopoAttivita ?? d.dolore?.dopoAttivita ?? "-"}</td>
  </tr>
  </tbody>
</table>
</div>

{(d.tests || []).length > 0 && (
  <div style={{ marginTop: 10 }}>
    <strong>Tests</strong>

    {(d.tests || []).map((test) => (
      <div
        key={test.id}
        style={{
          marginTop: 8,
          padding: 10,
          border: "1px solid #ddd",
          borderRadius: 8,
          background: "#fafafa",
        }}
      >
        {test.type === "Y_BALANCE" && (
          <>
            <strong>Y Balance Test</strong>

            <div style={{ marginTop: 8 }}>
              <strong>Composite score</strong>

              <div>
                {tt("evaluation.right")}:{" "}
                {calculateYBalance(test).right.composite.toFixed(1)}%
              </div>

              <div>
                {tt("evaluation.left")}:{" "}
                {calculateYBalance(test).left.composite.toFixed(1)}%
              </div>
            </div>

            <div style={{ marginTop: 8 }}>
              <strong>Asymmetry</strong>

              <div>
                Anterior:{" "}
                {calculateYBalance(test).asymmetry.anterior.toFixed(1)} cm
              </div>

              <div>
                Composite:{" "}
                {calculateYBalance(test).asymmetry.composite.toFixed(1)}%
              </div>
            </div>

            <div style={{ marginTop: 8 }}>
              <strong>Clinical classification</strong>

              <div>
                {tt("evaluation.right")}:{" "}
                <span
                  style={{
                    color: classifyYBalance(calculateYBalance(test))
                      .rightComposite.color,
                  }}
                >
                  {classifyYBalance(calculateYBalance(test)).rightComposite.label}
                </span>
              </div>

              <div>
                {tt("evaluation.left")}:{" "}
                <span
                  style={{
                    color: classifyYBalance(calculateYBalance(test))
                      .leftComposite.color,
                  }}
                >
                  {classifyYBalance(calculateYBalance(test)).leftComposite.label}
                </span>
              </div>

              <div>
                Anterior asymmetry:{" "}
                <span
                  style={{
                    color: classifyYBalance(calculateYBalance(test))
                      .anteriorAsymmetry.color,
                  }}
                >
                  {
                    classifyYBalance(calculateYBalance(test))
                      .anteriorAsymmetry.label
                  }
                </span>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 20,
                marginTop: 8,
              }}
            >
              {["right", "left"].map((side) => (
                <div key={side}>
                  <div style={{ fontWeight: "bold", marginBottom: 6 }}>
                    {side === "right"
                      ? tt("evaluation.right")
                      : tt("evaluation.left")}
                  </div>

                  <div>Leg length: {test[side]?.legLength || "-"}</div>

                  {[
                    { key: "anterior", label: "Anterior" },
                    { key: "posteromedial", label: "Posteromedial" },
                    { key: "posterolateral", label: "Posterolateral" },
                  ].map((direction) => (
                    <div key={direction.key} style={{ marginTop: 6 }}>
                      <strong>{direction.label}:</strong>{" "}
                      {(test[side]?.[direction.key] || []).join(" / ") || "-"}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    ))}
  </div>
)}  

 

</div>

))}

<button onClick={() => editEvaluation(v)}>

  {tt("evaluation.editEvaluation")}

</button>{" "}

<button onClick={() => deleteEvaluation(v.id)}>

  {tt("evaluation.deleteEvaluation")}

</button>

<br />

</div>

))}

</div>

);

}

function KiviatComparison({ selected, tt }) {
  const valutazioni = selected.valutazioni || [];

  const availableDistretti = Array.from(
    new Set(
      valutazioni.flatMap((v) =>
        (v.distretti || [])
          .map((d) => d.nome)
          .filter(Boolean)
      )
    )
  );
  const [comparisons, setComparisons] = useState(() => [
    {
      id: uid(),
      distretto: "",
      valA: "",
      valB: "",
      mode: "sessione",
    },
  ]);


  function addComparison() {
    if (comparisons.length >= 4) return;

    setComparisons([
      ...comparisons,
      {
        id: uid(),
        distretto: "",
        valA: "",
        valB: "",
        mode: "sessione",
      },
    ]);
  }

  function removeComparison(id) {
    setComparisons(comparisons.filter((c) => c.id !== id));
  }
  function updateComparison(id, key, value) {
    setComparisons((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, [key]: value } : c
      )
    );
  }
  if (valutazioni.length < 2) {
    return (
      <Section title={tt("chart.title")}>
        <p>{tt("chart.needTwoEvaluations")}</p>
      </Section>
    );
  }

  return (
    <Section title={tt("chart.title")}>
      <p>{tt("chart.description")}</p>

      {comparisons.map((c, index) => (
        <div key={c.id}>
          
          <h4>
            {tt("chart.comparison")} {index + 1}
          </h4>

          {comparisons.length > 1 && (
            <button onClick={() => removeComparison(c.id)}>
              {tt("chart.removeComparison")}
            </button>
          )}

<Select
  label={tt("chart.district") || tt("evaluation.district")}
  value={availableDistretti.includes(c.distretto) ? c.distretto : ""}
  onChange={(v) => updateComparison(c.id, "distretto", v)}
  options={availableDistretti.map((d) => ({
    value: d,
    label: tt(`options.distretti.${String(d).toLowerCase()}`) || d,
  }))}
/>

<SelectWithLabels
  label={tt("chart.initialEvaluation")}
  value={c.valA}
  onChange={(v) => updateComparison(c.id, "valA", v)}
  options={valutazioni.map((v) => ({
    value: v.id,
    label: `${tt("evaluation.number")} ${v.numeroValutazione || "-"} — ${tt("evaluation.session")} ${v.sessione || "-"} — ${v.data || "-"}`,
  }))}
/>

<SelectWithLabels
  label={tt("chart.finalEvaluation")}
  value={c.valB}
  onChange={(v) => updateComparison(c.id, "valB", v)}
  options={valutazioni.map((v) => ({
    value: v.id,
    label: `${tt("evaluation.number")} ${v.numeroValutazione || "-"} — ${tt("evaluation.session")} ${v.sessione || "-"} — ${v.data || "-"}`,
  }))}
/>

          <Select
            label={tt("chart.mode")}
            value={c.mode}
            onChange={(v) => updateComparison(c.id, "mode", v)}
            options={[
              { value: "sessione", label: tt("chart.modeSession") },
              { value: "lato", label: tt("chart.modeSide") },
            ]}
          />

          {c.distretto && c.valA && c.valB && (
            <KiviatResult
              comparison={c}
              valutazioni={valutazioni}
              tt={tt}
            />
          )}
        </div>
      ))}

      <button onClick={addComparison}>{tt("chart.addComparison")}</button>
    </Section>
  );
}

function KiviatResult({ comparison, valutazioni, tt }) {
  const evA = valutazioni.find((v) => v.id === comparison.valA);
  const evB = valutazioni.find((v) => v.id === comparison.valB);

  if (!comparison.distretto || !evA || !evB) return null;

  const distA = evA?.distretti?.find((d) => d.nome === comparison.distretto);
  const distB = evB?.distretti?.find((d) => d.nome === comparison.distretto);

  const hasKiviatA = (distA?.blocks || []).some((b) =>
  ["KIVIAT", "KIVIAT_PAIN"].includes(b.type)
);

const hasKiviatB = (distB?.blocks || []).some((b) =>
  ["KIVIAT", "KIVIAT_PAIN"].includes(b.type)
);

const hasPainA = (distA?.blocks || []).some((b) =>
  ["PAIN_VAS", "KIVIAT_PAIN"].includes(b.type)
);

const hasPainB = (distB?.blocks || []).some((b) =>
  ["PAIN_VAS", "KIVIAT_PAIN"].includes(b.type)
);

  if (!distA || !distB) {
    return (
      <p style={{ color: "darkred" }}>
        {tt("chart.districtMissing")}
      </p>
    );
  }

  const districtLabel =
    tt(`options.distretti.${comparison.distretto}`) || comparison.distretto;

  const labelA = `${tt("evaluation.number")} ${
    evA.numeroValutazione || "-"
  } — ${tt("evaluation.session")} ${evA.sessione || "-"} — ${
    evA.data || "-"
  }`;

  const labelB = `${tt("evaluation.number")} ${
    evB.numeroValutazione || "-"
  } — ${tt("evaluation.session")} ${evB.sessione || "-"} — ${
    evB.data || "-"
  }`;

  if (comparison.mode === "sessione") {
    return (
      <div style={gridStyle}>
        {hasKiviatA && (
          <RadarChart
            title={`${districtLabel} — ${labelA}`}
            series={[
              { name: tt("evaluation.right"), data: distA.destro },
              { name: tt("evaluation.left"), data: distA.sinistro },
            ]}
            tt={tt}
          />
        )}
  
        {hasKiviatB && (
          <RadarChart
            title={`${districtLabel} — ${labelB}`}
            series={[
              { name: tt("evaluation.right"), data: distB.destro },
              { name: tt("evaluation.left"), data: distB.sinistro },
            ]}
            tt={tt}
          />
        )}
  
        {hasPainA && hasPainB && (
          <>
            <PainBarChart
  title={`${districtLabel} — ${tt("evaluation.right")} — ${tt("chart.painEvolution") || tt("evaluation.painVAS")}`}
  series={[
    { name: labelA, data: distA.destro?.dolore || {} },
    { name: labelB, data: distB.destro?.dolore || {} },
  ]}
  tt={tt}
/>

<PainBarChart
  title={`${districtLabel} — ${tt("evaluation.left")} — ${tt("chart.painEvolution") || tt("evaluation.painVAS")}`}
  series={[
    { name: labelA, data: distA.sinistro?.dolore || {} },
    { name: labelB, data: distB.sinistro?.dolore || {} },
  ]}
  tt={tt}
/>
          </>
        )}
      </div>
    );
  } 

  return (
    <div style={gridStyle}>
      <RadarChart
        title={`${districtLabel} — ${tt("chart.rightSide") || ""}`}
        series={[
          { name: labelA, data: distA.destro },
          { name: labelB, data: distB.destro },
        ]}
        tt={tt}
      />
      <PainBarChart
  title={`${districtLabel} — ${tt("chart.painEvolution") || tt("evaluation.painVAS") || ""} — ${tt("evaluation.right")}`}
  series={[
    { name: labelA, data: distA.destro?.dolore || {} },
    { name: labelB, data: distB.destro?.dolore || {} },
  ]}
  tt={tt}
/>


      <RadarChart
        title={`${districtLabel} — ${tt("chart.leftSide") || ""}`}
        series={[
          { name: labelA, data: distA.sinistro },
          { name: labelB, data: distB.sinistro },
        ]}
        tt={tt}
      />

<PainBarChart
  title={`${districtLabel} — ${tt("chart.painEvolution") || tt("evaluation.painVAS") || ""} — ${tt("evaluation.left")}`}
  series={[
    { name: labelA, data: distA.sinistro?.dolore || {} },
    { name: labelB, data: distB.sinistro?.dolore || {} },
  ]}
  tt={tt}
/>

    </div>
  );
}

function RadarChart({ title, series, tt }) {
  const labels = [
    tt("evaluation.strength"),
    tt("evaluation.function"),
    tt("evaluation.passiveMobilityShort"),
    tt("evaluation.activeMobilityShort"),
  ];

  const keys = ["forza", "funzione", "mobilitaPassiva", "mobilitaAttiva"];

  const size = 320;
  const center = size / 2;
  const maxRadius = 105;
  const maxValue = 5;

  function scoreToRadius(value) {
    return (Number(value || 0) / maxValue) * maxRadius;
  }

  function point(index, value) {
    const angle = (-90 + index * 90) * (Math.PI / 180);
    const radius = scoreToRadius(value);

    return {
      x: center + radius * Math.cos(angle),
      y: center + radius * Math.sin(angle),
    };
  }

  function axisPoint(index, radius = maxRadius) {
    const angle = (-90 + index * 90) * (Math.PI / 180);

    return {
      x: center + radius * Math.cos(angle),
      y: center + radius * Math.sin(angle),
    };
  }

  function polygon(data) {
    return keys
      .map((key, i) => {
        const p = point(i, data?.[key]);
        return `${p.x},${p.y}`;
      })
      .join(" ");
  }

  return (
    <div style={chartCardStyle}>
      <h4 style={{ marginTop: 0 }}>{title}</h4>

      <svg width={size} height={size}>
        {[1, 2, 3, 4, 5].map((level) => {
          const r = (level / 5) * maxRadius;
          const pts = keys
            .map((_, i) => {
              const p = axisPoint(i, r);
              return `${p.x},${p.y}`;
            })
            .join(" ");

          return (
            <polygon
              key={level}
              points={pts}
              fill="none"
              stroke="#ddd"
              strokeWidth="1"
            />
          );
        })}

        {keys.map((_, i) => {
          const p = axisPoint(i);
          return (
            <line
              key={i}
              x1={center}
              y1={center}
              x2={p.x}
              y2={p.y}
              stroke="#bbb"
            />
          );
        })}

        {series.map((s, index) => (
          <polygon
            key={s.name}
            points={polygon(s.data)}
            fill={
              index === 0
                ? "rgba(0, 100, 255, 0.22)"
                : "rgba(255, 140, 0, 0.22)"
            }
            stroke={index === 0 ? "#0064ff" : "#ff8c00"}
            strokeWidth="2.5"
          />
        ))}

        {labels.map((label, i) => {
          const p = axisPoint(i, 128);

          return (
            <text
              key={label}
              x={p.x}
              y={p.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="11"
              fontWeight="600"
            >
              {label}
            </text>
          );
        })}

        {[1, 2, 3, 4, 5].map((level) => {
          const p = axisPoint(0, (level / 5) * maxRadius);

          return (
            <text
              key={level}
              x={p.x + 8}
              y={p.y}
              fontSize="9"
              fill="#777"
            >
              {`${level * 20}%`}
            </text>
          );
        })}
      </svg>

      {series.map((s, index) => (
        <div key={s.name} style={{ fontSize: 13, marginTop: 4 }}>
          <span style={{ color: index === 0 ? "#0064ff" : "#ff8c00" }}>
            ■
          </span>{" "}
          {s.name}
        </div>
      ))}
    </div>
  );
}

function PainBarChart({ title, series, tt }) {
  const painItems = [
    { key: "riposo", label: tt("evaluation.rest") },
    { key: "mattino", label: tt("evaluation.morning") },
    { key: "sera", label: tt("evaluation.evening") },
    { key: "duranteAttivita", label: tt("evaluation.duringActivity") },
    { key: "dopoAttivita", label: tt("evaluation.afterActivity") },
  ];

  return (
    <div style={chartCardStyle}>
      <h4 style={{ marginTop: 0, marginBottom: 14 }}>
        {title || tt("chart.painEvolution")}
      </h4>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: 12,
          alignItems: "end",
          height: 170,
        }}
      >
        {painItems.map(({ key, label }) => {
          const valueA = Number(series?.[0]?.data?.[key] || 0);
          const valueB = Number(series?.[1]?.data?.[key] || 0);

          return (
            <div key={key} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 11, marginBottom: 6 }}>
                {valueA} → {valueB}
              </div>

              <div
                style={{
                  height: 100,
                  display: "flex",
                  gap: 6,
                  justifyContent: "center",
                  alignItems: "flex-end",
                  borderBottom: "1px solid #ddd",
                }}
              >
                <div
                  style={{
                    width: 14,
                    height: `${valueA * 10}px`,
                    background: "#0064ff",
                  }}
                />
                <div
                  style={{
                    width: 14,
                    height: `${valueB * 10}px`,
                    background: "#ff8c00",
                  }}
                />
              </div>

              <div style={{ fontSize: 10, marginTop: 6, minHeight: 28 }}>
                {label}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 12 }}>
        {series.map((s, index) => (
          <div key={s.name} style={{ fontSize: 13, marginTop: 4 }}>
            <span style={{ color: index === 0 ? "#0064ff" : "#ff8c00" }}>
              ■
            </span>{" "}
            {s.name}
          </div>
        ))}
      </div>
    </div>
  );
}

const chartCardStyle = {
  border: "1px solid #ddd",
  borderRadius: 14,
  padding: 16,
  background: "white",
  marginTop: 12,
  boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
};

const gridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(330px, 1fr))",
  gap: 20,
  marginTop: 20,
};
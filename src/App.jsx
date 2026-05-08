import { APP_VERSION } from "./appVersion";
import { assessGrip } from "./utils/gripAssessment";
import html2pdf from "html2pdf.js";
import { exportHtmlToPdf, getHtml2PdfOptions } from "./utils/exportHtmlToPdf";
import ReportView from "./components/reports/ReportView";
import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import DataBackup from "./components/storage/DataBackup";
import { getText } from "./i18n";
import EvaluationForm from "./components/evaluations/EvaluationForm";
import TestSessionForm from "./components/evaluations/TestSessionForm";
import PatientTestChartsPanel from "./components/tests/PatientTestChartsPanel";
import { OTHER_EXERCISE } from "./components/evaluations/evaluationTestFields";
import Textarea from "./components/ui/Textarea";
import Section from "./components/ui/Section";
import SelectWithLabels from "./components/ui/SelectWithLabels";
import Select from "./components/ui/Select";
import Input from "./components/ui/Input";
import {
  createEvaluation,
  createDistretto,
  createDistrettoTestOnly,
  createTestSession,
} from "./utils/factories";
import {
  uid,
  calcBMI,
  bmiCategory,
  timeSinceYWD,
  formatDateDMY,
  patientMatchesSearchQuery,
  calculateYBalance,
  classifyYBalance,
  translatedPatientDiagnosis,
  translatedDistrettoDiagnosi,
  manualTextLower,
  migrateDiagnosiRighe,
  patientTrim,
  patientDiagnosiRowIsFilled,
} from "./utils/helpers";
import {
  sanitizeEvaluationForSave,
  sanitizeTestSessionForSave,
  distrettoHasKiviat,
  distrettoHasSidePainTable,
  distrettoHasGeneralPainVAS,
  distrettoActiveTests,
} from "./utils/sanitizeEvaluation";
import { normalizePatientSessioniTest } from "./utils/patientNormalize";
import { epleyOneRmKg, formatOneRmKg } from "./utils/epley1rm";
import { sportOptions, tegnerInfo } from "./data/options";

/**
 * Numero incrementale per nome distretto tra valutazioni e sessioni test.
 * `kind`: "valutazione" | "sessioneTest" — esclude l’entità corrente dal conteggio.
 */
function stampDistrictSlotNumbers(patient, entity, entityId, kind) {
  const maxByName = {};
  for (const ev of patient.valutazioni || []) {
    if (kind === "valutazione" && ev.id === entityId) continue;
    for (const dist of ev.distretti || []) {
      const n = Number(dist.numeroValutazioneDistretto || 0);
      maxByName[dist.nome] = Math.max(maxByName[dist.nome] || 0, n);
    }
  }
  for (const st of patient.sessioniTest || []) {
    if (kind === "sessioneTest" && st.id === entityId) continue;
    for (const dist of st.distretti || []) {
      const n = Number(dist.numeroValutazioneDistretto || 0);
      maxByName[dist.nome] = Math.max(maxByName[dist.nome] || 0, n);
    }
  }
  return {
    ...entity,
    distretti: (entity.distretti || []).map((d) => {
      const preserved = Number(d.numeroValutazioneDistretto || 0);
      if (preserved > 0) return d;
      const next = (maxByName[d.nome] || 0) + 1;
      maxByName[d.nome] = next;
      return { ...d, numeroValutazioneDistretto: next };
    }),
  };
}

const STORAGE_KEY = "physiocare_nyon_stabile";
/** Preferenza elenco pazienti ridotto (1 = collassato). */
const STORAGE_SIDEBAR_COLLAPSED = "physiocare_nyon_sidebar_collapsed";

function readSidebarCollapsedPref() {
  try {
    return localStorage.getItem(STORAGE_SIDEBAR_COLLAPSED) === "1";
  } catch {
    return false;
  }
}

function writeSidebarCollapsedPref(collapsed) {
  try {
    localStorage.setItem(STORAGE_SIDEBAR_COLLAPSED, collapsed ? "1" : "0");
  } catch {
    /* ignore */
  }
}

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
  farmaci: "",
  patologie: "",
  epilessia: "",
  antecedentiChirurgici: "",
  figli: "",
  numeroFigli: "",
  tipoParto: "",
  riabilitazionePerineale: "",
  incontinenza: "",
  diagnosi: "",
  distrettoDiagnosi: "",
  diagnosiDettagli: "",
  /** Diagnosi multiple (incrementale); i campi sopra restano sincronizzati dalla prima riga per compatibilità. */
  diagnosiRighe: [],
  diagnostica: "",
  diagnosticaDettagli: "",
  diagnostica2: "",
  diagnosticaDettagli2: "",
  dataInfortunio: "",
  dataOperazione: "",
  artoOperato: "",
  tipoOperazione: "",
  variazionePeso: "",
motivoVariazionePeso: "",

dominioLavoro: "",
rischiProfessionali: "",
motivoAccesso: "",

sportLivello: "",
running10km: "",
runningMezza: "",
runningMaratona: "",

fitnessTipo: "",
  surfStance: "",
  snowboardStance: "",
  skateboardStance: "",
  tennisBackhand: "",
  tennisStringTension: "",
  tennisRacketChangedRecently: "",
  padelRacketChangedRecently: "",
  manoDominante: "",
  valutazioni: [],
  sessioniTest: [],
};

export default function App() {
  const [patients, setPatients] = useState(() => {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) return [];
      const parsed = JSON.parse(data);
      const list = Array.isArray(parsed) ? parsed : [];
      return list.map((p) =>
        normalizePatientSessioniTest({
          ...p,
          diagnosiRighe: migrateDiagnosiRighe(p),
        })
      );
    } catch {
      return [];
    }
  });

  const [query, setQuery] = useState("");
  const [lang, setLang] = useState("it");
  const tt = getText(lang);

  const [selected, setSelected] = useState(null);
  const [patientListCollapsed, setPatientListCollapsed] = useState(false);
  const [editingPatient, setEditingPatient] = useState(false);
  const [editingEvaluation, setEditingEvaluation] = useState(false);
  const [editingTestSession, setEditingTestSession] = useState(false);
  const [form, setForm] = useState(emptyPatient);
  const [evaluationForm, setEvaluationForm] = useState(createEvaluation());
  const [testSessionForm, setTestSessionForm] = useState(createTestSession());

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(patients));
  }, [patients]);

  const filtered = useMemo(
    () => patients.filter((p) => patientMatchesSearchQuery(p, query)),
    [patients, query]
  );

  useLayoutEffect(() => {
    if (!selected) setPatientListCollapsed(false);
  }, [selected]);

  useEffect(() => {
    if (selected?.id && readSidebarCollapsedPref()) {
      setPatientListCollapsed(true);
    }
  }, [selected?.id]);

  function setPatientListCollapsedPersist(next) {
    writeSidebarCollapsedPref(next);
    setPatientListCollapsed(next);
  }

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
    setForm({
      ...emptyPatient,
      id: uid(),
      diagnosiRighe: [
        { id: uid(), diagnosi: "", distrettoDiagnosi: "", dettagli: "" },
      ],
    });
    setSelected(null);
    setEditingPatient(true);
    setEditingEvaluation(false);
    setEditingTestSession(false);
  }

  function editPatient(p) {
    setForm({
      ...emptyPatient,
      ...p,
      sportMultipli: p.sportMultipli || [],
      valutazioni: p.valutazioni || [],
      sessioniTest: p.sessioniTest || [],
      diagnosiRighe: migrateDiagnosiRighe(p),
    });
    setSelected(p);
    setEditingPatient(true);
    setEditingEvaluation(false);
    setEditingTestSession(false);
  }

  function savePatient() {
    if (!form.nome.trim() || !form.cognome.trim()) {
      alert("Nome e cognome sono obbligatori");
      return;
    }

    const righe = migrateDiagnosiRighe(form).map((r) => ({
      ...r,
      id: r.id || uid(),
    }));
    const first = righe[0] || {};
    const cleanForm = {
      ...emptyPatient,
      ...form,
      valutazioni: form.valutazioni || [],
      sessioniTest: form.sessioniTest || [],
      sportMultipli: form.sportMultipli || [],
      diagnosiRighe: righe,
      diagnosi: first.diagnosi || "",
      distrettoDiagnosi: first.distrettoDiagnosi || "",
      diagnosiDettagli: first.dettagli || "",
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
    setEditingEvaluation(true);
    setEditingPatient(false);
    setEditingTestSession(false);
  }

  function startNewTestSession() {
    if (!selected) return;

    const nextNum =
      Math.max(
        0,
        ...(selected.sessioniTest || []).map((s) =>
          Number(s.numeroTest || 0)
        )
      ) + 1;

    setTestSessionForm(createTestSession(String(nextNum)));
    setEditingTestSession(true);
    setEditingPatient(false);
    setEditingEvaluation(false);
  }

  function editTestSession(session) {
    setTestSessionForm(
      sanitizeTestSessionForSave(JSON.parse(JSON.stringify(session)))
    );
    setEditingTestSession(true);
    setEditingPatient(false);
    setEditingEvaluation(false);
  }

  function editEvaluation(ev) {
    setEvaluationForm(sanitizeEvaluationForSave(JSON.parse(JSON.stringify(ev))));
    setEditingEvaluation(true);
    setEditingPatient(false);
    setEditingTestSession(false);
  }

  function addDistrettoWithFirstBlock(nome, blockType) {
    if (!nome || !blockType) return false;

    const alreadyExists = evaluationForm.distretti.some((d) => d.nome === nome);

    if (alreadyExists) {
      alert(tt("evaluation.districtDuplicate"));
      return false;
    }

    const newDist = createDistretto(nome);
    newDist.blocks = [{ id: uid(), type: blockType, noteAltro: "" }];

    setEvaluationForm({
      ...evaluationForm,
      distretti: [...evaluationForm.distretti, newDist],
    });
    return true;
  }

  function addDistrettoTestSessionWithFirstTest(nome, testType) {
    if (!nome || !testType) return false;

    const alreadyExists = testSessionForm.distretti.some((d) => d.nome === nome);

    if (alreadyExists) {
      alert(tt("evaluation.districtDuplicate") ?? "Distretto già presente.");
      return false;
    }

    setTestSessionForm({
      ...testSessionForm,
      distretti: [
        ...testSessionForm.distretti,
        createDistrettoTestOnly(nome, selected, testType),
      ],
    });
    return true;
  }

  function removeDistrettoTestSession(id) {
    setTestSessionForm({
      ...testSessionForm,
      distretti: testSessionForm.distretti.filter((d) => d.id !== id),
    });
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

    const withDistrictNumbers = stampDistrictSlotNumbers(
      selected,
      evaluationForm,
      evaluationForm.id,
      "valutazione"
    );

    const cleaned = sanitizeEvaluationForSave(withDistrictNumbers);

    const valutazioni = existing
      ? selected.valutazioni.map((v) =>
          v.id === evaluationForm.id ? cleaned : v
        )
      : [...(selected.valutazioni || []), cleaned];

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

  function saveTestSession() {
    if (!selected) return;

    if (testSessionForm.distretti.length === 0) {
      alert(tt("testSession.needDistrict"));
      return;
    }

    const existing = (selected.sessioniTest || []).some(
      (s) => s.id === testSessionForm.id
    );

    const withDistrictNumbers = stampDistrictSlotNumbers(
      selected,
      testSessionForm,
      testSessionForm.id,
      "sessioneTest"
    );

    const withGripDominant = {
      ...withDistrictNumbers,
      distretti: (withDistrictNumbers.distretti || []).map((d) => ({
        ...d,
        tests: (d.tests || []).map((t) => {
          if (t.type !== "GRIP_STRENGTH") return t;
          const md = t.grip?.manoDominante;
          if (md !== "" && md != null) return t;
          if (selected?.manoDominante) {
            return {
              ...t,
              grip: {
                ...(t.grip || {}),
                manoDominante: selected.manoDominante,
              },
            };
          }
          return t;
        }),
      })),
    };

    const cleaned = sanitizeTestSessionForSave(withGripDominant);

    const sessioniTest = existing
      ? selected.sessioniTest.map((s) =>
          s.id === testSessionForm.id ? cleaned : s
        )
      : [...(selected.sessioniTest || []), cleaned];

    syncSelected({ ...selected, sessioniTest });
    setEditingTestSession(false);
  }

  function deleteTestSession(id) {
    if (!confirm(tt("testSession.deleteConfirm"))) return;

    syncSelected({
      ...selected,
      sessioniTest: (selected.sessioniTest || []).filter((s) => s.id !== id),
    });
  }

  return (
    <div className="app-shell">
      <div className="app-topbar">
        <div className="app-title-wrap">
          <h1 className="app-title">{tt("app.title")}</h1>
          <span className="app-version-badge" title={`Physiocare Nyon · v${APP_VERSION}`}>
            v{APP_VERSION}
          </span>
        </div>

        <select
          className="app-lang-select"
          value={lang}
          onChange={(e) => setLang(e.target.value)}
          aria-label={tt("app.title")}
        >
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
  
      

<div
        className="app-toolbar-row"
        style={{
          display: "flex",
          alignItems: "center",
          marginTop: 10,
          gap: 8,
          width: "100%",
        }}
      >
        <div
          style={{
            flex: 1,
            display: "flex",
            justifyContent: "flex-start",
            alignItems: "center",
            gap: 10,
            minWidth: 0,
          }}
        >
          <button type="button" onClick={newPatient}>
            {tt("common.newPatient")}
          </button>

          <input
            className="app-toolbar-search"
            placeholder={tt("common.searchPatient")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              flex: "1 1 100px",
              maxWidth: 220,
              minWidth: 80,
            }}
          />
        </div>

        <div className="app-toolbar-hero" aria-hidden>
          <img
            className="app-toolbar-heroImg"
            src={`${import.meta.env.BASE_URL}pdf-header-bg.png`}
            alt=""
            decoding="async"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        </div>

        <div
          style={{
            flex: 1,
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            gap: 6,
            minWidth: 0,
          }}
        >
          <DataBackup patients={patients} setPatients={setPatients} compact />
        </div>
      </div>

      <hr className="app-divider" />

      <div className="app-layout">
        <aside
          className={`app-sidebar${patientListCollapsed ? " app-sidebar--collapsed" : ""}`}
          aria-label={tt("app.patients")}
        >
          {!patientListCollapsed ? (
            <>
              <div className="app-sidebar-toolbar">
                <h3>{tt("app.patients")}</h3>
                <button
                  type="button"
                  className="app-sidebar-collapse-btn"
                  onClick={() => setPatientListCollapsedPersist(true)}
                  aria-expanded="true"
                  aria-controls="patient-list-panel"
                  aria-label={tt("app.collapsePatientList")}
                  title={tt("app.collapsePatientList")}
                >
                  ‹
                </button>
              </div>
              <div id="patient-list-panel" className="app-sidebar-list">
                {filtered.map((p) => (
                  <div
                    key={p.id}
                    role="button"
                    tabIndex={0}
                    className={`patient-card${selected?.id === p.id ? " patient-card--active" : ""}`}
                    onClick={() => {
                      setSelected(p);
                      setEditingPatient(false);
                      setEditingEvaluation(false);
                      setEditingTestSession(false);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelected(p);
                        setEditingPatient(false);
                        setEditingEvaluation(false);
                        setEditingTestSession(false);
                      }
                    }}
                  >
                    <div className="patient-card__row">
                      <strong className="patient-card__name">
                        {p.cognome} {p.nome}
                      </strong>
                      {p.dataNascita ? (
                        <span className="patient-card__dob" title={tt("patient.birthDate")}>
                          {formatDateDMY(p.dataNascita)}
                        </span>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <button
              type="button"
              className="app-sidebar-expand-btn"
              onClick={() => setPatientListCollapsedPersist(false)}
              aria-expanded="false"
              aria-controls="patient-list-panel"
              aria-label={tt("app.expandPatientList")}
              title={tt("app.expandPatientList")}
            >
              ›
            </button>
          )}
        </aside>

        <div className="app-content">
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
              key={evaluationForm.id}
              tt={tt}
              evaluationForm={evaluationForm}
              setEvaluationForm={setEvaluationForm}
              addDistrettoWithFirstBlock={addDistrettoWithFirstBlock}
              removeDistretto={removeDistretto}
              updateScore={updateScore}
              saveEvaluation={saveEvaluation}
              cancel={() => setEditingEvaluation(false)}
            />
          )}

          {editingTestSession && selected && (
            <TestSessionForm
              key={testSessionForm.id}
              tt={tt}
              patient={selected}
              testSessionForm={testSessionForm}
              setTestSessionForm={setTestSessionForm}
              addDistrettoWithFirstTest={addDistrettoTestSessionWithFirstTest}
              removeDistretto={removeDistrettoTestSession}
              saveTestSession={saveTestSession}
              cancel={() => setEditingTestSession(false)}
            />
          )}

{selected && !editingPatient && !editingEvaluation && !editingTestSession && (
              <PatientDetail
              selected={selected}
              tt={tt}
              editPatient={editPatient}
              removePatient={removePatient}
              startNewEvaluation={startNewEvaluation}
              startNewTestSession={startNewTestSession}
              editEvaluation={editEvaluation}
              deleteEvaluation={deleteEvaluation}
              editTestSession={editTestSession}
              deleteTestSession={deleteTestSession}
            />
          )}

          {!selected && !editingPatient && !editingEvaluation && !editingTestSession && (
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

  const yesNoOptions = ["No", "Sì"].map((v) => option("options.yesNo", v));

  const sportLevelOptions = ["Amatoriale", "Professionale"].map((v) =>
    option("options.sportLevel", v)
  );

  const accessReasonOptions = ["Referral", "Già cliente", "Internet"].map((v) =>
    option("options.accessReason", v)
  );

  const dominantHandOptions = ["Destra", "Sinistra", "Ambidestro"].map((v) => ({
    value: v,
    label: t(`dominantHand.${v}`, v),
  }));

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

  const distrettoDiagnosiOptions = useMemo(
    () => [
      { value: "", label: "--" },
      {
        value: "anca_destra",
        label: `${tt("options.distretti.anca")} ${tt("evaluation.right")}`,
      },
      {
        value: "anca_sinistra",
        label: `${tt("options.distretti.anca")} ${tt("evaluation.left")}`,
      },
      {
        value: "ginocchio_destro",
        label: `${tt("options.distretti.ginocchio")} ${tt("evaluation.right")}`,
      },
      {
        value: "ginocchio_sinistro",
        label: `${tt("options.distretti.ginocchio")} ${tt("evaluation.left")}`,
      },
      {
        value: "caviglia_destra",
        label: `${tt("options.distretti.caviglia")} ${tt("evaluation.right")}`,
      },
      {
        value: "caviglia_sinistra",
        label: `${tt("options.distretti.caviglia")} ${tt("evaluation.left")}`,
      },
      {
        value: "piede_destro",
        label: `${tt("options.distretti.piede")} ${tt("evaluation.right")}`,
      },
      {
        value: "piede_sinistro",
        label: `${tt("options.distretti.piede")} ${tt("evaluation.left")}`,
      },
      {
        value: "spalla_destra",
        label: `${tt("options.distretti.spalla")} ${tt("evaluation.right")}`,
      },
      {
        value: "spalla_sinistra",
        label: `${tt("options.distretti.spalla")} ${tt("evaluation.left")}`,
      },
      {
        value: "gomito_destro",
        label: `${tt("options.distretti.gomito")} ${tt("evaluation.right")}`,
      },
      {
        value: "gomito_sinistro",
        label: `${tt("options.distretti.gomito")} ${tt("evaluation.left")}`,
      },
      {
        value: "polso_destro",
        label: `${tt("options.distretti.polso")} ${tt("evaluation.right")}`,
      },
      {
        value: "polso_sinistro",
        label: `${tt("options.distretti.polso")} ${tt("evaluation.left")}`,
      },
      {
        value: "mano_destra",
        label: `${tt("options.distretti.mano")} ${tt("evaluation.right")}`,
      },
      {
        value: "mano_sinistra",
        label: `${tt("options.distretti.mano")} ${tt("evaluation.left")}`,
      },
      { value: "cervicale", label: tt("options.distretti.cervicale") },
      { value: "toracica", label: tt("options.distretti.toracica") },
      { value: "lombare", label: tt("options.distretti.lombare") },
      { value: "artoinferiore", label: tt("options.distretti.artoinferiore") },
      { value: "artosuperiore", label: tt("options.distretti.artosuperiore") },
      { value: "cardio", label: tt("options.distretti.cardio") },
    ],
    [tt]
  );

  const diagnosiRighe = migrateDiagnosiRighe(form);

  function setDiagnosiRighe(nextRows) {
    setForm({ ...form, diagnosiRighe: nextRows });
  }

  function updateDiagnosiRiga(rowId, partial) {
    setDiagnosiRighe(
      diagnosiRighe.map((r) => (r.id === rowId ? { ...r, ...partial } : r))
    );
  }

  function addDiagnosiRiga() {
    setDiagnosiRighe([
      ...diagnosiRighe,
      { id: uid(), diagnosi: "", distrettoDiagnosi: "", dettagli: "" },
    ]);
  }

  function removeDiagnosiRiga(rowId) {
    const next = diagnosiRighe.filter((r) => r.id !== rowId);
    setDiagnosiRighe(
      next.length
        ? next
        : [{ id: uid(), diagnosi: "", distrettoDiagnosi: "", dettagli: "" }]
    );
  }

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

        <Select
          label={t("patient.dominantHand", "Mano dominante")}
          value={form.manoDominante || ""}
          onChange={(v) => update("manoDominante", v)}
          options={dominantHandOptions}
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

      </Section>

      <Section title={t("patient.medicalHistory", "Informazioni mediche")}>
        <Textarea
          label={t("patient.medications", "Farmaci")}
          value={form.farmaci || ""}
          onChange={(v) => update("farmaci", v)}
        />

        <Textarea
          label={t("patient.pathologies", "Patologie")}
          value={form.patologie || ""}
          onChange={(v) => update("patologie", v)}
        />

        <Select
          label={t("patient.epilepsy", "Epilessia")}
          value={form.epilessia || ""}
          onChange={(v) => update("epilessia", v)}
          options={yesNoOptions}
        />

        <Textarea
          label={t(
            "patient.relevantSurgeryHistory",
            "Antecedenti e operazioni chirurgiche rilevanti"
          )}
          value={form.antecedentiChirurgici || ""}
          onChange={(v) => update("antecedentiChirurgici", v)}
        />
      </Section>

      {form.sesso === "Donna" && (
        <Section title={t("patient.femaleHealth", "Salute femminile")}>
          <Select
            label={t("patient.children", "Figli")}
            value={form.figli || ""}
            onChange={(v) => update("figli", v)}
            options={[{ value: "", label: "--" }, ...yesNoOptions]}
          />

          {form.figli === "Sì" && (
            <>
              <Input
                label={t("patient.childrenCount", "Quanti")}
                type="number"
                value={form.numeroFigli}
                onChange={(v) => update("numeroFigli", v)}
              />

              <Select
                label={t("patient.birthMode", "Tipo di parto")}
                value={form.tipoParto || ""}
                onChange={(v) => update("tipoParto", v)}
                options={[
                  { value: "", label: "--" },
                  ...["Naturale", "Taglio cesareo"].map((id) =>
                    option("options.birthType", id)
                  ),
                ]}
              />
            </>
          )}

          <Select
            label={t(
              "patient.perinealRehab",
              "Riabilitazione perineale"
            )}
            value={form.riabilitazionePerineale || ""}
            onChange={(v) => update("riabilitazionePerineale", v)}
            options={[{ value: "", label: "--" }, ...yesNoOptions]}
          />

          <Select
            label={t(
              "patient.urinaryIncontinence",
              "Problemi di incontinenza"
            )}
            value={form.incontinenza || ""}
            onChange={(v) => update("incontinenza", v)}
            options={[{ value: "", label: "--" }, ...yesNoOptions]}
          />
        </Section>
      )}

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
          className="choice-chip-grid"
          role="group"
          aria-label={t("patient.sports", "Sport praticati")}
        >
          {sportOptionsTranslated.map((sport) => (
            <label key={sport.value} className="choice-chip">
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
              />
              <span className="choice-chip__text">{sport.label}</span>
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

        {(form.sportMultipli || []).some(
          (s) => String(s).toLowerCase() === "fitness"
        ) && (
          <>
            <h4>{t("patient.fitness", "Fitness")}</h4>

            <Select
              label={t("patient.fitnessType", "Tipo di fitness")}
              value={form.fitnessTipo}
              onChange={(v) => update("fitnessTipo", v)}
              options={fitnessTypeOptions}
            />

            {form.fitnessTipo === "Pesi liberi" && (
              <p style={{ fontSize: 13, color: "#555", marginTop: 8 }}>
                {t(
                  "tests.strengthMaximals.useInEvaluation",
                  "Per serie, ripetizioni, carico e 1RM stimata (Epley) usa il test «Massimali pesistica» nella valutazione."
                )}
              </p>
            )}
          </>
        )}

        {(form.sportMultipli || []).some(
          (s) => String(s).toLowerCase() === "surf"
        ) && (
          <>
            <h4>{t("options.sport.surf", "Surf")}</h4>
            <Select
              label={t("patient.boardStance", "Goofy o regular?")}
              value={form.surfStance || ""}
              onChange={(v) => update("surfStance", v)}
              options={[
                {
                  value: "Regular",
                  label: t("options.boardStance.Regular", "Regular"),
                },
                {
                  value: "Goofy",
                  label: t("options.boardStance.Goofy", "Goofy"),
                },
              ]}
            />
          </>
        )}

        {(form.sportMultipli || []).some(
          (s) => String(s).toLowerCase() === "snowboard"
        ) && (
          <>
            <h4>{t("options.sport.snowboard", "Snowboard")}</h4>
            <Select
              label={t("patient.boardStance", "Goofy o regular?")}
              value={form.snowboardStance || ""}
              onChange={(v) => update("snowboardStance", v)}
              options={[
                {
                  value: "Regular",
                  label: t("options.boardStance.Regular", "Regular"),
                },
                {
                  value: "Goofy",
                  label: t("options.boardStance.Goofy", "Goofy"),
                },
              ]}
            />
          </>
        )}

        {(form.sportMultipli || []).some(
          (s) => String(s).toLowerCase() === "skateboard"
        ) && (
          <>
            <h4>{t("options.sport.skateboard", "Skateboard")}</h4>
            <Select
              label={t("patient.boardStance", "Goofy o regular?")}
              value={form.skateboardStance || ""}
              onChange={(v) => update("skateboardStance", v)}
              options={[
                {
                  value: "Regular",
                  label: t("options.boardStance.Regular", "Regular"),
                },
                {
                  value: "Goofy",
                  label: t("options.boardStance.Goofy", "Goofy"),
                },
              ]}
            />
          </>
        )}

        {(form.sportMultipli || []).some(
          (s) => String(s).toLowerCase() === "tennis"
        ) && (
          <>
            <h4>{t("options.sport.tennis", "Tennis")}</h4>
            <Select
              label={t("patient.tennisBackhand", "Rovescio")}
              value={form.tennisBackhand || ""}
              onChange={(v) => update("tennisBackhand", v)}
              options={[
                {
                  value: "1 mano",
                  label: t("options.tennisBackhand.1 mano", "A una mano"),
                },
                {
                  value: "2 mani",
                  label: t("options.tennisBackhand.2 mani", "A due mani"),
                },
              ]}
            />
            <Input
              label={t(
                "patient.tennisStringTension",
                "Tensione corde (es. kg)"
              )}
              value={form.tennisStringTension || ""}
              onChange={(v) => update("tennisStringTension", v)}
            />
            <Select
              label={t(
                "patient.tennisRacketChangedRecently",
                "Racchetta cambiata di recente?"
              )}
              value={form.tennisRacketChangedRecently || ""}
              onChange={(v) => update("tennisRacketChangedRecently", v)}
              options={yesNoOptions}
            />
          </>
        )}

        {(form.sportMultipli || []).some(
          (s) => String(s).toLowerCase() === "padel"
        ) && (
          <>
            <h4>{t("options.sport.padel", "Padel")}</h4>
            <Select
              label={t(
                "patient.padelRacketChangedRecently",
                "Racchetta cambiata di recente?"
              )}
              value={form.padelRacketChangedRecently || ""}
              onChange={(v) => update("padelRacketChangedRecently", v)}
              options={yesNoOptions}
            />
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
        <p
          style={{
            margin: "0 0 10px",
            fontSize: "0.9rem",
            color: "var(--text-muted)",
            textAlign: "left",
          }}
        >
          {t(
            "patient.diagnosesIntro",
            "Puoi aggiungere più diagnosi: ogni riga è indipendente (testo e distretto)."
          )}
        </p>

        <div className="patient-diagnosi-righe">
          {diagnosiRighe.map((row, idx) => (
            <div
              key={row.id}
              className="patient-diagnosi-riga"
              style={{
                marginBottom: 12,
                paddingBottom: 12,
                borderBottom:
                  idx < diagnosiRighe.length - 1 ? "1px solid var(--border)" : "none",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 6,
                }}
              >
                <strong style={{ fontSize: "0.9375rem" }}>
                  {t("patient.diagnosis", "Diagnosi / problema principale")}{" "}
                  {idx + 1}
                </strong>
                {diagnosiRighe.length > 1 ? (
                  <button type="button" onClick={() => removeDiagnosiRiga(row.id)}>
                    {t("patient.removeDiagnosis", "Rimuovi")}
                  </button>
                ) : null}
              </div>
              <Select
                label={t("patient.diagnosis", "Diagnosi / problema principale")}
                value={row.diagnosi || ""}
                onChange={(v) => updateDiagnosiRiga(row.id, { diagnosi: v })}
                options={diagnosisOptions}
              />
              <Select
                label={tt("evaluation.district")}
                value={row.distrettoDiagnosi || ""}
                onChange={(v) =>
                  updateDiagnosiRiga(row.id, { distrettoDiagnosi: v })
                }
                options={distrettoDiagnosiOptions}
              />
              <Textarea
                compact
                fullWidth
                label={t("patient.diagnosisDetails", "Dettagli diagnosi")}
                value={row.dettagli || ""}
                onChange={(v) => updateDiagnosiRiga(row.id, { dettagli: v })}
              />
            </div>
          ))}
        </div>

        <button type="button" onClick={addDiagnosiRiga} style={{ marginBottom: 14 }}>
          {t("patient.addDiagnosis", "+ Aggiungi diagnosi")}
        </button>

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

        <Select
          label={t("patient.imaging2", "Diagnostica (2ª, se necessaria)")}
          value={form.diagnostica2 || ""}
          onChange={(v) => update("diagnostica2", v)}
          options={imagingOptions}
        />

        <Textarea
          label={t("patient.imagingDetails2", "Dettagli / commenti 2ª diagnostica")}
          value={form.diagnosticaDettagli2 || ""}
          onChange={(v) => update("diagnosticaDettagli2", v)}
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
            {timeSinceYWD(form.dataInfortunio, tt)}
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
            {timeSinceYWD(form.dataOperazione, tt)}
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

function GripStrengthTestSummary({ patient, evaluationDate, test, tt }) {
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
    <div style={{ marginTop: 8 }}>
      <p>
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
          <span style={gripHintStyle}>{tt("grip.clinicalHint.percentileKg")}</span>
        )}
      </p>

      <p>
        <strong>
          {tt("grip.percentile")} (kg/m²):
        </strong>{" "}
        {grip?.normalizedPercentile ? `P${grip.normalizedPercentile}` : "-"}
        {grip?.ready && grip?.normalizedPercentile != null && (
          <span style={gripHintStyle}>{tt("grip.clinicalHint.percentileKgM2")}</span>
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
  );
}

/** Titolo valutazione: `Numero valutazione: 1   Distretto: Anca    06.05.2026` (data DD.MM.YYYY). */
function evaluationCardHeadingText(v, tt) {
  const districtLabels = (v.distretti || [])
    .map((d) => {
      const nome = d?.nome;
      if (!nome) return "";
      return tt(`options.distretti.${String(nome).toLowerCase()}`) || nome;
    })
    .filter(Boolean);
  const districtSegment = districtLabels.length
    ? districtLabels.join(", ")
    : "—";
  const num = v.numeroValutazione ?? "-";
  const dateStr = v.data ? formatDateDMY(v.data) : "—";
  return `${tt("evaluation.number")}: ${num}   ${tt("evaluation.district")}: ${districtSegment}    ${dateStr}`;
}

/** Stesso schema di `evaluationCardHeadingText`: numero, distretti, data DD.MM.YYYY. */
function testSessionListHeadingText(s, tt) {
  const districtLabels = (s.distretti || [])
    .map((d) => {
      const nome = d?.nome;
      if (!nome) return "";
      return tt(`options.distretti.${String(nome).toLowerCase()}`) || nome;
    })
    .filter(Boolean);
  const districtSegment = districtLabels.length
    ? districtLabels.join(", ")
    : "—";
  const num = s.numeroTest ?? "-";
  const dateStr = s.data ? formatDateDMY(s.data) : "—";
  return `${tt("testSession.number")}: ${num}   ${tt("evaluation.district")}: ${districtSegment}    ${dateStr}`;
}

/** Dati VAS per grafici: se c’è solo dolore generale, replica il valore sulle 5 voci. */
function painDataForChart(sideDolore, distretto) {
  const base = { ...(sideDolore || {}) };
  const keys = [
    "riposo",
    "mattino",
    "sera",
    "duranteAttivita",
    "dopoAttivita",
  ];
  if (keys.some((k) => base[k] !== "" && base[k] != null)) return base;
  const g = distretto?.doloreGeneraleVAS;
  if (g === "" || g == null) return base;
  const v = String(g);
  return Object.fromEntries(keys.map((k) => [k, v]));
}

function PatientDetail({
  selected,
  tt,
  editPatient,
  removePatient,
  startNewEvaluation,
  startNewTestSession,
  editEvaluation,
  deleteEvaluation,
  editTestSession,
  deleteTestSession,
}) {
  const pdfRef = useRef(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [showEvaluationsList, setShowEvaluationsList] = useState(false);
  const [showTestsList, setShowTestsList] = useState(false);
  const [showComparativeCharts, setShowComparativeCharts] = useState(false);
  const [showTestCharts, setShowTestCharts] = useState(false);
  /** Una sola valutazione / sessione test espansa alla volta (in export PDF si mostrano tutte). */
  const [expandedEvaluationId, setExpandedEvaluationId] = useState(null);
  const [expandedTestSessionId, setExpandedTestSessionId] = useState(null);
  const revealEvaluations = showEvaluationsList || isExportingPdf;
  const revealTests = showTestsList || isExportingPdf;
  const revealComparativeCharts =
    showComparativeCharts || isExportingPdf;
  const revealTestChartsPanel = showTestCharts || isExportingPdf;

  useEffect(() => {
    if (!showEvaluationsList) setExpandedEvaluationId(null);
  }, [showEvaluationsList]);

  useEffect(() => {
    if (!showTestsList) setExpandedTestSessionId(null);
  }, [showTestsList]);

  async function exportPdf() {
    const element = pdfRef.current;
    if (!element) return;

    setIsExportingPdf(true);
    await new Promise((r) => requestAnimationFrame(() => r()));

    try {
      await html2pdf()
        .set(
          getHtml2PdfOptions(`${selected.nome}_${selected.cognome}.pdf`)
        )
        .from(element)
        .save();
    } finally {
      setIsExportingPdf(false);
    }
  }

  return (
    <div ref={pdfRef} className={`pdf-root ${isExportingPdf ? "pdf-exporting" : ""}`}>
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
          </div>
        </div>
        <div className="pdf-header-actions no-pdf">
          <button
            type="button"
            className="pdf-generate-btn"
            onClick={exportPdf}
            disabled={isExportingPdf}
          >
            {isExportingPdf
              ? tt("common.loading", "Preparazione...")
              : tt("common.generatePdf")}
          </button>
        </div>
      </header>

      <h2>
        {selected.nome || "-"} {selected.cognome || "-"}
        {selected.dataNascita
          ? `  ${formatDateDMY(selected.dataNascita)}`
          : ""}
      </h2>

      {(patientTrim(selected.peso) ||
        patientTrim(selected.altezza) ||
        patientTrim(calcBMI(selected.peso, selected.altezza)) ||
        patientTrim(selected.sesso) ||
        patientTrim(selected.manoDominante)) && (
        <p
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "0 12px",
            alignItems: "baseline",
          }}
        >
          {patientTrim(selected.peso) ? (
            <span>
              <strong>{tt("patient.weight")}:</strong> {selected.peso} kg
            </span>
          ) : null}
          {patientTrim(selected.altezza) ? (
            <span>
              <strong>{tt("patient.height")}:</strong> {selected.altezza} cm
            </span>
          ) : null}
          {patientTrim(calcBMI(selected.peso, selected.altezza)) ? (
            <span>
              <strong>{tt("patient.bmi")}:</strong>{" "}
              {calcBMI(selected.peso, selected.altezza)}
            </span>
          ) : null}
          {patientTrim(selected.sesso) ? (
            <span>
              <strong>{tt("patient.sex")}:</strong>{" "}
              {tt(`options.sex.${selected.sesso}`) || selected.sesso}
            </span>
          ) : null}
          {patientTrim(selected.manoDominante) ? (
            <span>
              <strong>{tt("patient.dominantHand")}:</strong>{" "}
              {tt(`dominantHand.${selected.manoDominante}`) ||
                selected.manoDominante}
            </span>
          ) : null}
        </p>
      )}

      {patientTrim(selected.variazionePeso) && (
        <p>
          <strong>{tt("patient.weightChange")}:</strong>{" "}
          {tt(`options.yesNo.${selected.variazionePeso}`) ||
            selected.variazionePeso}
        </p>
      )}

      {selected.variazionePeso === "Sì" &&
        patientTrim(manualTextLower(selected.motivoVariazionePeso)) && (
          <p>
            <strong>{tt("patient.weightChangeReason")}:</strong>{" "}
            {manualTextLower(selected.motivoVariazionePeso)}
          </p>
        )}

      {(() => {
        const farm = patientTrim(manualTextLower(selected.farmaci));
        const pat = patientTrim(manualTextLower(selected.patologie));
        const ep =
          selected.epilessia &&
          (tt(`options.yesNo.${selected.epilessia}`) || selected.epilessia);
        const epStr = patientTrim(ep);
        if (!farm && !pat && !epStr) return null;
        const chunks = [];
        if (farm) {
          chunks.push(
            <span key="farm">
              <strong>{tt("patient.medications")}:</strong> {farm}
            </span>
          );
        }
        if (pat) {
          chunks.push(
            <span key="pat">
              <strong>{tt("patient.pathologies")}:</strong> {pat}
            </span>
          );
        }
        if (epStr) {
          chunks.push(
            <span key="ep">
              <strong>{tt("patient.epilepsy")}:</strong> {epStr}
            </span>
          );
        }
        return (
          <p
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "0 12px",
              alignItems: "baseline",
            }}
          >
            {chunks.flatMap((el, i) =>
              i === 0 ? [el] : [<span key={`sep-${i}`}>|</span>, el]
            )}
          </p>
        );
      })()}

      {patientTrim(manualTextLower(selected.antecedentiChirurgici)) && (
        <p>
          <strong>{tt("patient.relevantSurgeryHistory")}:</strong>{" "}
          {manualTextLower(selected.antecedentiChirurgici)}
        </p>
      )}

      {selected.sesso === "Donna" &&
        (() => {
          const yn = (v) =>
            v ? tt(`options.yesNo.${v}`) || v : "";
          const parts = [];
          if (patientTrim(selected.figli)) {
            parts.push(`${tt("patient.children")}: ${yn(selected.figli)}`);
            if (selected.figli === "Sì") {
              if (patientTrim(selected.numeroFigli)) {
                parts.push(
                  `${tt("patient.childrenCount")}: ${selected.numeroFigli}`
                );
              }
              if (patientTrim(selected.tipoParto)) {
                parts.push(
                  `${tt("patient.birthMode")}: ${
                    tt(`options.birthType.${selected.tipoParto}`) ||
                    selected.tipoParto
                  }`
                );
              }
            }
          }
          if (patientTrim(selected.riabilitazionePerineale)) {
            parts.push(
              `${tt("patient.perinealRehab")}: ${yn(
                selected.riabilitazionePerineale
              )}`
            );
          }
          if (patientTrim(selected.incontinenza)) {
            parts.push(
              `${tt("patient.urinaryIncontinence")}: ${yn(
                selected.incontinenza
              )}`
            );
          }
          if (!parts.length) return null;
          return (
            <p style={{ lineHeight: 1.45 }}>{parts.join(" | ")}</p>
          );
        })()}

      {patientTrim(manualTextLower(selected.dominioLavoro)) && (
        <p>
          <strong>{tt("patient.workEducation")}:</strong>{" "}
          {manualTextLower(selected.dominioLavoro)}
        </p>
      )}

      {patientTrim(manualTextLower(selected.rischiProfessionali)) && (
        <p>
          <strong>{tt("patient.professionalRiskNotes")}:</strong>{" "}
          {manualTextLower(selected.rischiProfessionali)}
        </p>
      )}

{/* motivoAccesso (Referral / Già cliente / Internet): salvato nei dati e nell’export JSON per statistiche; non mostrato in questa scheda. */}

      {(() => {
        const list = (selected.sportMultipli || [])
          .filter(Boolean)
          .map((s) => {
            const lower = String(s).toLowerCase();
            const upper =
              String(s).charAt(0).toUpperCase() + String(s).slice(1);
            return (
              tt(`options.sport.${lower}`) ||
              tt(`options.sport.${upper}`) ||
              s
            );
          })
          .join(", ");
        const extra = patientTrim(manualTextLower(selected.sportAltro));
        const body =
          list && extra ? `${list}, ${extra}` : list || extra || "";
        if (!body) return null;
        return (
          <p>
            <strong>{tt("patient.sports")}:</strong> {body}
          </p>
        );
      })()}

      {patientTrim(selected.sportLivello) && (
        <p>
          <strong>{tt("patient.sportPracticeLevel")}:</strong>{" "}
          {tt(`options.sportLevel.${selected.sportLivello}`) ||
            selected.sportLivello}
        </p>
      )}

      {(selected.sportMultipli || []).some(
        (s) => String(s).toLowerCase() === "running"
      ) &&
        (() => {
          const trim = (v) =>
            v != null && String(v).trim() !== ""
              ? manualTextLower(String(v).trim())
              : "";
          const parts = [];
          const km = trim(selected.running10km);
          const mez = trim(selected.runningMezza);
          const mar = trim(selected.runningMaratona);
          if (km) parts.push(`${tt("patient.running10km")}: ${km}`);
          if (mez) parts.push(`${tt("patient.runningHalfMarathon")}: ${mez}`);
          if (mar) parts.push(`${tt("patient.runningMarathon")}: ${mar}`);
          if (!parts.length) return null;
          return (
            <p>
              <strong>{tt("patient.running")}:</strong> {parts.join(" | ")}
            </p>
          );
        })()}

{(selected.sportMultipli || []).some(
  (s) => String(s).toLowerCase() === "fitness"
) &&
  selected.fitnessTipo && (
    <p>
      <strong>{tt("patient.fitness")}:</strong>{" "}
      {tt(`options.fitnessType.${selected.fitnessTipo}`) ||
        selected.fitnessTipo}
    </p>
  )}

      {(selected.sportMultipli || []).some(
        (s) => String(s).toLowerCase() === "surf"
      ) &&
        patientTrim(selected.surfStance) && (
          <p>
            <strong>{tt("options.sport.surf") ?? "Surf"}:</strong>{" "}
            {tt(`options.boardStance.${selected.surfStance}`) ||
              selected.surfStance}
          </p>
        )}

      {(selected.sportMultipli || []).some(
        (s) => String(s).toLowerCase() === "snowboard"
      ) &&
        patientTrim(selected.snowboardStance) && (
          <p>
            <strong>{tt("options.sport.snowboard") ?? "Snowboard"}:</strong>{" "}
            {tt(`options.boardStance.${selected.snowboardStance}`) ||
              selected.snowboardStance}
          </p>
        )}

      {(selected.sportMultipli || []).some(
        (s) => String(s).toLowerCase() === "skateboard"
      ) &&
        patientTrim(selected.skateboardStance) && (
          <p>
            <strong>{tt("options.sport.skateboard") ?? "Skateboard"}:</strong>{" "}
            {tt(`options.boardStance.${selected.skateboardStance}`) ||
              selected.skateboardStance}
          </p>
        )}

      {(selected.sportMultipli || []).some(
        (s) => String(s).toLowerCase() === "tennis"
      ) &&
        (() => {
          const bh =
            selected.tennisBackhand &&
            (tt(`options.tennisBackhand.${selected.tennisBackhand}`) ||
              selected.tennisBackhand);
          const tension = patientTrim(
            manualTextLower(selected.tennisStringTension)
          );
          const racket = selected.tennisRacketChangedRecently
            ? tt(`options.yesNo.${selected.tennisRacketChangedRecently}`) ||
              selected.tennisRacketChangedRecently
            : "";
          const segs = [];
          if (patientTrim(bh)) {
            segs.push(
              `${tt("patient.tennisBackhand") ?? "Rovescio"}: ${bh}`
            );
          }
          if (tension) {
            segs.push(
              `${tt("patient.tennisStringTension") ?? "Tensione corde"}: ${tension}`
            );
          }
          if (patientTrim(racket)) {
            segs.push(
              `${tt("patient.tennisRacketChangedRecently") ?? "Racchetta cambiata"}: ${racket}`
            );
          }
          if (!segs.length) return null;
          return (
            <p>
              <strong>{tt("options.sport.tennis") ?? "Tennis"}:</strong>{" "}
              {segs.join(" | ")}
            </p>
          );
        })()}

      {(selected.sportMultipli || []).some(
        (s) => String(s).toLowerCase() === "padel"
      ) &&
        patientTrim(selected.padelRacketChangedRecently) && (
          <p>
            <strong>{tt("options.sport.padel") ?? "Padel"}:</strong>{" "}
            {tt("patient.padelRacketChangedRecently") ??
              "Racchetta cambiata di recente"}
            :{" "}
            {tt(`options.yesNo.${selected.padelRacketChangedRecently}`) ||
              selected.padelRacketChangedRecently}
          </p>
        )}

      {selected.tegner !== "" &&
        selected.tegner != null &&
        patientTrim(String(selected.tegner)) && (
          <p>
            <strong>{tt("patient.tegner")}:</strong> {selected.tegner}{" "}
            {`- ${tt(`options.tegner.${selected.tegner}`) || tegnerInfo[selected.tegner]}`}
          </p>
        )}

      {patientTrim(selected.oreSport) && (
        <p>
          <strong>{tt("patient.weeklySportHours")}:</strong>{" "}
          {tt(`options.weeklySportHours.${selected.oreSport}`) ||
            selected.oreSport}
        </p>
      )}

      {(() => {
        const dxRows = migrateDiagnosiRighe(selected).filter((row) =>
          patientDiagnosiRowIsFilled(row, tt)
        );
        const imgMain =
          tt(`options.imaging.${selected.diagnostica}`) ||
          patientTrim(selected.diagnostica);
        const imgDet = patientTrim(
          manualTextLower(selected.diagnosticaDettagli)
        );
        const hasDx = dxRows.length > 0;
        const hasImg = patientTrim(imgMain) || imgDet;
        if (!hasDx && !hasImg) return null;
        return (
          <div className="patient-sheet-dx-img-row">
            {hasDx ? (
              <div className="patient-sheet-dx-col">
                <strong>{tt("patient.diagnosisShort")}:</strong>
                <ul className="patient-sheet-dx-list">
                  {dxRows.map((row) => {
                    const dx = translatedPatientDiagnosis(row.diagnosi, tt);
                    const dist = row.distrettoDiagnosi
                      ? translatedDistrettoDiagnosi(
                          row.distrettoDiagnosi,
                          tt
                        )
                      : "";
                    const det = manualTextLower(row.dettagli);
                    const main = [dx, dist].filter(Boolean).join(" — ");
                    const detT = patientTrim(det);
                    return (
                      <li key={row.id}>
                        {main ? (
                          <>
                            {main}
                            {detT ? (
                              <span style={{ color: "var(--text-muted)" }}>
                                {" "}
                                — {det}
                              </span>
                            ) : null}
                          </>
                        ) : detT ? (
                          <span>{det}</span>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}
            {hasImg ? (
              <div className="patient-sheet-img-col">
                {patientTrim(imgMain) ? (
                  <p style={{ margin: "0 0 6px" }}>
                    <strong>{tt("patient.imaging")}:</strong> {imgMain}
                  </p>
                ) : null}
                {imgDet ? (
                  <p style={{ margin: 0 }}>
                    <strong>{tt("patient.imagingDetails")}:</strong> {imgDet}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        );
      })()}

      {(() => {
        const img2 =
          tt(`options.imaging.${selected.diagnostica2}`) ||
          patientTrim(selected.diagnostica2);
        const det2 = patientTrim(
          manualTextLower(selected.diagnosticaDettagli2)
        );
        if (!patientTrim(img2) && !det2) return null;
        return (
          <>
            {patientTrim(img2) ? (
              <p>
                <strong>{tt("patient.imaging2")}:</strong> {img2}
              </p>
            ) : null}
            {det2 ? (
              <p>
                <strong>{tt("patient.imagingDetails2")}:</strong> {det2}
              </p>
            ) : null}
          </>
        );
      })()}

      {patientTrim(selected.dataInfortunio) && (
        <p>
          <strong>{tt("patient.injuryDate")}:</strong>{" "}
          {`${formatDateDMY(selected.dataInfortunio)} \u2026 ${timeSinceYWD(
            selected.dataInfortunio,
            tt
          )}`}
        </p>
      )}

      {patientTrim(selected.dataOperazione) && (
        <p>
          <strong>{tt("patient.surgeryDateShort")}:</strong>{" "}
          {`${formatDateDMY(selected.dataOperazione)} \u2026 ${timeSinceYWD(
            selected.dataOperazione,
            tt
          )}`}
        </p>
      )}

      {patientTrim(selected.artoOperato) && (
        <p>
          <strong>{tt("patient.operatedLimbShort")}:</strong>{" "}
          {tt(`options.operatedLimb.${selected.artoOperato}`) ||
            selected.artoOperato}
        </p>
      )}

      {patientTrim(selected.tipoOperazione) && (
        <p>
          <strong>{tt("patient.surgeryType")}:</strong>{" "}
          {tt(`options.surgeryType.${selected.tipoOperazione}`) ||
            selected.tipoOperazione}
        </p>
      )}
      <div className="no-pdf patient-sheet-actions">
        <button type="button" onClick={() => editPatient(selected)}>
          {tt("common.edit")}
        </button>
        <button type="button" onClick={() => removePatient(selected.id)}>
          {tt("common.delete")}
        </button>
      </div>

      <hr className="patient-sheet-divider" />

      <div className="no-pdf patient-sheet-toolbar">
        <button
          type="button"
          onClick={() => {
            setShowEvaluationsList((open) => {
              const next = !open;
              if (next) {
                setShowTestsList(false);
                setShowComparativeCharts(false);
                setShowTestCharts(false);
              }
              return next;
            });
          }}
        >
          {tt("patient.sheetEvaluations")}
        </button>
        <button type="button" onClick={startNewEvaluation}>
          {tt("common.newEvaluation")}
        </button>
        <button type="button" onClick={startNewTestSession}>
          {tt("patient.sheetNewTest")}
        </button>
        <button
          type="button"
          onClick={() => {
            setShowTestsList((open) => {
              const next = !open;
              if (next) {
                setShowEvaluationsList(false);
                setShowComparativeCharts(false);
                setShowTestCharts(false);
              }
              return next;
            });
          }}
        >
          {tt("patient.sheetTests")}
        </button>
        <button
          type="button"
          onClick={() => {
            setShowComparativeCharts((open) => {
              const next = !open;
              if (next) {
                setShowEvaluationsList(false);
                setShowTestsList(false);
                setShowTestCharts(false);
              }
              return next;
            });
          }}
        >
          {tt("patient.sheetComparativeCharts")}
        </button>
        <button
          type="button"
          onClick={() => {
            setShowTestCharts((open) => {
              const next = !open;
              if (next) {
                setShowEvaluationsList(false);
                setShowTestsList(false);
                setShowComparativeCharts(false);
              }
              return next;
            });
          }}
        >
          {tt("patient.sheetTestCharts")}
        </button>
      </div>

      {(revealTests ||
        revealEvaluations ||
        revealComparativeCharts ||
        revealTestChartsPanel) && (
        <div
          className="patient-sheet-list-panel"
          style={{
            marginTop: 12,
            padding: "14px 16px",
            border: "1px solid #e2e8f0",
            borderRadius: 10,
            background: "#fafbfc",
          }}
        >
      {revealTests && (
        <>
          <h3 style={{ marginTop: 0, marginBottom: 10 }}>
            {tt("patient.testsListTitle")}
          </h3>
          {(selected.sessioniTest || []).length === 0 ? (
            <p>{tt("patient.testsListEmpty")}</p>
          ) : (
            (selected.sessioniTest || []).map((s) => {
              const showTestDetail =
                isExportingPdf || expandedTestSessionId === s.id;
              return (
              <div
                key={s.id}
                style={{
                  border: "1px solid #ccc",
                  borderRadius: 10,
                  padding: 12,
                  marginBottom: 12,
                }}
              >
                <div
                  className="no-pdf"
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    gap: 10,
                    marginBottom: showTestDetail ? 12 : 0,
                  }}
                >
                  <label
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 8,
                      cursor: "pointer",
                      margin: 0,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={expandedTestSessionId === s.id}
                      onChange={() =>
                        setExpandedTestSessionId((cur) =>
                          cur === s.id ? null : s.id
                        )
                      }
                      aria-expanded={showTestDetail}
                    />
                    <span>{testSessionListHeadingText(s, tt)}</span>
                  </label>
                </div>
                {isExportingPdf && (
                  <h4 className="eval-evaluation-card-title eval-evaluation-card-title--centered">
                    {testSessionListHeadingText(s, tt)}
                  </h4>
                )}

                {showTestDetail && (
                <>
                <p style={{ marginTop: 4, textAlign: "left" }}>
                  <strong>{tt("testSession.notes")}:</strong>{" "}
                  {String(s.note ?? "").trim() || "—"}
                </p>

                {(s.distretti || []).map((d) => (
                  <div key={d.id} style={{ marginBottom: 10 }}>
                    {(s.distretti || []).length > 1 && (
                      <div
                        style={{
                          fontSize: 12,
                          color: "#666",
                          marginBottom: 6,
                        }}
                      >
                        {tt(`options.distretti.${d.nome.toLowerCase()}`) ||
                          d.nome}
                      </div>
                    )}

                    {distrettoActiveTests(d).length > 0 && (
                      <div style={{ marginTop: 10 }}>
                        {distrettoActiveTests(d).map((test) => (
                          <div
                            key={test.id}
                            className="test-result-card"
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
                                <strong>
                                  {tt("tests.yBalance.title") ?? "Y Balance Test"}
                                </strong>

                                {test.noteAltro &&
                                  String(test.noteAltro).trim() !== "" && (
                                    <p style={{ marginTop: 6 }}>
                                      <strong>
                                        {tt("evaluation.otherDetailsOptional")}:
                                      </strong>{" "}
                                      {String(test.noteAltro).trim()}
                                    </p>
                                  )}

                                <div style={{ marginTop: 8 }}>
                                  <strong>Composite score</strong>
                                  <div>
                                    {tt("evaluation.left")}:{" "}
                                    {calculateYBalance(test).left.composite.toFixed(1)}%
                                  </div>
                                  <div>
                                    {tt("evaluation.right")}:{" "}
                                    {calculateYBalance(test).right.composite.toFixed(1)}%
                                  </div>
                                </div>

                                <div style={{ marginTop: 8 }}>
                                  <strong>Asymmetry</strong>
                                  <div>
                                    Anterior:{" "}
                                    {calculateYBalance(test).asymmetry.anterior.toFixed(1)}{" "}
                                    cm
                                  </div>
                                  <div>
                                    Composite:{" "}
                                    {calculateYBalance(test).asymmetry.composite.toFixed(1)}%
                                  </div>
                                </div>

                                <div style={{ marginTop: 8 }}>
                                  <strong>Clinical classification</strong>
                                  <div>
                                    {tt("evaluation.left")}:{" "}
                                    <span
                                      style={{
                                        color: classifyYBalance(
                                          calculateYBalance(test)
                                        ).leftComposite.color,
                                      }}
                                    >
                                      {
                                        classifyYBalance(calculateYBalance(test))
                                          .leftComposite.label
                                      }
                                    </span>
                                  </div>
                                  <div>
                                    {tt("evaluation.right")}:{" "}
                                    <span
                                      style={{
                                        color: classifyYBalance(
                                          calculateYBalance(test)
                                        ).rightComposite.color,
                                      }}
                                    >
                                      {
                                        classifyYBalance(calculateYBalance(test))
                                          .rightComposite.label
                                      }
                                    </span>
                                  </div>
                                  <div>
                                    Anterior asymmetry:{" "}
                                    <span
                                      style={{
                                        color: classifyYBalance(
                                          calculateYBalance(test)
                                        ).anteriorAsymmetry.color,
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
                                  {["left", "right"].map((side) => (
                                    <div key={side}>
                                      <div style={{ fontWeight: "bold", marginBottom: 6 }}>
                                        {side === "left"
                                          ? tt("evaluation.left")
                                          : tt("evaluation.right")}
                                      </div>
                                      <div>Leg length: {test[side]?.legLength || "-"}</div>
                                      {[
                                        { key: "anterior", label: "Anterior" },
                                        {
                                          key: "posteromedial",
                                          label: "Posteromedial",
                                        },
                                        {
                                          key: "posterolateral",
                                          label: "Posterolateral",
                                        },
                                      ].map((direction) => (
                                        <div key={direction.key} style={{ marginTop: 6 }}>
                                          <strong>{direction.label}:</strong>{" "}
                                          {(test[side]?.[direction.key] || []).join(" / ") ||
                                            "-"}
                                        </div>
                                      ))}
                                    </div>
                                  ))}
                                </div>
                              </>
                            )}

                            {test.type === "GRIP_STRENGTH" && (
                              <>
                                <strong>
                                  {tt("tests.gripStrength.title") ?? "Grip test (Jamar)"}
                                </strong>
                                {test.noteAltro &&
                                  String(test.noteAltro).trim() !== "" && (
                                    <p style={{ marginTop: 6 }}>
                                      <strong>
                                        {tt("evaluation.otherDetailsOptional")}:
                                      </strong>{" "}
                                      {String(test.noteAltro).trim()}
                                    </p>
                                  )}
                                <GripStrengthTestSummary
                                  patient={selected}
                                  evaluationDate={s.data}
                                  test={test}
                                  tt={tt}
                                />
                              </>
                            )}

                            {test.type === "STRENGTH_MAXIMALS" && (
                              <>
                                <strong>
                                  {tt("tests.strengthMaximals.title") ??
                                    "Massimali pesistica"}
                                </strong>
                                {test.noteAltro &&
                                  String(test.noteAltro).trim() !== "" && (
                                    <p style={{ marginTop: 6 }}>
                                      <strong>
                                        {tt("evaluation.otherDetailsOptional")}:
                                      </strong>{" "}
                                      {String(test.noteAltro).trim()}
                                    </p>
                                  )}
                                <p style={{ fontSize: 11, color: "#666", marginTop: 6 }}>
                                  {tt("tests.strengthMaximals.epleyFootnote")}
                                </p>
                                <table
                                  border="1"
                                  cellPadding="6"
                                  style={{
                                    borderCollapse: "collapse",
                                    marginTop: 8,
                                    width: "100%",
                                  }}
                                >
                                  <thead>
                                    <tr>
                                      <th>{tt("tests.strengthMaximals.exercise")}</th>
                                      <th>{tt("tests.strengthMaximals.reps")}</th>
                                      <th>{tt("tests.strengthMaximals.weightKg")}</th>
                                      <th>{tt("tests.strengthMaximals.theor1RM")}</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {(test.lifts || []).map((line) => {
                                      const ex =
                                        line.exercise === OTHER_EXERCISE
                                          ? line.exerciseOther ||
                                            tt("evaluation.otherExercise") ||
                                            "Altro"
                                          : line.exercise
                                            ? tt(
                                                `tests.strengthMaximals.exercises.${line.exercise}`
                                              ) || line.exercise
                                            : "—";
                                      const oneRm = epleyOneRmKg(
                                        line.weightKg,
                                        line.reps
                                      );
                                      const oneRmCell = formatOneRmKg(oneRm) ?? "—";
                                      return (
                                        <tr key={line.id}>
                                          <td>{ex}</td>
                                          <td>{line.reps ?? "-"}</td>
                                          <td>{line.weightKg ?? "-"}</td>
                                          <td>{oneRmCell}</td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                <div className="no-pdf" style={{ marginTop: 10 }}>
                  <button type="button" onClick={() => editTestSession(s)}>
                    {tt("testSession.edit")}
                  </button>{" "}
                  <button type="button" onClick={() => deleteTestSession(s.id)}>
                    {tt("testSession.delete")}
                  </button>
                </div>
                </>
                )}
              </div>
              );
            })
          )}
        </>
      )}

      {revealEvaluations && (
        <>
          <h3
            style={{
              marginTop: revealTests ? 20 : 0,
              marginBottom: 10,
            }}
          >
            {tt("patient.sheetEvaluations")}
          </h3>
      {(selected.valutazioni || []).length === 0 && (
        <p>{tt("evaluation.noEvaluations")}</p>
      )}

      {(selected.valutazioni || []).map((v) => {
        const showEvalDetail =
          isExportingPdf || expandedEvaluationId === v.id;
        return (
        <div
          key={v.id}
          style={{
            border: "1px solid #ccc",
            borderRadius: 10,
            padding: 12,
            marginBottom: 12,
          }}
        >
          <div
            className="no-pdf"
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: 10,
              marginBottom: showEvalDetail ? 12 : 0,
            }}
          >
            <label
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 8,
                cursor: "pointer",
                margin: 0,
              }}
            >
              <input
                type="checkbox"
                checked={expandedEvaluationId === v.id}
                onChange={() =>
                  setExpandedEvaluationId((cur) =>
                    cur === v.id ? null : v.id
                  )
                }
                aria-expanded={showEvalDetail}
              />
              <span>{evaluationCardHeadingText(v, tt)}</span>
            </label>
          </div>
          {isExportingPdf && (
            <h4 className="eval-evaluation-card-title eval-evaluation-card-title--centered">
              {evaluationCardHeadingText(v, tt)}
            </h4>
          )}

          {showEvalDetail && (
          <>
          <p style={{ marginTop: 4, textAlign: "left" }}>
            <strong>{tt("evaluation.notes")}:</strong>{" "}
            {(() => {
              const raw =
                v?.note != null
                  ? String(v.note)
                  : v?.notes != null && typeof v.notes === "string"
                    ? String(v.notes)
                    : "";
              const t = raw.trim();
              return t || "—";
            })()}
          </p>

          {(v.distretti || []).map((d) => (
            <div key={d.id} style={{ marginBottom: 10 }}>
              {(v.distretti || []).length > 1 && (
                <div
                  style={{
                    fontSize: 12,
                    color: "#666",
                    marginBottom: 6,
                  }}
                >
                  {tt(`options.distretti.${d.nome.toLowerCase()}`) || d.nome}
                </div>
              )}

              {distrettoHasKiviat(d) && (
              <>
              <div className="eval-district-section-label eval-district-section-label--block">
                {tt("evaluation.blockType.KIVIAT")}:
              </div>
              <table
                className="eval-district-table"
                border="1"
                cellPadding="6"
                style={{
                  borderCollapse: "collapse",
                  marginTop: 5,
                  width: "100%",
                }}
              >
                <colgroup>
                  <col style={{ width: "14%" }} />
                  <col style={{ width: "17.2%" }} />
                  <col style={{ width: "17.2%" }} />
                  <col style={{ width: "17.2%" }} />
                  <col style={{ width: "17.2%" }} />
                  <col style={{ width: "17.2%" }} />
                </colgroup>
                <thead>
                  <tr>
                    <th></th>
                    <th>{tt("evaluation.strength")}</th>
                    <th>{tt("evaluation.function")}</th>
                    <th>{tt("evaluation.passiveMobilityShort")}</th>
                    <th>{tt("evaluation.activeMobilityShort")}</th>
                    <th>{tt("evaluation.movementQualityShort")}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="eval-table-side">{tt("evaluation.left")}</td>
                    <td>{d.sinistro?.forza || "-"}</td>
                    <td>{d.sinistro?.funzione || "-"}</td>
                    <td>{d.sinistro?.mobilitaPassiva || "-"}</td>
                    <td>{d.sinistro?.mobilitaAttiva || "-"}</td>
                    <td>{d.sinistro?.qualitaMovimento ?? "-"}</td>
                  </tr>
                  <tr>
                    <td className="eval-table-side">{tt("evaluation.right")}</td>
                    <td>{d.destro?.forza || "-"}</td>
                    <td>{d.destro?.funzione || "-"}</td>
                    <td>{d.destro?.mobilitaPassiva || "-"}</td>
                    <td>{d.destro?.mobilitaAttiva || "-"}</td>
                    <td>{d.destro?.qualitaMovimento ?? "-"}</td>
                  </tr>
                </tbody>
              </table>
              </>
              )}

              {distrettoHasSidePainTable(d) && (
              <div style={{ marginTop: 8 }}>
                <div className="eval-district-section-label eval-district-section-label--block">
                  {tt("evaluation.painVAS")}:
                </div>

                <table
                  className="eval-district-table"
                  border="1"
                  cellPadding="6"
                  style={{
                    borderCollapse: "collapse",
                    marginTop: 5,
                    width: "100%",
                  }}
                >
                  <colgroup>
                    <col style={{ width: "14%" }} />
                    <col style={{ width: "17.2%" }} />
                    <col style={{ width: "17.2%" }} />
                    <col style={{ width: "17.2%" }} />
                    <col style={{ width: "17.2%" }} />
                    <col style={{ width: "17.2%" }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th></th>
                      <th>{tt("evaluation.rest")}</th>
                      <th>{tt("evaluation.morning")}</th>
                      <th>{tt("evaluation.evening")}</th>
                      <th>{tt("evaluation.duringActivity")}</th>
                      <th>{tt("evaluation.afterActivity")}</th>
                    </tr>
                  </thead>
                  <tbody>
                  <tr>
                    <td className="eval-table-side">{tt("evaluation.left")}</td>
                    <td>{d.sinistro?.dolore?.riposo ?? d.dolore?.riposo ?? "-"}</td>
                    <td>{d.sinistro?.dolore?.mattino ?? d.dolore?.mattino ?? "-"}</td>
                    <td>{d.sinistro?.dolore?.sera ?? d.dolore?.sera ?? "-"}</td>
                    <td>{d.sinistro?.dolore?.duranteAttivita ?? d.dolore?.duranteAttivita ?? "-"}</td>
                    <td>{d.sinistro?.dolore?.dopoAttivita ?? d.dolore?.dopoAttivita ?? "-"}</td>
                  </tr>
                  <tr>
                    <td className="eval-table-side">{tt("evaluation.right")}</td>
                    <td>{d.destro?.dolore?.riposo ?? d.dolore?.riposo ?? "-"}</td>
                    <td>{d.destro?.dolore?.mattino ?? d.dolore?.mattino ?? "-"}</td>
                    <td>{d.destro?.dolore?.sera ?? d.dolore?.sera ?? "-"}</td>
                    <td>{d.destro?.dolore?.duranteAttivita ?? d.dolore?.duranteAttivita ?? "-"}</td>
                    <td>{d.destro?.dolore?.dopoAttivita ?? d.dolore?.dopoAttivita ?? "-"}</td>
                  </tr>
                  </tbody>
</table>
</div>
              )}

              {distrettoHasGeneralPainVAS(d) && (
                <div
                  className="eval-district-section-label eval-district-section-label--block eval-district-section-label--with-value"
                  style={{ marginTop: 8 }}
                >
                  {tt("evaluation.generalPainVAS")}:{" "}
                  <span className="eval-district-section-value">
                    {d.doloreGeneraleVAS || "-"}
                  </span>
                </div>
              )}

            </div>
          ))}

          <div className="no-pdf" style={{ marginTop: 10 }}>
            <button type="button" onClick={() => editEvaluation(v)}>
              {tt("evaluation.editEvaluation")}
            </button>{" "}
            <button type="button" onClick={() => deleteEvaluation(v.id)}>
              {tt("evaluation.deleteEvaluation")}
            </button>
          </div>
          </>
          )}
        </div>
        );
      })}

        </>
      )}

      {revealComparativeCharts && (
        <>
          <h3
            style={{
              marginTop:
                revealTests || revealEvaluations || revealTestChartsPanel
                  ? 20
                  : 0,
              marginBottom: 10,
            }}
          >
            {tt("patient.sheetComparativeCharts")}
          </h3>
          <KiviatComparison selected={selected} tt={tt} />
        </>
      )}

      {revealTestChartsPanel && (
        <div
          style={{
            marginTop:
              revealTests || revealEvaluations || revealComparativeCharts
                ? 20
                : 0,
          }}
        >
          <PatientTestChartsPanel selected={selected} tt={tt} />
        </div>
      )}

        </div>
      )}
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
  const chartExportRoots = useRef({});
  const [exportingKiviatId, setExportingKiviatId] = useState(null);

  const [comparisons, setComparisons] = useState(() => [
    {
      id: uid(),
      distretto: "",
      valA: "",
      valB: "",
      mode: "lato",
    },
  ]);

  async function exportComparisonPdf(comp) {
    const el = chartExportRoots.current[comp.id];
    if (!el) return;
    const evA = valutazioni.find((x) => x.id === comp.valA);
    const evB = valutazioni.find((x) => x.id === comp.valB);
    const nA = evA?.numeroValutazione ?? "?";
    const nB = evB?.numeroValutazione ?? "?";
    const safe = (n) => String(n).replace(/[^\w.-]+/g, "_");

    setExportingKiviatId(comp.id);
    await new Promise((r) => requestAnimationFrame(() => r()));
    try {
      await exportHtmlToPdf(el, {
        filename: `Kiviat_${safe(selected?.nome)}_${safe(selected?.cognome)}_${safe(nA)}_${safe(nB)}.pdf`,
      });
    } catch (e) {
      console.error(e);
      alert(tt("chart.saveChartPdfError"));
    } finally {
      setExportingKiviatId(null);
    }
  }

  function addComparison() {
    if (comparisons.length >= 4) return;

    setComparisons([
      ...comparisons,
      {
        id: uid(),
        distretto: "",
        valA: "",
        valB: "",
        mode: "lato",
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
      <div className="no-pdf">
        <Section title={tt("chart.title")}>
          <p>{tt("chart.needTwoEvaluations")}</p>
        </Section>
      </div>
    );
  }

  const comparisonBoxStyle = {
    border: "1px solid #ddd",
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
  };

  return (
    <div style={comparisonBoxStyle} className="kiviat-comparison-wrap">
      <div className="no-pdf">
        <h3 style={{ marginTop: 0 }}>{tt("chart.title")}</h3>
      </div>

      {comparisons.map((c, index) => {
        const evA = valutazioni.find((x) => x.id === c.valA);
        const evB = valutazioni.find((x) => x.id === c.valB);
        return (
          <div key={c.id}>
          <div className="no-pdf">
            <h4>
              {tt("chart.comparison")} {index + 1}
            </h4>

            {comparisons.length > 1 && (
              <button type="button" onClick={() => removeComparison(c.id)}>
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
                label: evaluationCardHeadingText(v, tt),
              }))}
            />

            <SelectWithLabels
              label={tt("chart.finalEvaluation")}
              value={c.valB}
              onChange={(v) => updateComparison(c.id, "valB", v)}
              options={valutazioni.map((v) => ({
                value: v.id,
                label: evaluationCardHeadingText(v, tt),
              }))}
            />
          </div>

          {c.distretto && c.valA && c.valB && (
            <>
              <div className="no-pdf" style={{ marginTop: 10 }}>
                <button
                  type="button"
                  disabled={exportingKiviatId === c.id}
                  onClick={() => exportComparisonPdf(c)}
                >
                  {exportingKiviatId === c.id
                    ? tt("common.loading", "…")
                    : tt("chart.saveChartPdf")}
                </button>
              </div>
              <div
                ref={(node) => {
                  chartExportRoots.current[c.id] = node;
                }}
                className={`kiviat-comparison-export-root pdf-root ${exportingKiviatId === c.id ? "pdf-exporting" : ""}`}
              >
                <div
                  className="pdf-avoid-break"
                  style={{
                    marginBottom: 12,
                    padding: "10px 12px",
                    borderBottom: "1px solid #e2e8f0",
                    fontSize: 12,
                    lineHeight: 1.45,
                  }}
                >
                  <div style={{ fontWeight: 700, color: "#0d5c68" }}>
                    Physiocare Nyon
                  </div>
                  <div style={{ marginTop: 6, fontWeight: 600 }}>
                    {[selected.nome, selected.cognome].filter(Boolean).join(" ") ||
                      "—"}
                  </div>
                  {selected.dataNascita ? (
                    <div style={{ color: "#64748b", fontSize: 11 }}>
                      {tt("patient.birthDate")}:{" "}
                      {formatDateDMY(selected.dataNascita)}
                    </div>
                  ) : null}
                  <div style={{ marginTop: 8, fontSize: 11, color: "#334155" }}>
                    {tt("chart.title")} · {tt("chart.comparison")} {index + 1} ·{" "}
                    {tt(`options.distretti.${String(c.distretto).toLowerCase()}`) ||
                      c.distretto}
                  </div>
                  <div style={{ fontSize: 11, color: "#475569" }}>
                    {tt("chart.initialEvaluation")}:{" "}
                    {evA ? evaluationCardHeadingText(evA, tt) : "—"} ·{" "}
                    {tt("chart.finalEvaluation")}:{" "}
                    {evB ? evaluationCardHeadingText(evB, tt) : "—"}
                  </div>
                </div>
                <KiviatResult
                  comparison={{ ...c, mode: "lato" }}
                  valutazioni={valutazioni}
                  tt={tt}
                />
              </div>
            </>
          )}
        </div>
        );
      })}

      <div className="no-pdf">
        <button type="button" onClick={addComparison}>
          {tt("chart.addComparison")}
        </button>
      </div>
    </div>
  );
}

/** Grafici «stessa sessione»: logica conservata, non mostrata finché resta `false`. */
const SHOW_KIVIAT_SESSIONE_GRAPHS = false;

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

const hasPainA =
  distrettoHasSidePainTable(distA) || distrettoHasGeneralPainVAS(distA);

const hasPainB =
  distrettoHasSidePainTable(distB) || distrettoHasGeneralPainVAS(distB);

  if (!distA || !distB) {
    return (
      <p style={{ color: "darkred" }}>
        {tt("chart.districtMissing")}
      </p>
    );
  }

  const districtLabel =
    tt(`options.distretti.${comparison.distretto}`) || comparison.distretto;

  const labelA = `${tt("evaluation.number")}: ${
    evA.numeroValutazione || "-"
  }   ${evA.data ? formatDateDMY(evA.data) : "—"}`;

  const labelB = `${tt("evaluation.number")}: ${
    evB.numeroValutazione || "-"
  }   ${evB.data ? formatDateDMY(evB.data) : "—"}`;

  const radarTitleLeft = `${districtLabel} ${tt("chart.leftSide")}`;
  const radarTitleRight = `${districtLabel} ${tt("chart.rightSide")}`;
  const painTitleLeft = `${tt("chart.painEvolution")} ${tt("chart.leftSide")}`;
  const painTitleRight = `${tt("chart.painEvolution")} ${tt("chart.rightSide")}`;

  if (SHOW_KIVIAT_SESSIONE_GRAPHS && comparison.mode === "sessione") {
    return (
      <div style={gridStyle} className="pdf-kiviat-grid">
        {hasKiviatA && (
          <RadarChart
            title={`${districtLabel} — ${labelA}`}
            series={[
              { name: tt("evaluation.left"), data: distA.sinistro },
              { name: tt("evaluation.right"), data: distA.destro },
            ]}
            tt={tt}
          />
        )}
  
        {hasKiviatB && (
          <RadarChart
            title={`${districtLabel} — ${labelB}`}
            series={[
              { name: tt("evaluation.left"), data: distB.sinistro },
              { name: tt("evaluation.right"), data: distB.destro },
            ]}
            tt={tt}
          />
        )}
  
        {hasPainA && hasPainB && (
          <>
            <PainBarChart
  title={`${districtLabel} — ${tt("evaluation.left")} — ${tt("chart.painEvolution") || tt("evaluation.painVAS")}`}
  series={[
    {
      name: labelA,
      data: painDataForChart(distA.sinistro?.dolore, distA),
    },
    {
      name: labelB,
      data: painDataForChart(distB.sinistro?.dolore, distB),
    },
  ]}
  tt={tt}
/>

<PainBarChart
  title={`${districtLabel} — ${tt("evaluation.right")} — ${tt("chart.painEvolution") || tt("evaluation.painVAS")}`}
  series={[
    {
      name: labelA,
      data: painDataForChart(distA.destro?.dolore, distA),
    },
    {
      name: labelB,
      data: painDataForChart(distB.destro?.dolore, distB),
    },
  ]}
  tt={tt}
/>
          </>
        )}
      </div>
    );
  } 

  return (
    <div style={gridStyle} className="pdf-kiviat-grid">
      <RadarChart
        title={radarTitleLeft}
        series={[
          { name: labelA, data: distA.sinistro },
          { name: labelB, data: distB.sinistro },
        ]}
        tt={tt}
      />
      <PainBarChart
        title={painTitleLeft}
        series={[
          {
            name: labelA,
            data: painDataForChart(distA.sinistro?.dolore, distA),
          },
          {
            name: labelB,
            data: painDataForChart(distB.sinistro?.dolore, distB),
          },
        ]}
        tt={tt}
      />

      <RadarChart
        title={radarTitleRight}
        series={[
          { name: labelA, data: distA.destro },
          { name: labelB, data: distB.destro },
        ]}
        tt={tt}
      />

      <PainBarChart
        title={painTitleRight}
        series={[
          {
            name: labelA,
            data: painDataForChart(distA.destro?.dolore, distA),
          },
          {
            name: labelB,
            data: painDataForChart(distB.destro?.dolore, distB),
          },
        ]}
        tt={tt}
      />
    </div>
  );
}

const KIVIAT_MAX_SCORE = 5;

function kiviatScoreToPercent(score) {
  const v = Number(score);
  if (!Number.isFinite(v) || v <= 0) return 0;
  return Math.min(100, Math.round((v / KIVIAT_MAX_SCORE) * 100));
}

function kiviatPercentColor(pct) {
  if (pct >= 80) return "#15803d";
  if (pct >= 60) return "#a16207";
  if (pct >= 40) return "#c2410c";
  return "#b91c1c";
}

const kiviatStrokeColors = ["#1d4ed8", "#b91c1c"];

const kiviatCardStyleMerged = {
  border: "1px solid #e2e8f0",
  borderRadius: 16,
  padding: 16,
  background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
  marginTop: 12,
  boxShadow: "0 4px 24px rgba(15, 23, 42, 0.06)",
};

function RadarChart({ title, series, tt }) {
  const rawId = useId().replace(/:/g, "");
  const blueGradId = `kiviat-blue-${rawId}`;
  const redGradId = `kiviat-red-${rawId}`;
  const labels = [
    tt("evaluation.strength"),
    tt("evaluation.function"),
    tt("evaluation.passiveMobilityShort"),
    tt("evaluation.activeMobilityShort"),
    tt("evaluation.movementQualityShort"),
  ];

  const keys = [
    "forza",
    "funzione",
    "mobilitaPassiva",
    "mobilitaAttiva",
    "qualitaMovimento",
  ];

  /** Canvas e raggio dati più grandi; margini generosi per le etichette. */
  const size = 640;
  const center = size / 2;
  const maxRadius = 164;
  const maxValue = KIVIAT_MAX_SCORE;
  const axisCount = keys.length;
  const stepDeg = 360 / axisCount;

  function axisAngleRad(index) {
    return ((-90 + index * stepDeg) * Math.PI) / 180;
  }

  function scoreToRadius(value) {
    return (Number(value || 0) / maxValue) * maxRadius;
  }

  function point(index, value) {
    const angle = axisAngleRad(index);
    const radius = scoreToRadius(value);

    return {
      x: center + radius * Math.cos(angle),
      y: center + radius * Math.sin(angle),
    };
  }

  function axisPoint(index, radius = maxRadius) {
    const angle = axisAngleRad(index);

    return {
      x: center + radius * Math.cos(angle),
      y: center + radius * Math.sin(angle),
    };
  }

  function polygonPoints(data) {
    return keys
      .map((key, i) => {
        const p = point(i, data?.[key]);
        return `${p.x},${p.y}`;
      })
      .join(" ");
  }

  /** Nome voce lungo il raggio; i % subito oltre il punto dati più esterno. */
  function vertexLabelPositions(i) {
    const angleDeg = -90 + i * stepDeg;
    const angle = (angleDeg * Math.PI) / 180;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const radii = series.map((s) => scoreToRadius(s.data?.[keys[i]]));
    const rOuter = Math.max(0, ...radii);
    const rData = Math.max(rOuter, 10);
    const pctAlong = rData + 16;
    const nameAlong = Math.max(maxRadius + 22, rData + 38);

    const norm = ((angleDeg % 360) + 360) % 360;
    let anchor = "middle";
    if (norm >= 25 && norm <= 155) anchor = "start";
    else if (norm > 155 && norm < 205) anchor = "middle";
    else if (norm >= 205 && norm <= 335) anchor = "end";

    return {
      lx: center + cos * nameAlong,
      ly: center + sin * nameAlong,
      px: center + cos * pctAlong,
      py: center + sin * pctAlong,
      anchor,
    };
  }

  return (
    <div style={kiviatCardStyleMerged} className="pdf-figure kiviat-chart">
      <h4 className="eval-section-heading-chart">{title}</h4>

      <div
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: size,
            aspectRatio: "1 / 1",
            margin: "0 auto",
          }}
        >
          <svg
            viewBox={`0 0 ${size} ${size}`}
            width="100%"
            height="100%"
            preserveAspectRatio="xMidYMid meet"
            style={{ display: "block" }}
            role="img"
            aria-label={title}
          >
        <defs>
          <radialGradient
            id={blueGradId}
            gradientUnits="userSpaceOnUse"
            cx={center}
            cy={center}
            r={maxRadius}
          >
            <stop offset="0%" stopColor="#eff6ff" />
            <stop offset="45%" stopColor="#bfdbfe" />
            <stop offset="100%" stopColor="#1d4ed8" />
          </radialGradient>
          <radialGradient
            id={redGradId}
            gradientUnits="userSpaceOnUse"
            cx={center}
            cy={center}
            r={maxRadius}
          >
            <stop offset="0%" stopColor="#fff1f2" />
            <stop offset="45%" stopColor="#fecdd3" />
            <stop offset="100%" stopColor="#b91c1c" />
          </radialGradient>
        </defs>

        <circle
          cx={center}
          cy={center}
          r={maxRadius}
          fill="#f1f5f9"
          stroke="#e2e8f0"
          strokeWidth={1.5}
        />

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
              stroke="#e2e8f0"
              strokeWidth={level === 5 ? 1.25 : 1}
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
              stroke="#cbd5e1"
              strokeWidth={1}
            />
          );
        })}

        {[...series].reverse().map((s, revIdx) => {
          const index = series.length - 1 - revIdx;
          const pts = polygonPoints(s.data);
          const fillGrad = index === 0 ? blueGradId : redGradId;
          return (
            <polygon
              key={s.name}
              points={pts}
              fill={`url(#${fillGrad})`}
              fillOpacity={index === 0 ? 0.48 : 0.42}
              stroke={kiviatStrokeColors[index % kiviatStrokeColors.length]}
              strokeWidth={2.75}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          );
        })}

        {series.map((s, index) =>
          keys.map((key, i) => {
            const p = point(i, s.data?.[key]);
            return (
              <circle
                key={`${s.name}-${key}`}
                cx={p.x}
                cy={p.y}
                r={6.5}
                fill="#ffffff"
                stroke={kiviatStrokeColors[index % kiviatStrokeColors.length]}
                strokeWidth={2.25}
              />
            );
          })
        )}

        {labels.map((label, i) => {
          const vc = vertexLabelPositions(i);
          const percents = series.map((s) =>
            kiviatScoreToPercent(s.data?.[keys[i]])
          );
          const raw = String(label || "");
          const short =
            raw.length > 24 ? `${raw.slice(0, 22)}…` : label;

          return (
            <g key={keys[i]}>
              <text
                x={vc.lx}
                y={vc.ly}
                textAnchor={vc.anchor}
                dominantBaseline="middle"
                fill="#1e293b"
                fontSize={11}
                fontWeight={700}
                fontFamily='system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
              >
                {short}
              </text>
              <text
                x={vc.px}
                y={vc.py}
                textAnchor={vc.anchor}
                dominantBaseline="middle"
                fontSize={11}
                fontWeight={800}
                fontFamily='system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
              >
                {percents.length > 1
                  ? percents.map((pct, si) => (
                      <tspan
                        key={si}
                        x={vc.px}
                        dy={si === 0 ? 0 : 13}
                        fill={
                          si === 0
                            ? kiviatStrokeColors[0]
                            : kiviatStrokeColors[1 % kiviatStrokeColors.length]
                        }
                      >
                        {pct}%
                      </tspan>
                    ))
                  : percents.map((pct, si) => (
                      <tspan key={si} fill={kiviatPercentColor(pct)}>
                        {pct}%
                      </tspan>
                    ))}
              </text>
            </g>
          );
        })}
          </svg>
        </div>
      </div>

      <p
        style={{
          margin: "10px 0 0",
          fontSize: 12,
          color: "#64748b",
          textAlign: "center",
          fontFamily:
            'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
        }}
      >
        {tt("chart.kiviatScaleNote")}
      </p>

      <div
        style={{
          marginTop: 8,
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: "12px 20px",
          fontFamily:
            'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
          fontSize: 13,
          fontWeight: 600,
          color: "#334155",
        }}
      >
        {series.map((s, index) => (
          <span key={s.name} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span
              style={{
                color: kiviatStrokeColors[index % kiviatStrokeColors.length],
                fontSize: 15,
              }}
            >
              ■
            </span>
            {s.name}
          </span>
        ))}
      </div>
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

  const painScaleMax = 10;
  const painChartHeight = 140;
  const gridLevels = [2, 4, 6, 8];

  function barHeightPx(value) {
    const v = Math.min(painScaleMax, Math.max(0, Number(value) || 0));
    return `${(v / painScaleMax) * painChartHeight}px`;
  }

  return (
    <div style={chartCardStyle} className="pdf-figure">
      <h4 className="eval-section-heading-chart" style={{ marginTop: 0, marginBottom: 8 }}>
        {title || tt("chart.painEvolution")}
      </h4>
      <p
        style={{
          margin: "0 0 12px",
          fontSize: 12,
          color: "#475569",
          fontFamily:
            'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
        }}
      >
        {tt("chart.painScaleHint")}
      </p>

      <div
        style={{
          display: "flex",
          gap: 10,
          alignItems: "stretch",
          fontFamily:
            'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
        }}
      >
        <div
          style={{
            width: 26,
            flexShrink: 0,
            position: "relative",
            height: painChartHeight,
            marginBottom: 34,
          }}
        >
          {[10, 8, 6, 4, 2, 0].map((n) => (
            <span
              key={n}
              style={{
                position: "absolute",
                right: 2,
                bottom: `${(n / painScaleMax) * painChartHeight - 4}px`,
                fontSize: 11,
                fontWeight: 600,
                color: "#64748b",
                lineHeight: 1,
                transform: n === 10 ? "translateY(6px)" : n === 0 ? "translateY(0)" : "translateY(4px)",
              }}
            >
              {n}
            </span>
          ))}
        </div>

        <div
          style={{
            flex: 1,
            display: "grid",
            gridTemplateColumns: "repeat(5, 1fr)",
            gap: 10,
            alignItems: "end",
            minWidth: 0,
          }}
        >
          {painItems.map(({ key, label }) => {
            const valueA = Number(series?.[0]?.data?.[key] || 0);
            const valueB = Number(series?.[1]?.data?.[key] || 0);

            return (
              <div key={key} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                  {valueA} → {valueB}
                </div>

                <div
                  style={{
                    position: "relative",
                    height: painChartHeight,
                    margin: "0 auto",
                    maxWidth: 88,
                  }}
                >
                  {gridLevels.map((lvl) => (
                    <div
                      key={lvl}
                      aria-hidden
                      style={{
                        position: "absolute",
                        left: 0,
                        right: 0,
                        bottom: `${(lvl / painScaleMax) * painChartHeight}px`,
                        height: 1,
                        background: "rgba(148, 163, 184, 0.45)",
                        pointerEvents: "none",
                      }}
                    />
                  ))}

                  <div
                    style={{
                      position: "relative",
                      zIndex: 1,
                      height: "100%",
                      display: "flex",
                      gap: 6,
                      justifyContent: "center",
                      alignItems: "flex-end",
                      borderBottom: "1px solid #cbd5e1",
                    }}
                  >
                    <div
                      style={{
                        width: 14,
                        height: barHeightPx(valueA),
                        background: "#0064ff",
                        borderRadius: "2px 2px 0 0",
                      }}
                    />
                    <div
                      style={{
                        width: 14,
                        height: barHeightPx(valueB),
                        background: "#ff8c00",
                        borderRadius: "2px 2px 0 0",
                      }}
                    />
                  </div>
                </div>

                <div style={{ fontSize: 12, fontWeight: 600, marginTop: 6, minHeight: 30, color: "#334155" }}>
                  {label}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        {series.map((s, index) => (
          <div key={s.name} style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}>
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
  gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))",
  gap: 24,
  marginTop: 20,
};
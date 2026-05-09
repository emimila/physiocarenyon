import { tegnerInfo } from "../data/options";
import { sheetContextFieldDiffers } from "../utils/clinicalHistory";
import {
  calcBMI,
  formatDateDMY,
  manualTextLower,
  patientTrim,
} from "../utils/helpers";

const DIFF_STYLE = { color: "#15803d", fontWeight: 600 };

function Hi({ show, children }) {
  if (!show) return children;
  return <span style={DIFF_STYLE}>{children}</span>;
}

/** Blocco anamnesi / sport come in scheda paziente (stesso layout export PDF). */
export function PatientAnamnesisSheet({ data, tt, diffPrevious = null }) {
  if (!data || typeof data !== "object") return null;
  const selected = data;
  const prev =
    diffPrevious && typeof diffPrevious === "object" ? diffPrevious : null;
  const diff = (key) =>
    Boolean(prev && sheetContextFieldDiffers(key, selected, prev));

  const bmiChanged =
    prev &&
    (diff("peso") ||
      diff("altezza") ||
      String(calcBMI(selected.peso, selected.altezza) || "") !==
        String(calcBMI(prev.peso, prev.altezza) || ""));

  const femaleBlockChanged =
    prev &&
    (diff("figli") ||
      diff("numeroFigli") ||
      diff("tipoParto") ||
      diff("riabilitazionePerineale") ||
      diff("incontinenza"));

  const sportsLineChanged = prev && (diff("sportMultipli") || diff("sportAltro"));

  const runningFieldsChanged =
    prev &&
    (diff("running10km") ||
      diff("runningMezza") ||
      diff("runningMaratona"));

  return (
    <>
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
              <strong>{tt("patient.weight")}:</strong>{" "}
              <Hi show={diff("peso")}>
                {selected.peso} kg
              </Hi>
            </span>
          ) : null}
          {patientTrim(selected.altezza) ? (
            <span>
              <strong>{tt("patient.height")}:</strong>{" "}
              <Hi show={diff("altezza")}>
                {selected.altezza} cm
              </Hi>
            </span>
          ) : null}
          {patientTrim(calcBMI(selected.peso, selected.altezza)) ? (
            <span>
              <strong>{tt("patient.bmi")}:</strong>{" "}
              <Hi show={bmiChanged}>
                {calcBMI(selected.peso, selected.altezza)}
              </Hi>
            </span>
          ) : null}
          {patientTrim(selected.sesso) ? (
            <span>
              <strong>{tt("patient.sex")}:</strong>{" "}
              <Hi show={diff("sesso")}>
                {tt(`options.sex.${selected.sesso}`) || selected.sesso}
              </Hi>
            </span>
          ) : null}
          {patientTrim(selected.manoDominante) ? (
            <span>
              <strong>{tt("patient.dominantHand")}:</strong>{" "}
              <Hi show={diff("manoDominante")}>
                {tt(`dominantHand.${selected.manoDominante}`) ||
                  selected.manoDominante}
              </Hi>
            </span>
          ) : null}
        </p>
      )}

      {patientTrim(selected.variazionePeso) && (
        <p>
          <strong>{tt("patient.weightChange")}:</strong>{" "}
          <Hi show={diff("variazionePeso")}>
            {tt(`options.yesNo.${selected.variazionePeso}`) ||
              selected.variazionePeso}
          </Hi>
        </p>
      )}

      {selected.variazionePeso === "Sì" &&
        patientTrim(manualTextLower(selected.motivoVariazionePeso)) && (
          <p>
            <strong>{tt("patient.weightChangeReason")}:</strong>{" "}
            <Hi show={diff("motivoVariazionePeso")}>
              {manualTextLower(selected.motivoVariazionePeso)}
            </Hi>
          </p>
        )}

      {(() => {
        const farm = patientTrim(manualTextLower(selected.farmaci));
        const pat = patientTrim(manualTextLower(selected.patologie));
        const bpDate = patientTrim(selected.dataUltimoTestPressioneArteriosa);
        const bpStr = bpDate ? formatDateDMY(bpDate) || bpDate : "";
        const smoke =
          selected.fumatore &&
          (tt(`options.yesNo.${selected.fumatore}`) || selected.fumatore);
        const smokeStr = patientTrim(smoke);
        const ep =
          selected.epilessia &&
          (tt(`options.yesNo.${selected.epilessia}`) || selected.epilessia);
        const epStr = patientTrim(ep);
        if (!farm && !pat && !bpStr && !smokeStr && !epStr) return null;
        const chunks = [];
        if (farm) {
          chunks.push(
            <span key="farm">
              <strong>{tt("patient.medications")}:</strong>{" "}
              <Hi show={diff("farmaci")}>{farm}</Hi>
            </span>
          );
        }
        if (pat) {
          chunks.push(
            <span key="pat">
              <strong>{tt("patient.pathologies")}:</strong>{" "}
              <Hi show={diff("patologie")}>{pat}</Hi>
            </span>
          );
        }
        if (bpStr) {
          chunks.push(
            <span key="bp">
              <strong>{tt("patient.lastBloodPressureTestDate")}:</strong>{" "}
              <Hi show={diff("dataUltimoTestPressioneArteriosa")}>{bpStr}</Hi>
            </span>
          );
        }
        if (smokeStr) {
          chunks.push(
            <span key="smoke">
              <strong>{tt("patient.smoker")}:</strong>{" "}
              <Hi show={diff("fumatore")}>{smokeStr}</Hi>
            </span>
          );
        }
        if (epStr) {
          chunks.push(
            <span key="ep">
              <strong>{tt("patient.epilepsy")}:</strong>{" "}
              <Hi show={diff("epilessia")}>{epStr}</Hi>
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
          <Hi show={diff("antecedentiChirurgici")}>
            {manualTextLower(selected.antecedentiChirurgici)}
          </Hi>
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
            <p style={{ lineHeight: 1.45 }}>
              <Hi show={femaleBlockChanged}>{parts.join(" | ")}</Hi>
            </p>
          );
        })()}

      {patientTrim(manualTextLower(selected.dominioLavoro)) && (
        <p>
          <strong>{tt("patient.workEducation")}:</strong>{" "}
          <Hi show={diff("dominioLavoro")}>
            {manualTextLower(selected.dominioLavoro)}
          </Hi>
        </p>
      )}

      {patientTrim(manualTextLower(selected.rischiProfessionali)) && (
        <p>
          <strong>{tt("patient.professionalRiskNotes")}:</strong>{" "}
          <Hi show={diff("rischiProfessionali")}>
            {manualTextLower(selected.rischiProfessionali)}
          </Hi>
        </p>
      )}

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
            <strong>{tt("patient.sports")}:</strong>{" "}
            <Hi show={sportsLineChanged}>{body}</Hi>
          </p>
        );
      })()}

      {patientTrim(selected.sportLivello) && (
        <p>
          <strong>{tt("patient.sportPracticeLevel")}:</strong>{" "}
          <Hi show={diff("sportLivello")}>
            {tt(`options.sportLevel.${selected.sportLivello}`) ||
              selected.sportLivello}
          </Hi>
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
              <strong>{tt("patient.running")}:</strong>{" "}
              <Hi show={runningFieldsChanged}>{parts.join(" | ")}</Hi>
            </p>
          );
        })()}

      {(selected.sportMultipli || []).some(
        (s) => String(s).toLowerCase() === "fitness"
      ) &&
        selected.fitnessTipo && (
          <p>
            <strong>{tt("patient.fitness")}:</strong>{" "}
            <Hi show={diff("fitnessTipo")}>
              {tt(`options.fitnessType.${selected.fitnessTipo}`) ||
                selected.fitnessTipo}
            </Hi>
          </p>
        )}

      {(selected.sportMultipli || []).some(
        (s) => String(s).toLowerCase() === "surf"
      ) &&
        patientTrim(selected.surfStance) && (
          <p>
            <strong>{tt("options.sport.surf") ?? "Surf"}:</strong>{" "}
            <Hi show={diff("surfStance")}>
              {tt(`options.boardStance.${selected.surfStance}`) ||
                selected.surfStance}
            </Hi>
          </p>
        )}

      {(selected.sportMultipli || []).some(
        (s) => String(s).toLowerCase() === "snowboard"
      ) &&
        patientTrim(selected.snowboardStance) && (
          <p>
            <strong>{tt("options.sport.snowboard") ?? "Snowboard"}:</strong>{" "}
            <Hi show={diff("snowboardStance")}>
              {tt(`options.boardStance.${selected.snowboardStance}`) ||
                selected.snowboardStance}
            </Hi>
          </p>
        )}

      {(selected.sportMultipli || []).some(
        (s) => String(s).toLowerCase() === "skateboard"
      ) &&
        patientTrim(selected.skateboardStance) && (
          <p>
            <strong>{tt("options.sport.skateboard") ?? "Skateboard"}:</strong>{" "}
            <Hi show={diff("skateboardStance")}>
              {tt(`options.boardStance.${selected.skateboardStance}`) ||
                selected.skateboardStance}
            </Hi>
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
          const tennisChanged =
            prev &&
            (diff("tennisBackhand") ||
              diff("tennisStringTension") ||
              diff("tennisRacketChangedRecently"));
          return (
            <p>
              <strong>{tt("options.sport.tennis") ?? "Tennis"}:</strong>{" "}
              <Hi show={tennisChanged}>{segs.join(" | ")}</Hi>
            </p>
          );
        })()}

      {(selected.sportMultipli || []).some(
        (s) => String(s).toLowerCase() === "padel"
      ) &&
        patientTrim(selected.padelRacketChangedRecently) && (
          <p>
            <strong>{tt("options.sport.padel") ?? "Padel"}:</strong>{" "}
            <Hi show={diff("padelRacketChangedRecently")}>
              {tt("patient.padelRacketChangedRecently") ??
                "Racchetta cambiata di recente"}
              :{" "}
              {tt(`options.yesNo.${selected.padelRacketChangedRecently}`) ||
                selected.padelRacketChangedRecently}
            </Hi>
          </p>
        )}

      {(selected.sportMultipli || []).some(
        (s) => String(s).toLowerCase() === "calcio"
      ) &&
        patientTrim(selected.calcioRuolo) && (
          <p>
            <strong>{tt("options.sport.calcio") ?? "Calcio"}:</strong>{" "}
            {tt("patient.calcioFieldRole") ?? "Ruolo"}:{" "}
            <Hi show={diff("calcioRuolo")}>
              {tt(`options.calcioRuolo.${selected.calcioRuolo}`) ||
                selected.calcioRuolo}
            </Hi>
          </p>
        )}

      {(selected.sportMultipli || []).some(
        (s) => String(s).toLowerCase() === "sci"
      ) &&
        patientTrim(selected.sciTipo) && (
          <p>
            <strong>{tt("options.sport.sci") ?? "Sci"}:</strong>{" "}
            {tt("patient.sciType") ?? "Tipo"}:{" "}
            <Hi show={diff("sciTipo")}>
              {tt(`options.sciTipo.${selected.sciTipo}`) || selected.sciTipo}
            </Hi>
          </p>
        )}

      {selected.tegner !== "" &&
        selected.tegner != null &&
        patientTrim(String(selected.tegner)) && (
          <p>
            <strong>{tt("patient.tegner")}:</strong>{" "}
            <Hi show={diff("tegner")}>
              {selected.tegner}{" "}
              {`- ${tt(`options.tegner.${selected.tegner}`) || tegnerInfo[selected.tegner]}`}
            </Hi>
          </p>
        )}

      {patientTrim(selected.oreSport) && (
        <p>
          <strong>{tt("patient.weeklySportHours")}:</strong>{" "}
          <Hi show={diff("oreSport")}>
            {tt(`options.weeklySportHours.${selected.oreSport}`) ||
              selected.oreSport}
          </Hi>
        </p>
      )}
    </>
  );
}

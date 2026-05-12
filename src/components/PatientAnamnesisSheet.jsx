import { tegnerInfo } from "../data/options";
import {
  normalizeAntecedentiList,
  sheetContextFieldDiffers,
} from "../utils/clinicalHistory";
import { bonDiffSummaryStyle } from "../utils/bonDiffSummaryStyle";
import { getMonthShort } from "../utils/monthNames";
import {
  calcBMI,
  formatDateDMY,
  manualTextLower,
  patientTrim,
} from "../utils/helpers";

/** Voci anamnesi modificate rispetto al bon precedente: riepilogo / stampa. */
const DIFF_STYLE = bonDiffSummaryStyle;

function Hi({ show, children }) {
  if (!show) return children;
  return <span style={DIFF_STYLE}>{children}</span>;
}

/** Blocco anamnesi / sport come in scheda paziente (stesso layout export PDF). */
export function PatientAnamnesisSheet({
  data,
  tt,
  lang = "it",
  diffPrevious = null,
}) {
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
      diff("runningMaratona") ||
      diff("runningDisciplina") ||
      diff("runningDisciplinaAltro"));

  const smList = selected.sportMultipli || [];
  const hasBoardSport = smList.some((s) =>
    ["surf", "snowboard", "skateboard"].includes(String(s).toLowerCase())
  );
  const boardStanceVal =
    patientTrim(selected.boardStanceUnified) ||
    patientTrim(selected.surfStance) ||
    patientTrim(selected.snowboardStance) ||
    patientTrim(selected.skateboardStance) ||
    "";
  const boardStanceChanged =
    prev &&
    (diff("boardStanceUnified") ||
      diff("surfStance") ||
      diff("snowboardStance") ||
      diff("skateboardStance"));

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
        const lifesaving =
          selected.farmacoSalvavita &&
          (tt(`options.yesNo.${selected.farmacoSalvavita}`) ||
            selected.farmacoSalvavita);
        const lifesavingStr = patientTrim(lifesaving);
        const smoke =
          selected.fumatore &&
          (tt(`options.yesNo.${selected.fumatore}`) || selected.fumatore);
        const smokeStr = patientTrim(smoke);
        const ep =
          selected.epilessia &&
          (tt(`options.yesNo.${selected.epilessia}`) || selected.epilessia);
        const epStr = patientTrim(ep);
        if (
          !farm &&
          !pat &&
          !bpStr &&
          !lifesavingStr &&
          !smokeStr &&
          !epStr
        ) {
          return null;
        }
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
        if (lifesavingStr) {
          chunks.push(
            <span key="ls">
              <strong>
                {tt("patient.lifesavingMed", "Farmaco salvavita")}:
              </strong>{" "}
              <Hi show={diff("farmacoSalvavita")}>{lifesavingStr}</Hi>
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

      {(() => {
        const surgicalRows = normalizeAntecedentiList(
          selected.antecedentiChirurgici
        );
        if (surgicalRows.length === 0) return null;
        const showHi = diff("antecedentiChirurgici");
        return (
          <div style={{ margin: "0 0 10px" }}>
            <p style={{ margin: "0 0 4px" }}>
              <strong>{tt("patient.relevantSurgeryHistory")}:</strong>
            </p>
            <ul
              style={{
                margin: "0 0 0 18px",
                padding: 0,
                lineHeight: 1.45,
              }}
            >
              {surgicalRows.map((row, i) => {
                const yearStr = row.year || "—";
                const monthStr = row.month
                  ? getMonthShort(lang, row.month) || row.month
                  : "—";
                const textStr = manualTextLower(row.text);
                const kindStr = row.kind
                  ? tt(
                      `patient.surgeryKind${row.kind.charAt(0).toUpperCase() + row.kind.slice(1)}`
                    ) || row.kind
                  : "";
                const kindDetailStr = manualTextLower(row.kindDetail);
                const prefixParts = [];
                if (kindStr) prefixParts.push(kindStr);
                if (kindDetailStr) prefixParts.push(kindDetailStr);
                const prefix = prefixParts.length
                  ? `${prefixParts.join(" — ")} · `
                  : "";
                return (
                  <li key={`surg-li-${i}`}>
                    <Hi show={showHi}>
                      {prefix}
                      {yearStr} – {monthStr}
                      {textStr ? `: ${textStr}` : ""}
                    </Hi>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })()}

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

      {(patientTrim(manualTextLower(selected.dominioLavoro)) ||
        patientTrim(manualTextLower(selected.rischiProfessionali))) && (
        <p
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "0 12px",
            alignItems: "baseline",
          }}
        >
          {patientTrim(manualTextLower(selected.dominioLavoro)) ? (
            <span>
              <strong>{tt("patient.professionOrFormation")}:</strong>{" "}
              <Hi show={diff("dominioLavoro")}>
                {manualTextLower(selected.dominioLavoro)}
              </Hi>
            </span>
          ) : null}
          {patientTrim(manualTextLower(selected.dominioLavoro)) &&
          patientTrim(manualTextLower(selected.rischiProfessionali))
            ? "|"
            : null}
          {patientTrim(manualTextLower(selected.rischiProfessionali)) ? (
            <span>
              <strong>{tt("patient.professionalRiskNotes")}:</strong>{" "}
              <Hi show={diff("rischiProfessionali")}>
                {manualTextLower(selected.rischiProfessionali)}
              </Hi>
            </span>
          ) : null}
        </p>
      )}

      {(patientTrim(selected.motivoAccesso) ||
        patientTrim(manualTextLower(selected.referralDaChi))) && (
        <p
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "0 12px",
            alignItems: "baseline",
          }}
        >
          {patientTrim(manualTextLower(selected.referralDaChi)) ? (
            <span>
              <strong>{tt("patient.referralFrom", "Referral da")}:</strong>{" "}
              <Hi show={diff("referralDaChi")}>
                {manualTextLower(selected.referralDaChi)}
              </Hi>
            </span>
          ) : null}
          {patientTrim(manualTextLower(selected.referralDaChi)) &&
          patientTrim(selected.motivoAccesso)
            ? "|"
            : null}
          {patientTrim(selected.motivoAccesso) ? (
            <span>
              <strong>{tt("patient.accessReason", "Perché sei da noi?")}:</strong>{" "}
              <Hi show={diff("motivoAccesso")}>
                {tt(`options.accessReason.${selected.motivoAccesso}`) ||
                  selected.motivoAccesso}
              </Hi>
            </span>
          ) : null}
        </p>
      )}

      {(() => {
        const sm = selected.sportMultipli || [];
        const list = sm
          .filter(Boolean)
          .filter((s) => String(s).toLowerCase() !== "altri_sport")
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
        const showAltri =
          sm.some((s) => String(s).toLowerCase() === "altri_sport") &&
          patientTrim(manualTextLower(selected.sportAltro));
        if (!list && !showAltri) return null;
        return (
          <>
            {list ? (
              <p>
                <strong>{tt("patient.sports")}:</strong>{" "}
                <Hi show={sportsLineChanged}>{list}</Hi>
              </p>
            ) : null}
            {showAltri ? (
              <p>
                <strong>
                  {tt("patient.sportOtherNotes", "Altri sport — note")}:
                </strong>{" "}
                <Hi show={diff("sportAltro")}>
                  {manualTextLower(selected.sportAltro)}
                </Hi>
              </p>
            ) : null}
          </>
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
          const dKey = String(selected.runningDisciplina || "").trim();
          const dAlt = trim(selected.runningDisciplinaAltro);
          let discStr = "";
          if (dKey === "altro") {
            discStr = dAlt || tt("options.runningDisciplina.altro", "Altro");
          } else if (dKey) {
            discStr =
              tt(`options.runningDisciplina.${dKey}`, dKey) || dKey;
            if (dAlt) discStr = `${discStr} (${dAlt})`;
          } else if (dAlt) {
            discStr = dAlt;
          }
          if (discStr) {
            parts.push(
              `${tt("patient.runningDiscipline", "Tipo corsa")}: ${discStr}`
            );
          }
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
        (s) => String(s).toLowerCase() === "ciclismo"
      ) &&
        patientTrim(selected.ciclismoDisciplina) && (
          <p>
            <strong>{tt("options.sport.ciclismo", "Ciclismo")}:</strong>{" "}
            <Hi show={diff("ciclismoDisciplina")}>
              {tt(
                `options.ciclismoTipo.${selected.ciclismoDisciplina}`,
                selected.ciclismoDisciplina
              )}
            </Hi>
          </p>
        )}

      {smList.some((s) =>
        ["escalade", "arrampicata"].includes(String(s).toLowerCase())
      ) &&
        patientTrim(manualTextLower(selected.arrampicataLivello)) && (
          <p>
            <strong>{tt("patient.climbingLevel", "Livello di arrampicata")}:</strong>{" "}
            <Hi show={diff("arrampicataLivello")}>
              {manualTextLower(selected.arrampicataLivello)}
            </Hi>
          </p>
        )}

      {(selected.sportMultipli || []).some(
        (s) => String(s).toLowerCase() === "pilates"
      ) &&
        patientTrim(selected.pilatesTipo) && (
          <p>
            <strong>{tt("options.sport.pilates", "Pilates")}:</strong>{" "}
            <Hi show={diff("pilatesTipo")}>
              {tt(`options.pilatesTipo.${selected.pilatesTipo}`, selected.pilatesTipo)}
            </Hi>
          </p>
        )}

      {hasBoardSport && patientTrim(boardStanceVal) ? (
        <p>
          <strong>
            {tt("patient.boardStance", "Goofy o regular?")} (
            {tt("patient.boardSportsStance", "surf / snowboard / skateboard")}):
          </strong>{" "}
          <Hi show={boardStanceChanged}>
            {tt(`options.boardStance.${boardStanceVal}`) || boardStanceVal}
          </Hi>
        </p>
      ) : null}

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

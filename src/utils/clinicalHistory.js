import {
  migrateDiagnosiRighe,
  patientTrim,
  uid,
} from "./helpers";

/** Campi anamnesi / sport salvati con ogni voce di storico (stampa come valutazione completa). */
const SNAPSHOT_SHEET_CONTEXT_KEYS = [
  "peso",
  "altezza",
  "sesso",
  "manoDominante",
  "variazionePeso",
  "motivoVariazionePeso",
  "farmaci",
  "patologie",
  "farmacoSalvavita",
  "dataUltimoTestPressioneArteriosa",
  "fumatore",
  "epilessia",
  "antecedentiChirurgici",
  "figli",
  "numeroFigli",
  "tipoParto",
  "riabilitazionePerineale",
  "incontinenza",
  "dominioLavoro",
  "rischiProfessionali",
  "motivoAccesso",
  "referralDaChi",
  "sportMultipli",
  "sportAltro",
  "sportLivello",
  "running10km",
  "runningMezza",
  "runningMaratona",
  "runningDisciplina",
  "runningDisciplinaAltro",
  "fitnessTipo",
  "surfStance",
  "snowboardStance",
  "skateboardStance",
  "boardStanceUnified",
  "pilatesTipo",
  "arrampicataLivello",
  "ciclismoDisciplina",
  "tennisBackhand",
  "tennisStringTension",
  "tennisRacketChangedRecently",
  "padelRacketChangedRecently",
  "calcioRuolo",
  "sciTipo",
  "tegner",
  "oreSport",
];

/**
 * Antecedenti chirurgici in snapshot: lista di righe `{ line: "kind"|"date", ... }`.
 * `normalizeAntecedentiList` mantiene solo righe con almeno un campo non vuoto.
 */
/** Tipi accettati per il selettore "Tipo" della voce. Vuoto = nessuna scelta. */
const ANTECEDENTI_KINDS = new Set(["generico", "ricorrente", "altro"]);

/**
 * Converte la lista salvata in righe indipendenti per l'editor.
 * - Formato attuale: `{ line: "kind" | "date", ... }`.
 * - Legacy: un solo oggetto con tipo+specifica e anno+mese+testo → fino a due righe in sequenza.
 */
export function migrateAntecedentiToLineRows(value) {
  if (!Array.isArray(value)) return [];
  const out = [];
  for (const r of value) {
    if (!r || typeof r !== "object") continue;
    if (r.line === "kind") {
      const kindRaw = String(r.kind ?? "").trim().toLowerCase();
      const kind = ANTECEDENTI_KINDS.has(kindRaw) ? kindRaw : "";
      /* kindDetail: senza trim — spazi e digitazione restano fedeli in editor */
      const kindDetail = String(r.kindDetail ?? "");
      out.push({ line: "kind", kind, kindDetail });
      continue;
    }
    if (r.line === "date") {
      const year = String(r.year ?? "").replace(/\D/g, "").slice(0, 4);
      const month = String(r.month ?? "").trim();
      const text = String(r.text ?? "");
      const monthOk = /^([1-9]|1[0-2])$/.test(month) ? month : "";
      out.push({ line: "date", year, month: monthOk, text });
      continue;
    }
    const year = String(r.year ?? "").replace(/\D/g, "").slice(0, 4);
    const month = String(r.month ?? "").trim();
    const text = String(r.text ?? "");
    const kindRaw = String(r.kind ?? "").trim().toLowerCase();
    const kind = ANTECEDENTI_KINDS.has(kindRaw) ? kindRaw : "";
    const kindDetail = String(r.kindDetail ?? "");
    const monthOk = /^([1-9]|1[0-2])$/.test(month) ? month : "";
    if (kind || kindDetail) {
      out.push({ line: "kind", kind, kindDetail });
    }
    if (year || monthOk || text) {
      out.push({ line: "date", year, month: monthOk, text });
    }
  }
  return out;
}

/** Mantiene solo righe con almeno un campo non vuoto (dopo migrazione forma righe). */
export function normalizeAntecedentiList(value) {
  const migrated = migrateAntecedentiToLineRows(value);
  return migrated.filter((row) => {
    if (row.line === "kind") {
      return Boolean(row.kind || String(row.kindDetail ?? "").trim());
    }
    if (row.line === "date") {
      return Boolean(
        row.year || row.month || String(row.text ?? "").trim()
      );
    }
    return false;
  });
}

export function buildSnapshotSheetContextFromPatientLike(form) {
  const f = form && typeof form === "object" ? form : {};
  const out = {};
  for (const k of SNAPSHOT_SHEET_CONTEXT_KEYS) {
    if (k === "sportMultipli") {
      out[k] = Array.isArray(f.sportMultipli) ? [...f.sportMultipli] : [];
    } else if (k === "antecedentiChirurgici") {
      // Nuovo formato lista. Stringa legacy o valore mancante → array vuoto
      // (il testo libero pre-migrazione viene scartato silenziosamente).
      out[k] = normalizeAntecedentiList(f.antecedentiChirurgici);
    } else {
      out[k] = f[k] ?? "";
    }
  }
  return out;
}

/** Valore normalizzato per confronto diff tra due `sheetContext`. */
export function normalizedSheetFieldValue(key, obj) {
  if (!obj || typeof obj !== "object") return "";
  if (key === "sportMultipli") {
    return JSON.stringify([...(obj.sportMultipli || [])].map(String).sort());
  }
  if (key === "antecedentiChirurgici") {
    return JSON.stringify(normalizeAntecedentiList(obj.antecedentiChirurgici));
  }
  return String(obj[key] ?? "").trim();
}

export function sheetContextFieldDiffers(key, cur, prev) {
  if (!prev || typeof prev !== "object" || !cur || typeof cur !== "object")
    return false;
  return (
    normalizedSheetFieldValue(key, cur) !== normalizedSheetFieldValue(key, prev)
  );
}

/** Campi clinici salvati per ogni «fotografia» nel tempo. */
export function buildSnapshotBodyFromPatientLike(form) {
  return {
    diagnosiRighe: migrateDiagnosiRighe(form).map((r) => ({
      ...r,
      id: r.id || uid(),
    })),
    diagnostica: form.diagnostica ?? "",
    diagnostica2: form.diagnostica2 ?? "",
    diagnosticaDettagli: form.diagnosticaDettagli ?? "",
    dataInfortunio: form.dataInfortunio ?? "",
    dataOperazione: form.dataOperazione ?? "",
    artoOperato: form.artoOperato ?? "",
    tipoOperazione: form.tipoOperazione ?? "",
    distrettoOperato: form.distrettoOperato ?? "",
    latoOperato: form.latoOperato ?? "",
    interventoChirurgico: form.interventoChirurgico ?? "",
    protocolloRiabilitazione: form.protocolloRiabilitazione ?? "",
    protocolloRiabilitazionePdf: form.protocolloRiabilitazionePdf ?? "",
    protocolloRiabilitazionePdfName:
      form.protocolloRiabilitazionePdfName ?? "",
    quadroClinicoTipo: form.quadroClinicoTipo ?? "",
    infortunioChirurgicoPrevisto: form.infortunioChirurgicoPrevisto ?? "",
    medicoPrescrittore: form.medicoPrescrittore ?? "",
  };
}

export function spreadSnapshotToPatientTop(snap) {
  if (!snap) return {};
  const righe = migrateDiagnosiRighe({
    diagnosiRighe: snap.diagnosiRighe,
    diagnosi: snap.diagnosi,
    distrettoDiagnosi: snap.distrettoDiagnosi,
    diagnosiDettagli: snap.diagnosiDettagli,
  }).map((r) => ({ ...r, id: r.id || uid() }));
  const first = righe[0] || {};
  return {
    diagnosiRighe: righe,
    diagnosi: first.diagnosi || "",
    distrettoDiagnosi: first.distrettoDiagnosi || "",
    diagnosiDettagli: first.dettagli || "",
    diagnostica: snap.diagnostica ?? "",
    diagnostica2: snap.diagnostica2 ?? "",
    diagnosticaDettagli: snap.diagnosticaDettagli ?? "",
    dataInfortunio: snap.dataInfortunio ?? "",
    dataOperazione: snap.dataOperazione ?? "",
    artoOperato: snap.artoOperato ?? "",
    tipoOperazione: snap.tipoOperazione ?? "",
    distrettoOperato: snap.distrettoOperato ?? "",
    latoOperato: snap.latoOperato ?? "",
    interventoChirurgico: snap.interventoChirurgico ?? "",
    protocolloRiabilitazione: snap.protocolloRiabilitazione ?? "",
    protocolloRiabilitazionePdf: snap.protocolloRiabilitazionePdf ?? "",
    protocolloRiabilitazionePdfName:
      snap.protocolloRiabilitazionePdfName ?? "",
    quadroClinicoTipo: snap.quadroClinicoTipo ?? "",
    infortunioChirurgicoPrevisto: snap.infortunioChirurgicoPrevisto ?? "",
    medicoPrescrittore: snap.medicoPrescrittore ?? "",
  };
}

function diagnosiRowHasData(row) {
  return Boolean(
    patientTrim(row?.diagnosi) ||
      patientTrim(row?.distrettoDiagnosi) ||
      patientTrim(row?.dettagli)
  );
}

/** True se la scheda ha dati clinici «piatti» (pre-storico o ultimo stato). */
export function legacyPatientClinicalHasVisibleData(p) {
  if (!p) return false;
  const rows = migrateDiagnosiRighe(p);
  if (rows.some(diagnosiRowHasData)) return true;
  const dx = patientTrim(p.diagnostica);
  if (dx && dx !== "Nessuna") return true;
  const d2 = patientTrim(p.diagnostica2);
  if (d2 && d2 !== "Nessuna") return true;
  if (patientTrim(p.diagnosticaDettagli)) return true;
  if (patientTrim(p.dataInfortunio) || patientTrim(p.dataOperazione))
    return true;
  const arto = patientTrim(p.artoOperato);
  if (arto && arto !== "Non operato") return true;
  const tipo = patientTrim(p.tipoOperazione);
  if (tipo && tipo !== "Nessuna") return true;
  if (patientTrim(p.distrettoOperato)) return true;
  if (patientTrim(p.latoOperato)) return true;
  if (patientTrim(p.interventoChirurgico)) return true;
  if (patientTrim(p.protocolloRiabilitazione)) return true;
  if (patientTrim(p.protocolloRiabilitazionePdf)) return true;
  if (patientTrim(p.quadroClinicoTipo)) return true;
  if (patientTrim(p.infortunioChirurgicoPrevisto)) return true;
  if (patientTrim(p.medicoPrescrittore)) return true;
  if (patientTrim(p.pilatesTipo)) return true;
  if (patientTrim(p.ciclismoDisciplina)) return true;
  if (patientTrim(p.arrampicataLivello)) return true;
  if (patientTrim(p.boardStanceUnified)) return true;
  if (patientTrim(p.referralDaChi)) return true;
  if (patientTrim(p.farmacoSalvavita)) return true;
  return false;
}

export function normalizeStoricoSnapshotEntry(snap) {
  if (!snap || typeof snap !== "object") return null;
  const body = buildSnapshotBodyFromPatientLike({
    ...snap,
    diagnosiRighe: snap.diagnosiRighe,
  });
  const bonRaw = snap.bonNumero;
  const bon =
    bonRaw != null && bonRaw !== ""
      ? Number(bonRaw)
      : undefined;
  const scRaw = snap.sheetContext;
  const sheetContext =
    scRaw && typeof scRaw === "object"
      ? buildSnapshotSheetContextFromPatientLike(scRaw)
      : undefined;
  return {
    id: snap.id || uid(),
    dataValutazione: snap.dataValutazione != null ? String(snap.dataValutazione) : "",
    ...body,
    ...(bon !== undefined && Number.isFinite(bon) ? { bonNumero: bon } : {}),
    ...(sheetContext ? { sheetContext } : {}),
  };
}

/**
 * Garantisce `storicoQuadroClinico` e migra le righe.
 * Se manca lo storico ma ci sono dati clinici legacy, crea una voce iniziale.
 */
/**
 * Aggiorna peso sul paziente e nel `sheetContext` dell’ultimo bon,
 * impostando la data valutazione all’esecuzione del test (sessione).
 */
export function patchPatientPesoFromTestSession(patient, newPesoStr, testDateIso) {
  const p = { ...patient };
  const pesoStr =
    newPesoStr != null ? String(newPesoStr).trim().replace(",", ".") : "";
  if (!pesoStr) return normalizePatientClinicalHistory(p);

  let storico = Array.isArray(p.storicoQuadroClinico)
    ? p.storicoQuadroClinico.map(normalizeStoricoSnapshotEntry).filter(Boolean)
    : [];

  if (storico.length === 0) {
    const next = { ...p, peso: pesoStr };
    return normalizePatientClinicalHistory(next);
  }

  const lastIdx = storico.length - 1;
  const last = { ...storico[lastIdx] };
  const prevCtx = buildSnapshotSheetContextFromPatientLike(last.sheetContext || {});
  last.sheetContext = buildSnapshotSheetContextFromPatientLike({
    ...prevCtx,
    peso: pesoStr,
  });
  const dateStr =
    testDateIso != null && String(testDateIso).trim() !== ""
      ? String(testDateIso).trim()
      : last.dataValutazione;
  last.dataValutazione = dateStr;
  storico[lastIdx] = normalizeStoricoSnapshotEntry(last);

  const next = {
    ...p,
    storicoQuadroClinico: storico,
    peso: pesoStr,
  };
  return normalizePatientClinicalHistory(next);
}

export function normalizePatientClinicalHistory(patient) {
  const p = { ...patient };

  // Antecedenti chirurgici: `Array<{ line: "kind"|"date", ... }>` (righe indipendenti).
  // Stringa legacy o valore mancante → array vuoto (vecchio dato scartato).
  p.antecedentiChirurgici = normalizeAntecedentiList(p.antecedentiChirurgici);

  let storico = Array.isArray(p.storicoQuadroClinico)
    ? p.storicoQuadroClinico.map(normalizeStoricoSnapshotEntry).filter(Boolean)
    : [];

  if (storico.length === 0 && legacyPatientClinicalHasVisibleData(p)) {
    storico = [
      {
        id: uid(),
        dataValutazione: patientTrim(p.dataCreazionePaziente)
          ? String(p.dataCreazionePaziente).trim()
          : "",
        sheetContext: buildSnapshotSheetContextFromPatientLike(p),
        ...buildSnapshotBodyFromPatientLike(p),
      },
    ];
  }

  if (storico.length > 0) {
    const [first, ...rest] = storico;
    if (!first.sheetContext || typeof first.sheetContext !== "object") {
      storico = [
        {
          ...first,
          sheetContext: buildSnapshotSheetContextFromPatientLike(p),
        },
        ...rest,
      ];
    }
    let prevCtx = storico[0].sheetContext;
    if (prevCtx && typeof prevCtx === "object") {
      storico = storico.map((entry, i) => {
        if (i === 0) return entry;
        const has =
          entry.sheetContext && typeof entry.sheetContext === "object";
        if (has) {
          prevCtx = entry.sheetContext;
          return entry;
        }
        return {
          ...entry,
          sheetContext: buildSnapshotSheetContextFromPatientLike(prevCtx),
        };
      });
    }
  }

  p.storicoQuadroClinico = storico;

  if (storico.length > 0) {
    const last = storico[storico.length - 1];
    Object.assign(p, spreadSnapshotToPatientTop(last));
  }

  return p;
}

const SNAPSHOT_BODY_KEYS = [
  "diagnostica",
  "diagnostica2",
  "diagnosticaDettagli",
  "dataInfortunio",
  "dataOperazione",
  "artoOperato",
  "tipoOperazione",
  "distrettoOperato",
  "latoOperato",
  "interventoChirurgico",
  "protocolloRiabilitazione",
  "protocolloRiabilitazionePdf",
  "protocolloRiabilitazionePdfName",
  "quadroClinicoTipo",
  "infortunioChirurgicoPrevisto",
  "medicoPrescrittore",
];

/** Stato piatto confrontabile (sheetContext + campi clinici dallo snapshot). */
export function patientFlatStateFromSnapshotEntry(snap) {
  if (!snap || typeof snap !== "object") return null;
  const ctx =
    snap.sheetContext && typeof snap.sheetContext === "object"
      ? buildSnapshotSheetContextFromPatientLike(snap.sheetContext)
      : buildSnapshotSheetContextFromPatientLike({});
  const top = spreadSnapshotToPatientTop(snap);
  return { ...ctx, ...top };
}

/**
 * Baseline del bon precedente per evidenziare le modifiche in compilazione.
 * - Aggiornamento ultimo bon: confronta con il penultimo snapshot.
 * - Nuovo bon (append): confronta con l’ultimo snapshot salvato.
 */
export function previousBonBaselineForForm(form, isAppendingNewBon) {
  const storico = Array.isArray(form?.storicoQuadroClinico)
    ? form.storicoQuadroClinico.map(normalizeStoricoSnapshotEntry).filter(Boolean)
    : [];
  if (storico.length === 0) return null;
  const idx = isAppendingNewBon
    ? storico.length - 1
    : storico.length >= 2
      ? storico.length - 2
      : -1;
  if (idx < 0) return null;
  return patientFlatStateFromSnapshotEntry(storico[idx]);
}

function normalizeRigheForDiff(formLike) {
  return migrateDiagnosiRighe(formLike || {}).map((r) => ({
    diagnosi: String(r.diagnosi ?? "").trim(),
    distrettoDiagnosi: String(r.distrettoDiagnosi ?? "").trim(),
    latoDiagnosi: String(r.latoDiagnosi ?? "").trim(),
    dettagli: String(r.dettagli ?? "").trim(),
  }));
}

export function formDiffersFromBaseline(form, baseline, fieldKey) {
  if (!baseline || !form || fieldKey == null) return false;
  if (fieldKey === "diagnosiRighe") {
    return (
      JSON.stringify(normalizeRigheForDiff(form)) !==
      JSON.stringify(normalizeRigheForDiff(baseline))
    );
  }
  if (SNAPSHOT_SHEET_CONTEXT_KEYS.includes(fieldKey)) {
    return sheetContextFieldDiffers(fieldKey, form, baseline);
  }
  if (SNAPSHOT_BODY_KEYS.includes(fieldKey)) {
    return (
      String(form[fieldKey] ?? "").trim() !==
      String(baseline[fieldKey] ?? "").trim()
    );
  }
  return false;
}

export function todayIsoDate() {
  return new Date().toISOString().split("T")[0];
}

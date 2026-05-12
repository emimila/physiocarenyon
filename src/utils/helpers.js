export function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function calcBMI(peso, altezza) {
  if (!peso || !altezza) return "";
  const h = Number(altezza) / 100;
  const bmi = Number(peso) / (h * h);
  return isFinite(bmi) ? bmi.toFixed(1) : "";
}

export function bmiCategory(bmi) {
  if (!bmi) return "";
  const n = Number(bmi);
  if (n < 18.5) return "Sottopeso";
  if (n < 25) return "Normopeso";
  if (n < 30) return "Sovrappeso";
  return "Obesità";
}

/** Data ISO `YYYY-MM-DD` → `DD.MM.YYYY` (senza shift fuso). */
export function formatDateDMY(dateString) {
  if (!dateString) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateString).trim());
  if (!m) return String(dateString).trim();
  return `${m[3]}.${m[2]}.${m[1]}`;
}

/** Nome visualizzato: ogni parola con iniziale maiuscola, resto minuscolo. */
function formatNomeLista(raw) {
  const parts = String(raw ?? "")
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toLocaleUpperCase() + w.slice(1));
  return parts.join(" ");
}

/** Elenco pazienti: cognome tutto maiuscolo, nome con iniziale maiuscola per parola. */
export function formatPatientListDisplayName(p) {
  const cognome = String(p?.cognome ?? "")
    .trim()
    .toUpperCase();
  const nome = formatNomeLista(p?.nome);
  return [cognome, nome].filter(Boolean).join(" ");
}

/** Filtro elenco pazienti: nome, cognome, sport (come prima) + data di nascita (ISO o DD.MM.YYYY, anche solo cifre). */
export function patientMatchesSearchQuery(p, queryRaw) {
  const q = String(queryRaw ?? "").trim().toLowerCase();
  if (!q) return true;

  const nome = String(p.nome ?? "").toLowerCase();
  const cognome = String(p.cognome ?? "").toLowerCase();
  const sports = (p.sportMultipli ?? []).join(" ").toLowerCase();
  const base = `${nome} ${cognome} ${sports}`;
  if (base.includes(q)) return true;

  const dn = String(p.dataNascita ?? "").trim();
  if (!dn) return false;

  const iso = dn.toLowerCase();
  const dmy = formatDateDMY(dn).toLowerCase();
  const dmyHyphen = dmy.replace(/\./g, "-");
  if (iso.includes(q) || dmy.includes(q) || dmyHyphen.includes(q)) return true;

  const qDigits = q.replace(/\D/g, "");
  if (qDigits.length < 2) return false;

  const isoCompact = iso.replace(/\D/g, "");
  const dmyCompact = dmy.replace(/\D/g, "");
  return isoCompact.includes(qDigits) || dmyCompact.includes(qDigits);
}

function startOfLocalDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

const DAY_MS = 1000 * 60 * 60 * 24;

function formatDaysUntilSurgery(totalDays, tt) {
  const n = Math.max(1, totalDays);
  if (n === 1) {
    return (
      tt("time.daysUntilSurgery_one") || "Manca 1 giorno all'operazione"
    );
  }
  const tpl =
    tt("time.daysUntilSurgery_other") ||
    "Mancano {{count}} giorni all'operazione";
  return tpl.replace(/\{\{count\}\}/g, String(n));
}

/**
 * Intervallo da una data a oggi: anni (se > 0), settimane, giorni — testo su una riga.
 * @param {string} dateString
 * @param {(key: string) => string | null} tt
 * @param {{ futureAsSurgeryCountdown?: boolean }} [options] — se true e la data è futura, mostra i giorni mancanti all'operazione invece di «Data futura»
 */
export function timeSinceYWD(dateString, tt, options = {}) {
  if (!dateString) return "";

  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateString).trim());
  if (!iso) return "";

  const y = Number(iso[1]);
  const mo = Number(iso[2]) - 1;
  const day = Number(iso[3]);
  const start = startOfLocalDay(new Date(y, mo, day));
  if (!Number.isFinite(start.getTime())) return "";

  const end = startOfLocalDay(new Date());
  if (end < start) {
    if (options.futureAsSurgeryCountdown) {
      const totalDays = Math.round((start - end) / DAY_MS);
      return formatDaysUntilSurgery(totalDays, tt);
    }
    return tt("time.future") || "Future date";
  }

  let years = 0;
  let cursor = new Date(start);
  for (;;) {
    const next = new Date(cursor);
    next.setFullYear(next.getFullYear() + 1);
    if (next > end) break;
    cursor = next;
    years += 1;
  }

  const diffMs = end - cursor;
  const totalDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const weeks = Math.floor(totalDays / 7);
  const days = totalDays % 7;

  const parts = [];
  if (years > 0) parts.push(`${years} ${tt("time.years")}`);
  if (weeks > 0) parts.push(`${weeks} ${tt("time.weeks")}`);
  if (days > 0 || parts.length === 0) {
    parts.push(`${days} ${tt("time.days")}`);
  }

  return parts.join(" + ");
}

/**
 * Data ISO locale `YYYY-MM-DD` strettamente nel futuro rispetto a oggi (inizio giornata).
 * Oggi = non futura (stesso comportamento di `timeSinceYWD` per l’intervento).
 */
export function isLocalIsoDateStrictlyFuture(dateString) {
  if (!dateString) return false;
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateString).trim());
  if (!iso) return false;
  const y = Number(iso[1]);
  const mo = Number(iso[2]) - 1;
  const day = Number(iso[3]);
  const start = startOfLocalDay(new Date(y, mo, day));
  if (!Number.isFinite(start.getTime())) return false;
  const end = startOfLocalDay(new Date());
  return end < start;
}

/**
 * Giorni interi calendario da oggi alla data (solo se futura), altrimenti `null`.
 * Coerente con il countdown usato in `timeSinceYWD(..., { futureAsSurgeryCountdown: true })`.
 */
export function wholeCalendarDaysUntilLocalIsoDate(dateString) {
  if (!dateString) return null;
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateString).trim());
  if (!iso) return null;
  const y = Number(iso[1]);
  const mo = Number(iso[2]) - 1;
  const day = Number(iso[3]);
  const start = startOfLocalDay(new Date(y, mo, day));
  if (!Number.isFinite(start.getTime())) return null;
  const end = startOfLocalDay(new Date());
  if (end >= start) return null;
  return Math.round((start - end) / DAY_MS);
}

/** @deprecated Preferire `timeSinceYWD` per schede cliniche. */
export function timeSince(dateString, tt) {
  return timeSinceYWD(dateString, tt);
}

export function evaluationLabel(v) {
  return `Valutazione ${v.numeroValutazione || "-"} — Sessione ${
    v.sessione || "-"
  } — ${v.data || "-"}`;
}

export function calculateYBalance(test) {
  function getValue(arr) {
    if (!arr || arr.length === 0) return 0;
    return Math.max(...arr.map(Number));
  }

  function normalize(value, legLength) {
    if (!legLength) return 0;
    return (value / legLength) * 100;
  }

  function computeSide(side) {
    const legLength = Number(side?.legLength || 0);

    const ant = getValue(side?.anterior);
    const pm = getValue(side?.posteromedial);
    const pl = getValue(side?.posterolateral);

    return {
      anterior: {
        raw: ant,
        norm: normalize(ant, legLength),
      },
      posteromedial: {
        raw: pm,
        norm: normalize(pm, legLength),
      },
      posterolateral: {
        raw: pl,
        norm: normalize(pl, legLength),
      },
      composite:
        legLength > 0
          ? ((ant + pm + pl) / (3 * legLength)) * 100
          : 0,
    };
  }

  const left = computeSide(test?.left || {});
  const right = computeSide(test?.right || {});

  return {
    left,
    right,
    asymmetry: {
      anterior: Math.abs(left.anterior.raw - right.anterior.raw),
      posteromedial: Math.abs(left.posteromedial.raw - right.posteromedial.raw),
      posterolateral: Math.abs(left.posterolateral.raw - right.posterolateral.raw),
      composite: Math.abs(left.composite - right.composite),
    },
    risk: {
      anterior: Math.abs(left.anterior.raw - right.anterior.raw) > 4,
      leftComposite: left.composite < 94,
      rightComposite: right.composite < 94,
    },
  };
}

export function classifyYBalance(result) {
  function classifyComposite(value) {
    if (!Number.isFinite(value) || value <= 0) {
      return {
        key: "missing",
        label: "Insufficient data",
        color: "#64748b",
      };
    }

    if (value < 90) {
      return {
        key: "very_low",
        label: "Very low",
        color: "#dc2626",
      };
    }

    if (value < 94) {
      return {
        key: "low",
        label: "Low / increased risk",
        color: "#f97316",
      };
    }

    if (value < 100) {
      return {
        key: "normal",
        label: "Normal",
        color: "#16a34a",
      };
    }

    if (value < 110) {
      return {
        key: "good",
        label: "Good",
        color: "#2563eb",
      };
    }

    return {
      key: "elite",
      label: "Excellent",
      color: "#7c3aed",
    };
  }

  function classifyAsymmetry(value, threshold = 4) {
    if (!Number.isFinite(value)) {
      return {
        key: "missing",
        label: "Insufficient data",
        color: "#64748b",
      };
    }

    if (value >= threshold) {
      return {
        key: "risk",
        label: "Clinically relevant asymmetry",
        color: "#dc2626",
      };
    }

    return {
      key: "ok",
      label: "Acceptable asymmetry",
      color: "#16a34a",
    };
  }

  return {
    rightComposite: classifyComposite(result?.right?.composite),
    leftComposite: classifyComposite(result?.left?.composite),
    anteriorAsymmetry: classifyAsymmetry(result?.asymmetry?.anterior, 4),
    posteromedialAsymmetry: classifyAsymmetry(
      result?.asymmetry?.posteromedial,
      4
    ),
    posterolateralAsymmetry: classifyAsymmetry(
      result?.asymmetry?.posterolateral,
      4
    ),
  };
}

/** Allineato alle opzioni diagnosi in `PatientForm` (valori canonici IT). */
const PATIENT_DIAGNOSIS_CANON = [
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
];

/**
 * Traduce la diagnosi salvata: chiave esatta, poi match case-insensitive con il catalogo, altrimenti testo manuale in minuscolo.
 */
/**
 * Splitta valori legacy del tipo `ginocchio_destro` / `caviglia_sinistra` in distretto+lato.
 * Ritorna { distretto, lato } o null se non riconosciuto.
 */
function splitLegacyDistrettoLato(value) {
  if (!value || typeof value !== "string") return null;
  const v = value.trim().toLowerCase();
  if (!v) return null;
  const sideMap = {
    destro: "destro",
    destra: "destro",
    sinistro: "sinistro",
    sinistra: "sinistro",
    bilaterale: "bilaterale",
  };
  const m = v.match(/^([a-z]+)_(destro|destra|sinistro|sinistra|bilaterale)$/);
  if (m) {
    return { distretto: m[1], lato: sideMap[m[2]] || "" };
  }
  return null;
}

/** Riga diagnosi incrementale (scheda paziente). */
export function migrateDiagnosiRighe(patient) {
  const p = patient || {};
  if (Array.isArray(p.diagnosiRighe) && p.diagnosiRighe.length > 0) {
    return p.diagnosiRighe.map((row, i) => {
      const rawDistr =
        row.distrettoDiagnosi != null ? String(row.distrettoDiagnosi) : "";
      const rawLato =
        row.latoDiagnosi != null ? String(row.latoDiagnosi) : "";
      let distretto = rawDistr;
      let lato = rawLato;
      if (!lato) {
        const split = splitLegacyDistrettoLato(rawDistr);
        if (split) {
          distretto = split.distretto;
          lato = split.lato;
        }
      }
      return {
        id:
          row.id ||
          `dx-${i}-${Math.random().toString(36).slice(2, 11)}`,
        diagnosi: row.diagnosi != null ? String(row.diagnosi) : "",
        distrettoDiagnosi: distretto,
        latoDiagnosi: lato,
        dettagli: row.dettagli != null ? String(row.dettagli) : "",
      };
    });
  }
  const hasLegacy =
    (p.diagnosi && String(p.diagnosi).trim()) ||
    (p.distrettoDiagnosi && String(p.distrettoDiagnosi).trim()) ||
    (p.diagnosiDettagli && String(p.diagnosiDettagli).trim());
  if (hasLegacy) {
    const rawDistr = String(p.distrettoDiagnosi || "").trim();
    const split = splitLegacyDistrettoLato(rawDistr);
    return [
      {
        id: uid(),
        diagnosi: String(p.diagnosi || "").trim(),
        distrettoDiagnosi: split ? split.distretto : rawDistr,
        latoDiagnosi: split ? split.lato : "",
        dettagli: String(p.diagnosiDettagli || "").trim(),
      },
    ];
  }
  return [
    {
      id: uid(),
      diagnosi: "",
      distrettoDiagnosi: "",
      latoDiagnosi: "",
      dettagli: "",
    },
  ];
}

export function translatedPatientDiagnosis(diagnosi, tt) {
  if (diagnosi == null || String(diagnosi).trim() === "") return "";
  const raw = String(diagnosi).trim();
  const direct = tt(`options.diagnosis.${raw}`);
  if (direct) return direct;
  const low = raw.toLowerCase();
  const canon = PATIENT_DIAGNOSIS_CANON.find((k) => k.toLowerCase() === low);
  if (canon) {
    const lab = tt(`options.diagnosis.${canon}`);
    return lab || canon;
  }
  return low;
}

/**
 * Etichetta distretto diagnosi: `ginocchio_destro` → distretto + lato tradotti (non la chiave grezza).
 */
export function translatedDistrettoDiagnosi(value, tt) {
  if (value == null || String(value).trim() === "") return "";
  const v = String(value).trim().toLowerCase();
  const m = v.match(/^(.+)_(destra|sinistra|destro|sinistro)$/);
  if (m) {
    const base = m[1];
    const sideKey = m[2];
    const district = tt(`options.distretti.${base}`);
    const sideLabel =
      sideKey === "destra" || sideKey === "destro"
        ? tt("evaluation.right")
        : tt("evaluation.left");
    const d = district || base.replace(/_/g, " ");
    const s = sideLabel || sideKey;
    return `${d} — ${s}`;
  }
  const whole = tt(`options.distretti.${v}`);
  if (whole) return whole;
  return v.replace(/_/g, " ");
}

/** Testo libero mostrato in minuscolo (note compilate a mano). */
export function manualTextLower(s) {
  if (s == null) return "";
  const t = String(s).trim();
  return t ? t.toLowerCase() : "";
}

export function patientTrim(v) {
  if (v == null) return "";
  return String(v).trim();
}

/** True se la riga diagnosi ha almeno un valore da mostrare in scheda. */
export function patientDiagnosiRowIsFilled(row, tt) {
  if (!row) return false;
  const dx = patientTrim(translatedPatientDiagnosis(row.diagnosi, tt));
  const dist = row.distrettoDiagnosi
    ? patientTrim(translatedDistrettoDiagnosi(row.distrettoDiagnosi, tt))
    : "";
  const det = patientTrim(manualTextLower(row.dettagli));
  return Boolean(dx || dist || det);
}
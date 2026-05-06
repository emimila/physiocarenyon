import { ABSOLUTE_KG, NORMALIZED_KG_M2 } from "../data/gripNorms";

export const Sex = {
  MALE: "MALE",
  FEMALE: "FEMALE",
};

export function calculateAge(birthDate, assessmentDate = new Date()) {
  if (!birthDate) return null;

  const birth = new Date(birthDate);
  const today = new Date(assessmentDate);

  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();

  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }

  return age;
}

export function bestOf3(a, b, c) {
  return Math.max(Number(a) || 0, Number(b) || 0, Number(c) || 0);
}

export function averageOf3(a, b, c) {
  const values = [a, b, c]
    .map(Number)
    .filter((v) => Number.isFinite(v) && v > 0);

  if (!values.length) return 0;

  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

export function normalizeGrip(bestGripKg, heightCm) {
  const h = Number(heightCm) / 100;
  if (!h || !bestGripKg) return 0;

  return bestGripKg / (h * h);
}

function getSexKey(patientSex) {
  if (patientSex === "Donna" || patientSex === "female" || patientSex === "FEMALE") {
    return Sex.FEMALE;
  }

  return Sex.MALE;
}

function getNormRow(table, sex, age) {
  if (!sex || age == null) return null;

  const rows = table[sex] || [];
  return rows.find((row) => age >= row.ageMin && age <= row.ageMax) || null;
}

function estimatePercentile(value, row) {
  if (!row || !value) return null;

  const points = [
    { p: 5, value: row.p5 },
    { p: 10, value: row.p10 },
    { p: 20, value: row.p20 },
    { p: 30, value: row.p30 },
    { p: 40, value: row.p40 },
    { p: 50, value: row.p50 },
    { p: 60, value: row.p60 },
    { p: 70, value: row.p70 },
    { p: 80, value: row.p80 },
    { p: 90, value: row.p90 },
    { p: 95, value: row.p95 },
  ];

  if (value <= points[0].value) return 5;
  if (value >= points[points.length - 1].value) return 95;

  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];

    if (value >= a.value && value <= b.value) {
      const valueRange = b.value - a.value;
      const percentileRange = b.p - a.p;

      if (valueRange === 0) return a.p;

      const fraction = (value - a.value) / valueRange;
      return a.p + fraction * percentileRange;
    }
  }

  return null;
}

function percentileBand(value, row) {
  if (!row || !value) return null;

  if (value < row.p5) return "<P5";
  if (value < row.p10) return "P5-P10";
  if (value < row.p20) return "P10-P20";
  if (value < row.p30) return "P20-P30";
  if (value < row.p40) return "P30-P40";
  if (value < row.p50) return "P40-P50";
  if (value < row.p60) return "P50-P60";
  if (value < row.p70) return "P60-P70";
  if (value < row.p80) return "P70-P80";
  if (value < row.p90) return "P80-P90";
  if (value < row.p95) return "P90-P95";
  return ">P95";
}

export function interpretPercentile(p) {
  if (p == null) return null;

  if (p < 20) return "very_low";
  if (p < 40) return "low";
  if (p < 60) return "average";
  if (p < 80) return "good";
  return "excellent";
}

function round(value, decimals = 1) {
  if (value == null || !Number.isFinite(value)) return null;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function assessGrip(patient, assessmentDate = new Date()) {
  if (!patient) return null;

  const age = calculateAge(patient.dataNascita, assessmentDate);
  const sex = getSexKey(patient.sesso);

  const bestRight = bestOf3(
    patient.manoDestraForza1,
    patient.manoDestraForza2,
    patient.manoDestraForza3
  );

  const bestLeft = bestOf3(
    patient.manoSinistraForza1,
    patient.manoSinistraForza2,
    patient.manoSinistraForza3
  );

  const avgRight = averageOf3(
    patient.manoDestraForza1,
    patient.manoDestraForza2,
    patient.manoDestraForza3
  );

  const avgLeft = averageOf3(
    patient.manoSinistraForza1,
    patient.manoSinistraForza2,
    patient.manoSinistraForza3
  );

  const bestOverall = Math.max(bestRight, bestLeft);
  const averageOverall = [avgRight, avgLeft].filter((v) => v > 0);
  const average =
    averageOverall.length > 0
      ? averageOverall.reduce((sum, v) => sum + v, 0) / averageOverall.length
      : 0;

  if (!age || !bestOverall || !patient.altezza) {
    return {
      ready: false,
      age,
      sex,
      bestRight: round(bestRight),
      bestLeft: round(bestLeft),
      bestOverall: round(bestOverall),
      avgRight: round(avgRight),
      avgLeft: round(avgLeft),
      average: round(average),
      messageKey: "missing_data",
      chartData: [],
    };
  }

  const normalized = normalizeGrip(bestOverall, patient.altezza);

  const absoluteRow = getNormRow(ABSOLUTE_KG, sex, age);
  const normalizedRow = getNormRow(NORMALIZED_KG_M2, sex, age);

  const absolutePercentile = estimatePercentile(bestOverall, absoluteRow);
  const normalizedPercentile = estimatePercentile(normalized, normalizedRow);

  const absoluteBand = percentileBand(bestOverall, absoluteRow);
  const normalizedBand = percentileBand(normalized, normalizedRow);

  const absoluteInterpretationKey = interpretPercentile(absolutePercentile);
  const normalizedInterpretationKey = interpretPercentile(normalizedPercentile);

  return {
    ready: true,
    age,
    sex,

    bestRight: round(bestRight),
    bestLeft: round(bestLeft),
    bestOverall: round(bestOverall),

    avgRight: round(avgRight),
    avgLeft: round(avgLeft),
    average: round(average),

    normalized: round(normalized, 2),

    absolutePercentile: round(absolutePercentile, 1),
    normalizedPercentile: round(normalizedPercentile, 1),

    absoluteBand,
    normalizedBand,

    absoluteInterpretationKey,
    normalizedInterpretationKey,

    chartData: [
      { key: "right", value: round(bestRight) || 0 },
      { key: "left", value: round(bestLeft) || 0 },
      { key: "absolutePercentile", value: round(absolutePercentile, 1) || 0 },
      { key: "normalizedPercentile", value: round(normalizedPercentile, 1) || 0 },
    ],
  };
}
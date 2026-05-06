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

export function timeSince(dateString, tt) {
  if (!dateString) return "";

  const start = new Date(dateString);
  const today = new Date();
  const diffMs = today - start;

  if (diffMs < 0) return tt("time.future") || "Future date";

  const totalDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const totalWeeks = Math.floor(totalDays / 7);

  if (totalWeeks < 20) {
    const remainingDays = totalDays % 7;
    return `${totalWeeks} ${tt("time.weeks")}\n+ ${remainingDays} ${tt("time.days")}`;
  }

  const totalMonths = Math.floor(totalDays / 30.44);
  const remainingWeeks = Math.floor((totalDays % 30.44) / 7);

  return `${totalMonths} ${tt("time.months")}\n+ ${remainingWeeks} ${tt("time.weeks")}`;
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
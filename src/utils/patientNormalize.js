import { uid } from "./helpers";

/**
 * Sposta i test dalle valutazioni a `sessioniTest` (una tantum se manca la chiave),
 * poi azzera sempre `distretti[].tests` nelle valutazioni.
 */
export function normalizePatientSessioniTest(p) {
  const hasSessioniKey = Object.prototype.hasOwnProperty.call(p, "sessioniTest");
  let sessioniTest = Array.isArray(p.sessioniTest) ? [...p.sessioniTest] : [];
  const valutazioni = JSON.parse(JSON.stringify(p.valutazioni || []));
  let maxTestNum = sessioniTest.reduce(
    (m, s) => Math.max(m, Number(s.numeroTest) || 0),
    0
  );

  if (!hasSessioniKey) {
    for (const v of valutazioni) {
      const withTyped = (v.distretti || []).filter((d) =>
        (d.tests || []).some((t) => t && t.type)
      );
      if (withTyped.length === 0) continue;
      maxTestNum += 1;
      sessioniTest.push({
        id: uid(),
        data: v.data || new Date().toISOString().split("T")[0],
        numeroTest: String(maxTestNum),
        note: "",
        distretti: withTyped.map((d) => ({
          id: uid(),
          nome: d.nome,
          numeroValutazioneDistretto: d.numeroValutazioneDistretto || "",
          tests: (d.tests || [])
            .filter((t) => t && t.type)
            .map((t) => JSON.parse(JSON.stringify(t))),
        })),
      });
    }
  }

  for (const v of valutazioni) {
    v.distretti = (v.distretti || []).map((d) => ({
      ...d,
      tests: [],
    }));
  }

  return {
    ...p,
    valutazioni,
    sessioniTest,
  };
}

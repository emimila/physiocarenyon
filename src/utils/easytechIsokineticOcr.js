/**
 * Lettura PDF Easytech (strato testo) tramite pdf.js → righe → parseEasytechPdfText.
 * File storico "Ocr": oggi non usa più Tesseract.
 *
 * Il worker DEVE essere servito dallo stesso origine del sito: un CDN esterno
 * (unpkg) viene spesso bloccato da CSP in produzione (es. Vercel) e fa crashare pdf.js.
 */
import {
  EASYTECH_FIELD_RULES,
  parseEasytechPdfText,
  validateField,
} from "./easytechIsokineticImport.js";

/** URL del worker incluso nel bundle Vite (stesso dominio → niente CSP verso terzi). */
import pdfWorkerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";

function attachPdfWorker(pdfjs) {
  pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerSrc;
}

/** Raggruppa item getTextContent in righe (stessa baseline, ordine sinistra-destra). */
function textItemsToLines(items) {
  const buckets = new Map();
  for (const it of items || []) {
    const s = it.str;
    if (s == null || !String(s).trim()) continue;
    const tr = it.transform || [1, 0, 0, 1, 0, 0];
    const x = tr[4];
    const y = tr[5];
    const yKey = Math.round(y * 10) / 10;
    if (!buckets.has(yKey)) buckets.set(yKey, []);
    buckets.get(yKey).push({ x, s: String(s).trim() });
  }
  const sortedYs = Array.from(buckets.keys()).sort((a, b) => b - a);
  const lines = [];
  for (const yKey of sortedYs) {
    const parts = buckets
      .get(yKey)
      .sort((a, b) => a.x - b.x)
      .map((p) => p.s)
      .filter(Boolean);
    const line = parts.join(" ").replace(/\s+/g, " ").trim();
    if (line) lines.push(line);
  }
  return lines;
}

function cellDisplayFromValidated(rule, v, rawFallback) {
  if (!v.valid) return String(rawFallback ?? "");
  const n = v.normalized;
  if (n == null || n === "") return "";
  if (typeof n === "string") return n;
  if (Array.isArray(n)) {
    if (n.length === 3) {
      return n.map((x) => (x == null ? "" : String(x))).join(" ");
    }
    return n
      .map((x) => {
        if (x == null) return "";
        if (typeof x === "number" && !Number.isInteger(x)) {
          return String(Math.round(x * 100) / 100);
        }
        if (typeof x === "number") return String(Math.round(x));
        return String(x);
      })
      .join("/");
  }
  return String(n);
}

function buildMeasurementColumnsFromRows(rows) {
  return [1, 2].map((col) => {
    const fields = {};
    for (const rule of EASYTECH_FIELD_RULES) {
      const row = rows.find((r) => r.key === rule.jsonKey);
      const raw =
        col === 1
          ? String(row?.droiteRaw ?? "").trim()
          : String(row?.gaucheRaw ?? "").trim();
      const v = validateField(rule, raw);
      fields[rule.jsonKey] = {
        label: rule.label,
        raw,
        value: cellDisplayFromValidated(rule, v, raw),
        valid: v.valid,
        ...(v.message ? { message: v.message } : {}),
      };
    }
    return { column: col, fields };
  });
}

/**
 * @param {Uint8Array} pdfBytes
 * @param {(ev: { phase: string, page?: number, totalPages?: number }) => void} [onProgress]
 * @returns {Promise<{ pages: Array<object> }>}
 */
export async function extractEasytechPdf(pdfBytes, onProgress) {
  const bytes =
    pdfBytes instanceof Uint8Array
      ? pdfBytes
      : new Uint8Array(pdfBytes || []);

  const pdfjs = await import("pdfjs-dist/build/pdf.mjs");
  attachPdfWorker(pdfjs);

  const loadingTask = pdfjs.getDocument({
    data: bytes,
    useSystemFonts: true,
    stopAtErrors: false,
  });

  let pdf;
  try {
    pdf = await loadingTask.promise;
  } catch (e) {
    const msg = e?.message || String(e);
    throw new Error(
      msg.includes("worker") || msg.includes("Worker")
        ? `PDF worker: ${msg}`
        : msg
    );
  }

  const n = pdf.numPages || 0;
  const pages = [];

  for (let i = 1; i <= n; i++) {
    onProgress?.({ phase: "render", page: i, totalPages: n });
    const page = await pdf.getPage(i);
    const tc = await page.getTextContent({ disableNormalization: false });
    const lines = textItemsToLines(tc.items);
    const parsed = parseEasytechPdfText(lines);
    pages.push({
      pageNumber: i,
      rows: parsed.rows,
      header: parsed.header,
      measurements: buildMeasurementColumnsFromRows(parsed.rows),
    });
  }

  onProgress?.({ phase: "ocr", page: n, totalPages: n, totalCells: 1, cellIdx: 1 });
  return { pages };
}

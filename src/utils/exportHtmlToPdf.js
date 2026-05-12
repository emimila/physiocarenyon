import html2pdf from "html2pdf.js";

import physiocareHeader from "../assets/physiocare-header.jpg";

/**
 * Geometria del banner PhysioCare Nyon (in pollici, A4 portrait, jsPDF unit "in").
 * Il margine top dell'export deve restare maggiore di HEADER_Y + HEADER_HEIGHT
 * per evitare che il contenuto del documento finisca sotto al banner.
 *
 * Pagina A4 portrait ≈ 8.27" × 11.69".
 * - HEADER_SIDE_PADDING: padding orizzontale per non toccare i bordi pagina.
 * - HEADER_WIDTH = pageWidth − 2·HEADER_SIDE_PADDING (≈ 7.47") → "larghezza pdf".
 * - HEADER_HEIGHT = HEADER_WIDTH × (157/1024) ≈ 1.145" (rapporto sorgente 6.52:1).
 * - HEADER_Y: distanza dall'alto pagina al banner (piccola padding visiva).
 * - PDF_TOP_MARGIN_IN = HEADER_Y + HEADER_HEIGHT + buffer ≈ 1.4".
 */
const HEADER_SIDE_PADDING_IN = 0.4;
const HEADER_Y_IN = 0.15;
const HEADER_NATIVE_WIDTH = 1024;
const HEADER_NATIVE_HEIGHT = 157;
const PDF_TOP_MARGIN_IN = 1.4;
const PDF_BOTTOM_MARGIN_IN = 0.5;
const PDF_SIDE_MARGIN_IN = HEADER_SIDE_PADDING_IN;

let headerDataUrlPromise = null;

/**
 * Carica una sola volta l'asset bundle-zato (Vite emette un URL hash) e lo
 * converte in data URL così `pdf.addImage()` non ha bisogno di richieste extra
 * né incappa in CORS quando html2pdf inietta l'immagine nel canvas finale.
 */
function loadHeaderDataUrl() {
  if (headerDataUrlPromise) return headerDataUrlPromise;
  headerDataUrlPromise = (async () => {
    const res = await fetch(physiocareHeader);
    if (!res.ok) {
      throw new Error(
        `Impossibile caricare l'header PhysioCare (${res.status} ${res.statusText}).`
      );
    }
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () =>
        reject(
          new Error(
            "Impossibile leggere l'header PhysioCare come data URL (FileReader)."
          )
        );
      reader.onload = () => {
        const result = reader.result;
        if (typeof result !== "string") {
          reject(
            new Error("Header PhysioCare: data URL non valido (atteso string).")
          );
          return;
        }
        resolve(result);
      };
      reader.readAsDataURL(blob);
    });
  })().catch((err) => {
    headerDataUrlPromise = null;
    throw err;
  });
  return headerDataUrlPromise;
}

/**
 * Opzioni html2pdf condivise: A4 verticale, margine top calibrato sul banner
 * PhysioCare, pagebreak per limitare tagli a metà blocco.
 * @param {string} filename
 */
export function getHtml2PdfOptions(filename) {
  return {
    margin: [
      PDF_TOP_MARGIN_IN,
      PDF_SIDE_MARGIN_IN,
      PDF_BOTTOM_MARGIN_IN,
      PDF_SIDE_MARGIN_IN,
    ],
    filename,
    image: { type: "jpeg", quality: 0.96 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      logging: false,
      letterRendering: true,
    },
    jsPDF: {
      unit: "in",
      format: "a4",
      orientation: "portrait",
      compress: true,
    },
    pagebreak: {
      mode: ["avoid-all", "css", "legacy"],
      before: [],
      after: [],
      avoid: [],
    },
  };
}

/**
 * Stampa il banner PhysioCare su tutte le pagine del jsPDF passato.
 * @param {import("jspdf").jsPDF} pdf
 * @param {string} dataUrl
 */
function stampHeaderOnAllPages(pdf, dataUrl) {
  const pageWidth = pdf.internal.pageSize.getWidth();
  const headerWidth = pageWidth - 2 * HEADER_SIDE_PADDING_IN;
  const headerHeight =
    (headerWidth * HEADER_NATIVE_HEIGHT) / HEADER_NATIVE_WIDTH;

  const totalPages = pdf.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    pdf.addImage(
      dataUrl,
      "JPEG",
      HEADER_SIDE_PADDING_IN,
      HEADER_Y_IN,
      headerWidth,
      headerHeight,
      undefined,
      "FAST"
    );
  }
}

/**
 * Esporta un elemento DOM in PDF (A4 portrait) con html2pdf.js, applicando il
 * banner PhysioCare Nyon a piena larghezza in cima a ogni pagina.
 * @param {HTMLElement | null} element
 * @param {{ filename: string }} options
 */
export async function exportHtmlToPdf(element, { filename }) {
  if (!element) return;
  try {
    const headerDataUrl = await loadHeaderDataUrl();
    const worker = html2pdf()
      .set(getHtml2PdfOptions(filename))
      .from(element)
      .toPdf();
    const pdf = await worker.get("pdf");
    stampHeaderOnAllPages(pdf, headerDataUrl);
    await worker.save();
  } catch (err) {
    const msg =
      err && err.message
        ? err.message
        : "Errore sconosciuto durante l'export PDF.";
    throw new Error(`Export PDF non riuscito: ${msg}`);
  }
}

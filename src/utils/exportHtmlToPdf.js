import html2pdf from "html2pdf.js";

/**
 * Opzioni html2pdf condivise: A4 verticale, margini uniformi, pagebreak per limitare tagli a metà blocco.
 * @param {string} filename
 */
export function getHtml2PdfOptions(filename) {
  return {
    margin: 0.5,
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
 * Esporta un elemento DOM in PDF (A4 portrait) con html2pdf.js.
 * @param {HTMLElement | null} element
 * @param {{ filename: string }} options
 */
export async function exportHtmlToPdf(element, { filename }) {
  if (!element) return;
  await html2pdf().set(getHtml2PdfOptions(filename)).from(element).save();
}

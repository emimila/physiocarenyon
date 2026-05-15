/**
 * Estrae le immagini incastonate nel PDF Easytech (curve e grafici sono spesso bitmap,
 * non path vettoriali). Usa pdf.js getOperatorList + page.objs dopo la risoluzione.
 */
import { ImageKind, OPS } from "pdfjs-dist/build/pdf.mjs";

function multiplyPdfTransform(a, b) {
  return [
    a[0] * b[0] + a[2] * b[1],
    a[1] * b[0] + a[3] * b[1],
    a[0] * b[2] + a[2] * b[3],
    a[1] * b[2] + a[3] * b[3],
    a[0] * b[4] + a[2] * b[5] + a[4],
    a[1] * b[4] + a[3] * b[5] + a[5],
  ];
}

function rawRgbToImageData(width, height, data) {
  const n = width * height;
  const rgba = new Uint8ClampedArray(n * 4);
  let o = 0;
  for (let i = 0; i < n * 3; i += 3) {
    rgba[o++] = data[i];
    rgba[o++] = data[i + 1];
    rgba[o++] = data[i + 2];
    rgba[o++] = 255;
  }
  return new ImageData(rgba, width, height);
}

function imageObjToImageData(img) {
  if (!img?.data || !img.width || !img.height) return null;
  if (img.kind === ImageKind.RGBA_32BPP) {
    return new ImageData(
      new Uint8ClampedArray(
        img.data.buffer,
        img.data.byteOffset,
        img.width * img.height * 4
      ),
      img.width,
      img.height
    );
  }
  if (img.kind === ImageKind.RGB_24BPP) {
    return rawRgbToImageData(img.width, img.height, img.data);
  }
  return null;
}

function imageDataToJpegDataUrl(imageData, quality = 0.82) {
  const canvas = document.createElement("canvas");
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.putImageData(imageData, 0, 0);
  const url = canvas.toDataURL("image/jpeg", quality);
  return url && url.startsWith("data:") ? url : null;
}

/**
 * Percorre l'operator list, trova paintImageXObject e codifica ogni bitmap in JPEG (data URL).
 * @param {object} page proxy pagina pdf.js
 * @returns {Promise<{ version: 1, images: Array<{ dataUrl: string, nativeW: number, nativeH: number, objId: string }> } | null>}
 */
export async function extractEasytechPdfPageChartImages(page) {
  if (!page || typeof page.getOperatorList !== "function") return null;
  const op = await page.getOperatorList();
  const { fnArray, argsArray } = op;
  const stack = [];
  let ctm = [1, 0, 0, 1, 0, 0];
  const placements = [];
  for (let i = 0; i < fnArray.length; i++) {
    const fn = fnArray[i];
    const args = argsArray[i];
    if (fn === OPS.save) {
      stack.push(ctm.slice());
    } else if (fn === OPS.restore) {
      ctm = stack.pop() || [1, 0, 0, 1, 0, 0];
    } else if (fn === OPS.transform) {
      ctm = multiplyPdfTransform(ctm, args);
    } else if (fn === OPS.paintImageXObject) {
      const objId = args[0];
      const dw = Number(args[1]);
      const dh = Number(args[2]);
      placements.push({ objId, pdfDrawW: dw, pdfDrawH: dh, ctm: ctm.slice() });
    }
  }
  const seen = new Set();
  const images = [];
  for (const pl of placements) {
    if (!pl.objId || seen.has(pl.objId)) continue;
    seen.add(pl.objId);
    let img;
    try {
      img = await page.objs.get(pl.objId);
    } catch {
      continue;
    }
    const idata = imageObjToImageData(img);
    if (!idata) continue;
    const area = idata.width * idata.height;
    if (area < 55_000) continue;
    const dataUrl = imageDataToJpegDataUrl(idata, 0.82);
    if (!dataUrl) continue;
    images.push({
      dataUrl,
      nativeW: idata.width,
      nativeH: idata.height,
      objId: String(pl.objId),
    });
  }
  images.sort((a, b) => b.nativeW * b.nativeH - a.nativeW * a.nativeH);
  if (!images.length) return null;
  return { version: 1, images };
}

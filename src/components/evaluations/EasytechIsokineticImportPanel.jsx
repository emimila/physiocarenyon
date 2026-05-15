import { useMemo, useRef, useState } from "react";
import {
  EASYTECH_FIELD_RULES,
  EASYTECH_TARGET_FIELDS,
  buildIsokineticSideFromFields,
  pageResultToIsokineticPatch,
  validateField,
} from "../../utils/easytechIsokineticImport";
import { extractEasytechPdf } from "../../utils/easytechIsokineticOcr";

let easytechImportRunSeq = 0;

/**
 * Pannello di import del referto Easytech.
 *
 * Flusso:
 *  1. un solo pulsante: scegli uno o più PDF nella stessa finestra (selezione multipla)
 *  2. la pipeline esegue render + OCR cella-per-cella per ogni pagina
 *  3. il risultato viene mostrato come tabella editabile con validazione live:
 *     - bordo verde se la cella è valida
 *     - bordo rosso + sfondo rosa se non lo è (con tooltip del messaggio)
 *  4. l'utente può correggere a mano e poi cliccare "Importa nella scheda"
 *     per applicare i valori a una singola velocità o "Importa tutte" per
 *     applicare tutte le pagine in blocco.
 */
export default function EasytechIsokineticImportPanel({ tt, iso, onApplyPatch }) {
  const fileInputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(null);
  const [pages, setPages] = useState([]);
  const [error, setError] = useState("");

  const loadedSourceLabels = useMemo(() => {
    const names = pages
      .map((p) => p.sourceFileName)
      .filter((n) => typeof n === "string" && n.trim());
    return [...new Set(names)];
  }, [pages]);

  const showPageSourceFile = loadedSourceLabels.length > 1;

  function reset() {
    setPages([]);
    setError("");
    setProgress(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removePage(pageIdx) {
    setPages((prev) => prev.filter((_, i) => i !== pageIdx));
  }

  async function handleFile(e) {
    const list = e.target.files;
    if (!list?.length) return;
    const files = Array.from(list).filter(
      (f) =>
        f &&
        (f.type === "application/pdf" || /\.pdf$/i.test(f.name || ""))
    );
    if (!files.length) {
      setError(tt("tests.isokinetic.easytechImportNoPdfFiles") || "Seleziona solo file PDF.");
      e.target.value = "";
      return;
    }
    const append = pages.length > 0;
    setError("");
    setBusy(true);
    const runId = ++easytechImportRunSeq;
    const totalFiles = files.length;
    const fileErrors = [];
    const allNewPages = [];
    try {
      for (let fi = 0; fi < files.length; fi++) {
        const file = files[fi];
        setProgress({
          phase: "open",
          page: 0,
          totalPages: 0,
          multiFileIndex: fi + 1,
          multiFileTotal: totalFiles,
          multiFileName: file.name,
        });
        try {
          const buf = await file.arrayBuffer();
          const result = await extractEasytechPdf(new Uint8Array(buf), (ev) =>
            setProgress({
              ...ev,
              multiFileIndex: fi + 1,
              multiFileTotal: totalFiles,
              multiFileName: file.name,
            })
          );
          const enriched = (result.pages || []).map((p) =>
            decoratePage(p, {
              sourceFileName: file.name,
              sourceFileIndex: fi,
              sourceRunId: runId,
            })
          );
          allNewPages.push(...enriched);
        } catch (err) {
          fileErrors.push(`${file.name}: ${err?.message || err}`);
        }
      }
      if (allNewPages.length === 0) {
        setError(
          fileErrors.length
            ? fileErrors.join("\n")
            : tt("tests.isokinetic.easytechImportNothingLoaded") ||
                "Nessuna pagina estratta dai PDF selezionati."
        );
        return;
      }
      setPages((prev) => (append ? [...prev, ...allNewPages] : allNewPages));
      if (fileErrors.length) {
        setError(
          (tt("tests.isokinetic.easytechImportPartialErrors") ||
            "Alcuni file non sono stati letti:") +
            "\n" +
            fileErrors.join("\n")
        );
      }
    } catch (err) {
      setError(String(err?.message || err));
    } finally {
      setBusy(false);
      setProgress(null);
      e.target.value = "";
    }
  }

  function decoratePage(p, ctx = {}) {
    const speed = guessSpeedFromPage(p);
    const sideMap = guessSideMapFromPage(p);
    return {
      ...p,
      sourceFileName: ctx.sourceFileName ?? "",
      sourceFileIndex: ctx.sourceFileIndex ?? 0,
      sourceRunId: ctx.sourceRunId ?? 0,
      uiSpeed: speed,
      uiSideMap: sideMap,
      imported: false,
    };
  }

  function updatePageField(pageIdx, column, jsonKey, raw) {
    setPages((prev) =>
      prev.map((p, i) => {
        if (i !== pageIdx) return p;
        const measurements = (p.measurements || []).map((m) => {
          if (m.column !== column) return m;
          const rule = EASYTECH_FIELD_RULES.find((r) => r.jsonKey === jsonKey);
          const v = rule
            ? validateField(rule, raw)
            : { valid: true, normalized: raw, message: null };
          return {
            ...m,
            fields: {
              ...m.fields,
              [jsonKey]: {
                label: m.fields[jsonKey]?.label || rule?.label || jsonKey,
                raw,
                value: (() => {
                  const n = v.normalized;
                  if (!v.valid) return n;
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
                })(),
                valid: v.valid,
                ...(v.message ? { message: v.message } : {}),
              },
            },
          };
        });
        const next = { ...p, measurements };
        next.uiSpeed = guessSpeedFromPage(next, p.uiSpeed);
        next.uiSideMap = guessSideMapFromPage(next, p.uiSideMap);
        return next;
      })
    );
  }

  function setPageSpeed(pageIdx, speed) {
    setPages((prev) =>
      prev.map((p, i) => (i === pageIdx ? { ...p, uiSpeed: speed } : p))
    );
  }

  function swapPageSides(pageIdx) {
    setPages((prev) =>
      prev.map((p, i) => {
        if (i !== pageIdx) return p;
        const { col1, col2 } = p.uiSideMap || {};
        return {
          ...p,
          uiSideMap: { col1: col2 ?? null, col2: col1 ?? null },
        };
      })
    );
  }

  function setColumnSide(pageIdx, column, side) {
    setPages((prev) =>
      prev.map((p, i) => {
        if (i !== pageIdx) return p;
        const map = { ...(p.uiSideMap || {}) };
        if (column === 1) map.col1 = side || null;
        else if (column === 2) map.col2 = side || null;
        return { ...p, uiSideMap: map };
      })
    );
  }

  function buildPatchForPage(p) {
    if (!p) return null;
    const base = pageResultToIsokineticPatch(p) || {};
    const speed = p.uiSpeed ?? base.speed ?? null;
    const m1 = p.measurements?.find((m) => m.column === 1);
    const m2 = p.measurements?.find((m) => m.column === 2);
    const data1 = buildIsokineticSideFromFields(m1?.fields || {});
    const data2 = buildIsokineticSideFromFields(m2?.fields || {});
    const map = p.uiSideMap || { col1: base.col1Side, col2: base.col2Side };
    const out = { speed, right: null, left: null };
    if (map.col1 === "right") out.right = data1;
    else if (map.col1 === "left") out.left = data1;
    if (map.col2 === "right") out.right = data2;
    else if (map.col2 === "left") out.left = data2;
    const spd = Number(speed);
    if (spd === 60 && p.easytechPdfCharts60?.images?.length) {
      out.easytechPdfCharts60 = p.easytechPdfCharts60;
    }
    return out;
  }

  function importPage(pageIdx) {
    const p = pages[pageIdx];
    const patch = buildPatchForPage(p);
    if (!patch) return;
    if (!patch.speed) {
      setError(tt("tests.isokinetic.easytechImportNoSpeed"));
      return;
    }
    if (!patch.right && !patch.left) {
      setError(tt("tests.isokinetic.easytechImportNoSide"));
      return;
    }
    setError("");
    onApplyPatch?.({ speed: patch.speed, right: patch.right, left: patch.left });
    setPages((prev) =>
      prev.map((pp, i) => (i === pageIdx ? { ...pp, imported: true } : pp))
    );
  }

  function importAll() {
    const patches = [];
    for (let i = 0; i < pages.length; i++) {
      const p = pages[i];
      const patch = buildPatchForPage(p);
      if (patch && patch.speed && (patch.right || patch.left)) {
        patches.push(patch);
      }
    }
    if (patches.length === 0) {
      setError(tt("tests.isokinetic.easytechImportNothing"));
      return;
    }
    setError("");
    if (patches.length === 1) {
      onApplyPatch?.(patches[0]);
    } else {
      onApplyPatch?.({ patches });
    }
    setPages((prev) => {
      const readyIdx = new Set();
      for (let i = 0; i < prev.length; i++) {
        const patch = buildPatchForPage(prev[i]);
        if (patch && patch.speed && (patch.right || patch.left)) {
          readyIdx.add(i);
        }
      }
      return prev.map((p, i) =>
        readyIdx.has(i) ? { ...p, imported: true } : p
      );
    });
  }

  const summary = useMemo(() => {
    const total = pages.length;
    const ready = pages.filter((p) => {
      const patch = buildPatchForPage(p);
      return patch && patch.speed && (patch.right || patch.left);
    }).length;
    return { total, ready };
  }, [pages]);

  const progressPct = useMemo(() => {
    if (!progress) return null;
    if (progress.phase === "ocr" && progress.totalCells) {
      const overallTotal =
        (progress.totalPages || 1) * (progress.totalCells || 1);
      const overallDone =
        ((progress.page || 1) - 1) * (progress.totalCells || 1) +
        (progress.cellIdx || 0);
      return Math.round((overallDone / overallTotal) * 100);
    }
    if (
      (progress.phase === "render" || progress.phase === "charts") &&
      progress.totalPages
    ) {
      return Math.round((((progress.page || 1) - 1) / progress.totalPages) * 100);
    }
    return null;
  }, [progress]);

  return (
    <div
      className="easytech-import-panel"
      style={{
        marginTop: 12,
        border: "1px dashed #cbd5e1",
        borderRadius: 10,
        padding: "12px 14px",
        background: "#f8fafc",
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          alignItems: "center",
          marginBottom: 8,
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 13, color: "#0f172a" }}>
          {tt("tests.isokinetic.easytechImportTitle") ||
            "Importa PDF Easytech"}
        </div>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={busy}
          style={{ padding: "6px 12px", fontSize: 12 }}
        >
          {busy
            ? tt("tests.isokinetic.easytechImportBusy") || "Lettura…"
            : tt("tests.isokinetic.easytechImportPickPdf") || "Scegli PDF…"}
        </button>
        {loadedSourceLabels.length > 0 ? (
          <span style={{ fontSize: 12, color: "#475569", maxWidth: 360 }} title={loadedSourceLabels.join("\n")}>
            {loadedSourceLabels.length > 2
              ? tt("tests.isokinetic.easytechImportLoadedFilesCount")
                  .replace("{n}", String(loadedSourceLabels.length))
              : loadedSourceLabels.join(" · ")}
          </span>
        ) : busy && progress?.multiFileName ? (
          <span style={{ fontSize: 12, color: "#475569" }}>{progress.multiFileName}</span>
        ) : null}
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          multiple
          onChange={handleFile}
          style={{ display: "none" }}
        />
      </div>

      <p style={{ margin: "0 0 10px", fontSize: 11, color: "#64748b" }}>
        {tt("tests.isokinetic.easytechImportHint") ||
          "PDF referto Easytech con testo selezionabile (stampa in PDF)."}
      </p>

      {busy && progress ? (
        <ProgressBar pct={progressPct} progress={progress} tt={tt} />
      ) : null}

      {error ? (
        <div
          style={{
            margin: "8px 0",
            padding: "6px 10px",
            background: "#fee2e2",
            border: "1px solid #fecaca",
            color: "#991b1b",
            fontSize: 12,
            borderRadius: 6,
          }}
        >
          {error}
        </div>
      ) : null}

      {pages.length > 0 ? (
        <>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 12,
              alignItems: "center",
              padding: "8px 10px",
              background: "#fff",
              border: "1px solid #e2e8f0",
              borderRadius: 8,
              margin: "10px 0",
            }}
          >
            <div style={{ fontSize: 12, color: "#0f172a", fontWeight: 600 }}>
              {tt("tests.isokinetic.easytechImportSummary")
                .replace("{ready}", String(summary.ready))
                .replace("{total}", String(summary.total))}
            </div>
            <button
              type="button"
              onClick={importAll}
              disabled={busy || summary.ready === 0}
              style={{
                padding: "6px 12px",
                fontSize: 12,
                background: "#0ea5e9",
                color: "#fff",
                border: "1px solid #0284c7",
                borderRadius: 6,
              }}
            >
              {tt("tests.isokinetic.easytechImportAll")}
            </button>
            <button
              type="button"
              onClick={reset}
              disabled={busy}
              style={{
                padding: "6px 12px",
                fontSize: 12,
                background: "#fff",
                color: "#0f172a",
                border: "1px solid #cbd5e1",
                borderRadius: 6,
              }}
            >
              {tt("tests.isokinetic.easytechImportReset")}
            </button>
          </div>

          {pages.map((p, idx) => (
            <PageCard
              key={`${p.sourceRunId ?? 0}-${p.sourceFileIndex ?? 0}-${p.pageNumber}-${p.sectionIndex ?? 0}-${idx}`}
              page={p}
              tt={tt}
              showSourceFile={showPageSourceFile}
              overwrites={computePageOverwrites(p, iso)}
              onUpdateField={(column, jsonKey, raw) =>
                updatePageField(idx, column, jsonKey, raw)
              }
              onSetSpeed={(s) => setPageSpeed(idx, s)}
              onSwap={() => swapPageSides(idx)}
              onSetSide={(col, side) => setColumnSide(idx, col, side)}
              onImport={() => importPage(idx)}
              onRemove={() => removePage(idx)}
            />
          ))}
        </>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function ProgressBar({ pct, progress, tt }) {
  const phaseKey =
    progress?.phase === "ocr"
      ? "easytechImportProgressOcr"
      : progress?.phase === "charts"
        ? "easytechImportProgressCharts"
        : progress?.phase === "render"
          ? "easytechImportProgressRender"
          : "easytechImportProgressInit";
  const phaseLabel = tt(`tests.isokinetic.${phaseKey}`);
  const display = pct == null ? "…" : `${pct}%`;
  return (
    <div style={{ margin: "8px 0" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 11,
          color: "#475569",
          marginBottom: 3,
        }}
      >
        <span>
          {phaseLabel}
          {progress?.multiFileTotal > 1 && progress?.multiFileName ? (
            <>
              {" — "}
              {tt("tests.isokinetic.easytechImportProgressFile")
                .replace("{n}", String(progress.multiFileIndex || 1))
                .replace("{total}", String(progress.multiFileTotal))
                .replace("{name}", String(progress.multiFileName))}
            </>
          ) : null}
          {progress?.totalPages ? (
            <>
              {" — "}
              {tt("tests.isokinetic.easytechImportProgressPage")
                .replace("{n}", String(progress.page || 0))
                .replace("{total}", String(progress.totalPages))}
            </>
          ) : null}
        </span>
        <span>{display}</span>
      </div>
      <div
        style={{
          width: "100%",
          height: 6,
          background: "#e2e8f0",
          borderRadius: 999,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${pct ?? 5}%`,
            height: "100%",
            background: "#0ea5e9",
            transition: "width 200ms",
          }}
        />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function PageCard({
  page,
  tt,
  showSourceFile,
  overwrites,
  onUpdateField,
  onSetSpeed,
  onSwap,
  onSetSide,
  onImport,
  onRemove,
}) {
  const m1 = page.measurements?.find((m) => m.column === 1);
  const m2 = page.measurements?.find((m) => m.column === 2);
  const sideMap = page.uiSideMap || {};
  const speed = page.uiSpeed ?? "";
  const ow1 = overwrites?.[1] || {};
  const ow2 = overwrites?.[2] || {};

  return (
    <div
      style={{
        border: "1px solid #e2e8f0",
        borderRadius: 10,
        padding: "10px 12px",
        background: "#fff",
        marginBottom: 12,
      }}
    >
      <div style={{ marginBottom: 10 }}>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 12,
            alignItems: "center",
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 13, color: "#0f172a" }}>
            {page.sectionCount != null && page.sectionCount > 1
              ? tt("tests.isokinetic.easytechImportPageTitleSection")
                  .replace("{page}", String(page.pageNumber))
                  .replace("{section}", String(page.sectionIndex ?? 1))
                  .replace("{sections}", String(page.sectionCount))
              : tt("tests.isokinetic.easytechImportPageTitle").replace(
                  "{n}",
                  String(page.pageNumber)
                )}
          </div>
          <span
            style={{
              fontSize: 11,
              padding: "2px 8px",
              borderRadius: 999,
              background:
                page.status === "OK"
                  ? "#dcfce7"
                  : page.status === "TABLE_NOT_FOUND" ||
                    page.status === "GRID_NOT_FOUND"
                  ? "#fef9c3"
                  : "#fee2e2",
              color:
                page.status === "OK"
                  ? "#166534"
                  : page.status === "TABLE_NOT_FOUND" ||
                    page.status === "GRID_NOT_FOUND"
                  ? "#854d0e"
                  : "#991b1b",
              border: "1px solid currentColor",
            }}
          >
            {page.status}
          </span>
          {page.imported ? (
            <span
              style={{
                fontSize: 11,
                padding: "2px 8px",
                borderRadius: 999,
                background: "#e0f2fe",
                color: "#0369a1",
                border: "1px solid #38bdf8",
              }}
            >
              {tt("tests.isokinetic.easytechImportImportedBadge")}
            </span>
          ) : null}
          <button
            type="button"
            onClick={onRemove}
            title={tt("tests.isokinetic.easytechImportRemovePage")}
            style={{
              marginLeft: "auto",
              padding: "3px 8px",
              fontSize: 11,
              background: "#fff",
              color: "#b91c1c",
              border: "1px solid #fecaca",
              borderRadius: 6,
              cursor: "pointer",
            }}
          >
            {tt("tests.isokinetic.easytechImportRemovePage")}
          </button>
        </div>
        {showSourceFile && page.sourceFileName ? (
          <div
            style={{
              fontSize: 10,
              color: "#64748b",
              marginTop: 4,
              wordBreak: "break-all",
            }}
            title={page.sourceFileName}
          >
            {tt("tests.isokinetic.easytechImportPageSourceFile").replace(
              "{file}",
              String(page.sourceFileName)
            )}
          </div>
        ) : null}
      </div>

      {page.status !== "OK" ? (
        <div
          style={{
            padding: "8px 10px",
            background: "#fef9c3",
            border: "1px solid #fde68a",
            color: "#854d0e",
            fontSize: 12,
            borderRadius: 6,
          }}
        >
          {page.status === "TABLE_NOT_FOUND"
            ? tt("tests.isokinetic.easytechImportTableNotFound") ||
              tt("tests.isokinetic.easytechImportPageError")
            : page.message ||
              tt("tests.isokinetic.easytechImportPageError")}
        </div>
      ) : null}

      {page.status === "OK" ? (
        <>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 12,
              alignItems: "center",
              marginBottom: 8,
              padding: "6px 8px",
              background: "#f8fafc",
              borderRadius: 6,
            }}
          >
            <label style={{ fontSize: 11 }}>
              <strong>
                {tt("tests.isokinetic.easytechImportSpeedLabel")}
              </strong>{" "}
              <select
                value={String(speed || "")}
                onChange={(e) =>
                  onSetSpeed(e.target.value ? Number(e.target.value) : null)
                }
                style={{ marginLeft: 4, fontSize: 11, padding: "2px 4px" }}
              >
                <option value="">--</option>
                <option value="60">60°/s</option>
                <option value="180">180°/s</option>
                <option value="300">300°/s</option>
              </select>
            </label>
            <label style={{ fontSize: 11 }}>
              <strong>
                {tt("tests.isokinetic.easytechImportCol1SideLabel")}
              </strong>{" "}
              <select
                value={sideMap.col1 || ""}
                onChange={(e) => onSetSide(1, e.target.value)}
                style={{ marginLeft: 4, fontSize: 11, padding: "2px 4px" }}
              >
                <option value="">--</option>
                <option value="right">
                  {tt("tests.isokinetic.blockRight")}
                </option>
                <option value="left">
                  {tt("tests.isokinetic.blockLeft")}
                </option>
              </select>
            </label>
            <label style={{ fontSize: 11 }}>
              <strong>
                {tt("tests.isokinetic.easytechImportCol2SideLabel")}
              </strong>{" "}
              <select
                value={sideMap.col2 || ""}
                onChange={(e) => onSetSide(2, e.target.value)}
                style={{ marginLeft: 4, fontSize: 11, padding: "2px 4px" }}
              >
                <option value="">--</option>
                <option value="right">
                  {tt("tests.isokinetic.blockRight")}
                </option>
                <option value="left">
                  {tt("tests.isokinetic.blockLeft")}
                </option>
              </select>
            </label>
            <button
              type="button"
              onClick={onSwap}
              style={{ padding: "4px 8px", fontSize: 11 }}
            >
              {tt("tests.isokinetic.easytechImportSwapSides")}
            </button>
            <button
              type="button"
              onClick={onImport}
              style={{
                padding: "4px 10px",
                fontSize: 12,
                background: "#22c55e",
                color: "#fff",
                border: "1px solid #16a34a",
                borderRadius: 6,
                marginLeft: "auto",
              }}
            >
              {tt("tests.isokinetic.easytechImportApplyOne")}
            </button>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                borderCollapse: "collapse",
                width: "100%",
                tableLayout: "fixed",
                fontSize: 11,
              }}
            >
              <colgroup>
                <col style={{ width: "30%" }} />
                <col />
                <col />
              </colgroup>
              <thead>
                <tr style={{ background: "#f1f5f9" }}>
                  <th style={cellHead}>
                    {tt("tests.isokinetic.easytechImportField")}
                  </th>
                  <th style={cellHead}>
                    {tt("tests.isokinetic.easytechImportColumn")} 1
                  </th>
                  <th style={cellHead}>
                    {tt("tests.isokinetic.easytechImportColumn")} 2
                  </th>
                </tr>
              </thead>
              <tbody>
                {EASYTECH_FIELD_RULES.map((rule) => {
                  const f1 = m1?.fields?.[rule.jsonKey];
                  const f2 = m2?.fields?.[rule.jsonKey];
                  const isTarget = EASYTECH_TARGET_FIELDS.has(rule.jsonKey);
                  return (
                    <tr key={rule.jsonKey}>
                      <td
                        style={{
                          ...cellLabel,
                          fontWeight: isTarget ? 700 : 500,
                          color: isTarget ? "#0f172a" : "#475569",
                        }}
                        title={rule.label}
                      >
                        {rule.label}
                      </td>
                      <FieldCell
                        field={f1}
                        overwrite={ow1[rule.jsonKey] ?? null}
                        tt={tt}
                        onChange={(v) => onUpdateField(1, rule.jsonKey, v)}
                      />
                      <FieldCell
                        field={f2}
                        overwrite={ow2[rule.jsonKey] ?? null}
                        tt={tt}
                        onChange={(v) => onUpdateField(2, rule.jsonKey, v)}
                      />
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */

/** Valore mostrato negli input testo (mai array grezzo → evita crash React). */
function fieldValueToString(v) {
  if (v == null || v === "") return "";
  if (Array.isArray(v)) {
    if (v.length === 3) {
      return v.map((x) => (x == null ? "" : String(x))).join(" ");
    }
    return v
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
  if (typeof v === "object") return "";
  return String(v);
}

function FieldCell({ field, overwrite, tt, onChange }) {
  const valid = field?.valid;
  const valueRaw = field?.value ?? "";
  const raw = field?.raw ?? "";
  const display = valid ? fieldValueToString(valueRaw) : fieldValueToString(raw);
  const message = field?.message || "";
  const isOverwrite = Boolean(valid && overwrite);

  let borderColor;
  let background;
  let textColor;
  if (!valid) {
    borderColor = "#fca5a5";
    background = "#fef2f2";
    textColor = "#991b1b";
  } else if (isOverwrite) {
    borderColor = "#f59e0b";
    background = "#fffbeb";
    textColor = "#92400e";
  } else {
    borderColor = "#86efac";
    background = "#f0fdf4";
    textColor = "#065f46";
  }

  const overwriteText =
    isOverwrite && tt
      ? tt("tests.isokinetic.easytechImportOverwrite").replace(
          "{value}",
          String(overwrite)
        )
      : "";

  return (
    <td style={{ padding: 2, border: "1px solid #e5e7eb" }}>
      <input
        type="text"
        value={display}
        onChange={(e) => onChange(e.target.value)}
        title={message || overwriteText || (valid ? "" : "Invalid")}
        style={{
          width: "100%",
          boxSizing: "border-box",
          padding: "3px 5px",
          fontSize: 11,
          fontFamily: "ui-monospace, monospace",
          border: `2px solid ${borderColor}`,
          borderRadius: 4,
          background,
          color: textColor,
        }}
      />
      {!valid && message ? (
        <div
          style={{
            fontSize: 9,
            color: "#991b1b",
            marginTop: 2,
            paddingLeft: 4,
            lineHeight: 1.2,
          }}
          title={message}
        >
          {message.length > 60 ? `${message.slice(0, 57)}…` : message}
        </div>
      ) : null}
      {isOverwrite ? (
        <div
          style={{
            fontSize: 9,
            color: "#92400e",
            marginTop: 2,
            paddingLeft: 4,
            lineHeight: 1.2,
          }}
          title={overwriteText}
        >
          {overwriteText.length > 60
            ? `${overwriteText.slice(0, 57)}…`
            : overwriteText}
        </div>
      ) : null}
    </td>
  );
}

const cellHead = {
  border: "1px solid #cbd5e1",
  padding: "4px 6px",
  fontWeight: 700,
  fontSize: 11,
  textAlign: "left",
};
const cellLabel = {
  border: "1px solid #e2e8f0",
  padding: "3px 6px",
  fontSize: 11,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

/* -------------------------------------------------------------------------- */
/*  Helpers per inferenza iniziale di velocità e mappatura lati                */
/* -------------------------------------------------------------------------- */

function guessSpeedFromPage(page, fallback = null) {
  const m1 = page.measurements?.find((m) => m.column === 1);
  const m2 = page.measurements?.find((m) => m.column === 2);
  const candidates = [m1?.fields?.vitesseExtFlex, m2?.fields?.vitesseExtFlex];
  for (const c of candidates) {
    if (!c) continue;
    const src = c.valid ? c.value : c.raw;
    const m = String(src || "").match(/(\d+)/);
    if (m) {
      const n = Number(m[1]);
      if ([60, 180, 300].includes(n)) return n;
    }
  }
  return fallback;
}

function guessSideMapFromPage(page, fallback = {}) {
  const m1 = page.measurements?.find((m) => m.column === 1);
  const m2 = page.measurements?.find((m) => m.column === 2);
  function side(f) {
    if (!f) return null;
    const u = String(f.valid ? f.value : f.raw || "").toUpperCase();
    if (u.includes("DROITE")) return "right";
    if (u.includes("GAUCHE")) return "left";
    return null;
  }
  return {
    col1: side(m1?.fields?.cote) ?? fallback.col1 ?? null,
    col2: side(m2?.fields?.cote) ?? fallback.col2 ?? null,
  };
}

/* -------------------------------------------------------------------------- */
/*  Calcolo overwrite per la preview                                          */
/* -------------------------------------------------------------------------- */

/**
 * Mappa fra chiave Easytech e campi della riga isocinetica.
 *
 * - `pair` significa che la cella "X/Y" alimenta due campi distinti
 *   (estensione + flessione), inclusi romExt / romFlex da «Angle de mouvement
 *   maximal».
 *
 * Solo le chiavi presenti qui finiscono effettivamente nella tabella
 * isocinetica e quindi possono "sovrascrivere" valori esistenti.
 */
const ISO_OVERWRITE_MAP = {
  coupleMaximal: { kind: "pair", ext: "ptExt", flex: "ptFlex" },
  angleAtCM: { kind: "pair", ext: "anglePtExt", flex: "anglePtFlex" },
  totTravail: { kind: "pair", ext: "workExt", flex: "workFlex" },
  angleMouvementMaximal: { kind: "pair", ext: "romExt", flex: "romFlex" },
};

function parsePairInts(s) {
  if (!s) return [null, null];
  const m = String(s).match(/(-?\d+)\s*\/\s*(-?\d+)/);
  if (!m) return [null, null];
  const a = Number(m[1]);
  const b = Number(m[2]);
  return [Number.isFinite(a) ? a : null, Number.isFinite(b) ? b : null];
}

function hasExistingValue(v) {
  return v != null && String(v).trim() !== "";
}

/**
 * Per una singola cella (rule × column) determina se l'import sovrascriverebbe
 * un valore esistente nella tabella isocinetica.
 *
 * Ritorna:
 *  - `null` se non c'è impatto (cella non mappata, non valida, velocità/lato
 *    mancanti, oppure nessun valore esistente verrebbe modificato),
 *  - una stringa con il valore (o coppia "ext/flex") attualmente in tabella,
 *    da mostrare nel tag "Sovrascrive '…'".
 */
function computeCellOverwrite(rule, field, side, speed, iso) {
  if (!iso || !speed || !side) return null;
  const mapping = ISO_OVERWRITE_MAP[rule.jsonKey];
  if (!mapping) return null;
  if (!field || !field.valid) return null;

  const rows = iso.rows || [];
  const rowIdx = rows.findIndex((r) => Number(r.speed) === Number(speed));
  if (rowIdx < 0) return null;
  const existing = rows[rowIdx]?.[side] || {};

  let newExt = "";
  let newFlex = "";
  const [ext, flex] = parsePairInts(field.value);
  if (ext != null) newExt = String(ext);
  if (flex != null) newFlex = String(flex);

  const curExt = existing[mapping.ext];
  const curFlex = existing[mapping.flex];
  const hasCurExt = hasExistingValue(curExt);
  const hasCurFlex = hasExistingValue(curFlex);

  const overwritesExt =
    newExt !== "" && hasCurExt && String(curExt) !== newExt;
  const overwritesFlex =
    newFlex !== "" && hasCurFlex && String(curFlex) !== newFlex;
  if (!overwritesExt && !overwritesFlex) return null;

  const e = hasCurExt ? String(curExt) : "—";
  const f = hasCurFlex ? String(curFlex) : "—";
  return `${e}/${f}`;
}

/**
 * Per una pagina del PDF restituisce le sovrascritture per colonna:
 *   { 1: { [jsonKey]: "existing display" }, 2: { ... } }
 *
 * Le chiavi non presenti significano che quella cella non sovrascrive nulla.
 */
function computePageOverwrites(page, iso) {
  const out = { 1: {}, 2: {} };
  if (!iso || !page) return out;
  const speed = page.uiSpeed ?? null;
  const sideMap = page.uiSideMap || {};
  for (const col of [1, 2]) {
    const side = sideMap[`col${col}`];
    if (!side || !speed) continue;
    const meas = (page.measurements || []).find((m) => m.column === col);
    if (!meas) continue;
    for (const rule of EASYTECH_FIELD_RULES) {
      const mapping = ISO_OVERWRITE_MAP[rule.jsonKey];
      if (!mapping) continue;
      const field = meas.fields?.[rule.jsonKey];
      const ow = computeCellOverwrite(rule, field, side, speed, iso);
      if (ow !== null) out[col][rule.jsonKey] = ow;
    }
  }
  return out;
}

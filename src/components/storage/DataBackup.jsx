import { useRef } from "react";

export default function DataBackup({ patients, setPatients, compact }) {
  const importInputRef = useRef(null);
  function exportData() {
    const data = {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      patients,
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = `physiocare-backup-${new Date()
      .toISOString()
      .split("T")[0]}.json`;

    a.click();
    URL.revokeObjectURL(url);
  }

  function importData(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);

        if (!parsed.patients || !Array.isArray(parsed.patients)) {
          alert("File non valido: pazienti mancanti.");
          return;
        }

        const confirmImport = confirm(
          "Importare questo backup? Sostituirà i dati attuali."
        );

        if (!confirmImport) return;

        setPatients(parsed.patients);
        alert("Backup importato correttamente.");
      } catch {
        alert("Errore: file JSON non valido.");
      }
    };

    reader.readAsText(file);
  }

  const wrapStyle = compact
    ? {
        margin: 0,
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "flex-end",
        gap: 6,
      }
    : { marginTop: 10, marginBottom: 10 };

  return (
    <div className="data-backup-toolbar" style={wrapStyle}>
      <button type="button" onClick={exportData}>
        Esporta dati JSON
      </button>

      <button
        type="button"
        onClick={() => importInputRef.current?.click()}
      >
        Importa dati JSON
      </button>

      <input
        ref={importInputRef}
        type="file"
        accept="application/json"
        onChange={importData}
        style={{ display: "none" }}
        tabIndex={-1}
      />
    </div>
  );
}
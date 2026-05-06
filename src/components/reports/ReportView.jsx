export default function ReportView({ patient, evaluation }) {
  if (!patient || !evaluation) return null;

  return (
    <div id="report" style={{ padding: 20, fontFamily: "Arial" }}>
      <h2>
        {patient.nome} {patient.cognome}
      </h2>

      <p>
        Valutazione {evaluation.numeroValutazione} — Sessione {evaluation.sessione}
      </p>

      {evaluation.distretti.map((d) => (
        <div key={d.id} style={{ marginTop: 10 }}>
          <strong>{d.nome}</strong>

          <table border="1" style={{ width: "100%", marginTop: 5 }}>
            <tbody>
              <tr>
                <td>Forza</td>
                <td>{d.sinistro?.forza}</td>
                <td>{d.destro?.forza}</td>
              </tr>
              <tr>
                <td>Funzione</td>
                <td>{d.sinistro?.funzione}</td>
                <td>{d.destro?.funzione}</td>
              </tr>
              <tr>
                <td>Qualità movimento</td>
                <td>{d.sinistro?.qualitaMovimento}</td>
                <td>{d.destro?.qualitaMovimento}</td>
              </tr>
              <tr>
                <td>VAS</td>
                <td>{d.dolore?.riposo}</td>
                <td>{d.dolore?.mattino}</td>
                <td>{d.dolore?.sera}</td>
              </tr>
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
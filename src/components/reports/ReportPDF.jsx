import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 20 },
  title: { fontSize: 18, marginBottom: 10 },
  section: { marginBottom: 10 },
});

export default function ReportPDF({ patient, evaluation }) {
  if (!patient || !evaluation) return null;

  return (
    <Document>
      <Page style={styles.page}>
        <Text style={styles.title}>
          {patient.nome} {patient.cognome}
        </Text>

        <Text>
          Valutazione {evaluation.numeroValutazione} — Sessione {evaluation.sessione}
        </Text>

        {evaluation.distretti.map((d) => (
          <View key={d.id} style={styles.section}>
            <Text>{d.nome}</Text>

            <Text>
              Forza DX: {d.destro.forza} | SX: {d.sinistro.forza}
            </Text>

            <Text>
              Funzione DX: {d.destro.funzione} | SX: {d.sinistro.funzione}
            </Text>

            <Text>
              VAS: {d.dolore?.riposo} / {d.dolore?.mattino} / {d.dolore?.sera}
            </Text>
          </View>
        ))}
      </Page>
    </Document>
  );
}
import { PDFDownloadLink, Document, Page, Text } from "@react-pdf/renderer";

function TestDocument() {
  return (
    <Document>
      <Page>
        <Text>Test PDF Physiocare Nyon</Text>
      </Page>
    </Document>
  );
}

export default function PDFTest() {
  return (
    <div style={{ marginTop: 10, marginBottom: 10 }}>
      <PDFDownloadLink
        document={<TestDocument />}
        fileName="test-physiocare.pdf"
      >
        {({ loading }) => (loading ? "Preparazione PDF..." : "Scarica PDF test")}
      </PDFDownloadLink>
    </div>
  );
}
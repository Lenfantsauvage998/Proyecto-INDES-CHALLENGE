import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import type { Certificate } from './CertificateTable';
import logoUrl from '../assets/unisabana_logo.png';

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 50,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 40,
    alignItems: 'center',
  },
  logo: {
    width: 250,
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#002B5C',
    fontFamily: 'Helvetica-Bold',
  },
  certificationText: {
    fontSize: 12,
    lineHeight: 1.6,
    textAlign: 'justify',
    marginBottom: 30,
    color: '#333333',
  },
  boldText: {
    fontFamily: 'Helvetica-Bold',
  },
  table: {
    display: 'flex',
    flexDirection: 'column',
    width: 'auto',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#bfbfbf',
    marginBottom: 30,
  },
  tableRow: {
    flexDirection: 'row',
  },
  tableHeader: {
    backgroundColor: '#f2f2f2',
    borderBottomWidth: 1,
    borderBottomColor: '#bfbfbf',
  },
  tableCol1: {
    width: '25%',
    borderStyle: 'solid',
    borderRightWidth: 1,
    borderRightColor: '#bfbfbf',
    padding: 8,
  },
  tableCol2: {
    width: '55%',
    borderStyle: 'solid',
    borderRightWidth: 1,
    borderRightColor: '#bfbfbf',
    padding: 8,
  },
  tableCol3: {
    width: '20%',
    padding: 8,
  },
  tableCellHeader: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#333333',
  },
  tableCell: {
    fontSize: 10,
    color: '#444444',
  },
  tableRowContent: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#bfbfbf',
  },
  tableRowContentLast: {
    flexDirection: 'row',
  },
  footer: {
    position: 'absolute',
    bottom: 50,
    left: 50,
    right: 50,
    textAlign: 'center',
    fontSize: 10,
    color: '#888888',
    borderTopWidth: 1,
    borderTopColor: '#eeeeee',
    paddingTop: 10,
  }
});

interface CertificatePDFProps {
  data: Certificate[];
  profesorName: string;
}

export const CertificatePDF: React.FC<CertificatePDFProps> = ({ data, profesorName }) => {
  const totalHoras = data.reduce((acc, curr) => acc + curr.horas_semestre, 0);
  const formattedDate = new Date().toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.header}>
          <Image src={logoUrl} style={styles.logo} />
        </View>

        <Text style={styles.title}>Certificado de Docencia</Text>
        
        <Text style={styles.certificationText}>
          La Universidad de la Sabana certifica que el/la docente <Text style={styles.boldText}>{profesorName.toUpperCase()}</Text> ha impartido las siguientes asignaturas, cumpliendo con las horas establecidas durante los periodos académicos indicados a continuación.
        </Text>

        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableHeader]}>
            <View style={styles.tableCol1}>
              <Text style={styles.tableCellHeader}>Semestre</Text>
            </View>
            <View style={styles.tableCol2}>
              <Text style={styles.tableCellHeader}>Asignatura</Text>
            </View>
            <View style={styles.tableCol3}>
              <Text style={styles.tableCellHeader}>Horas</Text>
            </View>
          </View>
          
          {data.map((row, index) => (
            <View key={index} style={index === data.length - 1 ? styles.tableRowContentLast : styles.tableRowContent}>
              <View style={styles.tableCol1}>
                <Text style={styles.tableCell}>{row.ciclo_lectivo}</Text>
              </View>
              <View style={styles.tableCol2}>
                <Text style={styles.tableCell}>{row.nombre_curso || row.materia}</Text>
              </View>
              <View style={styles.tableCol3}>
                <Text style={styles.tableCell}>{row.horas_semestre}</Text>
              </View>
            </View>
          ))}
          
          <View style={[styles.tableRow, { backgroundColor: '#f9f9f9', borderTopWidth: 1, borderTopColor: '#bfbfbf' }]}>
            <View style={[styles.tableCol1, { width: '80%', borderRightWidth: 0, paddingRight: 15, alignItems: 'flex-end' }]}>
              <Text style={styles.tableCellHeader}>Total Horas:</Text>
            </View>
            <View style={[styles.tableCol3, { width: '20%' }]}>
              <Text style={styles.tableCellHeader}>{totalHoras}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.certificationText}>
          Se expide el presente certificado a solicitud del interesado para los fines que estime convenientes, a los {formattedDate}.
        </Text>

        <View style={styles.footer}>
          <Text>Facultad de Ingeniería · Universidad de La Sabana</Text>
          <Text>Documento generado automáticamente</Text>
        </View>
      </Page>
    </Document>
  );
};

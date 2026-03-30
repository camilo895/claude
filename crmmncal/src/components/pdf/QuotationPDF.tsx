import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica" },
  header: { marginBottom: 20, borderBottom: "2px solid #1e40af", paddingBottom: 15 },
  title: { fontSize: 22, fontWeight: "bold", color: "#1e40af" },
  subtitle: { fontSize: 10, color: "#6b7280", marginTop: 4 },
  section: { marginBottom: 15 },
  sectionTitle: { fontSize: 12, fontWeight: "bold", color: "#1f2937", marginBottom: 8, backgroundColor: "#f3f4f6", padding: 6 },
  row: { flexDirection: "row", justifyContent: "space-between" },
  label: { fontSize: 9, color: "#6b7280" },
  value: { fontSize: 10, fontWeight: "bold" },
  table: { marginTop: 5 },
  tableHeader: { flexDirection: "row", backgroundColor: "#1e40af", padding: 6, color: "white" },
  tableHeaderText: { fontWeight: "bold", fontSize: 9, color: "white" },
  tableRow: { flexDirection: "row", padding: 6, borderBottom: "1px solid #e5e7eb" },
  tableRowAlt: { flexDirection: "row", padding: 6, borderBottom: "1px solid #e5e7eb", backgroundColor: "#f9fafb" },
  col1: { width: "8%" },
  col2: { width: "25%" },
  col3: { width: "22%" },
  col4: { width: "10%", textAlign: "right" },
  col5: { width: "15%", textAlign: "right" },
  col6: { width: "20%", textAlign: "right" },
  totalRow: { flexDirection: "row", justifyContent: "flex-end", marginTop: 10, padding: 10, backgroundColor: "#1e40af", borderRadius: 4 },
  totalLabel: { fontSize: 12, color: "white", marginRight: 20 },
  totalValue: { fontSize: 14, fontWeight: "bold", color: "white" },
  footer: { position: "absolute", bottom: 30, left: 40, right: 40, borderTop: "1px solid #e5e7eb", paddingTop: 10 },
  footerText: { fontSize: 8, color: "#9ca3af", textAlign: "center" },
  infoGrid: { flexDirection: "row", gap: 20 },
  infoBlock: { flex: 1 },
  badge: { backgroundColor: "#dbeafe", color: "#1e40af", padding: "3 8", borderRadius: 4, fontSize: 9, fontWeight: "bold" },
  notes: { backgroundColor: "#fefce8", padding: 10, borderRadius: 4, marginTop: 10 },
  notesText: { fontSize: 9, color: "#854d0e" },
});

function formatBRL(value: number): string {
  return `R$ ${value.toFixed(2).replace(".", ",")}`;
}

function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString("pt-BR");
}

interface QuotationData {
  number: number;
  status: string;
  marketType: string;
  totalPrice: number;
  totalCost: number;
  marginAvg: number;
  notes: string | null;
  validUntil: string | Date | null;
  createdAt: string | Date;
  customer: {
    name: string;
    cnpj: string | null;
    phone: string | null;
    email: string | null;
    state: string;
    city: string | null;
    address: string | null;
  };
  seller: { name: string | null; email: string | null };
  items: Array<{
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    margin: number;
    product: { code: string; description: string | null };
  }>;
}

export function QuotationPDF({ quotation }: { quotation: QuotationData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.row}>
            <View>
              <Text style={styles.title}>Mancal Matão</Text>
              <Text style={styles.subtitle}>Distribuição de Mancais e Rolamentos</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={{ fontSize: 14, fontWeight: "bold", color: "#1f2937" }}>
                COTAÇÃO #{quotation.number}
              </Text>
              <Text style={styles.label}>
                Data: {formatDate(quotation.createdAt)}
              </Text>
              {quotation.validUntil && (
                <Text style={styles.label}>
                  Validade: {formatDate(quotation.validUntil)}
                </Text>
              )}
              <Text style={styles.badge}>
                {quotation.marketType === "EXPORTACAO" ? "EXPORTAÇÃO" : "MERCADO INTERNO"}
              </Text>
            </View>
          </View>
        </View>

        {/* Info */}
        <View style={styles.section}>
          <View style={styles.infoGrid}>
            <View style={styles.infoBlock}>
              <Text style={styles.sectionTitle}>Cliente</Text>
              <Text style={styles.value}>{quotation.customer.name}</Text>
              {quotation.customer.cnpj && (
                <Text style={styles.label}>CNPJ: {quotation.customer.cnpj}</Text>
              )}
              {quotation.customer.phone && (
                <Text style={styles.label}>Tel: {quotation.customer.phone}</Text>
              )}
              {quotation.customer.email && (
                <Text style={styles.label}>Email: {quotation.customer.email}</Text>
              )}
              <Text style={styles.label}>
                {quotation.customer.city ? `${quotation.customer.city} - ` : ""}
                {quotation.customer.state}
              </Text>
            </View>
            <View style={styles.infoBlock}>
              <Text style={styles.sectionTitle}>Vendedor</Text>
              <Text style={styles.value}>{quotation.seller.name ?? "—"}</Text>
              {quotation.seller.email && (
                <Text style={styles.label}>{quotation.seller.email}</Text>
              )}
            </View>
          </View>
        </View>

        {/* Items table */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Itens da Cotação</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, styles.col1]}>#</Text>
              <Text style={[styles.tableHeaderText, styles.col2]}>Código</Text>
              <Text style={[styles.tableHeaderText, styles.col3]}>Descrição</Text>
              <Text style={[styles.tableHeaderText, styles.col4]}>Qtd</Text>
              <Text style={[styles.tableHeaderText, styles.col5]}>Preço Unit.</Text>
              <Text style={[styles.tableHeaderText, styles.col6]}>Total</Text>
            </View>
            {quotation.items.map((item, idx) => (
              <View key={idx} style={idx % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
                <Text style={styles.col1}>{idx + 1}</Text>
                <Text style={[styles.col2, { fontWeight: "bold" }]}>{item.product.code}</Text>
                <Text style={styles.col3}>{item.product.description ?? "—"}</Text>
                <Text style={styles.col4}>{item.quantity}</Text>
                <Text style={styles.col5}>{formatBRL(item.unitPrice)}</Text>
                <Text style={[styles.col6, { fontWeight: "bold" }]}>{formatBRL(item.totalPrice)}</Text>
              </View>
            ))}
          </View>

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>TOTAL:</Text>
            <Text style={styles.totalValue}>{formatBRL(quotation.totalPrice)}</Text>
          </View>
        </View>

        {/* Notes */}
        {quotation.notes && (
          <View style={styles.notes}>
            <Text style={{ fontSize: 9, fontWeight: "bold", color: "#854d0e", marginBottom: 3 }}>
              Observações:
            </Text>
            <Text style={styles.notesText}>{quotation.notes}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Mancal Matão — Distribuição de Mancais e Rolamentos
          </Text>
          <Text style={styles.footerText}>
            Cotação #{quotation.number} — Gerada em {formatDate(quotation.createdAt)} — CRM Mancal
          </Text>
        </View>
      </Page>
    </Document>
  );
}

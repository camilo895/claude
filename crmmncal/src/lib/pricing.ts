import { TaxRegion } from "./regions";

interface PriceCalculationInput {
  costPrice: number;
  margin: number; // em percentual (ex: 20 = 20%)
  taxSP: number;
  taxSulSudeste: number;
  taxNNECOES: number;
  conversionFactor?: number; // 100 = mercado interno, ajustável para exportação
}

interface PriceResult {
  unitPrice: number;
  taxRate: number;
  marginAmount: number;
}

export function calculatePrice(
  input: PriceCalculationInput,
  region: TaxRegion
): PriceResult {
  const { costPrice, margin, conversionFactor = 100 } = input;

  const rawTaxRate =
    region === "SP"
      ? input.taxSP
      : region === "SUL_SUDESTE"
        ? input.taxSulSudeste
        : input.taxNNECOES;

  // Normaliza: se o imposto foi salvo como decimal (ex: 0.091204), converte para % (9.1204)
  const taxRate = rawTaxRate < 1 ? rawTaxRate * 100 : rawTaxRate;

  // Fórmula: Fator = (100 - Margem - Imposto) / 100
  // Preço = Custo / Fator
  // Ex: Custo=379,64 / (100-15-9,12)/100 = 379,64/0,7588 = 500,32
  const baseFactor = (100 - margin - taxRate) / 100;

  // Fator de conversão para exportação (padrão 100 = mercado interno)
  const exportFactor = conversionFactor / 100;

  const unitPrice = baseFactor > 0 ? (costPrice / baseFactor) * exportFactor : 0;
  const marginAmount = unitPrice - costPrice * exportFactor;

  return {
    unitPrice: Math.round(unitPrice * 100) / 100,
    taxRate,
    marginAmount: Math.round(marginAmount * 100) / 100,
  };
}

export function calculateMarginPercent(
  costPrice: number,
  sellingPrice: number
): number {
  if (costPrice === 0) return 0;
  return Math.round(((sellingPrice / costPrice - 1) * 100) * 100) / 100;
}

export function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

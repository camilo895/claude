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

  const taxRate =
    region === "SP"
      ? input.taxSP
      : region === "SUL_SUDESTE"
        ? input.taxSulSudeste
        : input.taxNNECOES;

  const factor = conversionFactor / 100;
  const priceWithMargin = costPrice * (1 + margin / 100);
  const unitPrice = priceWithMargin * (1 + taxRate / 100) * factor;
  const marginAmount = unitPrice - costPrice * factor;

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

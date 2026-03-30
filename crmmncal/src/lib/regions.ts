// Mapeamento de estados brasileiros para regiões tributárias
// Baseado na tabela de preços da Mancal Matão

export type TaxRegion = "SP" | "SUL_SUDESTE" | "N_NE_CO_ES";

const STATE_REGIONS: Record<string, TaxRegion> = {
  // São Paulo
  SP: "SP",
  // Sul e Sudeste (exceto SP e ES)
  PR: "SUL_SUDESTE",
  SC: "SUL_SUDESTE",
  RS: "SUL_SUDESTE",
  MG: "SUL_SUDESTE",
  RJ: "SUL_SUDESTE",
  // Norte, Nordeste, Centro-Oeste e ES
  ES: "N_NE_CO_ES",
  AC: "N_NE_CO_ES",
  AL: "N_NE_CO_ES",
  AM: "N_NE_CO_ES",
  AP: "N_NE_CO_ES",
  BA: "N_NE_CO_ES",
  CE: "N_NE_CO_ES",
  DF: "N_NE_CO_ES",
  GO: "N_NE_CO_ES",
  MA: "N_NE_CO_ES",
  MT: "N_NE_CO_ES",
  MS: "N_NE_CO_ES",
  PA: "N_NE_CO_ES",
  PB: "N_NE_CO_ES",
  PE: "N_NE_CO_ES",
  PI: "N_NE_CO_ES",
  RN: "N_NE_CO_ES",
  RO: "N_NE_CO_ES",
  RR: "N_NE_CO_ES",
  SE: "N_NE_CO_ES",
  TO: "N_NE_CO_ES",
};

export function getRegionByState(state: string): TaxRegion {
  return STATE_REGIONS[state.toUpperCase()] ?? "SP";
}

export function getRegionLabel(region: TaxRegion): string {
  switch (region) {
    case "SP":
      return "São Paulo";
    case "SUL_SUDESTE":
      return "Sul/Sudeste";
    case "N_NE_CO_ES":
      return "N/NE/CO/ES";
  }
}

export const BRAZILIAN_STATES = [
  { uf: "AC", name: "Acre" },
  { uf: "AL", name: "Alagoas" },
  { uf: "AM", name: "Amazonas" },
  { uf: "AP", name: "Amapá" },
  { uf: "BA", name: "Bahia" },
  { uf: "CE", name: "Ceará" },
  { uf: "DF", name: "Distrito Federal" },
  { uf: "ES", name: "Espírito Santo" },
  { uf: "GO", name: "Goiás" },
  { uf: "MA", name: "Maranhão" },
  { uf: "MG", name: "Minas Gerais" },
  { uf: "MS", name: "Mato Grosso do Sul" },
  { uf: "MT", name: "Mato Grosso" },
  { uf: "PA", name: "Pará" },
  { uf: "PB", name: "Paraíba" },
  { uf: "PE", name: "Pernambuco" },
  { uf: "PI", name: "Piauí" },
  { uf: "PR", name: "Paraná" },
  { uf: "RJ", name: "Rio de Janeiro" },
  { uf: "RN", name: "Rio Grande do Norte" },
  { uf: "RO", name: "Rondônia" },
  { uf: "RR", name: "Roraima" },
  { uf: "RS", name: "Rio Grande do Sul" },
  { uf: "SC", name: "Santa Catarina" },
  { uf: "SE", name: "Sergipe" },
  { uf: "SP", name: "São Paulo" },
  { uf: "TO", name: "Tocantins" },
];

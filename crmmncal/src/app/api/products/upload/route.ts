import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface RowData {
  [key: string]: string | number | undefined;
}

// Mapeia nomes de coluna possíveis para campos padronizados
function normalizeColumnName(col: string): string {
  const normalized = col
    .toString()
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // Remove acentos

  if (normalized.includes("CODIGO") || normalized === "COD") return "code";
  if (normalized.includes("CUSTO") || normalized.includes("COST")) return "costPrice";
  if (normalized.includes("MARGEM") || normalized.includes("MARGIN")) return "marginDefault";
  if (normalized.includes("DESCRI")) return "description";
  if (normalized.includes("REFERENCIA") || normalized.includes("REF")) return "reference";
  if (normalized.includes("MODELO") || normalized.includes("MODEL")) return "model";
  if (normalized.includes("PESO") || normalized.includes("WEIGHT")) return "weight";
  if (normalized.includes("MARCA") || normalized.includes("BRAND")) return "brand";
  if (normalized.includes("SERIE")) return "series";
  if (normalized.includes("CATEGORIA") || normalized.includes("TIPO")) return "category";
  if (normalized === "SP" || normalized.includes("FATOR SP")) return "taxSP";
  if (normalized.includes("SUL") || normalized.includes("SUDESTE")) return "taxSulSudeste";
  if (
    normalized.includes("N-NE") ||
    normalized.includes("NORTE") ||
    normalized.includes("N_NE") ||
    normalized.includes("NNECO")
  )
    return "taxNNECOES";
  if (normalized.includes("ESTOQUE") || normalized.includes("STOCK")) return "stockQuantity";

  return col;
}

function parseNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return value;
  const str = value
    .toString()
    .replace(/R\$\s*/g, "")
    .replace(/\./g, "")
    .replace(",", ".")
    .replace(/%/g, "")
    .trim();
  const num = parseFloat(str);
  return isNaN(num) ? null : num;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const sheetName = formData.get("sheetName") as string | null;

    if (!file) {
      return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 });
    }

    // Ler o arquivo
    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "buffer" });

    // Selecionar aba
    const selectedSheet = sheetName || workbook.SheetNames[0];
    const worksheet = workbook.Sheets[selectedSheet];

    if (!worksheet) {
      return NextResponse.json(
        { error: `Aba "${selectedSheet}" não encontrada`, sheets: workbook.SheetNames },
        { status: 400 }
      );
    }

    // Converter para JSON
    const rawData: RowData[] = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

    if (rawData.length === 0) {
      return NextResponse.json({ error: "Planilha vazia" }, { status: 400 });
    }

    // Mapear colunas
    const columns = Object.keys(rawData[0]);
    const columnMap: Record<string, string> = {};
    for (const col of columns) {
      columnMap[col] = normalizeColumnName(col);
    }

    // Processar linhas
    let created = 0;
    let updated = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i];
      const rowNum = i + 2; // +2 porque linha 1 é header

      // Obter valor por campo normalizado
      const getValue = (field: string): unknown => {
        for (const [original, normalized] of Object.entries(columnMap)) {
          if (normalized === field) return row[original];
        }
        return undefined;
      };

      const code = getValue("code")?.toString().trim();
      const costPrice = parseNumber(getValue("costPrice"));

      if (!code) {
        skipped++;
        continue;
      }

      if (costPrice === null || costPrice <= 0) {
        errors.push(`Linha ${rowNum}: código "${code}" sem preço de custo válido`);
        skipped++;
        continue;
      }

      const marginDefault = parseNumber(getValue("marginDefault")) ?? 20;
      const taxSP = parseNumber(getValue("taxSP")) ?? 9.1204;
      const taxSulSudeste = parseNumber(getValue("taxSulSudeste")) ?? 15.699;
      const taxNNECOES = parseNumber(getValue("taxNNECOES")) ?? 12.9736;

      const data = {
        code,
        description: getValue("description")?.toString().trim() || null,
        reference: getValue("reference")?.toString().trim() || null,
        model: getValue("model")?.toString().trim() || null,
        weight: parseNumber(getValue("weight")),
        brand: getValue("brand")?.toString().trim() || null,
        series: getValue("series")?.toString().trim() || null,
        category: getValue("category")?.toString().trim() || null,
        costPrice,
        marginDefault,
        taxSP,
        taxSulSudeste,
        taxNNECOES,
        stockQuantity: parseNumber(getValue("stockQuantity")) ?? 0,
        active: true,
      };

      try {
        const existing = await prisma.product.findUnique({ where: { code } });
        if (existing) {
          await prisma.product.update({ where: { code }, data });
          updated++;
        } else {
          await prisma.product.create({ data });
          created++;
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`Linha ${rowNum}: erro ao salvar "${code}": ${msg}`);
        skipped++;
      }
    }

    return NextResponse.json({
      success: true,
      summary: {
        totalRows: rawData.length,
        created,
        updated,
        skipped,
        errors: errors.slice(0, 20), // Max 20 errors
      },
      columns: columns.map((col) => ({
        original: col,
        mapped: columnMap[col],
      })),
      sheets: workbook.SheetNames,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Erro ao processar arquivo: ${msg}` }, { status: 500 });
  }
}

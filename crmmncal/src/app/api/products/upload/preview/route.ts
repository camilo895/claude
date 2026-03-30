import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "buffer" });

    const sheets = workbook.SheetNames.map((name) => {
      const ws = workbook.Sheets[name];
      const data = XLSX.utils.sheet_to_json(ws, { defval: "" });
      return {
        name,
        columns: data.length > 0 ? Object.keys(data[0] as object) : [],
        rowCount: data.length,
        preview: data.slice(0, 5), // Primeiras 5 linhas
      };
    });

    return NextResponse.json({ sheets });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Erro ao ler arquivo: ${msg}` }, { status: 500 });
  }
}

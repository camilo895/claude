import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { renderToBuffer } from "@react-pdf/renderer";
import { QuotationPDF } from "@/components/pdf/QuotationPDF";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const quotation = await prisma.quotation.findUnique({
    where: { id },
    include: {
      customer: true,
      seller: { select: { name: true, email: true } },
      items: {
        include: { product: { select: { code: true, description: true } } },
        orderBy: { product: { code: "asc" } },
      },
    },
  });

  if (!quotation) {
    return NextResponse.json({ error: "Cotação não encontrada" }, { status: 404 });
  }

  const buffer = await renderToBuffer(QuotationPDF({ quotation }));
  const uint8 = new Uint8Array(buffer);

  return new NextResponse(uint8, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="cotacao-${quotation.number}.pdf"`,
    },
  });
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// PUT /api/products/margin — aplica margem global a todos os produtos
export async function PUT(req: NextRequest) {
  const { margin } = await req.json();
  const m = parseFloat(margin);
  if (isNaN(m) || m < 0 || m > 100) {
    return NextResponse.json({ error: "Margem inválida" }, { status: 400 });
  }
  const result = await prisma.product.updateMany({
    where: { active: true },
    data: { marginDefault: m },
  });
  return NextResponse.json({ updated: result.count, margin: m });
}

// GET /api/products/margin — retorna a margem mais utilizada atualmente
export async function GET() {
  const products = await prisma.product.findMany({
    where: { active: true },
    select: { marginDefault: true },
    take: 500,
  });
  if (products.length === 0) return NextResponse.json({ margin: 20 });

  const freq: Record<number, number> = {};
  for (const p of products) {
    freq[p.marginDefault] = (freq[p.marginDefault] ?? 0) + 1;
  }
  const dominant = Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0];
  return NextResponse.json({ margin: parseFloat(dominant), total: products.length });
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// PATCH /api/products/[id] — atualiza margem ou outros campos de um produto
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();

  const data: Record<string, unknown> = {};
  if (body.marginDefault !== undefined) data.marginDefault = parseFloat(body.marginDefault);
  if (body.costPrice !== undefined) data.costPrice = parseFloat(body.costPrice);
  if (body.stockQuantity !== undefined) data.stockQuantity = parseInt(body.stockQuantity);
  if (body.active !== undefined) data.active = Boolean(body.active);

  const product = await prisma.product.update({ where: { id }, data });
  return NextResponse.json(product);
}

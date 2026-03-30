import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
      seller: { select: { id: true, name: true, email: true, image: true } },
      items: {
        include: { product: true },
        orderBy: { product: { code: "asc" } },
      },
      followUps: { orderBy: { dueDate: "asc" } },
      activities: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!quotation) {
    return NextResponse.json({ error: "Cotação não encontrada" }, { status: 404 });
  }

  return NextResponse.json(quotation);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  const quotation = await prisma.quotation.update({
    where: { id },
    data: {
      ...(body.status && { status: body.status }),
      ...(body.notes !== undefined && { notes: body.notes }),
      ...(body.lostReason && { lostReason: body.lostReason }),
      ...(body.status === "ENVIADA" && { sentAt: new Date() }),
      ...(body.status === "GANHA" && { wonAt: new Date() }),
      ...(body.status === "PERDIDA" && { lostAt: new Date() }),
    },
    include: {
      customer: true,
      seller: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(quotation);
}

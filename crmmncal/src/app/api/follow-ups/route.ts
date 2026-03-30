import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  const status = req.nextUrl.searchParams.get("status");

  const where: Record<string, unknown> = {};
  if (userId) where.userId = userId;
  if (status) where.status = status;

  const followUps = await prisma.followUp.findMany({
    where,
    include: {
      quotation: {
        include: {
          customer: { select: { name: true, phone: true } },
        },
      },
      user: { select: { name: true } },
    },
    orderBy: { dueDate: "asc" },
    take: 50,
  });

  return NextResponse.json(followUps);
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();

  const followUp = await prisma.followUp.update({
    where: { id: body.id },
    data: {
      status: body.status,
      notes: body.notes,
      ...(body.status === "REALIZADO" && { completedAt: new Date() }),
    },
  });

  return NextResponse.json(followUp);
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json();

  const activity = await prisma.activity.create({
    data: {
      type: body.type,
      description: body.description,
      quotationId: body.quotationId,
      userId: body.userId,
    },
    include: {
      user: { select: { name: true, image: true } },
    },
  });

  return NextResponse.json(activity, { status: 201 });
}

export async function GET(req: NextRequest) {
  const quotationId = req.nextUrl.searchParams.get("quotationId");
  if (!quotationId) {
    return NextResponse.json({ error: "quotationId obrigatório" }, { status: 400 });
  }

  const activities = await prisma.activity.findMany({
    where: { quotationId },
    include: { user: { select: { name: true, image: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(activities);
}

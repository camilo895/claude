import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  const month = req.nextUrl.searchParams.get("month");
  const year = req.nextUrl.searchParams.get("year");

  const where: Record<string, unknown> = {};
  if (userId) where.userId = userId;
  if (month) where.month = parseInt(month);
  if (year) where.year = parseInt(year);

  const goals = await prisma.salesGoal.findMany({
    where,
    include: { user: { select: { id: true, name: true, image: true, role: true } } },
    orderBy: [{ year: "desc" }, { month: "desc" }],
  });

  return NextResponse.json(goals);
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  const goal = await prisma.salesGoal.upsert({
    where: {
      userId_month_year: {
        userId: body.userId,
        month: parseInt(body.month),
        year: parseInt(body.year),
      },
    },
    update: {
      targetAmount: parseFloat(body.targetAmount),
      conversionRate: parseFloat(body.conversionRate ?? "10"),
    },
    create: {
      userId: body.userId,
      month: parseInt(body.month),
      year: parseInt(body.year),
      targetAmount: parseFloat(body.targetAmount),
      conversionRate: parseFloat(body.conversionRate ?? "10"),
    },
  });

  return NextResponse.json(goal);
}

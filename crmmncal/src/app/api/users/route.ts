import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const role = req.nextUrl.searchParams.get("role");
  const teamId = req.nextUrl.searchParams.get("teamId");

  const where: Record<string, unknown> = { active: true };
  if (role) where.role = role;
  if (teamId) where.teamId = teamId;

  const users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
      active: true,
      teamId: true,
      createdAt: true,
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(users);
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();

  const user = await prisma.user.update({
    where: { id: body.id },
    data: {
      ...(body.role && { role: body.role }),
      ...(body.teamId !== undefined && { teamId: body.teamId }),
      ...(body.active !== undefined && { active: body.active }),
    },
  });

  return NextResponse.json(user);
}

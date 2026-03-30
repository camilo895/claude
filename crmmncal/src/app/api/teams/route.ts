import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const teams = await prisma.team.findMany({
    include: {
      manager: { select: { id: true, name: true, email: true } },
      members: { select: { id: true, name: true, email: true, role: true } },
      followUpConfig: true,
    },
  });

  return NextResponse.json(teams);
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  const team = await prisma.team.create({
    data: {
      name: body.name,
      managerId: body.managerId,
      ...(body.followUpConfig && {
        followUpConfig: {
          create: {
            firstFollowUpDays: body.followUpConfig.firstFollowUpDays ?? 2,
            secondFollowUpDays: body.followUpConfig.secondFollowUpDays ?? 5,
            thirdFollowUpDays: body.followUpConfig.thirdFollowUpDays ?? 10,
            maxFollowUps: body.followUpConfig.maxFollowUps ?? 3,
          },
        },
      }),
    },
    include: {
      manager: { select: { name: true } },
      followUpConfig: true,
    },
  });

  return NextResponse.json(team, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();

  if (body.followUpConfig && body.teamId) {
    await prisma.followUpConfig.upsert({
      where: { teamId: body.teamId },
      update: body.followUpConfig,
      create: { teamId: body.teamId, ...body.followUpConfig },
    });
  }

  const team = await prisma.team.update({
    where: { id: body.teamId },
    data: {
      ...(body.name && { name: body.name }),
    },
    include: {
      manager: { select: { name: true } },
      members: { select: { id: true, name: true, role: true } },
      followUpConfig: true,
    },
  });

  return NextResponse.json(team);
}

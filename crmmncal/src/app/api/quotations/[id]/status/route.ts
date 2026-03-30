import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { status, lostReason } = await req.json();

  const validStatuses = [
    "RASCUNHO",
    "ENVIADA",
    "EM_FOLLOWUP",
    "EM_NEGOCIACAO",
    "GANHA",
    "PERDIDA",
  ];

  if (!validStatuses.includes(status)) {
    return NextResponse.json({ error: "Status inválido" }, { status: 400 });
  }

  const updateData: Record<string, unknown> = { status };

  if (status === "ENVIADA") updateData.sentAt = new Date();
  if (status === "GANHA") updateData.wonAt = new Date();
  if (status === "PERDIDA") {
    updateData.lostAt = new Date();
    if (lostReason) updateData.lostReason = lostReason;
  }

  // Se mudou para ENVIADA, criar follow-ups automáticos
  if (status === "ENVIADA") {
    const quotation = await prisma.quotation.findUnique({
      where: { id },
      include: { seller: { include: { team: { include: { followUpConfig: true } } } } },
    });

    if (quotation) {
      const config = quotation.seller.team?.followUpConfig;
      const days = config
        ? [config.firstFollowUpDays, config.secondFollowUpDays, config.thirdFollowUpDays]
        : [2, 5, 10];

      const now = new Date();
      for (const d of days) {
        const dueDate = new Date(now);
        dueDate.setDate(dueDate.getDate() + d);

        await prisma.followUp.create({
          data: {
            quotationId: id,
            userId: quotation.sellerId,
            dueDate,
          },
        });
      }
    }
  }

  const updated = await prisma.quotation.update({
    where: { id },
    data: updateData,
    include: {
      customer: true,
      seller: { select: { name: true } },
    },
  });

  return NextResponse.json(updated);
}

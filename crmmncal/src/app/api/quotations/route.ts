import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const status = searchParams.get("status");
  const sellerId = searchParams.get("sellerId");
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "20");
  const skip = (page - 1) * limit;

  const search = searchParams.get("search") ?? "";

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (sellerId) where.sellerId = sellerId;
  if (search) where.customer = { name: { contains: search, mode: "insensitive" } };

  const [quotations, total] = await Promise.all([
    prisma.quotation.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        customer: { select: { name: true, phone: true, state: true, city: true } },
        seller: { select: { name: true } },
        followUps: { select: { dueDate: true, status: true }, orderBy: { dueDate: "asc" } },
        _count: { select: { items: true } },
      },
    }),
    prisma.quotation.count({ where }),
  ]);

  return NextResponse.json({
    quotations,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  const quotation = await prisma.quotation.create({
    data: {
      customerId: body.customerId,
      sellerId: body.sellerId,
      marketType: body.marketType ?? "INTERNO",
      validUntil: body.validUntil ? new Date(body.validUntil) : null,
      notes: body.notes || null,
      items: {
        create: body.items.map(
          (item: {
            productId: string;
            quantity: number;
            unitCost: number;
            margin: number;
            taxRate: number;
            unitPrice: number;
            totalPrice: number;
            conversionFactor?: number;
          }) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitCost: item.unitCost,
            margin: item.margin,
            taxRate: item.taxRate,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            conversionFactor: item.conversionFactor ?? 100,
          })
        ),
      },
      totalCost: body.totalCost,
      totalPrice: body.totalPrice,
      marginAvg: body.marginAvg,
    },
    include: {
      customer: true,
      items: { include: { product: true } },
      seller: { select: { name: true, email: true } },
    },
  });

  return NextResponse.json(quotation, { status: 201 });
}

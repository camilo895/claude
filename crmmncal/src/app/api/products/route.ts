import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const search = searchParams.get("search") ?? "";
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "50");
  const skip = (page - 1) * limit;

  const brandFilter = searchParams.get("brand") ?? "";

  const where = {
    active: true,
    ...(brandFilter ? { brand: { equals: brandFilter, mode: "insensitive" as const } } : {}),
    ...(search
      ? {
          OR: [
            { code: { contains: search, mode: "insensitive" as const } },
            { description: { contains: search, mode: "insensitive" as const } },
            { reference: { contains: search, mode: "insensitive" as const } },
            { brand: { contains: search, mode: "insensitive" as const } },
            { series: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      skip,
      take: limit,
      orderBy: { code: "asc" },
    }),
    prisma.product.count({ where }),
  ]);

  return NextResponse.json({
    products,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  const product = await prisma.product.create({
    data: {
      code: body.code,
      description: body.description,
      reference: body.reference,
      model: body.model,
      weight: body.weight ? parseFloat(body.weight) : null,
      brand: body.brand,
      series: body.series,
      category: body.category,
      costPrice: parseFloat(body.costPrice),
      marginDefault: parseFloat(body.marginDefault ?? "20"),
      taxSP: parseFloat(body.taxSP ?? "9.1204"),
      taxSulSudeste: parseFloat(body.taxSulSudeste ?? "15.6990"),
      taxNNECOES: parseFloat(body.taxNNECOES ?? "12.9736"),
      stockQuantity: parseInt(body.stockQuantity ?? "0"),
    },
  });

  return NextResponse.json(product, { status: 201 });
}

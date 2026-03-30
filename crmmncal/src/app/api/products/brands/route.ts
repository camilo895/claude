import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const brands = await prisma.product.findMany({
    where: { active: true, brand: { not: null } },
    select: { brand: true },
    distinct: ["brand"],
    orderBy: { brand: "asc" },
  });

  return NextResponse.json(
    brands.map((b) => b.brand).filter(Boolean)
  );
}

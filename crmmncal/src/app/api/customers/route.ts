import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const search = req.nextUrl.searchParams.get("search") ?? "";

  const where = search
    ? {
        active: true,
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { cnpj: { contains: search, mode: "insensitive" as const } },
          { phone: { contains: search, mode: "insensitive" as const } },
        ],
      }
    : { active: true };

  const customers = await prisma.customer.findMany({
    where,
    orderBy: { name: "asc" },
    take: 50,
  });

  return NextResponse.json(customers);
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  const customer = await prisma.customer.create({
    data: {
      name: body.name,
      cnpj: body.cnpj || null,
      cpf: body.cpf || null,
      email: body.email || null,
      phone: body.phone || null,
      state: body.state,
      city: body.city || null,
      address: body.address || null,
      notes: body.notes || null,
    },
  });

  return NextResponse.json(customer, { status: 201 });
}

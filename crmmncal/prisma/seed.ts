/* eslint-disable @typescript-eslint/no-require-imports */
require("dotenv/config");
const { PrismaClient } = require("../src/generated/prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");

const adapter = new PrismaPg(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  // Criar equipe padrão
  const team = await prisma.team.upsert({
    where: { managerId: "admin-placeholder" },
    update: {},
    create: {
      id: "team-mancal-matao",
      name: "Mancal Matão - Equipe Comercial",
      manager: {
        create: {
          id: "admin-placeholder",
          name: "Administrador",
          email: "admin@mancalmatao.com.br",
          role: "DIRETOR",
        },
      },
    },
  });

  // Criar config de follow-up padrão
  await prisma.followUpConfig.upsert({
    where: { teamId: team.id },
    update: {},
    create: {
      teamId: team.id,
      firstFollowUpDays: 2,
      secondFollowUpDays: 5,
      thirdFollowUpDays: 10,
      maxFollowUps: 3,
    },
  });

  // Produtos de exemplo (da planilha)
  const sampleProducts = [
    { code: "SL", costPrice: 286.18, marginDefault: 5 },
    { code: "SGGP 1127", costPrice: 86.0, marginDefault: 20 },
    { code: "SGOP 1127", costPrice: 186.19, marginDefault: 20 },
    { code: "SGGPC 1127", costPrice: 197.05, marginDefault: 20 },
    { code: "SGOPC 1127", costPrice: 199.63, marginDefault: 20 },
    { code: "SGGP 1030", costPrice: 181.91, marginDefault: 20 },
    { code: "SGOP 1130", costPrice: 186.19, marginDefault: 20 },
    { code: "SGDP 1130", costPrice: 235.43, marginDefault: 20 },
    { code: "SGOPC 1130", costPrice: 198.56, marginDefault: 20 },
    { code: "SGDPC 1130", costPrice: 248.50, marginDefault: 20 },
    { code: "SGGP 3000", costPrice: 194.10, marginDefault: 20 },
    { code: "SGOP 3100", costPrice: 195.95, marginDefault: 20 },
    { code: "SGDP 3100", costPrice: 243.04, marginDefault: 20 },
    { code: "SGGPC 3000", costPrice: 207.17, marginDefault: 25 },
    { code: "SGOPC 3100", costPrice: 209.39, marginDefault: 20 },
    { code: "SGDPC 3100", costPrice: 259.95, marginDefault: 20 },
    { code: "SGGP 3200", costPrice: 193.37, marginDefault: 20 },
    { code: "SGOP 3300", costPrice: 195.85, marginDefault: 20 },
    { code: "SGDP 3300", costPrice: 245.59, marginDefault: 20 },
    { code: "SGDPC 3300", costPrice: 259.95, marginDefault: 20 },
    { code: "SGGP 3600", costPrice: 297.98, marginDefault: 20 },
    { code: "SGOP 3700", costPrice: 315.77, marginDefault: 20 },
    { code: "SGDP 3700", costPrice: 365.18, marginDefault: 20 },
  ];

  for (const product of sampleProducts) {
    await prisma.product.upsert({
      where: { code: product.code },
      update: { costPrice: product.costPrice, marginDefault: product.marginDefault },
      create: {
        ...product,
        taxSP: 9.1204,
        taxSulSudeste: 15.699,
        taxNNECOES: 12.9736,
        active: true,
      },
    });
  }

  console.log(`Created/updated ${sampleProducts.length} sample products`);

  // Criar meta de exemplo
  await prisma.salesGoal.upsert({
    where: {
      userId_month_year: {
        userId: "admin-placeholder",
        month: 3,
        year: 2026,
      },
    },
    update: {},
    create: {
      userId: "admin-placeholder",
      month: 3,
      year: 2026,
      targetAmount: 100000,
      achievedAmount: 42500,
      conversionRate: 10,
      avgTicket: 800,
    },
  });

  console.log("Seed complete!");
}

main()
  .catch((e: unknown) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

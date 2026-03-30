let _prisma: any;

export function getPrisma() {
  if (!_prisma) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PrismaClient } = require("@/generated/prisma/client");
    _prisma = new PrismaClient();
  }
  return _prisma;
}

// For convenience - lazy getter
export const prisma = new Proxy({} as any, {
  get(_target, prop) {
    return getPrisma()[prop];
  },
});

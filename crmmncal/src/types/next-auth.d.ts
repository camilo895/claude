import { UserRole } from "@/generated/prisma/enums";
import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: UserRole;
      teamId: string | null;
    };
  }
}

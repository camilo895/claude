import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./prisma";

const isDev = process.env.NODE_ENV === "development";
const hasGoogleCredentials =
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET;

const providers: NextAuthOptions["providers"] = [];

if (hasGoogleCredentials) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope:
            "openid email profile https://www.googleapis.com/auth/calendar",
          access_type: "offline",
          prompt: "consent",
        },
      },
    })
  );
}

// Login de desenvolvimento (sem Google OAuth)
if (isDev) {
  providers.push(
    CredentialsProvider({
      id: "dev-login",
      name: "Desenvolvimento",
      credentials: {
        name: { label: "Nome", type: "text", placeholder: "Seu nome" },
        email: { label: "Email", type: "email", placeholder: "email@empresa.com" },
      },
      async authorize(credentials) {
        if (!credentials?.email) return null;

        // Cria ou atualiza o usuário no banco
        const user = await prisma.user.upsert({
          where: { email: credentials.email },
          update: { name: credentials.name || "Usuário Dev" },
          create: {
            email: credentials.email,
            name: credentials.name || "Usuário Dev",
            role: "DIRETOR", // Em dev, acesso total
          },
        });

        return {
          id: user.id,
          name: user.name,
          email: user.email,
        };
      },
    })
  );
}

export const authOptions: NextAuthOptions = {
  adapter: hasGoogleCredentials
    ? (PrismaAdapter(prisma) as NextAuthOptions["adapter"])
    : undefined,
  providers,
  session: {
    strategy: hasGoogleCredentials ? "database" : "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, user, token }) {
      const userId = user?.id ?? (token?.id as string);
      if (session.user && userId) {
        const dbUser = await prisma.user.findUnique({
          where: { id: userId },
          select: { id: true, role: true, teamId: true },
        });
        session.user.id = userId;
        session.user.role = dbUser?.role ?? "VENDEDOR";
        session.user.teamId = dbUser?.teamId ?? null;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
};

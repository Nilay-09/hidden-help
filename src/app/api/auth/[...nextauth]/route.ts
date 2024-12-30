import { PrismaAdapter } from "@auth/prisma-adapter";
import { NextAuthOptions, User as NextAuthUser, Session as NextAuthSession} from "next-auth";
import NextAuth, { Session } from "next-auth";
import { JWT as NextAuthJWT } from "next-auth/jwt";  // Correct import for JWT

import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { User } from '@prisma/client';

// Enum type for Role (matching your Prisma schema)
export enum Role {
  ADMIN = "ADMIN",
  USER = "USER",
  MODERATOR = "MODERATOR",
}


interface CustomJWT extends NextAuthJWT {
  role: string; 
}

function isUser(user: any): user is User {
  return user && typeof user.role === 'string';
}


const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Please enter an email and password");
        }

        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email,
          },
        });

        if (!user) {
          throw new Error("No user found with this email");
        }

        const passwordMatch = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!passwordMatch) {
          throw new Error("Incorrect password");
        }

        // Return user with role as enum
        return {
          id: user.id.toString(),
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  
  callbacks: {
    async jwt({ token, user }) {
      if (user && isUser(user)) {
        // Now TypeScript knows that user is of type User
        (token as CustomJWT).role = user.role; // Safely assign role to token
      }
      return token;
    },
    async session({ session, token }) {
      if (session?.user) {
        // Safely assign role from token to session
        (session.user as any).role = (token as CustomJWT).role;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
  },
  session: {
    strategy: "jwt",
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };

import { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import prisma from "./prisma";
import bcrypt from "bcryptjs";
import { User } from '@prisma/client'; // Assuming User is your Prisma model

// Enum for Role
export enum Role {
  ADMIN = "ADMIN",
  USER = "USER",
  MODERATOR = "MODERATOR",
}

// Extending NextAuth JWT and Session types
declare module "next-auth" {
  interface Session {
    user: {
      email: string;
      name: string;
      role: string;  // Added role to the session
    };
  }

  interface JWT {
    role?: string;  // Adding role to the JWT type (optional)
  }
}

// Type guard to check if the user has a role
function isUser(user: any): user is User {
  return user && typeof user.role === "string";
}

export const authOptions: AuthOptions = {
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

        // Return the user data including role
        return {
          id: user.id.toString(),
          email: user.email,
          name: user.name,
          role: user.role, // Assuming role is present here
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user && isUser(user)) {
        // Safe to access user.role because of the type guard
        (token as { role: string }).role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session?.user) {
        // Add role from token to session
        (session.user as { role: string }).role = (token as { role: string }).role!;
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

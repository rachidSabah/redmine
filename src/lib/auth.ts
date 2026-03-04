import { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import GitHubProvider from "next-auth/providers/github";
import { prisma } from "./db";
import { compare } from "bcrypt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      role: string;
      organizationId?: string | null;
    };
  }
  interface User {
    id: string;
    email: string;
    name?: string | null;
    image?: string | null;
    role: string;
    organizationId?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    email: string;
    name?: string | null;
    picture?: string | null;
    role: string;
    organizationId?: string | null;
  }
}

// Detect if we're in production
const isProduction = process.env.NODE_ENV === "production";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/auth/signin",
    signOut: "/auth/signout",
    error: "/auth/error",
  },
  // Configure cookies for production - simpler approach
  cookies: isProduction ? {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: true,
      },
    },
    callbackUrl: {
      name: `next-auth.callback-url`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: true,
      },
    },
    csrfToken: {
      name: `next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: true,
      },
    },
    pkceCodeVerifier: {
      name: `next-auth.pkce.code_verifier`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: true,
      },
    },
    state: {
      name: `next-auth.state`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: true,
      },
    },
    nonce: {
      name: `next-auth.nonce`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: true,
      },
    },
  } : undefined,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      allowDangerousEmailAccountLinking: true,
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID || "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
      allowDangerousEmailAccountLinking: true,
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        identifier: { label: "Email or Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.identifier || !credentials?.password) {
          console.log("Missing credentials");
          return null;
        }

        const identifier = credentials.identifier.toLowerCase().trim();
        
        // Find user by email or by name (username)
        let user = await prisma.user.findUnique({
          where: { email: identifier },
          include: {
            memberships: {
              where: { isActive: true },
              orderBy: { joinedAt: "desc" },
              take: 1,
            },
          },
        });

        // If not found by email, try to find by name (case-insensitive username lookup)
        if (!user) {
          user = await prisma.user.findFirst({
            where: { 
              name: { 
                equals: credentials.identifier.trim(),
                mode: 'insensitive'
              } 
            },
            include: {
              memberships: {
                where: { isActive: true },
                orderBy: { joinedAt: "desc" },
                take: 1,
              },
            },
          });
        }

        if (!user || !user.password || !user.isActive) {
          console.log("User not found or inactive:", identifier);
          return null;
        }

        const isPasswordValid = await compare(
          credentials.password,
          user.password
        );

        if (!isPasswordValid) {
          console.log("Invalid password for:", identifier);
          return null;
        }

        // Update last login
        try {
          await prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
          });
        } catch (e) {
          console.log("Could not update lastLoginAt");
        }

        console.log("User authenticated successfully:", user.email, "Role:", user.memberships[0]?.role || "GUEST");

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.memberships[0]?.role || "GUEST",
          organizationId: user.memberships[0]?.organizationId || null,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      // Initial sign in
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.picture = user.image;
        token.role = (user as any).role || "GUEST";
        token.organizationId = (user as any).organizationId || null;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user = {
          id: token.id,
          email: token.email,
          name: token.name,
          image: token.picture,
          role: token.role,
          organizationId: token.organizationId,
        };
      }
      return session;
    },
    async signIn({ user, account, profile }) {
      if (account?.provider === "credentials") {
        return true;
      }

      // For OAuth providers
      if (user.email) {
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email },
          include: { memberships: true },
        });

        if (!existingUser) {
          // Create user with OAuth - will be handled by PrismaAdapter
          return true;
        }
      }

      return true;
    },
    async redirect({ url, baseUrl }) {
      // Allows relative callback URLs
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      // Allows callback URLs on the same origin
      else if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
  },
  events: {
    async signIn({ user }) {
      console.log(`User signed in: ${user.email}`);
    },
  },
  // Enable debug in all environments temporarily
  debug: true,
};

export const getServerSession = async () => {
  const { getServerSession } = await import("next-auth");
  return getServerSession(authOptions);
};

export const getCurrentUser = async () => {
  const session = await getServerSession();
  return session?.user;
};

export const requireAuth = async () => {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
};

export const requireAdmin = async () => {
  const user = await requireAuth();
  if (user.role !== "OWNER" && user.role !== "ADMIN") {
    throw new Error("Admin access required");
  }
  return user;
};

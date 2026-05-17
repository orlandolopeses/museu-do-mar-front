import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { db } from "@/lib/db";
import authConfig from "@/lib/auth.config";
import { getAuthSecret } from "@/lib/auth-secret";
import { permissions, rolePermissions, roles, userRoles, users } from "@/lib/schema";
import { eq, inArray } from "drizzle-orm";
import bcrypt from "bcryptjs";

type SessionTokenUser = {
  id: string;
  isAdmin: boolean;
  roles: string[];
  primaryRole: string | null;
  permissions: string[];
  name?: string | null;
  email?: string | null;
};

function applySessionUserToToken(token: Record<string, unknown>, sessionUser: SessionTokenUser) {
  token.id = sessionUser.id;
  token.isAdmin = sessionUser.isAdmin;
  token.roles = sessionUser.roles;
  token.primaryRole = sessionUser.primaryRole;
  token.permissions = sessionUser.permissions;
}

function buildFallbackRoles(user: typeof users.$inferSelect) {
  return user.isAdmin
    ? ["superadmin"]
    : user.primaryRole
      ? [user.primaryRole]
      : [];
}

async function buildSessionUserFromDbUser(user: typeof users.$inferSelect) {
  const assignedRoles = await getAssignedRoles(String(user.id));
  const resolvedRoles = assignedRoles.length > 0
    ? assignedRoles
    : buildFallbackRoles(user);
  const resolvedPermissions = await getPermissionsForRoles(resolvedRoles);

  return {
    id: String(user.id),
    name: user.name,
    email: user.email,
    isAdmin: user.isAdmin,
    roles: resolvedRoles,
    primaryRole: user.primaryRole ?? resolvedRoles[0] ?? null,
    permissions: resolvedPermissions,
  };
}

async function touchLastLogin(userId: string) {
  await db
    .update(users)
    .set({ lastLoginAt: new Date() })
    .where(eq(users.id, userId));
}

async function resolveUserByEmail(email: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  return user;
}

async function resolveUserById(id: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, id))
    .limit(1);

  return user;
}

async function ensureGoogleUser(profile: { email?: string | null; name?: string | null; image?: string | null }) {
  if (!profile.email) return null;

  const existingUser = await resolveUserByEmail(profile.email);

  if (existingUser) {
    await db
      .update(users)
      .set({
        name: profile.name ?? existingUser.name,
        avatarUrl: profile.image ?? existingUser.avatarUrl,
        status: "ativo",
        lastLoginAt: new Date(),
      })
      .where(eq(users.id, existingUser.id));

    return resolveUserByEmail(profile.email);
  }

  const passwordHash = await bcrypt.hash(crypto.randomUUID(), 10);
  const newUser = {
    id: crypto.randomUUID(),
    email: profile.email,
    passwordHash,
    name: profile.name?.trim() || profile.email.split("@")[0] || "Participante Museu do Mar",
    isAdmin: false,
    status: "ativo" as const,
    primaryRole: null,
    avatarUrl: profile.image ?? null,
    phone: null,
    lastLoginAt: new Date(),
    termsAcceptedAt: null,
    privacyAcceptedAt: null,
    createdAt: new Date(),
  };

  await db.insert(users).values(newUser);

  return newUser;
}

async function getAssignedRoles(userId: string) {
  const roleRows = await db
    .select({ slug: roles.slug })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(eq(userRoles.userId, userId));

  return roleRows.map((row) => row.slug);
}

async function getPermissionsForRoles(roleSlugs: string[]) {
  if (roleSlugs.length === 0) {
    return [];
  }

  const permissionRows = await db
    .select({ slug: permissions.slug })
    .from(roles)
    .leftJoin(rolePermissions, eq(rolePermissions.roleId, roles.id))
    .leftJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(inArray(roles.slug, roleSlugs));

  const resolvedPermissions = permissionRows
    .map((row) => row.slug)
    .filter((slug): slug is string => Boolean(slug));

  if (roleSlugs.includes("superadmin")) {
    resolvedPermissions.unshift("*");
  }

  return [...new Set(resolvedPermissions)];
}

const providers = [
  ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    ? [
        Google({
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        }),
      ]
    : []),
  Credentials({
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, credentials.email as string))
          .limit(1);

        if (!user || !user.passwordHash) return null;

        const valid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        );
        if (!valid) return null;

        await touchLastLogin(String(user.id));

        return buildSessionUserFromDbUser(user);
      },
    }),
];

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  secret: getAuthSecret(),
  providers,
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        applySessionUserToToken(token as Record<string, unknown>, {
          id: typeof user.id === "string" ? user.id : "",
          isAdmin: Boolean(user.isAdmin),
          roles: user.roles ?? [],
          primaryRole: user.primaryRole ?? null,
          permissions: user.permissions ?? [],
          name: user.name ?? null,
          email: user.email ?? null,
        });
      }

      if (account?.provider === "google" && token.email) {
        const dbUser = await ensureGoogleUser({
          email: token.email,
          name: typeof token.name === "string" ? token.name : null,
          image: typeof token.picture === "string" ? token.picture : null,
        });

        if (dbUser) {
          const sessionUser = await buildSessionUserFromDbUser(dbUser);
          applySessionUserToToken(token as Record<string, unknown>, sessionUser);
        }
      }

      const tokenUserId = typeof token.id === "string" ? token.id : null;
      const tokenEmail = typeof token.email === "string" ? token.email : null;

      const persistedUser = tokenUserId
        ? await resolveUserById(tokenUserId)
        : tokenEmail
          ? await resolveUserByEmail(tokenEmail)
          : null;

      if (persistedUser) {
        const sessionUser = await buildSessionUserFromDbUser(persistedUser);
        applySessionUserToToken(token as Record<string, unknown>, sessionUser);
      }

      return token;
    },
    session({ session, token }) {
      const sessionUser = (session.user ?? {}) as typeof session.user;
      session.user = sessionUser;

      sessionUser.name = typeof token.name === "string" ? token.name : null;
      sessionUser.email = typeof token.email === "string" ? token.email : sessionUser.email;
      sessionUser.image = sessionUser.image ?? null;
      sessionUser.id = typeof token.id === "string" ? token.id : "";
      sessionUser.isAdmin = Boolean(token.isAdmin);
      sessionUser.roles = Array.isArray(token.roles)
        ? token.roles.filter((role): role is string => typeof role === "string")
        : [];
      sessionUser.primaryRole =
        typeof token.primaryRole === "string" ? token.primaryRole : null;
      sessionUser.permissions = Array.isArray(token.permissions)
        ? token.permissions.filter(
            (permission): permission is string => typeof permission === "string"
          )
        : [];

      return session;
    },
  },
});

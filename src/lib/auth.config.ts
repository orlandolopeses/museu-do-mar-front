import type { NextAuthConfig } from "next-auth";

const authConfig = {
  providers: [],
  trustHost: true,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/admin/login",
  },
} satisfies NextAuthConfig;

export default authConfig;
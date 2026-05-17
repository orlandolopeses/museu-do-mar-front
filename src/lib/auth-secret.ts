const EXPLICIT_AUTH_SECRET = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
const DEV_AUTH_SECRET_FALLBACK = "museu-do-mar-dev-secret-local-only";

export function getAuthSecret() {
  if (EXPLICIT_AUTH_SECRET) {
    return EXPLICIT_AUTH_SECRET;
  }

  if (process.env.NODE_ENV !== "production") {
    return DEV_AUTH_SECRET_FALLBACK;
  }

  return undefined;
}
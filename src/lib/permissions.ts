const ADMIN_ROLES = ["superadmin", "editor", "curador", "moderador_comunitario"];
const ADMIN_PERMISSIONS = ["blog.create", "blog.publish", "acervo.review", "eventos.manage", "forum.moderate"];
const ROLE_ALIASES: Record<string, string> = {
  gestor_educacional: "gestor",
  comunicador: "equipe_comunicacao",
  parceiro: "apoiador",
  equipe: "equipe_producao",
};

type AuthShape = unknown;

function getObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null;
  return value as Record<string, unknown>;
}

function toArray(value: string[] | null | undefined) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

export function extractRoles(subject: AuthShape): string[] {
  const obj = getObject(subject);
  const user = getObject(obj?.user);
  const directRoles = toArray((obj?.roles as string[] | undefined) ?? undefined);
  const userRoles = toArray((user?.roles as string[] | undefined) ?? undefined);
  return [...new Set([...directRoles, ...userRoles])];
}

export function extractPermissions(subject: AuthShape): string[] {
  const obj = getObject(subject);
  const user = getObject(obj?.user);
  const directPermissions = toArray((obj?.permissions as string[] | undefined) ?? undefined);
  const userPermissions = toArray((user?.permissions as string[] | undefined) ?? undefined);
  return [...new Set([...directPermissions, ...userPermissions])];
}

export function hasRole(subject: AuthShape, role: string): boolean {
  return extractRoles(subject).includes(role);
}

export function hasAnyRole(subject: AuthShape, roles: string[]): boolean {
  const current = extractRoles(subject);
  return roles.some((role) => current.includes(role));
}

export function hasPermission(subject: AuthShape, permission: string): boolean {
  const permissions = extractPermissions(subject);
  return permissions.includes("*") || permissions.includes(permission);
}

export function normalizeRole(role: string | null | undefined): string | null {
  if (!role) return null;
  return ROLE_ALIASES[role] ?? role;
}

export function getExperienceRoles(subject: AuthShape): string[] {
  return [...new Set(extractRoles(subject).map((role) => normalizeRole(role)).filter((role): role is string => Boolean(role)))];
}

export function getPrimaryRole(subject: AuthShape): string | null {
  const obj = getObject(subject);
  const user = getObject(obj?.user);
  const directPrimaryRole = typeof obj?.primaryRole === "string" ? obj.primaryRole : null;
  const userPrimaryRole = typeof user?.primaryRole === "string" ? user.primaryRole : null;

  return normalizeRole(directPrimaryRole || userPrimaryRole || extractRoles(subject)[0] || null);
}

export function needsProfileOnboarding(subject: AuthShape): boolean {
  if (canAccessAdmin(subject)) return false;
  return !getPrimaryRole(subject);
}

export function canAccessAdmin(subject: AuthShape): boolean {
  const obj = getObject(subject);
  const user = getObject(obj?.user);
  const legacyAdmin = Boolean(obj?.isAdmin || user?.isAdmin);
  return legacyAdmin || hasAnyRole(subject, ADMIN_ROLES) || ADMIN_PERMISSIONS.some((permission) => hasPermission(subject, permission));
}

export function getDefaultAuthenticatedPath(subject: AuthShape): string {
  if (canAccessAdmin(subject)) return "/admin";
  if (needsProfileOnboarding(subject)) return "/app/boas-vindas";

  const obj = getObject(subject);
  const user = getObject(obj?.user);
  const rawPrimaryRole = typeof user?.primaryRole === "string"
    ? user.primaryRole
    : typeof obj?.primaryRole === "string"
      ? obj.primaryRole
      : null;

  if (
    hasRole(subject, "gestor_educacional")
    && (rawPrimaryRole === "gestor_educacional" || !hasRole(subject, "gestor"))
  ) {
    return "/app/gestor-educacional";
  }

  const primaryRole = getPrimaryRole(subject);

  switch (primaryRole) {
    case "equipe_comunicacao":
      return "/app/equipe-comunicacao";
    case "equipe_producao":
      return "/app/equipe-producao";
    case "gestor":
      return "/app/gestor";
    case "professor":
      return "/app/professor";
    case "estudante":
      return "/app/estudante";
    case "bolsista":
      return "/app/bolsista";
    case "voluntario":
      return "/app/voluntario";
    case "apoiador":
      return "/app/apoiador";
    case "comunidade":
      return "/app/perfil";
    case "parceiro":
    case "comunicador":
    case "gestor_educacional":
      return "/app/perfil";
    default:
      return "/app/perfil";
  }
}

export { ADMIN_PERMISSIONS, ADMIN_ROLES, ROLE_ALIASES };

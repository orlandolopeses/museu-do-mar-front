import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { canAccessAdmin, hasAnyRole, hasPermission } from "@/lib/permissions";

const PROFESSOR_ACCESS_ROLES = ["professor", "superadmin", "editor", "gestor_educacional"];
const ESTUDANTE_ACCESS_ROLES = ["estudante", "professor", "superadmin"];
const GESTOR_ACCESS_ROLES = ["gestor", "gestor_educacional", "superadmin"];
const BOLSISTA_ACCESS_ROLES = ["bolsista", "superadmin", "gestor", "gestor_educacional"];
const VOLUNTARIO_ACCESS_ROLES = ["voluntario", "superadmin", "gestor", "equipe_producao"];
const APOIADOR_ACCESS_ROLES = ["apoiador", "parceiro", "superadmin", "gestor"];
const EQUIPE_PRODUCAO_ACCESS_ROLES = ["equipe_producao", "equipe", "gestor", "superadmin"];
const EQUIPE_COMUNICACAO_ACCESS_ROLES = ["equipe_comunicacao", "comunicador", "editor", "superadmin"];

export async function requireSession() {
  const session = await auth();

  if (!session) {
    redirect("/admin/login");
  }

  return session;
}

export async function requireAdminAccess() {
  const session = await requireSession();

  if (!canAccessAdmin(session)) {
    redirect("/");
  }

  return session;
}

export async function requireAdminPermission(permission: string | string[]) {
  const session = await requireAdminAccess();
  const permissions = Array.isArray(permission) ? permission : [permission];

  if (!permissions.some((item) => hasPermission(session, item))) {
    redirect("/admin");
  }

  return session;
}

export async function requireAnyRoleAccess(roles: string[], fallbackPath = "/app/perfil") {
  const session = await requireSession();

  if (!hasAnyRole(session, roles)) {
    redirect(fallbackPath);
  }

  return session;
}

export async function requireProfessorAccess() {
  return requireAnyRoleAccess(PROFESSOR_ACCESS_ROLES, "/app/perfil");
}

export async function requireStudentAccess() {
  return requireAnyRoleAccess(ESTUDANTE_ACCESS_ROLES, "/app/perfil");
}

export async function requireGestorAccess() {
  return requireAnyRoleAccess(GESTOR_ACCESS_ROLES, "/app/perfil");
}

export async function requireScholarAccess() {
  return requireAnyRoleAccess(BOLSISTA_ACCESS_ROLES, "/app/perfil");
}

export async function requireVolunteerAccess() {
  return requireAnyRoleAccess(VOLUNTARIO_ACCESS_ROLES, "/app/perfil");
}

export async function requireSupporterAccess() {
  return requireAnyRoleAccess(APOIADOR_ACCESS_ROLES, "/app/perfil");
}

export async function requireProductionAccess() {
  return requireAnyRoleAccess(EQUIPE_PRODUCAO_ACCESS_ROLES, "/app/perfil");
}

export async function requireCommunicationAccess() {
  return requireAnyRoleAccess(EQUIPE_COMUNICACAO_ACCESS_ROLES, "/app/perfil");
}

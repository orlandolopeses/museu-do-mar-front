import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { getAccessibleInstitutionIds } from "@/lib/institution-access";
import { hasAnyRole } from "@/lib/permissions";
import { atividadesTurma, matriculasTurma } from "@/lib/schema";

type AuthShape = unknown;

type TurmaAccessTarget = {
  responsavelUserId: string | null;
  instituicaoId: string;
};

function getObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null;
  return value as Record<string, unknown>;
}

function getUserId(subject: AuthShape) {
  const obj = getObject(subject);
  const user = getObject(obj?.user);
  return typeof user?.id === "string" ? user.id : null;
}

export async function resolveEducationalAccess(subject: AuthShape) {
  const userId = getUserId(subject);
  const canManageAllTurmas = hasAnyRole(subject, ["superadmin", "editor"]);
  const canManageInstitutionTurmas = canManageAllTurmas || hasAnyRole(subject, ["gestor_educacional"]);
  const accessibleInstitutionIds = canManageInstitutionTurmas && userId
    ? await getAccessibleInstitutionIds(userId, canManageAllTurmas)
    : [];

  return {
    userId,
    canManageAllTurmas,
    canManageInstitutionTurmas,
    accessibleInstitutionIds,
    accessibleInstitutionIdSet: new Set(accessibleInstitutionIds),
  };
}

export function canAccessTurma(scope: Awaited<ReturnType<typeof resolveEducationalAccess>>, target: TurmaAccessTarget) {
  if (scope.canManageAllTurmas) {
    return true;
  }

  if (scope.userId && target.responsavelUserId === scope.userId) {
    return true;
  }

  return scope.canManageInstitutionTurmas && scope.accessibleInstitutionIdSet.has(target.instituicaoId);
}

export async function resolveStudentActivityAccess(userId: string, activityId: string) {
  const [activity] = await db
    .select({ id: atividadesTurma.id, turmaId: atividadesTurma.turmaId, status: atividadesTurma.status })
    .from(atividadesTurma)
    .where(eq(atividadesTurma.id, activityId))
    .limit(1);

  if (!activity) {
    return { activity: null, enrollment: null };
  }

  const [enrollment] = await db
    .select({ id: matriculasTurma.id })
    .from(matriculasTurma)
    .where(
      and(
        eq(matriculasTurma.userId, userId),
        eq(matriculasTurma.turmaId, activity.turmaId),
        eq(matriculasTurma.status, "ativo"),
      ),
    )
    .limit(1);

  return { activity, enrollment: enrollment ?? null };
}
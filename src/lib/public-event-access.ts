import { and, asc, count, eq, gte, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { getAccessibleInstitutionIds } from "@/lib/institution-access";
import { eventos } from "@/lib/schema";

type UpcomingEventListItem = {
  id: string;
  titulo: string;
  dataInicio: Date;
  local: string | null;
};

export async function getUpcomingPublicEventsForUser(options: {
  userId: string;
  canViewAllInstitutions: boolean;
  limit: number;
}) {
  const { userId, canViewAllInstitutions, limit } = options;
  const now = new Date();
  const institutionIds = canViewAllInstitutions
    ? []
    : await getAccessibleInstitutionIds(userId, false);

  const shouldScopeByInstitution = !canViewAllInstitutions && institutionIds.length > 0;

  const [upcomingEventsCount] = canViewAllInstitutions
    ? await db
        .select({ value: count() })
        .from(eventos)
        .where(and(eq(eventos.publicado, true), gte(eventos.dataInicio, now)))
    : shouldScopeByInstitution
      ? await db
          .select({ value: count() })
          .from(eventos)
          .where(and(eq(eventos.publicado, true), gte(eventos.dataInicio, now), inArray(eventos.instituicaoId, institutionIds)))
      : await db
          .select({ value: count() })
          .from(eventos)
          .where(and(eq(eventos.publicado, true), gte(eventos.dataInicio, now)));

  const upcomingAgenda: UpcomingEventListItem[] = canViewAllInstitutions
    ? await db
        .select({ id: eventos.id, titulo: eventos.titulo, dataInicio: eventos.dataInicio, local: eventos.local })
        .from(eventos)
        .where(and(eq(eventos.publicado, true), gte(eventos.dataInicio, now)))
        .orderBy(asc(eventos.dataInicio))
        .limit(limit)
    : shouldScopeByInstitution
      ? await db
          .select({ id: eventos.id, titulo: eventos.titulo, dataInicio: eventos.dataInicio, local: eventos.local })
          .from(eventos)
          .where(and(eq(eventos.publicado, true), gte(eventos.dataInicio, now), inArray(eventos.instituicaoId, institutionIds)))
          .orderBy(asc(eventos.dataInicio))
          .limit(limit)
      : await db
          .select({ id: eventos.id, titulo: eventos.titulo, dataInicio: eventos.dataInicio, local: eventos.local })
          .from(eventos)
          .where(and(eq(eventos.publicado, true), gte(eventos.dataInicio, now)))
          .orderBy(asc(eventos.dataInicio))
          .limit(limit);

  return {
    upcomingEventsCount: upcomingEventsCount?.value ?? 0,
    upcomingAgenda,
    isInstitutionScoped: shouldScopeByInstitution,
  };
}
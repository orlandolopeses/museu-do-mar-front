import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { acompanhamentosJornada, eventos, instituicoes, profiles, userInstituicoes, users } from "@/lib/schema";

export const SECONDARY_JOURNEY_ORIGINS = ["bolsista", "voluntario", "equipe-producao"] as const;
export const SECONDARY_JOURNEY_TRACKING_STATUSES = ["aberto", "em_andamento", "concluido"] as const;

export type SecondaryJourneyOrigin = (typeof SECONDARY_JOURNEY_ORIGINS)[number];
export type SecondaryJourneyTrackingStatus = (typeof SECONDARY_JOURNEY_TRACKING_STATUSES)[number];

export const secondaryJourneyOriginMeta: Record<SecondaryJourneyOrigin, { label: string; path: string }> = {
  bolsista: {
    label: "Bolsista",
    path: "/app/bolsista",
  },
  voluntario: {
    label: "Voluntário",
    path: "/app/voluntario",
  },
  "equipe-producao": {
    label: "Equipe de Produção",
    path: "/app/equipe-producao",
  },
};

const secondaryJourneyTrackingStatusLabels: Record<SecondaryJourneyTrackingStatus, string> = {
  aberto: "Aberto",
  em_andamento: "Em andamento",
  concluido: "Concluído",
};

export function isSecondaryJourneyOrigin(value: string): value is SecondaryJourneyOrigin {
  return SECONDARY_JOURNEY_ORIGINS.includes(value as SecondaryJourneyOrigin);
}

export function isSecondaryJourneyTrackingStatus(value: string): value is SecondaryJourneyTrackingStatus {
  return SECONDARY_JOURNEY_TRACKING_STATUSES.includes(value as SecondaryJourneyTrackingStatus);
}

export function getSecondaryJourneyPath(origin: SecondaryJourneyOrigin) {
  return secondaryJourneyOriginMeta[origin].path;
}

export function getSecondaryJourneyTrackingStatusLabel(status: SecondaryJourneyTrackingStatus) {
  return secondaryJourneyTrackingStatusLabels[status];
}

function toDate(value: Date | string | null | undefined) {
  if (!value) {
    return null;
  }

  return value instanceof Date ? value : new Date(value);
}

export async function getRecentSecondaryJourneyTrackings(options: {
  origin: SecondaryJourneyOrigin;
  userId: string;
  limit?: number;
}) {
  const { origin, userId, limit = 3 } = options;

  return db
    .select({
      id: acompanhamentosJornada.id,
      titulo: acompanhamentosJornada.titulo,
      resumo: acompanhamentosJornada.resumo,
      proximoPasso: acompanhamentosJornada.proximoPasso,
      apoioNecessario: acompanhamentosJornada.apoioNecessario,
      status: acompanhamentosJornada.status,
      createdAt: acompanhamentosJornada.createdAt,
      updatedAt: acompanhamentosJornada.updatedAt,
      eventoTitulo: eventos.titulo,
    })
    .from(acompanhamentosJornada)
    .leftJoin(eventos, eq(acompanhamentosJornada.referenciaEventoId, eventos.id))
    .where(and(eq(acompanhamentosJornada.origem, origin), eq(acompanhamentosJornada.userId, userId)))
    .orderBy(desc(acompanhamentosJornada.updatedAt), desc(acompanhamentosJornada.createdAt))
    .limit(limit);
}

export async function getSecondaryJourneyTrackingOverview(options: {
  userIds: string[];
  institutionIds?: string[];
  updatedSince?: Date | null;
  origin?: SecondaryJourneyOrigin | null;
  status?: SecondaryJourneyTrackingStatus | null;
  limit?: number;
}) {
  const {
    userIds,
    institutionIds,
    updatedSince = null,
    origin = null,
    status = null,
    limit = 6,
  } = options;

  if (userIds.length === 0) {
    return {
      total: 0,
      staleCount: 0,
      updatedLast14Days: 0,
      apoioCount: 0,
      statusSummary: {
        aberto: 0,
        em_andamento: 0,
        concluido: 0,
      },
      originSummary: SECONDARY_JOURNEY_ORIGINS.map((origin) => ({
        origin,
        label: secondaryJourneyOriginMeta[origin].label,
        path: secondaryJourneyOriginMeta[origin].path,
        total: 0,
        apoioCount: 0,
        statusSummary: {
          aberto: 0,
          em_andamento: 0,
          concluido: 0,
        },
      })),
      recentTrackings: [] as Array<{
        id: string;
        origin: SecondaryJourneyOrigin;
        titulo: string;
        resumo: string;
        proximoPasso: string | null;
        apoioNecessario: string | null;
        status: SecondaryJourneyTrackingStatus;
        createdAt: Date;
        updatedAt: Date;
        eventoTitulo: string | null;
        userId: string;
        userName: string;
        userEmail: string;
        profileType: string | null;
        instituicoes: string[];
      }>,
    };
  }

  const updatedSinceDate = toDate(updatedSince);
  const conditions = [inArray(acompanhamentosJornada.userId, userIds)];
  if (origin) {
    conditions.push(eq(acompanhamentosJornada.origem, origin));
  }
  if (status) {
    conditions.push(eq(acompanhamentosJornada.status, status));
  }

  const staleThresholdDate = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

  const trackingRows = await db
    .select({
      id: acompanhamentosJornada.id,
      origin: acompanhamentosJornada.origem,
      titulo: acompanhamentosJornada.titulo,
      resumo: acompanhamentosJornada.resumo,
      proximoPasso: acompanhamentosJornada.proximoPasso,
      apoioNecessario: acompanhamentosJornada.apoioNecessario,
      status: acompanhamentosJornada.status,
      createdAt: acompanhamentosJornada.createdAt,
      updatedAt: acompanhamentosJornada.updatedAt,
      eventoTitulo: eventos.titulo,
      userId: users.id,
      userName: users.name,
      userEmail: users.email,
      profileType: profiles.profileType,
    })
    .from(acompanhamentosJornada)
    .innerJoin(users, eq(acompanhamentosJornada.userId, users.id))
    .leftJoin(profiles, eq(profiles.userId, users.id))
    .leftJoin(eventos, eq(acompanhamentosJornada.referenciaEventoId, eventos.id))
    .where(conditions.length === 1 ? conditions[0] : and(...conditions))
    .orderBy(desc(acompanhamentosJornada.updatedAt), desc(acompanhamentosJornada.createdAt));

  const trackingUserIds = [...new Set(trackingRows.map((tracking) => tracking.userId))];
  const institutionLinks = trackingUserIds.length > 0
    ? await db
        .select({
          userId: userInstituicoes.userId,
          instituicaoId: userInstituicoes.instituicaoId,
          instituicaoNome: instituicoes.nome,
          isPrimary: userInstituicoes.isPrimary,
        })
        .from(userInstituicoes)
        .innerJoin(instituicoes, eq(userInstituicoes.instituicaoId, instituicoes.id))
        .where(
          inArray(userInstituicoes.userId, trackingUserIds),
        )
        .orderBy(desc(userInstituicoes.isPrimary), instituicoes.nome)
    : [];

  const filteredInstitutionIds = institutionIds && institutionIds.length > 0
    ? new Set(institutionIds)
    : null;
  const institutionNamesByUser = new Map<string, string[]>();
  const institutionScopeByUser = new Map<string, Set<string>>();
  for (const link of institutionLinks) {
    if (filteredInstitutionIds && !filteredInstitutionIds.has(link.instituicaoId)) {
      continue;
    }

    const current = institutionNamesByUser.get(link.userId) ?? [];
    current.push(link.instituicaoNome);
    institutionNamesByUser.set(link.userId, current);

    const scopedIds = institutionScopeByUser.get(link.userId) ?? new Set<string>();
    scopedIds.add(link.instituicaoId);
    institutionScopeByUser.set(link.userId, scopedIds);
  }

  const scopedTrackings = trackingRows.filter((tracking) => {
    const updatedAt = toDate(tracking.updatedAt);
    if (updatedSinceDate && updatedAt && updatedAt < updatedSinceDate) {
      return false;
    }

    if (filteredInstitutionIds) {
      return (institutionScopeByUser.get(tracking.userId)?.size ?? 0) > 0;
    }

    return true;
  });

  const recentTrackings = scopedTrackings
    .map((tracking) => ({
    ...tracking,
    instituicoes: institutionNamesByUser.get(tracking.userId) ?? [],
    }))
    .slice(0, limit);

  const statusSummary = scopedTrackings.reduce(
    (acc, tracking) => {
      acc[tracking.status] += 1;
      return acc;
    },
    {
      aberto: 0,
      em_andamento: 0,
      concluido: 0,
    } as Record<SecondaryJourneyTrackingStatus, number>,
  );

  const originSummary = SECONDARY_JOURNEY_ORIGINS.map((origin) => {
    const originTrackings = scopedTrackings.filter((tracking) => tracking.origin === origin);
    const originStatusSummary = originTrackings.reduce(
      (acc, tracking) => {
        acc[tracking.status] += 1;
        return acc;
      },
      {
        aberto: 0,
        em_andamento: 0,
        concluido: 0,
      } as Record<SecondaryJourneyTrackingStatus, number>,
    );
    const originApoioCount = originTrackings.filter(
      (tracking) => tracking.status !== "concluido" && Boolean(tracking.apoioNecessario?.trim()),
    ).length;

    return {
      origin,
      label: secondaryJourneyOriginMeta[origin].label,
      path: secondaryJourneyOriginMeta[origin].path,
      total: Object.values(originStatusSummary).reduce((sum, value) => sum + value, 0),
      apoioCount: originApoioCount,
      statusSummary: originStatusSummary,
    };
  });

  const staleCount = scopedTrackings.filter((tracking) => {
    const updatedAt = toDate(tracking.updatedAt);
    return tracking.status !== "concluido" && Boolean(updatedAt && updatedAt < staleThresholdDate);
  }).length;

  const updatedLast14Days = scopedTrackings.filter((tracking) => {
    const updatedAt = toDate(tracking.updatedAt);
    return Boolean(updatedAt && updatedAt >= staleThresholdDate);
  }).length;

  const apoioCount = scopedTrackings.filter(
    (tracking) => tracking.status !== "concluido" && Boolean(tracking.apoioNecessario?.trim()),
  ).length;

  return {
    total: scopedTrackings.length,
    staleCount,
    updatedLast14Days,
    apoioCount,
    statusSummary,
    originSummary,
    recentTrackings,
  };
}
import Link from "next/link";
import { and, count, desc, eq, gte } from "drizzle-orm";
import { db } from "@/lib/db";
import { requireGestorAccess } from "@/lib/access";
import { CopyTextButton } from "@/components/ui/CopyTextButton";
import { buildMailtoLink, buildOperationalWhatsAppShareText, buildWhatsAppShareLink } from "@/lib/gestor-sharing";
import { getAccessibleInstitutions } from "@/lib/institution-access";
import { extractRoles } from "@/lib/permissions";
import {
  getSecondaryJourneyTrackingOverview,
  getSecondaryJourneyTrackingStatusLabel,
  isSecondaryJourneyOrigin,
  isSecondaryJourneyTrackingStatus,
  secondaryJourneyOriginMeta,
  SECONDARY_JOURNEY_ORIGINS,
  SECONDARY_JOURNEY_TRACKING_STATUSES,
  type SecondaryJourneyOrigin,
  type SecondaryJourneyTrackingStatus,
} from "@/lib/secondary-journey-tracking";
import { acervo, atividadesTurma, eventos, matriculasTurma, posts, profiles, turmas, userInstituicoes, users } from "@/lib/schema";
import { getActivityUrgency } from "@/lib/activity-urgency";
import { formatDate } from "@/lib/utils";
import { AlertTriangle, ArrowRight, BookOpen, Building2, Camera, ClipboardList, Download, Filter, LineChart, Mail, MessageSquareShare, School, ScrollText, Users } from "lucide-react";

const profileLabelMap: Record<string, string> = {
  professor: "Professor",
  estudante: "Estudante",
  gestor: "Gestor",
  gestor_educacional: "Gestor educacional",
  comunidade: "Comunidade",
  parceiro: "Parceiro",
  apoiador: "Apoiador",
  comunicador: "Comunicador",
  equipe: "Equipe",
  equipe_producao: "Equipe de Produção",
  equipe_comunicacao: "Equipe de Comunicação",
  bolsista: "Bolsista",
  voluntario: "Voluntário",
  sem_perfil: "Sem perfil principal",
};

const periodOptions = [
  { value: "30d", label: "Últimos 30 dias", shortLabel: "30 dias", days: 30 },
  { value: "90d", label: "Últimos 90 dias", shortLabel: "90 dias", days: 90 },
  { value: "365d", label: "Últimos 12 meses", shortLabel: "12 meses", days: 365 },
  { value: "todos", label: "Todo o histórico", shortLabel: "histórico completo", days: null },
] as const;

type PeriodFilter = (typeof periodOptions)[number]["value"];

type SearchParamsInput = Promise<Record<string, string | string[] | undefined>>;

type DashboardFilters = {
  periodo: PeriodFilter;
  instituicaoId: string | null;
  responsavelId: string | null;
  secondaryJourneyOrigin: SecondaryJourneyOrigin | null;
  secondaryJourneyStatus: SecondaryJourneyTrackingStatus | null;
};

function parseSingleSearchParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function resolveFilters(
  params: Record<string, string | string[] | undefined>,
  allowedInstitutionIds: Set<string>,
  canViewAllInstitutions: boolean,
): DashboardFilters {
  const requestedPeriod = parseSingleSearchParam(params.periodo);
  const requestedInstitution = parseSingleSearchParam(params.instituicao);
  const availablePeriods = new Set<PeriodFilter>(periodOptions.map((option) => option.value));
  const requestedInstitutionAllowed = requestedInstitution && requestedInstitution !== "todas"
    ? canViewAllInstitutions || allowedInstitutionIds.has(requestedInstitution)
    : false;

  return {
    periodo: requestedPeriod && availablePeriods.has(requestedPeriod as PeriodFilter)
      ? requestedPeriod as PeriodFilter
      : "90d",
    instituicaoId: requestedInstitutionAllowed ? requestedInstitution : null,
    responsavelId: (() => {
      const requestedResponsible = parseSingleSearchParam(params.responsavel);
      return requestedResponsible && requestedResponsible !== "todos" ? requestedResponsible : null;
    })(),
    secondaryJourneyOrigin: (() => {
      const requestedOrigin = parseSingleSearchParam(params.jornada);
      return requestedOrigin && requestedOrigin !== "todas" && isSecondaryJourneyOrigin(requestedOrigin)
        ? requestedOrigin
        : null;
    })(),
    secondaryJourneyStatus: (() => {
      const requestedStatus = parseSingleSearchParam(params.checkpointStatus);
      return requestedStatus && requestedStatus !== "todos" && isSecondaryJourneyTrackingStatus(requestedStatus)
        ? requestedStatus
        : null;
    })(),
  };
}

function buildDashboardHref(filters: {
  periodo: PeriodFilter;
  instituicaoId?: string | null;
  responsavelId?: string | null;
  secondaryJourneyOrigin?: SecondaryJourneyOrigin | null;
  secondaryJourneyStatus?: SecondaryJourneyTrackingStatus | null;
}) {
  const params = new URLSearchParams({ periodo: filters.periodo });
  if (filters.instituicaoId) {
    params.set("instituicao", filters.instituicaoId);
  }
  if (filters.responsavelId) {
    params.set("responsavel", filters.responsavelId);
  }
  if (filters.secondaryJourneyOrigin) {
    params.set("jornada", filters.secondaryJourneyOrigin);
  }
  if (filters.secondaryJourneyStatus) {
    params.set("checkpointStatus", filters.secondaryJourneyStatus);
  }
  return `/app/gestor?${params.toString()}`;
}

function getPeriodConfig(periodo: PeriodFilter) {
  return periodOptions.find((option) => option.value === periodo) ?? periodOptions[1];
}

function getWindowStart(now: Date, periodo: PeriodFilter) {
  const config = getPeriodConfig(periodo);
  if (!config.days) {
    return null;
  }

  return new Date(now.getTime() - (config.days * 24 * 60 * 60 * 1000));
}

function getWindowEnd(now: Date, periodo: PeriodFilter) {
  const config = getPeriodConfig(periodo);
  if (!config.days) {
    return null;
  }

  return new Date(now.getTime() + (config.days * 24 * 60 * 60 * 1000));
}

function getProfileLabel(profileType: string | null | undefined) {
  if (!profileType) {
    return profileLabelMap.sem_perfil;
  }

  return profileLabelMap[profileType] ?? profileType.replaceAll("_", " ");
}

function getParticipantContext(profile: {
  schoolName: string | null;
  institutionName: string | null;
  city: string | null;
  state: string | null;
} | undefined) {
  if (!profile) {
    return "Vínculo ainda não informado";
  }

  if (profile.schoolName) {
    return profile.schoolName;
  }

  if (profile.institutionName) {
    return profile.institutionName;
  }

  if (profile.city && profile.state) {
    return `${profile.city}/${profile.state}`;
  }

  if (profile.city || profile.state) {
    return profile.city ?? profile.state ?? "Vínculo ainda não informado";
  }

  return "Vínculo ainda não informado";
}

function getParticipantReferenceDate(user: { lastLoginAt: Date | null; createdAt: Date }) {
  return user.lastLoginAt ?? user.createdAt;
}

function getDaysSince(date: Date) {
  const diff = Date.now() - date.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function isWithinDays(date: Date, days: number) {
  return getDaysSince(date) <= days;
}

function isInsideWindow(date: Date | null, start: Date | null, end: Date | null) {
  if (!date) {
    return start === null && end === null;
  }

  if (start && date < start) {
    return false;
  }

  if (end && date > end) {
    return false;
  }

  return true;
}

async function getDashboardData(
  filters: DashboardFilters,
  viewer: { userId: string; canViewAllInstitutions: boolean },
) {
  const now = new Date();
  const windowStart = getWindowStart(now, filters.periodo);
  const windowEnd = getWindowEnd(now, filters.periodo);

  const [postsCountResult] = await db.select({ value: count() }).from(posts).where(eq(posts.status, "publicado"));
  const [acervoCountResult] = await db.select({ value: count() }).from(acervo).where(eq(acervo.publicado, true));

  const institutionOptions = await getAccessibleInstitutions(viewer.userId, viewer.canViewAllInstitutions);
  const visibleInstitutionIds = new Set(institutionOptions.map((institution) => institution.id));

  const selectedInstitution = filters.instituicaoId
    ? institutionOptions.find((item) => item.id === filters.instituicaoId) ?? null
    : null;

  const activeUsers = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      primaryRole: users.primaryRole,
      lastLoginAt: users.lastLoginAt,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.status, "ativo"))
    .orderBy(desc(users.createdAt));

  const profileRows = await db
    .select({
      userId: profiles.userId,
      displayName: profiles.displayName,
      profileType: profiles.profileType,
      institutionName: profiles.institutionName,
      schoolName: profiles.schoolName,
      city: profiles.city,
      state: profiles.state,
    })
    .from(profiles);

  const institutionLinks = await db
    .select({ instituicaoId: userInstituicoes.instituicaoId, userId: userInstituicoes.userId })
    .from(userInstituicoes);

  const turmaRows = await db
    .select({
      id: turmas.id,
      instituicaoId: turmas.instituicaoId,
      nome: turmas.nome,
      anoLetivo: turmas.anoLetivo,
      segmento: turmas.segmento,
      turno: turmas.turno,
      responsavelUserId: turmas.responsavelUserId,
      createdAt: turmas.createdAt,
    })
    .from(turmas)
    .where(eq(turmas.ativo, true))
    .orderBy(desc(turmas.createdAt));

  const activityRows = await db
    .select({
      id: atividadesTurma.id,
      turmaId: atividadesTurma.turmaId,
      titulo: atividadesTurma.titulo,
      foco: atividadesTurma.foco,
      proximoPasso: atividadesTurma.proximoPasso,
      status: atividadesTurma.status,
      updatedAt: atividadesTurma.updatedAt,
    })
    .from(atividadesTurma)
    .orderBy(desc(atividadesTurma.updatedAt));

  const matriculaRows = await db
    .select({ turmaId: matriculasTurma.turmaId, userId: matriculasTurma.userId })
    .from(matriculasTurma)
    .where(eq(matriculasTurma.status, "ativo"));

  const futureEventRows = await db
    .select({
      id: eventos.id,
      titulo: eventos.titulo,
      dataInicio: eventos.dataInicio,
      local: eventos.local,
      instituicaoId: eventos.instituicaoId,
    })
    .from(eventos)
    .where(and(eq(eventos.publicado, true), gte(eventos.dataInicio, now)))
    .orderBy(eventos.dataInicio)
    .limit(24);

  const profileByUserId = new Map(profileRows.map((profile) => [profile.userId, profile]));

  const institutionIdsByUser = new Map<string, Set<string>>();
  for (const link of institutionLinks) {
    const current = institutionIdsByUser.get(link.userId) ?? new Set<string>();
    current.add(link.instituicaoId);
    institutionIdsByUser.set(link.userId, current);
  }

  const filteredUsers = activeUsers.filter((user) => {
    const userInstitutionIds = institutionIdsByUser.get(user.id) ?? new Set<string>();
    const isInVisibleScope = viewer.canViewAllInstitutions
      ? true
      : Array.from(userInstitutionIds).some((institutionId) => visibleInstitutionIds.has(institutionId));
    const institutionMatch = selectedInstitution
      ? userInstitutionIds.has(selectedInstitution.id)
      : isInVisibleScope;
    const activityDate = getParticipantReferenceDate(user);
    const periodMatch = isInsideWindow(activityDate, windowStart, null);

    return isInVisibleScope && institutionMatch && periodMatch;
  });

  const filteredUserIds = new Set(filteredUsers.map((user) => user.id));
  const activeMembersByTurma = new Map<string, Set<string>>();
  for (const matricula of matriculaRows) {
    if (!filteredUserIds.has(matricula.userId)) {
      continue;
    }

    const current = activeMembersByTurma.get(matricula.turmaId) ?? new Set<string>();
    current.add(matricula.userId);
    activeMembersByTurma.set(matricula.turmaId, current);
  }

  const baseFilteredTurmas = turmaRows.filter((turma) => {
    const isInVisibleScope = viewer.canViewAllInstitutions || visibleInstitutionIds.has(turma.instituicaoId);
    const institutionMatch = !selectedInstitution || turma.instituicaoId === selectedInstitution.id;

    return isInVisibleScope && institutionMatch;
  });
  const baseResponsibleIds = [...new Set(baseFilteredTurmas.map((turma) => turma.responsavelUserId).filter((value): value is string => Boolean(value)))];
  const professorFilterOptions = baseResponsibleIds
    .map((responsavelId) => {
      const user = activeUsers.find((item) => item.id === responsavelId);
      const profile = profileByUserId.get(responsavelId);
      const turmasCount = baseFilteredTurmas.filter((turma) => turma.responsavelUserId === responsavelId).length;

      return {
        id: responsavelId,
        nome: profile?.displayName ?? user?.name ?? "Responsável pedagógico",
        email: user?.email ?? "",
        turmasCount,
      };
    })
    .sort((left, right) => {
      if (right.turmasCount !== left.turmasCount) {
        return right.turmasCount - left.turmasCount;
      }
      return left.nome.localeCompare(right.nome, "pt-BR");
    });
  const selectedResponsible = filters.responsavelId
    ? professorFilterOptions.find((option) => option.id === filters.responsavelId) ?? null
    : null;
  const filteredTurmas = selectedResponsible
    ? baseFilteredTurmas.filter((turma) => turma.responsavelUserId === selectedResponsible.id)
    : baseFilteredTurmas;
  const filteredTurmaIds = new Set(filteredTurmas.map((turma) => turma.id));
  const filteredActivities = activityRows
    .filter((activity) => filteredTurmaIds.has(activity.turmaId))
    .map((activity) => ({
      ...activity,
      urgency: getActivityUrgency(activity),
    }));

  const responsibleScopedUserIds = selectedResponsible
    ? new Set<string>([
        selectedResponsible.id,
        ...filteredTurmas.flatMap((turma) => Array.from(activeMembersByTurma.get(turma.id) ?? [])),
      ])
    : null;
  const visibleUsers = selectedResponsible
    ? filteredUsers.filter((user) => responsibleScopedUserIds?.has(user.id))
    : filteredUsers;
  const visibleUserIds = new Set(visibleUsers.map((user) => user.id));
  const secondaryJourneyOverview = await getSecondaryJourneyTrackingOverview({
    userIds: visibleUsers.map((user) => user.id),
    institutionIds: selectedInstitution ? [selectedInstitution.id] : institutionOptions.map((institution) => institution.id),
    updatedSince: windowStart,
    origin: filters.secondaryJourneyOrigin,
    status: filters.secondaryJourneyStatus,
  });
  const activeUsersCount = visibleUsers.length;

  let configuredProfilesCount = 0;
  const profileCounts = new Map<string, number>();

  for (const user of visibleUsers) {
    const profile = profileByUserId.get(user.id);
    const resolvedProfile = profile?.profileType ?? user.primaryRole ?? "sem_perfil";

    if (resolvedProfile !== "sem_perfil") {
      configuredProfilesCount += 1;
    }

    profileCounts.set(resolvedProfile, (profileCounts.get(resolvedProfile) ?? 0) + 1);
  }

  const participantsByProfile = Array.from(profileCounts.entries())
    .map(([slug, value]) => ({
      slug,
      label: getProfileLabel(slug),
      value,
      share: activeUsersCount > 0 ? Math.round((value / activeUsersCount) * 100) : 0,
    }))
    .sort((left, right) => right.value - left.value);

  const participantsByInstitution = new Map<string, Set<string>>();
  for (const link of institutionLinks) {
    if (!visibleUserIds.has(link.userId)) {
      continue;
    }

    const current = participantsByInstitution.get(link.instituicaoId) ?? new Set<string>();
    current.add(link.userId);
    participantsByInstitution.set(link.instituicaoId, current);
  }

  const turmasHighlights = filteredTurmas
    .map((turma) => ({
      ...turma,
      activeMembersCount: activeMembersByTurma.get(turma.id)?.size ?? 0,
    }))
    .sort((left, right) => right.activeMembersCount - left.activeMembersCount)
    .slice(0, 5);

  const institutionalNetwork = institutionOptions
    .filter((instituicao) => !selectedInstitution || instituicao.id === selectedInstitution.id)
    .map((instituicao) => ({
      ...instituicao,
      participantsCount: participantsByInstitution.get(instituicao.id)?.size ?? 0,
      turmasCount: filteredTurmas.filter((turma) => turma.instituicaoId === instituicao.id).length,
    }))
    .sort((left, right) => right.participantsCount - left.participantsCount)
    .slice(0, selectedInstitution ? 1 : 6);

  const institutionalCadence = institutionalNetwork
    .map((instituicao) => {
      const institutionTurmas = filteredTurmas.filter((turma) => turma.instituicaoId === instituicao.id);
      const institutionTurmaIds = new Set(institutionTurmas.map((turma) => turma.id));
      const institutionActivities = filteredActivities.filter((activity) => institutionTurmaIds.has(activity.turmaId));

      return {
        id: instituicao.id,
        nome: instituicao.nome,
        highPriorityCount: institutionActivities.filter((activity) => activity.urgency.level === "alta").length,
        recentUpdates30Days: institutionActivities.filter((activity) => isWithinDays(activity.updatedAt, 30)).length,
        staleCount: institutionActivities.filter((activity) => getDaysSince(activity.updatedAt) > 30 && activity.status !== "concluida").length,
        totalActivities: institutionActivities.length,
      };
    })
    .sort((left, right) => {
      if (right.highPriorityCount !== left.highPriorityCount) {
        return right.highPriorityCount - left.highPriorityCount;
      }

      return right.staleCount - left.staleCount;
    });

  const priorityInstitution = institutionalCadence.find((institution) => institution.highPriorityCount > 0) ?? null;

  // Agrega urgência por professor responsável de turma
  const professorActivityMap = new Map<string, {
    turmaIds: Set<string>;
    highPriority: number;
    attention: number;
    stale: number;
    total: number;
    lastActivityAt: Date | null;
  }>();

  for (const turma of filteredTurmas) {
    if (!turma.responsavelUserId) continue;
    const pid = turma.responsavelUserId;
    const entry = professorActivityMap.get(pid) ?? {
      turmaIds: new Set<string>(),
      highPriority: 0,
      attention: 0,
      stale: 0,
      total: 0,
      lastActivityAt: null,
    };
    entry.turmaIds.add(turma.id);
    professorActivityMap.set(pid, entry);
  }

  for (const activity of filteredActivities) {
    const turma = filteredTurmas.find((t) => t.id === activity.turmaId);
    if (!turma?.responsavelUserId) continue;
    const entry = professorActivityMap.get(turma.responsavelUserId);
    if (!entry) continue;
    entry.total += 1;
    if (activity.urgency.level === "alta") entry.highPriority += 1;
    if (activity.urgency.level === "media") entry.attention += 1;
    if (getDaysSince(activity.updatedAt) > 30 && activity.status !== "concluida") entry.stale += 1;
    if (!entry.lastActivityAt || activity.updatedAt > entry.lastActivityAt) {
      entry.lastActivityAt = activity.updatedAt;
    }
  }

  const professorSummary = Array.from(professorActivityMap.entries())
    .map(([professorId, stats]) => {
      const user = activeUsers.find((u) => u.id === professorId);
      const profile = profileByUserId.get(professorId);
      const professorTurmas = filteredTurmas.filter((turma) => stats.turmaIds.has(turma.id));
      const primaryTurma = professorTurmas
        .map((turma) => {
          const turmaActivities = filteredActivities.filter((activity) => activity.turmaId === turma.id);
          const highPriority = turmaActivities.filter((activity) => activity.urgency.level === "alta").length;
          const attention = turmaActivities.filter((activity) => activity.urgency.level === "media").length;
          const stale = turmaActivities.filter((activity) => getDaysSince(activity.updatedAt) > 30 && activity.status !== "concluida").length;

          return {
            id: turma.id,
            nome: turma.nome,
            instituicaoId: turma.instituicaoId,
            highPriority,
            attention,
            stale,
            activeMembersCount: activeMembersByTurma.get(turma.id)?.size ?? 0,
          };
        })
        .sort((left, right) => {
          if (right.highPriority !== left.highPriority) return right.highPriority - left.highPriority;
          if (right.stale !== left.stale) return right.stale - left.stale;
          if (right.attention !== left.attention) return right.attention - left.attention;
          return right.activeMembersCount - left.activeMembersCount;
        })[0] ?? null;
      const institutionStats = Array.from(new Set(professorTurmas.map((turma) => turma.instituicaoId)))
        .map((institutionId) => {
          const institutionTurmaIds = new Set(
            professorTurmas
              .filter((turma) => turma.instituicaoId === institutionId)
              .map((turma) => turma.id),
          );
          const institutionActivities = filteredActivities.filter((activity) => institutionTurmaIds.has(activity.turmaId));
          const institution = institutionOptions.find((item) => item.id === institutionId);

          return {
            id: institutionId,
            nome: institution?.nome ?? "Instituição vinculada",
            turmasCount: institutionTurmaIds.size,
            highPriority: institutionActivities.filter((activity) => activity.urgency.level === "alta").length,
            attention: institutionActivities.filter((activity) => activity.urgency.level === "media").length,
            stale: institutionActivities.filter((activity) => getDaysSince(activity.updatedAt) > 30 && activity.status !== "concluida").length,
          };
        })
        .sort((left, right) => {
          if (right.highPriority !== left.highPriority) return right.highPriority - left.highPriority;
          if (right.stale !== left.stale) return right.stale - left.stale;
          return right.attention - left.attention;
        });
      const primaryInstitution = institutionStats[0] ?? null;
      const coordinationAction = stats.highPriority > 0
        ? `${profile?.displayName ?? user?.name ?? "Professor"} precisa alinhar próximos passos com ${primaryInstitution?.nome ?? "a instituição vinculada"} para destravar atividades críticas.`
        : stats.stale > 0
          ? `${profile?.displayName ?? user?.name ?? "Professor"} precisa retomar a cadência com ${primaryInstitution?.nome ?? "a instituição vinculada"} para atualizar atividades paradas.`
          : `${profile?.displayName ?? user?.name ?? "Professor"} mantém o recorte em ritmo adequado e pode apoiar replicação de práticas entre turmas.`;

      return {
        professorId,
        name: profile?.displayName ?? user?.name ?? "Professor",
        email: user?.email ?? "",
        turmasCount: stats.turmaIds.size,
        highPriority: stats.highPriority,
        attention: stats.attention,
        stale: stats.stale,
        total: stats.total,
        lastActivityAt: stats.lastActivityAt,
        institutionStats,
        primaryInstitution,
        primaryTurma,
        coordinationAction,
      };
    })
    .sort((a, b) => {
      if (b.highPriority !== a.highPriority) return b.highPriority - a.highPriority;
      return b.stale - a.stale;
    })
    .slice(0, 8);

  const priorityProfessor = professorSummary.find((professor) => professor.highPriority > 0)
    ?? professorSummary.find((professor) => professor.stale > 0)
    ?? null;

  const recentParticipants = [...filteredUsers]
    .sort((left, right) => getParticipantReferenceDate(right).getTime() - getParticipantReferenceDate(left).getTime())
    .slice(0, 5)
    .map((user) => {
      const profile = profileByUserId.get(user.id);

      return {
        id: user.id,
        name: profile?.displayName ?? user.name,
        email: user.email,
        profileLabel: getProfileLabel(profile?.profileType ?? user.primaryRole),
        contextLabel: getParticipantContext(profile),
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
      };
    });

  const upcomingEventos = futureEventRows
    .filter((evento) => {
      const isInVisibleScope = !evento.instituicaoId || viewer.canViewAllInstitutions || visibleInstitutionIds.has(evento.instituicaoId);
      const institutionMatch = !selectedInstitution || evento.instituicaoId === selectedInstitution.id;

      return isInVisibleScope && institutionMatch;
    })
    .filter((evento) => isInsideWindow(evento.dataInicio, now, windowEnd))
    .slice(0, 4);

  const urgencySummary = {
    alta: filteredActivities.filter((activity) => activity.urgency.level === "alta").length,
    media: filteredActivities.filter((activity) => activity.urgency.level === "media").length,
    baixa: filteredActivities.filter((activity) => activity.urgency.level === "baixa").length,
  };

  const temporalSummary = {
    updatedLast30Days: filteredActivities.filter((activity) => isWithinDays(activity.updatedAt, 30)).length,
    updatedLast90Days: filteredActivities.filter((activity) => isWithinDays(activity.updatedAt, 90)).length,
    completedLast30Days: filteredActivities.filter((activity) => activity.status === "concluida" && isWithinDays(activity.updatedAt, 30)).length,
    staleOver30Days: filteredActivities.filter((activity) => getDaysSince(activity.updatedAt) > 30 && activity.status !== "concluida").length,
  };
  const turmasWithoutResponsibleCount = filteredTurmas.filter((turma) => !turma.responsavelUserId).length;

  const priorityAgendaMatches = upcomingEventos.filter((evento) => {
    const eventLabel = `${evento.titulo} ${evento.local ?? ""}`.toLowerCase();

    return filteredActivities.some((activity) => {
      if (activity.urgency.level === "baixa") {
        return false;
      }

      const focus = activity.foco?.trim().toLowerCase();
      if (!focus) {
        return false;
      }

      return eventLabel.includes(focus);
    });
  });

  const actionRecommendations = [
    urgencySummary.alta > 0
      ? {
        id: "stabilize-priority-institution",
        title: "Atuar sobre instituições com urgência pedagógica",
        description: priorityInstitution
          ? `${priorityInstitution.nome} concentra ${priorityInstitution.highPriorityCount} atividade(s) em alta prioridade. Vale abrir o detalhe institucional e coordenar próximos passos com a rede.`
          : "Há atividades críticas no recorte atual e vale priorizar coordenação imediata com a rede institucional.",
        href: priorityInstitution ? `/app/gestor/instituicoes/${priorityInstitution.id}` : "/app/gestor",
        label: priorityInstitution ? "Abrir instituição prioritária" : "Revisar painel",
        tone: "bg-rose-100 text-rose-700",
      }
      : null,
    temporalSummary.staleOver30Days > 0
      ? {
        id: "recover-stale-cadence",
        title: "Recuperar cadência de acompanhamento",
        description: `${temporalSummary.staleOver30Days} atividade(s) seguem abertas sem atualização há mais de 30 dias. Vale reativar rotina entre gestão, professorado e turmas vinculadas.`,
        href: buildDashboardHref({
          periodo: filters.periodo,
          instituicaoId: filters.instituicaoId,
          responsavelId: filters.responsavelId,
          secondaryJourneyOrigin: filters.secondaryJourneyOrigin,
          secondaryJourneyStatus: filters.secondaryJourneyStatus,
        }),
        label: "Ver cadência institucional",
        tone: "bg-amber-100 text-amber-700",
      }
      : null,
    priorityAgendaMatches.length > 0
      ? {
        id: "connect-agenda-priority",
        title: "Converter prioridade em articulação com agenda",
        description: `${priorityAgendaMatches.length} evento(s) da agenda já dialogam com atividades em atenção. Vale coordenar visita, mobilização ou devolutiva institucional.`,
        href: "/agenda",
        label: "Abrir agenda prioritária",
        tone: "bg-mar-azul/10 text-mar-azul",
      }
      : null,
    priorityProfessor
      ? {
        id: "coordinate-responsible-professor",
        title: "Acionar responsável pedagógico do recorte",
        description: priorityProfessor.coordinationAction,
        href: buildDashboardHref({
          periodo: filters.periodo,
          instituicaoId: priorityProfessor.primaryInstitution?.id ?? filters.instituicaoId,
          responsavelId: priorityProfessor.professorId,
          secondaryJourneyOrigin: filters.secondaryJourneyOrigin,
          secondaryJourneyStatus: filters.secondaryJourneyStatus,
        }),
        label: "Filtrar por responsável",
        tone: priorityProfessor.highPriority > 0 ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700",
      }
      : null,
    priorityProfessor?.primaryTurma
      ? {
        id: "open-critical-classroom",
        title: "Abrir a turma mais crítica do responsável",
        description: `${priorityProfessor.primaryTurma.nome} concentra o ponto mais urgente dentro do recorte atual e permite agir diretamente sobre atividades, agenda e responsável.`,
        href: `/app/gestor/turmas/${priorityProfessor.primaryTurma.id}`,
        label: "Abrir turma prioritária",
        tone: priorityProfessor.primaryTurma.highPriority > 0 ? "bg-rose-100 text-rose-700" : "bg-mar-cobre/10 text-mar-cobre",
      }
      : null,
    institutionalNetwork.length > 0 && filteredTurmas.length > 0 && urgencySummary.alta === 0 && temporalSummary.updatedLast30Days === 0
      ? {
        id: "restart-network-routine",
        title: "Retomar rotina mensal da rede",
        description: "Não houve atualização de atividades nos últimos 30 dias neste recorte. Vale reorganizar acompanhamento com escolas, turmas e responsáveis da rede.",
        href: buildDashboardHref({
          periodo: filters.periodo,
          instituicaoId: filters.instituicaoId,
          responsavelId: filters.responsavelId,
          secondaryJourneyOrigin: filters.secondaryJourneyOrigin,
          secondaryJourneyStatus: filters.secondaryJourneyStatus,
        }),
        label: "Revisar recorte atual",
        tone: "bg-mar-verde/10 text-mar-verde",
      }
      : null,
  ].filter((item): item is {
    id: string;
    title: string;
    description: string;
    href: string;
    label: string;
    tone: string;
  } => Boolean(item));

  const attentionPoints: string[] = [];
  if (configuredProfilesCount < activeUsersCount) {
    attentionPoints.push(`${activeUsersCount - configuredProfilesCount} participante(s) ainda sem perfil principal definido no recorte atual.`);
  }
  if (institutionalNetwork.length === 0) {
    attentionPoints.push("Nenhuma instituição ativa apareceu no recorte atual. Vale revisar vínculos e filtros aplicados.");
  }
  if (filteredTurmas.length === 0) {
    attentionPoints.push("Ainda não há turmas ativas no recorte selecionado para leitura educacional consolidada.");
  }
  if (upcomingEventos.length === 0) {
    attentionPoints.push("Não há eventos futuros dentro da janela selecionada para articulação institucional.");
  }

  if (attentionPoints.length === 0) {
    attentionPoints.push("O recorte atual apresenta base suficiente para acompanhamento institucional contínuo.");
  }

  const periodConfig = getPeriodConfig(filters.periodo);
  const scopeLabel = selectedInstitution
    ? selectedInstitution.nome
    : viewer.canViewAllInstitutions
      ? "Toda a rede ativa"
      : institutionOptions.length === 0
        ? "Sem instituições vinculadas"
        : institutionOptions.length === 1
          ? institutionOptions[0]?.nome ?? "Instituição vinculada"
          : `${institutionOptions.length} instituições vinculadas`;
  const scopeLabelWithResponsible = selectedResponsible ? `${scopeLabel} · ${selectedResponsible.nome}` : scopeLabel;
  const secondaryJourneyFilterLabels = [
    selectedResponsible ? `responsável ${selectedResponsible.nome}` : null,
    filters.secondaryJourneyOrigin ? `jornada ${secondaryJourneyOriginMeta[filters.secondaryJourneyOrigin].label}` : null,
    filters.secondaryJourneyStatus ? `status ${getSecondaryJourneyTrackingStatusLabel(filters.secondaryJourneyStatus)}` : null,
  ].filter((value): value is string => Boolean(value));
  const pedagogicalFocus = {
    institution: priorityInstitution
      ? {
          id: priorityInstitution.id,
          name: priorityInstitution.nome,
          value: `${priorityInstitution.highPriorityCount} prioridade(s) alta(s) e ${priorityInstitution.staleCount} parada(s)`,
          detail: priorityInstitution.highPriorityCount > 0
            ? "Abrir o detalhe institucional e alinhar próximos passos com a rede escolar."
            : "A rede pede retomada de cadência para evitar perda de ritmo pedagógico.",
          href: `/app/gestor/instituicoes/${priorityInstitution.id}`,
          cta: "Abrir instituição prioritária",
        }
      : selectedInstitution
        ? {
            id: selectedInstitution.id,
            name: selectedInstitution.nome,
            value: `${filteredTurmas.filter((turma) => turma.instituicaoId === selectedInstitution.id).length} turma(s) no recorte`,
            detail: "Este recorte já está focado em uma instituição específica para coordenação pedagógica.",
            href: `/app/gestor/instituicoes/${selectedInstitution.id}`,
            cta: "Abrir detalhe institucional",
          }
        : null,
    professor: priorityProfessor
      ? {
          id: priorityProfessor.professorId,
          name: priorityProfessor.name,
          value: `${priorityProfessor.turmasCount} turma(s), ${priorityProfessor.highPriority} crítica(s) e ${priorityProfessor.stale} parada(s)`,
          detail: priorityProfessor.coordinationAction,
          href: buildDashboardHref({
            periodo: filters.periodo,
            instituicaoId: priorityProfessor.primaryInstitution?.id ?? filters.instituicaoId,
            responsavelId: priorityProfessor.professorId,
            secondaryJourneyOrigin: filters.secondaryJourneyOrigin,
            secondaryJourneyStatus: filters.secondaryJourneyStatus,
          }),
          cta: "Filtrar por responsável",
        }
      : null,
    turma: priorityProfessor?.primaryTurma
      ? {
          id: priorityProfessor.primaryTurma.id,
          name: priorityProfessor.primaryTurma.nome,
          value: `${priorityProfessor.primaryTurma.highPriority} crítica(s), ${priorityProfessor.primaryTurma.attention} em atenção e ${priorityProfessor.primaryTurma.activeMembersCount} participante(s)`,
          detail: `${priorityProfessor.primaryTurma.nome} é a turma mais sensível do recorte atual e concentra o próximo movimento pedagógico recomendado.`,
          href: `/app/gestor/turmas/${priorityProfessor.primaryTurma.id}`,
          cta: "Abrir turma prioritária",
        }
      : null,
  };

  return {
    filters,
    filterOptions: {
      institutions: institutionOptions,
      periods: periodOptions,
      responsaveis: professorFilterOptions,
      secondaryJourneyOrigins: SECONDARY_JOURNEY_ORIGINS.map((origin) => ({
        value: origin,
        label: secondaryJourneyOriginMeta[origin].label,
      })),
      secondaryJourneyStatuses: SECONDARY_JOURNEY_TRACKING_STATUSES.map((status) => ({
        value: status,
        label: getSecondaryJourneyTrackingStatusLabel(status),
      })),
    },
    canViewAllInstitutions: viewer.canViewAllInstitutions,
    scopeLabel: scopeLabelWithResponsible,
    timeLabel: periodConfig.label,
    activeUsersCount,
    configuredProfilesCount,
    instituicoesCount: selectedInstitution ? 1 : institutionOptions.length,
    turmasCount: filteredTurmas.length,
    turmasWithoutResponsibleCount,
    postsCount: postsCountResult?.value ?? 0,
    acervoCount: acervoCountResult?.value ?? 0,
    eventosCount: upcomingEventos.length,
    profileCompletionRate: activeUsersCount > 0 ? Math.round((configuredProfilesCount / activeUsersCount) * 100) : 0,
    participantsByProfile,
    institutionalNetwork,
    institutionalCadence,
    recentParticipants,
    attentionPoints,
    upcomingEventos,
    turmasHighlights,
    urgencySummary,
    temporalSummary,
    priorityAgendaMatches,
    actionRecommendations,
    professorSummary,
    pedagogicalFocus,
    secondaryJourneyOverview,
    secondaryJourneyScopeNote: secondaryJourneyFilterLabels.length > 0
      ? `Este bloco está recortado por ${secondaryJourneyFilterLabels.join(" · ")}.`
      : null,
  };
}

export default async function GestorDashboardPage({
  searchParams,
}: {
  searchParams: SearchParamsInput;
}) {
  const session = await requireGestorAccess();
  const roles = extractRoles(session);
  const userId = session.user?.id ?? "";
  const canViewAllInstitutions = roles.includes("superadmin");
  const accessibleInstitutions = await getAccessibleInstitutions(userId, canViewAllInstitutions);
  const resolvedSearchParams = await searchParams;
  const data = await getDashboardData(
    resolveFilters(
      resolvedSearchParams,
      new Set(accessibleInstitutions.map((institution) => institution.id)),
      canViewAllInstitutions,
    ),
    { userId, canViewAllInstitutions },
  );
  const isEducationalManager = roles.includes("gestor_educacional");
  const dashboardCsvParams = new URLSearchParams({ period: data.filters.periodo });
  const dashboardSummaryParams = new URLSearchParams({ period: data.filters.periodo, formato: "resumo" });
  const dashboardMessageParams = new URLSearchParams({ period: data.filters.periodo, formato: "mensagem" });
  const dashboardMeetingParams = new URLSearchParams({ period: data.filters.periodo, formato: "reuniao" });
  const dashboardWhatsAppParams = new URLSearchParams({ period: data.filters.periodo, formato: "whatsapp" });
  if (data.filters.instituicaoId) {
    dashboardCsvParams.set("instituicao", data.filters.instituicaoId);
    dashboardSummaryParams.set("instituicao", data.filters.instituicaoId);
    dashboardMessageParams.set("instituicao", data.filters.instituicaoId);
    dashboardMeetingParams.set("instituicao", data.filters.instituicaoId);
    dashboardWhatsAppParams.set("instituicao", data.filters.instituicaoId);
  }
  if (data.filters.responsavelId) {
    dashboardCsvParams.set("responsavel", data.filters.responsavelId);
    dashboardSummaryParams.set("responsavel", data.filters.responsavelId);
    dashboardMessageParams.set("responsavel", data.filters.responsavelId);
    dashboardMeetingParams.set("responsavel", data.filters.responsavelId);
    dashboardWhatsAppParams.set("responsavel", data.filters.responsavelId);
  }
  if (data.filters.secondaryJourneyOrigin) {
    dashboardCsvParams.set("jornada", data.filters.secondaryJourneyOrigin);
    dashboardSummaryParams.set("jornada", data.filters.secondaryJourneyOrigin);
    dashboardMessageParams.set("jornada", data.filters.secondaryJourneyOrigin);
    dashboardMeetingParams.set("jornada", data.filters.secondaryJourneyOrigin);
    dashboardWhatsAppParams.set("jornada", data.filters.secondaryJourneyOrigin);
  }
  if (data.filters.secondaryJourneyStatus) {
    dashboardCsvParams.set("checkpointStatus", data.filters.secondaryJourneyStatus);
    dashboardSummaryParams.set("checkpointStatus", data.filters.secondaryJourneyStatus);
    dashboardMessageParams.set("checkpointStatus", data.filters.secondaryJourneyStatus);
    dashboardMeetingParams.set("checkpointStatus", data.filters.secondaryJourneyStatus);
    dashboardWhatsAppParams.set("checkpointStatus", data.filters.secondaryJourneyStatus);
  }
  const secondaryJourneyBaseHref = buildDashboardHref({
    periodo: data.filters.periodo,
    instituicaoId: data.filters.instituicaoId,
    responsavelId: data.filters.responsavelId,
  });
  const secondaryJourneyStatusFilters = [
    {
      key: "em_andamento",
      label: "Em andamento",
      value: data.secondaryJourneyOverview.statusSummary.em_andamento,
      href: buildDashboardHref({
        periodo: data.filters.periodo,
        instituicaoId: data.filters.instituicaoId,
        responsavelId: data.filters.responsavelId,
        secondaryJourneyOrigin: data.filters.secondaryJourneyOrigin,
        secondaryJourneyStatus: "em_andamento",
      }),
      active: data.filters.secondaryJourneyStatus === "em_andamento",
      tone: "bg-mar-azul/10 text-mar-azul",
      description: "Checkpoint(s) que ainda pedem acompanhamento ativo.",
    },
    {
      key: "aberto",
      label: "Abertos",
      value: data.secondaryJourneyOverview.statusSummary.aberto,
      href: buildDashboardHref({
        periodo: data.filters.periodo,
        instituicaoId: data.filters.instituicaoId,
        responsavelId: data.filters.responsavelId,
        secondaryJourneyOrigin: data.filters.secondaryJourneyOrigin,
        secondaryJourneyStatus: "aberto",
      }),
      active: data.filters.secondaryJourneyStatus === "aberto",
      tone: "bg-mar-cobre/10 text-mar-cobre",
      description: "Registros iniciados que ainda precisam ganhar ritmo.",
    },
    {
      key: "concluido",
      label: "Concluídos",
      value: data.secondaryJourneyOverview.statusSummary.concluido,
      href: buildDashboardHref({
        periodo: data.filters.periodo,
        instituicaoId: data.filters.instituicaoId,
        responsavelId: data.filters.responsavelId,
        secondaryJourneyOrigin: data.filters.secondaryJourneyOrigin,
        secondaryJourneyStatus: "concluido",
      }),
      active: data.filters.secondaryJourneyStatus === "concluido",
      tone: "bg-mar-verde/10 text-mar-verde",
      description: "Checkpoint(s) encerrados no recorte institucional atual.",
    },
  ] as const;
  const secondaryJourneyOriginFilters = data.secondaryJourneyOverview.originSummary.map((origin) => ({
    ...origin,
    href: buildDashboardHref({
      periodo: data.filters.periodo,
      instituicaoId: data.filters.instituicaoId,
      responsavelId: data.filters.responsavelId,
      secondaryJourneyOrigin: origin.origin,
      secondaryJourneyStatus: data.filters.secondaryJourneyStatus,
    }),
    active: data.filters.secondaryJourneyOrigin === origin.origin,
  }));
  const secondaryJourneyRecorteLine = data.secondaryJourneyScopeNote
    ? `Jornadas secundárias: ${data.secondaryJourneyScopeNote.replace(/^Este bloco está recortado por\s*/u, "").replace(/\.$/u, "")}.`
    : null;
  const dashboardPriorityTurmaPath = data.professorSummary[0]?.primaryTurma ? `/app/gestor/turmas/${data.professorSummary[0].primaryTurma.id}` : null;
  const dashboardShortMessage = [
    "Síntese rápida do painel do gestor",
    `Escopo: ${data.scopeLabel}`,
    `Janela: ${data.timeLabel}`,
    "Estado do produto: operação publicada e aprofundamento educacional em curso.",
    secondaryJourneyRecorteLine,
    `Estado: ${data.turmasCount} turmas, ${data.activeUsersCount} participantes no recorte e ${data.urgencySummary.alta} atividade(s) crítica(s).`,
    data.actionRecommendations[0] ? `Ação: ${data.actionRecommendations[0].description}` : "Ação: manter rotina de acompanhamento do recorte atual.",
    data.professorSummary[0]?.primaryTurma ? `Turma prioritária: ${data.professorSummary[0].primaryTurma.nome}.` : "Turma prioritária: nenhuma turma crítica identificada no recorte.",
    dashboardPriorityTurmaPath ? `Abrir turma prioritária: ${dashboardPriorityTurmaPath}` : "Abrir turma prioritária: não aplicável neste recorte.",
    data.upcomingEventos[0] ? `Próximo marco: ${data.upcomingEventos[0].titulo} em ${formatDate(data.upcomingEventos[0].dataInicio)}.` : "Próximo marco: ainda sem evento futuro no recorte atual.",
  ].filter((line): line is string => Boolean(line)).join("\n");
  const dashboardFullSummary = [
    "Resumo executivo do painel do gestor",
    `Escopo: ${data.scopeLabel}`,
    `Janela: ${data.timeLabel}`,
    "Estado do produto: operação publicada, jornadas autenticadas estabilizadas e aprofundamento educacional em curso.",
    secondaryJourneyRecorteLine,
    `Estado atual: ${data.turmasCount} turmas, ${data.activeUsersCount} participantes e ${data.urgencySummary.alta} atividade(s) em alta prioridade.`,
    data.actionRecommendations[0] ? `Ação recomendada: ${data.actionRecommendations[0].description}` : "Ação recomendada: manter a rotina de acompanhamento do recorte atual.",
    data.professorSummary[0]?.primaryTurma ? `Turma prioritária: ${data.professorSummary[0].primaryTurma.nome}.` : "Turma prioritária: nenhuma turma crítica identificada no recorte.",
    dashboardPriorityTurmaPath ? `Abrir turma prioritária: ${dashboardPriorityTurmaPath}` : "Abrir turma prioritária: não aplicável neste recorte.",
    data.upcomingEventos[0] ? `Agenda da rede: ${data.upcomingEventos[0].titulo} em ${formatDate(data.upcomingEventos[0].dataInicio)}.` : "Agenda da rede: ainda sem evento futuro no recorte atual.",
  ].filter((line): line is string => Boolean(line)).join("\n");
  const dashboardMeetingSummary = [
    "Contexto executivo:",
    "• O site já opera no domínio público com base técnica estabilizada e jornadas autenticadas validadas.",
    "• O foco atual está em coordenação pedagógica, consistência institucional e fechamento de pendências externas.",
    "Decisões sugeridas:",
    ...(secondaryJourneyRecorteLine ? [secondaryJourneyRecorteLine] : []),
    `• ${data.actionRecommendations[0]?.description ?? "Manter a rotina de acompanhamento do recorte atual."}`,
    data.professorSummary[0]?.primaryTurma ? `• Abrir ${data.professorSummary[0].primaryTurma.nome} como frente prioritária do recorte.` : "• Manter monitoramento do recorte sem escalonamento imediato.",
    "Pendências:",
    `• ${data.turmasWithoutResponsibleCount > 0 ? `${data.turmasWithoutResponsibleCount} turma(s) seguem sem responsável principal definido.` : "Não há turmas sem responsável principal neste recorte."}`,
    `• ${data.professorSummary[0] ? `Confirmar encaminhamentos com ${data.professorSummary[0].name}.` : "Definir um responsável focal para a próxima rodada de alinhamento."}`,
    "Próximo checkpoint:",
    `• ${data.upcomingEventos[0] ? `${data.upcomingEventos[0].titulo} em ${formatDate(data.upcomingEventos[0].dataInicio)}.` : "Definir uma próxima janela de checkpoint para o recorte atual."}`,
    `• ${dashboardPriorityTurmaPath ? `Abrir turma prioritária em ${dashboardPriorityTurmaPath}.` : "Sem turma prioritária explícita para abrir neste recorte."}`,
  ].join("\n");
  const dashboardMailtoHref = buildMailtoLink(
    data.professorSummary[0]?.email ?? null,
    `Síntese executiva do painel do gestor`,
    dashboardFullSummary,
  );
  const dashboardWhatsAppMessage = buildOperationalWhatsAppShareText({
    heading: `Painel do gestor · ${data.scopeLabel}`,
    state: `${data.urgencySummary.alta} crítica(s), ${data.turmasCount} turma(s), ${data.activeUsersCount} participante(s).`,
    action: data.actionRecommendations[0]?.description ?? "manter rotina de acompanhamento do recorte atual.",
    ctaPath: dashboardPriorityTurmaPath,
    checkpoint: data.upcomingEventos[0]
      ? `${data.upcomingEventos[0].titulo} em ${formatDate(data.upcomingEventos[0].dataInicio)}.`
      : null,
  });
  const dashboardWhatsAppHref = buildWhatsAppShareLink(dashboardWhatsAppMessage);

  return (
    <div className="p-8 md:p-10">
      <div className="max-w-6xl">
        <div className="mb-10 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-sm font-medium uppercase tracking-wide text-mar-azul">
            <School className="w-4 h-4" />
            Jornada do Gestor
          </div>
          <h1 className="font-serif text-4xl font-bold text-mar-escuro">Painel institucional</h1>
          <p className="max-w-3xl leading-relaxed text-mar-escuro/60">
            Visão inicial para coordenação institucional, acompanhamento de indicadores e articulação entre
            agenda, produção, comunicação e frentes educativas do Museu do Mar.
          </p>
          <p className="text-sm text-mar-escuro/45">
            O site já opera no domínio público, e esta área concentra a próxima camada de valor: coordenação pedagógica, leitura institucional e priorização dos recortes que pedem ação.
          </p>
          {isEducationalManager ? (
            <p className="text-sm text-mar-escuro/45">
              Este acesso prioriza leitura pedagógica de rede, com foco em instituições, responsáveis e turmas que pedem coordenação mais próxima.
            </p>
          ) : null}
          <p className="text-sm text-mar-escuro/45">Sessão ativa para {session.user?.email}.</p>
          {!data.canViewAllInstitutions && data.filterOptions.institutions.length > 0 && (
            <div className="flex flex-wrap gap-2 text-xs text-mar-escuro/50">
              {data.filterOptions.institutions.map((institution) => (
                <span key={institution.id} className={`badge ${institution.isPrimary ? "bg-mar-verde/10 text-mar-verde" : "bg-mar-creme text-mar-escuro/60"}`}>
                  {institution.nome}{institution.funcaoInstitucional ? ` · ${institution.funcaoInstitucional}` : ""}
                </span>
              ))}
            </div>
          )}
          {roles.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {roles.map((role) => (
                <span key={role} className="badge bg-mar-azul/10 text-mar-azul">
                  {role}
                </span>
              ))}
            </div>
          )}
          <div className="pt-1">
            <div className="flex flex-wrap gap-3">
              <a
                href={`/app/gestor/exportar?${dashboardCsvParams.toString()}`}
                className="inline-flex items-center gap-2 rounded-xl border border-mar-areia/40 bg-white px-4 py-2 text-sm font-medium text-mar-escuro/70 transition-colors hover:border-mar-azul/40 hover:text-mar-azul"
              >
                <Download className="h-4 w-4" />
                Exportar CSV do recorte
              </a>
              <a
                href={`/app/gestor/exportar?${dashboardWhatsAppParams.toString()}`}
                className="inline-flex items-center gap-2 rounded-xl border border-mar-verde/20 bg-white px-4 py-2 text-sm font-medium text-mar-verde transition-colors hover:border-mar-verde/40"
              >
                <MessageSquareShare className="h-4 w-4" />
                Baixar texto WhatsApp
              </a>
              <a
                href={`/app/gestor/exportar?${dashboardSummaryParams.toString()}`}
                className="inline-flex items-center gap-2 rounded-xl border border-mar-azul/20 bg-white px-4 py-2 text-sm font-medium text-mar-azul transition-colors hover:border-mar-azul/40"
              >
                <ClipboardList className="h-4 w-4" />
                Baixar resumo do painel
              </a>
              <a
                href={`/app/gestor/exportar?${dashboardMeetingParams.toString()}`}
                className="inline-flex items-center gap-2 rounded-xl border border-mar-azul/20 bg-white px-4 py-2 text-sm font-medium text-mar-escuro transition-colors hover:border-mar-azul/40"
              >
                <ScrollText className="h-4 w-4" />
                Baixar resumo de reunião
              </a>
              <a
                href={`/app/gestor/exportar?${dashboardMessageParams.toString()}`}
                className="inline-flex items-center gap-2 rounded-xl border border-mar-verde/20 bg-white px-4 py-2 text-sm font-medium text-mar-verde transition-colors hover:border-mar-verde/40"
              >
                <MessageSquareShare className="h-4 w-4" />
                Baixar mensagem curta
              </a>
              {dashboardPriorityTurmaPath ? (
                <Link
                  href={dashboardPriorityTurmaPath}
                  className="inline-flex items-center gap-2 rounded-xl border border-mar-verde/20 bg-white px-4 py-2 text-sm font-medium text-mar-verde transition-colors hover:border-mar-verde/40"
                >
                  <ArrowRight className="h-4 w-4" />
                  Abrir turma prioritária
                </Link>
              ) : null}
              <a
                href={dashboardMailtoHref}
                className="inline-flex items-center gap-2 rounded-xl border border-mar-areia/40 bg-white px-4 py-2 text-sm font-medium text-mar-azul transition-colors hover:border-mar-azul/30"
              >
                <Mail className="h-4 w-4" />
                {data.professorSummary[0]?.email ? "Enviar síntese por e-mail" : "Abrir e-mail com síntese"}
              </a>
              <a
                href={dashboardWhatsAppHref}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-mar-verde/20 bg-white px-4 py-2 text-sm font-medium text-mar-verde transition-colors hover:border-mar-verde/40"
              >
                <MessageSquareShare className="h-4 w-4" />
                Compartilhar via WhatsApp
              </a>
              <CopyTextButton
                text={dashboardFullSummary}
                label="Copiar resumo do painel"
                copiedLabel="Resumo copiado"
                className="inline-flex items-center gap-2 rounded-xl border border-mar-azul/20 bg-white px-4 py-2 text-sm font-medium text-mar-azul transition-colors hover:border-mar-azul/40"
              />
              <CopyTextButton
                text={dashboardShortMessage}
                label="Copiar mensagem curta"
                copiedLabel="Mensagem copiada"
                className="inline-flex items-center gap-2 rounded-xl border border-mar-cobre/20 bg-white px-4 py-2 text-sm font-medium text-mar-cobre transition-colors hover:border-mar-cobre/40"
              />
            </div>
          </div>
        </div>

        <section className="mb-10 rounded-2xl border border-mar-areia/30 bg-white p-6">
          <div className="mb-4 flex items-center gap-2 text-sm font-medium text-mar-cobre">
            <Filter className="w-4 h-4" />
            Recorte de leitura institucional
          </div>
          <form className="grid gap-4 lg:grid-cols-[1fr,1fr,1fr,1fr,auto,auto] lg:items-end">
            <label className="flex flex-col gap-2 text-sm text-mar-escuro/70">
              Janela temporal
              <select
                name="periodo"
                defaultValue={data.filters.periodo}
                className="rounded-xl border border-mar-areia/40 bg-mar-creme/40 px-4 py-3 text-sm text-mar-escuro outline-none transition-colors focus:border-mar-azul/40"
              >
                {data.filterOptions.periods.map((period) => (
                  <option key={period.value} value={period.value}>{period.label}</option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2 text-sm text-mar-escuro/70">
              Instituição
              <select
                name="instituicao"
                defaultValue={data.filters.instituicaoId ?? "todas"}
                className="rounded-xl border border-mar-areia/40 bg-mar-creme/40 px-4 py-3 text-sm text-mar-escuro outline-none transition-colors focus:border-mar-azul/40"
              >
                <option value="todas">{data.canViewAllInstitutions ? "Toda a rede" : "Todas as vinculadas"}</option>
                {data.filterOptions.institutions.map((instituicao) => (
                  <option key={instituicao.id} value={instituicao.id}>{instituicao.nome}</option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2 text-sm text-mar-escuro/70">
              Responsável pedagógico
              <select
                name="responsavel"
                defaultValue={data.filters.responsavelId ?? "todos"}
                className="rounded-xl border border-mar-areia/40 bg-mar-creme/40 px-4 py-3 text-sm text-mar-escuro outline-none transition-colors focus:border-mar-azul/40"
              >
                <option value="todos">Todos os responsáveis</option>
                {data.filterOptions.responsaveis.map((responsavel) => (
                  <option key={responsavel.id} value={responsavel.id}>{responsavel.nome} · {responsavel.turmasCount} turma(s)</option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2 text-sm text-mar-escuro/70">
              Jornada secundária
              <select
                name="jornada"
                defaultValue={data.filters.secondaryJourneyOrigin ?? "todas"}
                className="rounded-xl border border-mar-areia/40 bg-mar-creme/40 px-4 py-3 text-sm text-mar-escuro outline-none transition-colors focus:border-mar-azul/40"
              >
                <option value="todas">Todas as jornadas</option>
                {data.filterOptions.secondaryJourneyOrigins.map((origin) => (
                  <option key={origin.value} value={origin.value}>{origin.label}</option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2 text-sm text-mar-escuro/70">
              Status do checkpoint
              <select
                name="checkpointStatus"
                defaultValue={data.filters.secondaryJourneyStatus ?? "todos"}
                className="rounded-xl border border-mar-areia/40 bg-mar-creme/40 px-4 py-3 text-sm text-mar-escuro outline-none transition-colors focus:border-mar-azul/40"
              >
                <option value="todos">Todos os status</option>
                {data.filterOptions.secondaryJourneyStatuses.map((status) => (
                  <option key={status.value} value={status.value}>{status.label}</option>
                ))}
              </select>
            </label>

            <button type="submit" className="btn-primary justify-center">
              Aplicar filtros
            </button>

            <Link href="/app/gestor" className="btn-secondary justify-center">
              Limpar
            </Link>
          </form>

          <div className="mt-4 flex flex-wrap gap-2 text-xs text-mar-escuro/45">
            <span className="badge bg-mar-azul/10 text-mar-azul">Escopo: {data.scopeLabel}</span>
            <span className="badge bg-mar-cobre/10 text-mar-cobre">Janela: {data.timeLabel}</span>
          </div>
        </section>

        <section className="mb-10 rounded-2xl border border-mar-areia/30 bg-white p-6">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="font-serif text-2xl font-bold text-mar-escuro">Resumo para reunião</h2>
              <p className="mt-1 text-sm text-mar-escuro/55">Versão curta do recorte para checkpoints com decisões, pendências e próximo marco.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <CopyTextButton
                text={dashboardMeetingSummary}
                label="Copiar resumo de reunião"
                copiedLabel="Resumo copiado"
                className="inline-flex items-center gap-2 rounded-xl border border-mar-azul/20 bg-white px-4 py-2 text-sm font-medium text-mar-azul transition-colors hover:border-mar-azul/40"
              />
              <a
                href={`/app/gestor/exportar?${dashboardMeetingParams.toString()}`}
                className="inline-flex items-center gap-2 rounded-xl border border-mar-escuro/10 bg-white px-4 py-2 text-sm font-medium text-mar-escuro transition-colors hover:border-mar-azul/30"
              >
                <ScrollText className="h-4 w-4" />
                Baixar versão de reunião
              </a>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <article className="rounded-2xl border border-mar-areia/30 bg-mar-creme/40 p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-mar-cobre/80">Decisões sugeridas</p>
              <ul className="mt-3 space-y-3 text-sm leading-relaxed text-mar-escuro/62">
                <li>• {data.actionRecommendations[0]?.description ?? "Manter a rotina de acompanhamento do recorte atual."}</li>
                <li>• {data.professorSummary[0]?.primaryTurma ? `Abrir ${data.professorSummary[0].primaryTurma.nome} como frente prioritária do recorte.` : "Manter monitoramento do recorte sem escalonamento imediato."}</li>
              </ul>
            </article>
            <article className="rounded-2xl border border-mar-areia/30 bg-mar-creme/40 p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-mar-cobre/80">Pendências</p>
              <ul className="mt-3 space-y-3 text-sm leading-relaxed text-mar-escuro/62">
                <li>• {data.turmasWithoutResponsibleCount > 0 ? `${data.turmasWithoutResponsibleCount} turma(s) seguem sem responsável principal definido.` : "Não há turmas sem responsável principal neste recorte."}</li>
                <li>• {data.professorSummary[0] ? `Confirmar encaminhamentos com ${data.professorSummary[0].name}.` : "Definir um responsável focal para a próxima rodada de alinhamento."}</li>
              </ul>
            </article>
            <article className="rounded-2xl border border-mar-areia/30 bg-mar-creme/40 p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-mar-cobre/80">Próximo checkpoint</p>
              <ul className="mt-3 space-y-3 text-sm leading-relaxed text-mar-escuro/62">
                <li>• {data.upcomingEventos[0] ? `${data.upcomingEventos[0].titulo} em ${formatDate(data.upcomingEventos[0].dataInicio)}.` : "Definir uma próxima janela de checkpoint para o recorte atual."}</li>
                <li>• {dashboardPriorityTurmaPath ? `Abrir turma prioritária em ${dashboardPriorityTurmaPath}.` : "Sem turma prioritária explícita para abrir neste recorte."}</li>
              </ul>
            </article>
          </div>
        </section>

        <section className="mb-10 rounded-2xl border border-mar-areia/30 bg-white p-6">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="font-serif text-2xl font-bold text-mar-escuro">Leitura pedagógica do recorte</h2>
              <p className="mt-1 text-sm text-mar-escuro/55">
                Ponte curta entre a coordenação institucional do gestor e a inteligência operacional já visível nas turmas e responsáveis pedagógicos.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-mar-azul/10 px-4 py-2 text-xs font-medium uppercase tracking-wide text-mar-azul">
              <LineChart className="h-4 w-4" />
              {data.professorSummary.length} responsável(is) com leitura ativa no recorte
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <article className="rounded-2xl border border-mar-areia/30 bg-mar-creme/40 p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-mar-cobre/80">Instituição em foco</p>
              {data.pedagogicalFocus.institution ? (
                <>
                  <h3 className="mt-3 font-serif text-2xl font-bold text-mar-escuro">{data.pedagogicalFocus.institution.name}</h3>
                  <p className="mt-2 text-sm font-medium text-mar-escuro/70">{data.pedagogicalFocus.institution.value}</p>
                  <p className="mt-3 text-sm leading-relaxed text-mar-escuro/60">{data.pedagogicalFocus.institution.detail}</p>
                  <Link href={data.pedagogicalFocus.institution.href} className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-mar-azul hover:text-mar-azul/80">
                    {data.pedagogicalFocus.institution.cta}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </>
              ) : (
                <>
                  <h3 className="mt-3 font-serif text-2xl font-bold text-mar-escuro">Sem destaque institucional</h3>
                  <p className="mt-3 text-sm leading-relaxed text-mar-escuro/60">
                    Nenhuma instituição concentrou urgência suficiente neste recorte. O próximo passo é manter a leitura da rede e revisar novos sinais de atenção.
                  </p>
                </>
              )}
            </article>

            <article className="rounded-2xl border border-mar-areia/30 bg-mar-creme/40 p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-mar-cobre/80">Responsável pedagógico</p>
              {data.pedagogicalFocus.professor ? (
                <>
                  <h3 className="mt-3 font-serif text-2xl font-bold text-mar-escuro">{data.pedagogicalFocus.professor.name}</h3>
                  <p className="mt-2 text-sm font-medium text-mar-escuro/70">{data.pedagogicalFocus.professor.value}</p>
                  <p className="mt-3 text-sm leading-relaxed text-mar-escuro/60">{data.pedagogicalFocus.professor.detail}</p>
                  <Link href={data.pedagogicalFocus.professor.href} className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-mar-azul hover:text-mar-azul/80">
                    {data.pedagogicalFocus.professor.cta}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </>
              ) : (
                <>
                  <h3 className="mt-3 font-serif text-2xl font-bold text-mar-escuro">Sem responsável focal</h3>
                  <p className="mt-3 text-sm leading-relaxed text-mar-escuro/60">
                    O recorte atual ainda não destaca um responsável com urgência pedagógica explícita. Vale manter a coordenação distribuída da rede.
                  </p>
                </>
              )}
            </article>

            <article className="rounded-2xl border border-mar-areia/30 bg-mar-creme/40 p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-mar-cobre/80">Turma a abrir agora</p>
              {data.pedagogicalFocus.turma ? (
                <>
                  <h3 className="mt-3 font-serif text-2xl font-bold text-mar-escuro">{data.pedagogicalFocus.turma.name}</h3>
                  <p className="mt-2 text-sm font-medium text-mar-escuro/70">{data.pedagogicalFocus.turma.value}</p>
                  <p className="mt-3 text-sm leading-relaxed text-mar-escuro/60">{data.pedagogicalFocus.turma.detail}</p>
                  <Link href={data.pedagogicalFocus.turma.href} className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-mar-azul hover:text-mar-azul/80">
                    {data.pedagogicalFocus.turma.cta}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </>
              ) : (
                <>
                  <h3 className="mt-3 font-serif text-2xl font-bold text-mar-escuro">Sem turma prioritária</h3>
                  <p className="mt-3 text-sm leading-relaxed text-mar-escuro/60">
                    Nenhuma turma emergiu como próxima frente obrigatória neste recorte. O painel pode seguir em monitoramento sem escalonamento imediato.
                  </p>
                </>
              )}
            </article>
          </div>
        </section>

        <div className="mb-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {[
            { label: "Participantes no recorte", value: data.activeUsersCount, icon: Users, tone: "text-mar-azul bg-mar-azul/10" },
            { label: "Perfis configurados", value: `${data.profileCompletionRate}%`, icon: ClipboardList, tone: "text-mar-cobre bg-mar-cobre/10" },
            { label: "Instituições no recorte", value: data.instituicoesCount, icon: Building2, tone: "text-mar-verde bg-mar-verde/10" },
            { label: "Turmas no recorte", value: data.turmasCount, icon: School, tone: "text-mar-azul bg-mar-azul/10" },
            { label: "Atividades em alta prioridade", value: data.urgencySummary.alta, icon: AlertTriangle, tone: "text-rose-700 bg-rose-100" },
            { label: "Atividades atualizadas em 30 dias", value: data.temporalSummary.updatedLast30Days, icon: BookOpen, tone: "text-mar-cobre bg-mar-cobre/10" },
            { label: "Itens de acervo", value: data.acervoCount, icon: Camera, tone: "text-mar-verde bg-mar-verde/10" },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl border border-mar-areia/30 bg-white p-6">
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${item.tone}`}>
                <item.icon className="w-5 h-5" />
              </div>
              <p className="mt-4 text-sm text-mar-escuro/50">{item.label}</p>
              <p className="mt-1 font-serif text-3xl font-bold text-mar-escuro">{item.value}</p>
            </div>
          ))}
        </div>

        <div className="mb-10 grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
          <section className="rounded-2xl border border-mar-areia/30 bg-white p-6">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h2 className="font-serif text-2xl font-bold text-mar-escuro">Cadência institucional</h2>
                <p className="mt-1 text-sm text-mar-escuro/55">Leitura do ritmo recente de acompanhamento pedagógico por rede e turma.</p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full bg-mar-cobre/10 px-4 py-2 text-xs font-medium uppercase tracking-wide text-mar-cobre">
                <AlertTriangle className="h-4 w-4" />
                {data.temporalSummary.staleOver30Days} sem atualização há mais de 30 dias
              </div>
            </div>

            <div className="mb-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-mar-areia/30 bg-mar-creme/60 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-mar-escuro/55">Alta prioridade</p>
                <p className="mt-2 font-serif text-3xl font-bold text-mar-escuro">{data.urgencySummary.alta}</p>
                <p className="mt-2 text-sm text-mar-escuro/55">Atividades que pedem coordenação imediata.</p>
              </div>
              <div className="rounded-xl border border-mar-areia/30 bg-mar-creme/60 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-mar-escuro/55">Atualizadas em 90 dias</p>
                <p className="mt-2 font-serif text-3xl font-bold text-mar-escuro">{data.temporalSummary.updatedLast90Days}</p>
                <p className="mt-2 text-sm text-mar-escuro/55">Indicador de acompanhamento ativo no trimestre.</p>
              </div>
              <div className="rounded-xl border border-mar-areia/30 bg-mar-creme/60 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-mar-escuro/55">Concluídas em 30 dias</p>
                <p className="mt-2 font-serif text-3xl font-bold text-mar-escuro">{data.temporalSummary.completedLast30Days}</p>
                <p className="mt-2 text-sm text-mar-escuro/55">Sinal de fechamento recente de ciclos educativos.</p>
              </div>
            </div>

            <div className="space-y-3">
              {data.institutionalCadence.length > 0 ? data.institutionalCadence.slice(0, 4).map((institution) => (
                <Link
                  key={institution.id}
                  href={`/app/gestor/instituicoes/${institution.id}`}
                  className="block rounded-xl border border-mar-areia/30 p-4 transition-colors hover:border-mar-azul/30"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-medium text-mar-escuro">{institution.nome}</h3>
                      <p className="mt-1 text-sm text-mar-escuro/55">
                        {institution.totalActivities} atividade(s) no recorte · {institution.recentUpdates30Days} atualizada(s) em 30 dias
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className="badge bg-rose-100 text-rose-700">{institution.highPriorityCount} alta prioridade</span>
                      <span className="badge bg-amber-100 text-amber-700">{institution.staleCount} sem atualização</span>
                    </div>
                  </div>
                </Link>
              )) : (
                <div className="rounded-xl bg-mar-creme p-4 text-sm leading-relaxed text-mar-escuro/60">
                  Ainda não há atividades de turma suficientes neste recorte para compor leitura de cadência institucional.
                </div>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-mar-areia/30 bg-white p-6">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-mar-cobre">
              <LineChart className="w-4 h-4" />
              Distribuição de perfis ativos
            </div>
            <div className="space-y-4">
              {data.participantsByProfile.length > 0 ? data.participantsByProfile.map((item) => (
                <div key={item.slug}>
                  <div className="mb-2 flex items-center justify-between gap-3 text-sm text-mar-escuro/65">
                    <span>{item.label}</span>
                    <span>{item.value} · {item.share}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-mar-areia/25">
                    <div
                      className="h-2 rounded-full bg-mar-azul transition-all"
                      style={{ width: `${Math.max(item.share, item.value > 0 ? 8 : 0)}%` }}
                    />
                  </div>
                </div>
              )) : (
                <p className="text-sm leading-relaxed text-mar-escuro/55">Ainda não há participantes ativos suficientes para compor indicadores por perfil neste recorte.</p>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-mar-areia/30 bg-white p-6">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-mar-verde">
              <ClipboardList className="w-4 h-4" />
              Sinais de atenção imediatos
            </div>
            <ul className="space-y-3 text-sm leading-relaxed text-mar-escuro/65">
              {data.attentionPoints.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
            <div className="mt-5 rounded-xl bg-mar-creme p-4 text-sm leading-relaxed text-mar-escuro/60">
              A leitura gerencial agora cruza participação, rede institucional, turmas e agenda, permitindo retomada mais objetiva da coordenação.
            </div>
          </section>
        </div>

        <section className="mb-10 rounded-2xl border border-mar-areia/30 bg-white p-6">
          <div className="mb-5">
            <h2 className="font-serif text-2xl font-bold text-mar-escuro">Recomendações de coordenação</h2>
            <p className="mt-1 text-sm text-mar-escuro/55">Leituras acionáveis a partir de urgência, cadência e aderência com a agenda da rede.</p>
          </div>

          <div className="space-y-4">
            {data.actionRecommendations.length > 0 ? data.actionRecommendations.map((rec) => (
              <div key={rec.id} className="rounded-xl border border-mar-areia/30 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-medium text-mar-escuro">{rec.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-mar-escuro/60">{rec.description}</p>
                  </div>
                  <span className={`badge ${rec.tone}`}>{rec.label}</span>
                </div>
                <Link href={rec.href} className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-mar-azul">
                  {rec.label} <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            )) : (
              <div className="rounded-xl bg-mar-creme p-4 text-sm leading-relaxed text-mar-escuro/60">
                O recorte atual está estável. A próxima evolução natural é aprofundar leitura por instituição e consolidar rotina contínua de acompanhamento.
              </div>
            )}
          </div>

          {data.priorityAgendaMatches.length > 0 && (
            <div className="mt-5 rounded-xl bg-mar-azul/5 p-4 text-sm leading-relaxed text-mar-escuro/60">
              {data.priorityAgendaMatches.length} evento(s) da agenda já apresentam aderência com focos pedagógicos em atenção no recorte atual.
            </div>
          )}
        </section>

        <section className="mb-10 rounded-2xl border border-mar-areia/30 bg-white p-6">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="font-serif text-2xl font-bold text-mar-escuro">Jornadas secundárias em acompanhamento</h2>
              <p className="mt-1 text-sm text-mar-escuro/55">
                Leitura institucional dos checkpoints recentes de bolsistas, voluntários e equipe de produção.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="badge bg-mar-azul/10 text-mar-azul">{data.secondaryJourneyOverview.total} checkpoint(s)</span>
              <span className="badge bg-mar-verde/10 text-mar-verde">{data.secondaryJourneyOverview.updatedLast14Days} atualizados em 14 dias</span>
              {data.secondaryJourneyOverview.staleCount > 0 && (
                <span className="badge bg-amber-100 text-amber-700">{data.secondaryJourneyOverview.staleCount} sem atualização recente</span>
              )}
              {data.secondaryJourneyOverview.apoioCount > 0 && (
                <Link
                  href={buildDashboardHref({
                    periodo: data.filters.periodo,
                    instituicaoId: data.filters.instituicaoId,
                    responsavelId: data.filters.responsavelId,
                    secondaryJourneyOrigin: data.filters.secondaryJourneyOrigin,
                    secondaryJourneyStatus: "em_andamento",
                  })}
                  className="badge bg-rose-100 text-rose-700 transition-colors hover:bg-rose-200"
                >
                  {data.secondaryJourneyOverview.apoioCount} pedem apoio
                </Link>
              )}
            </div>
          </div>

          {data.secondaryJourneyScopeNote ? (
            <div className="mb-5 rounded-xl bg-mar-creme p-4 text-sm leading-relaxed text-mar-escuro/60">
              {data.secondaryJourneyScopeNote}
            </div>
          ) : null}

          <div className="mb-5 flex flex-wrap items-center gap-2 text-xs">
            <span className="font-medium uppercase tracking-wide text-mar-escuro/45">Drill-down rápido</span>
            {secondaryJourneyOriginFilters.map((origin) => (
              <Link
                key={origin.origin}
                href={origin.href}
                className={`badge transition-colors ${origin.active ? "bg-mar-azul text-white" : "bg-mar-azul/10 text-mar-azul hover:bg-mar-azul/15"}`}
              >
                {origin.label} · {origin.total}
              </Link>
            ))}
            {secondaryJourneyStatusFilters.map((status) => (
              <Link
                key={status.key}
                href={status.href}
                className={`badge transition-colors ${status.active ? "bg-mar-cobre text-white" : "bg-mar-creme text-mar-escuro/65 hover:bg-mar-areia/30"}`}
              >
                {status.label} · {status.value}
              </Link>
            ))}
            {(data.filters.secondaryJourneyOrigin || data.filters.secondaryJourneyStatus) ? (
              <Link href={secondaryJourneyBaseHref} className="badge bg-white text-mar-escuro/60 ring-1 ring-inset ring-mar-areia/40 transition-colors hover:bg-mar-creme">
                Limpar drill-down
              </Link>
            ) : null}
          </div>

          <div className="mb-6 grid gap-4 md:grid-cols-3">
            {secondaryJourneyStatusFilters.map((status) => (
              <Link
                key={status.key}
                href={status.href}
                className={`rounded-xl border p-4 transition-colors ${status.active ? "border-mar-azul/40 bg-mar-azul/5" : "border-mar-areia/30 bg-mar-creme/60 hover:border-mar-azul/25"}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-mar-escuro/55">{status.label}</p>
                    <p className="mt-2 font-serif text-3xl font-bold text-mar-escuro">{status.value}</p>
                  </div>
                  <span className={`badge ${status.tone}`}>{status.active ? "ativo" : "filtrar"}</span>
                </div>
                <p className="mt-2 text-sm text-mar-escuro/55">{status.description}</p>
              </Link>
            ))}
          </div>

          <div className="grid gap-6 xl:grid-cols-[0.95fr,1.05fr]">
            <div className="space-y-3">
              {secondaryJourneyOriginFilters.map((origin) => (
                <div
                  key={origin.origin}
                  className={`rounded-xl border p-4 transition-colors ${origin.active ? "border-mar-azul/40 bg-mar-azul/5" : "border-mar-areia/30 hover:border-mar-azul/30"}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-medium text-mar-escuro">{origin.label}</h3>
                      <p className="mt-1 text-sm text-mar-escuro/55">{origin.total} checkpoint(s) no recorte institucional.</p>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className="badge bg-mar-azul/10 text-mar-azul">{origin.statusSummary.em_andamento} em andamento</span>
                      <span className="badge bg-mar-cobre/10 text-mar-cobre">{origin.statusSummary.aberto} abertos</span>
                      <span className="badge bg-mar-verde/10 text-mar-verde">{origin.statusSummary.concluido} concluídos</span>
                      {origin.apoioCount > 0 && (
                        <span className="badge bg-rose-100 text-rose-700">{origin.apoioCount} pedem apoio</span>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3 text-sm font-medium">
                    <Link href={origin.href} className="inline-flex items-center gap-1 text-mar-azul">
                      {origin.active ? "Reaplicar recorte" : "Filtrar neste painel"} <ArrowRight className="w-4 h-4" />
                    </Link>
                    <Link href={origin.path} className="inline-flex items-center gap-1 text-mar-escuro/60 transition-colors hover:text-mar-escuro">
                      Abrir jornada de origem <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              {data.secondaryJourneyOverview.recentTrackings.length > 0 ? data.secondaryJourneyOverview.recentTrackings.map((tracking) => (
                <div key={tracking.id} className="rounded-xl border border-mar-areia/30 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-mar-cobre/80">
                        {tracking.userName} · {tracking.instituicoes[0] ?? "Sem instituição vinculada"}
                      </p>
                      <h3 className="mt-2 font-medium text-mar-escuro">{tracking.titulo}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-mar-escuro/60">{tracking.resumo}</p>
                    </div>
                    <span className="badge bg-mar-creme text-mar-escuro/70">
                      {getSecondaryJourneyTrackingStatusLabel(tracking.status)}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-mar-escuro/50">
                    <span className="badge bg-mar-azul/10 text-mar-azul">{tracking.origin.replace("-", " ")}</span>
                    <span className="badge bg-mar-creme text-mar-escuro/60">Atualizado em {formatDate(tracking.updatedAt)}</span>
                    {tracking.eventoTitulo ? (
                      <span className="badge bg-mar-verde/10 text-mar-verde">Evento: {tracking.eventoTitulo}</span>
                    ) : null}
                  </div>

                  {tracking.proximoPasso ? (
                    <p className="mt-3 text-sm text-mar-escuro/60">
                      <span className="font-medium text-mar-escuro">Próximo checkpoint:</span> {tracking.proximoPasso}
                    </p>
                  ) : null}

                  {tracking.apoioNecessario ? (
                    <p className="mt-2 text-sm text-mar-escuro/60">
                      <span className="font-medium text-mar-escuro">Apoio necessário:</span> {tracking.apoioNecessario}
                    </p>
                  ) : null}

                  <div className="mt-4">
                    <div className="flex flex-wrap gap-3 text-sm font-medium">
                      <Link
                        href={buildDashboardHref({
                          periodo: data.filters.periodo,
                          instituicaoId: data.filters.instituicaoId,
                          responsavelId: data.filters.responsavelId,
                          secondaryJourneyOrigin: tracking.origin,
                          secondaryJourneyStatus: tracking.status,
                        })}
                        className="inline-flex items-center gap-1 text-mar-azul"
                      >
                        Filtrar origem + status <ArrowRight className="w-4 h-4" />
                      </Link>
                      <Link href={data.secondaryJourneyOverview.originSummary.find((item) => item.origin === tracking.origin)?.path ?? "/app/perfil"} className="inline-flex items-center gap-1 text-mar-escuro/60 transition-colors hover:text-mar-escuro">
                        Abrir jornada de origem <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="rounded-xl bg-mar-creme p-4 text-sm leading-relaxed text-mar-escuro/60">
                  Ainda não há checkpoints estruturados no recorte institucional atual para bolsistas, voluntários ou equipe de produção.
                </div>
              )}
            </div>
          </div>
        </section>

        {data.professorSummary.length > 0 && (
          <section className="mb-10 rounded-2xl border border-mar-areia/30 bg-white p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="font-serif text-2xl font-bold text-mar-escuro">Professores responsáveis</h2>
                <p className="mt-1 text-sm text-mar-escuro/55">
                  Leitura de urgência pedagógica por responsável de turma no recorte atual.
                </p>
              </div>
              {data.professorSummary.some((p) => p.highPriority > 0) && (
                <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-3 py-1 text-xs font-medium text-rose-700">
                  <AlertTriangle className="h-3 w-3" />
                  {data.professorSummary.filter((p) => p.highPriority > 0).length} com alta prioridade
                </span>
              )}
            </div>

            <div className="space-y-3">
              {data.professorSummary.map((prof) => (
                <div key={prof.professorId} className="rounded-xl border border-mar-areia/30 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-medium text-mar-escuro">{prof.name}</h3>
                      <p className="mt-1 text-sm text-mar-escuro/50">{prof.email}</p>
                      <p className="mt-2 text-sm text-mar-escuro/55">
                        {prof.turmasCount} turma(s) · {prof.total} atividade(s) no recorte
                        {prof.lastActivityAt && ` · última atualização ${getDaysSince(prof.lastActivityAt)}d atrás`}
                      </p>
                      <p className="mt-3 text-sm leading-relaxed text-mar-escuro/60">{prof.coordinationAction}</p>
                      {prof.institutionStats.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2 text-xs text-mar-escuro/55">
                          {prof.institutionStats.map((institution) => (
                            <span key={`${prof.professorId}-${institution.id}`} className="badge bg-mar-creme text-mar-escuro/65">
                              {institution.nome} · {institution.turmasCount} turma(s)
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs">
                      {prof.highPriority > 0 && (
                        <span className="badge bg-rose-100 text-rose-700">{prof.highPriority} alta prioridade</span>
                      )}
                      {prof.attention > 0 && (
                        <span className="badge bg-amber-100 text-amber-700">{prof.attention} atenção</span>
                      )}
                      {prof.stale > 0 && (
                        <span className="badge bg-mar-areia/40 text-mar-escuro/60">{prof.stale} paradas +30d</span>
                      )}
                      {prof.highPriority === 0 && prof.attention === 0 && (
                        <span className="badge bg-mar-verde/10 text-mar-verde">Em dia</span>
                      )}
                    </div>
                  </div>
                  {prof.primaryInstitution && (
                    <div className="mt-4">
                      <div className="flex flex-wrap gap-3">
                        <Link
                          href={`/app/gestor/instituicoes/${prof.primaryInstitution.id}`}
                          className="inline-flex items-center gap-1 text-sm font-medium text-mar-azul"
                        >
                          Coordenar com {prof.primaryInstitution.nome} <ArrowRight className="w-4 h-4" />
                        </Link>
                        <Link
                          href={buildDashboardHref({
                            periodo: data.filters.periodo,
                            instituicaoId: prof.primaryInstitution.id,
                            responsavelId: prof.professorId,
                            secondaryJourneyOrigin: data.filters.secondaryJourneyOrigin,
                            secondaryJourneyStatus: data.filters.secondaryJourneyStatus,
                          })}
                          className="inline-flex items-center gap-1 text-sm font-medium text-mar-cobre"
                        >
                          Filtrar painel por responsável <ArrowRight className="w-4 h-4" />
                        </Link>
                        {prof.primaryTurma && (
                          <Link
                            href={`/app/gestor/turmas/${prof.primaryTurma.id}`}
                            className="inline-flex items-center gap-1 text-sm font-medium text-mar-verde"
                          >
                            Abrir turma prioritária <ArrowRight className="w-4 h-4" />
                          </Link>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="mb-10 grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
          <section className="rounded-2xl border border-mar-areia/30 bg-white p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="font-serif text-2xl font-bold text-mar-escuro">Rede institucional</h2>
                <p className="mt-1 text-sm text-mar-escuro/55">Instituições formalizadas com leitura rápida de participantes e turmas no recorte selecionado.</p>
              </div>
              <span className="text-sm text-mar-escuro/45">{data.instituicoesCount} instituição(ões)</span>
            </div>

            <div className="space-y-3">
              {data.institutionalNetwork.length > 0 ? data.institutionalNetwork.map((instituicao) => (
                <Link
                  key={instituicao.id}
                  href={`/app/gestor/instituicoes/${instituicao.id}`}
                  className="block rounded-xl border border-mar-areia/30 p-4 transition-colors hover:border-mar-azul/30"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-medium text-mar-escuro">{instituicao.nome}</h3>
                      <p className="mt-1 text-sm text-mar-escuro/50">
                        {instituicao.tipo}{(instituicao.cidade || instituicao.estado) && " · "}
                        {instituicao.cidade}{instituicao.cidade && instituicao.estado ? "/" : ""}{instituicao.estado}
                      </p>
                      {instituicao.responsavelNome && (
                        <p className="mt-2 text-sm text-mar-escuro/55">Responsável: {instituicao.responsavelNome}</p>
                      )}
                    </div>
                    <div className="flex gap-2 text-xs">
                      <span className="badge bg-mar-azul/10 text-mar-azul">{instituicao.participantsCount} participante(s)</span>
                      <span className="badge bg-mar-verde/10 text-mar-verde">{instituicao.turmasCount} turma(s)</span>
                    </div>
                  </div>
                  <div className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-mar-azul">
                    Abrir detalhe institucional <ArrowRight className="w-4 h-4" />
                  </div>
                </Link>
              )) : (
                <p className="text-sm text-mar-escuro/50">Nenhuma instituição ativa apareceu no recorte atual.</p>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-mar-areia/30 bg-white p-6">
            <div className="mb-5">
              <h2 className="font-serif text-2xl font-bold text-mar-escuro">Turmas em destaque</h2>
              <p className="mt-1 text-sm text-mar-escuro/55">Consolidação rápida de turmas ativas por instituição, útil para leitura educacional.</p>
            </div>

            <div className="space-y-3">
              {data.turmasHighlights.length > 0 ? data.turmasHighlights.map((turma) => (
                <div key={turma.id} className="rounded-xl border border-mar-areia/30 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-medium text-mar-escuro">{turma.nome}</h3>
                      <p className="mt-1 text-sm text-mar-escuro/50">
                        {turma.anoLetivo ? `Ano ${turma.anoLetivo}` : "Ano letivo não informado"}
                        {turma.segmento && ` · ${turma.segmento}`}
                        {turma.turno && ` · ${turma.turno}`}
                      </p>
                    </div>
                    <span className="badge bg-mar-cobre/10 text-mar-cobre">{turma.activeMembersCount} participante(s)</span>
                  </div>
                </div>
              )) : (
                <p className="text-sm text-mar-escuro/50">Nenhuma turma ativa encontrada no recorte atual.</p>
              )}
            </div>
          </section>
        </div>

        <div className="mb-10 grid gap-6 xl:grid-cols-[0.95fr,1.05fr]">
          <section className="rounded-2xl border border-mar-areia/30 bg-white p-6">
            <div className="mb-5">
              <h2 className="font-serif text-2xl font-bold text-mar-escuro">Participantes recentes</h2>
              <p className="mt-1 text-sm text-mar-escuro/55">Quem entrou ou acessou a plataforma dentro do recorte selecionado.</p>
            </div>

            <div className="space-y-3">
              {data.recentParticipants.length > 0 ? data.recentParticipants.map((participant) => (
                <div key={participant.id} className="rounded-xl border border-mar-areia/30 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-medium text-mar-escuro">{participant.name}</h3>
                      <p className="mt-1 text-sm text-mar-escuro/50">{participant.email}</p>
                      <p className="mt-2 text-sm text-mar-escuro/60">{participant.contextLabel}</p>
                    </div>
                    <span className="badge bg-mar-cobre/10 text-mar-cobre">{participant.profileLabel}</span>
                  </div>
                  <div className="mt-3 text-xs text-mar-escuro/45">
                    {participant.lastLoginAt ? `Último acesso: ${formatDate(participant.lastLoginAt)}` : `Entrada registrada em ${formatDate(participant.createdAt)}`}
                  </div>
                </div>
              )) : (
                <p className="text-sm text-mar-escuro/50">Nenhum participante ativo encontrado no recorte atual.</p>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-mar-areia/30 bg-white p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="font-serif text-2xl font-bold text-mar-escuro">Agenda prioritária</h2>
                <p className="mt-1 text-sm text-mar-escuro/55">Eventos publicados com potencial de articulação institucional dentro da janela selecionada.</p>
              </div>
              <Link href="/agenda" className="inline-flex items-center gap-1 text-sm font-medium text-mar-azul">
                Ver agenda <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="mb-4 flex flex-wrap gap-2 text-xs text-mar-escuro/45">
              <span className="badge bg-mar-azul/10 text-mar-azul">{data.eventosCount} evento(s) na janela</span>
              <span className="badge bg-mar-verde/10 text-mar-verde">Escopo: {data.scopeLabel}</span>
            </div>

            <div className="space-y-3">
              {data.upcomingEventos.length > 0 ? data.upcomingEventos.map((evento) => (
                <Link key={evento.id} href={`/agenda/${evento.id}`} className="block rounded-xl border border-mar-areia/30 p-4 transition-colors hover:border-mar-azul/30">
                  <h3 className="font-medium text-mar-escuro">{evento.titulo}</h3>
                  <p className="mt-2 text-sm text-mar-escuro/55">{formatDate(evento.dataInicio)}</p>
                  {evento.instituicaoId && (
                    <p className="mt-1 text-xs font-medium uppercase tracking-wide text-mar-cobre/80">
                      {data.filterOptions.institutions.find((instituicao) => instituicao.id === evento.instituicaoId)?.nome ?? "Instituição vinculada"}
                    </p>
                  )}
                  {evento.local && <p className="mt-1 text-sm text-mar-escuro/55">{evento.local}</p>}
                </Link>
              )) : (
                <p className="text-sm text-mar-escuro/50">Nenhum evento futuro publicado dentro da janela atual.</p>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
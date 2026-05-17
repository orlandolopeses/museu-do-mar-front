import Link from "next/link";
import { revalidatePath } from "next/cache";
import { and, count, desc, eq, gte, inArray } from "drizzle-orm";
import { requireProfessorAccess } from "@/lib/access";
import { CopyTextButton } from "@/components/ui/CopyTextButton";
import { db } from "@/lib/db";
import { buildMailtoLink, buildOperationalWhatsAppShareText, buildWhatsAppShareLink, joinShareLines } from "@/lib/gestor-sharing";
import { canAccessTurma, resolveEducationalAccess } from "@/lib/education-access";
import { getAccessibleInstitutions } from "@/lib/institution-access";
import { GincanaFranciscoAraujoMonitor } from "@/components/education/GincanaFranciscoAraujoMonitor";
import { acervo, atividadesTurma, eventos, gincanaCheckins, matriculasTurma, posts, profiles, turmas, users } from "@/lib/schema";
import { getTeacherClassroomActivityPlans } from "@/lib/classroom-activity-plans";
import { extractRoles } from "@/lib/permissions";
import { getTeacherPedagogicalTracks } from "@/lib/pedagogical-tracks";
import { getActivityUrgency } from "@/lib/activity-urgency";
import { formatDate } from "@/lib/utils";
import { AlertTriangle, ArrowRight, BookOpen, Building2, Calendar, Camera, GraduationCap, Mail, MessageSquareShare, NotebookText, School, ScrollText, Users } from "lucide-react";
import { z } from "zod";

const professorActivityPlanSchema = z.object({
  turmaId: z.string().trim().min(1).max(36),
  sourceKey: z.string().trim().min(1).max(160),
  titulo: z.string().trim().min(2).max(255),
  resumo: z.string().trim().min(10).max(2000),
  foco: z.string().trim().max(255).optional().or(z.literal("")),
  proximoPasso: z.string().trim().max(2000).optional().or(z.literal("")),
});

const professorActivityUpdateSchema = z.object({
  activityId: z.string().trim().min(1).max(36),
  status: z.enum(["planejada", "em_andamento", "concluida"]),
  proximoPasso: z.string().trim().max(2000).optional().or(z.literal("")),
});

const activityStatusLabelMap = {
  planejada: "Planejada",
  em_andamento: "Em andamento",
  concluida: "Concluída",
} as const;

const temporalWindows = {
  week: 7,
  month: 30,
  quarter: 90,
} as const;

function getDaysSince(date: Date) {
  const diff = Date.now() - date.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function isWithinDays(date: Date, days: number) {
  return getDaysSince(date) <= days;
}

async function getTeacherDashboardData(
  userId: string,
  scope: Awaited<ReturnType<typeof resolveEducationalAccess>>,
) {
  const now = new Date();

  const linkedInstitutions = await getAccessibleInstitutions(userId, scope.canManageAllTurmas);

  const institutionIds = [...new Set(linkedInstitutions.map((institution) => institution.id))];
  const managedTurmas = scope.canManageAllTurmas
    ? await db
        .select({
          id: turmas.id,
          nome: turmas.nome,
          instituicaoId: turmas.instituicaoId,
          anoLetivo: turmas.anoLetivo,
          segmento: turmas.segmento,
          turno: turmas.turno,
          ativo: turmas.ativo,
          createdAt: turmas.createdAt,
        })
        .from(turmas)
        .orderBy(desc(turmas.createdAt))
    : scope.canManageInstitutionTurmas && institutionIds.length > 0
      ? await db
          .select({
            id: turmas.id,
            nome: turmas.nome,
            instituicaoId: turmas.instituicaoId,
            anoLetivo: turmas.anoLetivo,
            segmento: turmas.segmento,
            turno: turmas.turno,
            ativo: turmas.ativo,
            createdAt: turmas.createdAt,
          })
          .from(turmas)
          .where(inArray(turmas.instituicaoId, institutionIds))
          .orderBy(desc(turmas.createdAt))
      : await db
          .select({
            id: turmas.id,
            nome: turmas.nome,
            instituicaoId: turmas.instituicaoId,
            anoLetivo: turmas.anoLetivo,
            segmento: turmas.segmento,
            turno: turmas.turno,
            ativo: turmas.ativo,
            createdAt: turmas.createdAt,
          })
          .from(turmas)
          .where(eq(turmas.responsavelUserId, userId))
          .orderBy(desc(turmas.createdAt));

  const managedTurmaIds = managedTurmas.map((turma) => turma.id);

  const [postsCountResult] = await db.select({ value: count() }).from(posts).where(eq(posts.status, "publicado"));
  const [acervoCountResult] = await db.select({ value: count() }).from(acervo).where(eq(acervo.publicado, true));
  const [eventosCountResult] = scope.canManageAllTurmas
    ? await db
        .select({ value: count() })
        .from(eventos)
        .where(and(eq(eventos.publicado, true), gte(eventos.dataInicio, now)))
    : institutionIds.length > 0
      ? await db
          .select({ value: count() })
          .from(eventos)
          .where(and(eq(eventos.publicado, true), gte(eventos.dataInicio, now), inArray(eventos.instituicaoId, institutionIds)))
      : [{ value: 0 }];

  const featuredPosts = await db
    .select({ id: posts.id, slug: posts.slug, title: posts.title, publishedAt: posts.publishedAt, summary: posts.summary })
    .from(posts)
    .where(eq(posts.status, "publicado"))
    .orderBy(desc(posts.publishedAt))
    .limit(3);

  const upcomingEventosBase = scope.canManageAllTurmas
    ? await db
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
      .limit(4)
    : institutionIds.length > 0
    ? await db
      .select({
        id: eventos.id,
        titulo: eventos.titulo,
        dataInicio: eventos.dataInicio,
        local: eventos.local,
        instituicaoId: eventos.instituicaoId,
      })
      .from(eventos)
      .where(and(eq(eventos.publicado, true), gte(eventos.dataInicio, now), inArray(eventos.instituicaoId, institutionIds)))
      .orderBy(eventos.dataInicio)
      .limit(4)
    : [];

  const highlightedAcervo = await db
    .select({ id: acervo.id, titulo: acervo.titulo, colecao: acervo.colecao, tipo: acervo.tipo })
    .from(acervo)
    .where(eq(acervo.publicado, true))
    .orderBy(desc(acervo.createdAt))
    .limit(3);

  const activeMatriculas = managedTurmaIds.length > 0
    ? await db
      .select({ turmaId: matriculasTurma.turmaId, userId: matriculasTurma.userId })
      .from(matriculasTurma)
      .where(and(eq(matriculasTurma.status, "ativo"), inArray(matriculasTurma.turmaId, managedTurmaIds)))
    : [];

  const managedStudentIds = [...new Set(activeMatriculas.map((row) => row.userId))];
  const managedStudents = managedStudentIds.length > 0
    ? await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        lastLoginAt: users.lastLoginAt,
        createdAt: users.createdAt,
        profileType: profiles.profileType,
        displayName: profiles.displayName,
      })
      .from(users)
      .leftJoin(profiles, eq(profiles.userId, users.id))
      .where(inArray(users.id, managedStudentIds))
    : [];

  const studentsByTurma = new Map<string, number>();
  for (const matricula of activeMatriculas) {
    studentsByTurma.set(matricula.turmaId, (studentsByTurma.get(matricula.turmaId) ?? 0) + 1);
  }

  const institutionById = new Map(linkedInstitutions.map((institution) => [institution.id, institution]));
  const turmasSummary = managedTurmas.map((turma) => ({
    ...turma,
    institutionName: institutionById.get(turma.instituicaoId)?.nome ?? "Instituição vinculada",
    studentsCount: studentsByTurma.get(turma.id) ?? 0,
  }));

  const persistedActivitiesBase = managedTurmaIds.length > 0
    ? await db
      .select({
        id: atividadesTurma.id,
        turmaId: atividadesTurma.turmaId,
        origemChave: atividadesTurma.origemChave,
        titulo: atividadesTurma.titulo,
        resumo: atividadesTurma.resumo,
        foco: atividadesTurma.foco,
        proximoPasso: atividadesTurma.proximoPasso,
        status: atividadesTurma.status,
        createdAt: atividadesTurma.createdAt,
        updatedAt: atividadesTurma.updatedAt,
      })
      .from(atividadesTurma)
      .where(inArray(atividadesTurma.turmaId, managedTurmaIds))
      .orderBy(desc(atividadesTurma.updatedAt))
    : [];

  const prioritizedActivities = persistedActivitiesBase
    .map((activity) => ({
      ...activity,
      urgency: getActivityUrgency(activity),
    }))
    .sort((left, right) => {
      const urgencyWeight = { alta: 3, media: 2, baixa: 1 } as const;
      const urgencyDiff = urgencyWeight[right.urgency.level] - urgencyWeight[left.urgency.level];
      if (urgencyDiff !== 0) {
        return urgencyDiff;
      }

      return right.updatedAt.getTime() - left.updatedAt.getTime();
    });

  const urgencySummary = {
    alta: prioritizedActivities.filter((activity) => activity.urgency.level === "alta").length,
    media: prioritizedActivities.filter((activity) => activity.urgency.level === "media").length,
    baixa: prioritizedActivities.filter((activity) => activity.urgency.level === "baixa").length,
  };

  const upcomingEventos = upcomingEventosBase.map((evento) => ({
    ...evento,
    instituicaoNome: evento.instituicaoId ? institutionById.get(evento.instituicaoId)?.nome ?? null : null,
  }));

  const temporalSummary = {
    updatedLast7Days: prioritizedActivities.filter((activity) => isWithinDays(activity.updatedAt, temporalWindows.week)).length,
    updatedLast30Days: prioritizedActivities.filter((activity) => isWithinDays(activity.updatedAt, temporalWindows.month)).length,
    completedLast30Days: prioritizedActivities.filter((activity) => activity.status === "concluida" && isWithinDays(activity.updatedAt, temporalWindows.month)).length,
    staleOver30Days: prioritizedActivities.filter((activity) => getDaysSince(activity.updatedAt) > temporalWindows.month && activity.status !== "concluida").length,
  };

  const agendaSummary = {
    next30Days: upcomingEventos.filter((evento) => isWithinDays(evento.dataInicio, temporalWindows.month)).length,
    next90Days: upcomingEventos.filter((evento) => isWithinDays(evento.dataInicio, temporalWindows.quarter)).length,
  };

  const turmaTemporalSummary = managedTurmas.map((turma) => {
    const turmaActivities = prioritizedActivities.filter((activity) => activity.turmaId === turma.id);

    return {
      id: turma.id,
      nome: turma.nome,
      institutionName: institutionById.get(turma.instituicaoId)?.nome ?? "Instituição vinculada",
      recentUpdates7Days: turmaActivities.filter((activity) => isWithinDays(activity.updatedAt, temporalWindows.week)).length,
      recentUpdates30Days: turmaActivities.filter((activity) => isWithinDays(activity.updatedAt, temporalWindows.month)).length,
      highPriorityCount: turmaActivities.filter((activity) => activity.urgency.level === "alta").length,
      totalActivities: turmaActivities.length,
    };
  }).sort((left, right) => {
    if (right.highPriorityCount !== left.highPriorityCount) {
      return right.highPriorityCount - left.highPriorityCount;
    }

    return right.recentUpdates30Days - left.recentUpdates30Days;
  });

  const topPriorityTurma = turmaTemporalSummary.find((turma) => turma.highPriorityCount > 0) ?? null;

  const priorityAgendaMatches = upcomingEventos.filter((evento) => {
    const eventLabel = `${evento.titulo} ${evento.local ?? ""}`.toLowerCase();
    return prioritizedActivities.some((activity) => {
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
        id: "resolve-high-priority",
        title: "Retomar atividades em alta prioridade",
        description: topPriorityTurma
          ? `A turma ${topPriorityTurma.nome} concentra ${topPriorityTurma.highPriorityCount} atividade(s) crítica(s). Vale revisar próximo passo e destravar o acompanhamento.`
          : "Há atividades críticas sem próximo passo claro. Vale revisar imediatamente os registros mais sensíveis.",
        href: topPriorityTurma ? `/app/professor/turmas/${topPriorityTurma.id}` : "/app/professor",
        label: topPriorityTurma ? "Abrir turma prioritária" : "Revisar painel",
        tone: "bg-rose-100 text-rose-700",
      }
      : null,
    temporalSummary.staleOver30Days > 0
      ? {
        id: "reactivate-stale",
        title: "Reativar atividades sem atualização",
        description: `${temporalSummary.staleOver30Days} atividade(s) seguem abertas sem atualização há mais de 30 dias. Vale registrar devolutiva, redefinir foco ou encerrar o ciclo.`,
        href: "/app/professor",
        label: "Ver atividades registradas",
        tone: "bg-amber-100 text-amber-700",
      }
      : null,
    agendaSummary.next30Days > 0 && priorityAgendaMatches.length > 0
      ? {
        id: "connect-agenda",
        title: "Converter prioridade em ação com a agenda",
        description: `${priorityAgendaMatches.length} evento(s) da agenda já têm aderência inicial com atividades em atenção. Vale articular visita, oficina ou participação guiada.`,
        href: "/agenda",
        label: "Abrir agenda educativa",
        tone: "bg-mar-azul/10 text-mar-azul",
      }
      : null,
    linkedInstitutions.length === 0
      ? {
        id: "link-institution",
        title: "Formalizar vínculo institucional",
        description: "Sem instituição vinculada, o painel perde capacidade territorial e educativa. Vale completar o vínculo para organizar rede, agenda e turmas.",
        href: "/app/perfil",
        label: "Atualizar perfil",
        tone: "bg-mar-cobre/10 text-mar-cobre",
      }
      : null,
    turmasSummary.length > 0 && urgencySummary.alta === 0 && temporalSummary.updatedLast7Days === 0
      ? {
        id: "restart-routine",
        title: "Retomar rotina semanal de acompanhamento",
        description: "Não houve atualização recente nas turmas nos últimos 7 dias. Vale registrar avanços, próximos passos ou mediações em andamento.",
        href: `/app/professor/turmas/${turmasSummary[0]?.id ?? ""}`,
        label: "Abrir uma turma",
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

  const recentStudents = [...managedStudents]
    .sort((left, right) => {
      const leftDate = left.lastLoginAt ?? left.createdAt;
      const rightDate = right.lastLoginAt ?? right.createdAt;
      return rightDate.getTime() - leftDate.getTime();
    })
    .slice(0, 4)
    .map((student) => ({
      id: student.id,
      name: student.displayName ?? student.name,
      email: student.email,
      profileLabel: student.profileType ?? "sem_perfil",
      referenceDate: student.lastLoginAt ?? student.createdAt,
    }));

  const attentionPoints: string[] = [];
  if (linkedInstitutions.length === 0) {
    attentionPoints.push("Seu perfil ainda não possui instituição vinculada. Isso limita a leitura territorial e a agenda dedicada.");
  }
  if (turmasSummary.length === 0) {
    attentionPoints.push("Você ainda não aparece como responsável por turmas ativas. Vale organizar essa atribuição para fortalecer o uso pedagógico.");
  }
  if (upcomingEventosBase.length === 0) {
    attentionPoints.push("Não há eventos futuros vinculados à sua rede institucional neste momento.");
  }
  if (attentionPoints.length === 0) {
    attentionPoints.push("Sua base atual já permite acompanhar turmas, agenda e recursos pedagógicos a partir do território.");
  }

  // Estatísticas da Gincana Francisco Araújo
  const isFranciscoAraujo = linkedInstitutions.some((inst) => inst.nome.includes("Francisco Araújo"));
  let gincanaStats = null;

  if (isFranciscoAraujo) {
    const checkins = managedTurmaIds.length > 0
      ? await db
          .select()
          .from(gincanaCheckins)
          .where(inArray(gincanaCheckins.turmaId, managedTurmaIds))
      : [];

    const uniqueUsers = new Set(checkins.map(c => c.userId));
    
    gincanaStats = {
      equipesAtivas: uniqueUsers.size,
      missoesConcluidas: checkins.length,
      proximaEstacao: checkins.length > 0 ? "Cais de Perocão" : "Igreja de Perocão",
      equipesEmDeslocamento: Math.max(0, uniqueUsers.size - (checkins.length % 3)), // Exemplo de lógica
    };
  }

  return {
    postsCount: postsCountResult?.value ?? 0,
    acervoCount: acervoCountResult?.value ?? 0,
    eventosCount: eventosCountResult?.value ?? 0,
    featuredPosts,
    upcomingEventos,
    highlightedAcervo,
    linkedInstitutions,
    turmasSummary,
    studentsCount: managedStudentIds.length,
    recentStudents,
    attentionPoints,
    persistedActivities: prioritizedActivities,
    urgencySummary,
    temporalSummary,
    agendaSummary,
    turmaTemporalSummary,
    priorityAgendaMatches,
    actionRecommendations,
    gincanaStats, // Retornar as estatísticas
  };
}

export default async function ProfessorDashboardPage() {
  const session = await requireProfessorAccess();
  const roles = extractRoles(session);
  const scope = await resolveEducationalAccess(session);

  async function registerActivityPlan(formData: FormData) {
    "use server";

    const session = await requireProfessorAccess();
    const parsed = professorActivityPlanSchema.safeParse({
      turmaId: String(formData.get("turmaId") ?? ""),
      sourceKey: String(formData.get("sourceKey") ?? ""),
      titulo: String(formData.get("titulo") ?? ""),
      resumo: String(formData.get("resumo") ?? ""),
      foco: String(formData.get("foco") ?? ""),
      proximoPasso: String(formData.get("proximoPasso") ?? ""),
    });

    if (!parsed.success) {
      return;
    }

    const { turmaId, sourceKey, titulo, resumo, foco, proximoPasso } = parsed.data;

    const [turma] = await db
      .select({ id: turmas.id, responsavelUserId: turmas.responsavelUserId, instituicaoId: turmas.instituicaoId })
      .from(turmas)
      .where(eq(turmas.id, turmaId))
      .limit(1);

    if (!turma) {
      return;
    }

    const scope = await resolveEducationalAccess(session);
    if (!canAccessTurma(scope, turma)) {
      return;
    }

    await db
      .insert(atividadesTurma)
      .values({
        id: crypto.randomUUID(),
        turmaId,
        createdBy: session.user.id,
        origemChave: sourceKey,
        titulo,
        resumo,
        foco: foco || null,
        proximoPasso: proximoPasso || null,
        status: "planejada",
        updatedAt: new Date(),
      })
      .onConflictDoNothing({ target: [atividadesTurma.turmaId, atividadesTurma.origemChave] });

    revalidatePath("/app/professor");
    revalidatePath(`/app/professor/turmas/${turmaId}`);
    revalidatePath("/app/estudante");
  }

  async function updateActivity(formData: FormData) {
    "use server";

    const session = await requireProfessorAccess();
    const parsed = professorActivityUpdateSchema.safeParse({
      activityId: String(formData.get("activityId") ?? ""),
      status: String(formData.get("status") ?? "planejada"),
      proximoPasso: String(formData.get("proximoPasso") ?? ""),
    });

    if (!parsed.success) {
      return;
    }

    const { activityId, status, proximoPasso } = parsed.data;

    const [activity] = await db
      .select({
        id: atividadesTurma.id,
        turmaId: atividadesTurma.turmaId,
        status: atividadesTurma.status,
        proximoPasso: atividadesTurma.proximoPasso,
        responsavelUserId: turmas.responsavelUserId,
        instituicaoId: turmas.instituicaoId,
      })
      .from(atividadesTurma)
      .innerJoin(turmas, eq(atividadesTurma.turmaId, turmas.id))
      .where(eq(atividadesTurma.id, activityId))
      .limit(1);

    if (!activity) {
      return;
    }

    const scope = await resolveEducationalAccess(session);
    if (!canAccessTurma(scope, activity)) {
      return;
    }

    await db
      .update(atividadesTurma)
      .set({
        status: status as "planejada" | "em_andamento" | "concluida",
        proximoPasso: proximoPasso || null,
        updatedAt: new Date(),
      })
      .where(eq(atividadesTurma.id, activity.id));

    revalidatePath("/app/professor");
    revalidatePath(`/app/professor/turmas/${activity.turmaId}`);
    revalidatePath("/app/estudante");
  }

  const data = await getTeacherDashboardData(session.user.id, scope);
  const tracks = await getTeacherPedagogicalTracks({
    hasInstitutions: data.linkedInstitutions.length > 0,
    hasTurmas: data.turmasSummary.length > 0,
    hasEvents: data.upcomingEventos.length > 0,
  });
  const classroomPlans = getTeacherClassroomActivityPlans({
    turmas: data.turmasSummary.map((turma) => ({
      id: turma.id,
      nome: turma.nome,
      institutionName: turma.institutionName,
      studentsCount: turma.studentsCount,
    })),
    hasUpcomingEvents: data.upcomingEventos.length > 0,
    hasInstitutions: data.linkedInstitutions.length > 0,
  });
  const registeredPlanKeys = new Set(data.persistedActivities.map((activity) => `${activity.turmaId}:${activity.origemChave}`));
  const primaryRecommendation = data.actionRecommendations[0] ?? null;
  const weeklyRhythmLabel = data.temporalSummary.updatedLast7Days > 0
    ? `${data.temporalSummary.updatedLast7Days} atualização(ões) nos últimos 7 dias`
    : "Nenhuma atualização registrada nos últimos 7 dias";
  const agendaWindowLabel = data.agendaSummary.next30Days > 0
    ? `${data.agendaSummary.next30Days} oportunidade(s) na agenda nos próximos 30 dias`
    : "Sem oportunidade imediata na agenda educativa";
  const quickLinks = [
    {
      href: "#recomendacoes-acao",
      label: "Onde agir agora",
      description: "urgências e próximos movimentos",
    },
    {
      href: "#prioridades-acompanhamento",
      label: "Prioridades",
      description: "atividades que pedem retomada",
    },
    {
      href: "#pulso-temporal",
      label: "Pulso temporal",
      description: "ritmo recente por turma",
    },
    {
      href: "#atividades-registradas",
      label: "Atividades",
      description: "acompanhamentos já persistidos",
    },
    {
      href: "#planos-rapidos",
      label: "Planos rápidos",
      description: "entradas operacionais por turma",
    },
    {
      href: "#agenda-educativa",
      label: "Agenda educativa",
      description: "pontes com visitas e eventos",
    },
  ];
  const openActivities = data.persistedActivities.filter((activity) => activity.status !== "concluida");
  const priorityActivity = openActivities[0] ?? null;
  const priorityTurma = priorityActivity
    ? data.turmasSummary.find((turma) => turma.id === priorityActivity.turmaId) ?? null
    : data.turmasSummary[0] ?? null;
  const nextEvent = data.upcomingEventos[0] ?? null;
  const professorScopeLabel = data.linkedInstitutions.length > 0
    ? data.linkedInstitutions.length === 1
      ? data.linkedInstitutions[0]?.nome ?? "minha rede escolar"
      : `${data.linkedInstitutions.length} instituições vinculadas`
    : "meu painel pedagógico";
  const professorShortSummary = joinShareLines([
    "Síntese rápida do painel do professor",
    `Rede: ${professorScopeLabel}`,
    `Estado: ${data.turmasSummary.length} turma(s), ${data.studentsCount} estudante(s), ${data.urgencySummary.alta} prioridade(s) alta(s).`,
    primaryRecommendation ? `Ação: ${primaryRecommendation.description}` : "Ação: manter a rotina de acompanhamento pedagógico das turmas.",
    priorityTurma
      ? `Turma em foco: ${priorityTurma.nome} · ${priorityTurma.institutionName}`
      : "Turma em foco: ainda sem turma ativa com leitura prioritária.",
    nextEvent
      ? `Próximo marco: ${nextEvent.titulo} em ${formatDate(nextEvent.dataInicio)}.`
      : "Próximo marco: ainda sem evento futuro na agenda educativa.",
  ]);
  const professorFullSummary = joinShareLines([
    "Resumo do painel do professor",
    `Gerado em ${formatDate(new Date())}`,
    "",
    `Rede escolar: ${professorScopeLabel}`,
    `Turmas acompanhadas: ${data.turmasSummary.length}`,
    `Estudantes alcançados: ${data.studentsCount}`,
    `Atividades abertas: ${openActivities.length}`,
    `Alta prioridade: ${data.urgencySummary.alta}`,
    `Atenção: ${data.urgencySummary.media}`,
    `Em ritmo adequado: ${data.urgencySummary.baixa}`,
    primaryRecommendation ? `Ação recomendada: ${primaryRecommendation.description}` : "Ação recomendada: manter a rotina de acompanhamento pedagógico das turmas.",
    priorityActivity
      ? `Atividade em foco: ${priorityActivity.titulo}${priorityTurma ? ` · ${priorityTurma.nome}` : ""}${priorityActivity.proximoPasso ? ` · Próximo passo: ${priorityActivity.proximoPasso}` : ""}`
      : "Atividade em foco: nenhuma atividade aberta requer retomada imediata.",
    nextEvent
      ? `Próximo evento da rede: ${nextEvent.titulo} em ${formatDate(nextEvent.dataInicio)}${nextEvent.instituicaoNome ? ` · ${nextEvent.instituicaoNome}` : ""}.`
      : "Próximo evento da rede: ainda sem oportunidade futura na agenda educativa.",
  ]);
  const professorWhatsAppMessage = buildOperationalWhatsAppShareText({
    heading: "Painel do professor",
    state: `${data.turmasSummary.length} turma(s), ${data.studentsCount} estudante(s), ${data.urgencySummary.alta} prioridade(s) alta(s).`,
    action: primaryRecommendation?.description ?? "manter a rotina de acompanhamento pedagógico das turmas.",
    ctaPath: priorityTurma ? `/app/professor/turmas/${priorityTurma.id}` : "/app/professor",
    checkpoint: nextEvent ? `${nextEvent.titulo} em ${formatDate(nextEvent.dataInicio)}.` : null,
  });
  const professorMailtoHref = buildMailtoLink(null, "Resumo do painel do professor", professorFullSummary);
  const professorWhatsAppHref = buildWhatsAppShareLink(professorWhatsAppMessage);

  return (
    <div className="p-8 md:p-10">
      <div className="max-w-6xl">
        <div className="mb-10 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-sm uppercase tracking-wide text-mar-azul font-medium">
            <GraduationCap className="w-4 h-4" />
            Jornada do Professor
          </div>
          <h1 className="font-serif text-4xl font-bold text-mar-escuro">Painel pedagógico</h1>
          <p className="text-mar-escuro/60 max-w-3xl leading-relaxed">
            Área inicial para apoiar docentes no uso do acervo, da agenda e das narrativas do Museu do Mar em práticas pedagógicas, projetos de turma e visitas educativas.
          </p>
          {roles.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {roles.map((role) => (
                <span key={role} className="badge bg-mar-azul/10 text-mar-azul">
                  {role}
                </span>
              ))}
            </div>
          )}
        {data.gincanaStats && (
          <GincanaFranciscoAraujoMonitor stats={data.gincanaStats} className="mb-10" />
        )}
        </div>

        <section className="grid xl:grid-cols-[1.05fr,0.95fr] gap-6 mb-10">
          <div className="bg-mar-creme rounded-2xl border border-mar-areia/30 p-6">
            <div className="flex items-center gap-2 text-sm font-medium text-mar-cobre">
              <AlertTriangle className="w-4 h-4" />
              Leitura do momento
            </div>
            <h2 className="mt-3 font-serif text-2xl font-bold text-mar-escuro">
              {primaryRecommendation ? primaryRecommendation.title : "Painel organizado para acompanhamento pedagógico"}
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-mar-escuro/65">
              {primaryRecommendation
                ? primaryRecommendation.description
                : "Sua base atual já permite acompanhar turmas, agenda, recursos e registros pedagógicos com boa visibilidade do território e do ritmo de acompanhamento."}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="badge bg-rose-100 text-rose-700">{data.urgencySummary.alta} em alta prioridade</span>
              <span className="badge bg-mar-azul/10 text-mar-azul">{weeklyRhythmLabel}</span>
              <span className="badge bg-mar-verde/10 text-mar-verde">{agendaWindowLabel}</span>
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              {primaryRecommendation ? (
                <Link href={primaryRecommendation.href} className="btn-secondary inline-flex items-center gap-2 text-sm">
                  {primaryRecommendation.label}
                  <ArrowRight className="w-4 h-4" />
                </Link>
              ) : (
                <Link href="#prioridades-acompanhamento" className="btn-secondary inline-flex items-center gap-2 text-sm">
                  Ir para prioridades
                  <ArrowRight className="w-4 h-4" />
                </Link>
              )}
              <Link href="/app/perfil" className="inline-flex items-center gap-2 text-sm font-medium text-mar-azul">
                Revisar vínculo e perfil
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-mar-areia/30 p-6">
            <div className="flex items-center gap-2 text-sm font-medium text-mar-azul">
              <NotebookText className="w-4 h-4" />
              Atalhos do painel
            </div>
            <h2 className="mt-3 font-serif text-2xl font-bold text-mar-escuro">Navegação rápida</h2>
            <p className="mt-2 text-sm leading-relaxed text-mar-escuro/60">
              Use estes pontos de entrada para chegar direto à seção útil sem percorrer todo o painel.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {quickLinks.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-xl border border-mar-areia/30 p-4 transition-colors hover:border-mar-azul/30"
                >
                  <p className="font-medium text-mar-escuro">{item.label}</p>
                  <p className="mt-1 text-sm text-mar-escuro/55">{item.description}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <div className="grid md:grid-cols-3 gap-5 mb-10">
          {[
            { label: "Instituições vinculadas", value: data.linkedInstitutions.length, icon: Building2, tone: "text-mar-azul bg-mar-azul/10" },
            { label: "Turmas sob acompanhamento", value: data.turmasSummary.length, icon: School, tone: "text-mar-verde bg-mar-verde/10" },
            { label: "Estudantes alcançados", value: data.studentsCount, icon: Users, tone: "text-mar-cobre bg-mar-cobre/10" },
          ].map((item) => (
            <div key={item.label} className="bg-white rounded-2xl border border-mar-areia/30 p-6">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${item.tone}`}>
                <item.icon className="w-5 h-5" />
              </div>
              <p className="text-sm text-mar-escuro/50 mt-4">{item.label}</p>
              <p className="font-serif text-3xl font-bold text-mar-escuro mt-1">{item.value}</p>
            </div>
          ))}
        </div>

        <section className="mb-10 rounded-2xl border border-mar-areia/30 bg-white p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <div className="flex items-center gap-2 text-sm font-medium uppercase tracking-wide text-mar-cobre">
                <ScrollText className="h-4 w-4" />
                Resumo compartilhável
              </div>
              <h2 className="mt-2 font-serif text-2xl font-bold text-mar-escuro">Leitura curta do acompanhamento pedagógico</h2>
              <p className="mt-2 text-sm leading-relaxed text-mar-escuro/60">
                Síntese rápida para alinhamento com coordenação, equipe escolar ou parceiros sem sair do painel do professor.
              </p>
              <div className="mt-4 whitespace-pre-line rounded-xl bg-mar-creme p-4 text-sm leading-relaxed text-mar-escuro/70">
                {professorShortSummary}
              </div>
            </div>

            <div className="flex flex-wrap gap-3 lg:max-w-sm lg:justify-end">
              <CopyTextButton
                text={professorShortSummary}
                label="Copiar resumo"
                copiedLabel="Resumo copiado"
                className="inline-flex items-center gap-2 rounded-full border border-mar-cobre/25 bg-white px-4 py-2 text-sm font-medium text-mar-cobre transition-colors hover:border-mar-cobre/45"
              />
              <a
                href={professorMailtoHref}
                className="inline-flex items-center gap-2 rounded-full border border-mar-areia/40 bg-white px-4 py-2 text-sm font-medium text-mar-azul transition-colors hover:border-mar-azul/30"
              >
                <Mail className="h-4 w-4" />
                Abrir e-mail
              </a>
              <a
                href={professorWhatsAppHref}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-mar-verde/25 bg-white px-4 py-2 text-sm font-medium text-mar-verde transition-colors hover:border-mar-verde/45"
              >
                <MessageSquareShare className="h-4 w-4" />
                Compartilhar via WhatsApp
              </a>
            </div>
          </div>
        </section>

        <div className="grid xl:grid-cols-[1.2fr,0.8fr] gap-6 mb-10">
          <section id="recursos-aula" className="bg-white rounded-2xl border border-mar-areia/30 p-6 scroll-mt-28">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="font-serif text-2xl font-bold text-mar-escuro">Recursos para aula</h2>
                <p className="text-sm text-mar-escuro/55 mt-1">Conteúdos já disponíveis para apoiar aulas, projetos e rodas de conversa.</p>
              </div>
              <Link href="/blog" className="text-sm font-medium text-mar-azul inline-flex items-center gap-1">
                Ver blog <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="space-y-4">
              {data.featuredPosts.map((post) => (
                <Link key={post.id} href={`/blog/${post.slug}`} className="block rounded-xl border border-mar-areia/30 p-4 hover:border-mar-azul/30 transition-colors">
                  <h3 className="font-medium text-mar-escuro">{post.title}</h3>
                  <p className="text-xs text-mar-escuro/45 mt-1">{formatDate(post.publishedAt)}</p>
                  {post.summary && <p className="text-sm text-mar-escuro/60 mt-2 leading-relaxed">{post.summary}</p>}
                </Link>
              ))}
            </div>
          </section>

          <section className="bg-white rounded-2xl border border-mar-areia/30 p-6">
            <h2 className="font-serif text-2xl font-bold text-mar-escuro mb-5">Próximas ações</h2>
            <div className="space-y-4">
              {data.attentionPoints.map((item) => (
                <div key={item} className="rounded-xl bg-mar-creme p-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-mar-cobre mb-2">
                    <NotebookText className="w-4 h-4" />
                    Leitura pedagógica
                  </div>
                  <p className="text-sm text-mar-escuro/60 leading-relaxed">{item}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        <section className="bg-white rounded-2xl border border-mar-areia/30 p-6 mb-10">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-serif text-2xl font-bold text-mar-escuro">Trilhas pedagógicas sugeridas</h2>
              <p className="text-sm text-mar-escuro/55 mt-1">Sequências curtas para transformar contexto institucional em ação pedagógica.</p>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            {tracks.map((track) => (
              <div key={track.id} className="rounded-xl border border-mar-areia/30 p-5">
                <h3 className="font-medium text-mar-escuro">{track.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-mar-escuro/60">{track.description}</p>
                <div className="mt-3 rounded-lg bg-mar-creme px-3 py-2 text-xs leading-relaxed text-mar-cobre">
                  {track.highlight}
                </div>
                <ul className="mt-4 space-y-2 text-sm text-mar-escuro/65">
                  {track.steps.map((step) => (
                    <li key={step}>• {step}</li>
                  ))}
                </ul>
                <div className="mt-4 flex flex-wrap gap-2">
                  {track.links.map((link) => (
                    <Link key={link.href + link.label} href={link.href} className="badge bg-mar-azul/10 text-mar-azul">
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="recomendacoes-acao" className="bg-white rounded-2xl border border-mar-areia/30 p-6 mb-10 scroll-mt-28">
          <div className="flex items-center justify-between mb-5 gap-4">
            <div>
              <h2 className="font-serif text-2xl font-bold text-mar-escuro">Recomendações de ação</h2>
              <p className="text-sm text-mar-escuro/55 mt-1">Próximos movimentos sugeridos a partir das urgências, do ritmo recente e da agenda da rede.</p>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            {data.actionRecommendations.length > 0 ? data.actionRecommendations.map((recommendation) => (
              <div key={recommendation.id} className="rounded-xl border border-mar-areia/30 p-5">
                <span className={`badge ${recommendation.tone}`}>{recommendation.title}</span>
                <p className="mt-3 text-sm leading-relaxed text-mar-escuro/60">{recommendation.description}</p>
                <Link href={recommendation.href} className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-mar-azul">
                  {recommendation.label} <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            )) : (
              <div className="rounded-xl bg-mar-creme p-4 text-sm leading-relaxed text-mar-escuro/60 xl:col-span-2">
                Não há recomendações críticas neste momento. O painel indica um ciclo pedagógico estável e com acompanhamento recente.
              </div>
            )}
          </div>
        </section>

        <section id="prioridades-acompanhamento" className="bg-white rounded-2xl border border-mar-areia/30 p-6 mb-10 scroll-mt-28">
          <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
            <div>
              <h2 className="font-serif text-2xl font-bold text-mar-escuro">Prioridades do acompanhamento</h2>
              <p className="text-sm text-mar-escuro/55 mt-1">Síntese das atividades que pedem retomada no conjunto das suas turmas.</p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-mar-cobre/10 px-4 py-2 text-xs font-medium uppercase tracking-wide text-mar-cobre">
              <AlertTriangle className="h-4 w-4" />
              {data.urgencySummary.alta} em alta prioridade
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3 mb-6">
            <div className="rounded-xl border border-mar-areia/30 bg-mar-creme/60 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-mar-escuro/55">Alta prioridade</p>
              <p className="mt-2 font-serif text-3xl font-bold text-mar-escuro">{data.urgencySummary.alta}</p>
              <p className="mt-2 text-sm text-mar-escuro/55">Atividades que pedem intervenção imediata.</p>
            </div>
            <div className="rounded-xl border border-mar-areia/30 bg-mar-creme/60 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-mar-escuro/55">Atenção</p>
              <p className="mt-2 font-serif text-3xl font-bold text-mar-escuro">{data.urgencySummary.media}</p>
              <p className="mt-2 text-sm text-mar-escuro/55">Atividades que pedem acompanhamento em breve.</p>
            </div>
            <div className="rounded-xl border border-mar-areia/30 bg-mar-creme/60 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-mar-escuro/55">Em ritmo adequado</p>
              <p className="mt-2 font-serif text-3xl font-bold text-mar-escuro">{data.urgencySummary.baixa}</p>
              <p className="mt-2 text-sm text-mar-escuro/55">Atividades estáveis ou concluídas.</p>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
            <div className="space-y-3">
              {data.persistedActivities.length > 0 ? data.persistedActivities.slice(0, 4).map((activity) => {
                const turma = data.turmasSummary.find((item) => item.id === activity.turmaId);

                return (
                  <div key={activity.id} className="rounded-xl border border-mar-areia/30 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="font-medium text-mar-escuro">{activity.titulo}</h3>
                        <p className="mt-1 text-sm text-mar-escuro/55">{turma?.nome ?? "Turma vinculada"}{turma ? ` · ${turma.institutionName}` : ""}</p>
                      </div>
                      <span className={`badge ${activity.urgency.level === "alta" ? "bg-rose-100 text-rose-700" : activity.urgency.level === "media" ? "bg-amber-100 text-amber-700" : "bg-mar-verde/10 text-mar-verde"}`}>
                        {activity.urgency.label}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-mar-escuro/60">{activity.urgency.reason}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-mar-escuro/45">
                      <span>Atualizada em {formatDate(activity.updatedAt)}</span>
                      {activity.proximoPasso && <span>Próximo passo: {activity.proximoPasso}</span>}
                    </div>
                    <Link href={`/app/professor/turmas/${activity.turmaId}`} className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-mar-azul">
                      Abrir central da turma <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                );
              }) : (
                <div className="rounded-xl bg-mar-creme p-4 text-sm leading-relaxed text-mar-escuro/60">
                  Nenhuma atividade registrada ainda para consolidar prioridade pedagógica.
                </div>
              )}
            </div>

            <div className="rounded-xl border border-mar-areia/30 p-4">
              <h3 className="font-medium text-mar-escuro">Pontes com a agenda educativa</h3>
              <p className="mt-1 text-sm text-mar-escuro/55">Eventos futuros que podem ajudar a destravar atividades em atenção.</p>
              <div className="mt-4 space-y-3">
                {data.priorityAgendaMatches.length > 0 ? data.priorityAgendaMatches.map((evento) => (
                  <Link key={evento.id} href={`/agenda/${evento.id}`} className="block rounded-xl border border-mar-areia/30 p-4 transition-colors hover:border-mar-azul/30">
                    <h4 className="font-medium text-mar-escuro">{evento.titulo}</h4>
                    <p className="mt-1 text-sm text-mar-escuro/55">{formatDate(evento.dataInicio)}</p>
                    {evento.instituicaoNome && <p className="mt-1 text-xs uppercase tracking-wide text-mar-cobre/80">{evento.instituicaoNome}</p>}
                    {evento.local && <p className="mt-1 text-sm text-mar-escuro/55">{evento.local}</p>}
                  </Link>
                )) : (
                  <div className="rounded-xl bg-mar-creme p-4 text-sm leading-relaxed text-mar-escuro/60">
                    Ainda não há eventos diretamente relacionados às atividades prioritárias. Vale observar a agenda da rede para converter prioridade em ação compartilhada.
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <section id="pulso-temporal" className="bg-white rounded-2xl border border-mar-areia/30 p-6 mb-10 scroll-mt-28">
          <div className="flex items-center justify-between mb-5 gap-4">
            <div>
              <h2 className="font-serif text-2xl font-bold text-mar-escuro">Pulso temporal do acompanhamento</h2>
              <p className="text-sm text-mar-escuro/55 mt-1">Leitura resumida do ritmo recente das atividades e da janela de agenda educativa.</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 mb-6">
            {[
              {
                label: "Atualizadas em 7 dias",
                value: data.temporalSummary.updatedLast7Days,
                description: "movimentação muito recente das atividades",
              },
              {
                label: "Atualizadas em 30 dias",
                value: data.temporalSummary.updatedLast30Days,
                description: "ritmo mensal de acompanhamento",
              },
              {
                label: "Concluídas em 30 dias",
                value: data.temporalSummary.completedLast30Days,
                description: "entregas pedagógicas fechadas recentemente",
              },
              {
                label: "Sem atualização há +30 dias",
                value: data.temporalSummary.staleOver30Days,
                description: "atividades que podem precisar de reativação",
              },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-mar-areia/30 bg-mar-creme/60 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-mar-escuro/55">{item.label}</p>
                <p className="mt-2 font-serif text-3xl font-bold text-mar-escuro">{item.value}</p>
                <p className="mt-2 text-sm text-mar-escuro/55">{item.description}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
            <div>
              <h3 className="font-medium text-mar-escuro">Ritmo por turma</h3>
              <div className="mt-4 space-y-3">
                {data.turmaTemporalSummary.length > 0 ? data.turmaTemporalSummary.map((turma) => (
                  <div key={turma.id} className="rounded-xl border border-mar-areia/30 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h4 className="font-medium text-mar-escuro">{turma.nome}</h4>
                        <p className="mt-1 text-sm text-mar-escuro/55">{turma.institutionName}</p>
                      </div>
                      <span className={`badge ${turma.highPriorityCount > 0 ? "bg-rose-100 text-rose-700" : "bg-mar-verde/10 text-mar-verde"}`}>
                        {turma.highPriorityCount > 0 ? `${turma.highPriorityCount} alta prioridade` : "Sem urgência alta"}
                      </span>
                    </div>
                    <div className="mt-3 grid gap-3 md:grid-cols-3 text-sm text-mar-escuro/60">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-mar-escuro/45">Últimos 7 dias</p>
                        <p className="mt-1 font-medium text-mar-escuro">{turma.recentUpdates7Days} atualização(ões)</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-mar-escuro/45">Últimos 30 dias</p>
                        <p className="mt-1 font-medium text-mar-escuro">{turma.recentUpdates30Days} atualização(ões)</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-mar-escuro/45">Base total</p>
                        <p className="mt-1 font-medium text-mar-escuro">{turma.totalActivities} atividade(s)</p>
                      </div>
                    </div>
                    <Link href={`/app/professor/turmas/${turma.id}`} className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-mar-azul">
                      Abrir central da turma <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                )) : (
                  <div className="rounded-xl bg-mar-creme p-4 text-sm leading-relaxed text-mar-escuro/60">
                    Nenhuma turma com atividades suficientes para compor leitura temporal.
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-mar-areia/30 p-4">
              <h3 className="font-medium text-mar-escuro">Janela de agenda educativa</h3>
              <p className="mt-1 text-sm text-mar-escuro/55">Proximidade entre acompanhamento pedagógico e oportunidades públicas da rede.</p>
              <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-1">
                <div className="rounded-xl bg-mar-creme/60 p-4">
                  <p className="text-xs uppercase tracking-wide text-mar-escuro/45">Próximos 30 dias</p>
                  <p className="mt-2 font-serif text-3xl font-bold text-mar-escuro">{data.agendaSummary.next30Days}</p>
                  <p className="mt-2 text-sm text-mar-escuro/55">eventos potencialmente acionáveis no curto prazo</p>
                </div>
                <div className="rounded-xl bg-mar-creme/60 p-4">
                  <p className="text-xs uppercase tracking-wide text-mar-escuro/45">Próximos 90 dias</p>
                  <p className="mt-2 font-serif text-3xl font-bold text-mar-escuro">{data.agendaSummary.next90Days}</p>
                  <p className="mt-2 text-sm text-mar-escuro/55">oportunidades para planejamento pedagógico ampliado</p>
                </div>
              </div>
              <Link href="/agenda" className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-mar-azul">
                Ver agenda completa <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>

        <section id="atividades-registradas" className="bg-white rounded-2xl border border-mar-areia/30 p-6 mb-10 scroll-mt-28">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-serif text-2xl font-bold text-mar-escuro">Atividades registradas</h2>
              <p className="text-sm text-mar-escuro/55 mt-1">Planos já materializados para acompanhamento pedagógico das turmas.</p>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            {data.persistedActivities.length > 0 ? data.persistedActivities.slice(0, 6).map((activity) => {
              const turma = data.turmasSummary.find((item) => item.id === activity.turmaId);

              return (
                <div key={activity.id} className="rounded-xl border border-mar-areia/30 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-medium text-mar-escuro">{activity.titulo}</h3>
                      <p className="mt-1 text-sm text-mar-escuro/55">{turma?.nome ?? "Turma vinculada"}{turma ? ` · ${turma.institutionName}` : ""}</p>
                    </div>
                    <span className="badge bg-mar-verde/10 text-mar-verde">{activityStatusLabelMap[activity.status]}</span>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-mar-escuro/60">{activity.resumo}</p>
                  {activity.foco && <p className="mt-3 text-xs uppercase tracking-wide text-mar-cobre/80">Foco: {activity.foco}</p>}
                  <form action={updateActivity} className="mt-4 space-y-3 rounded-xl bg-mar-creme/60 p-4">
                    <input type="hidden" name="activityId" value={activity.id} />
                    <div className="grid gap-3 md:grid-cols-[180px,1fr]">
                      <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wide text-mar-escuro/55">
                        Status
                        <select
                          name="status"
                          defaultValue={activity.status}
                          className="rounded-lg border border-mar-areia/40 bg-white px-3 py-2 text-sm font-normal text-mar-escuro outline-none focus:border-mar-azul/40"
                        >
                          <option value="planejada">Planejada</option>
                          <option value="em_andamento">Em andamento</option>
                          <option value="concluida">Concluída</option>
                        </select>
                      </label>

                      <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wide text-mar-escuro/55">
                        Próximo passo
                        <input
                          type="text"
                          name="proximoPasso"
                          defaultValue={activity.proximoPasso ?? ""}
                          className="rounded-lg border border-mar-areia/40 bg-white px-3 py-2 text-sm font-normal text-mar-escuro outline-none focus:border-mar-azul/40"
                          placeholder="Ex.: combinar devolutiva, registrar resultados, preparar visita"
                        />
                      </label>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="text-xs text-mar-escuro/45">
                        Registrada em {formatDate(activity.createdAt)}
                      </div>
                      <div className="flex items-center gap-2">
                        <Link href={`/app/professor/turmas/${activity.turmaId}`} className="text-sm font-medium text-mar-azul">
                          Ver turma
                        </Link>
                        <button type="submit" className="btn-secondary text-sm">Salvar acompanhamento</button>
                      </div>
                    </div>
                  </form>
                </div>
              );
            }) : (
              <div className="rounded-xl bg-mar-creme p-4 text-sm leading-relaxed text-mar-escuro/60 xl:col-span-2">
                Nenhuma atividade persistida ainda. Você já pode registrar um dos planos rápidos por turma abaixo.
              </div>
            )}
          </div>
        </section>

        <section id="planos-rapidos" className="bg-white rounded-2xl border border-mar-areia/30 p-6 mb-10 scroll-mt-28">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-serif text-2xl font-bold text-mar-escuro">Planos rápidos por turma</h2>
              <p className="text-sm text-mar-escuro/55 mt-1">Objetos operacionais simples para sair de leitura e entrar em ação com cada turma.</p>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            {classroomPlans.map((plan) => (
              <div key={plan.id} className="rounded-xl border border-mar-areia/30 p-5">
                <span className="badge bg-mar-cobre/10 text-mar-cobre">{plan.audienceLabel}</span>
                <h3 className="mt-3 font-medium text-mar-escuro">{plan.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-mar-escuro/60">{plan.summary}</p>
                <p className="mt-3 text-xs uppercase tracking-wide text-mar-azul/80">Foco: {plan.focus}</p>
                <ul className="mt-4 space-y-2 text-sm text-mar-escuro/65">
                  {plan.steps.map((step) => (
                    <li key={step}>• {step}</li>
                  ))}
                </ul>
                {plan.turmaId && plan.sourceKey ? (
                  registeredPlanKeys.has(`${plan.turmaId}:${plan.sourceKey}`) ? (
                    <div className="mt-4">
                      <span className="badge bg-mar-verde/10 text-mar-verde">Já registrada</span>
                    </div>
                  ) : (
                    <form action={registerActivityPlan} className="mt-4">
                      <input type="hidden" name="turmaId" value={plan.turmaId} />
                      <input type="hidden" name="sourceKey" value={plan.sourceKey} />
                      <input type="hidden" name="titulo" value={plan.title} />
                      <input type="hidden" name="resumo" value={plan.summary} />
                      <input type="hidden" name="foco" value={plan.focus} />
                      <input type="hidden" name="proximoPasso" value={plan.steps[plan.steps.length - 1] ?? ""} />
                      <button type="submit" className="btn-secondary text-sm">Registrar atividade</button>
                    </form>
                  )
                ) : null}
                <div className="mt-4 flex flex-wrap gap-2">
                  {plan.links.map((link) => (
                    <Link key={link.href + link.label} href={link.href} className="badge bg-mar-azul/10 text-mar-azul">
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="grid xl:grid-cols-[0.95fr,1.05fr] gap-6 mb-10">
          <section className="bg-white rounded-2xl border border-mar-areia/30 p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="font-serif text-2xl font-bold text-mar-escuro">Minha rede escolar</h2>
                <p className="text-sm text-mar-escuro/55 mt-1">Instituições vinculadas ao seu perfil para leitura territorial e coordenação pedagógica.</p>
              </div>
            </div>

            <div className="space-y-3">
              {data.linkedInstitutions.length > 0 ? data.linkedInstitutions.map((institution) => (
                <div key={institution.id} className="rounded-xl border border-mar-areia/30 p-4">
                  <h3 className="font-medium text-mar-escuro">{institution.nome}</h3>
                  <p className="mt-1 text-sm text-mar-escuro/55">
                    {institution.tipo}
                    {(institution.cidade || institution.estado) && " · "}
                    {institution.cidade}{institution.cidade && institution.estado ? "/" : ""}{institution.estado}
                  </p>
                  {institution.responsavelNome && (
                    <p className="mt-2 text-sm text-mar-escuro/55">Referência institucional: {institution.responsavelNome}</p>
                  )}
                </div>
              )) : (
                <p className="text-sm text-mar-escuro/50">Nenhuma instituição vinculada ao seu perfil até o momento.</p>
              )}
            </div>
          </section>

          <section className="bg-white rounded-2xl border border-mar-areia/30 p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="font-serif text-2xl font-bold text-mar-escuro">Turmas acompanhadas</h2>
                <p className="text-sm text-mar-escuro/55 mt-1">Turmas sob sua responsabilidade com contagem de estudantes ativos.</p>
              </div>
            </div>

            <div className="space-y-3">
              {data.turmasSummary.length > 0 ? data.turmasSummary.map((turma) => (
                <div key={turma.id} className="rounded-xl border border-mar-areia/30 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-medium text-mar-escuro">{turma.nome}</h3>
                      <p className="mt-1 text-sm text-mar-escuro/55">{turma.institutionName}</p>
                      <p className="mt-1 text-sm text-mar-escuro/55">
                        {turma.anoLetivo ? `Ano ${turma.anoLetivo}` : "Ano letivo não informado"}
                        {turma.segmento && ` · ${turma.segmento}`}
                        {turma.turno && ` · ${turma.turno}`}
                      </p>
                    </div>
                    <span className="badge bg-mar-verde/10 text-mar-verde">{turma.studentsCount} estudante(s)</span>
                  </div>
                  <Link href={`/app/professor/turmas/${turma.id}`} className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-mar-azul">
                    Abrir central da turma <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              )) : (
                <p className="text-sm text-mar-escuro/50">Nenhuma turma com responsabilidade explícita encontrada para seu perfil.</p>
              )}
            </div>
          </section>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <section id="agenda-educativa" className="bg-white rounded-2xl border border-mar-areia/30 p-6 scroll-mt-28">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="font-serif text-2xl font-bold text-mar-escuro">Agenda educativa</h2>
                <p className="text-sm text-mar-escuro/55 mt-1">Eventos que podem ser integrados ao calendário escolar.</p>
              </div>
              <Link href="/agenda" className="text-sm font-medium text-mar-azul inline-flex items-center gap-1">
                Ver agenda <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="space-y-3">
              {data.upcomingEventos.length > 0 ? data.upcomingEventos.map((evento) => (
                <Link key={evento.id} href={`/agenda/${evento.id}`} className="block rounded-xl border border-mar-areia/30 p-4 hover:border-mar-azul/30 transition-colors">
                  <h3 className="font-medium text-mar-escuro">{evento.titulo}</h3>
                  <p className="text-sm text-mar-escuro/55 mt-2">{formatDate(evento.dataInicio)}</p>
                  {evento.instituicaoNome && <p className="text-xs uppercase tracking-wide text-mar-cobre/80 mt-1">{evento.instituicaoNome}</p>}
                  {evento.local && <p className="text-sm text-mar-escuro/55 mt-1">{evento.local}</p>}
                </Link>
              )) : (
                <p className="text-sm text-mar-escuro/50">Nenhum evento futuro publicado até o momento.</p>
              )}
            </div>
          </section>

          <section className="bg-white rounded-2xl border border-mar-areia/30 p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="font-serif text-2xl font-bold text-mar-escuro">Base de apoio ao acompanhamento</h2>
                <p className="text-sm text-mar-escuro/55 mt-1">Recursos recentes e estudantes ativos que ajudam a preparar atividades e mediações.</p>
              </div>
              <Link href="/acervo" className="text-sm font-medium text-mar-azul inline-flex items-center gap-1">
                Ver acervo <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid gap-4 xl:grid-cols-2">
              <div className="space-y-3">
                {data.highlightedAcervo.length > 0 ? data.highlightedAcervo.map((item) => (
                  <Link key={item.id} href={`/acervo/${item.id}`} className="block rounded-xl border border-mar-areia/30 p-4 hover:border-mar-azul/30 transition-colors">
                    <h3 className="font-medium text-mar-escuro">{item.titulo}</h3>
                    <p className="text-sm text-mar-escuro/55 mt-2">Tipo: {item.tipo}</p>
                    {item.colecao && <p className="text-sm text-mar-escuro/55 mt-1">Coleção: {item.colecao}</p>}
                  </Link>
                )) : (
                  <p className="text-sm text-mar-escuro/50">Nenhum item publicado no acervo até o momento.</p>
                )}
              </div>

              <div className="space-y-3">
                {data.recentStudents.length > 0 ? data.recentStudents.map((student) => (
                  <div key={student.id} className="rounded-xl border border-mar-areia/30 p-4">
                    <h3 className="font-medium text-mar-escuro">{student.name}</h3>
                    <p className="text-sm text-mar-escuro/55 mt-1">{student.email}</p>
                    <p className="text-xs uppercase tracking-wide text-mar-cobre/80 mt-2">{student.profileLabel}</p>
                    <p className="text-xs text-mar-escuro/45 mt-2">Atividade recente em {formatDate(student.referenceDate)}</p>
                  </div>
                )) : (
                  <div className="rounded-xl bg-mar-creme p-4 text-sm leading-relaxed text-mar-escuro/60">
                    Quando suas turmas estiverem vinculadas, esta área mostrará participantes ativos para facilitar acompanhamento pedagógico.
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>

        <div className="grid md:grid-cols-3 gap-5 mt-10">
          {[
            { label: "Posts publicados", value: data.postsCount, icon: BookOpen, tone: "text-mar-azul bg-mar-azul/10" },
            { label: "Itens de acervo", value: data.acervoCount, icon: Camera, tone: "text-mar-verde bg-mar-verde/10" },
            { label: "Eventos futuros", value: data.eventosCount, icon: Calendar, tone: "text-mar-cobre bg-mar-cobre/10" },
          ].map((item) => (
            <div key={item.label} className="bg-white rounded-2xl border border-mar-areia/30 p-6">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${item.tone}`}>
                <item.icon className="w-5 h-5" />
              </div>
              <p className="text-sm text-mar-escuro/50 mt-4">{item.label}</p>
              <p className="font-serif text-3xl font-bold text-mar-escuro mt-1">{item.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

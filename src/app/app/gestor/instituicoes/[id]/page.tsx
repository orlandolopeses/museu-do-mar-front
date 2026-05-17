import Link from "next/link";
import { and, count, desc, eq, gte, inArray } from "drizzle-orm";
import { notFound } from "next/navigation";
import { requireGestorAccess } from "@/lib/access";
import { CopyTextButton } from "@/components/ui/CopyTextButton";
import { db } from "@/lib/db";
import { buildMailtoLink, buildOperationalWhatsAppShareText, buildWhatsAppShareLink } from "@/lib/gestor-sharing";
import { getAccessibleInstitutionIds } from "@/lib/institution-access";
import { extractRoles } from "@/lib/permissions";
import { formatDate } from "@/lib/utils";
import { atividadesTurma, eventos, instituicoes, matriculasTurma, profiles, turmas, userInstituicoes, users } from "@/lib/schema";
import { AlertTriangle, ArrowLeft, ArrowRight, Building2, CalendarRange, ClipboardList, Download, Mail, MessageSquareShare, School, ScrollText, Users } from "lucide-react";

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

type ParamsInput = Promise<{ id: string }>;
type ActivityStatus = "planejada" | "em_andamento" | "concluida";
type UrgencyLevel = "alta" | "media" | "baixa";

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

function getActivityUrgency(activity: {
  status: ActivityStatus;
  updatedAt: Date;
  proximoPasso: string | null;
}) {
  if (activity.status === "concluida") {
    return { level: "baixa" as UrgencyLevel, label: "Concluída", reason: "atividade já concluída" };
  }

  const daysSinceUpdate = getDaysSince(activity.updatedAt);
  const hasNextStep = Boolean(activity.proximoPasso?.trim());

  if (!hasNextStep && daysSinceUpdate >= 5) {
    return { level: "alta" as UrgencyLevel, label: "Alta prioridade", reason: "sem próximo passo definido" };
  }

  if (activity.status === "planejada" && daysSinceUpdate >= 14) {
    return { level: "alta" as UrgencyLevel, label: "Alta prioridade", reason: "planejamento parado há mais de 14 dias" };
  }

  if (activity.status === "em_andamento" && daysSinceUpdate >= 21) {
    return { level: "alta" as UrgencyLevel, label: "Alta prioridade", reason: "execução sem atualização há mais de 21 dias" };
  }

  if ((activity.status === "planejada" && daysSinceUpdate >= 7) || (activity.status === "em_andamento" && daysSinceUpdate >= 10)) {
    return { level: "media" as UrgencyLevel, label: "Atenção", reason: "acompanhar evolução da atividade" };
  }

  return { level: "baixa" as UrgencyLevel, label: "Em ritmo adequado", reason: "atividade acompanhada recentemente" };
}

function describeInstitutionRecorte() {
  return "todos os status, todas as origens, últimos 30 dias";
}

async function getInstitutionDetail(instituicaoId: string) {
  const [instituicao] = await db
    .select()
    .from(instituicoes)
    .where(eq(instituicoes.id, instituicaoId))
    .limit(1);

  if (!instituicao || !instituicao.ativo) {
    return null;
  }

  const links = await db
    .select({ userId: userInstituicoes.userId })
    .from(userInstituicoes)
    .where(eq(userInstituicoes.instituicaoId, instituicaoId));

  const linkedUserIds = new Set(links.map((link) => link.userId));

  const allUsers = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      status: users.status,
      primaryRole: users.primaryRole,
      lastLoginAt: users.lastLoginAt,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(desc(users.createdAt));

  const linkedActiveUsers = allUsers.filter((user) => linkedUserIds.has(user.id) && user.status === "ativo");
  const linkedActiveUserIds = new Set(linkedActiveUsers.map((user) => user.id));

  const allProfiles = await db
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

  const profileByUserId = new Map(
    allProfiles
      .filter((profile) => linkedActiveUserIds.has(profile.userId))
      .map((profile) => [profile.userId, profile]),
  );

  const activeUserById = new Map(
    allUsers
      .filter((user) => user.status === "ativo")
      .map((user) => [user.id, user]),
  );

  const activeTurmas = await db
    .select({
      id: turmas.id,
      nome: turmas.nome,
      anoLetivo: turmas.anoLetivo,
      segmento: turmas.segmento,
      turno: turmas.turno,
      responsavelUserId: turmas.responsavelUserId,
      createdAt: turmas.createdAt,
    })
    .from(turmas)
    .where(eq(turmas.instituicaoId, instituicaoId));

  const turmaIdsList = activeTurmas.map((turma) => turma.id);
  const activeTurmaIds = new Set(turmaIdsList);
  const responsibleUserIds = [...new Set(activeTurmas.map((turma) => turma.responsavelUserId).filter((value): value is string => Boolean(value)))];

  for (const profile of allProfiles) {
    if (responsibleUserIds.includes(profile.userId) && !profileByUserId.has(profile.userId)) {
      profileByUserId.set(profile.userId, profile);
    }
  }

  const allAtividades = turmaIdsList.length > 0
    ? await db
      .select({
        turmaId: atividadesTurma.turmaId,
        status: atividadesTurma.status,
        updatedAt: atividadesTurma.updatedAt,
        proximoPasso: atividadesTurma.proximoPasso,
      })
      .from(atividadesTurma)
      .where(inArray(atividadesTurma.turmaId, turmaIdsList))
    : [];

  const progressByTurma = new Map<string, Record<ActivityStatus, number>>();
  const activitySummaryByTurma = new Map<string, {
    total: number;
    highPriority: number;
    attention: number;
    stale: number;
    missingNextStep: number;
    lastActivityAt: Date | null;
  }>();
  for (const turmaId of turmaIdsList) {
    progressByTurma.set(turmaId, { planejada: 0, em_andamento: 0, concluida: 0 });
    activitySummaryByTurma.set(turmaId, {
      total: 0,
      highPriority: 0,
      attention: 0,
      stale: 0,
      missingNextStep: 0,
      lastActivityAt: null,
    });
  }
  for (const atividade of allAtividades) {
    const counts = progressByTurma.get(atividade.turmaId);
    const summary = activitySummaryByTurma.get(atividade.turmaId);
    if (counts) counts[atividade.status]++;
    if (!summary) {
      continue;
    }

    const urgency = getActivityUrgency(atividade);
    summary.total += 1;
    if (urgency.level === "alta") {
      summary.highPriority += 1;
    }
    if (urgency.level === "media") {
      summary.attention += 1;
    }
    if (getDaysSince(atividade.updatedAt) > 30 && atividade.status !== "concluida") {
      summary.stale += 1;
    }
    if (!atividade.proximoPasso?.trim() && atividade.status !== "concluida") {
      summary.missingNextStep += 1;
    }
    if (!summary.lastActivityAt || atividade.updatedAt > summary.lastActivityAt) {
      summary.lastActivityAt = atividade.updatedAt;
    }
  }

  const activeMatriculas = await db
    .select({ turmaId: matriculasTurma.turmaId, userId: matriculasTurma.userId })
    .from(matriculasTurma)
    .where(eq(matriculasTurma.status, "ativo"));

  const membersByTurma = new Map<string, Set<string>>();
  for (const matricula of activeMatriculas) {
    if (!activeTurmaIds.has(matricula.turmaId) || !linkedActiveUserIds.has(matricula.userId)) {
      continue;
    }

    const current = membersByTurma.get(matricula.turmaId) ?? new Set<string>();
    current.add(matricula.userId);
    membersByTurma.set(matricula.turmaId, current);
  }

  const profileCounts = new Map<string, number>();
  let configuredProfilesCount = 0;
  for (const user of linkedActiveUsers) {
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
      share: linkedActiveUsers.length > 0 ? Math.round((value / linkedActiveUsers.length) * 100) : 0,
    }))
    .sort((left, right) => right.value - left.value);

  const recentParticipants = [...linkedActiveUsers]
    .sort((left, right) => getParticipantReferenceDate(right).getTime() - getParticipantReferenceDate(left).getTime())
    .slice(0, 8)
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

  const turmasComResumo = activeTurmas
    .map((turma) => ({
      ...turma,
      activeMembersCount: membersByTurma.get(turma.id)?.size ?? 0,
      progress: progressByTurma.get(turma.id) ?? { planejada: 0, em_andamento: 0, concluida: 0 },
      urgency: activitySummaryByTurma.get(turma.id) ?? {
        total: 0,
        highPriority: 0,
        attention: 0,
        stale: 0,
        missingNextStep: 0,
        lastActivityAt: null,
      },
    }))
    .sort((left, right) => {
      if (right.urgency.highPriority !== left.urgency.highPriority) {
        return right.urgency.highPriority - left.urgency.highPriority;
      }
      if (right.urgency.stale !== left.urgency.stale) {
        return right.urgency.stale - left.urgency.stale;
      }
      return right.activeMembersCount - left.activeMembersCount;
    });

  const responsibleSummaryMap = new Map<string, {
    turmaIds: Set<string>;
    activeMembersCount: number;
    highPriority: number;
    attention: number;
    stale: number;
    missingNextStep: number;
    lastActivityAt: Date | null;
  }>();
  let turmasWithoutResponsible = 0;
  for (const turma of turmasComResumo) {
    if (!turma.responsavelUserId) {
      turmasWithoutResponsible += 1;
      continue;
    }

    const entry = responsibleSummaryMap.get(turma.responsavelUserId) ?? {
      turmaIds: new Set<string>(),
      activeMembersCount: 0,
      highPriority: 0,
      attention: 0,
      stale: 0,
      missingNextStep: 0,
      lastActivityAt: null,
    };

    entry.turmaIds.add(turma.id);
    entry.activeMembersCount += turma.activeMembersCount;
    entry.highPriority += turma.urgency.highPriority;
    entry.attention += turma.urgency.attention;
    entry.stale += turma.urgency.stale;
    entry.missingNextStep += turma.urgency.missingNextStep;
    if (!entry.lastActivityAt || (turma.urgency.lastActivityAt && turma.urgency.lastActivityAt > entry.lastActivityAt)) {
      entry.lastActivityAt = turma.urgency.lastActivityAt;
    }
    responsibleSummaryMap.set(turma.responsavelUserId, entry);
  }

  const professorCoordination = Array.from(responsibleSummaryMap.entries())
    .map(([userId, stats]) => {
      const user = activeUserById.get(userId);
      const profile = profileByUserId.get(userId);
      const focusTurmas = turmasComResumo
        .filter((turma) => stats.turmaIds.has(turma.id))
        .slice(0, 3)
        .map((turma) => ({ id: turma.id, nome: turma.nome }));
      const name = profile?.displayName ?? user?.name ?? "Responsável pedagógico";
      const coordinationAction = stats.highPriority > 0
        ? `Acionar ${name} para destravar ${stats.highPriority} atividade(s) crítica(s) nas turmas sob sua condução.`
        : stats.stale > 0
          ? `Pactuar com ${name} a retomada de ${stats.stale} atividade(s) sem atualização recente.`
          : `Manter com ${name} a rotina atual e replicar práticas consistentes entre as turmas.`;

      return {
        userId,
        name,
        email: user?.email ?? "",
        profileLabel: getProfileLabel(profile?.profileType ?? user?.primaryRole),
        turmasCount: stats.turmaIds.size,
        activeMembersCount: stats.activeMembersCount,
        highPriority: stats.highPriority,
        attention: stats.attention,
        stale: stats.stale,
        missingNextStep: stats.missingNextStep,
        lastActivityAt: stats.lastActivityAt,
        focusTurmas,
        primaryTurmaId: focusTurmas[0]?.id ?? null,
        coordinationAction,
      };
    })
    .sort((left, right) => {
      if (right.highPriority !== left.highPriority) {
        return right.highPriority - left.highPriority;
      }
      if (right.stale !== left.stale) {
        return right.stale - left.stale;
      }
      return right.attention - left.attention;
    });

  const priorityResponsible = professorCoordination.find((item) => item.highPriority > 0)
    ?? professorCoordination.find((item) => item.stale > 0)
    ?? null;

  const criticalTurmas = turmasComResumo
    .filter((turma) => turma.urgency.highPriority > 0 || turma.urgency.stale > 0 || turma.urgency.missingNextStep > 0)
    .slice(0, 5)
    .map((turma) => {
      const responsible = turma.responsavelUserId ? activeUserById.get(turma.responsavelUserId) : null;
      const responsibleProfile = turma.responsavelUserId ? profileByUserId.get(turma.responsavelUserId) : null;
      const responsibleName = responsibleProfile?.displayName ?? responsible?.name ?? "Responsável não definido";
      const highlight = turma.urgency.highPriority > 0
        ? `${turma.urgency.highPriority} atividade(s) crítica(s)`
        : turma.urgency.stale > 0
          ? `${turma.urgency.stale} atividade(s) paradas há mais de 30 dias`
          : `${turma.urgency.missingNextStep} atividade(s) sem próximo passo`;

      return {
        id: turma.id,
        nome: turma.nome,
        responsibleName,
        highlight,
        activeMembersCount: turma.activeMembersCount,
        urgency: turma.urgency,
      };
    });

  const [allInstitutionsCountResult] = await db.select({ value: count() }).from(instituicoes).where(eq(instituicoes.ativo, true));
  const now = new Date();
  const upcomingEventos = await db
    .select({
      id: eventos.id,
      titulo: eventos.titulo,
      dataInicio: eventos.dataInicio,
      dataFim: eventos.dataFim,
      local: eventos.local,
      categoria: eventos.categoria,
    })
    .from(eventos)
    .where(and(eq(eventos.publicado, true), eq(eventos.instituicaoId, instituicaoId), gte(eventos.dataInicio, now)))
    .orderBy(eventos.dataInicio)
    .limit(6);

  const attentionPoints: string[] = [];
  if (linkedActiveUsers.length === 0) {
    attentionPoints.push("Ainda não há participantes ativos vinculados a esta instituição.");
  }
  if (configuredProfilesCount < linkedActiveUsers.length) {
    attentionPoints.push(`${linkedActiveUsers.length - configuredProfilesCount} participante(s) vinculados ainda sem perfil principal definido.`);
  }
  if (turmasComResumo.length === 0) {
    attentionPoints.push("Ainda não há turmas ativas formalizadas para esta instituição.");
  }
  if (upcomingEventos.length === 0) {
    attentionPoints.push("Ainda não há eventos futuros vinculados diretamente a esta instituição.");
  }
  if (priorityResponsible) {
    attentionPoints.push(priorityResponsible.coordinationAction);
  }
  if (turmasWithoutResponsible > 0) {
    attentionPoints.push(`${turmasWithoutResponsible} turma(s) ainda sem responsável pedagógico explícito.`);
  }
  if (attentionPoints.length === 0) {
    attentionPoints.push("A instituição já apresenta base mínima de vínculo, perfis e turmas para acompanhamento gerencial.");
  }

  return {
    instituicao,
    allInstitutionsCount: allInstitutionsCountResult?.value ?? 0,
    linkedActiveUsersCount: linkedActiveUsers.length,
    configuredProfilesCount,
    profileCompletionRate: linkedActiveUsers.length > 0 ? Math.round((configuredProfilesCount / linkedActiveUsers.length) * 100) : 0,
    activeTurmasCount: turmasComResumo.length,
    activeMatriculasCount: turmasComResumo.reduce((total, turma) => total + turma.activeMembersCount, 0),
    participantsByProfile,
    recentParticipants,
    turmasComResumo,
    criticalTurmas,
    professorCoordination,
    priorityResponsible,
    turmasWithoutResponsible,
    upcomingEventos,
    attentionPoints,
  };
}

export default async function GestorInstituicaoDetailPage({
  params,
}: {
  params: ParamsInput;
}) {
  const session = await requireGestorAccess();
  const roles = extractRoles(session);
  const userId = session.user?.id ?? "";
  const canViewAllInstitutions = roles.includes("superadmin");
  const { id } = await params;
  const accessibleInstitutionIds = await getAccessibleInstitutionIds(userId, canViewAllInstitutions);

  if (!canViewAllInstitutions && !accessibleInstitutionIds.includes(id)) {
    notFound();
  }

  const data = await getInstitutionDetail(id);

  if (!data) {
    notFound();
  }

  const csvExportParams = new URLSearchParams({ instituicao: id });
  const summaryExportParams = new URLSearchParams({ instituicao: id, formato: "resumo" });
  const messageExportParams = new URLSearchParams({ instituicao: id, formato: "mensagem" });
  const meetingExportParams = new URLSearchParams({ instituicao: id, formato: "reuniao" });
  const whatsappExportParams = new URLSearchParams({ instituicao: id, formato: "whatsapp" });
  const totalHighPriority = data.criticalTurmas.reduce((total, turma) => total + turma.urgency.highPriority, 0);
  const totalStale = data.criticalTurmas.reduce((total, turma) => total + turma.urgency.stale, 0);
  const executiveRecommendation = data.priorityResponsible
    ? data.priorityResponsible.highPriority > 0
      ? data.priorityResponsible.coordinationAction
      : `Manter alinhamento com ${data.priorityResponsible.name} e usar a próxima janela institucional para redistribuir práticas entre as turmas.`
    : "Definir responsáveis pedagógicos explícitos e pactuar uma rotina mínima de acompanhamento por turma.";
  const nextEvent = data.upcomingEventos[0] ?? null;
  const executiveCards = [
    {
      title: "Estado institucional",
      value: `${data.activeTurmasCount} turma(s) ativa(s), ${data.activeMatriculasCount} matrícula(s) ativa(s) e ${data.linkedActiveUsersCount} participante(s) vinculados.`,
      detail: `${totalHighPriority} atividade(s) crítica(s) e ${totalStale} sem atualização há mais de 30 dias nas turmas que hoje pedem ação.`,
    },
    {
      title: "Coordenação prioritária",
      value: executiveRecommendation,
      detail: data.priorityResponsible ? `Responsável em destaque: ${data.priorityResponsible.name}${data.priorityResponsible.email ? ` • ${data.priorityResponsible.email}` : ""}` : "Ainda não há um responsável dominante o bastante para concentrar o acionamento institucional.",
    },
    {
      title: "Próxima janela",
      value: nextEvent ? `${nextEvent.titulo} em ${formatDate(nextEvent.dataInicio)}.` : "Sem evento futuro já publicado para esta instituição.",
      detail: `Recorte padrão desta leitura: ${describeInstitutionRecorte()}.`,
    },
  ];
  const pedagogicalReadingCards = [
    {
      title: "Coordenação focal",
      value: data.priorityResponsible
        ? `${data.priorityResponsible.name} concentra hoje a mediação pedagógica mais sensível deste recorte.`
        : "Ainda não há uma coordenação pedagógica focal dominante neste recorte.",
      detail: data.priorityResponsible
        ? `${data.priorityResponsible.turmasCount} turma(s), ${data.priorityResponsible.highPriority} atividade(s) crítica(s) e ${data.priorityResponsible.stale} sem atualização prolongada pedem articulação mais próxima.`
        : "O próximo ganho aqui é explicitar responsáveis por turma e transformar a leitura institucional em rotina coordenada.",
    },
    {
      title: "Turma que ancora a leitura",
      value: data.criticalTurmas[0]
        ? `${data.criticalTurmas[0].nome} aparece como principal ponto de entrada para ação institucional.`
        : "Nenhuma turma aparece como foco crítico imediato neste momento.",
      detail: data.criticalTurmas[0]
        ? `${data.criticalTurmas[0].highlight} e ${data.criticalTurmas[0].activeMembersCount} participante(s) ajudam a materializar onde a coordenação deve começar.`
        : "O cenário atual permite operar em manutenção, acompanhando novos sinais antes de escalar esforço adicional.",
    },
    {
      title: "Janela de rede",
      value: nextEvent
        ? `${nextEvent.titulo} funciona como próximo checkpoint institucional de pactuação.`
        : "Ainda não há um marco público próximo para ancorar a coordenação desta instituição.",
      detail: nextEvent
        ? `A recomendação é usar ${formatDate(nextEvent.dataInicio)} para revisar encaminhamentos, validar próximos passos e redistribuir apoio entre turmas.`
        : "Enquanto isso, o detalhe institucional deve sustentar a leitura pedagógica contínua entre responsáveis, turmas e participantes ativos.",
    },
  ];
  const institutionEmailBody = [
    `Síntese executiva da instituição ${data.instituicao.nome}`,
    "",
    `Recorte padrão: ${describeInstitutionRecorte()}`,
    "Estado do produto: operação publicada, leitura institucional ativa e coordenação pedagógica em aprofundamento.",
    `Estado atual: ${data.activeTurmasCount} turmas ativas, ${data.activeMatriculasCount} matrículas ativas e ${data.linkedActiveUsersCount} participantes vinculados.`,
    `Ação recomendada: ${executiveRecommendation}`,
    data.criticalTurmas[0] ? `Turma mais crítica no momento: ${data.criticalTurmas[0].nome} (${data.criticalTurmas[0].highlight}).` : "Turma mais crítica no momento: nenhuma turma aparece crítica neste recorte.",
    nextEvent ? `Próximo marco: ${nextEvent.titulo} em ${formatDate(nextEvent.dataInicio)}.` : "Próximo marco: ainda sem evento futuro publicado para a instituição.",
  ].join("\n");
  const institutionMailtoHref = buildMailtoLink(
    data.priorityResponsible?.email || null,
    `Síntese executiva da instituição ${data.instituicao.nome}`,
    institutionEmailBody,
  );
  const priorityInstitutionPath = data.criticalTurmas[0] ? `/app/gestor/turmas/${data.criticalTurmas[0].id}` : null;
  const institutionShortMessage = [
    `Síntese rápida da instituição ${data.instituicao.nome}`,
    `Recorte: ${describeInstitutionRecorte()}`,
    "Estado do produto: operação publicada e leitura pedagógica de rede em consolidação.",
    `Estado: ${data.activeTurmasCount} turmas ativas, ${data.activeMatriculasCount} matrículas ativas e ${totalHighPriority} atividade(s) crítica(s).`,
    `Ação: ${executiveRecommendation}`,
    data.criticalTurmas[0] ? `Turma prioritária: ${data.criticalTurmas[0].nome} (${data.criticalTurmas[0].highlight}).` : "Turma prioritária: nenhuma turma crítica neste recorte.",
    priorityInstitutionPath ? `Abrir turma prioritária: ${priorityInstitutionPath}` : "Abrir turma prioritária: não aplicável neste recorte.",
    nextEvent ? `Próximo marco: ${nextEvent.titulo} em ${formatDate(nextEvent.dataInicio)}.` : "Próximo marco: ainda sem evento futuro publicado para a instituição.",
  ].join("\n");
  const institutionWhatsAppMessage = buildOperationalWhatsAppShareText({
    heading: `Instituição ${data.instituicao.nome}`,
    state: `${data.activeTurmasCount} turma(s) ativa(s), ${totalHighPriority} crítica(s), ${data.activeMatriculasCount} matrícula(s) ativa(s).`,
    action: executiveRecommendation,
    ctaPath: priorityInstitutionPath,
    checkpoint: nextEvent ? `${nextEvent.titulo} em ${formatDate(nextEvent.dataInicio)}.` : null,
  });
  const institutionWhatsAppHref = buildWhatsAppShareLink(institutionWhatsAppMessage);
  const institutionFullSummary = [
    `Resumo executivo da instituição ${data.instituicao.nome}`,
    `Recorte padrão: ${describeInstitutionRecorte()}`,
    "Estado do produto: operação publicada, jornadas estabilizadas e coordenação pedagógica em aprofundamento.",
    `Estado atual: ${data.activeTurmasCount} turmas ativas, ${data.activeMatriculasCount} matrículas ativas e ${data.linkedActiveUsersCount} participantes vinculados.`,
    `Ação recomendada: ${executiveRecommendation}`,
    data.criticalTurmas[0] ? `Turma prioritária: ${data.criticalTurmas[0].nome} (${data.criticalTurmas[0].highlight}).` : "Turma prioritária: nenhuma turma crítica no recorte.",
    priorityInstitutionPath ? `Abrir turma prioritária: ${priorityInstitutionPath}` : "Abrir turma prioritária: não aplicável neste recorte.",
    nextEvent ? `Próximo marco: ${nextEvent.titulo} em ${formatDate(nextEvent.dataInicio)}.` : "Próximo marco: ainda sem evento futuro publicado para a instituição.",
  ].join("\n");
  const institutionMeetingSummary = [
    "Contexto executivo:",
    "• O site já opera publicamente e esta leitura institucional passou a funcionar como ponte entre operação publicada e coordenação pedagógica.",
    "• O objetivo agora é transformar sinais de turma e responsabilidade em pactuação de rede mais frequente.",
    "Decisões sugeridas:",
    `• ${executiveRecommendation}`,
    data.criticalTurmas[0] ? `• Abrir ${data.criticalTurmas[0].nome} como prioridade institucional.` : "• Manter a leitura institucional atual sem escalonamento imediato.",
    "Pendências:",
    `• ${data.turmasWithoutResponsible > 0 ? `${data.turmasWithoutResponsible} turma(s) ainda pedem definição explícita de responsável.` : "As turmas já têm cobertura mínima de responsáveis."}`,
    `• ${data.priorityResponsible ? `Confirmar encaminhamentos com ${data.priorityResponsible.name}.` : "Definir um responsável pedagógico focal para a instituição."}`,
    "Próximo checkpoint:",
    `• ${nextEvent ? `${nextEvent.titulo} em ${formatDate(nextEvent.dataInicio)}.` : "Definir uma próxima janela institucional de acompanhamento."}`,
    `• ${priorityInstitutionPath ? `Abrir turma prioritária em ${priorityInstitutionPath}.` : "Sem turma prioritária explícita para abrir neste recorte."}`,
  ].join("\n");

  return (
    <div className="p-8 md:p-10">
      <div className="max-w-6xl">
        <div className="mb-8">
          <Link href="/app/gestor" className="inline-flex items-center gap-2 text-sm font-medium text-mar-azul">
            <ArrowLeft className="w-4 h-4" />
            Voltar ao painel do gestor
          </Link>
        </div>

        <div className="mb-10 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-sm font-medium uppercase tracking-wide text-mar-azul">
            <Building2 className="w-4 h-4" />
            Detalhe institucional
          </div>
          <h1 className="font-serif text-4xl font-bold text-mar-escuro">{data.instituicao.nome}</h1>
          <p className="max-w-3xl leading-relaxed text-mar-escuro/60">
            Leitura dedicada da instituição para acompanhamento de vínculos ativos, perfis participantes e turmas relacionadas ao Museu do Mar.
          </p>
          <p className="text-sm text-mar-escuro/45">
            O site já opera no domínio público, e este detalhe institucional agora sustenta a próxima camada de valor: coordenação pedagógica, priorização de turmas e pactuação entre responsáveis.
          </p>
          <div className="flex flex-wrap gap-2 text-xs text-mar-escuro/45">
            <span className="badge bg-mar-azul/10 text-mar-azul">{data.instituicao.tipo}</span>
            {(data.instituicao.cidade || data.instituicao.estado) && (
              <span className="badge bg-mar-cobre/10 text-mar-cobre">
                {data.instituicao.cidade}{data.instituicao.cidade && data.instituicao.estado ? "/" : ""}{data.instituicao.estado}
              </span>
            )}
            <span className="badge bg-mar-verde/10 text-mar-verde">1 de {canViewAllInstitutions ? data.allInstitutionsCount : accessibleInstitutionIds.length} instituição(ões) acessíveis</span>
          </div>
          {data.instituicao.responsavelNome && (
            <p className="text-sm text-mar-escuro/45">Responsável de referência: {data.instituicao.responsavelNome}</p>
          )}
          <div className="flex flex-wrap gap-3 pt-2">
            <Link href={`/app/gestor/exportar?${csvExportParams.toString()}`} className="inline-flex items-center gap-2 rounded-full bg-mar-azul px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90">
              <Download className="w-4 h-4" />
              Exportar CSV institucional
            </Link>
            <Link href={`/app/gestor/exportar?${whatsappExportParams.toString()}`} className="inline-flex items-center gap-2 rounded-full border border-mar-verde/20 bg-white px-4 py-2 text-sm font-medium text-mar-verde transition-colors hover:border-mar-verde/40">
              <MessageSquareShare className="w-4 h-4" />
              Baixar texto WhatsApp
            </Link>
            <Link href={`/app/gestor/exportar?${summaryExportParams.toString()}`} className="inline-flex items-center gap-2 rounded-full border border-mar-azul/20 bg-white px-4 py-2 text-sm font-medium text-mar-azul transition-colors hover:border-mar-azul/40">
              <ClipboardList className="w-4 h-4" />
              Baixar síntese executiva
            </Link>
            <Link href={`/app/gestor/exportar?${meetingExportParams.toString()}`} className="inline-flex items-center gap-2 rounded-full border border-mar-azul/20 bg-white px-4 py-2 text-sm font-medium text-mar-escuro transition-colors hover:border-mar-azul/40">
              <ScrollText className="w-4 h-4" />
              Baixar resumo de reunião
            </Link>
            <Link href={`/app/gestor/exportar?${messageExportParams.toString()}`} className="inline-flex items-center gap-2 rounded-full border border-mar-verde/20 bg-white px-4 py-2 text-sm font-medium text-mar-verde transition-colors hover:border-mar-verde/40">
              <MessageSquareShare className="w-4 h-4" />
              Baixar mensagem curta
            </Link>
            {priorityInstitutionPath ? (
              <Link href={priorityInstitutionPath} className="inline-flex items-center gap-2 rounded-full border border-mar-verde/20 bg-white px-4 py-2 text-sm font-medium text-mar-verde transition-colors hover:border-mar-verde/40">
                <ArrowRight className="w-4 h-4" />
                Abrir turma prioritária
              </Link>
            ) : null}
            <CopyTextButton
              text={institutionFullSummary}
              label="Copiar síntese executiva"
              copiedLabel="Síntese copiada"
              className="inline-flex items-center gap-2 rounded-full border border-mar-azul/20 bg-white px-4 py-2 text-sm font-medium text-mar-azul transition-colors hover:border-mar-azul/40"
            />
            <CopyTextButton
              text={institutionShortMessage}
              label="Copiar mensagem curta"
              copiedLabel="Mensagem copiada"
              className="inline-flex items-center gap-2 rounded-full border border-mar-cobre/20 bg-white px-4 py-2 text-sm font-medium text-mar-cobre transition-colors hover:border-mar-cobre/40"
            />
            <a href={institutionMailtoHref} className="inline-flex items-center gap-2 rounded-full border border-mar-areia/40 bg-white px-4 py-2 text-sm font-medium text-mar-azul transition-colors hover:border-mar-azul/30">
              <Mail className="w-4 h-4" />
              {data.priorityResponsible?.email ? "Enviar síntese por e-mail" : "Abrir e-mail com síntese"}
            </a>
            <a
              href={institutionWhatsAppHref}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-mar-verde/20 bg-white px-4 py-2 text-sm font-medium text-mar-verde transition-colors hover:border-mar-verde/40"
            >
              <MessageSquareShare className="w-4 h-4" />
              Compartilhar via WhatsApp
            </a>
          </div>
        </div>

        <div className="mb-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Participantes ativos", value: data.linkedActiveUsersCount, icon: Users, tone: "text-mar-azul bg-mar-azul/10" },
            { label: "Perfis configurados", value: `${data.profileCompletionRate}%`, icon: ClipboardList, tone: "text-mar-cobre bg-mar-cobre/10" },
            { label: "Turmas ativas", value: data.activeTurmasCount, icon: School, tone: "text-mar-verde bg-mar-verde/10" },
            { label: "Matrículas ativas", value: data.activeMatriculasCount, icon: Building2, tone: "text-mar-azul bg-mar-azul/10" },
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

        <section className="mb-10 rounded-2xl border border-mar-areia/30 bg-white p-6">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="font-serif text-2xl font-bold text-mar-escuro">Resumo executivo institucional</h2>
              <p className="mt-1 text-sm text-mar-escuro/55">Síntese rápida para repasse interno, reunião de coordenação ou decisão de priorização desta instituição.</p>
            </div>
            <div className="rounded-full bg-mar-creme px-4 py-2 text-xs font-medium uppercase tracking-wide text-mar-cobre/90">
              {describeInstitutionRecorte()}
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            {executiveCards.map((card) => (
              <article key={card.title} className="rounded-2xl border border-mar-areia/30 bg-mar-creme/40 p-5">
                <p className="text-xs font-medium uppercase tracking-wide text-mar-cobre/80">{card.title}</p>
                <p className="mt-3 text-base font-medium leading-relaxed text-mar-escuro">{card.value}</p>
                <p className="mt-3 text-sm leading-relaxed text-mar-escuro/58">{card.detail}</p>
              </article>
            ))}
          </div>

          <div className="mt-6 grid gap-4 xl:grid-cols-[1.05fr,0.95fr]">
            <div className="rounded-2xl border border-mar-areia/30 p-5">
              <h3 className="text-sm font-medium uppercase tracking-wide text-mar-cobre/80">Turmas que concentram o risco</h3>
              <ul className="mt-4 space-y-3 text-sm leading-relaxed text-mar-escuro/62">
                {data.criticalTurmas.slice(0, 3).map((turma) => (
                  <li key={turma.id}>• {turma.nome}: {turma.highlight}.</li>
                ))}
                {data.criticalTurmas.length === 0 ? <li>• Nenhuma turma aparece como crítica neste momento.</li> : null}
              </ul>
            </div>
            <div className="rounded-2xl border border-mar-areia/30 p-5">
              <h3 className="text-sm font-medium uppercase tracking-wide text-mar-cobre/80">Próximos movimentos sugeridos</h3>
              <ul className="mt-4 space-y-3 text-sm leading-relaxed text-mar-escuro/62">
                <li>• {executiveRecommendation}</li>
                <li>• {nextEvent ? `Usar ${nextEvent.titulo} em ${formatDate(nextEvent.dataInicio)} como checkpoint de alinhamento institucional.` : "Definir uma próxima janela institucional para revisar as turmas com maior atenção."}</li>
                <li>• {data.turmasWithoutResponsible > 0 ? `${data.turmasWithoutResponsible} turma(s) ainda pedem definição explícita de responsável pedagógico.` : "As turmas já têm cobertura mínima de responsáveis para coordenação continuada."}</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="mb-10 rounded-2xl border border-mar-areia/30 bg-white p-6">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="font-serif text-2xl font-bold text-mar-escuro">Resumo para reunião</h2>
              <p className="mt-1 text-sm text-mar-escuro/55">Versão curta para checkpoint institucional com decisões, pendências e próximo marco.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <CopyTextButton
                text={institutionMeetingSummary}
                label="Copiar resumo de reunião"
                copiedLabel="Resumo copiado"
                className="inline-flex items-center gap-2 rounded-full border border-mar-azul/20 bg-white px-4 py-2 text-sm font-medium text-mar-azul transition-colors hover:border-mar-azul/40"
              />
              {priorityInstitutionPath ? (
                <Link href={priorityInstitutionPath} className="inline-flex items-center gap-2 rounded-full border border-mar-verde/20 bg-white px-4 py-2 text-sm font-medium text-mar-verde transition-colors hover:border-mar-verde/40">
                  <ArrowRight className="w-4 h-4" />
                  Abrir turma prioritária
                </Link>
              ) : null}
              <Link href={`/app/gestor/exportar?${meetingExportParams.toString()}`} className="inline-flex items-center gap-2 rounded-full border border-mar-escuro/10 bg-white px-4 py-2 text-sm font-medium text-mar-escuro transition-colors hover:border-mar-azul/30">
                <ScrollText className="w-4 h-4" />
                Baixar versão de reunião
              </Link>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <article className="rounded-2xl border border-mar-areia/30 bg-mar-creme/40 p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-mar-cobre/80">Decisões sugeridas</p>
              <ul className="mt-3 space-y-3 text-sm leading-relaxed text-mar-escuro/62">
                <li>• {executiveRecommendation}</li>
                <li>• {data.criticalTurmas[0] ? `Abrir ${data.criticalTurmas[0].nome} como prioridade institucional.` : "Manter a leitura institucional atual sem escalonamento imediato."}</li>
              </ul>
            </article>
            <article className="rounded-2xl border border-mar-areia/30 bg-mar-creme/40 p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-mar-cobre/80">Pendências</p>
              <ul className="mt-3 space-y-3 text-sm leading-relaxed text-mar-escuro/62">
                <li>• {data.turmasWithoutResponsible > 0 ? `${data.turmasWithoutResponsible} turma(s) ainda pedem definição explícita de responsável.` : "As turmas já têm cobertura mínima de responsáveis."}</li>
                <li>• {data.priorityResponsible ? `Confirmar encaminhamentos com ${data.priorityResponsible.name}.` : "Definir um responsável pedagógico focal para a instituição."}</li>
              </ul>
            </article>
            <article className="rounded-2xl border border-mar-areia/30 bg-mar-creme/40 p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-mar-cobre/80">Próximo checkpoint</p>
              <ul className="mt-3 space-y-3 text-sm leading-relaxed text-mar-escuro/62">
                <li>• {nextEvent ? `${nextEvent.titulo} em ${formatDate(nextEvent.dataInicio)}.` : "Definir uma próxima janela institucional de acompanhamento."}</li>
                <li>• {priorityInstitutionPath ? `Abrir turma prioritária em ${priorityInstitutionPath}.` : "Sem turma prioritária explícita para abrir neste recorte."}</li>
              </ul>
            </article>
          </div>
        </section>

        <section className="mb-10 rounded-2xl border border-mar-areia/30 bg-white p-6">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="font-serif text-2xl font-bold text-mar-escuro">Leitura pedagógica deste detalhe</h2>
              <p className="mt-1 text-sm text-mar-escuro/55">
                Tradução curta do recorte institucional para coordenação pedagógica, definição de foco e uso do próximo marco de rede.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-mar-azul/10 px-4 py-2 text-xs font-medium uppercase tracking-wide text-mar-azul">
              <School className="w-4 h-4" />
              {data.criticalTurmas.length > 0 ? `${data.criticalTurmas.length} turma(s) com leitura acionável` : "Leitura institucional estável"}
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            {pedagogicalReadingCards.map((card) => (
              <article key={card.title} className="rounded-2xl border border-mar-areia/30 bg-mar-creme/40 p-5">
                <p className="text-xs font-medium uppercase tracking-wide text-mar-cobre/80">{card.title}</p>
                <p className="mt-3 text-base font-medium leading-relaxed text-mar-escuro">{card.value}</p>
                <p className="mt-3 text-sm leading-relaxed text-mar-escuro/58">{card.detail}</p>
              </article>
            ))}
          </div>
        </section>

        <div className="mb-10 grid gap-6 xl:grid-cols-[1.05fr,0.95fr]">
          <section className="rounded-2xl border border-mar-areia/30 bg-white p-6">
            <div className="mb-4 flex items-center gap-2 text-sm font-medium text-mar-cobre">
              <ClipboardList className="w-4 h-4" />
              Sinais de atenção
            </div>
            <ul className="space-y-3 text-sm leading-relaxed text-mar-escuro/65">
              {data.attentionPoints.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
            <div className="mt-5 rounded-xl bg-mar-creme p-4 text-sm leading-relaxed text-mar-escuro/60">
              O detalhamento institucional ajuda a priorizar onde abrir novas turmas, completar perfis e fortalecer articulação educacional.
            </div>
          </section>

          <section className="rounded-2xl border border-mar-areia/30 bg-white p-6">
            <div className="mb-4 flex items-center gap-2 text-sm font-medium text-mar-verde">
              <Users className="w-4 h-4" />
              Distribuição de perfis
            </div>
            <div className="space-y-4">
              {data.participantsByProfile.length > 0 ? data.participantsByProfile.map((item) => (
                <div key={item.slug}>
                  <div className="mb-2 flex items-center justify-between gap-3 text-sm text-mar-escuro/65">
                    <span>{item.label}</span>
                    <span>{item.value} · {item.share}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-mar-areia/25">
                    <div className="h-2 rounded-full bg-mar-azul" style={{ width: `${Math.max(item.share, item.value > 0 ? 8 : 0)}%` }} />
                  </div>
                </div>
              )) : (
                <p className="text-sm text-mar-escuro/50">Nenhum perfil ativo vinculado a esta instituição até o momento.</p>
              )}
            </div>
          </section>
        </div>

        <div className="mb-10 grid gap-6 xl:grid-cols-[1.05fr,0.95fr]">
          <section className="rounded-2xl border border-mar-areia/30 bg-white p-6">
            <div className="mb-5">
              <div className="mb-3 flex items-center gap-2 text-sm font-medium text-mar-azul">
                <Users className="w-4 h-4" />
                Coordenação pedagógica
              </div>
              <h2 className="font-serif text-2xl font-bold text-mar-escuro">Responsáveis que pedem acompanhamento</h2>
              <p className="mt-1 text-sm text-mar-escuro/55">Leitura por professor responsável para transformar sinais institucionais em coordenação objetiva.</p>
            </div>

            <div className="space-y-4">
              {data.professorCoordination.length > 0 ? data.professorCoordination.map((item) => (
                <div key={item.userId} className="rounded-xl border border-mar-areia/30 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-medium text-mar-escuro">{item.name}</h3>
                      <p className="mt-1 text-sm text-mar-escuro/50">{item.email || "E-mail não disponível"}</p>
                    </div>
                    <span className="badge bg-mar-cobre/10 text-mar-cobre">{item.profileLabel}</span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-mar-escuro/45">
                    <span className="badge bg-mar-azul/10 text-mar-azul">{item.turmasCount} turma(s)</span>
                    <span className="badge bg-mar-verde/10 text-mar-verde">{item.activeMembersCount} participante(s)</span>
                    {item.highPriority > 0 && <span className="badge bg-rose-100 text-rose-700">{item.highPriority} crítica(s)</span>}
                    {item.attention > 0 && <span className="badge bg-amber-100 text-amber-700">{item.attention} em atenção</span>}
                    {item.stale > 0 && <span className="badge bg-mar-cobre/10 text-mar-cobre">{item.stale} parada(s)</span>}
                  </div>

                  <p className="mt-3 text-sm leading-relaxed text-mar-escuro/65">{item.coordinationAction}</p>

                  {item.focusTurmas.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-mar-escuro/45">
                      {item.focusTurmas.map((turma) => (
                        <span key={turma.id} className="badge bg-mar-creme text-mar-escuro/65">{turma.nome}</span>
                      ))}
                    </div>
                  )}

                  <div className="mt-3 flex items-center justify-between gap-3 text-xs text-mar-escuro/45">
                    <span>
                      {item.lastActivityAt ? `Última atualização percebida em ${formatDate(item.lastActivityAt)}` : "Sem atividade registrada até o momento"}
                    </span>
                    {item.primaryTurmaId ? (
                      <Link href={`/app/gestor/turmas/${item.primaryTurmaId}`} className="inline-flex items-center gap-1 font-medium text-mar-azul">
                        Abrir turma prioritária <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    ) : (
                      <span className="inline-flex items-center gap-1 font-medium text-mar-azul">
                        Coordenar neste recorte <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </div>
                </div>
              )) : (
                <div className="rounded-xl bg-mar-creme p-4 text-sm leading-relaxed text-mar-escuro/60">
                  Ainda não há responsáveis pedagógicos suficientes neste recorte para leitura de coordenação institucional.
                </div>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-mar-areia/30 bg-white p-6">
            <div className="mb-5">
              <div className="mb-3 flex items-center gap-2 text-sm font-medium text-mar-cobre">
                <AlertTriangle className="w-4 h-4" />
                Turmas que pedem ação
              </div>
              <h2 className="font-serif text-2xl font-bold text-mar-escuro">Recortes críticos dentro da instituição</h2>
              <p className="mt-1 text-sm text-mar-escuro/55">Turmas com atividade crítica, parada ou sem próximo passo definido.</p>
            </div>

            <div className="space-y-4">
              {data.criticalTurmas.length > 0 ? data.criticalTurmas.map((turma) => (
                <div key={turma.id} className="rounded-xl border border-mar-areia/30 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-medium text-mar-escuro">{turma.nome}</h3>
                      <p className="mt-1 text-sm text-mar-escuro/50">Responsável: {turma.responsibleName}</p>
                    </div>
                    <span className="badge bg-mar-verde/10 text-mar-verde">{turma.activeMembersCount} participante(s)</span>
                  </div>

                  <p className="mt-3 text-sm leading-relaxed text-mar-escuro/65">{turma.highlight}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-mar-escuro/45">
                    {turma.urgency.highPriority > 0 && <span className="badge bg-rose-100 text-rose-700">{turma.urgency.highPriority} alta prioridade</span>}
                    {turma.urgency.attention > 0 && <span className="badge bg-amber-100 text-amber-700">{turma.urgency.attention} em atenção</span>}
                    {turma.urgency.stale > 0 && <span className="badge bg-mar-cobre/10 text-mar-cobre">{turma.urgency.stale} sem atualização há 30+ dias</span>}
                    {turma.urgency.missingNextStep > 0 && <span className="badge bg-mar-azul/10 text-mar-azul">{turma.urgency.missingNextStep} sem próximo passo</span>}
                  </div>

                  <div className="mt-3 flex justify-end">
                    <Link href={`/app/gestor/turmas/${turma.id}`} className="inline-flex items-center gap-1 text-sm font-medium text-mar-azul">
                      Abrir turma <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              )) : (
                <div className="rounded-xl bg-mar-creme p-4 text-sm leading-relaxed text-mar-escuro/60">
                  Nenhuma turma aparece como crítica neste momento. A instituição segue com ritmo pedagógico mais estável.
                </div>
              )}
            </div>
          </section>
        </div>

        <div className="mb-10 grid gap-6 xl:grid-cols-[0.95fr,1.05fr]">
          <section className="rounded-2xl border border-mar-areia/30 bg-white p-6">
            <div className="mb-5">
              <h2 className="font-serif text-2xl font-bold text-mar-escuro">Participantes vinculados</h2>
              <p className="mt-1 text-sm text-mar-escuro/55">Pessoas ativas associadas à instituição com visão rápida de perfil e contexto.</p>
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
                <p className="text-sm text-mar-escuro/50">Nenhum participante ativo vinculado a esta instituição.</p>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-mar-areia/30 bg-white p-6">
            <div className="mb-5">
              <h2 className="font-serif text-2xl font-bold text-mar-escuro">Turmas relacionadas</h2>
              <p className="mt-1 text-sm text-mar-escuro/55">Turmas ativas com participantes matriculados e progresso das atividades pedagógicas.</p>
            </div>

            <div className="space-y-4">
              {data.turmasComResumo.length > 0 ? data.turmasComResumo.map((turma) => {
                const { planejada, em_andamento, concluida } = turma.progress;
                const total = planejada + em_andamento + concluida;
                const pctConcluida = total > 0 ? Math.round((concluida / total) * 100) : 0;
                const pctAndamento = total > 0 ? Math.round((em_andamento / total) * 100) : 0;

                return (
                  <div key={turma.id} className="rounded-xl border border-mar-areia/30 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                      <div>
                        <h3 className="font-medium text-mar-escuro">{turma.nome}</h3>
                        <p className="mt-1 text-sm text-mar-escuro/50">
                          {turma.anoLetivo ? `Ano ${turma.anoLetivo}` : "Ano letivo não informado"}
                          {turma.segmento && ` · ${turma.segmento}`}
                          {turma.turno && ` · ${turma.turno}`}
                        </p>
                      </div>
                      <span className="badge bg-mar-verde/10 text-mar-verde">{turma.activeMembersCount} participante(s)</span>
                    </div>

                    <div className="mb-3 flex flex-wrap gap-2 text-xs text-mar-escuro/45">
                      {turma.responsavelUserId ? (
                        <span className="badge bg-mar-azul/10 text-mar-azul">Responsável definido</span>
                      ) : (
                        <span className="badge bg-amber-100 text-amber-700">Sem responsável definido</span>
                      )}
                      {turma.urgency.highPriority > 0 && <span className="badge bg-rose-100 text-rose-700">{turma.urgency.highPriority} crítica(s)</span>}
                      {turma.urgency.attention > 0 && <span className="badge bg-amber-100 text-amber-700">{turma.urgency.attention} em atenção</span>}
                      {turma.urgency.stale > 0 && <span className="badge bg-mar-cobre/10 text-mar-cobre">{turma.urgency.stale} parada(s)</span>}
                    </div>

                    <div className="mb-3 flex justify-end">
                      <Link href={`/app/gestor/turmas/${turma.id}`} className="inline-flex items-center gap-1 text-sm font-medium text-mar-azul">
                        Ver drill-down da turma <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>

                    {total === 0 ? (
                      <p className="text-xs text-mar-escuro/40">Nenhuma atividade registrada.</p>
                    ) : (
                      <>
                        <div className="flex h-2 w-full overflow-hidden rounded-full bg-mar-areia/30">
                          <div className="h-full bg-mar-verde" style={{ width: `${pctConcluida}%` }} title={`Concluída: ${concluida}`} />
                          <div className="h-full bg-mar-azul" style={{ width: `${pctAndamento}%` }} title={`Em andamento: ${em_andamento}`} />
                        </div>
                        <div className="mt-2 flex flex-wrap gap-3 text-xs text-mar-escuro/50">
                          <span className="flex items-center gap-1">
                            <span className="inline-block h-1.5 w-1.5 rounded-full bg-mar-verde" />
                            {concluida} concluída{concluida !== 1 ? "s" : ""}
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="inline-block h-1.5 w-1.5 rounded-full bg-mar-azul" />
                            {em_andamento} em andamento
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="inline-block h-1.5 w-1.5 rounded-full bg-mar-areia/60" />
                            {planejada} planejada{planejada !== 1 ? "s" : ""}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                );
              }) : (
                <p className="text-sm text-mar-escuro/50">Nenhuma turma ativa relacionada à instituição até o momento.</p>
              )}
            </div>
          </section>
        </div>

        <section className="rounded-2xl border border-mar-areia/30 bg-white p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="font-serif text-2xl font-bold text-mar-escuro">Agenda institucional</h2>
              <p className="mt-1 text-sm text-mar-escuro/55">Programações futuras já vinculadas diretamente à instituição para articulação territorial.</p>
            </div>
            <Link href="/agenda" className="inline-flex items-center gap-1 text-sm font-medium text-mar-azul">
              Ver agenda pública
            </Link>
          </div>

          <div className="space-y-3">
            {data.upcomingEventos.length > 0 ? data.upcomingEventos.map((evento) => (
              <Link
                key={evento.id}
                href={`/agenda/${evento.id}`}
                className="block rounded-xl border border-mar-areia/30 p-4 transition-colors hover:border-mar-azul/30"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-medium text-mar-escuro">{evento.titulo}</h3>
                    <p className="mt-1 text-sm text-mar-escuro/55">{formatDate(evento.dataInicio)}</p>
                    {evento.local && <p className="mt-1 text-sm text-mar-escuro/55">{evento.local}</p>}
                  </div>
                  {evento.categoria && <span className="badge bg-mar-cobre/10 text-mar-cobre">{evento.categoria}</span>}
                </div>
                {evento.dataFim && evento.dataFim !== evento.dataInicio && (
                  <p className="mt-3 text-xs text-mar-escuro/45">Encerramento previsto em {formatDate(evento.dataFim)}</p>
                )}
              </Link>
            )) : (
              <div className="rounded-xl bg-mar-creme p-4 text-sm leading-relaxed text-mar-escuro/60">
                Nenhum evento futuro está vinculado a esta instituição. A gestão já pode usar o admin para associar novas programações a este detalhe institucional.
              </div>
            )}
          </div>

          <div className="mt-5 flex items-start gap-3 rounded-xl bg-mar-cobre/8 p-4 text-sm leading-relaxed text-mar-escuro/65">
            <CalendarRange className="mt-0.5 h-4 w-4 shrink-0 text-mar-cobre" />
            O vínculo entre agenda e instituição permite acompanhar presença territorial e calendário de mobilização a partir do mesmo painel gerencial.
          </div>
        </section>
      </div>
    </div>
  );
}
import Link from "next/link";
import { and, count, desc, eq, gte } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { requireGestorAccess } from "@/lib/access";
import { CopyTextButton } from "@/components/ui/CopyTextButton";
import { db } from "@/lib/db";
import { buildMailtoLink, buildOperationalWhatsAppShareText, buildWhatsAppShareLink } from "@/lib/gestor-sharing";
import { getAccessibleInstitutionIds } from "@/lib/institution-access";
import { extractRoles } from "@/lib/permissions";
import { getActivityUrgency } from "@/lib/activity-urgency";
import { atividadesTurma, eventos, instituicoes, matriculasTurma, profiles, turmas, users } from "@/lib/schema";
import { formatDate } from "@/lib/utils";
import { AlertTriangle, ArrowLeft, ArrowRight, BookOpen, Calendar, ClipboardList, Download, Mail, MessageSquareShare, School, ScrollText, Users } from "lucide-react";
import { z } from "zod";

const activityStatusLabelMap = {
  planejada: "Planejada",
  em_andamento: "Em andamento",
  concluida: "Concluída",
} as const;

const activityStatusToneMap = {
  planejada: "bg-mar-cobre/10 text-mar-cobre",
  em_andamento: "bg-mar-azul/10 text-mar-azul",
  concluida: "bg-mar-verde/10 text-mar-verde",
} as const;

const statusOptions = [
  { value: "todas", label: "Todas" },
  { value: "planejada", label: "Planejadas" },
  { value: "em_andamento", label: "Em andamento" },
  { value: "concluida", label: "Concluídas" },
] as const;

const sourceOptions = [
  { value: "todas", label: "Todas as origens" },
  { value: "manual", label: "Manuais" },
  { value: "derivada", label: "Derivadas" },
] as const;

const periodOptions = [
  { value: "7d", label: "Últimos 7 dias" },
  { value: "30d", label: "Últimos 30 dias" },
  { value: "90d", label: "Últimos 90 dias" },
  { value: "tudo", label: "Todo o histórico" },
] as const;

type ParamsInput = Promise<{ id: string }>;
type SearchParamsInput = Promise<Record<string, string | string[] | undefined>>;
type StatusFilter = (typeof statusOptions)[number]["value"];
type SourceFilter = (typeof sourceOptions)[number]["value"];
type PeriodFilter = (typeof periodOptions)[number]["value"];

const gestorCreateActivitySchema = z.object({
  turmaId: z.string().trim().min(1).max(36),
  titulo: z.string().trim().min(2).max(255),
  resumo: z.string().trim().min(10).max(2000),
  foco: z.string().trim().max(255).optional().or(z.literal("")),
  proximoPasso: z.string().trim().max(2000).optional().or(z.literal("")),
  status: z.enum(["planejada", "em_andamento", "concluida"]),
});

const gestorUpdateActivitySchema = z.object({
  activityId: z.string().trim().min(1).max(36),
  turmaId: z.string().trim().min(1).max(36),
  titulo: z.string().trim().min(2).max(255),
  resumo: z.string().trim().min(10).max(2000),
  foco: z.string().trim().max(255).optional().or(z.literal("")),
  status: z.enum(["planejada", "em_andamento", "concluida"]),
  proximoPasso: z.string().trim().max(2000).optional().or(z.literal("")),
});

function parseSingleSearchParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function resolveStatusFilter(params: Record<string, string | string[] | undefined>): StatusFilter {
  const raw = parseSingleSearchParam(params.status);
  return statusOptions.some((option) => option.value === raw) ? (raw as StatusFilter) : "todas";
}

function resolveSourceFilter(params: Record<string, string | string[] | undefined>): SourceFilter {
  const raw = parseSingleSearchParam(params.source);
  return sourceOptions.some((option) => option.value === raw) ? (raw as SourceFilter) : "todas";
}

function resolvePeriodFilter(params: Record<string, string | string[] | undefined>): PeriodFilter {
  const raw = parseSingleSearchParam(params.period);
  return periodOptions.some((option) => option.value === raw) ? (raw as PeriodFilter) : "30d";
}

function getPeriodStart(period: PeriodFilter) {
  if (period === "tudo") {
    return null;
  }

  const days = period === "7d" ? 7 : period === "90d" ? 90 : 30;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - days);
  return start;
}

function getActivitySource(origemChave: string) {
  return origemChave.startsWith("manual-") ? "manual" : "derivada";
}

function describeCurrentRecorte(filters: { status: StatusFilter; source: SourceFilter; period: PeriodFilter }) {
  const statusLabel = filters.status === "todas" ? "todos os status" : filters.status.replaceAll("_", " ");
  const sourceLabel = filters.source === "todas" ? "todas as origens" : filters.source;
  const periodLabel = filters.period === "tudo" ? "todo o histórico" : `últimos ${filters.period.replace("d", " dias")}`;
  return `${statusLabel}, ${sourceLabel}, ${periodLabel}`;
}

async function getGestorTurmaData(turmaId: string, status: StatusFilter, source: SourceFilter, period: PeriodFilter) {
  const [turma] = await db
    .select({
      id: turmas.id,
      nome: turmas.nome,
      anoLetivo: turmas.anoLetivo,
      segmento: turmas.segmento,
      turno: turmas.turno,
      responsavelUserId: turmas.responsavelUserId,
      instituicaoId: turmas.instituicaoId,
      instituicaoNome: instituicoes.nome,
      instituicaoTipo: instituicoes.tipo,
      cidade: instituicoes.cidade,
      estado: instituicoes.estado,
    })
    .from(turmas)
    .innerJoin(instituicoes, eq(turmas.instituicaoId, instituicoes.id))
    .where(eq(turmas.id, turmaId))
    .limit(1);

  if (!turma) {
    return null;
  }

  const [responsavel] = turma.responsavelUserId
    ? await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          profileType: profiles.profileType,
          displayName: profiles.displayName,
        })
        .from(users)
        .leftJoin(profiles, eq(profiles.userId, users.id))
        .where(eq(users.id, turma.responsavelUserId))
        .limit(1)
    : [];

  const matriculas = await db
    .select({
      userId: matriculasTurma.userId,
      status: matriculasTurma.status,
      name: users.name,
      email: users.email,
      lastLoginAt: users.lastLoginAt,
      createdAt: users.createdAt,
      displayName: profiles.displayName,
      profileType: profiles.profileType,
    })
    .from(matriculasTurma)
    .innerJoin(users, eq(matriculasTurma.userId, users.id))
    .leftJoin(profiles, eq(profiles.userId, users.id))
    .where(and(eq(matriculasTurma.turmaId, turmaId), eq(matriculasTurma.status, "ativo")));

  const [activitiesCountResult] = await db
    .select({ value: count() })
    .from(atividadesTurma)
    .where(eq(atividadesTurma.turmaId, turmaId));

  const activitiesBase = await db
    .select({
      id: atividadesTurma.id,
      titulo: atividadesTurma.titulo,
      resumo: atividadesTurma.resumo,
      foco: atividadesTurma.foco,
      proximoPasso: atividadesTurma.proximoPasso,
      status: atividadesTurma.status,
      origemChave: atividadesTurma.origemChave,
      createdBy: atividadesTurma.createdBy,
      createdByName: users.name,
      createdAt: atividadesTurma.createdAt,
      updatedAt: atividadesTurma.updatedAt,
    })
    .from(atividadesTurma)
    .leftJoin(users, eq(atividadesTurma.createdBy, users.id))
    .where(eq(atividadesTurma.turmaId, turmaId))
    .orderBy(desc(atividadesTurma.updatedAt));

  const periodStart = getPeriodStart(period);

  const activities = activitiesBase
    .filter((activity) => {
      if (status !== "todas" && activity.status !== status) {
        return false;
      }

      const activitySource = getActivitySource(activity.origemChave);
      if (source !== "todas" && activitySource !== source) {
        return false;
      }

      if (periodStart && activity.updatedAt < periodStart) {
        return false;
      }

      return true;
    })
    .map((activity) => ({
      ...activity,
      source: getActivitySource(activity.origemChave),
      urgency: getActivityUrgency(activity),
    }));

  const statusSummary = {
    planejada: activitiesBase.filter((activity) => activity.status === "planejada").length,
    em_andamento: activitiesBase.filter((activity) => activity.status === "em_andamento").length,
    concluida: activitiesBase.filter((activity) => activity.status === "concluida").length,
  };

  const urgencySummary = {
    alta: activities.filter((activity) => activity.urgency.level === "alta").length,
    media: activities.filter((activity) => activity.urgency.level === "media").length,
    baixa: activities.filter((activity) => activity.urgency.level === "baixa").length,
  };

  const priorityActivities = activities
    .filter((activity) => activity.urgency.level !== "baixa")
    .sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime())
    .slice(0, 4);

  const upcomingEventos = await db
    .select({
      id: eventos.id,
      titulo: eventos.titulo,
      dataInicio: eventos.dataInicio,
      local: eventos.local,
      categoria: eventos.categoria,
    })
    .from(eventos)
    .where(and(eq(eventos.publicado, true), eq(eventos.instituicaoId, turma.instituicaoId), gte(eventos.dataInicio, new Date())))
    .orderBy(eventos.dataInicio)
    .limit(4);

  const recentStudents = [...matriculas]
    .sort((left, right) => {
      const leftDate = left.lastLoginAt ?? left.createdAt;
      const rightDate = right.lastLoginAt ?? right.createdAt;
      return rightDate.getTime() - leftDate.getTime();
    })
    .slice(0, 8)
    .map((student) => ({
      id: student.userId,
      name: student.displayName ?? student.name,
      email: student.email,
      profileType: student.profileType ?? "sem_perfil",
      referenceDate: student.lastLoginAt ?? student.createdAt,
    }));

  const attentionPoints: string[] = [];
  if (!responsavel) {
    attentionPoints.push("A turma ainda não tem responsável pedagógico explícito vinculado.");
  }
  if (urgencySummary.alta > 0) {
    attentionPoints.push(`${urgencySummary.alta} atividade(s) estão em alta prioridade neste recorte.`);
  }
  if (activities.some((activity) => !activity.proximoPasso?.trim() && activity.status !== "concluida")) {
    attentionPoints.push("Há atividade(s) sem próximo passo definido, o que pede alinhamento com o responsável da turma.");
  }
  if (upcomingEventos.length === 0) {
    attentionPoints.push("Não há eventos futuros vinculados à instituição desta turma no momento.");
  }
  if (attentionPoints.length === 0) {
    attentionPoints.push("A turma segue com acompanhamento estável e já permite leitura gerencial consistente.");
  }

  return {
    turma,
    responsavel: responsavel
      ? {
          id: responsavel.id,
          name: responsavel.displayName ?? responsavel.name,
          email: responsavel.email,
          profileType: responsavel.profileType ?? "professor",
        }
      : null,
    studentsCount: matriculas.length,
    activitiesCount: activitiesCountResult?.value ?? 0,
    activities,
    statusSummary,
    urgencySummary,
    priorityActivities,
    filters: {
      status,
      source,
      period,
    },
    recentStudents,
    upcomingEventos,
    attentionPoints,
  };
}

export default async function GestorTurmaDetailPage({
  params,
  searchParams,
}: {
  params: ParamsInput;
  searchParams: SearchParamsInput;
}) {
  const session = await requireGestorAccess();
  const roles = extractRoles(session);
  const userId = session.user?.id ?? "";
  const canViewAllInstitutions = roles.includes("superadmin");
  const accessibleInstitutionIds = await getAccessibleInstitutionIds(userId, canViewAllInstitutions);

  const { id } = await params;
  const resolvedSearchParams = await searchParams;
  const status = resolveStatusFilter(resolvedSearchParams);
  const source = resolveSourceFilter(resolvedSearchParams);
  const period = resolvePeriodFilter(resolvedSearchParams);

  const [turmaScope] = await db
    .select({ id: turmas.id, instituicaoId: turmas.instituicaoId })
    .from(turmas)
    .where(eq(turmas.id, id))
    .limit(1);

  if (!turmaScope) {
    notFound();
  }

  if (!canViewAllInstitutions && !accessibleInstitutionIds.includes(turmaScope.instituicaoId)) {
    notFound();
  }

  const data = await getGestorTurmaData(id, status, source, period);

  if (!data) {
    notFound();
  }

  async function createActivity(formData: FormData) {
    "use server";

    const session = await requireGestorAccess();
    const parsed = gestorCreateActivitySchema.safeParse({
      turmaId: String(formData.get("turmaId") ?? ""),
      titulo: String(formData.get("titulo") ?? ""),
      resumo: String(formData.get("resumo") ?? ""),
      foco: String(formData.get("foco") ?? ""),
      proximoPasso: String(formData.get("proximoPasso") ?? ""),
      status: String(formData.get("status") ?? "planejada"),
    });

    if (!parsed.success) {
      return;
    }

    const { turmaId, titulo, resumo, foco, proximoPasso, status } = parsed.data;

    const [turma] = await db
      .select({ id: turmas.id, instituicaoId: turmas.instituicaoId })
      .from(turmas)
      .where(eq(turmas.id, turmaId))
      .limit(1);

    if (!turma) {
      return;
    }

    const sessionRoles = extractRoles(session);
    const canViewAll = sessionRoles.includes("superadmin");
    const accessibleIds = await getAccessibleInstitutionIds(session.user?.id ?? "", canViewAll);

    if (!canViewAll && !accessibleIds.includes(turma.instituicaoId)) {
      return;
    }

    await db.insert(atividadesTurma).values({
      id: crypto.randomUUID(),
      turmaId,
      createdBy: session.user?.id ?? null,
      origemChave: `manual-${crypto.randomUUID()}`,
      titulo,
      resumo,
      foco: foco || null,
      proximoPasso: proximoPasso || null,
      status: status as "planejada" | "em_andamento" | "concluida",
      updatedAt: new Date(),
    });

    revalidatePath("/app/gestor");
    revalidatePath(`/app/gestor/turmas/${turmaId}`);
    revalidatePath(`/app/gestor/instituicoes/${turma.instituicaoId}`);
    revalidatePath("/app/professor");
    revalidatePath(`/app/professor/turmas/${turmaId}`);
  }

  async function updateActivity(formData: FormData) {
    "use server";

    const session = await requireGestorAccess();
    const parsed = gestorUpdateActivitySchema.safeParse({
      activityId: String(formData.get("activityId") ?? ""),
      turmaId: String(formData.get("turmaId") ?? ""),
      titulo: String(formData.get("titulo") ?? ""),
      resumo: String(formData.get("resumo") ?? ""),
      foco: String(formData.get("foco") ?? ""),
      status: String(formData.get("status") ?? "planejada"),
      proximoPasso: String(formData.get("proximoPasso") ?? ""),
    });

    if (!parsed.success) {
      return;
    }

    const { activityId, turmaId, titulo, resumo, foco, status, proximoPasso } = parsed.data;

    const [activity] = await db
      .select({
        id: atividadesTurma.id,
        turmaId: atividadesTurma.turmaId,
        instituicaoId: turmas.instituicaoId,
      })
      .from(atividadesTurma)
      .innerJoin(turmas, eq(atividadesTurma.turmaId, turmas.id))
      .where(eq(atividadesTurma.id, activityId))
      .limit(1);

    if (!activity) {
      return;
    }

    if (activity.turmaId !== turmaId) {
      return;
    }

    const sessionRoles = extractRoles(session);
    const canViewAll = sessionRoles.includes("superadmin");
    const accessibleIds = await getAccessibleInstitutionIds(session.user?.id ?? "", canViewAll);

    if (!canViewAll && !accessibleIds.includes(activity.instituicaoId)) {
      return;
    }

    await db
      .update(atividadesTurma)
      .set({
        titulo,
        resumo,
        foco: foco || null,
        status: status as "planejada" | "em_andamento" | "concluida",
        proximoPasso: proximoPasso || null,
        updatedAt: new Date(),
      })
      .where(eq(atividadesTurma.id, activity.id));

    revalidatePath("/app/gestor");
    revalidatePath(`/app/gestor/turmas/${turmaId}`);
    revalidatePath(`/app/gestor/instituicoes/${activity.instituicaoId}`);
    revalidatePath("/app/professor");
    revalidatePath(`/app/professor/turmas/${turmaId}`);
  }

  const csvExportParams = new URLSearchParams({ turma: data.turma.id });
  const summaryExportParams = new URLSearchParams({
    turma: data.turma.id,
    formato: "resumo",
    status: data.filters.status,
    source: data.filters.source,
    period: data.filters.period,
  });
  const messageExportParams = new URLSearchParams({
    turma: data.turma.id,
    formato: "mensagem",
    status: data.filters.status,
    source: data.filters.source,
    period: data.filters.period,
  });
  const whatsappExportParams = new URLSearchParams({
    turma: data.turma.id,
    formato: "whatsapp",
    status: data.filters.status,
    source: data.filters.source,
    period: data.filters.period,
  });
  const meetingExportParams = new URLSearchParams({
    turma: data.turma.id,
    formato: "reuniao",
    status: data.filters.status,
    source: data.filters.source,
    period: data.filters.period,
  });
  const missingNextStepCount = data.activities.filter((activity) => !activity.proximoPasso?.trim() && activity.status !== "concluida").length;
  const nextEvent = data.upcomingEventos[0] ?? null;
  const executiveRecommendation = !data.responsavel
    ? "Definir um responsável pedagógico explícito para sustentar a coordenação desta turma."
    : data.urgencySummary.alta > 0
      ? `Acionar ${data.responsavel.name} para revisar as atividades em alta prioridade e registrar próximos passos ainda nesta semana.`
      : !nextEvent
        ? `Combinar com ${data.responsavel.name} um próximo marco institucional para manter a turma em movimento.`
        : `Usar ${nextEvent.titulo} como próximo checkpoint de acompanhamento com ${data.responsavel.name}.`;
  const executiveCards = [
    {
      title: "Estado atual",
      value: `${data.studentsCount} estudantes ativos e ${data.activitiesCount} atividades acumuladas.`,
      detail: `${data.urgencySummary.alta} em alta prioridade, ${data.statusSummary.em_andamento} em andamento e ${data.statusSummary.concluida} concluídas no panorama atual.`,
    },
    {
      title: "Acionamento sugerido",
      value: executiveRecommendation,
      detail: data.responsavel ? `Responsável atual: ${data.responsavel.name}${data.responsavel.email ? ` • ${data.responsavel.email}` : ""}` : "Ainda não existe um responsável pedagógico explicitamente vinculado.",
    },
    {
      title: "Janela de coordenação",
      value: nextEvent ? `${nextEvent.titulo} em ${formatDate(nextEvent.dataInicio)}.` : "Sem evento futuro da rede vinculado à instituição neste momento.",
      detail: `Recorte ativo: ${describeCurrentRecorte(data.filters)}.`,
    },
  ];
  const pedagogicalReadingCards = [
    {
      title: "Ritmo pedagógico",
      value: data.urgencySummary.alta > 0
        ? `${data.urgencySummary.alta} atividade(s) em alta prioridade pedem coordenação pedagógica mais próxima.`
        : "A turma está sem urgência alta explícita neste recorte.",
      detail: missingNextStepCount > 0
        ? `${missingNextStepCount} atividade(s) seguem sem próximo passo definido, então o ganho imediato é transformar leitura em encaminhamento registrado.`
        : "As atividades abertas já têm próximo passo registrado, o que favorece manutenção de cadência e revisão por checkpoint.",
    },
    {
      title: "Coordenação focal",
      value: data.responsavel
        ? `${data.responsavel.name} é hoje a referência principal para sustentar a continuidade desta turma.`
        : "Ainda não há uma referência pedagógica explicitamente vinculada a esta turma.",
      detail: data.responsavel
        ? `A recomendação operacional é usar esse vínculo para fechar próximos passos, alinhar prioridades e preparar o próximo marco institucional.`
        : "Sem esse vínculo, a turma perde cadência e a leitura gerencial fica menos acionável para a rede.",
    },
    {
      title: "Janela de rede",
      value: nextEvent
        ? `${nextEvent.titulo} é o próximo ponto público para testar a prontidão desta turma.`
        : "Não há evento futuro próximo publicado para sustentar a cadência desta turma.",
      detail: nextEvent
        ? `Usar ${formatDate(nextEvent.dataInicio)} como checkpoint ajuda a conectar acompanhamento pedagógico, agenda e responsabilização concreta.`
        : "Até surgir um novo marco, a própria página deve funcionar como base curta de acompanhamento e alinhamento entre gestor e responsável.",
    },
  ];
  const turmaEmailBody = [
    `Síntese executiva da turma ${data.turma.nome}`,
    "",
    `Instituição: ${data.turma.instituicaoNome}`,
    `Recorte ativo: ${describeCurrentRecorte(data.filters)}`,
    "Estado do produto: operação publicada e coordenação pedagógica por turma em aprofundamento.",
    `Estado atual: ${data.studentsCount} estudantes ativos, ${data.activitiesCount} atividades acumuladas e ${data.urgencySummary.alta} em alta prioridade.`,
    `Ação recomendada: ${executiveRecommendation}`,
    data.attentionPoints[0] ? `Ponto de atenção: ${data.attentionPoints[0]}` : "",
    nextEvent ? `Próximo marco: ${nextEvent.titulo} em ${formatDate(nextEvent.dataInicio)}.` : "Próximo marco: ainda sem evento futuro publicado para a instituição.",
  ]
    .filter(Boolean)
    .join("\n");
  const turmaMailtoHref = buildMailtoLink(
    data.responsavel?.email ?? null,
    `Síntese executiva da turma ${data.turma.nome}`,
    turmaEmailBody,
  );
  const priorityTurmaPath = `/app/gestor/turmas/${data.turma.id}`;
  const turmaShortMessage = [
    `Síntese rápida da turma ${data.turma.nome}`,
    `Instituição: ${data.turma.instituicaoNome}`,
    `Recorte: ${describeCurrentRecorte(data.filters)}`,
    "Estado do produto: operação publicada e coordenação pedagógica por turma em aprofundamento.",
    `Estado: ${data.studentsCount} estudantes ativos, ${data.urgencySummary.alta} atividade(s) crítica(s) e ${data.statusSummary.em_andamento} em andamento.`,
    `Ação: ${executiveRecommendation}`,
    `Abrir turma prioritária: ${priorityTurmaPath}`,
    nextEvent ? `Próximo marco: ${nextEvent.titulo} em ${formatDate(nextEvent.dataInicio)}.` : "Próximo marco: ainda sem evento futuro publicado para a instituição.",
  ].join("\n");
  const turmaWhatsAppMessage = buildOperationalWhatsAppShareText({
    heading: `Turma ${data.turma.nome} · ${data.turma.instituicaoNome}`,
    state: `${data.studentsCount} estudante(s), ${data.urgencySummary.alta} crítica(s), ${data.statusSummary.em_andamento} em andamento.`,
    action: executiveRecommendation,
    ctaPath: priorityTurmaPath,
    checkpoint: nextEvent ? `${nextEvent.titulo} em ${formatDate(nextEvent.dataInicio)}.` : null,
  });
  const turmaWhatsAppHref = buildWhatsAppShareLink(turmaWhatsAppMessage);
  const turmaFullSummary = [
    `Resumo executivo da turma ${data.turma.nome}`,
    `Instituição: ${data.turma.instituicaoNome}`,
    `Recorte ativo: ${describeCurrentRecorte(data.filters)}`,
    "Estado do produto: operação publicada, jornadas estabilizadas e coordenação pedagógica por turma em aprofundamento.",
    `Estado atual: ${data.studentsCount} estudantes ativos, ${data.activitiesCount} atividades acumuladas e ${data.urgencySummary.alta} em alta prioridade.`,
    `Ação recomendada: ${executiveRecommendation}`,
    `Abrir turma prioritária: ${priorityTurmaPath}`,
    missingNextStepCount > 0
      ? `Próximo cuidado: ${missingNextStepCount} atividade(s) seguem sem próximo passo definido.`
      : "Próximo cuidado: todas as atividades abertas no recorte já têm próximo passo registrado.",
    nextEvent ? `Agenda da rede: ${nextEvent.titulo} em ${formatDate(nextEvent.dataInicio)}.` : "Agenda da rede: ainda sem evento futuro vinculado à instituição.",
  ].join("\n");
  const turmaMeetingSummary = [
    "Contexto executivo:",
    "• O site já opera publicamente e este drill-down agora sustenta a coordenação pedagógica concreta no nível da turma.",
    "• O objetivo desta leitura é transformar urgência, agenda e responsabilidade em próximo passo pactuado.",
    "Decisões sugeridas:",
    `• ${executiveRecommendation}`,
    data.priorityActivities[0]
      ? `• Priorizar a atividade ${data.priorityActivities[0].titulo.toLowerCase()}.`
      : "• Manter a cadência atual de acompanhamento.",
    "Pendências:",
    missingNextStepCount > 0
      ? `• ${missingNextStepCount} atividade(s) seguem sem próximo passo definido.`
      : "• Não há pendências críticas de próximo passo no recorte atual.",
    data.priorityActivities[1]
      ? `• Revisar também ${data.priorityActivities[1].titulo.toLowerCase()} na mesma conversa.`
      : "• Sem segunda pendência crítica explícita neste recorte.",
    "Próximo checkpoint:",
    nextEvent ? `• ${nextEvent.titulo} em ${formatDate(nextEvent.dataInicio)}.` : "• Definir um próximo marco institucional para a turma.",
    `• Abrir turma prioritária em ${priorityTurmaPath}.`,
  ].join("\n");

  return (
    <div className="p-8 md:p-10">
      <div className="max-w-6xl">
        <div className="mb-8 flex flex-wrap items-center gap-3">
          <Link href={`/app/gestor/instituicoes/${data.turma.instituicaoId}`} className="inline-flex items-center gap-2 text-sm font-medium text-mar-azul">
            <ArrowLeft className="w-4 h-4" />
            Voltar ao detalhe institucional
          </Link>
          <Link href="/app/gestor" className="inline-flex items-center gap-2 text-sm font-medium text-mar-azul/70">
            Voltar ao painel do gestor
          </Link>
        </div>

        <div className="mb-10 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-sm uppercase tracking-wide text-mar-azul font-medium">
            <School className="w-4 h-4" />
            Drill-down gerencial da turma
          </div>
          <h1 className="font-serif text-4xl font-bold text-mar-escuro">{data.turma.nome}</h1>
          <p className="max-w-3xl leading-relaxed text-mar-escuro/60">
            Visão gerencial da turma para acompanhar urgência pedagógica, responsáveis, estudantes ativos e agenda relacionada à instituição.
          </p>
          <p className="text-sm text-mar-escuro/45">
            O site já opera no domínio público, e este drill-down concentra a camada mais concreta da coordenação pedagógica: transformar sinais da turma em encaminhamento verificável.
          </p>
          <div className="flex flex-wrap gap-2 text-xs text-mar-escuro/45">
            <span className="badge bg-mar-azul/10 text-mar-azul">{data.turma.instituicaoNome}</span>
            <span className="badge bg-mar-cobre/10 text-mar-cobre">{data.turma.instituicaoTipo}</span>
            {(data.turma.cidade || data.turma.estado) && (
              <span className="badge bg-mar-verde/10 text-mar-verde">
                {data.turma.cidade}{data.turma.cidade && data.turma.estado ? "/" : ""}{data.turma.estado}
              </span>
            )}
            {data.responsavel ? (
              <span className="badge bg-mar-creme text-mar-escuro/70">Responsável: {data.responsavel.name}</span>
            ) : (
              <span className="badge bg-amber-100 text-amber-700">Sem responsável definido</span>
            )}
          </div>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link href={`/app/gestor/exportar?${csvExportParams.toString()}`} className="inline-flex items-center gap-2 rounded-full bg-mar-azul px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90">
              <Download className="w-4 h-4" />
              Exportar CSV da turma
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
            <Link href={`/app/gestor/exportar?${whatsappExportParams.toString()}`} className="inline-flex items-center gap-2 rounded-full border border-mar-verde/20 bg-white px-4 py-2 text-sm font-medium text-mar-verde transition-colors hover:border-mar-verde/40">
              <MessageSquareShare className="w-4 h-4" />
              Baixar texto WhatsApp
            </Link>
            <CopyTextButton
              text={turmaFullSummary}
              label="Copiar síntese executiva"
              copiedLabel="Síntese copiada"
              className="inline-flex items-center gap-2 rounded-full border border-mar-azul/20 bg-white px-4 py-2 text-sm font-medium text-mar-azul transition-colors hover:border-mar-azul/40"
            />
            <CopyTextButton
              text={turmaShortMessage}
              label="Copiar mensagem curta"
              copiedLabel="Mensagem copiada"
              className="inline-flex items-center gap-2 rounded-full border border-mar-cobre/20 bg-white px-4 py-2 text-sm font-medium text-mar-cobre transition-colors hover:border-mar-cobre/40"
            />
            <a href={turmaMailtoHref} className="inline-flex items-center gap-2 rounded-full border border-mar-areia/40 bg-white px-4 py-2 text-sm font-medium text-mar-azul transition-colors hover:border-mar-azul/30">
                <Mail className="w-4 h-4" />
                {data.responsavel?.email ? "Enviar síntese ao responsável" : "Abrir e-mail com síntese"}
              </a>
            <a
              href={turmaWhatsAppHref}
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
            { label: "Estudantes ativos", value: data.studentsCount, icon: Users, tone: "text-mar-azul bg-mar-azul/10" },
            { label: "Atividades registradas", value: data.activitiesCount, icon: ClipboardList, tone: "text-mar-cobre bg-mar-cobre/10" },
            { label: "Em andamento", value: data.statusSummary.em_andamento, icon: BookOpen, tone: "text-mar-verde bg-mar-verde/10" },
            { label: "Eventos da rede", value: data.upcomingEventos.length, icon: Calendar, tone: "text-mar-azul bg-mar-azul/10" },
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
              <h2 className="font-serif text-2xl font-bold text-mar-escuro">Resumo executivo da turma</h2>
              <p className="mt-1 text-sm text-mar-escuro/55">Leitura curta para repasse institucional, reunião de acompanhamento ou alinhamento com o responsável pedagógico.</p>
            </div>
            <div className="rounded-full bg-mar-creme px-4 py-2 text-xs font-medium uppercase tracking-wide text-mar-cobre/90">
              {describeCurrentRecorte(data.filters)}
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
              <h3 className="text-sm font-medium uppercase tracking-wide text-mar-cobre/80">Pontos de atenção imediatos</h3>
              <ul className="mt-4 space-y-3 text-sm leading-relaxed text-mar-escuro/62">
                {data.attentionPoints.slice(0, 3).map((item) => (
                  <li key={item}>• {item}</li>
                ))}
                {missingNextStepCount > 0 ? <li>• {missingNextStepCount} atividade(s) seguem sem próximo passo explícito neste recorte.</li> : null}
              </ul>
            </div>
            <div className="rounded-2xl border border-mar-areia/30 p-5">
              <h3 className="text-sm font-medium uppercase tracking-wide text-mar-cobre/80">Próximos movimentos sugeridos</h3>
              <ul className="mt-4 space-y-3 text-sm leading-relaxed text-mar-escuro/62">
                <li>• {executiveRecommendation}</li>
                <li>• {nextEvent ? `Preparar a turma para o marco ${nextEvent.titulo} em ${formatDate(nextEvent.dataInicio)}.` : "Definir um próximo marco institucional para orientar o acompanhamento desta turma."}</li>
                <li>• {data.priorityActivities[0] ? `Retomar primeiro a atividade ${data.priorityActivities[0].titulo.toLowerCase()}, que hoje pede ${data.priorityActivities[0].urgency.reason}.` : "Manter a cadência atual e revisar o recorte novamente na próxima janela gerencial."}</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="mb-10 rounded-2xl border border-mar-areia/30 bg-white p-6">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="font-serif text-2xl font-bold text-mar-escuro">Resumo para reunião</h2>
              <p className="mt-1 text-sm text-mar-escuro/55">Versão direta para checkpoint com encaminhamentos, pendências e próximo marco desta turma.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <CopyTextButton
                text={turmaMeetingSummary}
                label="Copiar resumo de reunião"
                copiedLabel="Resumo copiado"
                className="inline-flex items-center gap-2 rounded-full border border-mar-azul/20 bg-white px-4 py-2 text-sm font-medium text-mar-azul transition-colors hover:border-mar-azul/40"
              />
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
                <li>• {data.priorityActivities[0] ? `Priorizar ${data.priorityActivities[0].titulo.toLowerCase()}.` : "Manter a cadência atual de acompanhamento."}</li>
              </ul>
            </article>
            <article className="rounded-2xl border border-mar-areia/30 bg-mar-creme/40 p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-mar-cobre/80">Pendências</p>
              <ul className="mt-3 space-y-3 text-sm leading-relaxed text-mar-escuro/62">
                <li>• {missingNextStepCount > 0 ? `${missingNextStepCount} atividade(s) seguem sem próximo passo definido.` : "Não há pendências críticas de próximo passo no recorte atual."}</li>
                <li>• {data.priorityActivities[1] ? `Revisar também ${data.priorityActivities[1].titulo.toLowerCase()}.` : "Sem segunda pendência crítica explícita neste recorte."}</li>
              </ul>
            </article>
            <article className="rounded-2xl border border-mar-areia/30 bg-mar-creme/40 p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-mar-cobre/80">Próximo checkpoint</p>
              <ul className="mt-3 space-y-3 text-sm leading-relaxed text-mar-escuro/62">
                <li>• {nextEvent ? `${nextEvent.titulo} em ${formatDate(nextEvent.dataInicio)}.` : "Definir um próximo marco institucional para a turma."}</li>
                <li>• Abrir turma prioritária em {priorityTurmaPath}.</li>
              </ul>
            </article>
          </div>
        </section>

        <section className="mb-10 rounded-2xl border border-mar-areia/30 bg-white p-6">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="font-serif text-2xl font-bold text-mar-escuro">Leitura pedagógica desta turma</h2>
              <p className="mt-1 text-sm text-mar-escuro/55">
                Interpretação curta do recorte para decidir onde agir agora, quem coordenar e qual marco usar como checkpoint.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-mar-azul/10 px-4 py-2 text-xs font-medium uppercase tracking-wide text-mar-azul">
              <BookOpen className="w-4 h-4" />
              {data.urgencySummary.alta > 0 ? `${data.urgencySummary.alta} prioridade(s) altas` : "Cadência estável no recorte"}
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
              <AlertTriangle className="w-4 h-4" />
              Sinais de atenção
            </div>
            <ul className="space-y-3 text-sm leading-relaxed text-mar-escuro/65">
              {data.attentionPoints.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </section>

          <section className="rounded-2xl border border-mar-areia/30 bg-white p-6">
            <div className="mb-5 rounded-2xl bg-mar-creme/60 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-mar-escuro/55">Responsável pedagógico</p>
              {data.responsavel ? (
                <>
                  <h3 className="mt-2 font-serif text-2xl font-bold text-mar-escuro">{data.responsavel.name}</h3>
                  <p className="mt-1 text-sm text-mar-escuro/55">{data.responsavel.email}</p>
                  <p className="mt-2 text-xs uppercase tracking-wide text-mar-cobre/80">{data.responsavel.profileType}</p>
                </>
              ) : (
                <p className="mt-2 text-sm text-mar-escuro/60">Ainda não há responsável pedagógico explicitamente definido para esta turma.</p>
              )}
            </div>

            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h2 className="font-serif text-2xl font-bold text-mar-escuro">Prioridades pedagógicas</h2>
                <p className="mt-1 text-sm text-mar-escuro/55">Atividades que pedem retomada, próximo passo ou revisão neste recorte.</p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full bg-mar-cobre/10 px-4 py-2 text-xs font-medium uppercase tracking-wide text-mar-cobre">
                <AlertTriangle className="h-4 w-4" />
                {data.urgencySummary.alta} em alta prioridade
              </div>
            </div>

            <div className="space-y-3">
              {data.priorityActivities.length > 0 ? data.priorityActivities.map((activity) => (
                <div key={activity.id} className="rounded-xl border border-mar-areia/30 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="font-medium text-mar-escuro">{activity.titulo}</h3>
                      <p className="mt-1 text-sm text-mar-escuro/55">{activity.urgency.reason}</p>
                    </div>
                    <span className={`badge ${activity.urgency.level === "alta" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"}`}>
                      {activity.urgency.label}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-mar-escuro/45">
                    <span>Atualizada em {formatDate(activity.updatedAt)}</span>
                    {activity.proximoPasso && <span>Próximo passo: {activity.proximoPasso}</span>}
                  </div>
                </div>
              )) : (
                <div className="rounded-xl bg-mar-creme p-4 text-sm leading-relaxed text-mar-escuro/60">
                  Nenhuma atividade crítica no recorte atual. A turma está com acompanhamento mais estável neste momento.
                </div>
              )}
            </div>
          </section>
        </div>

        <section className="mb-10 rounded-2xl border border-mar-areia/30 bg-white p-6">
          <div className="mb-5">
            <h2 className="font-serif text-2xl font-bold text-mar-escuro">Nova atividade da turma</h2>
            <p className="mt-1 text-sm text-mar-escuro/55">Registre uma atividade manual para orientar a coordenação pedagógica e manter a cadência da turma.</p>
          </div>

          <form action={createActivity} className="space-y-4">
            <input type="hidden" name="turmaId" value={data.turma.id} />

            <div className="grid gap-4 md:grid-cols-[1.2fr,0.8fr]">
              <label className="flex flex-col gap-2 text-sm text-mar-escuro/70">
                Título
                <input
                  name="titulo"
                  type="text"
                  required
                  className="rounded-xl border border-mar-areia/40 bg-white px-4 py-3 text-sm text-mar-escuro outline-none transition-colors focus:border-mar-azul/40"
                  placeholder="Ex.: roda de memória sobre artefatos da pesca"
                />
              </label>

              <label className="flex flex-col gap-2 text-sm text-mar-escuro/70">
                Status inicial
                <select
                  name="status"
                  defaultValue="planejada"
                  className="rounded-xl border border-mar-areia/40 bg-white px-4 py-3 text-sm text-mar-escuro outline-none transition-colors focus:border-mar-azul/40"
                >
                  <option value="planejada">Planejada</option>
                  <option value="em_andamento">Em andamento</option>
                  <option value="concluida">Concluída</option>
                </select>
              </label>
            </div>

            <label className="flex flex-col gap-2 text-sm text-mar-escuro/70">
              Resumo
              <textarea
                name="resumo"
                rows={4}
                required
                className="rounded-xl border border-mar-areia/40 bg-white px-4 py-3 text-sm text-mar-escuro outline-none transition-colors focus:border-mar-azul/40"
                placeholder="Descreva o contexto da turma, o objetivo e o resultado esperado da atividade."
              />
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm text-mar-escuro/70">
                Foco
                <input
                  name="foco"
                  type="text"
                  className="rounded-xl border border-mar-areia/40 bg-white px-4 py-3 text-sm text-mar-escuro outline-none transition-colors focus:border-mar-azul/40"
                  placeholder="Ex.: memória local, preparação de visita, leitura de acervo"
                />
              </label>

              <label className="flex flex-col gap-2 text-sm text-mar-escuro/70">
                Próximo passo
                <input
                  name="proximoPasso"
                  type="text"
                  className="rounded-xl border border-mar-areia/40 bg-white px-4 py-3 text-sm text-mar-escuro outline-none transition-colors focus:border-mar-azul/40"
                  placeholder="Ex.: alinhar com responsável, preparar devolutiva, agendar checkpoint"
                />
              </label>
            </div>

            <div className="flex justify-end">
              <button type="submit" className="btn-primary text-sm">Criar atividade manual</button>
            </div>
          </form>
        </section>

        <section className="mb-10 rounded-2xl border border-mar-areia/30 bg-white p-6">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h2 className="font-serif text-2xl font-bold text-mar-escuro">Atividades da turma</h2>
              <p className="mt-1 text-sm text-mar-escuro/55">Histórico e progresso das atividades pedagógicas registradas.</p>
              <p className="mt-2 text-xs uppercase tracking-wide text-mar-cobre/80">
                {data.activities.length} atividade(s) no recorte atual
              </p>
            </div>
            <form className="flex flex-wrap items-end gap-3">
              <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wide text-mar-escuro/55">
                Status
                <select
                  name="status"
                  defaultValue={data.filters.status}
                  className="rounded-lg border border-mar-areia/40 bg-white px-3 py-2 text-sm font-normal text-mar-escuro outline-none focus:border-mar-azul/40"
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wide text-mar-escuro/55">
                Origem
                <select
                  name="source"
                  defaultValue={data.filters.source}
                  className="rounded-lg border border-mar-areia/40 bg-white px-3 py-2 text-sm font-normal text-mar-escuro outline-none focus:border-mar-azul/40"
                >
                  {sourceOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wide text-mar-escuro/55">
                Período
                <select
                  name="period"
                  defaultValue={data.filters.period}
                  className="rounded-lg border border-mar-areia/40 bg-white px-3 py-2 text-sm font-normal text-mar-escuro outline-none focus:border-mar-azul/40"
                >
                  {periodOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
              <button type="submit" className="btn-secondary text-sm">Filtrar</button>
            </form>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            {data.activities.length > 0 ? data.activities.map((activity) => (
              <div key={activity.id} className="rounded-xl border border-mar-areia/30 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-medium text-mar-escuro">{activity.titulo}</h3>
                    <p className="mt-1 text-sm text-mar-escuro/55">Origem: {activity.origemChave}</p>
                  </div>
                  <span className={`badge ${activityStatusToneMap[activity.status]}`}>
                    {activityStatusLabelMap[activity.status]}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-mar-escuro/60">{activity.resumo}</p>
                {activity.foco && <p className="mt-3 text-xs uppercase tracking-wide text-mar-cobre/80">Foco: {activity.foco}</p>}
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-mar-escuro/45">
                  <span className="badge bg-mar-azul/10 text-mar-azul">
                    {activity.source === "manual" ? "Autoria manual" : "Plano derivado"}
                  </span>
                  <span className={`badge ${activity.urgency.level === "alta" ? "bg-rose-100 text-rose-700" : activity.urgency.level === "media" ? "bg-amber-100 text-amber-700" : "bg-mar-verde/10 text-mar-verde"}`}>
                    {activity.urgency.label}
                  </span>
                  <span>Registrada em {formatDate(activity.createdAt)}</span>
                  {activity.createdByName && <span>por {activity.createdByName}</span>}
                </div>
                <form action={updateActivity} className="mt-4 space-y-3 rounded-xl bg-mar-creme/60 p-4">
                  <input type="hidden" name="activityId" value={activity.id} />
                  <input type="hidden" name="turmaId" value={data.turma.id} />
                  <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wide text-mar-escuro/55">
                    Título
                    <input
                      type="text"
                      name="titulo"
                      required
                      defaultValue={activity.titulo}
                      className="rounded-lg border border-mar-areia/40 bg-white px-3 py-2 text-sm font-normal text-mar-escuro outline-none focus:border-mar-azul/40"
                      placeholder="Nome da atividade"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wide text-mar-escuro/55">
                    Resumo
                    <textarea
                      name="resumo"
                      rows={4}
                      required
                      defaultValue={activity.resumo}
                      className="rounded-lg border border-mar-areia/40 bg-white px-3 py-2 text-sm font-normal text-mar-escuro outline-none focus:border-mar-azul/40"
                      placeholder="Atualize o contexto, a proposta e o objetivo da atividade"
                    />
                  </label>
                  <div className="grid gap-3 md:grid-cols-[180px,1fr,1fr]">
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
                      Foco
                      <input
                        type="text"
                        name="foco"
                        defaultValue={activity.foco ?? ""}
                        className="rounded-lg border border-mar-areia/40 bg-white px-3 py-2 text-sm font-normal text-mar-escuro outline-none focus:border-mar-azul/40"
                        placeholder="Ex.: memória local, visita, acervo"
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wide text-mar-escuro/55">
                      Próximo passo
                      <input
                        type="text"
                        name="proximoPasso"
                        defaultValue={activity.proximoPasso ?? ""}
                        className="rounded-lg border border-mar-areia/40 bg-white px-3 py-2 text-sm font-normal text-mar-escuro outline-none focus:border-mar-azul/40"
                        placeholder="Ex.: devolver à turma, preparar visita, concluir registro"
                      />
                    </label>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="text-xs text-mar-escuro/45">
                      Atualizada em {formatDate(activity.updatedAt)} · {activity.urgency.reason}
                    </div>
                    <button type="submit" className="btn-secondary text-sm">Salvar atividade</button>
                  </div>
                </form>
              </div>
            )) : (
              <div className="rounded-xl bg-mar-creme p-4 text-sm leading-relaxed text-mar-escuro/60 xl:col-span-2">
                Nenhuma atividade encontrada para o filtro atual.
              </div>
            )}
          </div>
        </section>

        <div className="mb-10 grid gap-6 xl:grid-cols-[0.95fr,1.05fr]">
          <section className="rounded-2xl border border-mar-areia/30 bg-white p-6">
            <div className="mb-5">
              <h2 className="font-serif text-2xl font-bold text-mar-escuro">Estudantes ativos</h2>
              <p className="mt-1 text-sm text-mar-escuro/55">Participantes da turma com atividade recente na plataforma.</p>
            </div>
            <div className="space-y-3">
              {data.recentStudents.length > 0 ? data.recentStudents.map((student) => (
                <div key={student.id} className="rounded-xl border border-mar-areia/30 p-4">
                  <h3 className="font-medium text-mar-escuro">{student.name}</h3>
                  <p className="mt-1 text-sm text-mar-escuro/55">{student.email}</p>
                  <p className="mt-2 text-xs uppercase tracking-wide text-mar-cobre/80">{student.profileType}</p>
                  <p className="mt-2 text-xs text-mar-escuro/45">Atividade recente em {formatDate(student.referenceDate)}</p>
                </div>
              )) : (
                <p className="text-sm text-mar-escuro/50">Nenhum estudante ativo encontrado para esta turma.</p>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-mar-areia/30 bg-white p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="font-serif text-2xl font-bold text-mar-escuro">Agenda da rede</h2>
                <p className="mt-1 text-sm text-mar-escuro/55">Eventos futuros da instituição relacionados a esta turma.</p>
              </div>
              <Link href="/agenda" className="inline-flex items-center gap-1 text-sm font-medium text-mar-azul">
                Ver agenda <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="space-y-3">
              {data.upcomingEventos.length > 0 ? data.upcomingEventos.map((evento) => (
                <Link key={evento.id} href={`/agenda/${evento.id}`} className="block rounded-xl border border-mar-areia/30 p-4 transition-colors hover:border-mar-azul/30">
                  <h3 className="font-medium text-mar-escuro">{evento.titulo}</h3>
                  <p className="mt-2 text-sm text-mar-escuro/55">{formatDate(evento.dataInicio)}</p>
                  {evento.categoria && <p className="mt-1 text-xs uppercase tracking-wide text-mar-cobre/80">{evento.categoria}</p>}
                  {evento.local && <p className="mt-1 text-sm text-mar-escuro/55">{evento.local}</p>}
                </Link>
              )) : (
                <p className="text-sm text-mar-escuro/50">Nenhum evento futuro vinculado à instituição desta turma.</p>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
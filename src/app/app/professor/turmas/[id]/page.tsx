import Link from "next/link";
import { revalidatePath } from "next/cache";
import { and, count, desc, eq, gte, inArray } from "drizzle-orm";
import { notFound } from "next/navigation";
import { requireProfessorAccess } from "@/lib/access";
import { CopyTextButton } from "@/components/ui/CopyTextButton";
import { db } from "@/lib/db";
import { buildMailtoLink, buildOperationalWhatsAppShareText, buildWhatsAppShareLink, joinShareLines } from "@/lib/gestor-sharing";
import { canAccessTurma, resolveEducationalAccess } from "@/lib/education-access";
import { acervo, atividadeAcervo, atividadesTurma, eventos, instituicoes, matriculasTurma, profiles, turmas, users } from "@/lib/schema";
import { formatDate } from "@/lib/utils";
import { AlertTriangle, ArrowLeft, ArrowRight, BookOpen, Calendar, Camera, ClipboardList, Mail, MessageSquareShare, School, ScrollText, Users } from "lucide-react";
import { z } from "zod";

const teacherCreateActivitySchema = z.object({
  turmaId: z.string().trim().min(1).max(36),
  titulo: z.string().trim().min(2).max(255),
  resumo: z.string().trim().min(10).max(2000),
  foco: z.string().trim().max(255).optional().or(z.literal("")),
  proximoPasso: z.string().trim().max(2000).optional().or(z.literal("")),
  status: z.enum(["planejada", "em_andamento", "concluida"]),
});

const teacherUpdateActivitySchema = z.object({
  activityId: z.string().trim().min(1).max(36),
  turmaId: z.string().trim().min(1).max(36),
  titulo: z.string().trim().min(2).max(255),
  resumo: z.string().trim().min(10).max(2000),
  foco: z.string().trim().max(255).optional().or(z.literal("")),
  status: z.enum(["planejada", "em_andamento", "concluida"]),
  proximoPasso: z.string().trim().max(2000).optional().or(z.literal("")),
});

const linkAcervoSchema = z.object({
  atividadeId: z.string().trim().min(1).max(36),
  acervoId:    z.string().trim().min(1).max(36),
  turmaId:     z.string().trim().min(1).max(36),
});

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
type UrgencyLevel = "alta" | "media" | "baixa";

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

function getDaysSince(date: Date) {
  const diff = Date.now() - date.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function getActivityUrgency(activity: {
  status: "planejada" | "em_andamento" | "concluida";
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

async function getTurmaPedagogicalData(turmaId: string, status: StatusFilter, source: SourceFilter, period: PeriodFilter) {
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

  const activities = activitiesBase.filter((activity) => {
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
  }).map((activity) => ({
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
    .slice(0, 3);

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

  const recentAcervo = await db
    .select({
      id: acervo.id,
      titulo: acervo.titulo,
      tipo: acervo.tipo,
      descricao: acervo.descricao,
      colecao: acervo.colecao,
      autor: acervo.autor,
      ano: acervo.ano,
    })
    .from(acervo)
    .where(eq(acervo.publicado, true))
    .orderBy(desc(acervo.createdAt))
    .limit(6);

  const activityIds = activitiesBase.map((a) => a.id);
  const linkedAcervoRows = activityIds.length > 0
    ? await db
        .select({
          atividadeId: atividadeAcervo.atividadeId,
          acervoId:    acervo.id,
          titulo:      acervo.titulo,
          tipo:        acervo.tipo,
          colecao:     acervo.colecao,
        })
        .from(atividadeAcervo)
        .innerJoin(acervo, eq(atividadeAcervo.acervoId, acervo.id))
        .where(inArray(atividadeAcervo.atividadeId, activityIds))
    : [];

  const linkedAcervoByActivity = linkedAcervoRows.reduce<
    Record<string, { acervoId: string; titulo: string; tipo: string; colecao: string | null }[]>
  >((acc, row) => {
    (acc[row.atividadeId] ??= []).push({ acervoId: row.acervoId, titulo: row.titulo, tipo: row.tipo, colecao: row.colecao });
    return acc;
  }, {});

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

  return {
    turma,
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
    recentAcervo,
    linkedAcervoByActivity,
  };
}

export default async function ProfessorTurmaDetailPage({
  params,
  searchParams,
}: {
  params: ParamsInput;
  searchParams: SearchParamsInput;
}) {
  const session = await requireProfessorAccess();
  const { id } = await params;
  const resolvedSearchParams = await searchParams;
  const status = resolveStatusFilter(resolvedSearchParams);
  const source = resolveSourceFilter(resolvedSearchParams);
  const period = resolvePeriodFilter(resolvedSearchParams);
  const data = await getTurmaPedagogicalData(id, status, source, period);

  if (!data) {
    notFound();
  }

  const scope = await resolveEducationalAccess(session);
  if (!canAccessTurma(scope, data.turma)) {
    notFound();
  }

  const topPriorityActivity = data.priorityActivities[0] ?? null;
  const nextEvent = data.upcomingEventos[0] ?? null;
  const turmaShortSummary = joinShareLines([
    `Síntese rápida da turma ${data.turma.nome}`,
    `Rede: ${data.turma.instituicaoNome}`,
    `Estado: ${data.studentsCount} estudante(s), ${data.activities.length} atividade(s) no recorte e ${data.urgencySummary.alta} prioridade(s) alta(s).`,
    topPriorityActivity
      ? `Foco agora: ${topPriorityActivity.titulo}${topPriorityActivity.proximoPasso ? ` · ${topPriorityActivity.proximoPasso}` : ""}`
      : "Foco agora: manter a cadência pedagógica da turma.",
    nextEvent
      ? `Próximo marco: ${nextEvent.titulo} em ${formatDate(nextEvent.dataInicio)}.`
      : "Próximo marco: ainda sem evento futuro da rede para esta turma.",
  ]);
  const turmaFullSummary = joinShareLines([
    `Resumo da turma ${data.turma.nome}`,
    `Gerado em ${formatDate(new Date())}`,
    "",
    `Instituição: ${data.turma.instituicaoNome}`,
    `Tipo institucional: ${data.turma.instituicaoTipo}`,
    `Estudantes ativos: ${data.studentsCount}`,
    `Atividades registradas: ${data.activitiesCount}`,
    `Atividades no recorte atual: ${data.activities.length}`,
    `Alta prioridade: ${data.urgencySummary.alta}`,
    `Atenção: ${data.urgencySummary.media}`,
    `Em ritmo adequado: ${data.urgencySummary.baixa}`,
    topPriorityActivity
      ? `Atividade em foco: ${topPriorityActivity.titulo}${topPriorityActivity.proximoPasso ? ` · Próximo passo: ${topPriorityActivity.proximoPasso}` : ""}`
      : "Atividade em foco: nenhuma atividade crítica no recorte atual.",
    nextEvent
      ? `Próximo evento da rede: ${nextEvent.titulo} em ${formatDate(nextEvent.dataInicio)}${nextEvent.local ? ` · ${nextEvent.local}` : ""}.`
      : "Próximo evento da rede: ainda sem oportunidade futura vinculada à instituição.",
  ]);
  const turmaWhatsAppMessage = buildOperationalWhatsAppShareText({
    heading: `Turma ${data.turma.nome}`,
    state: `${data.studentsCount} estudante(s), ${data.activities.length} atividade(s) no recorte, ${data.urgencySummary.alta} prioridade(s) alta(s).`,
    action: topPriorityActivity?.proximoPasso ?? "manter a cadência pedagógica da turma e revisar as atividades em aberto.",
    ctaPath: `/app/professor/turmas/${data.turma.id}`,
    checkpoint: nextEvent ? `${nextEvent.titulo} em ${formatDate(nextEvent.dataInicio)}.` : null,
  });
  const turmaMailtoHref = buildMailtoLink(null, `Resumo da turma ${data.turma.nome}`, turmaFullSummary);
  const turmaWhatsAppHref = buildWhatsAppShareLink(turmaWhatsAppMessage);

  async function createActivity(formData: FormData) {
    "use server";

    const session = await requireProfessorAccess();
    const parsed = teacherCreateActivitySchema.safeParse({
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

    await db.insert(atividadesTurma).values({
      id: crypto.randomUUID(),
      turmaId,
      createdBy: session.user.id,
      origemChave: `manual-${crypto.randomUUID()}`,
      titulo,
      resumo,
      foco: foco || null,
      proximoPasso: proximoPasso || null,
      status: status as "planejada" | "em_andamento" | "concluida",
      updatedAt: new Date(),
    });

    revalidatePath("/app/professor");
    revalidatePath(`/app/professor/turmas/${turmaId}`);
    revalidatePath("/app/estudante");
  }

  async function updateActivity(formData: FormData) {
    "use server";

    const session = await requireProfessorAccess();
    const parsed = teacherUpdateActivitySchema.safeParse({
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
  
    if (activity.turmaId !== turmaId) {
      return;
    }

    const scope = await resolveEducationalAccess(session);
    if (!canAccessTurma(scope, activity)) {
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

    revalidatePath("/app/professor");
    revalidatePath(`/app/professor/turmas/${turmaId}`);
    revalidatePath("/app/estudante");
  }

  async function linkAcervoToActivity(formData: FormData) {
    "use server";

    const session = await requireProfessorAccess();
    const parsed = linkAcervoSchema.safeParse({
      atividadeId: String(formData.get("atividadeId") ?? ""),
      acervoId:    String(formData.get("acervoId") ?? ""),
      turmaId:     String(formData.get("turmaId") ?? ""),
    });

    if (!parsed.success) return;

    const { atividadeId, acervoId, turmaId } = parsed.data;

    const [activity] = await db
      .select({ id: atividadesTurma.id, turmaId: atividadesTurma.turmaId, responsavelUserId: turmas.responsavelUserId, instituicaoId: turmas.instituicaoId })
      .from(atividadesTurma)
      .innerJoin(turmas, eq(atividadesTurma.turmaId, turmas.id))
      .where(and(eq(atividadesTurma.id, atividadeId), eq(atividadesTurma.turmaId, turmaId)))
      .limit(1);

    if (!activity) return;

    const scope = await resolveEducationalAccess(session);
    if (!canAccessTurma(scope, activity)) return;

    await db.insert(atividadeAcervo).values({
      id: crypto.randomUUID(),
      atividadeId,
      acervoId,
    }).onConflictDoNothing();

    revalidatePath(`/app/professor/turmas/${turmaId}`);
  }

  async function unlinkAcervoFromActivity(formData: FormData) {
    "use server";

    const session = await requireProfessorAccess();
    const parsed = linkAcervoSchema.safeParse({
      atividadeId: String(formData.get("atividadeId") ?? ""),
      acervoId:    String(formData.get("acervoId") ?? ""),
      turmaId:     String(formData.get("turmaId") ?? ""),
    });

    if (!parsed.success) return;

    const { atividadeId, acervoId, turmaId } = parsed.data;

    const [activity] = await db
      .select({ id: atividadesTurma.id, turmaId: atividadesTurma.turmaId, responsavelUserId: turmas.responsavelUserId, instituicaoId: turmas.instituicaoId })
      .from(atividadesTurma)
      .innerJoin(turmas, eq(atividadesTurma.turmaId, turmas.id))
      .where(and(eq(atividadesTurma.id, atividadeId), eq(atividadesTurma.turmaId, turmaId)))
      .limit(1);

    if (!activity) return;

    const scope = await resolveEducationalAccess(session);
    if (!canAccessTurma(scope, activity)) return;

    await db
      .delete(atividadeAcervo)
      .where(and(eq(atividadeAcervo.atividadeId, atividadeId), eq(atividadeAcervo.acervoId, acervoId)));

    revalidatePath(`/app/professor/turmas/${turmaId}`);
  }

  return (
    <div className="p-8 md:p-10">
      <div className="max-w-6xl">
        <div className="mb-8">
          <Link href="/app/professor" className="inline-flex items-center gap-2 text-sm font-medium text-mar-azul">
            <ArrowLeft className="w-4 h-4" />
            Voltar ao painel do professor
          </Link>
        </div>

        <div className="mb-10 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-sm uppercase tracking-wide text-mar-azul font-medium">
            <School className="w-4 h-4" />
            Central pedagógica da turma
          </div>
          <h1 className="font-serif text-4xl font-bold text-mar-escuro">{data.turma.nome}</h1>
          <p className="max-w-3xl leading-relaxed text-mar-escuro/60">
            Visão filtrável por turma para concentrar atividades registradas, estudantes ativos e agenda institucional relacionada.
          </p>
          <div className="flex flex-wrap gap-2 text-xs text-mar-escuro/45">
            <span className="badge bg-mar-azul/10 text-mar-azul">{data.turma.instituicaoNome}</span>
            <span className="badge bg-mar-cobre/10 text-mar-cobre">{data.turma.instituicaoTipo}</span>
            {(data.turma.cidade || data.turma.estado) && (
              <span className="badge bg-mar-verde/10 text-mar-verde">
                {data.turma.cidade}{data.turma.cidade && data.turma.estado ? "/" : ""}{data.turma.estado}
              </span>
            )}
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
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <div className="flex items-center gap-2 text-sm font-medium uppercase tracking-wide text-mar-cobre">
                <ScrollText className="h-4 w-4" />
                Resumo compartilhável
              </div>
              <h2 className="mt-2 font-serif text-2xl font-bold text-mar-escuro">Leitura curta da turma</h2>
              <p className="mt-2 text-sm leading-relaxed text-mar-escuro/60">
                Síntese rápida para alinhamento com coordenação, mediação pedagógica ou equipe da rede a partir desta turma.
              </p>
              <div className="mt-4 whitespace-pre-line rounded-xl bg-mar-creme p-4 text-sm leading-relaxed text-mar-escuro/70">
                {turmaShortSummary}
              </div>
            </div>

            <div className="flex flex-wrap gap-3 lg:max-w-sm lg:justify-end">
              <CopyTextButton
                text={turmaShortSummary}
                label="Copiar resumo"
                copiedLabel="Resumo copiado"
                className="inline-flex items-center gap-2 rounded-full border border-mar-cobre/25 bg-white px-4 py-2 text-sm font-medium text-mar-cobre transition-colors hover:border-mar-cobre/45"
              />
              <a
                href={turmaMailtoHref}
                className="inline-flex items-center gap-2 rounded-full border border-mar-areia/40 bg-white px-4 py-2 text-sm font-medium text-mar-azul transition-colors hover:border-mar-azul/30"
              >
                <Mail className="h-4 w-4" />
                Abrir e-mail
              </a>
              <a
                href={turmaWhatsAppHref}
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

        <section className="mb-10 rounded-2xl border border-mar-areia/30 bg-white p-6">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="font-serif text-2xl font-bold text-mar-escuro">Prioridades pedagógicas</h2>
              <p className="mt-1 text-sm text-mar-escuro/55">Sinalização de atividades que pedem retomada, próximo passo ou revisão no recorte atual.</p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-mar-cobre/10 px-4 py-2 text-xs font-medium uppercase tracking-wide text-mar-cobre">
              <AlertTriangle className="h-4 w-4" />
              {data.urgencySummary.alta} em alta prioridade
            </div>
          </div>

          <div className="mb-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-mar-areia/30 bg-mar-creme/60 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-mar-escuro/55">Alta prioridade</p>
              <p className="mt-2 font-serif text-3xl font-bold text-mar-escuro">{data.urgencySummary.alta}</p>
              <p className="mt-2 text-sm text-mar-escuro/55">Atividades com maior risco de perder tração pedagógica.</p>
            </div>
            <div className="rounded-xl border border-mar-areia/30 bg-mar-creme/60 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-mar-escuro/55">Atenção</p>
              <p className="mt-2 font-serif text-3xl font-bold text-mar-escuro">{data.urgencySummary.media}</p>
              <p className="mt-2 text-sm text-mar-escuro/55">Atividades que pedem acompanhamento breve.</p>
            </div>
            <div className="rounded-xl border border-mar-areia/30 bg-mar-creme/60 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-mar-escuro/55">Em ritmo adequado</p>
              <p className="mt-2 font-serif text-3xl font-bold text-mar-escuro">{data.urgencySummary.baixa}</p>
              <p className="mt-2 text-sm text-mar-escuro/55">Atividades concluídas ou atualizadas recentemente.</p>
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
                Nenhuma atividade crítica no recorte atual. A turma está com acompanhamento estável neste momento.
              </div>
            )}
          </div>
        </section>

        <section className="mb-10 rounded-2xl border border-mar-areia/30 bg-white p-6">
          <div className="mb-5">
            <h2 className="font-serif text-2xl font-bold text-mar-escuro">Nova atividade da turma</h2>
            <p className="mt-1 text-sm text-mar-escuro/55">Crie uma atividade manual para complementar os planos derivados e registrar mediações específicas da turma.</p>
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
                placeholder="Descreva a proposta da atividade, o contexto da turma e o objetivo da mediação."
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
                  placeholder="Ex.: combinar devolutiva, preparar visita, registrar síntese"
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
                    {getActivitySource(activity.origemChave) === "manual" ? "Autoria manual" : "Plano derivado"}
                  </span>
                  <span>Registrada em {formatDate(activity.createdAt)}</span>
                  {activity.createdByName && <span>por {activity.createdByName}</span>}
                </div>

                {(() => {
                  const linked = data.linkedAcervoByActivity[activity.id] ?? [];
                  const linkedIds = new Set(linked.map((r) => r.acervoId));
                  const available = data.recentAcervo.filter((r) => !linkedIds.has(r.id));
                  return (
                    <div className="mt-4 space-y-2">
                      {linked.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {linked.map((r) => (
                            <form key={r.acervoId} action={unlinkAcervoFromActivity} className="inline-flex">
                              <input type="hidden" name="atividadeId" value={activity.id} />
                              <input type="hidden" name="acervoId" value={r.acervoId} />
                              <input type="hidden" name="turmaId" value={data.turma.id} />
                              <button
                                type="submit"
                                className="inline-flex items-center gap-1.5 rounded-full border border-mar-azul/20 bg-mar-azul/5 px-3 py-1 text-xs font-medium text-mar-azul transition-colors hover:bg-rose-50 hover:border-rose-300 hover:text-rose-600"
                                title="Desvincular recurso"
                              >
                                <Camera className="w-3 h-3" />
                                {r.titulo}
                                <span className="ml-0.5 opacity-50">×</span>
                              </button>
                            </form>
                          ))}
                        </div>
                      )}
                      {available.length > 0 && (
                        <form action={linkAcervoToActivity} className="flex items-center gap-2">
                          <input type="hidden" name="atividadeId" value={activity.id} />
                          <input type="hidden" name="turmaId" value={data.turma.id} />
                          <select
                            name="acervoId"
                            className="flex-1 rounded-lg border border-mar-areia/40 bg-white px-3 py-1.5 text-xs text-mar-escuro outline-none focus:border-mar-azul/40"
                          >
                            <option value="">Vincular item do acervo…</option>
                            {available.map((r) => (
                              <option key={r.id} value={r.id}>{r.titulo}{r.colecao ? ` · ${r.colecao}` : ""}</option>
                            ))}
                          </select>
                          <button type="submit" className="btn-secondary text-xs py-1.5 px-3">Vincular</button>
                        </form>
                      )}
                    </div>
                  );
                })()}

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
                      Atualizada em {formatDate(activity.updatedAt)}
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

        <section className="mb-10 rounded-2xl border border-mar-areia/30 bg-white p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-medium uppercase tracking-wide text-mar-cobre">
                <Camera className="h-4 w-4" />
                Acervo do território
              </div>
              <h2 className="mt-2 font-serif text-2xl font-bold text-mar-escuro">Recursos pedagógicos</h2>
              <p className="mt-1 text-sm text-mar-escuro/55">
                Itens publicados no acervo que podem enriquecer atividades desta turma.
              </p>
            </div>
            <Link href="/acervo" className="inline-flex items-center gap-1 text-sm font-medium text-mar-azul">
              Ver acervo <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {data.recentAcervo.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {data.recentAcervo.map((item) => (
                <Link
                  key={item.id}
                  href={`/acervo/${item.id}`}
                  className="group rounded-xl border border-mar-areia/30 p-4 transition-colors hover:border-mar-azul/30"
                >
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-mar-cobre">
                    <Camera className="h-3.5 w-3.5" />
                    {item.tipo}
                    {item.colecao && <span className="text-mar-escuro/40">· {item.colecao}</span>}
                  </div>
                  <h3 className="mt-2 font-medium text-mar-escuro group-hover:text-mar-azul transition-colors">
                    {item.titulo}
                  </h3>
                  {item.descricao && (
                    <p className="mt-2 text-sm leading-relaxed text-mar-escuro/60 line-clamp-2">
                      {item.descricao}
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-mar-escuro/45">
                    {item.autor && <span>{item.autor}</span>}
                    {item.ano && <span>· {item.ano}</span>}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-mar-escuro/50">
              Nenhum item de acervo publicado ainda.{" "}
              <Link href="/admin/acervo/novo" className="text-mar-azul hover:underline">
                Adicionar ao acervo
              </Link>
            </p>
          )}
        </section>
      </div>
    </div>
  );
}

import { NextResponse } from "next/server";
import { and, eq, gte, inArray } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getAccessibleInstitutionIds } from "@/lib/institution-access";
import { buildOperationalWhatsAppShareText } from "@/lib/gestor-sharing";
import {
  getSecondaryJourneyTrackingOverview,
  getSecondaryJourneyTrackingStatusLabel,
  isSecondaryJourneyOrigin,
  isSecondaryJourneyTrackingStatus,
  secondaryJourneyOriginMeta,
} from "@/lib/secondary-journey-tracking";
import { acompanhamentosJornada, atividadesTurma, eventos, instituicoes, matriculasTurma, turmas, userInstituicoes, users } from "@/lib/schema";

const statusOptions = ["todas", "planejada", "em_andamento", "concluida"] as const;
const sourceOptions = ["todas", "manual", "derivada"] as const;
const periodOptions = ["7d", "30d", "90d", "365d", "tudo", "todos"] as const;

type StatusFilter = (typeof statusOptions)[number];
type SourceFilter = (typeof sourceOptions)[number];
type PeriodFilter = (typeof periodOptions)[number];
type UrgencyLevel = "alta" | "media" | "baixa";

function parseSingleSearchParam(value: string | null) {
  return value ?? null;
}

function resolveStatusFilter(value: string | null): StatusFilter {
  const raw = parseSingleSearchParam(value);
  return statusOptions.includes(raw as StatusFilter) ? (raw as StatusFilter) : "todas";
}

function resolveSourceFilter(value: string | null): SourceFilter {
  const raw = parseSingleSearchParam(value);
  return sourceOptions.includes(raw as SourceFilter) ? (raw as SourceFilter) : "todas";
}

function resolvePeriodFilter(value: string | null): PeriodFilter {
  const raw = parseSingleSearchParam(value);
  return periodOptions.includes(raw as PeriodFilter) ? (raw as PeriodFilter) : "30d";
}

function getPeriodStart(period: PeriodFilter) {
  if (period === "tudo" || period === "todos") {
    return null;
  }

  const days = period === "7d" ? 7 : period === "90d" ? 90 : period === "365d" ? 365 : 30;
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

function formatLongDate(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(date);
}

function describeCurrentRecorte(status: StatusFilter, source: SourceFilter, period: PeriodFilter) {
  const statusLabel = status === "todas" ? "todos os status" : status.replaceAll("_", " ");
  const sourceLabel = source === "todas" ? "todas as origens" : source;
  const periodLabel = period === "tudo" || period === "todos"
    ? "todo o histórico"
    : period === "365d"
      ? "últimos 12 meses"
      : `últimos ${period.replace("d", " dias")}`;
  return `${statusLabel}, ${sourceLabel}, ${periodLabel}`;
}

function resolveSecondaryJourneyOriginFilter(value: string | null) {
  const raw = parseSingleSearchParam(value);
  if (!raw || raw === "todas") {
    return null;
  }

  return isSecondaryJourneyOrigin(raw) ? raw : null;
}

function resolveSecondaryJourneyStatusFilter(value: string | null) {
  const raw = parseSingleSearchParam(value);
  if (!raw || raw === "todos") {
    return null;
  }

  return isSecondaryJourneyTrackingStatus(raw) ? raw : null;
}

function escapeCSV(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function row(fields: (string | number | null | undefined)[]): string {
  return fields.map(escapeCSV).join(",");
}

function plainTextResponse(content: string, fileName: string) {
  return new NextResponse(content, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}

export async function GET(request: Request) {
  const session = await auth();
  const roles = (session?.user as { roles?: string[] })?.roles ?? [];
  const isGestor = roles.includes("gestor") || roles.includes("gestor_educacional") || roles.includes("superadmin");
  const userId = session?.user?.id ?? "";
  const canViewAllInstitutions = roles.includes("superadmin");
  const url = new URL(request.url);
  const requestedInstitutionId = url.searchParams.get("instituicao");
  const requestedTurmaId = url.searchParams.get("turma");
  const requestedResponsibleId = url.searchParams.get("responsavel");
  const requestedFormat = url.searchParams.get("formato") ?? "csv";
  const status = resolveStatusFilter(url.searchParams.get("status"));
  const source = resolveSourceFilter(url.searchParams.get("source"));
  const period = resolvePeriodFilter(url.searchParams.get("period") ?? url.searchParams.get("periodo"));
  const secondaryJourneyOrigin = resolveSecondaryJourneyOriginFilter(url.searchParams.get("jornada"));
  const secondaryJourneyStatus = resolveSecondaryJourneyStatusFilter(url.searchParams.get("checkpointStatus"));

  if (!session || !isGestor) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const accessibleInstitutionIds = await getAccessibleInstitutionIds(userId, canViewAllInstitutions);

  const allInstituicoes = await db
    .select({ id: instituicoes.id, nome: instituicoes.nome, tipo: instituicoes.tipo })
    .from(instituicoes);
  const visibleInstituicoes = canViewAllInstitutions
    ? allInstituicoes
    : allInstituicoes.filter((institution) => accessibleInstitutionIds.includes(institution.id));
  const scopedInstituicoes = requestedInstitutionId
    ? visibleInstituicoes.filter((institution) => institution.id === requestedInstitutionId)
    : visibleInstituicoes;

  const allTurmas = await db
    .select({ id: turmas.id, nome: turmas.nome, anoLetivo: turmas.anoLetivo, instituicaoId: turmas.instituicaoId, responsavelUserId: turmas.responsavelUserId })
    .from(turmas);
  const visibleTurmas = canViewAllInstitutions
    ? allTurmas
    : allTurmas.filter((turma) => accessibleInstitutionIds.includes(turma.instituicaoId));
  const scopedTurmas = visibleTurmas.filter((turma) => {
    if (requestedInstitutionId && turma.instituicaoId !== requestedInstitutionId) {
      return false;
    }
    if (requestedTurmaId && turma.id !== requestedTurmaId) {
      return false;
    }
    if (requestedResponsibleId && turma.responsavelUserId !== requestedResponsibleId) {
      return false;
    }
    return true;
  });

  const turmaIds = scopedTurmas.map((t) => t.id);

  const [allMatriculas, allAtividades, allProfessores, activeUsers, institutionLinks] = await Promise.all([
    turmaIds.length > 0
      ? db
          .select({ userId: matriculasTurma.userId, turmaId: matriculasTurma.turmaId, status: matriculasTurma.status })
          .from(matriculasTurma)
          .where(inArray(matriculasTurma.turmaId, turmaIds))
      : Promise.resolve([]),
    turmaIds.length > 0
      ? db
          .select({
            turmaId: atividadesTurma.turmaId,
            titulo: atividadesTurma.titulo,
            status: atividadesTurma.status,
            origemChave: atividadesTurma.origemChave,
            updatedAt: atividadesTurma.updatedAt,
            proximoPasso: atividadesTurma.proximoPasso,
          })
          .from(atividadesTurma)
          .where(inArray(atividadesTurma.turmaId, turmaIds))
      : Promise.resolve([]),
    db.select({ id: users.id, name: users.name, email: users.email }).from(users),
    db.select({ id: users.id }).from(users).where(eq(users.status, "ativo")),
    db.select({ userId: userInstituicoes.userId, instituicaoId: userInstituicoes.instituicaoId })
      .from(userInstituicoes),
  ]);

  const matriculasByTurma = new Map<string, number>();
  for (const m of allMatriculas) {
    if (m.status === "ativo") {
      matriculasByTurma.set(m.turmaId, (matriculasByTurma.get(m.turmaId) ?? 0) + 1);
    }
  }

  type AtividadeCounts = { planejada: number; em_andamento: number; concluida: number };
  const atividadesByTurma = new Map<string, AtividadeCounts>();
  for (const a of allAtividades) {
    const cur = atividadesByTurma.get(a.turmaId) ?? { planejada: 0, em_andamento: 0, concluida: 0 };
    if (a.status === "planejada") cur.planejada++;
    else if (a.status === "em_andamento") cur.em_andamento++;
    else if (a.status === "concluida") cur.concluida++;
    atividadesByTurma.set(a.turmaId, cur);
  }

  const professorById = new Map(allProfessores.map((p) => [p.id, p]));
  const instituicaoById = new Map(scopedInstituicoes.map((i) => [i.id, i]));
  const scopeInstitutionIds = new Set(scopedTurmas.map((turma) => turma.instituicaoId));
  const scopeInstitutions = scopedInstituicoes.filter((institution) => scopeInstitutionIds.has(institution.id));

  const institutionIdsByUser = new Map<string, Set<string>>();
  for (const link of institutionLinks) {
    const current = institutionIdsByUser.get(link.userId) ?? new Set<string>();
    current.add(link.instituicaoId);
    institutionIdsByUser.set(link.userId, current);
  }

  const scopedJourneyInstitutionIds = requestedInstitutionId
    ? [requestedInstitutionId]
    : Array.from(new Set(scopedInstituicoes.map((institution) => institution.id)));
  const activeUserIds = activeUsers.map((user) => user.id);
  const scopedJourneyUserIds = (() => {
    const visible = activeUserIds.filter((userId) => {
      const userInstitutionIds = institutionIdsByUser.get(userId) ?? new Set<string>();
      return scopedJourneyInstitutionIds.some((institutionId) => userInstitutionIds.has(institutionId));
    });

    if (!requestedResponsibleId) {
      return visible;
    }

    const responsibleScopedUserIds = new Set<string>([
      requestedResponsibleId,
      ...allMatriculas.filter((matricula) => matricula.status === "ativo").map((matricula) => matricula.userId),
    ]);

    return visible.filter((userId) => responsibleScopedUserIds.has(userId));
  })();
  const periodStart = getPeriodStart(period);
  const secondaryJourneyOverview = await getSecondaryJourneyTrackingOverview({
    userIds: scopedJourneyUserIds,
    institutionIds: scopedJourneyInstitutionIds,
    updatedSince: periodStart,
    origin: secondaryJourneyOrigin,
    status: secondaryJourneyStatus,
  });
  const secondaryJourneyFilterLabels = [
    secondaryJourneyOrigin ? `jornada ${secondaryJourneyOriginMeta[secondaryJourneyOrigin].label}` : null,
    secondaryJourneyStatus ? `status ${getSecondaryJourneyTrackingStatusLabel(secondaryJourneyStatus)}` : null,
  ].filter((value): value is string => Boolean(value));
  const secondaryJourneyScopeLine = secondaryJourneyFilterLabels.length > 0
    ? `Jornadas secundárias no recorte: ${secondaryJourneyFilterLabels.join(" · ")}.`
    : null;
  const secondaryJourneyStateLine = secondaryJourneyOverview.total > 0 || secondaryJourneyScopeLine
    ? `Jornadas secundárias: ${secondaryJourneyOverview.total} checkpoint(s), ${secondaryJourneyOverview.statusSummary.em_andamento} em andamento, ${secondaryJourneyOverview.staleCount} sem atualização recente.`
    : null;
  const journeyTurmasByUser = new Map<string, Set<string>>();
  for (const matricula of allMatriculas) {
    if (matricula.status !== "ativo") {
      continue;
    }

    const current = journeyTurmasByUser.get(matricula.userId) ?? new Set<string>();
    current.add(matricula.turmaId);
    journeyTurmasByUser.set(matricula.userId, current);
  }

  const secondaryJourneyTrackingRows = scopedJourneyUserIds.length > 0
    ? await (async () => {
        const conditions = [inArray(acompanhamentosJornada.userId, scopedJourneyUserIds)];
        if (periodStart) {
          conditions.push(gte(acompanhamentosJornada.updatedAt, periodStart));
        }
        if (secondaryJourneyOrigin) {
          conditions.push(eq(acompanhamentosJornada.origem, secondaryJourneyOrigin));
        }
        if (secondaryJourneyStatus) {
          conditions.push(eq(acompanhamentosJornada.status, secondaryJourneyStatus));
        }

        return db
          .select({
            userId: acompanhamentosJornada.userId,
            status: acompanhamentosJornada.status,
          })
          .from(acompanhamentosJornada)
          .where(conditions.length === 1 ? conditions[0] : and(...conditions));
      })()
    : [];
  const secondaryJourneyCountsByTurma = new Map<string, {
    total: number;
    aberto: number;
    em_andamento: number;
    concluido: number;
  }>();

  for (const tracking of secondaryJourneyTrackingRows) {
    const turmaIdsForUser = journeyTurmasByUser.get(tracking.userId);
    if (!turmaIdsForUser) {
      continue;
    }

    for (const turmaId of turmaIdsForUser) {
      const current = secondaryJourneyCountsByTurma.get(turmaId) ?? {
        total: 0,
        aberto: 0,
        em_andamento: 0,
        concluido: 0,
      };

      current.total += 1;
      if (tracking.status === "aberto") {
        current.aberto += 1;
      } else if (tracking.status === "em_andamento") {
        current.em_andamento += 1;
      } else if (tracking.status === "concluido") {
        current.concluido += 1;
      }

      secondaryJourneyCountsByTurma.set(turmaId, current);
    }
  }

  if (requestedFormat === "resumo" || requestedFormat === "mensagem" || requestedFormat === "reuniao" || requestedFormat === "whatsapp") {
    const relevantActivities = allAtividades
      .filter((activity) => {
        if (requestedTurmaId && activity.turmaId !== requestedTurmaId) {
          return false;
        }

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

    if (requestedTurmaId) {
      const selectedTurma = scopedTurmas.find((turma) => turma.id === requestedTurmaId);
      if (!selectedTurma) {
        return NextResponse.json({ error: "Turma não encontrada no escopo do gestor." }, { status: 404 });
      }

      const institution = instituicaoById.get(selectedTurma.instituicaoId) ?? null;
      const professor = selectedTurma.responsavelUserId ? professorById.get(selectedTurma.responsavelUserId) ?? null : null;

      const statusSummary = {
        planejada: relevantActivities.filter((activity) => activity.status === "planejada").length,
        em_andamento: relevantActivities.filter((activity) => activity.status === "em_andamento").length,
        concluida: relevantActivities.filter((activity) => activity.status === "concluida").length,
      };

      const urgencySummary = {
        alta: relevantActivities.filter((activity) => activity.urgency.level === "alta").length,
        media: relevantActivities.filter((activity) => activity.urgency.level === "media").length,
        baixa: relevantActivities.filter((activity) => activity.urgency.level === "baixa").length,
      };

      const missingNextStepCount = relevantActivities.filter((activity) => !activity.proximoPasso?.trim() && activity.status !== "concluida").length;
      const activeStudents = matriculasByTurma.get(selectedTurma.id) ?? 0;
      const priorityActivities = relevantActivities
        .filter((activity) => activity.urgency.level !== "baixa")
        .sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime())
        .slice(0, 4);

      const upcomingEvents = await db
        .select({
          id: eventos.id,
          titulo: eventos.titulo,
          dataInicio: eventos.dataInicio,
          local: eventos.local,
        })
        .from(eventos)
        .where(and(eq(eventos.publicado, true), eq(eventos.instituicaoId, selectedTurma.instituicaoId), gte(eventos.dataInicio, new Date())));

      const sortedUpcomingEvents = [...upcomingEvents]
        .sort((left, right) => left.dataInicio.getTime() - right.dataInicio.getTime())
        .slice(0, 3);

      const recommendation = !professor
        ? "Definir um responsável pedagógico explícito para dar cadência ao acompanhamento da turma."
        : urgencySummary.alta > 0
          ? `Acionar ${professor.name ?? "o responsável da turma"} para alinhar retomada das atividades críticas e registrar próximos passos.`
          : sortedUpcomingEvents.length === 0
            ? `Combinar com ${professor.name ?? "o responsável da turma"} o próximo marco institucional para manter a turma em movimento.`
            : `Manter acompanhamento quinzenal com ${professor.name ?? "o responsável da turma"} e conectar a turma aos próximos marcos da rede.`;

      if (requestedFormat === "mensagem") {
        const priorityPath = `/app/gestor/turmas/${selectedTurma.id}`;
        const lines = [
          `Síntese rápida da turma ${selectedTurma.nome}`,
          `Instituição: ${institution?.nome ?? "—"}`,
          `Recorte: ${describeCurrentRecorte(status, source, period)}`,
          "Estado do produto: operação publicada e coordenação pedagógica por turma em aprofundamento.",
          secondaryJourneyScopeLine,
          secondaryJourneyStateLine,
          `Estado: ${activeStudents} estudantes ativos, ${urgencySummary.alta} atividade(s) crítica(s) e ${statusSummary.em_andamento} em andamento.`,
          `Ação: ${recommendation}`,
          `Turma prioritária do recorte: ${selectedTurma.nome}.`,
          priorityActivities[0]
            ? `Ponto imediato: ${priorityActivities[0].titulo} (${priorityActivities[0].urgency.reason}).`
            : "Ponto imediato: sem atividade crítica no recorte atual.",
          `Abrir turma prioritária: ${priorityPath}`,
          sortedUpcomingEvents[0]
            ? `Próximo marco: ${sortedUpcomingEvents[0].titulo} em ${formatLongDate(sortedUpcomingEvents[0].dataInicio)}.`
            : "Próximo marco: ainda sem evento futuro da rede para esta instituição.",
        ].filter((line): line is string => Boolean(line));

        return plainTextResponse(lines.join("\n"), `mensagem-turma-${selectedTurma.id}.txt`);
      }

      if (requestedFormat === "whatsapp") {
        const priorityPath = `/app/gestor/turmas/${selectedTurma.id}`;
        const text = buildOperationalWhatsAppShareText({
          heading: `Turma ${selectedTurma.nome} · ${institution?.nome ?? "—"}`,
          state: `${activeStudents} estudante(s), ${urgencySummary.alta} crítica(s), ${statusSummary.em_andamento} em andamento.${secondaryJourneyStateLine ? ` ${secondaryJourneyStateLine}` : ""}`,
          action: recommendation,
          ctaPath: priorityPath,
          checkpoint: sortedUpcomingEvents[0]
            ? `${sortedUpcomingEvents[0].titulo} em ${formatLongDate(sortedUpcomingEvents[0].dataInicio)}.`
            : null,
        });

        return plainTextResponse(text, `whatsapp-turma-${selectedTurma.id}.txt`);
      }

      if (requestedFormat === "reuniao") {
        const priorityPath = `/app/gestor/turmas/${selectedTurma.id}`;
        const lines = [
          `Resumo para reunião da turma ${selectedTurma.nome}`,
          `Gerado em ${formatLongDate(new Date())}`,
          "",
          "Contexto executivo:",
          "- O site já opera publicamente e este detalhe de turma passou a sustentar a coordenação pedagógica mais concreta da rede.",
          "- O objetivo desta rodada é transformar urgência, agenda e responsabilidade em próximo passo pactuado.",
          "",
          ...(secondaryJourneyScopeLine ? [secondaryJourneyScopeLine] : []),
          ...(secondaryJourneyStateLine ? [secondaryJourneyStateLine, ""] : []),
          "Decisões sugeridas:",
          `- ${recommendation}`,
          priorityActivities[0]
            ? `- Priorizar imediatamente a atividade ${priorityActivities[0].titulo.toLowerCase()}.`
            : "- Manter a cadência atual de acompanhamento da turma.",
          "",
          "Pendências:",
          missingNextStepCount > 0
            ? `- ${missingNextStepCount} atividade(s) seguem sem próximo passo definido.`
            : "- Não há pendências críticas de próximo passo no recorte atual.",
          priorityActivities[1]
            ? `- Revisar também ${priorityActivities[1].titulo.toLowerCase()} na mesma reunião.`
            : "- Sem segunda pendência crítica explícita neste recorte.",
          "",
          "Próximo checkpoint:",
          sortedUpcomingEvents[0]
            ? `- ${sortedUpcomingEvents[0].titulo} em ${formatLongDate(sortedUpcomingEvents[0].dataInicio)}.`
            : "- Definir um próximo marco institucional para a turma.",
          `- Abrir turma prioritária em ${priorityPath}.`,
        ];

        return plainTextResponse(lines.join("\n"), `reuniao-turma-${selectedTurma.id}.txt`);
      }

      const lines = [
        `Abrir turma prioritária: /app/gestor/turmas/${selectedTurma.id}`,
        `Resumo executivo da turma ${selectedTurma.nome}`,
        `Gerado em ${formatLongDate(new Date())}`,
        "",
        "Estado do produto: operação publicada, jornadas estabilizadas e coordenação pedagógica por turma em aprofundamento.",
        `Instituição: ${institution?.nome ?? "—"}${institution?.tipo ? ` (${institution.tipo})` : ""}`,
        `Ano letivo: ${selectedTurma.anoLetivo ?? "—"}`,
        `Responsável pedagógico: ${professor?.name ?? "não definido"}${professor?.email ? ` <${professor.email}>` : ""}`,
        `Recorte aplicado: ${describeCurrentRecorte(status, source, period)}`,
        ...(secondaryJourneyScopeLine ? [secondaryJourneyScopeLine] : []),
        ...(secondaryJourneyStateLine ? [secondaryJourneyStateLine] : []),
        `Turma prioritária do recorte: ${selectedTurma.nome}.`,
        "",
        `Estado atual: ${activeStudents} estudante(s) ativo(s), ${relevantActivities.length} atividade(s) no recorte, ${urgencySummary.alta} em alta prioridade e ${statusSummary.em_andamento} em andamento.`,
        `Ação recomendada: ${recommendation}`,
        missingNextStepCount > 0
          ? `Próximo cuidado: ${missingNextStepCount} atividade(s) seguem sem próximo passo definido.`
          : "Próximo cuidado: todas as atividades abertas no recorte já têm próximo passo registrado.",
        sortedUpcomingEvents.length > 0
          ? `Agenda da rede: próximo marco em ${formatLongDate(sortedUpcomingEvents[0].dataInicio)} (${sortedUpcomingEvents[0].titulo}).`
          : "Agenda da rede: não há eventos futuros vinculados à instituição no momento.",
      ];

      if (priorityActivities.length > 0) {
        lines.push("", "Prioridades imediatas:");
        for (const activity of priorityActivities) {
          lines.push(
            `- ${activity.titulo}: ${activity.urgency.reason} (atualizada em ${formatLongDate(activity.updatedAt)})${activity.proximoPasso ? ` | Próximo passo: ${activity.proximoPasso}` : ""}`,
          );
        }
      }

      if (sortedUpcomingEvents.length > 0) {
        lines.push("", "Agenda institucional:");
        for (const event of sortedUpcomingEvents) {
          lines.push(`- ${event.titulo} em ${formatLongDate(event.dataInicio)}${event.local ? ` | ${event.local}` : ""}`);
        }
      }

      return plainTextResponse(lines.join("\n"), `resumo-executivo-turma-${selectedTurma.id}.txt`);
    }

    if (!requestedInstitutionId) {
      const activeStudents = scopedTurmas.reduce((total, turma) => total + (matriculasByTurma.get(turma.id) ?? 0), 0);
      const urgencySummary = {
        alta: relevantActivities.filter((activity) => activity.urgency.level === "alta").length,
        media: relevantActivities.filter((activity) => activity.urgency.level === "media").length,
        baixa: relevantActivities.filter((activity) => activity.urgency.level === "baixa").length,
      };
      const priorityTurma = scopedTurmas
        .map((turma) => {
          const turmaActivities = relevantActivities.filter((activity) => activity.turmaId === turma.id);
          return {
            id: turma.id,
            nome: turma.nome,
            instituicaoNome: instituicaoById.get(turma.instituicaoId)?.nome ?? "Instituição vinculada",
            highPriority: turmaActivities.filter((activity) => activity.urgency.level === "alta").length,
            attention: turmaActivities.filter((activity) => activity.urgency.level === "media").length,
            stale: turmaActivities.filter((activity) => getDaysSince(activity.updatedAt) > 30 && activity.status !== "concluida").length,
            activeStudents: matriculasByTurma.get(turma.id) ?? 0,
          };
        })
        .sort((left, right) => {
          if (right.highPriority !== left.highPriority) return right.highPriority - left.highPriority;
          if (right.stale !== left.stale) return right.stale - left.stale;
          if (right.attention !== left.attention) return right.attention - left.attention;
          return right.activeStudents - left.activeStudents;
        })[0] ?? null;
      const responsibleLoad = new Map<string, { turmas: number; highPriority: number; stale: number }>();
      for (const turma of scopedTurmas) {
        if (!turma.responsavelUserId) {
          continue;
        }
        const turmaActivities = relevantActivities.filter((activity) => activity.turmaId === turma.id);
        const current = responsibleLoad.get(turma.responsavelUserId) ?? { turmas: 0, highPriority: 0, stale: 0 };
        current.turmas += 1;
        current.highPriority += turmaActivities.filter((activity) => activity.urgency.level === "alta").length;
        current.stale += turmaActivities.filter((activity) => getDaysSince(activity.updatedAt) > 30 && activity.status !== "concluida").length;
        responsibleLoad.set(turma.responsavelUserId, current);
      }
      const priorityResponsible = requestedResponsibleId
        ? {
            name: professorById.get(requestedResponsibleId)?.name ?? "Responsável pedagógico",
            email: professorById.get(requestedResponsibleId)?.email ?? "",
            ...(responsibleLoad.get(requestedResponsibleId) ?? { turmas: 0, highPriority: 0, stale: 0 }),
          }
        : Array.from(responsibleLoad.entries())
            .map(([userId, stats]) => ({
              name: professorById.get(userId)?.name ?? "Responsável pedagógico",
              email: professorById.get(userId)?.email ?? "",
              ...stats,
            }))
            .sort((left, right) => {
              if (right.highPriority !== left.highPriority) return right.highPriority - left.highPriority;
              return right.stale - left.stale;
            })[0] ?? null;
      const upcomingEvents = scopeInstitutionIds.size > 0
        ? await db
            .select({
              id: eventos.id,
              titulo: eventos.titulo,
              dataInicio: eventos.dataInicio,
              local: eventos.local,
              instituicaoId: eventos.instituicaoId,
            })
            .from(eventos)
            .where(and(eq(eventos.publicado, true), inArray(eventos.instituicaoId, Array.from(scopeInstitutionIds)), gte(eventos.dataInicio, new Date())))
        : [];
      const sortedUpcomingEvents = [...upcomingEvents]
        .sort((left, right) => left.dataInicio.getTime() - right.dataInicio.getTime())
        .slice(0, 3);
      const recommendation = !priorityResponsible
        ? "Definir um responsável pedagógico explícito e pactuar um recorte mínimo de acompanhamento para a rede visível."
        : priorityResponsible.highPriority > 0
          ? `Acionar ${priorityResponsible.name} para destravar as turmas mais críticas do recorte atual e registrar próximos passos.`
          : sortedUpcomingEvents.length > 0
            ? `Usar ${sortedUpcomingEvents[0].titulo} como próximo checkpoint para alinhar o recorte com ${priorityResponsible.name}.`
            : `Manter acompanhamento gerencial com ${priorityResponsible.name} e revisar semanalmente as turmas em maior atenção.`;
      const scopeLabel = requestedResponsibleId
        ? `responsável ${priorityResponsible?.name ?? "selecionado"}${scopeInstitutions.length === 1 ? ` em ${scopeInstitutions[0]?.nome ?? "instituição vinculada"}` : ""}`
        : requestedInstitutionId
          ? `instituição ${scopeInstitutions[0]?.nome ?? "selecionada"}`
          : scopeInstitutions.length > 0
            ? `${scopeInstitutions.length} instituição(ões) visíveis`
            : "recorte atual do painel";

      if (requestedFormat === "mensagem") {
        const priorityPath = priorityTurma ? `/app/gestor/turmas/${priorityTurma.id}` : null;
        const lines = [
          `Síntese rápida do painel do gestor`,
          `Escopo: ${scopeLabel}`,
          `Estado do produto: operação publicada e aprofundamento educacional em curso.`,
          `Recorte: ${describeCurrentRecorte(status, source, period)}`,
          secondaryJourneyScopeLine,
          secondaryJourneyStateLine,
          `Estado: ${scopedTurmas.length} turmas, ${activeStudents} estudantes ativos e ${urgencySummary.alta} atividade(s) crítica(s).`,
          `Ação: ${recommendation}`,
          priorityTurma
            ? `Turma prioritária: ${priorityTurma.nome} (${priorityTurma.instituicaoNome}) com ${priorityTurma.highPriority} crítica(s) e ${priorityTurma.stale} parada(s).`
            : "Turma prioritária: nenhuma turma crítica no recorte atual.",
          priorityPath ? `Abrir turma prioritária: ${priorityPath}` : "Abrir turma prioritária: não aplicável no recorte atual.",
          sortedUpcomingEvents[0]
            ? `Próximo marco: ${sortedUpcomingEvents[0].titulo} em ${formatLongDate(sortedUpcomingEvents[0].dataInicio)}.`
            : "Próximo marco: ainda sem evento futuro para o recorte atual.",
        ].filter((line): line is string => Boolean(line));

        return plainTextResponse(lines.join("\n"), `mensagem-painel-gestor-${new Date().toISOString().slice(0, 10)}.txt`);
      }

      if (requestedFormat === "whatsapp") {
        const priorityPath = priorityTurma ? `/app/gestor/turmas/${priorityTurma.id}` : null;
        const text = buildOperationalWhatsAppShareText({
          heading: `Painel do gestor · ${scopeLabel}`,
          state: `${urgencySummary.alta} crítica(s), ${scopedTurmas.length} turma(s), ${activeStudents} estudante(s).${secondaryJourneyStateLine ? ` ${secondaryJourneyStateLine}` : ""}`,
          action: recommendation,
          ctaPath: priorityPath,
          checkpoint: sortedUpcomingEvents[0]
            ? `${sortedUpcomingEvents[0].titulo} em ${formatLongDate(sortedUpcomingEvents[0].dataInicio)}.`
            : null,
        });

        return plainTextResponse(text, `whatsapp-painel-gestor-${new Date().toISOString().slice(0, 10)}.txt`);
      }

      if (requestedFormat === "reuniao") {
        const priorityPath = priorityTurma ? `/app/gestor/turmas/${priorityTurma.id}` : null;
        const lines = [
          "Resumo para reunião do painel do gestor",
          `Gerado em ${formatLongDate(new Date())}`,
          "",
          "Contexto executivo:",
          "- O site já opera no domínio público com base técnica estabilizada e jornadas autenticadas validadas.",
          "- O foco atual está em coordenação pedagógica, consistência institucional e fechamento de pendências externas.",
          "",
          ...(secondaryJourneyScopeLine ? [secondaryJourneyScopeLine] : []),
          ...(secondaryJourneyStateLine ? [secondaryJourneyStateLine, ""] : []),
          "Decisões sugeridas:",
          `- ${recommendation}`,
          priorityTurma
            ? `- Abrir a turma ${priorityTurma.nome} para encaminhamento imediato.`
            : "- Manter o recorte atual em observação até nova evidência de criticidade.",
          "",
          "Pendências:",
          priorityTurma
            ? `- A turma ${priorityTurma.nome} concentra ${priorityTurma.highPriority} atividade(s) crítica(s) e ${priorityTurma.stale} parada(s).`
            : "- Não há turma crítica explícita neste recorte.",
          priorityResponsible
            ? `- Alinhar responsabilidades com ${priorityResponsible.name}.`
            : "- Definir um responsável focal para o recorte atual.",
          "",
          "Próximo checkpoint:",
          sortedUpcomingEvents[0]
            ? `- ${sortedUpcomingEvents[0].titulo} em ${formatLongDate(sortedUpcomingEvents[0].dataInicio)}.`
            : "- Definir um checkpoint gerencial para revisar o recorte atual.",
          priorityPath ? `- Abrir turma prioritária em ${priorityPath}.` : "- Sem turma prioritária explícita para abrir neste recorte.",
        ];

        return plainTextResponse(lines.join("\n"), `reuniao-painel-gestor-${new Date().toISOString().slice(0, 10)}.txt`);
      }

      const lines = [
        priorityTurma ? `Abrir turma prioritária: /app/gestor/turmas/${priorityTurma.id}` : "Abrir turma prioritária: não aplicável no recorte atual.",
        `Resumo executivo do painel do gestor`,
        `Gerado em ${formatLongDate(new Date())}`,
        "",
        "Estado do produto: operação publicada, jornadas autenticadas estabilizadas e aprofundamento educacional em curso.",
        `Escopo: ${scopeLabel}`,
        `Recorte aplicado: ${describeCurrentRecorte(status, source, period)}`,
        ...(secondaryJourneyScopeLine ? [secondaryJourneyScopeLine] : []),
        ...(secondaryJourneyStateLine ? [secondaryJourneyStateLine] : []),
        `Instituições no recorte: ${scopeInstitutions.length}`,
        `Turmas no recorte: ${scopedTurmas.length}`,
        `Estudantes ativos no conjunto: ${activeStudents}`,
        priorityTurma
          ? `Turma prioritária: ${priorityTurma.nome} (${priorityTurma.instituicaoNome}) com ${priorityTurma.highPriority} crítica(s), ${priorityTurma.attention} em atenção e ${priorityTurma.stale} parada(s).`
          : "Turma prioritária: nenhuma turma crítica no recorte atual.",
        "",
        `Estado atual: ${relevantActivities.length} atividade(s) consideradas, ${urgencySummary.alta} em alta prioridade, ${urgencySummary.media} em atenção e ${urgencySummary.baixa} em ritmo adequado.`,
        `Ação recomendada: ${recommendation}`,
        priorityResponsible
          ? `Responsável em foco: ${priorityResponsible.name}${priorityResponsible.email ? ` <${priorityResponsible.email}>` : ""} acompanha ${priorityResponsible.turmas} turma(s) com ${priorityResponsible.highPriority} atividade(s) crítica(s).`
          : "Responsável em foco: ainda não há um responsável claramente dominante neste recorte.",
        sortedUpcomingEvents.length > 0
          ? `Agenda da rede: próximo marco em ${formatLongDate(sortedUpcomingEvents[0].dataInicio)} (${sortedUpcomingEvents[0].titulo}).`
          : "Agenda da rede: não há eventos futuros vinculados ao recorte atual.",
      ];

      if (scopeInstitutions.length > 0) {
        lines.push("", "Instituições no recorte:");
        for (const institution of scopeInstitutions.slice(0, 6)) {
          lines.push(`- ${institution.nome}${institution.tipo ? ` (${institution.tipo})` : ""}`);
        }
      }

      return plainTextResponse(lines.join("\n"), `resumo-painel-gestor-${new Date().toISOString().slice(0, 10)}.txt`);
    }

    const selectedInstitution = scopedInstituicoes.find((institution) => institution.id === requestedInstitutionId);
    if (!selectedInstitution) {
      return NextResponse.json({ error: "Instituição não encontrada no escopo do gestor." }, { status: 404 });
    }

    const institutionTurmas = scopedTurmas.filter((turma) => turma.instituicaoId === requestedInstitutionId);
    const institutionTurmaIds = new Set(institutionTurmas.map((turma) => turma.id));
    const activeStudents = institutionTurmas.reduce((total, turma) => total + (matriculasByTurma.get(turma.id) ?? 0), 0);
    const urgencySummary = {
      alta: relevantActivities.filter((activity) => activity.urgency.level === "alta" && institutionTurmaIds.has(activity.turmaId)).length,
      media: relevantActivities.filter((activity) => activity.urgency.level === "media" && institutionTurmaIds.has(activity.turmaId)).length,
      baixa: relevantActivities.filter((activity) => activity.urgency.level === "baixa" && institutionTurmaIds.has(activity.turmaId)).length,
    };
    const missingNextStepCount = relevantActivities.filter((activity) => institutionTurmaIds.has(activity.turmaId) && !activity.proximoPasso?.trim() && activity.status !== "concluida").length;
    const priorityTurmas = institutionTurmas
      .map((turma) => {
        const turmaActivities = relevantActivities.filter((activity) => activity.turmaId === turma.id);
        const highPriority = turmaActivities.filter((activity) => activity.urgency.level === "alta").length;
        const attention = turmaActivities.filter((activity) => activity.urgency.level === "media").length;
        const stale = turmaActivities.filter((activity) => getDaysSince(activity.updatedAt) > 30 && activity.status !== "concluida").length;
        const professor = turma.responsavelUserId ? professorById.get(turma.responsavelUserId) ?? null : null;

        return {
          id: turma.id,
          nome: turma.nome,
          professor: professor?.name ?? "Responsável não definido",
          highPriority,
          attention,
          stale,
          activeStudents: matriculasByTurma.get(turma.id) ?? 0,
        };
      })
      .sort((left, right) => {
        if (right.highPriority !== left.highPriority) {
          return right.highPriority - left.highPriority;
        }
        if (right.stale !== left.stale) {
          return right.stale - left.stale;
        }
        return right.activeStudents - left.activeStudents;
      })
      .slice(0, 4);
    const responsibleLoad = new Map<string, { turmas: number; highPriority: number; stale: number }>();
    for (const turma of institutionTurmas) {
      if (!turma.responsavelUserId) {
        continue;
      }
      const turmaActivities = relevantActivities.filter((activity) => activity.turmaId === turma.id);
      const current = responsibleLoad.get(turma.responsavelUserId) ?? { turmas: 0, highPriority: 0, stale: 0 };
      current.turmas += 1;
      current.highPriority += turmaActivities.filter((activity) => activity.urgency.level === "alta").length;
      current.stale += turmaActivities.filter((activity) => getDaysSince(activity.updatedAt) > 30 && activity.status !== "concluida").length;
      responsibleLoad.set(turma.responsavelUserId, current);
    }
    const priorityResponsible = Array.from(responsibleLoad.entries())
      .map(([userId, stats]) => ({
        name: professorById.get(userId)?.name ?? "Responsável pedagógico",
        email: professorById.get(userId)?.email ?? "",
        ...stats,
      }))
      .sort((left, right) => {
        if (right.highPriority !== left.highPriority) {
          return right.highPriority - left.highPriority;
        }
        return right.stale - left.stale;
      })[0] ?? null;
    const upcomingEvents = await db
      .select({
        id: eventos.id,
        titulo: eventos.titulo,
        dataInicio: eventos.dataInicio,
        local: eventos.local,
      })
      .from(eventos)
      .where(and(eq(eventos.publicado, true), eq(eventos.instituicaoId, requestedInstitutionId), gte(eventos.dataInicio, new Date())));
    const sortedUpcomingEvents = [...upcomingEvents]
      .sort((left, right) => left.dataInicio.getTime() - right.dataInicio.getTime())
      .slice(0, 3);
    const recommendation = !priorityResponsible
      ? "Definir responsáveis pedagógicos explícitos por turma e pactuar uma cadência mínima de acompanhamento institucional."
      : priorityResponsible.highPriority > 0
        ? `Acionar ${priorityResponsible.name} para destravar as turmas mais críticas desta instituição e registrar próximos passos em comum.`
        : sortedUpcomingEvents.length > 0
          ? `Usar ${sortedUpcomingEvents[0].titulo} como próximo checkpoint institucional para alinhar as turmas com ${priorityResponsible.name}.`
          : `Manter acompanhamento institucional com ${priorityResponsible.name} e revisar semanalmente as turmas em maior atenção.`;

    if (requestedFormat === "mensagem") {
      const priorityPath = priorityTurmas[0] ? `/app/gestor/turmas/${priorityTurmas[0].id}` : null;
      const lines = [
        `Síntese rápida da instituição ${selectedInstitution.nome}`,
        `Estado do produto: operação publicada, leitura institucional ativa e coordenação pedagógica em aprofundamento.`,
        `Recorte: ${describeCurrentRecorte(status, source, period)}`,
        secondaryJourneyScopeLine,
        secondaryJourneyStateLine,
        `Estado: ${institutionTurmas.length} turmas, ${activeStudents} estudantes ativos e ${urgencySummary.alta} atividade(s) crítica(s).`,
        `Ação: ${recommendation}`,
        priorityTurmas[0]
          ? `Turma prioritária: ${priorityTurmas[0].nome} (${priorityTurmas[0].highPriority} crítica(s), ${priorityTurmas[0].stale} parada(s)).`
          : "Turma prioritária: nenhuma turma crítica no recorte atual.",
        priorityPath ? `Abrir turma prioritária: ${priorityPath}` : "Abrir turma prioritária: não aplicável no recorte atual.",
        sortedUpcomingEvents[0]
          ? `Próximo marco: ${sortedUpcomingEvents[0].titulo} em ${formatLongDate(sortedUpcomingEvents[0].dataInicio)}.`
          : "Próximo marco: ainda sem evento futuro da rede para esta instituição.",
      ].filter((line): line is string => Boolean(line));

      return plainTextResponse(lines.join("\n"), `mensagem-instituicao-${requestedInstitutionId}.txt`);
    }

    if (requestedFormat === "whatsapp") {
      const priorityPath = priorityTurmas[0] ? `/app/gestor/turmas/${priorityTurmas[0].id}` : null;
      const text = buildOperationalWhatsAppShareText({
        heading: `Instituição ${selectedInstitution.nome}`,
        state: `${institutionTurmas.length} turma(s), ${urgencySummary.alta} crítica(s), ${activeStudents} estudante(s) ativos.${secondaryJourneyStateLine ? ` ${secondaryJourneyStateLine}` : ""}`,
        action: recommendation,
        ctaPath: priorityPath,
        checkpoint: sortedUpcomingEvents[0]
          ? `${sortedUpcomingEvents[0].titulo} em ${formatLongDate(sortedUpcomingEvents[0].dataInicio)}.`
          : null,
      });

      return plainTextResponse(text, `whatsapp-instituicao-${requestedInstitutionId}.txt`);
    }

    if (requestedFormat === "reuniao") {
      const priorityPath = priorityTurmas[0] ? `/app/gestor/turmas/${priorityTurmas[0].id}` : null;
      const lines = [
        `Resumo para reunião da instituição ${selectedInstitution.nome}`,
        `Gerado em ${formatLongDate(new Date())}`,
        "",
        "Contexto executivo:",
        "- O site já opera publicamente e a coordenação institucional agora se conecta melhor à leitura pedagógica das turmas.",
        "- O objetivo desta rodada é transformar o recorte institucional em ação educativa e checkpoint de rede.",
        "",
        ...(secondaryJourneyScopeLine ? [secondaryJourneyScopeLine] : []),
        ...(secondaryJourneyStateLine ? [secondaryJourneyStateLine, ""] : []),
        "Decisões sugeridas:",
        `- ${recommendation}`,
        priorityTurmas[0]
          ? `- Abrir a turma ${priorityTurmas[0].nome} como prioridade institucional.`
          : "- Manter a leitura institucional atual sem escalonamento imediato.",
        "",
        "Pendências:",
        missingNextStepCount > 0
          ? `- ${missingNextStepCount} atividade(s) seguem sem próximo passo explícito no recorte.`
          : "- Não há pendências críticas de próximo passo no recorte institucional.",
        priorityResponsible
          ? `- Confirmar encaminhamentos com ${priorityResponsible.name}.`
          : "- Definir responsável pedagógico focal para a instituição.",
        "",
        "Próximo checkpoint:",
        sortedUpcomingEvents[0]
          ? `- ${sortedUpcomingEvents[0].titulo} em ${formatLongDate(sortedUpcomingEvents[0].dataInicio)}.`
          : "- Definir uma próxima janela institucional de acompanhamento.",
        priorityPath ? `- Abrir turma prioritária em ${priorityPath}.` : "- Sem turma prioritária explícita para abrir neste recorte.",
      ];

      return plainTextResponse(lines.join("\n"), `reuniao-instituicao-${requestedInstitutionId}.txt`);
    }

    const lines = [
      priorityTurmas[0] ? `Abrir turma prioritária: /app/gestor/turmas/${priorityTurmas[0].id}` : "Abrir turma prioritária: não aplicável no recorte atual.",
      `Resumo executivo da instituição ${selectedInstitution.nome}`,
      `Gerado em ${formatLongDate(new Date())}`,
      "",
      "Estado do produto: operação publicada, jornadas estabilizadas e coordenação pedagógica em aprofundamento.",
      `Tipo: ${selectedInstitution.tipo ?? "—"}`,
      `Recorte aplicado: ${describeCurrentRecorte(status, source, period)}`,
      ...(secondaryJourneyScopeLine ? [secondaryJourneyScopeLine] : []),
      ...(secondaryJourneyStateLine ? [secondaryJourneyStateLine] : []),
      `Turmas no recorte: ${institutionTurmas.length}`,
      `Estudantes ativos no conjunto: ${activeStudents}`,
      priorityTurmas[0]
        ? `Turma prioritária: ${priorityTurmas[0].nome} com ${priorityTurmas[0].highPriority} crítica(s), ${priorityTurmas[0].attention} em atenção e ${priorityTurmas[0].stale} parada(s).`
        : "Turma prioritária: nenhuma turma crítica no recorte atual.",
      "",
      `Estado atual: ${relevantActivities.length} atividade(s) consideradas, ${urgencySummary.alta} em alta prioridade, ${urgencySummary.media} em atenção e ${missingNextStepCount} sem próximo passo explícito.`,
      `Ação recomendada: ${recommendation}`,
      priorityResponsible
        ? `Coordenação prioritária: ${priorityResponsible.name}${priorityResponsible.email ? ` <${priorityResponsible.email}>` : ""} acompanha ${priorityResponsible.turmas} turma(s) com ${priorityResponsible.highPriority} atividade(s) crítica(s).`
        : "Coordenação prioritária: ainda não há um responsável claramente dominante neste recorte.",
      sortedUpcomingEvents.length > 0
        ? `Agenda da rede: próximo marco em ${formatLongDate(sortedUpcomingEvents[0].dataInicio)} (${sortedUpcomingEvents[0].titulo}).`
        : "Agenda da rede: não há eventos futuros vinculados à instituição no momento.",
    ];

    if (priorityTurmas.length > 0) {
      lines.push("", "Turmas que pedem ação:");
      for (const turma of priorityTurmas) {
        lines.push(
          `- ${turma.nome}: ${turma.highPriority} crítica(s), ${turma.attention} em atenção, ${turma.stale} parada(s) e ${turma.activeStudents} estudante(s) ativo(s) | Responsável: ${turma.professor}`,
        );
      }
    }

    if (sortedUpcomingEvents.length > 0) {
      lines.push("", "Agenda institucional:");
      for (const event of sortedUpcomingEvents) {
        lines.push(`- ${event.titulo} em ${formatLongDate(event.dataInicio)}${event.local ? ` | ${event.local}` : ""}`);
      }
    }

    return plainTextResponse(lines.join("\n"), `resumo-executivo-instituicao-${requestedInstitutionId}.txt`);
  }

  const lines: string[] = [
    row([
      "Instituição",
      "Tipo",
      "Turma",
      "Ano Letivo",
      "Professor",
      "E-mail professor",
      "Estudantes ativos",
      "Atividades planejadas",
      "Atividades em andamento",
      "Atividades concluídas",
      "Checkpoints jornada",
      "Jornada aberta",
      "Jornada em andamento",
      "Jornada concluída",
      "Filtro jornada",
      "Filtro checkpoint",
    ]),
  ];

  for (const turma of scopedTurmas) {
    const inst = turma.instituicaoId ? instituicaoById.get(turma.instituicaoId) : null;
    const prof = turma.responsavelUserId ? professorById.get(turma.responsavelUserId) : null;
    const counts = atividadesByTurma.get(turma.id) ?? { planejada: 0, em_andamento: 0, concluida: 0 };
    const estudantes = matriculasByTurma.get(turma.id) ?? 0;
    const journeyCounts = secondaryJourneyCountsByTurma.get(turma.id) ?? { total: 0, aberto: 0, em_andamento: 0, concluido: 0 };

    lines.push(
      row([
        inst?.nome ?? "—",
        inst?.tipo ?? "—",
        turma.nome,
        turma.anoLetivo ?? "—",
        prof?.name ?? "—",
        prof?.email ?? "—",
        estudantes,
        counts.planejada,
        counts.em_andamento,
        counts.concluida,
        journeyCounts.total,
        journeyCounts.aberto,
        journeyCounts.em_andamento,
        journeyCounts.concluido,
        secondaryJourneyOrigin ? secondaryJourneyOriginMeta[secondaryJourneyOrigin].label : "Todas",
        secondaryJourneyStatus ? getSecondaryJourneyTrackingStatusLabel(secondaryJourneyStatus) : "Todos",
      ]),
    );
  }

  const csv = lines.join("\n");
  const date = new Date().toISOString().slice(0, 10);
  const baseFileSuffix = requestedTurmaId
    ? `turma-${requestedTurmaId}`
    : requestedInstitutionId
      ? `instituicao-${requestedInstitutionId}`
      : requestedResponsibleId
        ? `responsavel-${requestedResponsibleId}`
      : "participacao";
  const fileSuffix = [
    baseFileSuffix,
    secondaryJourneyOrigin ? `jornada-${secondaryJourneyOrigin}` : null,
    secondaryJourneyStatus ? `checkpoint-${secondaryJourneyStatus}` : null,
  ].filter((value): value is string => Boolean(value)).join("-");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="relatorio-${fileSuffix}-${date}.csv"`,
    },
  });
}

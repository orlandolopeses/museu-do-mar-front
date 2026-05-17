import Link from "next/link";
import { and, desc, eq, gte, inArray } from "drizzle-orm";
import { requireStudentAccess } from "@/lib/access";
import { CopyTextButton } from "@/components/ui/CopyTextButton";
import { db } from "@/lib/db";
import { buildMailtoLink, buildOperationalWhatsAppShareText, buildWhatsAppShareLink, joinShareLines } from "@/lib/gestor-sharing";
import { getAccessibleInstitutions } from "@/lib/institution-access";
import { acervo, atividadesTurma, eventos, forumTopicos, matriculasTurma, posts, turmas } from "@/lib/schema";
import { formatDate } from "@/lib/utils";
import { getStudentClassroomActivityPlans } from "@/lib/classroom-activity-plans";
import { extractRoles } from "@/lib/permissions";
import { getStudentPedagogicalTracks } from "@/lib/pedagogical-tracks";
import { ArrowRight, BookOpen, Building2, Calendar, Camera, CheckCircle2, Mail, MessageSquare, MessageSquareShare, PlayCircle, School, ScrollText, Sparkles, Users } from "lucide-react";
import { markActivityStatus } from "./actions";

const activityStatusLabelMap = {
  planejada: "Planejada",
  em_andamento: "Em andamento",
  concluida: "Concluída",
} as const;

async function getStudentDashboardData(userId: string) {
  const now = new Date();

  const linkedInstitutions = await getAccessibleInstitutions(userId, false);

  const activeMatriculas = await db
    .select({ turmaId: matriculasTurma.turmaId })
    .from(matriculasTurma)
    .where(and(eq(matriculasTurma.userId, userId), eq(matriculasTurma.status, "ativo")));

  const turmaIds = activeMatriculas.map((row) => row.turmaId);
  const enrolledTurmas = turmaIds.length > 0
    ? await db
      .select({
        id: turmas.id,
        nome: turmas.nome,
        instituicaoId: turmas.instituicaoId,
        anoLetivo: turmas.anoLetivo,
        segmento: turmas.segmento,
        turno: turmas.turno,
      })
      .from(turmas)
      .where(inArray(turmas.id, turmaIds))
      .orderBy(turmas.nome)
    : [];

  const institutionIds = [...new Set([
    ...linkedInstitutions.map((institution) => institution.id),
    ...enrolledTurmas.map((turma) => turma.instituicaoId),
  ])];

  const classmatesCountRows = turmaIds.length > 0
    ? await db
      .select({ turmaId: matriculasTurma.turmaId, userId: matriculasTurma.userId })
      .from(matriculasTurma)
      .where(and(eq(matriculasTurma.status, "ativo"), inArray(matriculasTurma.turmaId, turmaIds)))
    : [];

  const classmatesByTurma = new Map<string, number>();
  for (const row of classmatesCountRows) {
    classmatesByTurma.set(row.turmaId, (classmatesByTurma.get(row.turmaId) ?? 0) + 1);
  }

  const featuredPosts = await db
    .select({ id: posts.id, slug: posts.slug, title: posts.title, publishedAt: posts.publishedAt })
    .from(posts)
    .where(eq(posts.status, "publicado"))
    .orderBy(desc(posts.publishedAt))
    .limit(3);

  const featuredAcervo = await db
    .select({ id: acervo.id, titulo: acervo.titulo, tipo: acervo.tipo })
    .from(acervo)
    .where(eq(acervo.publicado, true))
    .orderBy(desc(acervo.createdAt))
    .limit(3);

  const upcomingEventosBase = institutionIds.length > 0
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

  const recentTopicos = await db
    .select({ id: forumTopicos.id, titulo: forumTopicos.titulo, createdAt: forumTopicos.createdAt })
    .from(forumTopicos)
    .orderBy(desc(forumTopicos.createdAt))
    .limit(3);

  const institutionById = new Map(linkedInstitutions.map((institution) => [institution.id, institution]));
  const turmaCards = enrolledTurmas.map((turma) => ({
    ...turma,
    institutionName: institutionById.get(turma.instituicaoId)?.nome ?? "Instituição vinculada",
    classmatesCount: Math.max((classmatesByTurma.get(turma.id) ?? 1) - 1, 0),
  }));

  const attentionPoints: string[] = [];
  if (linkedInstitutions.length === 0) {
    attentionPoints.push("Seu perfil ainda não possui instituição vinculada. Complete essa informação para receber agenda e contexto mais próximos da sua rede.");
  }
  if (turmaCards.length === 0) {
    attentionPoints.push("Você ainda não está matriculado em turmas ativas na plataforma.");
  }
  if (upcomingEventosBase.length === 0) {
    attentionPoints.push("Não há eventos futuros vinculados diretamente à sua rede no momento.");
  }
  if (attentionPoints.length === 0) {
    attentionPoints.push("Sua jornada já conecta turma, rede institucional e agenda para participação mais situada.");
  }

  const persistedActivities = turmaIds.length > 0
    ? await db
      .select({
        id: atividadesTurma.id,
        turmaId: atividadesTurma.turmaId,
        titulo: atividadesTurma.titulo,
        resumo: atividadesTurma.resumo,
        foco: atividadesTurma.foco,
        proximoPasso: atividadesTurma.proximoPasso,
        status: atividadesTurma.status,
        createdAt: atividadesTurma.createdAt,
        updatedAt: atividadesTurma.updatedAt,
      })
      .from(atividadesTurma)
      .where(inArray(atividadesTurma.turmaId, turmaIds))
      .orderBy(desc(atividadesTurma.updatedAt))
    : [];

  // Progresso por turma: contagem por status
  type ActivityStatus = "planejada" | "em_andamento" | "concluida";
  const progressByTurma = new Map<string, Record<ActivityStatus, number>>();
  for (const turmaId of turmaIds) {
    progressByTurma.set(turmaId, { planejada: 0, em_andamento: 0, concluida: 0 });
  }
  for (const activity of persistedActivities) {
    const counts = progressByTurma.get(activity.turmaId);
    if (counts) counts[activity.status]++;
  }

  return {
    featuredPosts,
    featuredAcervo,
    upcomingEventos: upcomingEventosBase.map((evento) => ({
      ...evento,
      instituicaoNome: evento.instituicaoId ? institutionById.get(evento.instituicaoId)?.nome ?? null : null,
    })),
    recentTopicos,
    linkedInstitutions,
    turmaCards,
    attentionPoints,
    persistedActivities,
    progressByTurma,
  };
}

export default async function EstudanteDashboardPage() {
  const session = await requireStudentAccess();
  const roles = extractRoles(session);
  const data = await getStudentDashboardData(session.user.id);
  const tracks = await getStudentPedagogicalTracks({
    hasInstitutions: data.linkedInstitutions.length > 0,
    hasTurmas: data.turmaCards.length > 0,
    hasEvents: data.upcomingEventos.length > 0,
  });
  // Agrupa atividades por turma para exibição
  const activitiesByTurma = new Map<string, typeof data.persistedActivities>();
  for (const activity of data.persistedActivities) {
    const list = activitiesByTurma.get(activity.turmaId) ?? [];
    list.push(activity);
    activitiesByTurma.set(activity.turmaId, list);
  }

  const classroomPlans = getStudentClassroomActivityPlans({
    turmas: data.turmaCards.map((turma) => ({
      id: turma.id,
      nome: turma.nome,
      institutionName: turma.institutionName,
      classmatesCount: turma.classmatesCount,
    })),
    hasUpcomingEvents: data.upcomingEventos.length > 0,
    hasInstitutions: data.linkedInstitutions.length > 0,
  });
  const openActivities = data.persistedActivities.filter((activity) => activity.status !== "concluida");
  const inProgressActivities = data.persistedActivities.filter((activity) => activity.status === "em_andamento");
  const completedActivities = data.persistedActivities.filter((activity) => activity.status === "concluida");
  const priorityActivity = openActivities.find((activity) => activity.proximoPasso?.trim()) ?? openActivities[0] ?? null;
  const priorityTurma = priorityActivity
    ? data.turmaCards.find((turma) => turma.id === priorityActivity.turmaId) ?? null
    : data.turmaCards[0] ?? null;
  const nextEvent = data.upcomingEventos[0] ?? null;
  const studentScopeLabel = data.linkedInstitutions.length > 0
    ? data.linkedInstitutions.length === 1
      ? data.linkedInstitutions[0]?.nome ?? "sua rede"
      : `${data.linkedInstitutions.length} instituições de referência`
    : "sua jornada atual";
  const studentShortSummary = joinShareLines([
    "Síntese rápida da minha jornada no Museu do Mar",
    `Rede: ${studentScopeLabel}`,
    `Estado: ${data.turmaCards.length} turma(s), ${openActivities.length} atividade(s) aberta(s) e ${completedActivities.length} concluída(s).`,
    priorityActivity
      ? `Foco agora: ${priorityActivity.titulo}${priorityTurma ? ` na turma ${priorityTurma.nome}` : ""}.`
      : "Foco agora: acompanhar novas atividades e percursos da plataforma.",
    priorityActivity?.proximoPasso
      ? `Próximo passo: ${priorityActivity.proximoPasso}`
      : "Próximo passo: escolher uma atividade aberta para iniciar.",
    nextEvent
      ? `Próximo marco: ${nextEvent.titulo} em ${formatDate(nextEvent.dataInicio)}.`
      : "Próximo marco: ainda sem evento futuro ligado à minha rede.",
  ]);
  const studentFullSummary = joinShareLines([
    "Resumo da minha jornada no Museu do Mar",
    `Gerado em ${formatDate(new Date())}`,
    "",
    `Rede de referência: ${studentScopeLabel}`,
    `Turmas ativas: ${data.turmaCards.length}`,
    `Atividades abertas: ${openActivities.length}`,
    `Atividades em andamento: ${inProgressActivities.length}`,
    `Atividades concluídas: ${completedActivities.length}`,
    priorityTurma
      ? `Turma em foco: ${priorityTurma.nome} · ${priorityTurma.institutionName}`
      : "Turma em foco: ainda sem turma ativa vinculada.",
    priorityActivity
      ? `Atividade em foco: ${priorityActivity.titulo}${priorityActivity.resumo ? ` — ${priorityActivity.resumo}` : ""}`
      : "Atividade em foco: ainda não há atividade aberta para acompanhamento.",
    priorityActivity?.proximoPasso
      ? `Próximo passo sugerido: ${priorityActivity.proximoPasso}`
      : "Próximo passo sugerido: explorar os percursos e iniciar a próxima atividade disponível.",
    nextEvent
      ? `Próximo evento da rede: ${nextEvent.titulo} em ${formatDate(nextEvent.dataInicio)}${nextEvent.instituicaoNome ? ` · ${nextEvent.instituicaoNome}` : ""}.`
      : "Próximo evento da rede: ainda não há evento futuro ligado à minha rede.",
  ]);
  const studentWhatsAppMessage = buildOperationalWhatsAppShareText({
    heading: "Minha jornada no Museu do Mar",
    state: `${data.turmaCards.length} turma(s), ${openActivities.length} atividade(s) aberta(s), ${completedActivities.length} concluída(s).`,
    action: priorityActivity?.proximoPasso ?? "escolher uma atividade aberta para iniciar e acompanhar os percursos da plataforma.",
    ctaPath: priorityActivity ? "/app/estudante" : null,
    checkpoint: nextEvent ? `${nextEvent.titulo} em ${formatDate(nextEvent.dataInicio)}.` : null,
  });
  const studentMailtoHref = buildMailtoLink(
    null,
    "Resumo da minha jornada no Museu do Mar",
    studentFullSummary,
  );
  const studentWhatsAppHref = buildWhatsAppShareLink(studentWhatsAppMessage);

  return (
    <div className="p-8 md:p-10">
      <div className="max-w-6xl">
        <div className="mb-10 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-sm font-medium uppercase tracking-wide text-mar-azul">
            <Sparkles className="w-4 h-4" />
            Jornada do Estudante
          </div>
          <h1 className="font-serif text-4xl font-bold text-mar-escuro">Explorar, aprender e participar</h1>
          <p className="max-w-3xl leading-relaxed text-mar-escuro/60">
            Área inicial para conhecer o acervo, participar das conversas do projeto, acompanhar atividades e descobrir conteúdos sobre memória, território e culturas do mar.
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
        </div>

        <div className="grid gap-5 md:grid-cols-3 mb-10">
          {[
            { label: "Instituições de referência", value: data.linkedInstitutions.length, icon: Building2, tone: "text-mar-azul bg-mar-azul/10" },
            { label: "Turmas ativas", value: data.turmaCards.length, icon: School, tone: "text-mar-verde bg-mar-verde/10" },
            { label: "Eventos na sua rede", value: data.upcomingEventos.length, icon: Calendar, tone: "text-mar-cobre bg-mar-cobre/10" },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl border border-mar-areia/30 bg-white p-6">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${item.tone}`}>
                <item.icon className="w-5 h-5" />
              </div>
              <p className="mt-4 text-sm text-mar-escuro/50">{item.label}</p>
              <p className="mt-1 font-serif text-3xl font-bold text-mar-escuro">{item.value}</p>
            </div>
          ))}
        </div>

        <section className="mb-6 rounded-2xl border border-mar-areia/30 bg-white p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <div className="flex items-center gap-2 text-sm font-medium uppercase tracking-wide text-mar-cobre">
                <ScrollText className="h-4 w-4" />
                Resumo compartilhável
              </div>
              <h2 className="mt-2 font-serif text-2xl font-bold text-mar-escuro">Leitura curta da minha jornada</h2>
              <p className="mt-2 text-sm leading-relaxed text-mar-escuro/60">
                Síntese rápida para compartilhar com família, rede de apoio ou mediação pedagógica sem sair da jornada do estudante.
              </p>
              <div className="mt-4 rounded-xl bg-mar-creme p-4 text-sm leading-relaxed text-mar-escuro/70 whitespace-pre-line">
                {studentShortSummary}
              </div>
            </div>

            <div className="flex flex-wrap gap-3 lg:max-w-sm lg:justify-end">
              <CopyTextButton
                text={studentShortSummary}
                label="Copiar resumo"
                copiedLabel="Resumo copiado"
                className="inline-flex items-center gap-2 rounded-full border border-mar-cobre/25 bg-white px-4 py-2 text-sm font-medium text-mar-cobre transition-colors hover:border-mar-cobre/45"
              />
              <a
                href={studentMailtoHref}
                className="inline-flex items-center gap-2 rounded-full border border-mar-areia/40 bg-white px-4 py-2 text-sm font-medium text-mar-azul transition-colors hover:border-mar-azul/30"
              >
                <Mail className="h-4 w-4" />
                Abrir e-mail
              </a>
              <a
                href={studentWhatsAppHref}
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

        <div className="grid gap-6 xl:grid-cols-[0.95fr,1.05fr] mb-6">
          <section className="rounded-2xl border border-mar-areia/30 bg-white p-6">
            <div className="mb-5">
              <h2 className="font-serif text-2xl font-bold text-mar-escuro">Minha jornada agora</h2>
              <p className="mt-1 text-sm text-mar-escuro/55">Seu vínculo com instituição, turma e participação no projeto.</p>
            </div>

            <div className="space-y-3">
              {data.turmaCards.length > 0 ? data.turmaCards.map((turma) => (
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
                    <span className="badge bg-mar-verde/10 text-mar-verde">{turma.classmatesCount} colega(s)</span>
                  </div>
                </div>
              )) : (
                <p className="text-sm text-mar-escuro/50">Nenhuma turma ativa vinculada ao seu perfil neste momento.</p>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-mar-areia/30 bg-white p-6">
            <div className="mb-5">
              <h2 className="font-serif text-2xl font-bold text-mar-escuro">Sinais para sua participação</h2>
              <p className="mt-1 text-sm text-mar-escuro/55">Leituras simples para orientar próximos passos na plataforma.</p>
            </div>

            <div className="space-y-4">
              {data.attentionPoints.map((item) => (
                <div key={item} className="rounded-xl bg-mar-creme p-4 text-sm leading-relaxed text-mar-escuro/60">
                  {item}
                </div>
              ))}
            </div>

            {data.linkedInstitutions.length > 0 && (
              <div className="mt-5 rounded-xl border border-mar-areia/30 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-mar-cobre">
                  <Users className="w-4 h-4" />
                  Rede de referência
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {data.linkedInstitutions.map((institution) => (
                    <span key={institution.id} className="badge bg-mar-azul/10 text-mar-azul">
                      {institution.nome}{institution.funcaoInstitucional ? ` · ${institution.funcaoInstitucional}` : ""}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>

        <section className="rounded-2xl border border-mar-areia/30 bg-white p-6 mb-6">
          <div className="mb-5">
            <h2 className="font-serif text-2xl font-bold text-mar-escuro">Percursos para explorar</h2>
            <p className="mt-1 text-sm text-mar-escuro/55">Caminhos simples para ligar leitura, acervo, agenda e participação da turma.</p>
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

        <section className="rounded-2xl border border-mar-areia/30 bg-white p-6 mb-6">
          <div className="mb-5">
            <h2 className="font-serif text-2xl font-bold text-mar-escuro">Próximas atividades da turma</h2>
            <p className="mt-1 text-sm text-mar-escuro/55">Planos curtos para transformar a trilha em ação com colegas e professores.</p>
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

        <section className="rounded-2xl border border-mar-areia/30 bg-white p-6 mb-6">
          <div className="mb-5">
            <h2 className="font-serif text-2xl font-bold text-mar-escuro">Progresso por turma</h2>
            <p className="mt-1 text-sm text-mar-escuro/55">Visão de avanço das atividades abertas para cada turma em que você está matriculado.</p>
          </div>

          {data.turmaCards.length === 0 ? (
            <div className="rounded-xl bg-mar-creme p-4 text-sm leading-relaxed text-mar-escuro/60">
              Você ainda não está matriculado em turmas ativas. Quando um professor abrir atividades para sua turma, o progresso aparecerá aqui.
            </div>
          ) : (
            <div className="space-y-6">
              {data.turmaCards.map((turma) => {
                const counts = data.progressByTurma.get(turma.id) ?? { planejada: 0, em_andamento: 0, concluida: 0 };
                const total = counts.planejada + counts.em_andamento + counts.concluida;
                const pctConcluida = total > 0 ? Math.round((counts.concluida / total) * 100) : 0;
                const pctAndamento = total > 0 ? Math.round((counts.em_andamento / total) * 100) : 0;
                const turmaActivities = activitiesByTurma.get(turma.id) ?? [];

                return (
                  <div key={turma.id} className="rounded-xl border border-mar-areia/30 p-5">
                    {/* Cabeçalho da turma */}
                    <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                      <div>
                        <h3 className="font-medium text-mar-escuro">{turma.nome}</h3>
                        <p className="mt-1 text-sm text-mar-escuro/55">{turma.institutionName}</p>
                      </div>
                      <span className="badge bg-mar-azul/10 text-mar-azul">{total} atividade{total !== 1 ? "s" : ""}</span>
                    </div>

                    {total === 0 ? (
                      <p className="text-sm text-mar-escuro/45">Nenhuma atividade registrada para esta turma ainda.</p>
                    ) : (
                      <>
                        {/* Barra de progresso */}
                        <div className="mb-4">
                          <div className="flex h-3 w-full overflow-hidden rounded-full bg-mar-areia/30">
                            <div
                              className="h-full bg-mar-verde transition-all"
                              style={{ width: `${pctConcluida}%` }}
                              title={`Concluída: ${counts.concluida}`}
                            />
                            <div
                              className="h-full bg-mar-azul transition-all"
                              style={{ width: `${pctAndamento}%` }}
                              title={`Em andamento: ${counts.em_andamento}`}
                            />
                          </div>
                          <div className="mt-2 flex flex-wrap gap-4 text-xs text-mar-escuro/55">
                            <span className="flex items-center gap-1">
                              <span className="inline-block h-2 w-2 rounded-full bg-mar-verde" />
                              Concluída: {counts.concluida}
                            </span>
                            <span className="flex items-center gap-1">
                              <span className="inline-block h-2 w-2 rounded-full bg-mar-azul" />
                              Em andamento: {counts.em_andamento}
                            </span>
                            <span className="flex items-center gap-1">
                              <span className="inline-block h-2 w-2 rounded-full bg-mar-areia/60" />
                              Planejada: {counts.planejada}
                            </span>
                          </div>
                        </div>

                        {/* Lista de atividades da turma */}
                        <div className="space-y-3">
                          {turmaActivities.map((activity) => {
                            const statusTone = activity.status === "concluida"
                              ? "bg-mar-verde/10 text-mar-verde"
                              : activity.status === "em_andamento"
                                ? "bg-mar-azul/10 text-mar-azul"
                                : "bg-mar-areia/30 text-mar-escuro/60";

                            return (
                              <div key={activity.id} className="rounded-lg border border-mar-areia/20 bg-mar-creme/40 p-4">
                                <div className="flex flex-wrap items-start justify-between gap-2">
                                  <h4 className="font-medium text-mar-escuro">{activity.titulo}</h4>
                                  <span className={`badge ${statusTone}`}>{activityStatusLabelMap[activity.status]}</span>
                                </div>
                                <p className="mt-2 text-sm leading-relaxed text-mar-escuro/60">{activity.resumo}</p>
                                {activity.foco && (
                                  <p className="mt-2 text-xs uppercase tracking-wide text-mar-cobre/80">Foco: {activity.foco}</p>
                                )}
                                {activity.proximoPasso && activity.status !== "concluida" && (
                                  <p className="mt-2 text-sm text-mar-azul/80">Próximo passo: {activity.proximoPasso}</p>
                                )}
                                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                                  <p className="text-xs text-mar-escuro/40">Atualizado em {formatDate(activity.updatedAt)}</p>
                                  {activity.status === "planejada" && (
                                    <form action={markActivityStatus}>
                                      <input type="hidden" name="activityId" value={activity.id} />
                                      <input type="hidden" name="newStatus" value="em_andamento" />
                                      <button
                                        type="submit"
                                        className="inline-flex items-center gap-1.5 rounded-lg bg-mar-azul/10 px-3 py-1.5 text-xs font-medium text-mar-azul transition-colors hover:bg-mar-azul/20"
                                      >
                                        <PlayCircle className="w-3.5 h-3.5" />
                                        Iniciar
                                      </button>
                                    </form>
                                  )}
                                  {activity.status === "em_andamento" && (
                                    <form action={markActivityStatus}>
                                      <input type="hidden" name="activityId" value={activity.id} />
                                      <input type="hidden" name="newStatus" value="concluida" />
                                      <button
                                        type="submit"
                                        className="inline-flex items-center gap-1.5 rounded-lg bg-mar-verde/10 px-3 py-1.5 text-xs font-medium text-mar-verde transition-colors hover:bg-mar-verde/20"
                                      >
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                        Marcar como concluída
                                      </button>
                                    </form>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-mar-areia/30 bg-white p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="font-serif text-2xl font-bold text-mar-escuro">Textos para começar</h2>
                <p className="mt-1 text-sm text-mar-escuro/55">Entradas iniciais para conhecer o projeto e o território.</p>
              </div>
              <Link href="/blog" className="inline-flex items-center gap-1 text-sm font-medium text-mar-azul">
                Ver blog <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="space-y-3">
              {data.featuredPosts.map((post) => (
                <Link key={post.id} href={`/blog/${post.slug}`} className="block rounded-xl border border-mar-areia/30 p-4 transition-colors hover:border-mar-azul/30">
                  <div className="flex items-center gap-2 text-sm font-medium text-mar-azul">
                    <BookOpen className="w-4 h-4" />
                    Leitura
                  </div>
                  <h3 className="mt-2 font-medium text-mar-escuro">{post.title}</h3>
                  <p className="mt-2 text-sm text-mar-escuro/55">{formatDate(post.publishedAt)}</p>
                </Link>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-mar-areia/30 bg-white p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="font-serif text-2xl font-bold text-mar-escuro">Acervo e agenda</h2>
                <p className="mt-1 text-sm text-mar-escuro/55">Conteúdos e atividades para explorar a memória viva do projeto a partir da sua rede.</p>
              </div>
            </div>
            <div className="space-y-3">
              {data.featuredAcervo.map((item) => (
                <Link key={item.id} href={`/acervo/${item.id}`} className="block rounded-xl border border-mar-areia/30 p-4 transition-colors hover:border-mar-azul/30">
                  <div className="flex items-center gap-2 text-sm font-medium text-mar-verde">
                    <Camera className="w-4 h-4" />
                    Acervo
                  </div>
                  <h3 className="mt-2 font-medium text-mar-escuro">{item.titulo}</h3>
                  <p className="mt-2 text-sm text-mar-escuro/55">Tipo: {item.tipo}</p>
                </Link>
              ))}
              {data.upcomingEventos.map((evento) => (
                <Link key={evento.id} href={`/agenda/${evento.id}`} className="block rounded-xl border border-mar-areia/30 p-4 transition-colors hover:border-mar-azul/30">
                  <div className="flex items-center gap-2 text-sm font-medium text-mar-cobre">
                    <Calendar className="w-4 h-4" />
                    Agenda
                  </div>
                  <h3 className="mt-2 font-medium text-mar-escuro">{evento.titulo}</h3>
                  <p className="mt-2 text-sm text-mar-escuro/55">{formatDate(evento.dataInicio)}</p>
                  {evento.instituicaoNome && <p className="mt-1 text-xs uppercase tracking-wide text-mar-cobre/80">{evento.instituicaoNome}</p>}
                  {evento.local && <p className="mt-1 text-sm text-mar-escuro/55">{evento.local}</p>}
                </Link>
              ))}
            </div>
          </section>
        </div>

        <section className="mt-6 rounded-2xl border border-mar-areia/30 bg-white p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="font-serif text-2xl font-bold text-mar-escuro">Converse com a comunidade</h2>
              <p className="mt-1 text-sm text-mar-escuro/55">Tópicos recentes para aprofundar perguntas, memórias e referências.</p>
            </div>
            <Link href="/forum" className="inline-flex items-center gap-1 text-sm font-medium text-mar-azul">
              Ver fórum <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="space-y-3">
            {data.recentTopicos.map((topico) => (
              <Link key={topico.id} href={`/forum/${topico.id}`} className="block rounded-xl border border-mar-areia/30 p-4 transition-colors hover:border-mar-azul/30">
                <div className="flex items-center gap-2 text-sm font-medium text-mar-azul">
                  <MessageSquare className="w-4 h-4" />
                  Fórum
                </div>
                <h3 className="mt-2 font-medium text-mar-escuro">{topico.titulo}</h3>
                <p className="mt-2 text-sm text-mar-escuro/55">{formatDate(topico.createdAt)}</p>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
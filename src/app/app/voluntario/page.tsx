import Link from "next/link";
import { eq } from "drizzle-orm";
import { createSecondaryJourneyTracking, updateSecondaryJourneyTracking } from "@/app/app/secondary-journey-tracking-actions";
import { requireVolunteerAccess } from "@/lib/access";
import { CopyTextButton } from "@/components/ui/CopyTextButton";
import { db } from "@/lib/db";
import { buildMailtoLink, buildOperationalWhatsAppShareText, buildWhatsAppShareLink, joinShareLines } from "@/lib/gestor-sharing";
import { extractRoles } from "@/lib/permissions";
import { getUpcomingPublicEventsForUser } from "@/lib/public-event-access";
import { getRecentSecondaryJourneyTrackings, getSecondaryJourneyTrackingStatusLabel } from "@/lib/secondary-journey-tracking";
import { forumTopicos, posts } from "@/lib/schema";
import { formatDate } from "@/lib/utils";
import { ArrowRight, Calendar, HeartHandshake, Mail, MessageCircleHeart, MessageSquareShare, NotebookPen, ScrollText, SquarePen } from "lucide-react";

type VoluntarioPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type VolunteerAgendaItem = {
  id: string;
  titulo: string;
  dataInicio: Date;
  local: string | null;
};

type VolunteerActionItem = {
  label: string;
  tone: "azul" | "verde" | "cobre";
};

const DAY_IN_MS = 1000 * 60 * 60 * 24;

function getSearchParam(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key];

  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function getDaysUntil(date: Date) {
  return Math.ceil((date.getTime() - Date.now()) / DAY_IN_MS);
}

function buildVolunteerActionPlan(evento: VolunteerAgendaItem): VolunteerActionItem[] {
  const daysUntil = getDaysUntil(evento.dataInicio);
  const plan: VolunteerActionItem[] = [];

  if (daysUntil <= 2) {
    plan.push({ label: "Confirmar presença, acolhimento e ponto de chegada", tone: "cobre" });
  } else if (daysUntil <= 7) {
    plan.push({ label: "Sinalizar interesse e combinar forma de apoio", tone: "azul" });
  } else {
    plan.push({ label: "Acompanhar preparação e abrir disponibilidade", tone: "verde" });
  }

  if (evento.local) {
    plan.push({ label: `Checar deslocamento e referência de encontro em ${evento.local}`, tone: "verde" });
  } else {
    plan.push({ label: "Pedir confirmação de local e instruções de chegada", tone: "cobre" });
  }

  plan.push({ label: "Entrar no fórum ou canal de conversa para alinhamento final", tone: "azul" });

  return plan;
}

function buildVolunteerTrackingHref(options: {
  userName: string;
  userEmail: string;
  nextEvent: VolunteerAgendaItem | undefined;
  actionPlan: VolunteerActionItem[];
}) {
  const { userName, userEmail, nextEvent, actionPlan } = options;
  const eventLabel = nextEvent ? `${nextEvent.titulo} (${formatDate(nextEvent.dataInicio)})` : "Sem oportunidade imediata no recorte atual";
  const locationLabel = nextEvent?.local ?? "Local ainda não confirmado";
  const planLines = actionPlan.length > 0 ? actionPlan.map((item) => `- ${item.label}`).join("\n") : "-";
  const titleBase = nextEvent ? `Voluntariado em acompanhamento · ${nextEvent.titulo}` : "Voluntariado em acompanhamento · Próxima aproximação";
  const content = [
    "Oportunidade acompanhada:",
    eventLabel,
    "",
    "Local e referência de chegada:",
    locationLabel,
    "",
    "Plano desta rodada:",
    planLines,
    "",
    "Interesse ou disponibilidade confirmada:",
    "-",
    "",
    "Dúvidas logísticas ou de acolhimento:",
    "-",
    "",
    "Próximo alinhamento necessário:",
    "-",
  ].join("\n");

  const params = new URLSearchParams({
    origem: "voluntario",
    titulo: titleBase,
    conteudo: content,
    autorNome: userName,
    autorEmail: userEmail,
  });

  return `/forum/novo?${params.toString()}`;
}

async function getVolunteerDashboardData(userId: string, canViewAllInstitutions: boolean) {
  const eventData = await getUpcomingPublicEventsForUser({ userId, canViewAllInstitutions, limit: 3 });
  const recentPosts = await db
    .select({ id: posts.id, slug: posts.slug, title: posts.title, publishedAt: posts.publishedAt })
    .from(posts)
    .where(eq(posts.status, "publicado"))
    .orderBy(posts.publishedAt)
    .limit(3);

  const recentTopics = await db
    .select({ id: forumTopicos.id, titulo: forumTopicos.titulo, createdAt: forumTopicos.createdAt })
    .from(forumTopicos)
    .orderBy(forumTopicos.createdAt)
    .limit(3);

  const immediateAgenda = eventData.upcomingAgenda.filter((evento) => getDaysUntil(evento.dataInicio) <= 7);
  const eventsWithLocation = eventData.upcomingAgenda.filter((evento) => Boolean(evento.local)).length;
  const participationWindows = eventData.upcomingAgenda.map((evento) => ({
    ...evento,
    daysUntil: getDaysUntil(evento.dataInicio),
    actionPlan: buildVolunteerActionPlan(evento),
  }));
  const recentTrackings = await getRecentSecondaryJourneyTrackings({ origin: "voluntario", userId, limit: 3 });

  return {
    upcomingAgenda: eventData.upcomingAgenda,
    isInstitutionScoped: eventData.isInstitutionScoped,
    recentPosts,
    recentTopics,
    immediateAgendaCount: immediateAgenda.length,
    eventsWithLocation,
    participationWindows,
    recentTrackings,
  };
}

export default async function VoluntarioPage({ searchParams }: VoluntarioPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const trackingState = getSearchParam(resolvedSearchParams, "tracking");
  const session = await requireVolunteerAccess();
  const roles = extractRoles(session);
  const canViewAllInstitutions = roles.includes("superadmin");
  const data = await getVolunteerDashboardData(session.user.id, canViewAllInstitutions);
  const volunteerTrackingHref = buildVolunteerTrackingHref({
    userName: session.user.name ?? "",
    userEmail: session.user.email ?? "",
    nextEvent: data.participationWindows[0],
    actionPlan: data.participationWindows[0]?.actionPlan ?? [],
  });
  const volunteerHistoryHref = "/forum?origem=voluntario";
  const structuredTrackingTitle = data.participationWindows[0]
    ? `Interesse estruturado · ${data.participationWindows[0].titulo}`
    : "Interesse estruturado · Próxima aproximação";
  const structuredTrackingSummary = data.participationWindows[0]?.actionPlan.map((item) => `- ${item.label}`).join("\n")
    ?? "- Registrar disponibilidade e principal ponto de entrada nesta jornada.";
  const volunteerShortSummary = joinShareLines([
    "Síntese rápida da jornada do voluntário",
    `Oportunidade: ${data.participationWindows[0]?.titulo ?? "próxima aproximação em aberto"}`,
    `Estado: ${data.immediateAgendaCount} oportunidade(s) imediata(s), ${data.eventsWithLocation} com local confirmado e ${data.recentTopics.length} conversa(s) aberta(s).`,
    data.participationWindows[0]?.actionPlan[0] ? `Ação: ${data.participationWindows[0].actionPlan[0].label}` : "Ação: abrir disponibilidade e combinar a próxima forma de apoio.",
    data.participationWindows[0] ? `Próximo marco: ${data.participationWindows[0].titulo} em ${formatDate(data.participationWindows[0].dataInicio)}.` : "Próximo marco: ainda sem oportunidade futura no recorte atual.",
  ]);
  const volunteerFullSummary = joinShareLines([
    "Resumo da jornada do voluntário",
    `Gerado em ${formatDate(new Date())}`,
    "",
    `Oportunidade em foco: ${data.participationWindows[0]?.titulo ?? "próxima aproximação em aberto"}`,
    `Oportunidades imediatas: ${data.immediateAgendaCount}`,
    `Eventos com local confirmado: ${data.eventsWithLocation}`,
    `Conversas abertas: ${data.recentTopics.length}`,
    data.participationWindows[0]?.actionPlan[0] ? `Ação sugerida: ${data.participationWindows[0].actionPlan[0].label}` : "Ação sugerida: abrir disponibilidade e combinar a próxima forma de apoio.",
    data.participationWindows[0] ? `Próximo evento: ${data.participationWindows[0].titulo} em ${formatDate(data.participationWindows[0].dataInicio)}${data.participationWindows[0].local ? ` · ${data.participationWindows[0].local}` : ""}.` : "Próximo evento: ainda sem oportunidade futura no recorte atual.",
    data.recentPosts[0] ? `Leitura recente para contexto: ${data.recentPosts[0].title}.` : "Leitura recente para contexto: ainda sem destaque editorial.",
  ]);
  const volunteerMailtoHref = buildMailtoLink(null, "Resumo da jornada do voluntário", volunteerFullSummary);
  const volunteerWhatsAppHref = buildWhatsAppShareLink(
    buildOperationalWhatsAppShareText({
      heading: "Jornada do voluntário",
      state: `${data.immediateAgendaCount} oportunidade(s) imediata(s), ${data.eventsWithLocation} com local confirmado, ${data.recentTopics.length} conversa(s) aberta(s).`,
      action: data.participationWindows[0]?.actionPlan[0]?.label ?? "abrir disponibilidade e combinar a próxima forma de apoio.",
      ctaPath: "/app/voluntario",
      checkpoint: data.participationWindows[0] ? `${data.participationWindows[0].titulo} em ${formatDate(data.participationWindows[0].dataInicio)}.` : null,
    }),
  );

  return (
    <div className="p-8 md:p-10">
      <div className="max-w-6xl">
        <div className="mb-10 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-sm font-medium uppercase tracking-wide text-mar-azul">
            <HeartHandshake className="w-4 h-4" />
            Jornada do Voluntário
          </div>
          <h1 className="font-serif text-4xl font-bold text-mar-escuro">Participação e apoio em rede</h1>
          <p className="max-w-3xl leading-relaxed text-mar-escuro/60">
            Área inicial para voluntários acompanharem atividades públicas, oportunidades de participação e temas de conversa ligados ao território e às culturas do mar.
          </p>
          {data.isInstitutionScoped ? (
            <p className="text-sm text-mar-escuro/45">Agenda de participação alinhada às instituições com vínculo formal do seu perfil.</p>
          ) : null}
          {trackingState === "created" ? (
            <div className="rounded-xl border border-mar-verde/30 bg-mar-verde/10 px-4 py-3 text-sm text-mar-escuro/75">
              Interesse salvo no acompanhamento estruturado da jornada.
            </div>
          ) : null}
          {trackingState === "updated" ? (
            <div className="rounded-xl border border-mar-verde/30 bg-mar-verde/10 px-4 py-3 text-sm text-mar-escuro/75">
              Registro recente atualizado nesta jornada.
            </div>
          ) : null}
          {trackingState === "invalid" ? (
            <div className="rounded-xl border border-mar-cobre/30 bg-mar-cobre/10 px-4 py-3 text-sm text-mar-escuro/75">
              Preencha título e resumo para registrar a intenção de participação.
            </div>
          ) : null}
          {trackingState === "invalid-update" ? (
            <div className="rounded-xl border border-mar-cobre/30 bg-mar-cobre/10 px-4 py-3 text-sm text-mar-escuro/75">
              Preencha título e resumo para atualizar o registro recente.
            </div>
          ) : null}
          {trackingState === "not-found" ? (
            <div className="rounded-xl border border-mar-cobre/30 bg-mar-cobre/10 px-4 py-3 text-sm text-mar-escuro/75">
              Não foi possível localizar este registro recente na sua jornada.
            </div>
          ) : null}
        </div>

        <div className="mb-10 grid gap-5 md:grid-cols-3">
          {[
            { label: "Oportunidades imediatas", value: data.immediateAgendaCount, icon: Calendar, tone: "text-mar-cobre bg-mar-cobre/10" },
            { label: "Eventos com local confirmado", value: data.eventsWithLocation, icon: HeartHandshake, tone: "text-mar-verde bg-mar-verde/10" },
            { label: "Conversas abertas", value: data.recentTopics.length, icon: MessageCircleHeart, tone: "text-mar-azul bg-mar-azul/10" },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl border border-mar-areia/30 bg-white p-6">
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${item.tone}`}>
                <item.icon className="h-5 w-5" />
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
              <h2 className="mt-2 font-serif text-2xl font-bold text-mar-escuro">Leitura curta da participação em rede</h2>
              <p className="mt-2 text-sm leading-relaxed text-mar-escuro/60">
                Síntese rápida para compartilhar com acolhimento, coordenação ou rede de apoio sem sair da jornada do voluntário.
              </p>
              <div className="mt-4 whitespace-pre-line rounded-xl bg-mar-creme p-4 text-sm leading-relaxed text-mar-escuro/70">
                {volunteerShortSummary}
              </div>
            </div>

            <div className="flex flex-wrap gap-3 lg:max-w-sm lg:justify-end">
              <CopyTextButton
                text={volunteerShortSummary}
                label="Copiar resumo"
                copiedLabel="Resumo copiado"
                className="inline-flex items-center gap-2 rounded-full border border-mar-cobre/25 bg-white px-4 py-2 text-sm font-medium text-mar-cobre transition-colors hover:border-mar-cobre/45"
              />
              <a
                href={volunteerMailtoHref}
                className="inline-flex items-center gap-2 rounded-full border border-mar-areia/40 bg-white px-4 py-2 text-sm font-medium text-mar-azul transition-colors hover:border-mar-azul/30"
              >
                <Mail className="h-4 w-4" />
                Abrir e-mail
              </a>
              <a
                href={volunteerWhatsAppHref}
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

        <div className="grid gap-6 lg:grid-cols-3">
          <section className="rounded-2xl border border-mar-areia/30 bg-white p-6 lg:col-span-2">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="font-serif text-2xl font-bold text-mar-escuro">Onde participar agora</h2>
                <p className="mt-1 text-sm text-mar-escuro/55">
                  {data.isInstitutionScoped
                    ? "Agenda vinculada às instituições em que você atua formalmente."
                    : "Agenda pública com potencial de apoio, presença e mobilização."}
                </p>
              </div>
              <Link href="/agenda" className="inline-flex items-center gap-1 text-sm font-medium text-mar-azul">
                Ver agenda <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="space-y-3">
              {data.participationWindows.length > 0 ? data.participationWindows.map((evento) => (
                <Link key={evento.id} href={`/agenda/${evento.id}`} className="block rounded-xl border border-mar-areia/30 p-4 transition-colors hover:border-mar-azul/30">
                  <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-mar-cobre">
                    <Calendar className="w-4 h-4" />
                    <span>{evento.daysUntil <= 0 ? "Hoje" : evento.daysUntil === 1 ? "Amanhã" : `Em ${evento.daysUntil} dias`}</span>
                  </div>
                  <h3 className="mt-2 font-medium text-mar-escuro">{evento.titulo}</h3>
                  <p className="mt-2 text-sm text-mar-escuro/55">{formatDate(evento.dataInicio)}</p>
                  <p className="mt-1 text-sm text-mar-escuro/55">{evento.local ?? "Local ainda não confirmado"}</p>
                </Link>
              )) : (
                <div className="rounded-xl border border-dashed border-mar-areia/40 p-4 text-sm text-mar-escuro/55">
                  Não há oportunidades abertas no recorte atual.
                </div>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-mar-areia/30 bg-white p-6">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-mar-verde">
              <NotebookPen className="w-4 h-4" />
              Como entrar agora
            </div>
            {data.participationWindows[0] ? (
              <div className="space-y-4">
                <div className="rounded-xl bg-mar-creme/60 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-mar-cobre">Próxima abertura</p>
                  <h3 className="mt-2 font-serif text-2xl font-bold text-mar-escuro">{data.participationWindows[0].titulo}</h3>
                  <p className="mt-2 text-sm text-mar-escuro/60">{formatDate(data.participationWindows[0].dataInicio)}</p>
                  <p className="mt-1 text-sm text-mar-escuro/60">{data.participationWindows[0].local ?? "Local pendente"}</p>
                </div>
                <ul className="space-y-3 text-sm leading-relaxed text-mar-escuro/65">
                  {data.participationWindows[0].actionPlan.map((item) => (
                    <li key={item.label} className="flex items-start gap-3">
                      <span
                        className={`mt-1 h-2.5 w-2.5 rounded-full ${
                          item.tone === "cobre"
                            ? "bg-mar-cobre"
                            : item.tone === "verde"
                              ? "bg-mar-verde"
                              : "bg-mar-azul"
                        }`}
                      />
                      <span>{item.label}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-sm leading-relaxed text-mar-escuro/65">Sem janela imediata de participação aberta no recorte atual.</p>
            )}
          </section>

          <section className="rounded-2xl border border-mar-areia/30 bg-white p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="font-serif text-2xl font-bold text-mar-escuro">Leituras recentes</h2>
                <p className="mt-1 text-sm text-mar-escuro/55">Textos públicos para conhecer melhor o contexto do projeto.</p>
              </div>
              <Link href="/blog" className="inline-flex items-center gap-1 text-sm font-medium text-mar-azul">
                Ver blog <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="space-y-3">
              {data.recentPosts.length > 0 ? data.recentPosts.map((post) => (
                <Link key={post.id} href={`/blog/${post.slug}`} className="block rounded-xl border border-mar-areia/30 p-4 transition-colors hover:border-mar-azul/30">
                  <h3 className="font-medium text-mar-escuro">{post.title}</h3>
                  <p className="mt-2 text-sm text-mar-escuro/55">{formatDate(post.publishedAt)}</p>
                </Link>
              )) : (
                <div className="rounded-xl border border-dashed border-mar-areia/40 p-4 text-sm text-mar-escuro/55">
                  Ainda não há leituras recentes para contextualizar novas entradas de voluntariado.
                </div>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-mar-areia/30 bg-white p-6 lg:col-span-3">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="font-serif text-2xl font-bold text-mar-escuro">Pontos de entrada por evento</h2>
                <p className="mt-1 text-sm text-mar-escuro/55">Leitura rápida do que fazer para transformar interesse em participação concreta.</p>
              </div>
              <Link href={volunteerTrackingHref} className="inline-flex items-center gap-1 text-sm font-medium text-mar-azul">
                Registrar interesse <SquarePen className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid gap-4 lg:grid-cols-3">
              {data.participationWindows.length > 0 ? data.participationWindows.map((evento) => (
                <div key={evento.id} className="rounded-xl border border-mar-areia/30 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="font-medium text-mar-escuro">{evento.titulo}</h3>
                      <p className="mt-1 text-sm text-mar-escuro/55">{formatDate(evento.dataInicio)}</p>
                    </div>
                    <Link href={`/agenda/${evento.id}`} className="inline-flex items-center gap-1 text-sm font-medium text-mar-azul">
                      Abrir <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                  <ul className="mt-4 space-y-2 text-sm leading-relaxed text-mar-escuro/65">
                    {evento.actionPlan.map((item) => (
                      <li key={item.label}>• {item.label}</li>
                    ))}
                  </ul>
                </div>
              )) : (
                <div className="rounded-xl border border-dashed border-mar-areia/40 p-4 text-sm text-mar-escuro/55 lg:col-span-3">
                  Ainda não há eventos suficientes para abrir pontos de entrada nesta jornada.
                </div>
              )}
            </div>
            <div className="mt-5 grid gap-4 lg:grid-cols-[1.05fr,0.95fr]">
              <div className="rounded-xl border border-mar-areia/30 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-mar-cobre">Frente A ativa</p>
                <p className="mt-2 text-sm leading-relaxed text-mar-escuro/65">
                  A jornada agora já registra intenção, alinhamento e próximos passos em um acompanhamento próprio. O fórum segue como trilha aberta para conversa e acolhimento.
                </p>
                <form action={createSecondaryJourneyTracking} className="mt-4 space-y-4">
                  <input type="hidden" name="origin" value="voluntario" />
                  <input type="hidden" name="referenciaEventoId" value={data.participationWindows[0]?.id ?? ""} />
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-mar-escuro">Título</span>
                    <input
                      type="text"
                      name="titulo"
                      defaultValue={structuredTrackingTitle}
                      className="w-full rounded-xl border border-mar-areia/40 px-4 py-3 text-sm focus:border-mar-azul focus:outline-none focus:ring-1 focus:ring-mar-azul"
                      required
                    />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-mar-escuro">Resumo do interesse</span>
                    <textarea
                      name="resumo"
                      defaultValue={structuredTrackingSummary}
                      rows={5}
                      className="w-full rounded-xl border border-mar-areia/40 px-4 py-3 text-sm focus:border-mar-azul focus:outline-none focus:ring-1 focus:ring-mar-azul"
                      required
                    />
                  </label>
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-mar-escuro">Status</span>
                      <select
                        name="status"
                        defaultValue="aberto"
                        className="w-full rounded-xl border border-mar-areia/40 px-4 py-3 text-sm focus:border-mar-azul focus:outline-none focus:ring-1 focus:ring-mar-azul"
                      >
                        <option value="aberto">Aberto</option>
                        <option value="em_andamento">Em andamento</option>
                        <option value="concluido">Concluído</option>
                      </select>
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-mar-escuro">Próximo alinhamento</span>
                      <textarea
                        name="proximoPasso"
                        defaultValue={data.participationWindows[0] ? `Confirmar presença e instruções finais para ${data.participationWindows[0].titulo}.` : "Definir próximo contato com a equipe do projeto."}
                        rows={3}
                        className="w-full rounded-xl border border-mar-areia/40 px-4 py-3 text-sm focus:border-mar-azul focus:outline-none focus:ring-1 focus:ring-mar-azul"
                      />
                    </label>
                  </div>
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-mar-escuro">Dúvidas ou apoio necessário</span>
                    <textarea
                      name="apoioNecessario"
                      defaultValue=""
                      rows={3}
                      placeholder="Ex.: confirmar chegada, acolhimento, local, forma de participação."
                      className="w-full rounded-xl border border-mar-areia/40 px-4 py-3 text-sm focus:border-mar-azul focus:outline-none focus:ring-1 focus:ring-mar-azul"
                    />
                  </label>
                  <div className="flex flex-wrap gap-3">
                    <button type="submit" className="btn-primary inline-flex">
                      <NotebookPen className="h-4 w-4" />
                      Salvar interesse
                    </button>
                    <Link href={volunteerTrackingHref} className="inline-flex items-center gap-1 text-sm font-medium text-mar-azul">
                      Registrar no fórum <SquarePen className="w-4 h-4" />
                    </Link>
                    <Link href={volunteerHistoryHref} className="inline-flex items-center gap-1 text-sm font-medium text-mar-azul">
                      Ver histórico no fórum <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </form>
              </div>
              <div className="rounded-xl bg-mar-azul/5 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-mar-escuro/45">Seus registros recentes</p>
                <div className="mt-3 space-y-3">
                  {data.recentTrackings.length > 0 ? data.recentTrackings.map((tracking) => (
                    <div key={tracking.id} className="rounded-xl border border-mar-areia/30 bg-white p-4">
                      <form action={updateSecondaryJourneyTracking} className="space-y-3">
                        <input type="hidden" name="origin" value="voluntario" />
                        <input type="hidden" name="trackingId" value={tracking.id} />
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <Link href={`/app/voluntario/tracking/${tracking.id}`} className="text-xs font-medium uppercase tracking-wide text-mar-escuro/45 hover:text-mar-azul hover:underline">
                            Registro recente
                          </Link>
                          <span className="text-xs font-medium uppercase tracking-wide text-mar-cobre">
                            {getSecondaryJourneyTrackingStatusLabel(tracking.status)}
                          </span>
                        </div>
                        {tracking.eventoTitulo ? (
                          <p className="text-sm text-mar-escuro/55">Evento de referência: {tracking.eventoTitulo}</p>
                        ) : null}
                        <label className="block">
                          <span className="mb-2 block text-xs font-medium uppercase tracking-wide text-mar-escuro/45">Título</span>
                          <input
                            type="text"
                            name="titulo"
                            defaultValue={tracking.titulo}
                            className="w-full rounded-xl border border-mar-areia/40 px-4 py-3 text-sm focus:border-mar-azul focus:outline-none focus:ring-1 focus:ring-mar-azul"
                            required
                          />
                        </label>
                        <label className="block">
                          <span className="mb-2 block text-xs font-medium uppercase tracking-wide text-mar-escuro/45">Resumo</span>
                          <textarea
                            name="resumo"
                            defaultValue={tracking.resumo}
                            rows={4}
                            className="w-full rounded-xl border border-mar-areia/40 px-4 py-3 text-sm focus:border-mar-azul focus:outline-none focus:ring-1 focus:ring-mar-azul"
                            required
                          />
                        </label>
                        <div className="grid gap-3 md:grid-cols-2">
                          <label className="block">
                            <span className="mb-2 block text-xs font-medium uppercase tracking-wide text-mar-escuro/45">Status</span>
                            <select
                              name="status"
                              defaultValue={tracking.status}
                              className="w-full rounded-xl border border-mar-areia/40 px-4 py-3 text-sm focus:border-mar-azul focus:outline-none focus:ring-1 focus:ring-mar-azul"
                            >
                              <option value="aberto">Aberto</option>
                              <option value="em_andamento">Em andamento</option>
                              <option value="concluido">Concluído</option>
                            </select>
                          </label>
                          <label className="block">
                            <span className="mb-2 block text-xs font-medium uppercase tracking-wide text-mar-escuro/45">Próximo alinhamento</span>
                            <textarea
                              name="proximoPasso"
                              defaultValue={tracking.proximoPasso ?? ""}
                              rows={3}
                              className="w-full rounded-xl border border-mar-areia/40 px-4 py-3 text-sm focus:border-mar-azul focus:outline-none focus:ring-1 focus:ring-mar-azul"
                            />
                          </label>
                        </div>
                        <label className="block">
                          <span className="mb-2 block text-xs font-medium uppercase tracking-wide text-mar-escuro/45">Dúvidas ou apoio necessário</span>
                          <textarea
                            name="apoioNecessario"
                            defaultValue={tracking.apoioNecessario ?? ""}
                            rows={3}
                            className="w-full rounded-xl border border-mar-areia/40 px-4 py-3 text-sm focus:border-mar-azul focus:outline-none focus:ring-1 focus:ring-mar-azul"
                          />
                        </label>
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <p className="text-xs uppercase tracking-wide text-mar-escuro/40">
                            Atualizado em {formatDate(tracking.updatedAt)}
                          </p>
                          <div className="flex flex-wrap items-center gap-3">
                            <button type="submit" className="btn-secondary inline-flex text-sm">
                              Atualizar registro
                            </button>
                            <Link href={`/app/voluntario/tracking/${tracking.id}`} className="inline-flex items-center gap-1 text-sm font-medium text-mar-azul">
                              Ver detalhes <ArrowRight className="h-4 w-4" />
                            </Link>
                          </div>
                        </div>
                      </form>
                    </div>
                  )) : (
                    <p className="text-sm leading-relaxed text-mar-escuro/60">
                      Ainda não há registros estruturados desta jornada. Use o formulário ao lado para abrir o primeiro alinhamento.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-mar-areia/30 bg-white p-6 lg:col-span-3">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="font-serif text-2xl font-bold text-mar-escuro">Converse e se aproxime</h2>
                <p className="mt-1 text-sm text-mar-escuro/55">Tópicos recentes para entrar na conversa com a comunidade do projeto.</p>
              </div>
              <Link href={volunteerHistoryHref} className="inline-flex items-center gap-1 text-sm font-medium text-mar-azul">
                Ver fórum <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="space-y-3">
              {data.recentTopics.length > 0 ? data.recentTopics.map((topic) => (
                <Link key={topic.id} href={`/forum/${topic.id}`} className="block rounded-xl border border-mar-areia/30 p-4 transition-colors hover:border-mar-azul/30">
                  <div className="flex items-center gap-2 text-sm font-medium text-mar-azul">
                    <MessageCircleHeart className="w-4 h-4" />
                    Fórum
                  </div>
                  <h3 className="mt-2 font-medium text-mar-escuro">{topic.titulo}</h3>
                  <p className="mt-2 text-sm text-mar-escuro/55">{formatDate(topic.createdAt)}</p>
                </Link>
              )) : (
                <div className="rounded-xl border border-dashed border-mar-areia/40 p-4 text-sm text-mar-escuro/55">
                  Ainda não há conversas abertas para aproximar novas pessoas da comunidade.
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
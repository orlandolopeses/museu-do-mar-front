import Link from "next/link";
import { count, eq } from "drizzle-orm";
import { createSecondaryJourneyTracking, updateSecondaryJourneyTracking } from "@/app/app/secondary-journey-tracking-actions";
import { requireScholarAccess } from "@/lib/access";
import { CopyTextButton } from "@/components/ui/CopyTextButton";
import { db } from "@/lib/db";
import { buildMailtoLink, buildOperationalWhatsAppShareText, buildWhatsAppShareLink, joinShareLines } from "@/lib/gestor-sharing";
import { extractRoles } from "@/lib/permissions";
import { getUpcomingPublicEventsForUser } from "@/lib/public-event-access";
import { getRecentSecondaryJourneyTrackings, getSecondaryJourneyTrackingStatusLabel } from "@/lib/secondary-journey-tracking";
import { acervo, forumTopicos, posts } from "@/lib/schema";
import { formatDate } from "@/lib/utils";
import { ArrowRight, BookOpen, Calendar, ClipboardList, Mail, MessageSquareShare, MessagesSquare, ScrollText, SquarePen } from "lucide-react";

type BolsistaDashboardPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type ScholarAgendaItem = {
  id: string;
  titulo: string;
  dataInicio: Date;
  local: string | null;
};

type ScholarFocusItem = {
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

function buildScholarFocus(evento: ScholarAgendaItem | undefined, postTitle: string | undefined, acervoTitle: string | undefined) {
  const items: ScholarFocusItem[] = [];

  if (evento) {
    const daysUntil = getDaysUntil(evento.dataInicio);
    if (daysUntil <= 2) {
      items.push({ label: `Preparar apoio imediato para ${evento.titulo}`, tone: "cobre" });
    } else if (daysUntil <= 7) {
      items.push({ label: `Abrir acompanhamento da próxima frente pública: ${evento.titulo}`, tone: "azul" });
    } else {
      items.push({ label: `Mapear com antecedência a frente ${evento.titulo}`, tone: "verde" });
    }
  }

  if (postTitle) {
    items.push({ label: `Usar a leitura recente “${postTitle}” como base de repertório`, tone: "azul" });
  }

  if (acervoTitle) {
    items.push({ label: `Separar o item de acervo “${acervoTitle}” para estudo ou apoio`, tone: "verde" });
  }

  items.push({ label: "Entrar nas conversas recentes para registrar dúvidas, pistas e devolutivas", tone: "cobre" });

  return items;
}

function buildScholarTrackingHref(options: {
  userName: string;
  userEmail: string;
  nextEvent: ScholarAgendaItem | undefined;
  nextPostTitle: string | undefined;
  nextAcervoTitle: string | undefined;
}) {
  const { userName, userEmail, nextEvent, nextPostTitle, nextAcervoTitle } = options;
  const nextEventLabel = nextEvent ? `${nextEvent.titulo} (${formatDate(nextEvent.dataInicio)})` : "Sem evento imediato no recorte atual";
  const nextPostLabel = nextPostTitle ?? "Sem leitura recente destacada";
  const nextAcervoLabel = nextAcervoTitle ?? "Sem item de acervo em destaque";
  const titleBase = nextEvent ? `Acompanhamento do bolsista · ${nextEvent.titulo}` : "Acompanhamento do bolsista · Frente em curso";
  const content = [
    "Frente acompanhada:",
    nextEventLabel,
    "",
    "Leitura em foco:",
    nextPostLabel,
    "",
    "Acervo de referência:",
    nextAcervoLabel,
    "",
    "Apoio realizado nesta rodada:",
    "-",
    "",
    "Dúvidas, pistas ou travas percebidas:",
    "-",
    "",
    "Próximo passo sugerido ao time:",
    "-",
  ].join("\n");

  const params = new URLSearchParams({
    origem: "bolsista",
    titulo: titleBase,
    conteudo: content,
    autorNome: userName,
    autorEmail: userEmail,
  });

  return `/forum/novo?${params.toString()}`;
}

async function getScholarDashboardData(userId: string, canViewAllInstitutions: boolean) {
  const [publishedPosts] = await db.select({ value: count() }).from(posts).where(eq(posts.status, "publicado"));
  const eventData = await getUpcomingPublicEventsForUser({ userId, canViewAllInstitutions, limit: 3 });

  const latestPosts = await db
    .select({ id: posts.id, slug: posts.slug, title: posts.title, publishedAt: posts.publishedAt })
    .from(posts)
    .where(eq(posts.status, "publicado"))
    .orderBy(posts.publishedAt)
    .limit(3);

  const latestTopics = await db
    .select({ id: forumTopicos.id, titulo: forumTopicos.titulo, createdAt: forumTopicos.createdAt })
    .from(forumTopicos)
    .orderBy(forumTopicos.createdAt)
    .limit(3);

  const highlightedAcervo = await db
    .select({ id: acervo.id, titulo: acervo.titulo, tipo: acervo.tipo })
    .from(acervo)
    .where(eq(acervo.publicado, true))
    .orderBy(acervo.createdAt)
    .limit(3);

  const immediateAgenda = eventData.upcomingAgenda.filter((evento) => getDaysUntil(evento.dataInicio) <= 7);
  const scholarFocus = buildScholarFocus(eventData.upcomingAgenda[0], latestPosts[0]?.title, highlightedAcervo[0]?.titulo);
  const recentTrackings = await getRecentSecondaryJourneyTrackings({ origin: "bolsista", userId, limit: 3 });

  return {
    publishedPosts: publishedPosts?.value ?? 0,
    upcomingEvents: eventData.upcomingEventsCount,
    upcomingAgenda: eventData.upcomingAgenda,
    isInstitutionScoped: eventData.isInstitutionScoped,
    latestPosts,
    latestTopics,
    highlightedAcervo,
    immediateAgendaCount: immediateAgenda.length,
    scholarFocus,
    recentTrackings,
  };
}

export default async function BolsistaDashboardPage({ searchParams }: BolsistaDashboardPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const trackingState = getSearchParam(resolvedSearchParams, "tracking");
  const session = await requireScholarAccess();
  const roles = extractRoles(session);
  const canViewAllInstitutions = roles.includes("superadmin");
  const data = await getScholarDashboardData(session.user.id, canViewAllInstitutions);
  const scholarTrackingHref = buildScholarTrackingHref({
    userName: session.user.name ?? "",
    userEmail: session.user.email ?? "",
    nextEvent: data.upcomingAgenda[0],
    nextPostTitle: data.latestPosts[0]?.title,
    nextAcervoTitle: data.highlightedAcervo[0]?.titulo,
  });
  const scholarHistoryHref = "/forum?origem=bolsista";
  const structuredTrackingTitle = data.upcomingAgenda[0]
    ? `Acompanhamento estruturado · ${data.upcomingAgenda[0].titulo}`
    : "Acompanhamento estruturado · Frente em curso";
  const structuredTrackingSummary = data.scholarFocus.map((item) => `- ${item.label}`).join("\n");
  const scholarScopeLabel = data.upcomingAgenda[0]?.titulo ?? "frente de apoio em curso";
  const scholarShortSummary = joinShareLines([
    "Síntese rápida da jornada do bolsista",
    `Frente: ${scholarScopeLabel}`,
    `Estado: ${data.immediateAgendaCount} frente(s) imediata(s), ${data.latestPosts.length} leitura(s) recente(s) e ${data.highlightedAcervo.length} item(ns) de acervo útil(is).`,
    data.scholarFocus[0] ? `Ação: ${data.scholarFocus[0].label}` : "Ação: organizar a próxima rodada de apoio com leitura, acervo e devolutiva.",
    data.upcomingAgenda[0] ? `Próximo marco: ${data.upcomingAgenda[0].titulo} em ${formatDate(data.upcomingAgenda[0].dataInicio)}.` : "Próximo marco: ainda sem evento futuro no recorte atual.",
  ]);
  const scholarFullSummary = joinShareLines([
    "Resumo da jornada do bolsista",
    `Gerado em ${formatDate(new Date())}`,
    "",
    `Frente em foco: ${scholarScopeLabel}`,
    `Frentes imediatas: ${data.immediateAgendaCount}`,
    `Leituras recentes: ${data.latestPosts.length}`,
    `Itens de acervo em destaque: ${data.highlightedAcervo.length}`,
    data.scholarFocus[0] ? `Ação sugerida: ${data.scholarFocus[0].label}` : "Ação sugerida: organizar a próxima rodada de apoio com leitura, acervo e devolutiva.",
    data.upcomingAgenda[0] ? `Próximo evento: ${data.upcomingAgenda[0].titulo} em ${formatDate(data.upcomingAgenda[0].dataInicio)}${data.upcomingAgenda[0].local ? ` · ${data.upcomingAgenda[0].local}` : ""}.` : "Próximo evento: ainda sem oportunidade futura no recorte atual.",
    data.highlightedAcervo[0] ? `Acervo de referência: ${data.highlightedAcervo[0].titulo}.` : "Acervo de referência: ainda sem item destacado.",
  ]);
  const scholarMailtoHref = buildMailtoLink(null, "Resumo da jornada do bolsista", scholarFullSummary);
  const scholarWhatsAppHref = buildWhatsAppShareLink(
    buildOperationalWhatsAppShareText({
      heading: "Jornada do bolsista",
      state: `${data.immediateAgendaCount} frente(s) imediata(s), ${data.latestPosts.length} leitura(s), ${data.highlightedAcervo.length} referência(s) de acervo.`,
      action: data.scholarFocus[0]?.label ?? "organizar a próxima rodada de apoio com leitura, acervo e devolutiva.",
      ctaPath: "/app/bolsista",
      checkpoint: data.upcomingAgenda[0] ? `${data.upcomingAgenda[0].titulo} em ${formatDate(data.upcomingAgenda[0].dataInicio)}.` : null,
    }),
  );

  return (
    <div className="p-8 md:p-10">
      <div className="max-w-6xl">
        <div className="mb-10 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-sm font-medium uppercase tracking-wide text-mar-azul">
            <ScrollText className="w-4 h-4" />
            Jornada do Bolsista
          </div>
          <h1 className="font-serif text-4xl font-bold text-mar-escuro">Painel de apoio e acompanhamento</h1>
          <p className="max-w-3xl leading-relaxed text-mar-escuro/60">
            Área inicial para bolsistas acompanharem repertório do projeto, atividades públicas e frentes de apoio em pesquisa, operação e documentação.
          </p>
          {data.isInstitutionScoped ? (
            <p className="text-sm text-mar-escuro/45">Agenda futura filtrada pela sua rede institucional vinculada.</p>
          ) : null}
          {trackingState === "created" ? (
            <div className="rounded-xl border border-mar-verde/30 bg-mar-verde/10 px-4 py-3 text-sm text-mar-escuro/75">
              Acompanhamento estruturado salvo nesta jornada.
            </div>
          ) : null}
          {trackingState === "updated" ? (
            <div className="rounded-xl border border-mar-verde/30 bg-mar-verde/10 px-4 py-3 text-sm text-mar-escuro/75">
              Registro recente atualizado nesta jornada.
            </div>
          ) : null}
          {trackingState === "invalid" ? (
            <div className="rounded-xl border border-mar-cobre/30 bg-mar-cobre/10 px-4 py-3 text-sm text-mar-escuro/75">
              Preencha ao menos o título e o resumo para registrar a rodada.
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
            { label: "Posts publicados", value: data.publishedPosts, icon: BookOpen, tone: "text-mar-azul bg-mar-azul/10" },
            { label: "Eventos futuros", value: data.upcomingEvents, icon: Calendar, tone: "text-mar-cobre bg-mar-cobre/10" },
            { label: "Frentes imediatas", value: data.immediateAgendaCount, icon: ClipboardList, tone: "text-mar-verde bg-mar-verde/10" },
            { label: "Tópicos recentes", value: data.latestTopics.length, icon: MessagesSquare, tone: "text-mar-verde bg-mar-verde/10" },
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
              <h2 className="mt-2 font-serif text-2xl font-bold text-mar-escuro">Leitura curta da rodada de apoio</h2>
              <p className="mt-2 text-sm leading-relaxed text-mar-escuro/60">
                Síntese rápida para compartilhar com supervisão, coordenação ou rede de pesquisa sem sair da jornada do bolsista.
              </p>
              <div className="mt-4 whitespace-pre-line rounded-xl bg-mar-creme p-4 text-sm leading-relaxed text-mar-escuro/70">
                {scholarShortSummary}
              </div>
            </div>

            <div className="flex flex-wrap gap-3 lg:max-w-sm lg:justify-end">
              <CopyTextButton
                text={scholarShortSummary}
                label="Copiar resumo"
                copiedLabel="Resumo copiado"
                className="inline-flex items-center gap-2 rounded-full border border-mar-cobre/25 bg-white px-4 py-2 text-sm font-medium text-mar-cobre transition-colors hover:border-mar-cobre/45"
              />
              <a
                href={scholarMailtoHref}
                className="inline-flex items-center gap-2 rounded-full border border-mar-areia/40 bg-white px-4 py-2 text-sm font-medium text-mar-azul transition-colors hover:border-mar-azul/30"
              >
                <Mail className="h-4 w-4" />
                Abrir e-mail
              </a>
              <a
                href={scholarWhatsAppHref}
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

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-mar-areia/30 bg-white p-6 lg:col-span-2">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="font-serif text-2xl font-bold text-mar-escuro">Foco imediato do bolsista</h2>
                <p className="mt-1 text-sm text-mar-escuro/55">Síntese prática para conectar repertório, agenda e documentação sem abrir outro fluxo.</p>
              </div>
            </div>
            <div className="grid gap-4 lg:grid-cols-[0.9fr,1.1fr]">
              <div className="rounded-xl bg-mar-creme/60 p-5">
                <p className="text-xs font-medium uppercase tracking-wide text-mar-cobre">Próxima janela</p>
                {data.upcomingAgenda[0] ? (
                  <>
                    <h3 className="mt-2 font-serif text-2xl font-bold text-mar-escuro">{data.upcomingAgenda[0].titulo}</h3>
                    <p className="mt-2 text-sm text-mar-escuro/60">{formatDate(data.upcomingAgenda[0].dataInicio)}</p>
                    <p className="mt-1 text-sm text-mar-escuro/60">{data.upcomingAgenda[0].local ?? "Local ainda não confirmado"}</p>
                  </>
                ) : (
                  <p className="mt-2 text-sm text-mar-escuro/60">Sem evento próximo no recorte atual.</p>
                )}
              </div>
              <ul className="space-y-3 text-sm leading-relaxed text-mar-escuro/65">
                {data.scholarFocus.map((item) => (
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
          </section>

          <section className="rounded-2xl border border-mar-areia/30 bg-white p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="font-serif text-2xl font-bold text-mar-escuro">Frentes para acompanhar</h2>
                <p className="mt-1 text-sm text-mar-escuro/55">Referências públicas que ajudam a sustentar pesquisa, registro e operação.</p>
              </div>
              <Link href="/blog" className="inline-flex items-center gap-1 text-sm font-medium text-mar-azul">
                Ver blog <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="space-y-3">
              {data.latestPosts.length > 0 ? data.latestPosts.map((post) => (
                <Link key={post.id} href={`/blog/${post.slug}`} className="block rounded-xl border border-mar-areia/30 p-4 transition-colors hover:border-mar-azul/30">
                  <h3 className="font-medium text-mar-escuro">{post.title}</h3>
                  <p className="mt-2 text-sm text-mar-escuro/55">{formatDate(post.publishedAt)}</p>
                </Link>
              )) : (
                <div className="rounded-xl border border-dashed border-mar-areia/40 p-4 text-sm text-mar-escuro/55">
                  Ainda não há leituras públicas recentes para apoiar esta frente.
                </div>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-mar-areia/30 bg-white p-6">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-mar-verde">
              <ClipboardList className="w-4 h-4" />
              Próximo passo sugerido
            </div>
            <div className="space-y-4">
              <div className="rounded-xl border border-mar-areia/30 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-mar-escuro/45">Trilha sugerida</p>
                <p className="mt-2 text-sm leading-relaxed text-mar-escuro/65">
                  Converter este painel em um fluxo de acompanhamento por frente, com registro do que foi lido, apoiado e devolvido ao time.
                </p>
              </div>
              <ul className="space-y-3 text-sm leading-relaxed text-mar-escuro/65">
                <li>• quadro de tarefas e entregas por frente de atuação;</li>
                <li>• registro de apoio em pesquisa, curadoria e comunicação;</li>
                <li>• acompanhamento de vínculos institucionais e supervisão.</li>
              </ul>
              <div className="rounded-xl border border-mar-areia/30 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-mar-cobre">Frente A ativa</p>
                    <p className="mt-2 text-sm leading-relaxed text-mar-escuro/65">
                      Este painel já aceita registro estruturado da rodada de apoio. O fórum segue disponível como trilha complementar e memória aberta.
                    </p>
                  </div>
                </div>
                <form action={createSecondaryJourneyTracking} className="mt-4 space-y-4">
                  <input type="hidden" name="origin" value="bolsista" />
                  <input type="hidden" name="referenciaEventoId" value={data.upcomingAgenda[0]?.id ?? ""} />
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
                    <span className="mb-2 block text-sm font-medium text-mar-escuro">Resumo da rodada</span>
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
                        defaultValue="em_andamento"
                        className="w-full rounded-xl border border-mar-areia/40 px-4 py-3 text-sm focus:border-mar-azul focus:outline-none focus:ring-1 focus:ring-mar-azul"
                      >
                        <option value="aberto">Aberto</option>
                        <option value="em_andamento">Em andamento</option>
                        <option value="concluido">Concluído</option>
                      </select>
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-mar-escuro">Próximo passo</span>
                      <textarea
                        name="proximoPasso"
                        defaultValue={data.upcomingAgenda[0] ? `Devolver leitura e apoio conectados à frente ${data.upcomingAgenda[0].titulo}.` : "Definir devolutiva e próximo passo com o time."}
                        rows={3}
                        className="w-full rounded-xl border border-mar-areia/40 px-4 py-3 text-sm focus:border-mar-azul focus:outline-none focus:ring-1 focus:ring-mar-azul"
                      />
                    </label>
                  </div>
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-mar-escuro">Apoio necessário</span>
                    <textarea
                      name="apoioNecessario"
                      defaultValue=""
                      rows={3}
                      placeholder="Ex.: validação de curadoria, checagem de referência, articulação com comunicação."
                      className="w-full rounded-xl border border-mar-areia/40 px-4 py-3 text-sm focus:border-mar-azul focus:outline-none focus:ring-1 focus:ring-mar-azul"
                    />
                  </label>
                  <div className="flex flex-wrap gap-3">
                    <button type="submit" className="btn-primary inline-flex">
                      <ClipboardList className="h-4 w-4" />
                      Salvar acompanhamento
                    </button>
                    <Link href={scholarTrackingHref} className="inline-flex items-center gap-1 text-sm font-medium text-mar-azul">
                      Registrar no fórum <SquarePen className="w-4 h-4" />
                    </Link>
                    <Link href={scholarHistoryHref} className="inline-flex items-center gap-1 text-sm font-medium text-mar-azul">
                      Ver histórico no fórum <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </form>
                <div className="mt-5 rounded-xl bg-mar-creme/60 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-mar-escuro/45">Seus registros recentes</p>
                  <div className="mt-3 space-y-3">
                    {data.recentTrackings.length > 0 ? data.recentTrackings.map((tracking) => (
                      <div key={tracking.id} className="rounded-xl border border-mar-areia/30 bg-white p-4">
                        <form action={updateSecondaryJourneyTracking} className="space-y-3">
                          <input type="hidden" name="origin" value="bolsista" />
                          <input type="hidden" name="trackingId" value={tracking.id} />
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-xs font-medium uppercase tracking-wide text-mar-escuro/45">
                              Registro recente
                            </p>
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
                              <span className="mb-2 block text-xs font-medium uppercase tracking-wide text-mar-escuro/45">Próximo passo</span>
                              <textarea
                                name="proximoPasso"
                                defaultValue={tracking.proximoPasso ?? ""}
                                rows={3}
                                className="w-full rounded-xl border border-mar-areia/40 px-4 py-3 text-sm focus:border-mar-azul focus:outline-none focus:ring-1 focus:ring-mar-azul"
                              />
                            </label>
                          </div>
                          <label className="block">
                            <span className="mb-2 block text-xs font-medium uppercase tracking-wide text-mar-escuro/45">Apoio necessário</span>
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
                            <button type="submit" className="btn-secondary inline-flex text-sm">
                              Atualizar registro
                            </button>
                          </div>
                        </form>
                      </div>
                    )) : (
                      <p className="text-sm leading-relaxed text-mar-escuro/60">
                        Ainda não há registros estruturados nesta jornada. Use o formulário acima para abrir a primeira rodada.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-mar-areia/30 bg-white p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="font-serif text-2xl font-bold text-mar-escuro">Acervo para referência</h2>
                <p className="mt-1 text-sm text-mar-escuro/55">Itens úteis para estudo, apoio e contextualização de frentes do projeto.</p>
              </div>
              <Link href="/acervo" className="inline-flex items-center gap-1 text-sm font-medium text-mar-azul">
                Ver acervo <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="space-y-3">
              {data.highlightedAcervo.length > 0 ? data.highlightedAcervo.map((item) => (
                <Link key={item.id} href={`/acervo/${item.id}`} className="block rounded-xl border border-mar-areia/30 p-4 transition-colors hover:border-mar-azul/30">
                  <h3 className="font-medium text-mar-escuro">{item.titulo}</h3>
                  <p className="mt-2 text-sm text-mar-escuro/55">Tipo: {item.tipo}</p>
                </Link>
              )) : (
                <div className="rounded-xl border border-dashed border-mar-areia/40 p-4 text-sm text-mar-escuro/55">
                  O acervo ainda não oferece itens publicados suficientes para esta trilha de referência.
                </div>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-mar-areia/30 bg-white p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="font-serif text-2xl font-bold text-mar-escuro">Conversas recentes</h2>
                <p className="mt-1 text-sm text-mar-escuro/55">Tópicos abertos que ajudam a orientar escuta e documentação.</p>
              </div>
              <Link href="/forum" className="inline-flex items-center gap-1 text-sm font-medium text-mar-azul">
                Ver fórum <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="space-y-3">
              {data.latestTopics.length > 0 ? data.latestTopics.map((topic) => (
                <Link key={topic.id} href={`/forum/${topic.id}`} className="block rounded-xl border border-mar-areia/30 p-4 transition-colors hover:border-mar-azul/30">
                  <h3 className="font-medium text-mar-escuro">{topic.titulo}</h3>
                  <p className="mt-2 text-sm text-mar-escuro/55">{formatDate(topic.createdAt)}</p>
                </Link>
              )) : (
                <div className="rounded-xl border border-dashed border-mar-areia/40 p-4 text-sm text-mar-escuro/55">
                  Ainda não há conversas recentes abertas para orientar escuta e documentação.
                </div>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-mar-areia/30 bg-white p-6 lg:col-span-2">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="font-serif text-2xl font-bold text-mar-escuro">Janelas de apoio por evento</h2>
                <p className="mt-1 text-sm text-mar-escuro/55">Eventos futuros já traduzidos em oportunidades de estudo, apoio e documentação.</p>
              </div>
              <Link href="/agenda" className="inline-flex items-center gap-1 text-sm font-medium text-mar-azul">
                Ver agenda <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid gap-4 lg:grid-cols-3">
              {data.upcomingAgenda.length > 0 ? data.upcomingAgenda.map((evento) => (
                <Link key={evento.id} href={`/agenda/${evento.id}`} className="block rounded-xl border border-mar-areia/30 p-4 transition-colors hover:border-mar-azul/30">
                  <div className="flex items-center gap-2 text-sm font-medium text-mar-cobre">
                    <Calendar className="w-4 h-4" />
                    {getDaysUntil(evento.dataInicio) <= 0 ? "Hoje" : getDaysUntil(evento.dataInicio) === 1 ? "Amanhã" : `Em ${getDaysUntil(evento.dataInicio)} dias`}
                  </div>
                  <h3 className="mt-2 font-medium text-mar-escuro">{evento.titulo}</h3>
                  <p className="mt-2 text-sm text-mar-escuro/55">{formatDate(evento.dataInicio)}</p>
                  <p className="mt-1 text-sm text-mar-escuro/55">{evento.local ?? "Local ainda não confirmado"}</p>
                </Link>
              )) : (
                <div className="rounded-xl border border-dashed border-mar-areia/40 p-4 text-sm text-mar-escuro/55 lg:col-span-3">
                  Não há eventos futuros suficientes para abrir janelas de apoio no recorte atual.
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
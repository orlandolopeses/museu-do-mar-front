import Link from "next/link";
import { createSecondaryJourneyTracking, updateSecondaryJourneyTracking } from "@/app/app/secondary-journey-tracking-actions";
import { requireProductionAccess } from "@/lib/access";
import { CopyTextButton } from "@/components/ui/CopyTextButton";
import { db } from "@/lib/db";
import { buildMailtoLink, buildOperationalWhatsAppShareText, buildWhatsAppShareLink, joinShareLines } from "@/lib/gestor-sharing";
import { extractRoles } from "@/lib/permissions";
import { getUpcomingPublicEventsForUser } from "@/lib/public-event-access";
import { getRecentSecondaryJourneyTrackings, getSecondaryJourneyTrackingStatusLabel } from "@/lib/secondary-journey-tracking";
import { forumTopicos } from "@/lib/schema";
import { formatDate } from "@/lib/utils";
import { ArrowRight, Calendar, ClipboardList, Mail, MapPinned, MessageSquareShare, ScrollText, SquarePen, Users, Wrench } from "lucide-react";

type EquipeProducaoPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type ProductionAgendaItem = {
  id: string;
  titulo: string;
  dataInicio: Date;
  local: string | null;
};

type ProductionChecklistItem = {
  label: string;
  tone: "cobre" | "verde" | "azul";
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

function buildProductionChecklist(evento: ProductionAgendaItem): ProductionChecklistItem[] {
  const daysUntil = getDaysUntil(evento.dataInicio);
  const checklist: ProductionChecklistItem[] = [];

  if (!evento.local) {
    checklist.push({ label: "Definir local, acesso e ponto de encontro", tone: "cobre" });
  } else {
    checklist.push({ label: `Revisar chegada, montagem e apoio em ${evento.local}`, tone: "verde" });
  }

  if (daysUntil <= 2) {
    checklist.push({ label: "Fechar escala, recepção e materiais críticos", tone: "cobre" });
  } else if (daysUntil <= 7) {
    checklist.push({ label: "Confirmar equipe, fluxo do dia e responsáveis", tone: "azul" });
  } else {
    checklist.push({ label: "Distribuir frente responsável e janela de preparação", tone: "verde" });
  }

  checklist.push({ label: "Alinhar devolutiva com comunicação e coordenação", tone: "azul" });

  return checklist;
}

function buildProductionTrackingHref(options: {
  userName: string;
  userEmail: string;
  nextEvent: ProductionAgendaItem | undefined;
  checklist: ProductionChecklistItem[];
}) {
  const { userName, userEmail, nextEvent, checklist } = options;
  const eventLabel = nextEvent ? `${nextEvent.titulo} (${formatDate(nextEvent.dataInicio)})` : "Sem frente operacional imediata no recorte atual";
  const locationLabel = nextEvent?.local ?? "Local ainda pendente";
  const checklistLines = checklist.length > 0 ? checklist.map((item) => `- ${item.label}`).join("\n") : "-";
  const titleBase = nextEvent ? `Produção em acompanhamento · ${nextEvent.titulo}` : "Produção em acompanhamento · Frente operacional";
  const content = [
    "Frente operacional acompanhada:",
    eventLabel,
    "",
    "Local e logística:",
    locationLabel,
    "",
    "Checklist desta rodada:",
    checklistLines,
    "",
    "Pendências ou travas de execução:",
    "-",
    "",
    "Responsáveis ou apoios acionados:",
    "-",
    "",
    "Próximo checkpoint:",
    "-",
  ].join("\n");

  const params = new URLSearchParams({
    origem: "equipe-producao",
    titulo: titleBase,
    conteudo: content,
    autorNome: userName,
    autorEmail: userEmail,
  });

  return `/forum/novo?${params.toString()}`;
}

async function getProductionDashboardData(userId: string, canViewAllInstitutions: boolean) {
  const eventData = await getUpcomingPublicEventsForUser({ userId, canViewAllInstitutions, limit: 4 });
  const recentTopics = await db
    .select({ id: forumTopicos.id, titulo: forumTopicos.titulo, createdAt: forumTopicos.createdAt })
    .from(forumTopicos)
    .orderBy(forumTopicos.createdAt)
    .limit(3);

  const immediateEvents = eventData.upcomingAgenda.filter((evento) => getDaysUntil(evento.dataInicio) <= 7);
  const eventsWithoutLocation = eventData.upcomingAgenda.filter((evento) => !evento.local).length;
  const operationalChecklists = eventData.upcomingAgenda.map((evento) => ({
    ...evento,
    daysUntil: getDaysUntil(evento.dataInicio),
    checklist: buildProductionChecklist(evento),
  }));
  const recentTrackings = await getRecentSecondaryJourneyTrackings({ origin: "equipe-producao", userId, limit: 3 });

  return {
    upcomingEvents: eventData.upcomingEventsCount,
    upcomingAgenda: eventData.upcomingAgenda,
    isInstitutionScoped: eventData.isInstitutionScoped,
    recentTopics,
    immediateEventsCount: immediateEvents.length,
    eventsWithoutLocation,
    operationalChecklists,
    recentTrackings,
  };
}

export default async function EquipeProducaoPage({ searchParams }: EquipeProducaoPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const trackingState = getSearchParam(resolvedSearchParams, "tracking");
  const session = await requireProductionAccess();
  const roles = extractRoles(session);
  const canViewAllInstitutions = roles.includes("superadmin");
  const data = await getProductionDashboardData(session.user.id, canViewAllInstitutions);
  const productionTrackingHref = buildProductionTrackingHref({
    userName: session.user.name ?? "",
    userEmail: session.user.email ?? "",
    nextEvent: data.operationalChecklists[0],
    checklist: data.operationalChecklists[0]?.checklist ?? [],
  });
  const productionHistoryHref = "/forum?origem=equipe-producao";
  const structuredTrackingTitle = data.operationalChecklists[0]
    ? `Checkpoint estruturado · ${data.operationalChecklists[0].titulo}`
    : "Checkpoint estruturado · Frente operacional";
  const structuredTrackingSummary = data.operationalChecklists[0]?.checklist.map((item) => `- ${item.label}`).join("\n")
    ?? "- Registrar pendências, responsáveis e próximo checkpoint desta frente.";
  const productionShortSummary = joinShareLines([
    "Síntese rápida da jornada da equipe de produção",
    `Frente: ${data.operationalChecklists[0]?.titulo ?? "frente operacional em aberto"}`,
    `Estado: ${data.immediateEventsCount} frente(s) imediata(s), ${data.eventsWithoutLocation} local(is) pendente(s) e ${data.recentTopics.length} conversa(s) recente(s).`,
    data.operationalChecklists[0]?.checklist[0] ? `Ação: ${data.operationalChecklists[0].checklist[0].label}` : "Ação: fechar pendências críticas, responsáveis e próximo checkpoint.",
    data.operationalChecklists[0] ? `Próximo marco: ${data.operationalChecklists[0].titulo} em ${formatDate(data.operationalChecklists[0].dataInicio)}.` : "Próximo marco: ainda sem frente futura no recorte atual.",
  ]);
  const productionFullSummary = joinShareLines([
    "Resumo da jornada da equipe de produção",
    `Gerado em ${formatDate(new Date())}`,
    "",
    `Frente operacional em foco: ${data.operationalChecklists[0]?.titulo ?? "frente operacional em aberto"}`,
    `Frentes imediatas: ${data.immediateEventsCount}`,
    `Locais pendentes: ${data.eventsWithoutLocation}`,
    `Conversas recentes: ${data.recentTopics.length}`,
    data.operationalChecklists[0]?.checklist[0] ? `Ação sugerida: ${data.operationalChecklists[0].checklist[0].label}` : "Ação sugerida: fechar pendências críticas, responsáveis e próximo checkpoint.",
    data.operationalChecklists[0] ? `Próximo evento: ${data.operationalChecklists[0].titulo} em ${formatDate(data.operationalChecklists[0].dataInicio)}${data.operationalChecklists[0].local ? ` · ${data.operationalChecklists[0].local}` : ""}.` : "Próximo evento: ainda sem frente futura no recorte atual.",
    data.recentTopics[0] ? `Conversa útil para destravar: ${data.recentTopics[0].titulo}.` : "Conversa útil para destravar: ainda sem tópico recente no recorte.",
  ]);
  const productionMailtoHref = buildMailtoLink(null, "Resumo da jornada da equipe de produção", productionFullSummary);
  const productionWhatsAppHref = buildWhatsAppShareLink(
    buildOperationalWhatsAppShareText({
      heading: "Jornada da equipe de produção",
      state: `${data.immediateEventsCount} frente(s) imediata(s), ${data.eventsWithoutLocation} local(is) pendente(s), ${data.recentTopics.length} conversa(s) recente(s).`,
      action: data.operationalChecklists[0]?.checklist[0]?.label ?? "fechar pendências críticas, responsáveis e próximo checkpoint.",
      ctaPath: "/app/equipe-producao",
      checkpoint: data.operationalChecklists[0] ? `${data.operationalChecklists[0].titulo} em ${formatDate(data.operationalChecklists[0].dataInicio)}.` : null,
    }),
  );

  return (
    <div className="p-8 md:p-10">
      <div className="max-w-6xl">
        <div className="mb-10 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-sm font-medium uppercase tracking-wide text-mar-azul">
            <Wrench className="w-4 h-4" />
            Jornada da Equipe de Produção
          </div>
          <h1 className="font-serif text-4xl font-bold text-mar-escuro">Painel operacional</h1>
          <p className="max-w-3xl leading-relaxed text-mar-escuro/60">
            Área inicial para leitura de agenda, organização de ações em campo e preparação das próximas camadas de acompanhamento operacional do projeto.
          </p>
          {data.isInstitutionScoped ? (
            <p className="text-sm text-mar-escuro/45">Agenda operacional filtrada pelas instituições vinculadas à sua atuação atual.</p>
          ) : null}
          {trackingState === "created" ? (
            <div className="rounded-xl border border-mar-verde/30 bg-mar-verde/10 px-4 py-3 text-sm text-mar-escuro/75">
              Checkpoint operacional salvo na jornada.
            </div>
          ) : null}
          {trackingState === "updated" ? (
            <div className="rounded-xl border border-mar-verde/30 bg-mar-verde/10 px-4 py-3 text-sm text-mar-escuro/75">
              Checkpoint recente atualizado nesta jornada.
            </div>
          ) : null}
          {trackingState === "invalid" ? (
            <div className="rounded-xl border border-mar-cobre/30 bg-mar-cobre/10 px-4 py-3 text-sm text-mar-escuro/75">
              Preencha título e resumo para registrar o checkpoint operacional.
            </div>
          ) : null}
          {trackingState === "invalid-update" ? (
            <div className="rounded-xl border border-mar-cobre/30 bg-mar-cobre/10 px-4 py-3 text-sm text-mar-escuro/75">
              Preencha título e resumo para atualizar o checkpoint recente.
            </div>
          ) : null}
          {trackingState === "not-found" ? (
            <div className="rounded-xl border border-mar-cobre/30 bg-mar-cobre/10 px-4 py-3 text-sm text-mar-escuro/75">
              Não foi possível localizar este checkpoint recente na sua jornada.
            </div>
          ) : null}
        </div>

        <div className="mb-10 grid gap-5 md:grid-cols-3">
          {[
            { label: "Eventos futuros", value: data.upcomingEvents, icon: Calendar, tone: "text-mar-cobre bg-mar-cobre/10" },
            { label: "Frentes imediatas", value: data.immediateEventsCount, icon: ClipboardList, tone: "text-mar-verde bg-mar-verde/10" },
            { label: "Conversas recentes", value: data.recentTopics.length, icon: Users, tone: "text-mar-azul bg-mar-azul/10" },
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
              <h2 className="mt-2 font-serif text-2xl font-bold text-mar-escuro">Leitura curta da frente operacional</h2>
              <p className="mt-2 text-sm leading-relaxed text-mar-escuro/60">
                Síntese rápida para compartilhar com coordenação, comunicação ou equipe de campo sem sair da jornada de produção.
              </p>
              <div className="mt-4 whitespace-pre-line rounded-xl bg-mar-creme p-4 text-sm leading-relaxed text-mar-escuro/70">
                {productionShortSummary}
              </div>
            </div>

            <div className="flex flex-wrap gap-3 lg:max-w-sm lg:justify-end">
              <CopyTextButton
                text={productionShortSummary}
                label="Copiar resumo"
                copiedLabel="Resumo copiado"
                className="inline-flex items-center gap-2 rounded-full border border-mar-cobre/25 bg-white px-4 py-2 text-sm font-medium text-mar-cobre transition-colors hover:border-mar-cobre/45"
              />
              <a
                href={productionMailtoHref}
                className="inline-flex items-center gap-2 rounded-full border border-mar-areia/40 bg-white px-4 py-2 text-sm font-medium text-mar-azul transition-colors hover:border-mar-azul/30"
              >
                <Mail className="h-4 w-4" />
                Abrir e-mail
              </a>
              <a
                href={productionWhatsAppHref}
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

        <div className="grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
          <section className="rounded-2xl border border-mar-areia/30 bg-white p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="font-serif text-2xl font-bold text-mar-escuro">Agenda de execução</h2>
                <p className="mt-1 text-sm text-mar-escuro/55">
                  {data.isInstitutionScoped
                    ? "Eventos das instituições em que sua equipe atua formalmente."
                    : "Eventos que demandam articulação logística e presença operacional."}
                </p>
              </div>
              <Link href="/agenda" className="inline-flex items-center gap-1 text-sm font-medium text-mar-azul">
                Ver agenda <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="space-y-3">
              {data.operationalChecklists.length > 0 ? data.operationalChecklists.map((evento) => (
                <Link key={evento.id} href={`/agenda/${evento.id}`} className="block rounded-xl border border-mar-areia/30 p-4 transition-colors hover:border-mar-azul/30">
                  <div className="flex flex-wrap items-center gap-2 text-xs font-medium uppercase tracking-wide text-mar-cobre">
                    <span>Execução</span>
                    <span className="text-mar-escuro/35">•</span>
                    <span>{evento.daysUntil <= 0 ? "Hoje" : evento.daysUntil === 1 ? "Amanhã" : `Em ${evento.daysUntil} dias`}</span>
                  </div>
                  <h3 className="mt-2 font-medium text-mar-escuro">{evento.titulo}</h3>
                  <p className="mt-2 text-sm text-mar-escuro/55">{formatDate(evento.dataInicio)}</p>
                  <p className="mt-1 text-sm text-mar-escuro/55">{evento.local ?? "Local ainda não definido"}</p>
                </Link>
              )) : (
                <div className="rounded-xl border border-dashed border-mar-areia/40 p-4 text-sm text-mar-escuro/55">
                  Nenhum evento futuro disponível para acompanhamento operacional no recorte atual.
                </div>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-mar-areia/30 bg-white p-6">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-mar-cobre">
              <MapPinned className="w-4 h-4" />
              Ponto de atenção imediato
            </div>
            {data.operationalChecklists[0] ? (
              <div className="space-y-4">
                <div className="rounded-xl bg-mar-creme/60 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-mar-cobre">Próxima frente</p>
                  <h3 className="mt-2 font-serif text-2xl font-bold text-mar-escuro">{data.operationalChecklists[0].titulo}</h3>
                  <p className="mt-2 text-sm text-mar-escuro/60">{formatDate(data.operationalChecklists[0].dataInicio)}</p>
                  <p className="mt-1 text-sm text-mar-escuro/60">{data.operationalChecklists[0].local ?? "Local ainda pendente de definição"}</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-mar-areia/30 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-mar-escuro/45">Eventos em até 7 dias</p>
                    <p className="mt-2 font-serif text-3xl font-bold text-mar-escuro">{data.immediateEventsCount}</p>
                  </div>
                  <div className="rounded-xl border border-mar-areia/30 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-mar-escuro/45">Locais pendentes</p>
                    <p className="mt-2 font-serif text-3xl font-bold text-mar-escuro">{data.eventsWithoutLocation}</p>
                  </div>
                </div>
                <ul className="space-y-3 text-sm leading-relaxed text-mar-escuro/65">
                  {data.operationalChecklists[0].checklist.map((item) => (
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
              <p className="text-sm leading-relaxed text-mar-escuro/65">Sem frente imediata aberta no recorte atual.</p>
            )}
          </section>

          <section className="rounded-2xl border border-mar-areia/30 bg-white p-6 lg:col-span-2">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="font-serif text-2xl font-bold text-mar-escuro">Checklist por evento</h2>
                <p className="mt-1 text-sm text-mar-escuro/55">Leitura operacional rápida para abrir preparação, deslocamento e devolutiva sem depender de um módulo novo.</p>
              </div>
              <Link href={productionTrackingHref} className="inline-flex items-center gap-1 text-sm font-medium text-mar-azul">
                Registrar checkpoint <SquarePen className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              {data.operationalChecklists.map((evento) => (
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
                    {evento.checklist.map((item) => (
                      <li key={item.label}>• {item.label}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div className="mt-5 grid gap-4 lg:grid-cols-[1.05fr,0.95fr]">
              <div className="rounded-xl border border-mar-areia/30 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-mar-cobre">Frente A ativa</p>
                <p className="mt-2 text-sm leading-relaxed text-mar-escuro/65">
                  Esta jornada já aceita checkpoint estruturado de execução. O fórum permanece como trilha aberta para alinhamentos mais amplos com produção, comunicação e coordenação.
                </p>
                <form action={createSecondaryJourneyTracking} className="mt-4 space-y-4">
                  <input type="hidden" name="origin" value="equipe-producao" />
                  <input type="hidden" name="referenciaEventoId" value={data.operationalChecklists[0]?.id ?? ""} />
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
                    <span className="mb-2 block text-sm font-medium text-mar-escuro">Resumo do checkpoint</span>
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
                      <span className="mb-2 block text-sm font-medium text-mar-escuro">Próximo checkpoint</span>
                      <textarea
                        name="proximoPasso"
                        defaultValue={data.operationalChecklists[0] ? `Fechar pendências e rodada de responsáveis para ${data.operationalChecklists[0].titulo}.` : "Definir próximo checkpoint com responsáveis e prazo."}
                        rows={3}
                        className="w-full rounded-xl border border-mar-areia/40 px-4 py-3 text-sm focus:border-mar-azul focus:outline-none focus:ring-1 focus:ring-mar-azul"
                      />
                    </label>
                  </div>
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-mar-escuro">Pendências ou apoio necessário</span>
                    <textarea
                      name="apoioNecessario"
                      defaultValue=""
                      rows={3}
                      placeholder="Ex.: confirmar local, escala, materiais críticos, articulação com comunicação."
                      className="w-full rounded-xl border border-mar-areia/40 px-4 py-3 text-sm focus:border-mar-azul focus:outline-none focus:ring-1 focus:ring-mar-azul"
                    />
                  </label>
                  <div className="flex flex-wrap gap-3">
                    <button type="submit" className="btn-primary inline-flex">
                      <ClipboardList className="h-4 w-4" />
                      Salvar checkpoint
                    </button>
                    <Link href={productionTrackingHref} className="inline-flex items-center gap-1 text-sm font-medium text-mar-azul">
                      Registrar no fórum <SquarePen className="w-4 h-4" />
                    </Link>
                    <Link href={productionHistoryHref} className="inline-flex items-center gap-1 text-sm font-medium text-mar-azul">
                      Ver histórico no fórum <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </form>
              </div>
              <div className="rounded-xl bg-mar-azul/5 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-mar-escuro/45">Seus checkpoints recentes</p>
                <div className="mt-3 space-y-3">
                  {data.recentTrackings.length > 0 ? data.recentTrackings.map((tracking) => (
                    <div key={tracking.id} className="rounded-xl border border-mar-areia/30 bg-white p-4">
                      <form action={updateSecondaryJourneyTracking} className="space-y-3">
                        <input type="hidden" name="origin" value="equipe-producao" />
                        <input type="hidden" name="trackingId" value={tracking.id} />
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-xs font-medium uppercase tracking-wide text-mar-escuro/45">
                            Checkpoint recente
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
                            <span className="mb-2 block text-xs font-medium uppercase tracking-wide text-mar-escuro/45">Próximo checkpoint</span>
                            <textarea
                              name="proximoPasso"
                              defaultValue={tracking.proximoPasso ?? ""}
                              rows={3}
                              className="w-full rounded-xl border border-mar-areia/40 px-4 py-3 text-sm focus:border-mar-azul focus:outline-none focus:ring-1 focus:ring-mar-azul"
                            />
                          </label>
                        </div>
                        <label className="block">
                          <span className="mb-2 block text-xs font-medium uppercase tracking-wide text-mar-escuro/45">Pendências ou apoio necessário</span>
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
                            Atualizar checkpoint
                          </button>
                        </div>
                      </form>
                    </div>
                  )) : (
                    <p className="text-sm leading-relaxed text-mar-escuro/60">
                      Ainda não há checkpoints estruturados. Use o formulário ao lado para abrir o primeiro registro operacional.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-mar-areia/30 bg-white p-6 lg:col-span-2">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="font-serif text-2xl font-bold text-mar-escuro">Conversas para destravar</h2>
                <p className="mt-1 text-sm text-mar-escuro/55">Tópicos recentes que podem virar alinhamento entre produção, comunicação e rede.</p>
              </div>
              <Link href={productionHistoryHref} className="inline-flex items-center gap-1 text-sm font-medium text-mar-azul">
                Ver fórum <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid gap-3 lg:grid-cols-3">
              {data.recentTopics.length > 0 ? data.recentTopics.map((topic) => (
                <Link key={topic.id} href={`/forum/${topic.id}`} className="block rounded-xl border border-mar-areia/30 p-4 transition-colors hover:border-mar-azul/30">
                  <div className="flex items-center gap-2 text-sm font-medium text-mar-azul">
                    <Users className="w-4 h-4" />
                    Conversa aberta
                  </div>
                  <h3 className="mt-2 font-medium text-mar-escuro">{topic.titulo}</h3>
                  <p className="mt-2 text-sm text-mar-escuro/55">{formatDate(topic.createdAt)}</p>
                </Link>
              )) : (
                <div className="rounded-xl border border-dashed border-mar-areia/40 p-4 text-sm text-mar-escuro/55 lg:col-span-3">
                  Ainda não há tópicos recentes para destravar a frente operacional.
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
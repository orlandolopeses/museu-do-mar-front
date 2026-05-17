import Link from "next/link";
import { redirect } from "next/navigation";
import { requireGestorAccess } from "@/lib/access";
import { getEducationalManagerSnapshot } from "@/lib/educational-manager-snapshot";
import { extractRoles } from "@/lib/permissions";
import { getSecondaryJourneyTrackingStatusLabel, secondaryJourneyOriginMeta } from "@/lib/secondary-journey-tracking";
import { AlertTriangle, ArrowRight, BookOpen, ClipboardList, Download, LineChart, School, Users } from "lucide-react";

function buildGestorHref(params: {
  periodo?: "30d" | "90d" | "365d" | "todos";
  jornada?: "bolsista" | "voluntario" | "equipe-producao";
  checkpointStatus?: "aberto" | "em_andamento" | "concluido";
}) {
  const query = new URLSearchParams();

  if (params.periodo) query.set("periodo", params.periodo);
  if (params.jornada) query.set("jornada", params.jornada);
  if (params.checkpointStatus) query.set("checkpointStatus", params.checkpointStatus);

  return `/app/gestor${query.size > 0 ? `?${query.toString()}` : ""}`;
}

export default async function GestorEducacionalDashboardPage() {
  const session = await requireGestorAccess();
  const roles = extractRoles(session);
  const isEducationalManager = roles.includes("gestor_educacional") || roles.includes("superadmin");
  const userId = session.user?.id ?? "";
  const canViewAllInstitutions = roles.includes("superadmin");

  if (!isEducationalManager) {
    redirect("/app/gestor");
  }

  const snapshot = await getEducationalManagerSnapshot({
    userId,
    canViewAllInstitutions,
  });

  const quickLinks = [
    {
      id: "coord-geral",
      title: "Coordenação pedagógica geral",
      description: "Abrir o painel completo com recorte de 90 dias para leitura executiva da rede.",
      href: buildGestorHref({ periodo: "90d" }),
      cta: "Abrir painel geral",
      icon: LineChart,
      tone: "text-mar-azul bg-mar-azul/10",
    },
    {
      id: "checkpoint-aberto",
      title: "Checkpoints em aberto",
      description: "Focar nas jornadas secundárias que ainda aguardam encaminhamento institucional.",
      href: buildGestorHref({ periodo: "90d", checkpointStatus: "aberto" }),
      cta: `Ver ${getSecondaryJourneyTrackingStatusLabel("aberto").toLowerCase()}`,
      icon: ClipboardList,
      tone: "text-mar-cobre bg-mar-cobre/10",
    },
    {
      id: "checkpoint-andamento",
      title: "Checkpoints em andamento",
      description: "Acompanhar ações já iniciadas para evitar perda de cadência entre rede e responsáveis.",
      href: buildGestorHref({ periodo: "90d", checkpointStatus: "em_andamento" }),
      cta: `Ver ${getSecondaryJourneyTrackingStatusLabel("em_andamento").toLowerCase()}`,
      icon: BookOpen,
      tone: "text-mar-verde bg-mar-verde/10",
    },
  ];

  const journeyLinks: Array<{ id: "bolsista" | "voluntario" | "equipe-producao"; subtitle: string }> = [
    {
      id: "bolsista",
      subtitle: "Mapear acompanhamento formativo e apoiar devolutivas ligadas à escola e ao território.",
    },
    {
      id: "voluntario",
      subtitle: "Conectar frentes de apoio comunitário aos objetivos pedagógicos em andamento.",
    },
    {
      id: "equipe-producao",
      subtitle: "Acompanhar execução de campo e checkpoints operacionais que afetam as turmas.",
    },
  ];

  return (
    <div className="p-8 md:p-10">
      <div className="mx-auto max-w-6xl">
        <header className="mb-10 flex flex-col gap-3">
          <div className="inline-flex w-fit items-center gap-2 rounded-full bg-mar-azul/10 px-4 py-2 text-xs font-medium uppercase tracking-wide text-mar-azul">
            <School className="h-4 w-4" />
            Coordenação pedagógica
          </div>
          <h1 className="font-serif text-4xl font-bold text-mar-escuro">Gestor educacional</h1>
          <p className="max-w-3xl text-sm leading-relaxed text-mar-escuro/60">
            Hub de entrada para coordenação pedagógica: acompanhe checkpoints, priorize jornadas secundárias e entre no painel do gestor já com filtros prontos.
          </p>
        </header>

        <section className="mb-10 rounded-2xl border border-mar-areia/30 bg-white p-6">
          <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-mar-cobre">Leitura pedagógica</p>
              <h2 className="font-serif text-2xl font-bold text-mar-escuro">Recorte dos últimos {snapshot.windowDays} dias</h2>
              <p className="mt-1 text-sm leading-relaxed text-mar-escuro/60">
                Síntese operacional da rede acessível a este perfil antes de abrir o painel completo do gestor.
              </p>
            </div>
            <Link
              href={buildGestorHref({ periodo: "90d" })}
              className="inline-flex items-center gap-2 text-sm font-medium text-mar-azul hover:text-mar-azul/80"
            >
              Abrir painel completo
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mb-6 grid gap-4 md:grid-cols-4">
            <article className="rounded-xl border border-mar-areia/30 bg-mar-creme/40 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-mar-escuro/45">Instituições</p>
              <p className="mt-2 font-serif text-3xl font-bold text-mar-escuro">{snapshot.institutionsCount}</p>
            </article>
            <article className="rounded-xl border border-mar-areia/30 bg-mar-creme/40 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-mar-escuro/45">Turmas ativas</p>
              <p className="mt-2 font-serif text-3xl font-bold text-mar-escuro">{snapshot.turmasCount}</p>
            </article>
            <article className="rounded-xl border border-mar-areia/30 bg-mar-creme/40 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-mar-escuro/45">Urgência alta</p>
              <p className="mt-2 font-serif text-3xl font-bold text-mar-cobre">{snapshot.urgencySummary.alta}</p>
            </article>
            <article className="rounded-xl border border-mar-areia/30 bg-mar-creme/40 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-mar-escuro/45">Checkpoints abertos</p>
              <p className="mt-2 font-serif text-3xl font-bold text-mar-azul">{snapshot.secondaryJourneyStatusSummary.aberto}</p>
            </article>
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.1fr,0.9fr]">
            <article className="rounded-xl border border-mar-areia/30 p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-medium text-mar-cobre">
                <AlertTriangle className="h-4 w-4" />
                Pontos de atenção
              </div>
              <ul className="space-y-2 text-sm leading-relaxed text-mar-escuro/65">
                {snapshot.attentionPoints.map((point) => (
                  <li key={point}>• {point}</li>
                ))}
              </ul>
            </article>

            <article className="rounded-xl border border-mar-areia/30 p-4">
              <p className="text-sm font-medium text-mar-escuro">Prioridades do recorte</p>
              <div className="mt-4 space-y-3 text-sm leading-relaxed text-mar-escuro/65">
                {snapshot.priorityInstitution ? (
                  <p>
                    Instituição em destaque:{" "}
                    <Link href={`/app/gestor/instituicoes/${snapshot.priorityInstitution.id}`} className="font-medium text-mar-azul hover:text-mar-azul/80">
                      {snapshot.priorityInstitution.nome}
                    </Link>
                    {snapshot.priorityInstitution.highPriorityCount > 0
                      ? ` · ${snapshot.priorityInstitution.highPriorityCount} atividade(s) crítica(s)`
                      : " · sem urgência alta explícita"}
                  </p>
                ) : (
                  <p>Nenhuma instituição priorizada neste recorte.</p>
                )}
                {snapshot.priorityTurma ? (
                  <p>
                    Turma em destaque:{" "}
                    <Link href={`/app/gestor/turmas/${snapshot.priorityTurma.id}`} className="font-medium text-mar-azul hover:text-mar-azul/80">
                      {snapshot.priorityTurma.nome}
                    </Link>
                    {snapshot.priorityTurma.highPriorityCount > 0
                      ? ` · ${snapshot.priorityTurma.highPriorityCount} atividade(s) crítica(s)`
                      : " · sem urgência alta explícita"}
                  </p>
                ) : (
                  <p>Nenhuma turma priorizada neste recorte.</p>
                )}
              </div>
            </article>
          </div>
        </section>

        <section className="mb-10 rounded-2xl border border-mar-areia/30 bg-white p-6">
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-mar-cobre">Checkpoints recentes</p>
              <h2 className="font-serif text-2xl font-bold text-mar-escuro">Jornadas secundárias no recorte</h2>
              <p className="mt-1 text-sm leading-relaxed text-mar-escuro/60">
                Últimos acompanhamentos registrados na rede acessível, prontos para abrir no painel do gestor.
              </p>
            </div>
            <Link
              href="/app/gestor/exportar?period=90d&formato=resumo"
              className="inline-flex items-center gap-2 text-sm font-medium text-mar-azul hover:text-mar-azul/80"
            >
              Exportar resumo
              <Download className="h-4 w-4" />
            </Link>
          </div>

          {snapshot.recentSecondaryJourneyTrackings.length > 0 ? (
            <div className="space-y-3">
              {snapshot.recentSecondaryJourneyTrackings.map((tracking) => {
                const originMeta = secondaryJourneyOriginMeta[tracking.origin];
                return (
                  <article key={tracking.id} className="rounded-xl border border-mar-areia/30 bg-mar-creme/40 p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-mar-escuro/45">
                          {originMeta.label} · {getSecondaryJourneyTrackingStatusLabel(tracking.status)}
                        </p>
                        <h3 className="mt-1 font-medium text-mar-escuro">{tracking.titulo}</h3>
                        <p className="mt-2 text-sm leading-relaxed text-mar-escuro/60">
                          {tracking.userName}
                          {tracking.instituicoes.length > 0 ? ` · ${tracking.instituicoes.join(" · ")}` : ""}
                        </p>
                      </div>
                      <Link
                        href={buildGestorHref({
                          periodo: "90d",
                          jornada: tracking.origin,
                          checkpointStatus: tracking.status,
                        })}
                        className="inline-flex items-center gap-2 text-sm font-medium text-mar-azul hover:text-mar-azul/80"
                      >
                        Abrir no painel
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="rounded-xl border border-mar-areia/30 bg-mar-creme/40 p-4 text-sm leading-relaxed text-mar-escuro/60">
              Nenhum checkpoint recente foi registrado no recorte dos últimos {snapshot.windowDays} dias.
            </p>
          )}
        </section>

        <section className="mb-10 grid gap-5 md:grid-cols-3">
          {quickLinks.map((item) => (
            <article key={item.id} className="rounded-2xl border border-mar-areia/30 bg-white p-6">
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${item.tone}`}>
                <item.icon className="h-5 w-5" />
              </div>
              <h2 className="mt-4 font-serif text-2xl font-bold text-mar-escuro">{item.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-mar-escuro/60">{item.description}</p>
              <Link href={item.href} className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-mar-azul hover:text-mar-azul/80">
                {item.cta}
              </Link>
            </article>
          ))}
        </section>

        <section className="rounded-2xl border border-mar-areia/30 bg-white p-6">
          <div className="mb-4 flex items-center gap-2 text-sm font-medium uppercase tracking-wide text-mar-cobre">
            <Users className="h-4 w-4" />
            Jornadas secundárias
          </div>
          <p className="mb-6 text-sm leading-relaxed text-mar-escuro/60">
            Atalhos para leitura por origem de jornada com recorte padrão de 90 dias.
          </p>
          <div className="grid gap-4 md:grid-cols-3">
            {journeyLinks.map((item) => {
              const meta = secondaryJourneyOriginMeta[item.id];
              return (
                <article key={item.id} className="rounded-xl border border-mar-areia/30 bg-mar-creme/40 p-4">
                  <h3 className="font-medium text-mar-escuro">{meta.label}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-mar-escuro/60">{item.subtitle}</p>
                  <Link
                    href={buildGestorHref({ periodo: "90d", jornada: item.id })}
                    className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-mar-azul hover:text-mar-azul/80"
                  >
                    Abrir recorte
                  </Link>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}

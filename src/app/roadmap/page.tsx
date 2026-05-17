import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  Gauge,
  GitBranch,
  ListChecks,
  Milestone,
  TimerReset,
  TrendingUp,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Roadmap de Implementação",
  description:
    "Acompanhe a progressão estimada do roadmap de implementação do site do Museu do Mar em formato de gráfico de Gantt.",
};

const roadmapWindows = [
  { label: "Mar", year: "2026" },
  { label: "Abr", year: "2026" },
  { label: "Mai", year: "2026" },
  { label: "Jun", year: "2026" },
  { label: "Jul", year: "2026" },
  { label: "Ago", year: "2026" },
  { label: "Set", year: "2026" },
  { label: "Out", year: "2026" },
] as const;

const currentWindowIndex = 2;

const roadmapPhases = [
  {
    title: "Fase 1 — Consolidação da base operacional",
    status: "Concluída",
    progress: 100,
    weight: 28,
    start: 0,
    end: 1,
    windowLabel: "Mar-Abr 2026",
    focus: "Operação publicada, deploy reproduzível e fechamento fino de segredos externos.",
    summary:
      "A fundação pública e autenticada do site entrou em operação real e permanece estável. Google OAuth validado ponta a ponta em produção. Incidente de colisão de porta (PM2) identificado, resolvido e documentado. Esta fase está encerrada.",
    delivered: [
      "Build, lint, smoke tests, bootstrap e validação local completa estabilizados",
      "Deploy remoto endurecido com preflight, db:bootstrap e restart do serviço",
      "Domínio público respondendo em HTTPS com home, roadmap e login administrativo ativos",
      "Google OAuth validado ponta a ponta em produção no domínio publicado",
      "Incidente PM2/porta 3002 resolvido e runbook de operação VPS documentado",
    ],
    nextSteps: [],
  },
  {
    title: "Fase 2 — RBAC e identidade multiator",
    status: "Concluída",
    progress: 100,
    weight: 24,
    start: 0,
    end: 2,
    windowLabel: "Mar-Mai 2026",
    focus: "Jornadas autenticadas estabilizadas, recorte por papel e síntese operacional entre perfis.",
    summary:
      "Todas as jornadas autenticadas estão operacionais e validadas: professor, gestor, gestor educacional, estudante, produção, bolsista, voluntário e apoiador. A camada de storytelling foi integrada com personagens, portais de entrada e narrativa por perfil.",
    delivered: [
      "Catálogo de perfis ampliado e RBAC persistido no banco",
      "Redirecionamento por papel e onboarding de primeiro acesso com contexto de portal",
      "Jornadas estabilizadas para todos os 8 perfis com smoke tests verdes",
      "Painel do gestor com drill-down institucional, resumos compartilháveis e exportação",
      "Gestor educacional com hub por jornada secundária",
      "Estudante com progresso por turma, trilhas pedagógicas e planos de atividade",
      "Três portais de entrada públicos (Implementação, Participantes, Apoiadores) com narrativa por personagem",
      "Camada de storytelling completa: Turma do Mangue, assets, CharacterRoster e narrativa por portal",
    ],
    nextSteps: [],
  },
  {
    title: "Fase 3 — Núcleo educacional",
    status: "Ativa",
    progress: 62,
    weight: 18,
    start: 2,
    end: 4,
    windowLabel: "Mai-Jul 2026",
    focus: "Coordenação pedagógica por turma, recursos educativos e recorrência de uso escolar.",
    summary:
      "Professor, gestor e estudante já operam com turmas, atividades e trilhas pedagógicas persistidas. A gincana por território entrou em operação como primeira atividade de campo validada publicamente. O foco agora é recorrência: rotinas escolares, conexão acervo-agenda-atividade e aprofundamento dos percursos.",
    delivered: [
      "Painel do professor com síntese por turma, urgência de atividades e agenda educativa",
      "Detalhe pedagógico por turma com filtros, prioridades, criação e edição de atividades",
      "Trilhas pedagógicas persistidas no banco com seed sincronizável por slug",
      "Estudante com progresso por turma, trilhas e planos de atividade por sala de aula",
      "Gincana por território com check-in por GPS, barra de progresso e persistência local",
      "Três gincanas publicadas: Anchieta, Piúma e Perocão",
    ],
    nextSteps: [
      "Conectar acervo, agenda e atividades pedagógicas dentro de um percurso coeso por turma",
      "Introduzir recorrência: rotinas semanais de uso escolar e marcos de acompanhamento",
      "Ampliar trilhas com recursos digitais e conexão à memória oral do território",
    ],
  },
  {
    title: "Fase 4 — Núcleo comunitário e curatorial ampliado",
    status: "Ativa",
    progress: 58,
    weight: 18,
    start: 1,
    end: 5,
    windowLabel: "Abr-Ago 2026",
    focus: "Submissões comunitárias, memória oral e conexões curatoriais.",
    summary:
      "Fórum, agenda, blog e acervo sustentam presença pública consistente. O fluxo de submissão de memórias está estruturado com moderação administrativa. A campanha de memória (Turma do Mangue) conecta a comunidade à plataforma via personagens e gincana de território.",
    delivered: [
      "Fórum público com criação de tópicos e moderação básica",
      "Acervo, agenda e blog publicados com direção editorial consistente",
      "Fluxo de submissão de memórias com moderação (aprovar/rejeitar) no painel admin",
      "Proteções contra abuso em superfícies públicas (honeypot, rate limit)",
      "Campanha de memória pública com personagens, cenas e gincana de território",
    ],
    nextSteps: [
      "Ampliar memória oral: gravações, transcrições e coleções temáticas",
      "Criar exposições digitais conectando acervo, memória e agenda",
      "Aprofundar contexto curatorial entre conteúdos relacionados",
    ],
  },
  {
    title: "Fase 5 — Inteligência institucional e ecossistema",
    status: "Planejada",
    progress: 24,
    weight: 12,
    start: 4,
    end: 7,
    windowLabel: "Jul-Out 2026",
    focus: "Indicadores, governança e articulação com parceiros.",
    summary:
      "A camada de indicadores e governança institucional ainda é expansão futura, mas já tem sinais no dashboard do gestor e nos fluxos de exportação executiva.",
    delivered: [
      "Estratégia e objetivos de governança documentados no roadmap interno",
      "Base arquitetural preparada para expansão institucional",
      "Primeiros resumos executivos e leituras institucionais no painel do gestor",
    ],
    nextSteps: [
      "Criar dashboards por escola e parceiro",
      "Introduzir indicadores de impacto e acompanhamento",
      "Abrir área de imprensa, apoio e articulação institucional",
    ],
  },
] as const;

const roadmapUpdateDate = "27/03/2026";

const globalImplementationTargets = [
  { label: "Mar", value: 70, note: "estado atual" },
  { label: "Abr", value: 75, note: "operação publicada" },
  { label: "Mai", value: 80, note: "jornadas e gestão" },
  { label: "Jun", value: 85, note: "núcleo educacional" },
  { label: "Jul", value: 89, note: "curadoria ampliada" },
  { label: "Ago", value: 93, note: "participação comunitária" },
  { label: "Set", value: 97, note: "governança e indicadores" },
  { label: "Out", value: 100, note: "fechamento do ciclo" },
] as const;

const roadmapWeightSum = roadmapPhases.reduce((sum, phase) => sum + phase.weight, 0);
const globalImplementationProgress = Math.round(
  roadmapPhases.reduce((sum, phase) => sum + phase.progress * phase.weight, 0) / roadmapWeightSum,
);

const highlights = [
  {
    label: "Progresso geral estimado",
    value: `${globalImplementationProgress}%`,
    detail: "Percentual global ponderado entre as frentes do roadmap, calculado sobre maturidade relativa e peso de cada fase.",
    icon: Gauge,
  },
  {
    label: "Frente atual",
    value: "Operação publicada e aprofundamento educacional",
    detail: "O principal gargalo deixou de ser a fundação técnica. O foco atual está em fechar credenciais externas, manter publicação estável e ampliar o valor pedagógico e institucional das jornadas já ativas.",
    icon: TimerReset,
  },
  {
    label: "Última atualização",
    value: roadmapUpdateDate,
    detail: "A página resume o estado operacional conhecido até esta data.",
    icon: Milestone,
  },
] as const;

function phaseBarClass(progress: number) {
  if (progress >= 80) return "bg-mar-verde text-white";
  if (progress >= 40) return "bg-mar-azul text-white";
  return "bg-mar-cobre text-white";
}

function phaseProgressFillClass(progress: number) {
  if (progress >= 80) return "bg-mar-verde/95";
  if (progress >= 40) return "bg-mar-azul/95";
  return "bg-mar-cobre/95";
}

function statusBadgeClass(status: string) {
  if (status === "Consolidada") return "badge-verde";
  if (status === "Madura") return "badge-verde";
  if (status === "Em fechamento") return "badge-verde";
  if (status === "Avançada") return "badge-azul";
  if (status === "Ativa") return "badge-azul";
  if (status === "Inicial") return "badge-cobre";
  return "badge bg-mar-escuro/8 text-mar-escuro";
}

function phaseWindowClass(index: number) {
  if (index === currentWindowIndex) return "border-mar-areia/35 bg-mar-areia/18";
  return "border-mar-escuro/8 bg-white/55";
}

function mobileTrackFillClass(progress: number) {
  if (progress >= 80) return "bg-mar-verde";
  if (progress >= 40) return "bg-mar-azul";
  return "bg-mar-cobre";
}

function globalProgressTone(progress: number) {
  if (progress >= 80) return "text-mar-verde";
  if (progress >= 40) return "text-mar-azul";
  return "text-mar-cobre";
}

export default function RoadmapPage() {
  const timelineColumns = `repeat(${roadmapWindows.length}, minmax(5.25rem, 1fr))`;

  return (
    <div className="py-12 md:py-16">
      <div className="container-site space-y-10">
        <section className="surface-panel overflow-hidden">
          <div className="border-b border-mar-areia/20 bg-mar-escuro px-6 py-10 text-white md:px-10">
            <div className="section-eyebrow text-mar-areia">
              <GitBranch className="h-4 w-4" />
              <span>Roadmap de implementação</span>
            </div>
            <div className="max-w-3xl">
              <h1 className="mb-4 text-4xl font-bold md:text-5xl">Acompanhamento da evolução do site</h1>
              <p className="text-lg leading-relaxed text-white/78">
                Esta página reapresenta o roadmap do Museu do Mar como um gráfico de Gantt executivo,
                mostrando a sobreposição estimada entre frentes, o estágio relativo de cada fase e o foco
                operacional que concentra o trabalho nas próximas janelas.
              </p>
            </div>
          </div>

          <div className="grid gap-4 p-6 md:grid-cols-3 md:p-8">
            {highlights.map((item) => (
              <div key={item.label} className="rounded-2xl border border-mar-areia/20 bg-mar-creme/70 p-5">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-white text-mar-azul shadow-sm">
                  <item.icon className="h-5 w-5" />
                </div>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-mar-cobre">{item.label}</p>
                <p className="mt-2 text-xl font-bold text-mar-escuro">{item.value}</p>
                <p className="mt-2 text-sm leading-relaxed text-mar-escuro/72">{item.detail}</p>
              </div>
            ))}
          </div>

          <div className="border-t border-mar-areia/15 px-6 pb-6 pt-2 md:px-8 md:pb-8">
            <div className="rounded-3xl border border-mar-areia/20 bg-white/70 p-5 md:p-6">
              <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-3xl">
                  <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-mar-cobre">
                    <TrendingUp className="h-4 w-4" />
                    <span>Gantt global de implementação</span>
                  </div>
                  <h2 className="text-2xl font-bold text-mar-azul md:text-3xl">
                    Percentual global lido dentro do cronograma
                  </h2>
                  <p className="mt-3 text-sm leading-relaxed text-mar-escuro/74">
                    Em vez de tratar o avanço total como um número isolado, esta barra resume a implementação
                    global do site sobre o mesmo horizonte do roadmap. O valor atual representa a média
                    ponderada das frentes já abertas no produto.
                  </p>
                </div>
                <div className="rounded-2xl border border-mar-areia/20 bg-mar-creme/70 px-5 py-4 text-center">
                  <p className="text-xs uppercase tracking-[0.18em] text-mar-cobre">Implementação global</p>
                  <p className={`mt-1 text-3xl font-bold ${globalProgressTone(globalImplementationProgress)}`}>
                    {globalImplementationProgress}%
                  </p>
                </div>
              </div>

              <div className="grid gap-3" style={{ gridTemplateColumns: timelineColumns }}>
                {roadmapWindows.map((window, index) => {
                  const checkpoint = globalImplementationTargets[index];
                  return (
                    <div
                      key={`global-window-${window.label}`}
                      className={`rounded-2xl border px-3 py-3 text-center ${phaseWindowClass(index)}`}
                    >
                      <p className="text-xs font-medium uppercase tracking-[0.18em] text-mar-cobre">{window.year}</p>
                      <p className="mt-1 text-lg font-bold text-mar-escuro">{window.label}</p>
                      <p className="mt-2 text-sm font-semibold text-mar-escuro/72">{checkpoint.value}%</p>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 overflow-hidden rounded-full border border-mar-areia/20 bg-mar-escuro/8">
                <div
                  className="flex min-h-[3.5rem] items-center justify-between bg-gradient-to-r from-mar-azul via-mar-verde to-mar-verde px-4 text-xs font-semibold uppercase tracking-[0.14em] text-white"
                  style={{ width: `${globalImplementationProgress}%` }}
                >
                  <span>Estado atual do site</span>
                  <span>{globalImplementationProgress}%</span>
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-4">
                <div className="rounded-2xl border border-mar-areia/15 bg-mar-creme/70 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-mar-cobre">Leitura</p>
                  <p className="mt-2 text-sm leading-relaxed text-mar-escuro/75">
                    O avanço atual combina operação pública já publicada, jornadas autenticadas estabilizadas e uma camada pedagógica que começou a sair da arquitetura e entrar em uso real.
                  </p>
                </div>
                <div className="rounded-2xl border border-mar-areia/15 bg-mar-creme/70 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-mar-cobre">Agora</p>
                  <p className="mt-2 text-sm leading-relaxed text-mar-escuro/75">
                    Março concentra fechamento fino da operação publicada, consistência entre jornada gestora e leitura pedagógica, e pendências externas como Google OAuth no VPS.
                  </p>
                </div>
                <div className="rounded-2xl border border-mar-areia/15 bg-mar-creme/70 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-mar-cobre">Próximo salto</p>
                  <p className="mt-2 text-sm leading-relaxed text-mar-escuro/75">
                    Abril e maio devem converter a base já publicada em recorrência escolar, síntese institucional mais forte e jornadas autenticadas com utilidade ainda mais específica.
                  </p>
                </div>
                <div className="rounded-2xl border border-mar-areia/15 bg-mar-creme/70 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-mar-cobre">Horizonte</p>
                  <p className="mt-2 text-sm leading-relaxed text-mar-escuro/75">
                    O restante do ciclo desloca o foco para recorrência pedagógica, participação curatorial mais densa e uma camada institucional orientada por indicadores.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <div className="surface-panel overflow-hidden p-6 md:p-8">
            <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <h2 className="text-3xl font-bold text-mar-azul">Cronograma executivo em Gantt</h2>
                <p className="mt-3 text-sm leading-relaxed text-mar-escuro/74">
                  As barras representam a janela estimada de cada frente entre março e outubro de 2026. O
                  preenchimento interno mostra o quanto daquela fase já foi consolidado no produto, enquanto
                  o Gantt global acima resume a maturidade agregada do site inteiro no mesmo horizonte.
                </p>
              </div>
              <div className="flex flex-wrap gap-3 text-xs font-medium uppercase tracking-[0.18em] text-mar-escuro/58">
                <span className="rounded-full border border-mar-verde/25 bg-mar-verde/10 px-3 py-2 text-mar-verde">
                  Entrega madura
                </span>
                <span className="rounded-full border border-mar-azul/20 bg-mar-azul/10 px-3 py-2 text-mar-azul">
                  Frente ativa
                </span>
                <span className="rounded-full border border-mar-cobre/20 bg-mar-cobre/10 px-3 py-2 text-mar-cobre">
                  Expansão prevista
                </span>
              </div>
            </div>

            <div className="space-y-4 md:hidden">
              {roadmapPhases.map((phase) => (
                <article key={`${phase.title}-mobile`} className="rounded-3xl border border-mar-areia/20 bg-mar-creme/70 p-5">
                  <div className="mb-3 flex flex-wrap items-center gap-3">
                    <span className={statusBadgeClass(phase.status)}>{phase.status}</span>
                    <span className="text-sm font-medium text-mar-escuro/55">{phase.windowLabel}</span>
                  </div>
                  <h3 className="text-xl font-bold text-mar-azul">{phase.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-mar-escuro/74">{phase.summary}</p>
                  <div className="mt-4 rounded-2xl border border-mar-escuro/8 bg-white/70 p-4">
                    <div className="mb-2 flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-mar-cobre">
                      <span>Janela</span>
                      <span>{phase.progress}%</span>
                    </div>
                    <div className="mb-3 h-3 overflow-hidden rounded-full bg-mar-escuro/10">
                      <div
                        className={`h-full rounded-full ${mobileTrackFillClass(phase.progress)}`}
                        style={{ width: `${phase.progress}%` }}
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {roadmapWindows.slice(phase.start, phase.end + 1).map((window, index) => (
                        <span
                          key={`${phase.title}-mobile-window-${window.label}`}
                          className={`rounded-full border px-3 py-1 text-xs font-medium ${phaseWindowClass(phase.start + index)}`}
                        >
                          {window.label}/{window.year}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="mt-4 rounded-2xl border border-mar-areia/15 bg-white/70 px-4 py-3">
                    <p className="text-xs font-medium uppercase tracking-[0.18em] text-mar-cobre">Foco operacional</p>
                    <p className="mt-2 text-sm leading-relaxed text-mar-escuro/75">{phase.focus}</p>
                  </div>
                </article>
              ))}
            </div>

            <div className="hidden overflow-x-auto pb-2 md:block">
              <div
                className="grid min-w-[980px] gap-x-4 gap-y-4"
                style={{ gridTemplateColumns: "minmax(19rem, 1.15fr) minmax(44rem, 2fr)" }}
              >
                <div className="rounded-3xl border border-mar-areia/20 bg-mar-creme/70 p-5">
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-mar-cobre">Leitura</p>
                  <p className="mt-2 text-lg font-bold text-mar-escuro">Fases e janela prevista</p>
                  <p className="mt-2 text-sm leading-relaxed text-mar-escuro/68">
                    O destaque atual recai sobre operação pública estável, coordenação pedagógica e aprofundamento das jornadas já em runtime.
                  </p>
                </div>

                <div className="grid gap-2" style={{ gridTemplateColumns: timelineColumns }}>
                  {roadmapWindows.map((window, index) => (
                    <div
                      key={`${window.label}-${window.year}`}
                      className={`rounded-2xl border px-3 py-4 text-center ${phaseWindowClass(index)}`}
                    >
                      <p className="text-xs font-medium uppercase tracking-[0.18em] text-mar-cobre">{window.year}</p>
                      <p className="mt-1 text-lg font-bold text-mar-escuro">{window.label}</p>
                      <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-mar-escuro/45">
                        {index === currentWindowIndex ? "Agora" : "Janela"}
                      </p>
                    </div>
                  ))}
                </div>

                {roadmapPhases.map((phase) => (
                  <div key={phase.title} className="contents">
                    <article className="rounded-3xl border border-mar-areia/20 bg-mar-creme/75 p-5">
                      <div className="mb-3 flex flex-wrap items-center gap-3">
                        <span className={statusBadgeClass(phase.status)}>{phase.status}</span>
                        <span className="text-sm font-medium text-mar-escuro/55">{phase.progress}% concluído</span>
                        <span className="text-sm font-medium text-mar-escuro/45">{phase.windowLabel}</span>
                      </div>
                      <h3 className="text-xl font-bold text-mar-azul">{phase.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-mar-escuro/74">{phase.summary}</p>
                      <div className="mt-4 rounded-2xl border border-mar-areia/15 bg-white/70 px-4 py-3">
                        <p className="text-xs font-medium uppercase tracking-[0.18em] text-mar-cobre">Foco operacional</p>
                        <p className="mt-2 text-sm leading-relaxed text-mar-escuro/75">{phase.focus}</p>
                      </div>
                    </article>

                    <div
                      className="grid min-h-[10.5rem] gap-2 rounded-3xl border border-mar-areia/20 bg-mar-creme/45 p-3"
                      style={{ gridTemplateColumns: timelineColumns }}
                    >
                      {roadmapWindows.map((window, index) => (
                        <div
                          key={`${phase.title}-${window.label}`}
                          className={`rounded-2xl border ${phaseWindowClass(index)}`}
                        />
                      ))}

                      <div className="pointer-events-none col-span-full row-start-1 row-end-2 grid" style={{ gridTemplateColumns: timelineColumns }}>
                        <div
                          className={`relative mx-1 my-5 overflow-hidden rounded-full shadow-sm ${phaseBarClass(phase.progress)}`}
                          style={{ gridColumn: `${phase.start + 1} / ${phase.end + 2}` }}
                        >
                          <div className="absolute inset-0 bg-black/10" />
                          <div
                            className={`h-full min-h-[3.25rem] rounded-full ${phaseProgressFillClass(phase.progress)}`}
                            style={{ width: `${phase.progress}%` }}
                          />
                          <div className="absolute inset-0 flex items-center justify-between gap-3 px-4 text-xs font-semibold uppercase tracking-[0.12em] text-white">
                            <span>{phase.windowLabel}</span>
                            <span>{phase.progress}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.6fr,0.9fr]">
            <div className="space-y-5">
              {roadmapPhases.map((phase) => (
                <article key={`${phase.title}-details`} className="surface-panel p-6 md:p-7">
                  <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="mb-3 flex flex-wrap items-center gap-3">
                        <span className={statusBadgeClass(phase.status)}>{phase.status}</span>
                        <span className="text-sm font-medium text-mar-escuro/55">{phase.windowLabel}</span>
                      </div>
                      <h2 className="text-2xl font-bold text-mar-azul">{phase.title}</h2>
                      <p className="mt-3 max-w-3xl text-sm leading-relaxed text-mar-escuro/74">{phase.summary}</p>
                    </div>
                    <div className="min-w-32 rounded-2xl border border-mar-areia/20 bg-mar-creme/70 px-4 py-3 text-center">
                      <p className="text-xs uppercase tracking-[0.18em] text-mar-cobre">Progresso</p>
                      <p className="mt-1 text-2xl font-bold text-mar-escuro">{phase.progress}%</p>
                    </div>
                  </div>

                  <div className="grid gap-5 md:grid-cols-2">
                    <div className="rounded-2xl border border-mar-verde/15 bg-mar-verde/5 p-5">
                      <h3 className="mb-3 flex items-center gap-2 text-lg font-bold text-mar-escuro">
                        <CheckCircle2 className="h-5 w-5 text-mar-verde" />
                        Entregas percebidas
                      </h3>
                      <ul className="space-y-2 text-sm leading-relaxed text-mar-escuro/75">
                        {phase.delivered.map((item) => (
                          <li key={item} className="flex gap-2">
                            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-mar-verde" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="rounded-2xl border border-mar-areia/20 bg-mar-creme/80 p-5">
                      <h3 className="mb-3 flex items-center gap-2 text-lg font-bold text-mar-escuro">
                        <Clock3 className="h-5 w-5 text-mar-cobre" />
                        Próximos passos
                      </h3>
                      <ul className="space-y-2 text-sm leading-relaxed text-mar-escuro/75">
                        {phase.nextSteps.map((item) => (
                          <li key={item} className="flex gap-2">
                            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-mar-cobre" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <aside className="space-y-5">
              <div className="surface-panel p-6">
                <h2 className="mb-4 flex items-center gap-2 text-2xl font-bold text-mar-azul">
                  <ListChecks className="h-5 w-5" />
                  Como ler o Gantt
                </h2>
                <div className="space-y-4 text-sm leading-relaxed text-mar-escuro/75">
                  <p>
                    O acompanhamento é uma <strong>estimativa operacional</strong> construída a partir das
                    entregas já registradas e das pendências ainda abertas na trilha do projeto.
                  </p>
                  <p>
                    A largura de cada barra indica a janela prevista de trabalho, enquanto o percentual mostra
                    a maturidade relativa daquela frente dentro da janela estimada. A barra global usa uma
                    leitura ponderada para sintetizar o percentual total de implementação do site.
                  </p>
                </div>
              </div>

              <div className="surface-panel p-6">
                <h2 className="mb-4 text-2xl font-bold text-mar-azul">Leitura rápida do momento</h2>
                <ul className="space-y-3 text-sm leading-relaxed text-mar-escuro/75">
                  <li className="flex gap-3">
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-mar-verde" />
                    <span>A fundação técnica do site está madura e já empurra o percentual global para acima de metade do ciclo.</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-mar-azul" />
                    <span>A frente multiator já saiu do plano e entrou em operação supervisionável, inclusive na leitura gestora.</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-mar-cobre" />
                    <span>Os próximos saltos dependem de homologação externa, publicação estável e aprofundamento funcional das frentes educacionais e curatoriais.</span>
                  </li>
                </ul>
              </div>

              <div className="surface-panel p-6">
                <h2 className="mb-4 text-2xl font-bold text-mar-azul">Explorar o site</h2>
                <div className="flex flex-col gap-3">
                  <Link href="/sobre" className="btn-secondary justify-center">
                    Conhecer o projeto
                  </Link>
                  <Link href="/app" className="btn-primary justify-center bg-mar-areia text-mar-escuro hover:bg-mar-areia/90">
                    Acessar área do participante <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </aside>
          </div>
        </section>
      </div>
    </div>
  );
}
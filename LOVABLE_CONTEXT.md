# Contexto para Lovable - Redesign da Home do Museu do Mar

Este arquivo contém o código atual da Home (`src/app/page.tsx`) e o CSS global (`src/app/globals.css`). 
Por favor, gere o redesign moderno mantendo a estrutura base (Next.js App Router).

## Arquivo: src/app/page.tsx
```tsx
import Link from "next/link";
import Image from "next/image";
import { db } from "@/lib/db";
import { posts, eventos, acervo } from "@/lib/schema";
import { and, desc, eq, gte } from "drizzle-orm";
import { formatDate, formatDateShort, truncate } from "@/lib/utils";
import {
  Anchor,
  Camera,
  Calendar,
  BookOpen,
  ArrowRight,
  Users,
  GitBranch,
  Gauge,
  ScrollText,
  Sparkles,
  BadgeCheck,
  Megaphone,
  Waves,
  MapPinned,
  HeartHandshake,
} from "lucide-react";
import { RemoteImage } from "@/components/ui/RemoteImage";
import { BrandMark } from "@/components/layout/BrandMark";
import { CharacterRoster } from "@/components/story/CharacterRoster";
import { PortalCampaignLinks } from "@/components/story/PortalCampaignLinks";
import { GincanaPromo } from "@/components/story/GincanaPromo";
import { entryPortals, getEntryPortal } from "@/lib/entry-portals";

async function getRecentPosts() {
  try {
    return await db
      .select()
      .from(posts)
      .where(eq(posts.status, "publicado"))
      .orderBy(desc(posts.publishedAt))
      .limit(3);
  } catch {
    return [];
  }
}

async function getUpcomingEventos() {
  try {
    const now = new Date();
    return await db
      .select()
      .from(eventos)
      .where(and(eq(eventos.publicado, true), gte(eventos.dataInicio, now)))
      .orderBy(eventos.dataInicio)
      .limit(3);
  } catch {
    return [];
  }
}

async function getRecentAcervo() {
  try {
    return await db
      .select()
      .from(acervo)
      .where(eq(acervo.publicado, true))
      .orderBy(desc(acervo.createdAt))
      .limit(6);
  } catch {
    return [];
  }
}

type HomePageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const googleEnabled = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  const params = searchParams ? await searchParams : undefined;
  const rawPortal = typeof params?.portal === "string" ? params.portal : null;
  const selectedPortal = getEntryPortal(rawPortal);
  const [recentPosts, upcomingEventos, recentAcervo] = await Promise.all([
    getRecentPosts(),
    getUpcomingEventos(),
    getRecentAcervo(),
  ]);
  const portalStoryCopy = {
    implementacao: {
      lead: "Para quem move o projeto todos os dias.",
      bullets: ["Bastidores da producao", "Comunicacao e mobilizacao", "Organizacao das frentes locais"],
    },
    participantes: {
      lead: "Para estudantes, professores e voluntarios.",
      bullets: ["Desafios da caca ao tesouro", "Missoes no mangue e na escola", "Aprender brincando com memoria"],
    },
    apoiadores: {
      lead: "Para familias, parceiros e apoiadores da causa.",
      bullets: ["Impacto social na comunidade", "Fortalecimento da memoria local", "Rede de apoio para continuidade"],
    },
  } as const;
  const portalActionLabel = {
    implementacao: "Eu faco parte da equipe",
    participantes: "Quero entrar na aventura",
    apoiadores: "Quero apoiar essa jornada",
  } as const;
  const campaignPortals = [
    { slug: "implementacao", title: entryPortals.implementacao.title },
    { slug: "participantes", title: entryPortals.participantes.title },
    { slug: "apoiadores", title: entryPortals.apoiadores.title },
  ] as const;
  const primaryPortalHref = selectedPortal ? `/admin/login?portal=${selectedPortal.slug}` : "/participar";
  const primaryPortalLabel = selectedPortal ? `Entrar no ${selectedPortal.title}` : "Escolher meu percurso";

  const heroToneByPortal = {
    implementacao:
      "Frente ativa da comunidade: planejamento, producao e mobilizacao para fazer a gincana acontecer.",
    participantes:
      "Trilha viva de estudantes, professores e voluntarios em missoes de descoberta pelo territorio.",
    apoiadores:
      "Rede de cuidado e parceria para transformar memoria em impacto social duradouro.",
  } as const;
  const sceneIllustrations = [
    {
      panel: "Quadro 1",
      title: "Cena 1: Chamado da maré",
      body: "Pedro Cão encontra a turma no cais e dispara o desafio da semana.",
      line: "Bora achar as pistas da nossa historia!",
      imageSrc: "/story/applications/cena-chamado-mare.png",
      imageAlt: "Aplicacao ilustrada do chamado da mare com Pedro, Bia e Ravi",
    },
    {
      panel: "Quadro 2",
      title: "Cena 2: Trilhas no território",
      body: "Familias percorrem escola, praia e mangue em busca de lembrancas e saberes.",
      line: "Cada lugar guarda um pedaço da gente!",
      imageSrc: "/story/applications/cena-trilhas-territorio.png",
      imageAlt: "Aplicacao ilustrada das trilhas no territorio com Ravi, Luna e Pedro",
    },
    {
      panel: "Quadro 3",
      title: "Cena 3: Tesouro coletivo",
      body: "A descoberta final mostra que cuidar da memoria fortalece o futuro da comunidade.",
      line: "Nosso tesouro e nossa identidade!",
      imageSrc: "/story/applications/cena-tesouro-coletivo.png",
      imageAlt: "Aplicacao ilustrada do tesouro coletivo com a turma reunida",
    },
  ] as const;
  const promoChips = ["Gibi comunitario", "Landing de campanha", "Entrada acolhedora"] as const;

  return (
    <>
      {/* Hero narrativo */}
      <section className="story-hero relative overflow-hidden bg-mar-escuro text-white">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/story/applications/cais-perocao-hero-bg.png')" }}
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_12%,rgba(250,240,212,0.34),transparent_34%),radial-gradient(circle_at_88%_16%,rgba(116,194,133,0.15),transparent_28%),linear-gradient(180deg,rgba(16,73,114,0.34)_0%,rgba(7,58,92,0.52)_58%,rgba(6,35,63,0.68)_100%)]" />
        <div className="absolute inset-0 opacity-25" aria-hidden="true">
          <div className="absolute left-[-8%] top-14 h-72 w-72 rounded-full border-2 border-mar-areia/30" />
          <div className="absolute right-[-10%] top-20 h-80 w-80 rounded-full border border-mar-areia/25" />
          <div className="absolute bottom-0 left-0 h-24 w-full bg-[radial-gradient(circle_at_bottom,rgba(212,169,106,0.28),transparent_55%)]" />
        </div>

        <div className="relative container-site py-14 md:py-20">
          <div className="story-hero-panel rounded-3xl border-2 border-mar-areia/35 bg-mar-escuro/40 p-6 shadow-2xl md:p-8">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-mar-areia/45 bg-mar-areia/15 px-4 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-mar-areia">
              <Anchor className="h-3.5 w-3.5" />
              <span>Portal principal de entrada</span>
            </div>

            <div className="story-hero-grid mt-3 grid gap-6 xl:grid-cols-[0.95fr,1.05fr] xl:items-start">
              <div className="story-hero-copy">
                <BrandMark className="mb-6" />

                <div className="mb-4 flex flex-wrap gap-2">
                  {promoChips.map((chip, index) => (
                    <span
                      key={chip}
                      className={`story-chip ${index === 0 ? "story-chip-sand" : index === 1 ? "story-chip-green" : "story-chip-sea"}`}
                    >
                      {chip}
                    </span>
                  ))}
                </div>

                <h1 className="max-w-4xl text-4xl font-bold leading-[1.04] tracking-tight text-white md:text-6xl">
                  Pedro Cão e a Turma do Mangue
                  <span className="block text-mar-areia">te convidam para a caça da memória</span>
                </h1>

                <p className="mt-5 max-w-3xl text-base leading-relaxed text-white/88 md:text-xl">
                  Nao e so visitar: e entrar no jogo da memoria de Perocao. Cada pista chama criancas, familias e
                  vizinhanca para cuidar do territorio e fortalecer quem vive dele.
                </p>

                <div className="story-promo-bubble mt-5 max-w-2xl rounded-2xl border border-mar-areia/50 bg-white/95 px-4 py-3 text-sm font-semibold leading-relaxed text-mar-escuro shadow-[6px_6px_0_rgba(13,33,55,0.22)] md:text-base">
                  Uma landing de campanha precisa acolher, explicar rapido e disparar a vontade de participar.
                </div>

                {selectedPortal && (
                  <p className="mt-4 max-w-3xl rounded-xl border border-mar-areia/45 bg-mar-areia/12 px-3 py-2 text-sm leading-relaxed text-mar-areia md:text-base">
                    <strong className="font-semibold">Portal em destaque:</strong> {selectedPortal.title}. {heroToneByPortal[selectedPortal.slug]}
                  </p>
                )}

                <div className="story-hero-cta mt-7 flex flex-wrap items-center gap-3">
                  <Link href={primaryPortalHref} className="btn-primary bg-mar-areia text-mar-escuro hover:bg-mar-areia/90">
                    {primaryPortalLabel} <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link href="/memoria" className="btn-secondary border-mar-areia/60 text-mar-areia hover:bg-mar-areia hover:text-mar-escuro">
                    Enviar memoria da familia
                  </Link>
                  <Link href="/turma-do-mangue" className="inline-flex items-center gap-1 text-sm font-semibold text-mar-areia/80 underline-offset-2 hover:text-mar-areia hover:underline">
                    Conheca a turma <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>

                <div className="mt-6 grid gap-3 md:grid-cols-3">
                  {[
                    { value: "3", label: "portais conectados", detail: "implementacao, participantes e apoiadores" },
                    { value: "1", label: "campanha viva", detail: "historia unica com entrada por perfil" },
                    { value: "24h", label: "acesso digital", detail: "site aberto para mobilizar a comunidade" },
                  ].map((metric) => (
                    <div key={metric.label} className="product-kpi rounded-2xl border border-white/20 bg-white/10 p-3">
                      <p className="text-2xl font-bold text-mar-areia">{metric.value}</p>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/90">{metric.label}</p>
                      <p className="mt-1 text-xs text-white/70">{metric.detail}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="story-promo-board rounded-[2rem] border-2 border-mar-areia/35 bg-white/10 p-4 shadow-[0_28px_56px_rgba(6,35,63,0.18)]">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <span className="story-chip story-chip-coral">Cartaz principal</span>
                  <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/78">
                    Acolhimento + chamada
                  </span>
                </div>

                <figure className="story-promo-poster relative aspect-[16/11] overflow-hidden rounded-[1.55rem] border-2 border-white/20 bg-white/10">
                  <Image
                    src="/story/applications/hero-turma-mangue-clean.png"
                    alt="Aplicacao editorial da Turma do Mangue para destaque principal da landing"
                    fill
                    sizes="(min-width: 1280px) 46vw, 100vw"
                    className="object-cover"
                  />
                  <div className="story-promo-sticker story-promo-sticker-top">aventura no territorio</div>
                  <div className="story-promo-sticker story-promo-sticker-bottom">personagens-guia da campanha</div>
                </figure>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/18 bg-mar-escuro/28 p-3 text-sm leading-relaxed text-white/82">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-mar-areia">O que esta peca faz</p>
                    <p className="mt-1">Mostra a turma como anfitria da experiencia e transforma a home em convite de campanha.</p>
                  </div>
                  <div className="rounded-2xl border border-white/18 bg-mar-escuro/28 p-3 text-sm leading-relaxed text-white/82">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-mar-areia">Leitura imediata</p>
                    <p className="mt-1">Primeiro acolhe, depois organiza os percursos e so entao aprofunda o projeto.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="story-wave mt-6 rounded-2xl border border-white/25 bg-white/10 p-4">
              <div className="grid gap-4 xl:grid-cols-[0.92fr,1.08fr] xl:items-start">
                <div>
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <Link href="/turma-do-mangue" className="text-xs font-semibold uppercase tracking-[0.16em] text-mar-areia underline-offset-2 hover:underline">
                      Patrulha da memoria
                    </Link>
                    <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/76">
                      personagens anfitrioes
                    </span>
                  </div>
                  <CharacterRoster mode="compact" avatarMood="travesso" className="mb-4" />
                  <div className="grid gap-2 sm:grid-cols-3">
                    {[
                      "Linguagem leve para criancas e familias",
                      "Convite claro para acao e participacao",
                      "Identidade visual de campanha comunitaria",
                    ].map((item) => (
                      <div key={item} className="rounded-xl border border-white/16 bg-mar-escuro/18 px-3 py-2 text-xs leading-relaxed text-white/78">
                        {item}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-mar-areia">Mapa da aventura</p>
                    <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/76">
                      roteiro promocional
                    </span>
                  </div>
                  <svg viewBox="0 0 860 180" className="story-wave-trail h-28 w-full md:h-32" role="img" aria-label="Trilha da gincana no territorio">
                    <defs>
                      <linearGradient id="trailSea" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#8BD2EF" stopOpacity="0.85" />
                        <stop offset="100%" stopColor="#2F89BA" stopOpacity="0.65" />
                      </linearGradient>
                    </defs>
                    <rect x="0" y="0" width="860" height="180" rx="20" fill="url(#trailSea)" opacity="0.24" />
                    <path d="M30 132 C150 55, 250 72, 360 118 C468 163, 590 156, 820 74" fill="none" stroke="#F6CD6A" strokeWidth="10" strokeLinecap="round" />
                    <path d="M46 143 C158 72, 258 86, 364 129 C470 172, 595 167, 807 89" fill="none" stroke="white" strokeOpacity="0.7" strokeWidth="4" strokeDasharray="12 8" />
                    <circle cx="80" cy="132" r="18" fill="#FF8158" />
                    <circle cx="362" cy="118" r="18" fill="#4DB06C" />
                    <circle cx="816" cy="74" r="18" fill="#FFD166" />
                    <text x="56" y="137" fill="white" fontSize="14">Inicio</text>
                    <text x="333" y="123" fill="white" fontSize="14">Pistas</text>
                    <text x="786" y="79" fill="#18364E" fontSize="14">Tesouro</text>
                  </svg>
                  <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/76">
                    A landing precisa contar a jornada em tres tempos: chamado, descoberta e conquista coletiva.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-7 grid gap-4 md:grid-cols-3">
              {sceneIllustrations.map((scene) => (
                <article key={scene.title} className="story-scene rounded-2xl border border-white/25 bg-white/95 p-4 backdrop-blur-sm">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <span className="story-chip story-chip-sand bg-mar-areia text-mar-escuro">{scene.panel}</span>
                    <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-mar-escuro/55">capitulo da campanha</span>
                  </div>
                  <div className="story-scene-figure relative mb-4 aspect-[16/10] overflow-hidden rounded-2xl border border-white/20 bg-white/10">
                    <Image
                      src={scene.imageSrc}
                      alt={scene.imageAlt}
                      fill
                      sizes="(min-width: 768px) 30vw, 100vw"
                      className="object-cover"
                    />
                  </div>
                  <h2 className="font-serif text-xl font-bold text-mar-escuro">{scene.title}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-mar-escuro/78">{scene.body}</p>
                  <p className="story-bubble mt-3 inline-block rounded-xl border px-3 py-1 text-xs font-semibold">
                    &quot;{scene.line}&quot;
                  </p>
                </article>
              ))}
            </div>

            <div className="story-route mt-6 rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-mar-areia">Mapa da aventura</p>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                {[
                  {
                    icon: Waves,
                    title: "Cais e maré",
                    body: "A turma se encontra no cais e começa a jornada de pistas.",
                  },
                  {
                    icon: MapPinned,
                    title: "Mangue e escola",
                    body: "As pistas conectam território, sala de aula e memória viva.",
                  },
                  {
                    icon: HeartHandshake,
                    title: "Praça e comunidade",
                    body: "A descoberta final vira ação coletiva para o bairro.",
                  },
                ].map((stop) => (
                  <article key={stop.title} className="story-stop rounded-xl border border-white/20 bg-white/10 p-3">
                    <div className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-mar-areia/25 text-mar-areia">
                      <stop.icon className="h-4 w-4" />
                    </div>
                    <h3 className="text-sm font-bold text-mar-areia">{stop.title}</h3>
                    <p className="mt-1 text-xs leading-relaxed text-white/80">{stop.body}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <GincanaPromo />

      <section className="chapter-campaign chapter-frame chapter-tempo-strong chapter-reveal bg-white py-16">
        <div className="container-site">
          <div className="surface-panel grid gap-8 p-6 md:p-8">
            <div className="grid gap-5 md:grid-cols-[1.1fr,0.9fr]">
              <div>
                <div className="section-eyebrow text-mar-cobre">
                  <Users className="h-4 w-4" />
                  <span>Turma do mangue</span>
                </div>
                <h2 className="mb-3 text-3xl font-bold text-mar-azul">Uma campanha para juntar gente e agir</h2>
                <p className="max-w-2xl text-sm leading-relaxed text-mar-escuro/72 md:text-base">
                  Aqui a historia vira convite de verdade: participar, apoiar e colocar a mao na massa para
                  manter viva a memoria da comunidade.
                </p>
                <div className="mt-4 rounded-2xl border border-mar-areia/35 bg-mar-creme/60 p-4 text-sm leading-relaxed text-mar-escuro/75">
                  <strong className="text-mar-azul">Personagens-guia:</strong> Pedro Cão, Bia das Conchas,
                  Ravi do Farol, Luna da Maré e Mari Siqueira. Eles representam criancas, estudantes e mulheres
                  marisqueiras da regiao na descoberta do valor da memoria coletiva.
                </div>
              </div>

              <div className="rounded-2xl border border-mar-verde/30 bg-mar-verde/5 p-5">
                <div className="overflow-hidden rounded-[1.4rem] border border-mar-verde/20 bg-white shadow-[0_16px_32px_rgba(6,35,63,0.08)]">
                  <div className="relative aspect-[16/10] border-b border-mar-verde/20 bg-mar-creme">
                    <Image
                      src="/story/applications/cena-chamado-mare.png"
                      alt="Aplicacao promocional dos personagens no chamado da mare"
                      fill
                      sizes="(min-width: 768px) 36vw, 100vw"
                      className="object-cover"
                    />
                  </div>
                  <div className="p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-mar-verde">Tom da campanha</p>
                    <ul className="mt-3 space-y-2 text-sm leading-relaxed text-mar-escuro/75">
                      <li>Todo mundo entende, todo mundo participa.</li>
                      <li>Criancas puxam a trilha e familias caminham juntas.</li>
                      <li>Memoria local como orgulho e futuro do bairro.</li>
                      <li>Cada clique vira acao comunitaria concreta.</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-[1.1fr,0.9fr]">
              <article className="campaign-proof-card rounded-2xl border border-mar-azul/20 bg-mar-azul/[0.04] p-5">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-mar-azul/30 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-mar-azul">
                  <Megaphone className="h-3.5 w-3.5" />
                  Materiais de divulgacao
                </div>
                <h3 className="text-xl font-bold text-mar-azul">Pronto para circular em escola, igreja e grupo de bairro</h3>
                <p className="mt-2 text-sm leading-relaxed text-mar-escuro/72">
                  A home agora funciona como peca principal da campanha: mensagem clara, entrada por perfil e links
                  diretos para acao imediata.
                </p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs text-mar-escuro/70">
                  <span className="rounded-full border border-mar-areia/45 bg-mar-creme px-3 py-1">Compartilhavel no WhatsApp</span>
                  <span className="rounded-full border border-mar-areia/45 bg-mar-creme px-3 py-1">Linguagem comunitaria</span>
                  <span className="rounded-full border border-mar-areia/45 bg-mar-creme px-3 py-1">CTA por publico</span>
                </div>
              </article>

              <article className="campaign-proof-card campaign-proof-highlight rounded-2xl border border-mar-cobre/30 bg-mar-cobre/10 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-mar-cobre">Percepcao de valor</p>
                <p className="mt-3 text-lg font-semibold leading-relaxed text-mar-escuro">
                  &quot;Agora a pagina parece uma campanha de verdade, com caminho claro para participar e apoiar.&quot;
                </p>
                <div className="mt-4 flex items-center gap-2 text-sm font-medium text-mar-escuro/80">
                  <BadgeCheck className="h-4 w-4 text-mar-cobre" />
                  Validado para uso em mobilizacao local
                </div>
                <div className="mt-2 flex items-center gap-2 text-sm font-medium text-mar-escuro/80">
                  <Sparkles className="h-4 w-4 text-mar-cobre" />
                  Narrativa, confianca e chamada para acao no mesmo fluxo
                </div>
              </article>
            </div>

            <div>
              <h3 className="mb-4 text-2xl font-bold text-mar-azul">Escolha seu percurso na aventura</h3>
              <div className="grid gap-4 md:grid-cols-3">
                {Object.values(entryPortals).map((portal) => {
                  const story = portalStoryCopy[portal.slug];
                  const isSelected = selectedPortal?.slug === portal.slug;
                  return (
                    <article
                      key={portal.slug}
                      data-portal={portal.slug}
                      className={`story-card portal-story-card rounded-2xl border-2 p-5 shadow-sm ${
                        isSelected
                          ? "portal-story-active border-mar-cobre/65 bg-mar-areia/30 ring-2 ring-mar-cobre/30"
                          : "portal-story-idle border-mar-areia/35 bg-mar-creme/70"
                      }`}
                    >
                      <p className="portal-story-chip inline-flex rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]">
                        {portal.slug === "implementacao" && "Operacao"}
                        {portal.slug === "participantes" && "Jornada"}
                        {portal.slug === "apoiadores" && "Parceria"}
                      </p>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mar-cobre">{portal.title}</p>
                      <p className="mt-2 text-sm font-semibold text-mar-escuro">{story.lead}</p>
                      <ul className="mt-3 list-disc space-y-1 pl-5 text-sm leading-relaxed text-mar-escuro/72">
                        {story.bullets.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                      <div className="mt-5 flex flex-wrap gap-3">
                        <Link
                          href={`/admin/login?portal=${portal.slug}`}
                          className={`btn-primary text-mar-escuro hover:bg-mar-areia/90 ${
                            isSelected ? "bg-mar-cobre/85 text-white hover:bg-mar-cobre" : "bg-mar-areia"
                          }`}
                        >
                          {googleEnabled ? portalActionLabel[portal.slug] : "Acessar login"}
                        </Link>
                        <Link href="/participar" className="btn-secondary">
                          Ver perfis
                        </Link>
                      </div>
                    </article>
                  );
                })}
              </div>

              <PortalCampaignLinks
                portals={campaignPortals}
                defaultOrigin={process.env.NEXTAUTH_URL ?? "http://127.0.0.1:3002"}
              />

              <div className="mt-6 rounded-2xl border border-mar-azul/20 bg-gradient-to-r from-mar-azul/[0.06] via-white to-mar-verde/[0.05] p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.17em] text-mar-azul">Próximos passos</p>
                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  {[
                    {
                      title: "1. Escolha o portal",
                      body: "Use o botão do seu perfil para entrar direto na jornada certa.",
                    },
                    {
                      title: "2. Compartilhe o link",
                      body: "Copie o link de campanha e envie para sua turma, familia ou rede.",
                    },
                    {
                      title: "3. Ative a participação",
                      body: "Conecte pessoas ao acervo, às missoes e à memoria da comunidade.",
                    },
                  ].map((step) => (
                    <article key={step.title} className="rounded-xl border border-mar-areia/35 bg-white/85 p-4 shadow-[0_8px_18px_rgba(6,35,63,0.06)]">
                      <h4 className="text-sm font-bold text-mar-azul">{step.title}</h4>
                      <p className="mt-1 text-xs leading-relaxed text-mar-escuro/70">{step.body}</p>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="chapter-roadmap chapter-frame chapter-tempo-soft chapter-reveal bg-mar-creme py-16">
        <div className="container-site">
          <div className="surface-panel grid gap-6 p-6 md:grid-cols-[1.2fr,0.8fr] md:p-8">
            <div>
              <div className="section-eyebrow">
                <GitBranch className="h-4 w-4" />
                <span>Transparência de implementação</span>
              </div>
              <h2 className="mb-3 font-serif text-3xl font-bold text-mar-azul">Acompanhe a evolução do roadmap do site</h2>
              <p className="text-sm leading-relaxed text-mar-escuro/72 md:text-base">
                O Museu do Mar agora conta com uma página pública de acompanhamento do roadmap, com
                cronograma executivo em Gantt, percentual global ponderado de implementação e leitura
                atualizada das frentes em andamento.
              </p>
              <div className="roadmap-ribbon mt-5 grid gap-3 rounded-2xl border border-mar-verde/15 bg-white/70 p-4 md:grid-cols-3">
                {[
                  {
                    title: "Base pública",
                    body: "Portal aberto, campanha principal e navegação de entrada organizadas.",
                  },
                  {
                    title: "Jornadas ativas",
                    body: "Perfis autenticados e fluxos pedagógicos já respirando em produção local.",
                  },
                  {
                    title: "Homologação final",
                    body: "Domínio público, credenciais externas e última rodada institucional.",
                  },
                ].map((milestone, index) => (
                  <article key={milestone.title} className="roadmap-stop rounded-xl border border-mar-areia/25 bg-white/80 p-3">
                    <div className="mb-2 inline-flex items-center gap-2">
                      <span className="roadmap-dot flex h-7 w-7 items-center justify-center rounded-full bg-mar-verde text-xs font-bold text-white">
                        {index + 1}
                      </span>
                      <p className="text-sm font-bold text-mar-azul">{milestone.title}</p>
                    </div>
                    <p className="text-xs leading-relaxed text-mar-escuro/70">{milestone.body}</p>
                  </article>
                ))}
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link href="/roadmap" className="btn-primary bg-mar-verde text-white hover:bg-mar-verde/90 shadow-lg hover:shadow-xl">
                  Ver roadmap <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href="/sobre" className="btn-secondary">
                  Contexto do projeto
                </Link>
              </div>
            </div>
            <div className="rounded-2xl border border-mar-areia/25 bg-white/80 p-5">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-mar-azul/10 text-mar-azul">
                <Gauge className="h-5 w-5" />
              </div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-mar-cobre">Leitura rápida</p>
              <div className="mt-4 space-y-3 text-sm leading-relaxed text-mar-escuro/72">
                <p><strong>70% de implementação global estimada</strong> no ciclo atual do site.</p>
                <p>Operação pública já publicada, jornadas autenticadas estabilizadas e camada pedagógica em aprofundamento real.</p>
                <p>Próximo gargalo principal: credenciais externas, homologação final no domínio público e reforço educacional e institucional das jornadas.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pilares */}
      <section className="chapter-discovery chapter-frame chapter-tempo-strong chapter-reveal py-16 bg-white">
        <div className="container-site">
          <div className="mb-8 flex items-start gap-5">
            <div className="shrink-0 hidden md:block">
              <svg viewBox="0 0 72 72" className="h-16 w-16" aria-hidden="true">
                <circle cx="36" cy="36" r="34" fill="#2F89BA" opacity="0.1" />
                <circle cx="36" cy="36" r="22" fill="#2F89BA" opacity="0.15" />
                <path d="M22 44 C28 34, 44 34, 50 44" fill="none" stroke="#2F89BA" strokeWidth="2.5" strokeLinecap="round" opacity="0.7" />
                <circle cx="28" cy="30" r="3" fill="#2F89BA" opacity="0.6" />
                <circle cx="44" cy="30" r="3" fill="#56BE76" opacity="0.6" />
                <circle cx="36" cy="24" r="4" fill="#EC8C67" opacity="0.6" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mar-azul">Capitulo 3: Encontros e territórios</p>
              <h2 className="mt-1 text-2xl font-bold text-mar-escuro">Três portas para entrar na história</h2>
              <p className="mt-1 text-sm text-mar-escuro/65">Acervo, comunidade e agenda formam o mapa cultural vivo do Museu do Mar.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: Camera,
                title: "Acervo Digital",
                desc: "Fotos, vídeos, áudios e documentos históricos da Aldeia de Perocão e da cultura pesqueira local.",
                href: "/acervo",
                color: "text-mar-azul",
                bg: "bg-mar-azul/8",
                ring: "ring-mar-azul/20",
                accent: "#2F89BA",
                pattern: "pilar-pattern-acervo",
              },
              {
                icon: Users,
                title: "Comunidade",
                desc: "Fórum aberto para moradores, pesquisadores e visitantes compartilharem memórias e histórias.",
                href: "/forum",
                color: "text-mar-verde",
                bg: "bg-mar-verde/8",
                ring: "ring-mar-verde/20",
                accent: "#56BE76",
                pattern: "pilar-pattern-comunidade",
              },
              {
                icon: Calendar,
                title: "Agenda Cultural",
                desc: "Eventos, oficinas, exposições e atividades culturais do Museu do Mar e da região.",
                href: "/agenda",
                color: "text-mar-cobre",
                bg: "bg-mar-cobre/8",
                ring: "ring-mar-cobre/20",
                accent: "#D4A96A",
                pattern: "pilar-pattern-agenda",
              },
            ].map((item) => (
              <Link key={item.href} href={item.href} className={`pilar-card card p-6 group relative overflow-hidden ${item.pattern}`}>
                <div className={`relative w-14 h-14 ${item.bg} rounded-2xl ring-2 ${item.ring} flex items-center justify-center mb-4 z-10`}>
                  <item.icon className={`w-7 h-7 ${item.color}`} />
                </div>
                <h3 className="font-serif text-xl font-bold text-mar-escuro mb-2 relative z-10">{item.title}</h3>
                <p className="text-mar-escuro/60 text-sm leading-relaxed mb-4 relative z-10">{item.desc}</p>
                <span className={`text-sm font-semibold ${item.color} flex items-center gap-1 group-hover:gap-2 transition-all relative z-10`}>
                  Explorar <ArrowRight className="w-4 h-4" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Contribuir com memória */}
      <section className="chapter-legacy chapter-frame chapter-tempo-soft chapter-reveal bg-mar-creme py-14">
        <div className="container-site">
          <div className="mb-6 flex items-center gap-4">
            <svg viewBox="0 0 56 56" className="h-12 w-12 shrink-0" aria-hidden="true">
              <circle cx="28" cy="28" r="26" fill="#D4A96A" opacity="0.15" />
              <path d="M14 32 Q28 14 42 32" fill="none" stroke="#D4A96A" strokeWidth="2.5" strokeLinecap="round" opacity="0.8" />
              <circle cx="28" cy="34" r="6" fill="#D4A96A" opacity="0.5" />
              <path d="M22 42 Q28 46 34 42" fill="none" stroke="#D4A96A" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
            </svg>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mar-cobre">Capitulo 5: Legado e memória</p>
              <p className="mt-0.5 text-sm text-mar-escuro/65">Cada historia enviada fortalece o acervo vivo da comunidade.</p>
            </div>
          </div>
          <div className="rounded-3xl border border-mar-areia/30 bg-white p-8 md:p-10 flex flex-col md:flex-row md:items-center gap-8">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-mar-cobre/10">
              <ScrollText className="h-7 w-7 text-mar-cobre" />
            </div>
            <div className="flex-1">
              <p className="mb-1 text-sm font-semibold uppercase tracking-[0.18em] text-mar-cobre">Participe</p>
              <h2 className="font-serif text-2xl font-bold text-mar-escuro md:text-3xl">Contribua com uma memória</h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-mar-escuro/65 md:text-base">
                Você tem uma história, foto, documento ou relato sobre Perocão e as comunidades pesqueiras do litoral capixaba? Envie para o Museu do Mar e ajude a preservar essa memória viva.
              </p>
            </div>
            <div className="shrink-0">
              <Link href="/memoria" className="btn-primary bg-mar-cobre text-white hover:bg-mar-cobre/90 shadow-lg hover:shadow-xl gap-2">
                Enviar minha memória <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Acervo destaque */}
      {recentAcervo.length > 0 && (
        <section className="chapter-acervo chapter-frame chapter-tempo-strong chapter-reveal py-16 bg-mar-creme">
          <div className="container-site">
            <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
              <div className="flex items-start gap-4">
                <svg viewBox="0 0 72 72" className="mt-1 hidden h-16 w-16 shrink-0 md:block" aria-hidden="true">
                  <circle cx="36" cy="36" r="34" fill="#2F89BA" opacity="0.1" />
                  <path d="M18 45 C25 28, 47 28, 54 45" fill="none" stroke="#2F89BA" strokeWidth="2.5" strokeLinecap="round" opacity="0.7" />
                  <rect x="24" y="20" width="10" height="14" rx="2" fill="#D4A96A" opacity="0.7" />
                  <rect x="38" y="24" width="12" height="10" rx="2" fill="#EC8C67" opacity="0.65" />
                  <circle cx="36" cy="46" r="6" fill="#56BE76" opacity="0.55" />
                </svg>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mar-azul">Capitulo 6: Reliquias da maré</p>
                <h2 className="section-title">Acervo em Destaque</h2>
                  <p className="section-subtitle mb-0">Registros recentes do nosso patrimônio cultural</p>
                  <p className="mt-2 max-w-2xl text-sm leading-relaxed text-mar-escuro/65">
                    Cada item aqui funciona como pista recuperada do territorio: imagem, gesto, voz e lembranca
                    que agora ganham lugar de destaque no museu digital.
                  </p>
                </div>
              </div>
              <Link href="/acervo" className="text-sm font-medium text-mar-azul hover:text-mar-azul_claro flex items-center gap-1">
                Ver tudo <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {recentAcervo.map((item, index) => (
                <Link key={item.id} href={`/acervo/${item.id}`} className="acervo-card card aspect-video relative group">
                  <div className="acervo-card-tag absolute left-3 top-3 z-10 rounded-full border border-white/70 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-mar-azul backdrop-blur-sm">
                    Fragmento {index + 1}
                  </div>
                  {item.url ? (
                    <RemoteImage
                      src={item.url}
                      alt={item.titulo}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full bg-mar-azul/10 flex items-center justify-center">
                      <Camera className="w-8 h-8 text-mar-azul/30" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                    <p className="text-white text-sm font-medium">{item.titulo}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Blog + Agenda */}
      <section className="story-news-section chapter-frame chapter-tempo-soft chapter-reveal wave-separator-top py-16 bg-white">
        <div className="container-site">
          <div className="chapter-banner mb-8 rounded-2xl border border-mar-areia/35 bg-mar-creme/70 p-5">
            <div className="story-news-header flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-4">
                <svg viewBox="0 0 72 72" className="hidden h-16 w-16 shrink-0 md:block" aria-hidden="true">
                  <circle cx="36" cy="36" r="34" fill="#EC8C67" opacity="0.12" />
                  <path d="M20 46 C24 32, 48 32, 52 46" fill="none" stroke="#EC8C67" strokeWidth="2.5" strokeLinecap="round" opacity="0.75" />
                  <rect x="22" y="22" width="12" height="16" rx="2" fill="#2F89BA" opacity="0.65" />
                  <rect x="38" y="24" width="14" height="10" rx="2" fill="#D4A96A" opacity="0.7" />
                  <circle cx="36" cy="46" r="6" fill="#56BE76" opacity="0.5" />
                </svg>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mar-cobre">Capitulo 4: Ecos da comunidade</p>
                  <p className="mt-1 text-sm text-mar-escuro/70">
                    Noticias, agenda e chamadas publicas que mantem a historia em movimento.
                  </p>
                </div>
              </div>
              <div className="story-news-chips flex flex-wrap gap-2 text-xs">
                <span className="rounded-full border border-mar-azul/20 bg-white/70 px-3 py-1 font-semibold uppercase tracking-[0.16em] text-mar-azul">Noticias</span>
                <span className="rounded-full border border-mar-verde/20 bg-white/70 px-3 py-1 font-semibold uppercase tracking-[0.16em] text-mar-verde">Agenda</span>
                <span className="rounded-full border border-mar-cobre/20 bg-white/70 px-3 py-1 font-semibold uppercase tracking-[0.16em] text-mar-cobre">Chamadas</span>
              </div>
            </div>
          </div>
          <div className="story-news-grid grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Blog */}
            <article className="story-feed-card story-feed-blog story-news-column rounded-2xl border border-mar-areia/35 bg-white/85 p-5">
              <div className="flex items-end justify-between mb-6">
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-mar-azul">Cronicas da maré</p>
                  <h2 className="section-title mb-0">Blog</h2>
                </div>
                <Link href="/blog" className="text-sm font-medium text-mar-azul hover:text-mar-azul_claro flex items-center gap-1">
                  Ver tudo <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
              <p className="mb-5 max-w-md text-sm leading-relaxed text-mar-escuro/65">
                Textos, relatos e bastidores que documentam o movimento do projeto no territorio.
              </p>
              {recentPosts.length === 0 ? (
                <p className="text-mar-escuro/40 text-sm italic">Nenhuma publicação ainda.</p>
              ) : (
                <div className="space-y-4">
                  {recentPosts.map((post) => (
                    <Link key={post.id} href={`/blog/${post.slug}`} className="story-feed-item flex gap-4 group rounded-xl border border-mar-areia/25 bg-white/75 p-3">
                      <div className="w-20 h-16 bg-mar-azul/10 rounded-lg flex items-center justify-center shrink-0">
                        <BookOpen className="w-6 h-6 text-mar-azul/40" />
                      </div>
                      <div>
                        <div className="story-feed-meta mb-1 flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.14em]">
                          <span className="rounded-full border border-mar-azul/20 bg-mar-azul/5 px-2 py-1 font-semibold text-mar-azul">Caderno aberto</span>
                          <p className="text-mar-escuro/40">{formatDate(post.publishedAt)}</p>
                        </div>
                        <h4 className="font-serif font-bold text-mar-escuro group-hover:text-mar-azul transition-colors text-sm leading-snug">
                          {post.title}
                        </h4>
                        {post.summary && (
                          <p className="text-xs text-mar-escuro/60 mt-1 leading-relaxed">
                            {truncate(post.summary, 80)}
                          </p>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </article>

            {/* Agenda */}
            <article className="story-feed-card story-feed-events story-news-column rounded-2xl border border-mar-areia/35 bg-white/85 p-5">
              <div className="flex items-end justify-between mb-6">
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-mar-verde">Convocacoes e encontros</p>
                  <h2 className="section-title mb-0">Próximos Eventos</h2>
                </div>
                <Link href="/agenda" className="text-sm font-medium text-mar-azul hover:text-mar-azul_claro flex items-center gap-1">
                  Ver tudo <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
              <p className="mb-5 max-w-md text-sm leading-relaxed text-mar-escuro/65">
                Oficinas, encontros e chamadas publicas que transformam memoria em presenca coletiva.
              </p>
              {upcomingEventos.length === 0 ? (
                <p className="text-mar-escuro/40 text-sm italic">Nenhum evento próximo.</p>
              ) : (
                <div className="space-y-4">
                  {upcomingEventos.map((evento) => (
                    <Link key={evento.id} href={`/agenda/${evento.id}`} className="story-feed-item flex gap-4 group rounded-xl border border-mar-areia/25 bg-white/75 p-3">
                      <div className="w-16 shrink-0 bg-mar-cobre/10 rounded-lg p-2 text-center">
                        <p className="text-xs text-mar-cobre font-medium uppercase">
                          {formatDateShort(evento.dataInicio)}
                        </p>
                      </div>
                      <div>
                        <div className="story-feed-meta mb-1 flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.14em]">
                          <span className="rounded-full border border-mar-verde/20 bg-mar-verde/5 px-2 py-1 font-semibold text-mar-verde">Na rota</span>
                          {evento.local && <span className="text-mar-escuro/40">{evento.local}</span>}
                        </div>
                        <h4 className="font-serif font-bold text-mar-escuro group-hover:text-mar-azul transition-colors text-sm leading-snug">
                          {evento.titulo}
                        </h4>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </article>
          </div>
        </div>
      </section>

      {/* CTA Sobre */}
      <section className="chapter-finale chapter-frame chapter-tempo-strong chapter-reveal wave-separator-top bg-mar-azul py-16 text-white">
        <div className="container-site">
          <div className="story-finale-panel relative overflow-hidden rounded-3xl border border-white/20 bg-white/10 px-8 py-10 text-center">
            <svg viewBox="0 0 420 180" className="absolute -left-6 bottom-0 h-28 w-60 opacity-30 md:h-36 md:w-80" aria-hidden="true">
              <path d="M0 130 C50 104, 108 106, 152 128 C194 149, 246 152, 420 92" fill="none" stroke="#F6CD6A" strokeWidth="3" strokeLinecap="round" />
              <path d="M0 150 C58 124, 116 126, 160 146 C204 166, 258 166, 420 110" fill="none" stroke="white" strokeOpacity="0.42" strokeWidth="2" strokeDasharray="8 8" />
              <circle cx="155" cy="128" r="10" fill="#56BE76" fillOpacity="0.45" />
              <circle cx="310" cy="116" r="8" fill="#EC8C67" fillOpacity="0.4" />
            </svg>
            <svg viewBox="0 0 220 160" className="absolute right-0 top-2 h-24 w-36 opacity-25 md:h-32 md:w-44" aria-hidden="true">
              <path d="M36 112 C66 58, 138 48, 176 98" fill="none" stroke="#8BD2EF" strokeWidth="3" strokeLinecap="round" />
              <path d="M54 120 C80 82, 134 76, 162 108" fill="none" stroke="white" strokeOpacity="0.4" strokeWidth="2" />
              <circle cx="56" cy="120" r="7" fill="#F6CD6A" fillOpacity="0.42" />
            </svg>
            <svg viewBox="0 0 320 80" className="absolute inset-x-0 top-0 w-full opacity-20" aria-hidden="true">
              <path d="M0 50 C80 20, 160 68, 240 30 C280 14, 310 40, 320 32" fill="none" stroke="#F6CD6A" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M0 64 C60 36, 140 72, 200 44 C250 22, 295 54, 320 46" fill="none" stroke="white" strokeOpacity="0.5" strokeWidth="1.5" strokeDasharray="8 6" />
            </svg>
            <div className="story-finale-chip-row mb-4 flex flex-wrap justify-center gap-2 text-[11px] uppercase tracking-[0.16em] text-white/70">
              <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1">Memoria</span>
              <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1">Territorio</span>
              <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1">Futuro comum</span>
            </div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-mar-areia">Epilogo da jornada</p>
            <h2 className="mb-4 font-serif text-3xl font-bold">O Ponto de Memória que une o territorio</h2>
            <p className="text-white/80 max-w-2xl mx-auto mb-8 text-base leading-relaxed">
              Uma iniciativa voltada à preservação e circulação das memórias da Aldeia de Perocão,
              reunindo comunidade, pesquisa, educação patrimonial e acervo digital em uma presença
              cultural viva na web.
            </p>
            <p className="mx-auto mb-8 max-w-xl text-sm leading-relaxed text-white/68">
              Quando a comunidade entra na trilha, o museu deixa de ser apenas destino e vira ponto de encontro,
              cuidado e continuidade.
            </p>
            <Link href="/sobre" className="btn-primary bg-mar-areia text-mar-escuro hover:bg-mar-areia/90">
              Saiba mais sobre o projeto <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
```

## Arquivo: src/app/globals.css
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --font-sans: "Inter", system-ui, sans-serif;
    --font-serif: "Merriweather", Georgia, serif;
  }

  html {
    scroll-behavior: smooth;
  }

  body {
    @apply bg-mar-creme text-mar-escuro font-sans antialiased;
    background-image:
      radial-gradient(circle at top, rgba(212, 169, 106, 0.08), transparent 28%),
      linear-gradient(to bottom, rgba(255, 255, 255, 0.55), rgba(253, 246, 227, 0.92));
  }

  h1, h2, h3, h4, h5, h6 {
    @apply font-serif;
  }

  a {
    @apply transition-colors duration-200;
  }
}

@layer components {
  .container-site {
    @apply max-w-6xl mx-auto px-4 sm:px-6 lg:px-8;
  }

  .btn-primary {
    @apply inline-flex items-center gap-2 px-6 py-3 bg-mar-azul text-white font-medium rounded-lg
           shadow-sm hover:bg-mar-azul_claro transition-all duration-200;
  }

  .btn-primary:hover {
    transform: translateY(-1px);
  }

  .btn-primary:focus-visible {
    outline: 2px solid rgba(246, 205, 106, 0.95);
    outline-offset: 2px;
  }

  .btn-secondary {
    @apply inline-flex items-center gap-2 px-6 py-3 border-2 border-mar-azul text-mar-azul font-medium
           rounded-lg hover:bg-mar-azul hover:text-white transition-all duration-200;
  }

  .btn-secondary:hover {
    transform: translateY(-1px);
  }

  .btn-secondary:focus-visible {
    outline: 2px solid rgba(47, 137, 186, 0.85);
    outline-offset: 2px;
  }

  a:focus-visible,
  button:focus-visible {
    border-radius: 0.55rem;
    box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.72), 0 0 0 4px rgba(24, 54, 78, 0.45);
  }

  .card {
    @apply bg-white rounded-xl shadow-sm border border-mar-areia/30 overflow-hidden
           hover:shadow-md transition-shadow duration-200;
  }

  .surface-panel {
    @apply rounded-2xl border border-mar-areia/25 bg-white/90 shadow-sm;
    box-shadow: 0 14px 34px rgba(6, 35, 63, 0.08);
  }

  .product-kpi {
    @apply relative overflow-hidden;
    backdrop-filter: blur(3px);
  }

  .product-kpi::after {
    content: "";
    @apply pointer-events-none absolute -right-6 -top-6 h-14 w-14 rounded-full;
    background: radial-gradient(circle, rgba(246, 205, 106, 0.35), rgba(246, 205, 106, 0));
  }

  .campaign-proof-card {
    @apply transition-all duration-300;
  }

  .campaign-proof-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 14px 28px rgba(6, 35, 63, 0.1);
  }

  .campaign-proof-highlight {
    position: relative;
    overflow: hidden;
  }

  .campaign-proof-highlight::after {
    content: "";
    @apply pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full;
    background: radial-gradient(circle, rgba(236, 140, 103, 0.42), rgba(236, 140, 103, 0));
  }

  .story-hero-panel {
    position: relative;
    overflow: hidden;
    backdrop-filter: blur(6px);
  }

  .story-hero-panel::before {
    content: "";
    @apply pointer-events-none absolute -right-10 top-8 h-28 w-28 rounded-full;
    background: radial-gradient(circle, rgba(246, 205, 106, 0.18), rgba(246, 205, 106, 0));
  }

  .story-hero-panel::after {
    content: "";
    @apply pointer-events-none absolute inset-x-8 bottom-0 h-px;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.24), transparent);
  }

  .story-hero-cta .btn-primary,
  .story-hero-cta .btn-secondary {
    @apply justify-center;
  }

  .story-hero-grid {
    position: relative;
    z-index: 1;
  }

  .story-promo-bubble {
    position: relative;
  }

  .story-promo-bubble::after {
    content: "";
    position: absolute;
    left: 1.2rem;
    bottom: -11px;
    width: 0;
    height: 0;
    border-left: 10px solid transparent;
    border-right: 10px solid transparent;
    border-top: 12px solid rgba(255, 255, 255, 0.95);
    filter: drop-shadow(2px 2px 0 rgba(13, 33, 55, 0.2));
  }

  .story-promo-board {
    position: relative;
    overflow: hidden;
    background:
      radial-gradient(circle at 14% 16%, rgba(212, 169, 106, 0.18), transparent 28%),
      radial-gradient(circle at 88% 12%, rgba(116, 194, 133, 0.15), transparent 24%),
      rgba(255, 255, 255, 0.06);
  }

  .story-promo-board::before {
    content: "";
    @apply pointer-events-none absolute inset-x-5 top-0 h-px;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.52), transparent);
  }

  .story-promo-poster {
    box-shadow: 0 22px 38px rgba(6, 35, 63, 0.18);
  }

  .story-promo-poster::after {
    content: "";
    @apply pointer-events-none absolute inset-x-0 top-0 h-14;
    background: linear-gradient(180deg, rgba(6, 35, 63, 0.18), transparent);
  }

  .story-promo-sticker {
    position: absolute;
    z-index: 2;
    border-radius: 999px;
    border: 2px solid rgba(13, 33, 55, 0.26);
    background: rgba(255, 248, 234, 0.95);
    color: #18364E;
    padding: 0.45rem 0.8rem;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    box-shadow: 4px 4px 0 rgba(13, 33, 55, 0.16);
  }

  .story-promo-sticker-top {
    top: 1rem;
    left: 1rem;
    transform: rotate(-4deg);
  }

  .story-promo-sticker-bottom {
    right: 1rem;
    bottom: 1rem;
    transform: rotate(3deg);
  }

  .story-wave {
    @apply relative overflow-hidden shadow-lg shadow-mar-escuro/10;
  }

  .story-wave::after {
    content: "";
    @apply pointer-events-none absolute inset-x-0 bottom-0 h-10;
    background: linear-gradient(180deg, transparent, rgba(255, 255, 255, 0.14));
  }

  .story-application-card {
    @apply relative overflow-hidden shadow-lg shadow-mar-escuro/15;
  }

  .story-application-card::before {
    content: "";
    @apply pointer-events-none absolute inset-x-6 top-0 h-px;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.45), transparent);
  }

  .story-application-frame img,
  .story-scene-figure img {
    transition: transform 420ms ease;
  }

  .story-application-card:hover .story-application-frame img,
  .story-scene:hover .story-scene-figure img {
    transform: scale(1.02);
  }

  .story-chip {
    @apply inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold tracking-[0.14em] uppercase;
  }

  .story-chip-sand {
    @apply border-mar-areia/60 bg-mar-areia/20 text-mar-areia;
  }

  .story-chip-green {
    @apply border-mar-verde/50 bg-mar-verde/15 text-emerald-100;
  }

  .story-chip-coral {
    @apply border-mar-cobre/50 bg-mar-cobre/15 text-orange-50;
  }

  .story-chip-sea {
    @apply border-sky-200/45 bg-sky-200/15 text-sky-50;
  }

  .story-scene {
    @apply relative overflow-hidden shadow-lg shadow-mar-escuro/10 transition-transform duration-300 ease-out;
    animation: float-story 5.5s ease-in-out infinite;
    /* gibi-style: top accent strip per panel */
    border-top-width: 3px;
    border-top-color: #FF8158; /* coral — Cena 1 */
  }

  .story-scene:nth-child(2) {
    animation-delay: 0.35s;
    border-top-color: #4DB06C; /* verde — Cena 2 */
  }

  .story-scene:nth-child(3) {
    animation-delay: 0.7s;
    border-top-color: #FFD166; /* amarelo — Cena 3 */
  }

  .story-scene::before {
    content: "";
    /* removed decorative circle; top stripe is now the panel marker */
    display: none;
  }

  .story-scene-figure {
    box-shadow: 0 18px 28px rgba(6, 35, 63, 0.18);
  }

  .story-scene h2,
  .story-scene p {
    position: relative;
    z-index: 1;
  }

  .story-bubble {
    position: relative;
    /* gibi-style speech bubble: solid white fill, dark outline, offset shadow */
    background: white !important;
    border-color: rgba(13, 33, 55, 0.65) !important;
    border-width: 2px !important;
    color: #0d2137 !important;
    border-radius: 0.875rem;
    box-shadow: 3px 3px 0 rgba(13, 33, 55, 0.22);
    padding-bottom: 0.375rem;
  }

  .story-bubble::after {
    content: "";
    position: absolute;
    left: 16px;
    bottom: -9px;
    width: 0;
    height: 0;
    border-left: 7px solid transparent;
    border-right: 7px solid transparent;
    border-top: 9px solid rgba(13, 33, 55, 0.65);
  }

  /* second ::before layer to fill triangle interior white */
  .story-bubble::before {
    content: "";
    position: absolute;
    left: 19px;
    bottom: -5px;
    width: 0;
    height: 0;
    border-left: 4px solid transparent;
    border-right: 4px solid transparent;
    border-top: 6px solid white;
    z-index: 1;
  }

  .story-card {
    @apply transition-all duration-300 ease-out;
  }

  .story-card:hover {
    @apply -translate-y-1 shadow-lg shadow-mar-escuro/10;
  }

  .portal-story-card {
    position: relative;
    overflow: hidden;
  }

  .portal-story-idle {
    opacity: 0.94;
  }

  .portal-story-idle:hover {
    opacity: 1;
  }

  .portal-story-active {
    box-shadow: 0 16px 34px rgba(198, 102, 69, 0.22);
  }

  .portal-story-active::after {
    content: "";
    @apply pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full;
    background: radial-gradient(circle, rgba(236, 140, 103, 0.32), rgba(236, 140, 103, 0));
  }

  .portal-story-card::before {
    content: "";
    /* gibi-style: bold top stripe as panel chapter header */
    @apply pointer-events-none absolute inset-x-0 top-0 h-1.5 rounded-t-2xl;
    background: rgba(24, 54, 78, 0.18);
  }

  .portal-story-chip {
    margin-bottom: 0.5rem;
    color: #18364E;
    border-color: rgba(24, 54, 78, 0.24);
    background: rgba(24, 54, 78, 0.06);
  }

  .portal-story-card[data-portal="implementacao"] {
    background-image: linear-gradient(180deg, rgba(47, 137, 186, 0.06), transparent 40%);
  }

  .portal-story-card[data-portal="implementacao"]::before {
    background: #2e86c1;
    opacity: 0.85;
  }

  .portal-story-card[data-portal="implementacao"] .portal-story-chip {
    color: #2F89BA;
    border-color: rgba(47, 137, 186, 0.35);
    background: rgba(47, 137, 186, 0.1);
  }

  .portal-story-card[data-portal="participantes"] {
    background-image: linear-gradient(180deg, rgba(86, 190, 118, 0.06), transparent 40%);
  }

  .portal-story-card[data-portal="participantes"]::before {
    background: #1a7a4a;
    opacity: 0.85;
  }

  .portal-story-card[data-portal="participantes"] .portal-story-chip {
    color: #2E8D4D;
    border-color: rgba(86, 190, 118, 0.38);
    background: rgba(86, 190, 118, 0.1);
  }

  .portal-story-card[data-portal="apoiadores"] {
    background-image: linear-gradient(180deg, rgba(236, 140, 103, 0.06), transparent 40%);
  }

  .portal-story-card[data-portal="apoiadores"]::before {
    background: #b5651d;
    opacity: 0.85;
  }

  .portal-story-card[data-portal="apoiadores"] .portal-story-chip {
    color: #C56645;
    border-color: rgba(236, 140, 103, 0.38);
    background: rgba(236, 140, 103, 0.1);
  }

  .portal-story-active .portal-story-chip {
    border-color: rgba(198, 102, 69, 0.5);
    background: rgba(236, 140, 103, 0.14);
  }

  .login-story-aside::after {
    content: "";
    @apply pointer-events-none absolute inset-x-6 bottom-0 h-px;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.32), transparent);
  }

  .login-route-card,
  .login-portal-card {
    position: relative;
    overflow: hidden;
    box-shadow: 3px 3px 0 rgba(13, 33, 55, 0.16);
  }

  .login-route-card::before,
  .login-portal-card::before {
    content: "";
    @apply pointer-events-none absolute inset-x-0 top-0 h-1.5;
    background: #1a5276;
  }

  .login-route-card[data-portal="implementacao"]::before,
  .login-portal-card[data-portal="implementacao"]::before {
    background: #2e86c1;
  }

  .login-route-card[data-portal="participantes"]::before,
  .login-portal-card[data-portal="participantes"]::before {
    background: #1a7a4a;
  }

  .login-route-card[data-portal="apoiadores"]::before,
  .login-portal-card[data-portal="apoiadores"]::before {
    background: #b5651d;
  }

  /* ── Gibi-style profile cards: top accent strip per participation role ── */
  .story-card[data-profile] {
    position: relative;
    overflow: hidden;
    /* offset shadow like printed comic panel */
    box-shadow: 3px 3px 0 rgba(13, 33, 55, 0.10), 0 1px 3px rgba(0,0,0,0.06);
  }

  .story-card[data-profile]:hover {
    box-shadow: 4px 4px 0 rgba(13, 33, 55, 0.16), 0 4px 12px rgba(0,0,0,0.08);
  }

  .story-card[data-profile]::before {
    content: "";
    @apply pointer-events-none absolute inset-x-0 top-0 h-1.5 rounded-t-2xl;
    background: #94a3b8;
  }

  .story-card[data-profile="estudante"]::before    { background: #0ea5e9; }
  .story-card[data-profile="professor"]::before    { background: #6366f1; }
  .story-card[data-profile="voluntario"]::before   { background: #10b981; }
  .story-card[data-profile="apoiador"]::before     { background: #f59e0b; }
  .story-card[data-profile="gestor"]::before       { background: #8b5cf6; }
  .story-card[data-profile="bolsista"]::before     { background: #14b8a6; }
  .story-card[data-profile="equipe_producao"]::before    { background: #f43f5e; }
  .story-card[data-profile="equipe_comunicacao"]::before { background: #d946ef; }

  .story-avatar-card,
  .story-avatar-compact {
    animation: story-pop 0.46s ease both;
  }

  .story-avatar-card:hover,
  .story-avatar-compact:hover {
    transform: translateY(-2px);
  }

  .story-wave-trail {
    animation: tide-drift 7.5s ease-in-out infinite;
    transform-origin: center;
  }

  .story-route {
    position: relative;
  }

  .story-route::before {
    content: "";
    @apply pointer-events-none absolute left-6 right-6 top-[3.1rem] hidden border-t border-dashed border-white/35 md:block;
  }

  .story-stop {
    @apply relative transition-all duration-300;
  }

  .story-stop:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 24px rgba(6, 35, 63, 0.14);
  }

  .story-stop::after {
    content: "";
    @apply pointer-events-none absolute -bottom-2 left-4 h-3 w-3 rotate-45 border-r border-b border-white/30 bg-white/10;
  }

  .story-avatar-card {
    position: relative;
    overflow: hidden;
  }

  .story-avatar-card::before {
    content: "";
    @apply pointer-events-none absolute -right-7 -top-7 h-14 w-14 rounded-full;
    background: radial-gradient(circle, rgba(255, 255, 255, 0.28), rgba(255, 255, 255, 0));
  }

  .story-avatar-card::after {
    content: "";
    @apply pointer-events-none absolute inset-x-3 bottom-0 h-px;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.16), transparent);
  }

  .story-avatar-card[data-story-accent="pedro"] {
    background-image: linear-gradient(180deg, rgba(241, 195, 90, 0.08), transparent 52%);
  }

  .story-avatar-card[data-story-accent="bia"] {
    background-image: linear-gradient(180deg, rgba(86, 190, 118, 0.08), transparent 52%);
  }

  .story-avatar-card[data-story-accent="ravi"] {
    background-image: linear-gradient(180deg, rgba(236, 140, 103, 0.08), transparent 52%);
  }

  .story-avatar-card[data-story-accent="luna"] {
    background-image: linear-gradient(180deg, rgba(105, 188, 232, 0.08), transparent 52%);
  }

  .story-avatar-icon {
    filter: drop-shadow(0 8px 12px rgba(6, 35, 63, 0.12));
  }

  .story-avatar-name {
    background: rgba(255, 255, 255, 0.06);
  }

  .story-avatar-speech {
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.08);
  }

  .story-news-section {
    position: relative;
    background-image:
      radial-gradient(circle at 8% 12%, rgba(47, 137, 186, 0.08), transparent 22%),
      radial-gradient(circle at 92% 82%, rgba(236, 140, 103, 0.08), transparent 24%);
  }

  .wave-separator-top {
    position: relative;
  }

  .wave-separator-top::before {
    content: "";
    @apply pointer-events-none absolute inset-x-0 top-0 h-10;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 1440 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 30 C120 62, 240 62, 360 30 C480 -2, 600 -2, 720 30 C840 62, 960 62, 1080 30 C1200 -2, 1320 -2, 1440 30 L1440 0 L0 0 Z' fill='rgba(255,255,255,0.7)'/%3E%3Cpath d='M0 46 C120 74, 240 74, 360 46 C480 18, 600 18, 720 46 C840 74, 960 74, 1080 46 C1200 18, 1320 18, 1440 46' fill='none' stroke='rgba(212,169,106,0.35)' stroke-width='2' stroke-dasharray='8 8'/%3E%3C/svg%3E");
    background-size: 1440px 80px;
    background-repeat: repeat-x;
    background-position: top center;
  }

  .chapter-banner {
    position: relative;
    overflow: hidden;
  }

  .chapter-banner::after {
    content: "";
    @apply pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full;
    background: radial-gradient(circle, rgba(246, 205, 106, 0.45), rgba(246, 205, 106, 0));
  }

  .story-feed-card {
    @apply relative transition-all duration-300;
    box-shadow: 0 12px 28px rgba(6, 35, 63, 0.08);
  }

  .story-feed-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 18px 34px rgba(6, 35, 63, 0.12);
  }

  .story-feed-card::before {
    content: "";
    @apply pointer-events-none absolute left-4 right-4 top-14 hidden border-t border-dashed border-mar-areia/45 md:block;
  }

  .story-feed-blog {
    background-image: linear-gradient(180deg, rgba(47, 137, 186, 0.03), transparent 30%);
  }

  .story-feed-events {
    background-image: linear-gradient(180deg, rgba(86, 190, 118, 0.03), transparent 30%);
  }

  .story-feed-item {
    @apply transition-all duration-300;
  }

  .story-feed-item:hover {
    transform: translateX(3px);
    box-shadow: 0 10px 20px rgba(6, 35, 63, 0.08);
  }

  .story-feed-item p {
    color: rgba(24, 54, 78, 0.74);
  }

  .story-feed-meta p {
    line-height: 1;
    color: rgba(24, 54, 78, 0.58);
  }

  .story-link-board {
    position: relative;
    overflow: hidden;
  }

  .story-link-board::before {
    content: "";
    @apply pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full;
    background: radial-gradient(circle, rgba(47, 137, 186, 0.16), rgba(47, 137, 186, 0));
  }

  .story-link-card {
    @apply relative overflow-hidden transition-all duration-300;
  }

  .story-link-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 14px 28px rgba(6, 35, 63, 0.1);
  }

  .story-link-card::after {
    content: "";
    @apply pointer-events-none absolute inset-x-3 bottom-0 h-px;
    background: linear-gradient(90deg, transparent, rgba(6, 35, 63, 0.14), transparent);
  }

  .story-link-pill {
    color: #18364E;
    border-color: rgba(24, 54, 78, 0.2);
    background: rgba(24, 54, 78, 0.06);
  }

  .story-link-card[data-portal="implementacao"] .story-link-pill {
    color: #2F89BA;
    border-color: rgba(47, 137, 186, 0.3);
    background: rgba(47, 137, 186, 0.09);
  }

  .story-link-card[data-portal="participantes"] .story-link-pill {
    color: #56BE76;
    border-color: rgba(86, 190, 118, 0.35);
    background: rgba(86, 190, 118, 0.09);
  }

  .story-link-card[data-portal="apoiadores"] .story-link-pill {
    color: #EC8C67;
    border-color: rgba(236, 140, 103, 0.35);
    background: rgba(236, 140, 103, 0.1);
  }

  .story-link-card[data-portal="implementacao"] {
    background-image: linear-gradient(180deg, rgba(47, 137, 186, 0.04), transparent 35%);
  }

  .story-link-card[data-portal="participantes"] {
    background-image: linear-gradient(180deg, rgba(86, 190, 118, 0.04), transparent 35%);
  }

  .story-link-card[data-portal="apoiadores"] {
    background-image: linear-gradient(180deg, rgba(236, 140, 103, 0.04), transparent 35%);
  }

  .story-link-action {
    @apply transition-all duration-200;
  }

  .story-link-action:hover {
    transform: translateY(-1px);
  }

  .story-link-card p {
    color: rgba(24, 54, 78, 0.76);
  }

  .story-link-card .text-mar-escuro\/60,
  .story-link-card .text-mar-escuro\/55 {
    color: rgba(24, 54, 78, 0.64);
  }

  .chapter-campaign,
  .chapter-roadmap,
  .chapter-discovery,
  .chapter-legacy,
  .chapter-acervo {
    position: relative;
    overflow: hidden;
  }

  .chapter-campaign::before,
  .chapter-roadmap::before,
  .chapter-discovery::before,
  .chapter-legacy::before,
  .chapter-acervo::before {
    content: "";
    @apply pointer-events-none absolute inset-x-0 top-0 h-px;
    background: linear-gradient(90deg, transparent, rgba(212, 169, 106, 0.55), transparent);
  }

  .chapter-frame {
    position: relative;
    isolation: isolate;
  }

  .chapter-frame::after {
    content: "";
    @apply pointer-events-none absolute right-6 top-6 z-[1] h-14 w-14 rounded-2xl border;
    border-color: rgba(24, 54, 78, 0.12);
    background:
      linear-gradient(135deg, rgba(255, 255, 255, 0.25), rgba(255, 255, 255, 0.02)),
      radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.2), transparent 60%);
    box-shadow: 0 10px 24px rgba(6, 35, 63, 0.08);
  }

  .chapter-campaign.chapter-frame::after {
    border-color: rgba(47, 137, 186, 0.25);
  }

  .chapter-roadmap.chapter-frame::after {
    border-color: rgba(86, 190, 118, 0.28);
  }

  .chapter-discovery.chapter-frame::after {
    border-color: rgba(236, 140, 103, 0.28);
  }

  .chapter-legacy.chapter-frame::after {
    border-color: rgba(212, 169, 106, 0.35);
  }

  .chapter-acervo.chapter-frame::after {
    border-color: rgba(47, 137, 186, 0.24);
  }

  .story-news-section.chapter-frame::after {
    border-color: rgba(236, 140, 103, 0.22);
  }

  .chapter-finale.chapter-frame::after {
    border-color: rgba(246, 205, 106, 0.28);
    background:
      linear-gradient(135deg, rgba(255, 255, 255, 0.14), rgba(255, 255, 255, 0.02)),
      radial-gradient(circle at 30% 30%, rgba(246, 205, 106, 0.25), transparent 62%);
  }

  .chapter-tempo-strong .surface-panel,
  .chapter-tempo-strong .story-feed-card,
  .chapter-tempo-strong .acervo-card,
  .chapter-tempo-strong .story-link-card {
    box-shadow: 0 18px 36px rgba(6, 35, 63, 0.12);
  }

  .chapter-tempo-soft .surface-panel,
  .chapter-tempo-soft .story-feed-card,
  .chapter-tempo-soft .roadmap-stop {
    box-shadow: 0 10px 24px rgba(6, 35, 63, 0.07);
  }

  .chapter-tempo-strong .chapter-banner,
  .chapter-tempo-strong .story-link-board {
    border-color: rgba(212, 169, 106, 0.38);
  }

  .chapter-tempo-soft .chapter-banner,
  .chapter-tempo-soft .story-link-board {
    border-color: rgba(212, 169, 106, 0.24);
  }

  .chapter-tempo-soft .section-title,
  .chapter-tempo-soft h2 {
    letter-spacing: -0.01em;
  }

  .chapter-tempo-strong .section-title,
  .chapter-tempo-strong h2 {
    letter-spacing: -0.015em;
  }

  .chapter-tempo-soft p,
  .chapter-tempo-soft li {
    color: rgba(24, 54, 78, 0.76);
  }

  .chapter-tempo-strong p,
  .chapter-tempo-strong li {
    color: rgba(24, 54, 78, 0.8);
  }

  .chapter-campaign {
    background-image: radial-gradient(circle at 12% 14%, rgba(47, 137, 186, 0.08), transparent 26%);
  }

  .chapter-roadmap {
    background-image: radial-gradient(circle at 88% 18%, rgba(86, 190, 118, 0.1), transparent 30%);
  }

  .chapter-discovery {
    background-image: radial-gradient(circle at 14% 86%, rgba(236, 140, 103, 0.1), transparent 30%);
  }

  .chapter-legacy {
    background-image: radial-gradient(circle at 86% 18%, rgba(212, 169, 106, 0.12), transparent 30%);
  }

  .chapter-acervo {
    background-image: radial-gradient(circle at 10% 18%, rgba(47, 137, 186, 0.08), transparent 28%);
  }

  .chapter-finale {
    position: relative;
    overflow: hidden;
    background: linear-gradient(165deg, #073A5C 0%, #06233F 60%, #0d4f7a 100%);
  }

  .story-finale-panel::after {
    content: "";
    @apply pointer-events-none absolute left-1/2 top-0 h-24 w-48 -translate-x-1/2 rounded-full blur-2xl;
    background: rgba(246, 205, 106, 0.12);
  }

  .story-finale-panel::before {
    content: "";
    @apply pointer-events-none absolute inset-0;
    background:
      radial-gradient(circle at 18% 78%, rgba(86, 190, 118, 0.14), transparent 24%),
      radial-gradient(circle at 84% 24%, rgba(236, 140, 103, 0.14), transparent 24%),
      linear-gradient(180deg, rgba(255, 255, 255, 0.05), transparent 28%);
  }

  .chapter-reveal {
    animation: chapter-rise 0.8s ease-out both;
  }

  .chapter-campaign.chapter-reveal {
    animation-delay: 0.05s;
  }

  .chapter-roadmap.chapter-reveal {
    animation-delay: 0.1s;
  }

  .chapter-discovery.chapter-reveal {
    animation-delay: 0.15s;
  }

  .chapter-legacy.chapter-reveal {
    animation-delay: 0.2s;
  }

  .chapter-acervo.chapter-reveal {
    animation-delay: 0.25s;
  }

  .story-news-section.chapter-reveal {
    animation-delay: 0.3s;
  }

  .chapter-finale.chapter-reveal {
    animation-delay: 0.35s;
  }

  .roadmap-ribbon {
    position: relative;
    overflow: hidden;
  }

  .roadmap-ribbon::before {
    content: "";
    @apply pointer-events-none absolute left-8 right-8 top-1/2 hidden -translate-y-1/2 border-t border-dashed border-mar-verde/30 md:block;
  }

  .roadmap-stop {
    @apply relative transition-all duration-300;
    box-shadow: 0 10px 24px rgba(6, 35, 63, 0.06);
  }

  .roadmap-stop:hover {
    transform: translateY(-2px);
    box-shadow: 0 14px 30px rgba(6, 35, 63, 0.1);
  }

  .roadmap-dot {
    box-shadow: 0 0 0 5px rgba(86, 190, 118, 0.12);
  }

  .pilar-card {
    @apply relative overflow-hidden;
    box-shadow: 0 10px 28px rgba(6, 35, 63, 0.08);
  }

  .pilar-card:hover {
    box-shadow: 0 18px 38px rgba(6, 35, 63, 0.14);
  }

  .pilar-card::after {
    content: "";
    @apply pointer-events-none absolute -right-8 -bottom-8 h-20 w-20 rounded-full opacity-0 transition-opacity duration-300;
    background: radial-gradient(circle, rgba(212, 169, 106, 0.22), rgba(212, 169, 106, 0));
  }

  .pilar-card:hover::after {
    opacity: 1;
  }

  /* Pilar patterns */
  .pilar-pattern-acervo::before {
    content: "";
    @apply absolute inset-0 pointer-events-none opacity-5;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 120 120' xmlns='http://www.w3.org/2000/svg'%3E%3Crect x='15' y='15' width='30' height='35' fill='%232F89BA' rx='2'/%3E%3Crect x='60' y='25' width='35' height='25' fill='%232F89BA' rx='2'/%3E%3Crect x='25' y='70' width='25' height='30' fill='%232F89BA' rx='2'/%3E%3Crect x='70' y='75' width='30' height='25' fill='%232F89BA' rx='2'/%3E%3Ccircle cx='30' cy='30' r='4' fill='%232F89BA' opacity='0.4'/%3E%3Ccircle cx='77' cy='37' r='3' fill='%232F89BA' opacity='0.4'/%3E%3Cpath d='M15 100 L105 100' stroke='%232F89BA' strokeWidth='1' opacity='0.3'/%3E%3C/svg%3E");
    background-size: 120px 120px;
    background-repeat: repeat;
  }

  .pilar-pattern-comunidade::before {
    content: "";
    @apply absolute inset-0 pointer-events-none opacity-5;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='30' cy='25' r='12' fill='%2356BE76' opacity='0.7'/%3E%3Ccircle cx='70' cy='30' r='14' fill='%2356BE76' opacity='0.7'/%3E%3Ccircle cx='50' cy='65' r='13' fill='%2356BE76' opacity='0.7'/%3E%3Cpath d='M30 37 Q30 50 50 65' fill='none' stroke='%2356BE76' strokeWidth='1.5' opacity='0.4'/%3E%3Cpath d='M70 44 Q70 55 50 65' fill='none' stroke='%2356BE76' strokeWidth='1.5' opacity='0.4'/%3E%3Ccircle cx='30' cy='25' r='8' fill='none' stroke='%2356BE76' strokeWidth='1' opacity='0.3'/%3E%3C/svg%3E");
    background-size: 100px 100px;
    background-repeat: repeat;
  }

  .pilar-pattern-agenda::before {
    content: "";
    @apply absolute inset-0 pointer-events-none opacity-5;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Crect x='15' y='15' width='25' height='25' fill='%23D4A96A' rx='2'/%3E%3Crect x='60' y='15' width='25' height='25' fill='%23D4A96A' rx='2'/%3E%3Crect x='15' y='60' width='25' height='25' fill='%23D4A96A' rx='2'/%3E%3Crect x='60' y='60' width='25' height='25' fill='%23D4A96A' rx='2'/%3E%3Cpath d='M19 20 L37 38' stroke='%23D4A96A' strokeWidth='1' opacity='0.5'/%3E%3Cpath d='M64 20 L82 38' stroke='%23D4A96A' strokeWidth='1' opacity='0.5'/%3E%3Cpath d='M19 65 L37 83' stroke='%23D4A96A' strokeWidth='1' opacity='0.5'/%3E%3Cpath d='M64 65 L82 83' stroke='%23D4A96A' strokeWidth='1' opacity='0.5'/%3E%3C/svg%3E");
    background-size: 100px 100px;
    background-repeat: repeat;
  }

  /* Chapter-specific button moods */
  .chapter-campaign .btn-primary {
    @apply bg-mar-azul text-white hover:bg-mar-azul/90 shadow-md hover:shadow-lg transition-all;
  }

  .chapter-roadmap .btn-primary {
    @apply bg-mar-verde text-white hover:bg-mar-verde/90 shadow-md hover:shadow-lg transition-all;
  }

  .chapter-discovery .btn-primary {
    @apply bg-mar-azul text-white hover:bg-mar-azul/90 shadow-md hover:shadow-lg transition-all;
  }

  .chapter-legacy .btn-primary {
    @apply bg-mar-cobre text-white hover:bg-mar-cobre/90 shadow-md hover:shadow-lg transition-all;
  }

  .chapter-finale .btn-primary {
    @apply bg-mar-areia text-mar-escuro hover:bg-mar-areia/90 shadow-md hover:shadow-lg transition-all;
  }

  .acervo-card {
    box-shadow: 0 14px 34px rgba(6, 35, 63, 0.08);
  }

  .acervo-card::before {
    content: "";
    @apply pointer-events-none absolute inset-x-0 top-0 z-[1] h-16;
    background: linear-gradient(180deg, rgba(6, 35, 63, 0.28), transparent);
  }

  .acervo-card::after {
    content: "";
    @apply pointer-events-none absolute -right-5 top-4 z-[1] h-14 w-14 rotate-12 rounded-md border border-white/30 bg-white/10 backdrop-blur-sm;
  }

  .acervo-card:hover {
    transform: translateY(-2px) rotate(-0.3deg);
    box-shadow: 0 20px 40px rgba(6, 35, 63, 0.14);
  }

  .acervo-card-tag {
    box-shadow: 0 8px 18px rgba(6, 35, 63, 0.12);
  }

  .section-eyebrow {
    @apply mb-3 flex items-center gap-2 text-sm font-medium uppercase tracking-[0.2em] text-mar-areia;
  }

  .section-title {
    @apply text-3xl font-serif text-mar-azul mb-2;
  }

  .section-subtitle {
    @apply text-mar-escuro/70 text-lg mb-10;
  }

  .badge {
    @apply inline-block px-3 py-1 text-xs font-medium rounded-full;
  }

  .badge-verde {
    @apply badge bg-mar-verde/10 text-mar-verde;
  }

  .badge-azul {
    @apply badge bg-mar-azul/10 text-mar-azul;
  }

  .badge-cobre {
    @apply badge bg-mar-cobre/10 text-mar-cobre;
  }

  .prose-museu {
    @apply max-w-none text-mar-escuro leading-relaxed;
  }

  .prose-museu h2 {
    @apply font-serif text-2xl font-bold text-mar-azul mt-8 mb-4;
  }

  .prose-museu h3 {
    @apply font-serif text-xl font-bold text-mar-azul mt-6 mb-3;
  }

  .prose-museu p {
    @apply mb-4 text-mar-escuro/80;
  }

  .prose-museu blockquote {
    @apply my-6 border-l-4 border-mar-areia pl-4 italic text-mar-escuro/70;
  }

  .prose-museu ul {
    @apply list-disc pl-6 mb-4 space-y-2 text-mar-escuro/80;
  }

  .prose-museu a {
    @apply text-mar-azul_claro hover:underline;
  }

  .prose-museu img {
    @apply rounded-lg;
  }

  .prose-museu strong {
    @apply font-semibold text-mar-escuro;
  }

  @media (max-width: 767px) {
    .btn-primary,
    .btn-secondary {
      width: 100%;
    }

    .story-hero .container-site {
      @apply py-10;
    }

    .story-hero > div[aria-hidden="true"] {
      opacity: 0.16;
    }

    .story-hero-panel {
      @apply rounded-[1.6rem] p-5;
    }

    .story-promo-sticker {
      font-size: 10px;
      letter-spacing: 0.12em;
      padding: 0.38rem 0.65rem;
    }

    .story-promo-sticker-top {
      left: 0.75rem;
      top: 0.75rem;
    }

    .story-promo-sticker-bottom {
      right: 0.75rem;
      bottom: 0.75rem;
    }

    .story-hero h1 {
      font-size: clamp(1.95rem, 8vw, 2.45rem);
      line-height: 1.05;
      letter-spacing: -0.02em;
    }

    .story-hero h1 span {
      margin-top: 0.15rem;
    }

    .story-hero p {
      line-height: 1.5;
    }

    .story-hero-cta {
      margin-top: 1.1rem;
      gap: 0.6rem;
    }

    .story-hero-cta .btn-primary,
    .story-hero-cta .btn-secondary {
      padding-block: 0.72rem;
      font-size: 0.94rem;
    }

    .story-hero .product-kpi {
      padding: 0.68rem 0.74rem;
    }

    .story-hero .product-kpi p:first-child {
      font-size: 1.35rem;
      line-height: 1;
    }

    .story-hero .product-kpi p:nth-child(2) {
      font-size: 10px;
      letter-spacing: 0.13em;
    }

    .story-hero .product-kpi p:nth-child(3) {
      font-size: 11px;
      line-height: 1.35;
    }

    .story-wave {
      @apply p-3;
    }

    .story-hero .story-wave,
    .story-hero .story-route {
      margin-top: 1rem;
    }

    .story-hero .story-route {
      padding: 0.78rem;
    }

    .story-hero .story-stop {
      padding: 0.65rem;
    }

    .story-wave-trail {
      height: 5.75rem;
    }

    .story-scene {
      animation: none;
    }

    .section-title {
      @apply text-2xl;
    }

    .section-subtitle {
      @apply mb-6 text-base;
    }

    .story-link-action {
      width: 100%;
      justify-content: center;
    }

    .story-news-header {
      gap: 0.75rem;
    }

    .story-news-chips {
      justify-content: flex-start;
    }

    .story-news-chips span {
      padding-inline: 0.65rem;
      font-size: 10px;
      letter-spacing: 0.11em;
    }

    .story-news-grid {
      gap: 1.15rem;
    }

    .story-news-column {
      padding: 1rem;
    }

    .story-news-column .section-title {
      line-height: 1.15;
    }

    .story-finale-chip-row {
      justify-content: flex-start;
    }

    .story-finale-chip-row span {
      padding-inline: 0.6rem;
      font-size: 10px;
      letter-spacing: 0.12em;
    }

    .wave-separator-top::before {
      height: 1.75rem;
      background-size: 760px 60px;
    }

    .chapter-frame::after {
      right: 0.85rem;
      top: 0.85rem;
      height: 2.4rem;
      width: 2.4rem;
      border-radius: 0.65rem;
    }

    .chapter-tempo-strong .surface-panel,
    .chapter-tempo-strong .story-feed-card,
    .chapter-tempo-strong .acervo-card,
    .chapter-tempo-strong .story-link-card,
    .chapter-tempo-soft .surface-panel,
    .chapter-tempo-soft .story-feed-card,
    .chapter-tempo-soft .roadmap-stop {
      box-shadow: 0 10px 22px rgba(6, 35, 63, 0.08);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .story-scene,
    .story-wave-trail,
    .chapter-reveal,
    .story-avatar-card,
    .story-avatar-compact {
      animation: none !important;
    }
  }
}

@layer utilities {
  @keyframes story-pop {
    0% {
      opacity: 0;
      transform: translateY(6px) scale(0.99);
    }

    100% {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  @keyframes float-story {
    0%,
    100% {
      transform: translateY(0px);
    }

    50% {
      transform: translateY(-6px);
    }
  }

  @keyframes tide-drift {
    0%,
    100% {
      transform: translateY(0px) scale(1);
    }

    50% {
      transform: translateY(-3px) scale(1.006);
    }
  }

  @keyframes chapter-rise {
    0% {
      opacity: 0;
      transform: translateY(18px);
    }

    100% {
      opacity: 1;
      transform: translateY(0);
    }
  }
}
```

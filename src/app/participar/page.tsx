import Link from "next/link";
import { AlertTriangle, Anchor, ArrowRight, Compass, ExternalLink, Sparkles } from "lucide-react";
import { CharacterRoster, type StoryTone } from "@/components/story/CharacterRoster";
import { entryPortals, getEntryPortal, type EntryPortalSlug } from "@/lib/entry-portals";
import { participationProfileOptions } from "@/lib/participant-profile";

type ParticiparPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const profilePortalMap: Record<string, EntryPortalSlug> = {
  estudante: "participantes",
  professor: "participantes",
  voluntario: "participantes",
  apoiador: "apoiadores",
  gestor: "implementacao",
  bolsista: "implementacao",
  equipe_producao: "implementacao",
  equipe_comunicacao: "implementacao",
};

const profileToneBySlug: Record<
  string,
  {
    border: string;
    badge: string;
    title: string;
    halo: string;
    tone: string;
  }
> = {
  estudante: {
    border: "border-sky-200/70 hover:border-sky-400/60",
    badge: "bg-sky-100 text-sky-700",
    title: "group-hover:text-sky-700",
    halo: "ring-sky-300/45",
    tone: "Trilha de aprendizagem",
  },
  professor: {
    border: "border-indigo-200/75 hover:border-indigo-400/60",
    badge: "bg-indigo-100 text-indigo-700",
    title: "group-hover:text-indigo-700",
    halo: "ring-indigo-300/45",
    tone: "Trilha pedagogica",
  },
  voluntario: {
    border: "border-emerald-200/70 hover:border-emerald-400/60",
    badge: "bg-emerald-100 text-emerald-700",
    title: "group-hover:text-emerald-700",
    halo: "ring-emerald-300/45",
    tone: "Trilha comunitaria",
  },
  apoiador: {
    border: "border-amber-200/75 hover:border-amber-400/60",
    badge: "bg-amber-100 text-amber-800",
    title: "group-hover:text-amber-800",
    halo: "ring-amber-300/45",
    tone: "Trilha de apoio",
  },
  gestor: {
    border: "border-violet-200/70 hover:border-violet-400/60",
    badge: "bg-violet-100 text-violet-700",
    title: "group-hover:text-violet-700",
    halo: "ring-violet-300/45",
    tone: "Trilha de gestao",
  },
  bolsista: {
    border: "border-teal-200/75 hover:border-teal-400/60",
    badge: "bg-teal-100 text-teal-700",
    title: "group-hover:text-teal-700",
    halo: "ring-teal-300/45",
    tone: "Trilha de apoio tecnico",
  },
  equipe_producao: {
    border: "border-rose-200/70 hover:border-rose-400/60",
    badge: "bg-rose-100 text-rose-700",
    title: "group-hover:text-rose-700",
    halo: "ring-rose-300/45",
    tone: "Trilha de producao",
  },
  equipe_comunicacao: {
    border: "border-fuchsia-200/70 hover:border-fuchsia-400/60",
    badge: "bg-fuchsia-100 text-fuchsia-700",
    title: "group-hover:text-fuchsia-700",
    halo: "ring-fuchsia-300/45",
    tone: "Trilha de comunicacao",
  },
};

const defaultProfileTone = {
  border: "border-mar-areia/35 hover:border-mar-azul/35",
  badge: "bg-mar-creme text-mar-cobre",
  title: "group-hover:text-mar-azul",
  halo: "ring-mar-areia/45",
  tone: "Trilha participativa",
};

const gincanaPilots = [
  {
    slug: "perocao",
    title: "Tesouros de Perocao",
    summary: "Piloto com a EMEF Francisco Araujo para memoria de bairro, pesca e manguezal.",
  },
  {
    slug: "anchieta",
    title: "O Enigma de Rerigtiba",
    summary: "Piloto historico com foco em patrimonio e leitura do territorio.",
  },
  {
    slug: "piuma",
    title: "O Misterio das Conchas",
    summary: "Piloto ecologico-cultural com artesanato, ilha e biodiversidade.",
  },
] as const;

export default async function ParticiparPage({ searchParams }: ParticiparPageProps) {
  const params = searchParams ? await searchParams : undefined;
  const rawPortal = typeof params?.portal === "string" ? params.portal : null;
  const portal = getEntryPortal(rawPortal);
  const portalTone: StoryTone =
    portal?.slug === "participantes"
      ? "participantes"
      : portal?.slug === "apoiadores"
        ? "apoiadores"
        : portal?.slug === "implementacao" || portal?.slug === "colaboradores"
          ? "implementacao"
          : "default";

  const orderedOptions = portal
    ? [
        ...participationProfileOptions.filter((option) => entryPortals[portal.slug].profiles.includes(option.slug)),
        ...participationProfileOptions.filter((option) => !entryPortals[portal.slug].profiles.includes(option.slug)),
      ]
    : participationProfileOptions;

  return (
    <div className="bg-mar-creme/50 p-8 md:p-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 overflow-hidden rounded-3xl border border-mar-areia/30 bg-white shadow-sm">
          <div className="bg-[radial-gradient(circle_at_12%_16%,rgba(212,169,106,0.2),transparent_32%),radial-gradient(circle_at_88%_18%,rgba(116,194,133,0.18),transparent_30%),linear-gradient(180deg,#f6fbff_0%,#eef7fc_100%)] p-8 md:p-10">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-mar-areia/45 bg-white/70 px-4 py-1 text-sm font-medium uppercase tracking-[0.18em] text-mar-azul">
              <Sparkles className="h-4 w-4" />
              Entrada publica da jornada
            </div>
            <h1 className="font-serif text-4xl font-bold text-mar-escuro md:text-5xl">Escolha sua trilha no Museu do Mar</h1>
            <p className="mt-4 max-w-3xl text-base leading-relaxed text-mar-escuro/70 md:text-lg">
              Antes do login, voce ja pode entender seu percurso. A Turma do Mangue apresenta os perfis e te leva
              para a porta certa de entrada.
            </p>

            <CharacterRoster mode="full" theme="light" tone={portalTone} avatarMood="acolhedor" className="mt-6" />

            <div className="mt-6 flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-mar-azul/80">
              <span className="inline-flex items-center gap-1 rounded-full border border-mar-areia/40 bg-white/80 px-3 py-1">
                <Anchor className="h-3.5 w-3.5" />
                Participacao orientada
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-mar-areia/40 bg-white/80 px-3 py-1">
                Portas por perfil
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-mar-areia/40 bg-white/80 px-3 py-1">
                Login no passo seguinte
              </span>
            </div>
          </div>
        </div>

        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-mar-cobre">Capitulo de entrada</p>
            <h2 className="font-serif text-2xl font-bold text-mar-escuro">Perfis e percursos</h2>
          </div>
          {portal && (
            <div className="rounded-2xl border border-mar-areia/35 bg-white/80 px-4 py-3 text-sm text-mar-escuro/72 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-mar-cobre">Portal em destaque</p>
              <p className="font-semibold text-mar-azul">{portal.title}</p>
              <p>{portal.summary}</p>
            </div>
          )}
        </div>

        <section className="mb-8 rounded-3xl border border-amber-300/70 bg-amber-50/80 p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-white px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-amber-900">
                <AlertTriangle className="h-3.5 w-3.5" />
                Versoes de teste
              </p>
              <h3 className="mt-3 font-serif text-2xl font-bold text-mar-escuro">Gincanas piloto ja publicadas no dominio</h3>
              <p className="mt-2 max-w-3xl text-sm text-mar-escuro/75">
                Estas paginas estao disponiveis em https://museudomares.duckdns.org/ e servem como base de homologacao.
                O conteudo, o roteiro e a interface podem mudar durante a implementacao do projeto.
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {gincanaPilots.map((pilot) => {
              const localHref = `/participar/gincanas/${pilot.slug}`;
              const domainHref = `https://museudomares.duckdns.org/participar/gincanas/${pilot.slug}`;

              return (
                <article key={pilot.slug} className="rounded-2xl border border-amber-200 bg-white p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-amber-800">Gincana piloto</p>
                  <h4 className="mt-1 font-serif text-xl font-bold text-mar-escuro">{pilot.title}</h4>
                  <p className="mt-2 text-sm text-mar-escuro/70">{pilot.summary}</p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link href={localHref} className="btn-secondary">
                      Abrir pagina
                    </Link>
                    <a
                      href={domainHref}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded-lg border border-amber-300 px-3 py-2 text-xs font-semibold text-amber-900 hover:bg-amber-100"
                    >
                      Abrir no dominio <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <div className="grid gap-4 lg:grid-cols-2">
          {orderedOptions.map((option) => {
            const tone = profileToneBySlug[option.slug] ?? defaultProfileTone;
            const optionPortalSlug = profilePortalMap[option.slug] ?? "participantes";
            const optionPortal = entryPortals[optionPortalSlug];

            return (
              <article
                key={option.slug}
                data-profile={option.slug}
                className={`story-card group rounded-2xl border bg-white p-6 ring-1 transition-colors ${tone.border} ${tone.halo}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${tone.badge}`}>
                        {tone.tone}
                      </span>
                      <span className="rounded-full border border-mar-areia/35 bg-mar-creme px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-mar-cobre">
                        {optionPortal.title}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center gap-2 text-sm font-medium uppercase tracking-[0.16em] text-mar-cobre">
                      <Compass className="h-4 w-4" />
                      Perfil de entrada
                    </div>
                    <h3 className={`mt-2 font-serif text-2xl font-bold text-mar-escuro transition-colors ${tone.title}`}>
                      {option.title}
                    </h3>
                    <p className="mt-3 text-sm leading-relaxed text-mar-escuro/65">{option.summary}</p>
                    <p className="mt-4 text-sm font-medium text-mar-azul">{option.highlight}</p>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <Link href={`/admin/login?portal=${optionPortalSlug}`} className="btn-primary bg-mar-areia text-mar-escuro hover:bg-mar-areia/90">
                    Entrar nesta trilha <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link href={`/?portal=${optionPortalSlug}`} className="btn-secondary">
                    Ver campanha relacionada
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}
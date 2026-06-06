import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Compass, HeartHandshake, Shell, Sparkles, Users, Wrench } from "lucide-react";
import { BrandMark } from "@/components/layout/BrandMark";
import { CharacterRoster } from "@/components/story/CharacterRoster";

const heroPortals = [
  {
    title: "Equipe de Implementacao",
    description: "Bastidores da producao, governanca e mobilizacao local.",
    href: "/participar?portal=colaboradores",
    Icon: Wrench,
    active: true,
  },
  {
    title: "Estudantes, Professores e Voluntarios",
    description: "Desafios da caca da memoria, missoes no mangue e na escola.",
    href: "/participar?portal=participantes",
    Icon: Users,
    active: false,
  },
  {
    title: "Familias, Parceiros e Apoiadores",
    description: "Impacto social, rede de apoio e fortalecimento da memoria local.",
    href: "/participar?portal=apoiadores",
    Icon: HeartHandshake,
    active: false,
  },
  {
    title: "Visitantes e Comunidade",
    description: "Entrada aberta para explorar historias, acervo e agenda viva.",
    href: "/visitantes",
    Icon: Compass,
    active: false,
  },
] as const;

export function MobileHero() {
  return (
    <section className="overflow-hidden bg-mar-escuro text-white">
      <div className="border-b border-white/10 bg-mar-areia py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-mar-escuro">
        <div className="container-site flex flex-wrap items-center gap-x-4 gap-y-1">
          <span>Historia viva de Perocao</span>
          <span className="text-mar-cobre">&#183;</span>
          <span>Caca da memoria</span>
          <span className="text-mar-cobre">&#183;</span>
          <span>Educacao patrimonial</span>
          <span className="text-mar-cobre">&#183;</span>
          <span>Turma do Mangue</span>
        </div>
      </div>

      <div className="relative border-b border-white/10">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/story/applications/cais-perocao-hero-bg.png')" }}
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-[linear-gradient(100deg,rgba(6,35,63,0.94)_18%,rgba(6,35,63,0.7)_52%,rgba(6,35,63,0.92)_100%)]" aria-hidden="true" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_84%,rgba(212,169,106,0.22),transparent_40%),radial-gradient(circle_at_90%_10%,rgba(28,116,163,0.2),transparent_42%)]" aria-hidden="true" />

        <div className="relative container-site py-8 md:py-10">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr),390px] lg:gap-0">
            <div className="border-white/10 pb-2 lg:border-r lg:pr-8">
              <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.24em] text-mar-areia/80">Capitulo 1 - convite</p>
              <BrandMark className="mb-6" />

              <h1 className="max-w-3xl text-4xl font-bold leading-[1.03] tracking-[-0.02em] md:text-6xl">
                Memoria viva do mar,
                <span className="mt-2 block text-mar-areia">comunidade e futuro em movimento</span>
              </h1>

              <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/82 md:text-lg">
                Pedro Cao e a Turma do Mangue te convidam para a caca da memoria. Cada pista conecta criancas,
                familias e vizinhanca para cuidar do patrimonio cultural pesqueiro em Perocao.
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link href="/participar" className="btn-primary w-full justify-center bg-mar-areia text-mar-escuro hover:bg-mar-areia/90 sm:w-auto">
                  Entrar na aventura <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href="/acervo" className="btn-secondary w-full justify-center border-white/35 text-white hover:border-mar-areia hover:bg-mar-areia hover:text-mar-escuro sm:w-auto">
                  Explorar o acervo
                </Link>
              </div>

              <div className="mt-8 rounded-3xl border border-white/20 bg-white/5 p-4 backdrop-blur-sm md:max-w-xl">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/80">
                  <Shell className="h-3.5 w-3.5" />
                  Cartaz da campanha
                </div>
                <figure className="relative aspect-[16/10] overflow-hidden rounded-2xl border border-white/20 bg-white/10">
                  <Image
                    src="/story/applications/hero-turma-mangue-clean.png"
                    alt="Turma do Mangue apresentando o Museu do Mar"
                    fill
                    sizes="(min-width: 1024px) 46vw, 92vw"
                    className="object-contain"
                    priority
                  />
                </figure>
              </div>
            </div>

            <aside className="rounded-3xl border border-white/15 bg-white/[0.04] p-5 backdrop-blur-sm lg:ml-8 lg:rounded-none lg:border-0 lg:p-0 lg:pl-8 lg:pt-3">
              <p className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-white/52">Portais de entrada</p>
              <div className="space-y-2.5">
                {heroPortals.map((portal) => (
                  <Link
                    key={portal.title}
                    href={portal.href}
                    className={`block rounded-2xl border p-4 transition-colors ${
                      portal.active
                        ? "border-mar-areia/60 bg-mar-areia/15"
                        : "border-white/15 bg-white/[0.03] hover:border-white/30 hover:bg-white/[0.09]"
                    }`}
                  >
                    <div className="mb-1 flex items-start justify-between gap-2">
                      <p className="text-sm font-bold text-white">{portal.title}</p>
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-mar-areia/20 text-mar-areia">
                        <portal.Icon className="h-4 w-4" />
                      </span>
                    </div>
                    <p className="text-xs leading-relaxed text-white/65">{portal.description}</p>
                  </Link>
                ))}
              </div>

              <div className="mt-5 border-t border-white/10 pt-4">
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/48">Personagens-guia</p>
                <CharacterRoster mode="compact" theme="dark" avatarMood="acolhedor" className="grid-cols-1 sm:grid-cols-2" />
              </div>
            </aside>
          </div>

          <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-mar-areia/45 bg-mar-areia/10 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-mar-areia">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Landing editorial de campanha</span>
          </div>
        </div>
      </div>
    </section>
  );
}

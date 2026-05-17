import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Shell, Sparkles } from "lucide-react";
import { BrandMark } from "@/components/layout/BrandMark";

export function MobileHero() {
  return (
    <section className="relative overflow-hidden bg-mar-escuro text-white">
      {/* Background real (Cais de Perocao) */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/story/applications/cais-perocao-hero-bg.png')" }}
        aria-hidden="true"
      />
      {/* Overlay: melhora contraste sem esconder a paisagem */}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(6,35,63,0.62)_0%,rgba(6,35,63,0.46)_35%,rgba(6,35,63,0.72)_100%)]" aria-hidden="true" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(250,240,212,0.22),transparent_45%),radial-gradient(circle_at_85%_18%,rgba(116,194,133,0.14),transparent_42%)]" aria-hidden="true" />

      <div className="relative container-site py-10 md:py-14">
        <div className="grid gap-6 lg:grid-cols-[1.05fr,0.95fr] lg:items-start">
          <div className="rounded-3xl border border-mar-areia/35 bg-mar-escuro/35 p-5 shadow-2xl backdrop-blur md:p-7">
            <BrandMark className="mb-5" />

            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-mar-areia/45 bg-mar-areia/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-mar-areia">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Landing de campanha</span>
            </div>

            <h1 className="text-3xl font-bold leading-[1.06] tracking-tight text-white md:text-5xl">
              Bem-vindos ao
              <span className="mt-1 block text-mar-areia">Ponto de Memoria Museu do Mar</span>
            </h1>

            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/86 md:text-lg">
              Memoria comunitaria, cultura do mar e participacao no territorio do Perocao — com a Turma do Mangue.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link href="/participar" className="btn-primary w-full justify-center bg-mar-areia text-mar-escuro hover:bg-mar-areia/90 sm:w-auto">
                Quero participar <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/acervo" className="btn-secondary w-full justify-center border-mar-areia/60 text-mar-areia hover:bg-mar-areia hover:text-mar-escuro sm:w-auto">
                Explorar o acervo
              </Link>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-white/15 bg-white/10 p-3 text-xs leading-relaxed text-white/80">
                <p className="font-semibold uppercase tracking-[0.16em] text-mar-areia">Como funciona</p>
                <p className="mt-1">Explore, participe e transforme: a historia vira convite e acao no bairro.</p>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/10 p-3 text-xs leading-relaxed text-white/80">
                <p className="font-semibold uppercase tracking-[0.16em] text-mar-areia">Primeira visita</p>
                <p className="mt-1">Escolha um caminho (visitantes, participantes, colaboradores ou apoiadores).</p>
              </div>
            </div>
          </div>

          {/* Cartaz / ilustracao principal — mobile-first, sem corte: object-contain */}
          <div className="rounded-3xl border border-mar-areia/30 bg-white/10 p-4 shadow-[0_28px_56px_rgba(6,35,63,0.18)]">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/80">
              <Shell className="h-3.5 w-3.5" />
              Hero ilustrado (HQ infantil)
            </div>
            <figure className="relative aspect-[9/10] overflow-hidden rounded-[1.55rem] border border-white/20 bg-white/5">
              <Image
                src="/story/applications/hero-turma-mangue-clean.png"
                alt="Turma do Mangue apresentando o Museu do Mar"
                fill
                sizes="(min-width: 1024px) 40vw, 92vw"
                className="object-contain"
                priority
              />
            </figure>
            <p className="mt-3 text-xs leading-relaxed text-white/70">
              Dica: no mobile, a cena deve aparecer inteira (sem cortes). Por isso o poster usa <span className="font-semibold">object-contain</span>.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

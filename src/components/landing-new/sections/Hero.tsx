import Image from "next/image";
import Link from "next/link";

export default function Hero() {
  return (
    <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
      <div className="relative">
        <div className="absolute inset-0">
          <Image
            src="/story/applications/hero-turma-mangue-cais-perocao.png"
            alt=""
            fill
            priority
            className="object-cover opacity-60"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-white via-white/80 to-white/30" />
        </div>

        <div className="relative grid grid-cols-1 gap-6 p-6 sm:p-10 lg:grid-cols-2 lg:items-stretch">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-4 py-1 text-xs font-extrabold uppercase tracking-[0.18em] text-slate-700">
              Bem-vindos ao Museu do Mar
            </div>

            <h1 className="mt-4 text-4xl font-black leading-[1.05] tracking-tight text-slate-900 sm:text-5xl">
              Bem-vindos ao <span className="text-sky-900">Ponto de Memoria</span>
              <br />
              Museu do Mar
            </h1>

            <p className="mt-4 text-base leading-relaxed text-slate-700 sm:text-lg">
              Nosso museu e feito de memorias, historias e afetos do mar e do mangue. Aqui, a comunidade preserva,
              compartilha e celebra a cultura que nos conecta.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/participar"
                className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-extrabold text-white shadow-sm hover:bg-slate-800"
              >
                Quero participar
              </Link>
              <Link
                href="/acervo"
                className="inline-flex items-center justify-center rounded-2xl bg-sky-100 px-5 py-3 text-sm font-extrabold text-sky-900 ring-1 ring-slate-900/10 hover:bg-sky-50"
              >
                Explorar o acervo
              </Link>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white/70 p-4 shadow-sm">
            <Image
              src="/story/applications/turma-do-mangue-panorama.png"
              alt="Turma do Mangue apresentando o Museu do Mar"
              width={1400}
              height={700}
              className="h-auto w-full rounded-2xl object-cover"
            />
            <p className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
              Turma do Mangue - cartaz do hero
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

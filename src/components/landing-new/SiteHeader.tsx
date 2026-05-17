import Link from "next/link";

const nav = [
  { href: "/landing", label: "Inicio" },
  { href: "/sobre", label: "Sobre nos" },
  { href: "/acervo", label: "Acervo" },
  { href: "/participar", label: "Participar" },
  { href: "/agenda", label: "Agenda" },
  { href: "/turma-do-mangue", label: "Turma do Mangue" },
  { href: "/contato", label: "Contato" },
] as const;

export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/75 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/landing" className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100 text-amber-800 ring-1 ring-slate-900/10">
            <span className="text-xl">o</span>
          </span>
          <span className="leading-tight">
            <span className="block text-xs font-extrabold uppercase tracking-[0.18em] text-slate-600">
              Ponto de Memoria
            </span>
            <span className="block text-2xl font-black tracking-tight text-slate-900">
              Museu do Mar
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Navegacao">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-sky-50 hover:text-slate-900"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Buscar"
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          >
            ?
          </button>
          <Link
            href="/participar"
            className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-extrabold text-white shadow-sm hover:bg-slate-800"
          >
            Quero participar
          </Link>
        </div>
      </div>
    </header>
  );
}

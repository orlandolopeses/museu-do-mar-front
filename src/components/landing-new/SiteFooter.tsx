import Link from "next/link";

const links = [
  { href: "/sobre", label: "Sobre nos" },
  { href: "/sobre", label: "Perguntas frequentes" },
  { href: "/sobre", label: "Politica de privacidade" },
  { href: "/sobre", label: "Termos de uso" },
  { href: "/sobre", label: "Acessibilidade" },
] as const;

export default function SiteFooter() {
  return (
    <footer className="border-t border-slate-200/70 bg-white/70">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="text-sm text-slate-600">
            <div className="font-extrabold text-slate-900">Museu do Mar - Ponto de Memoria</div>
            <div>© 2026 Ponto de Memoria Museu do Mar</div>
          </div>

          <nav className="flex flex-wrap gap-x-4 gap-y-2 text-sm font-semibold text-slate-700">
            {links.map((l) => (
              <Link key={`${l.href}-${l.label}`} href={l.href} className="hover:text-slate-900">
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}

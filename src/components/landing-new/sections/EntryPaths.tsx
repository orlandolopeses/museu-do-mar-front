import Link from "next/link";

type Props = { className?: string };

const paths = [
  {
    key: "visitantes",
    title: "Visitantes",
    desc: "Descubra o acervo e as historias do nosso territorio.",
    href: "/acervo",
    tone: "bg-emerald-50",
    cta: "Entrar",
  },
  {
    key: "participantes",
    title: "Participantes",
    desc: "Compartilhe memorias, fotos, objetos e saberes com a comunidade.",
    href: "/participar?portal=participantes",
    tone: "bg-amber-50",
    cta: "Entrar",
  },
  {
    key: "colaboradores",
    title: "Colaboradores",
    desc: "Pesquise, produza e ajude a construir conteudos e projetos do museu.",
    href: "/admin/login?portal=participantes",
    tone: "bg-sky-50",
    cta: "Entrar",
  },
  {
    key: "apoiadores",
    title: "Apoiadores",
    desc: "Apoie iniciativas que fortalecem nossa memoria e cultura do mar.",
    href: "/participar?portal=apoiadores",
    tone: "bg-violet-50",
    cta: "Entrar",
  },
] as const;

export default function EntryPaths({ className }: Props) {
  return (
    <section id="caminhos" className={className}>
      <div className="h-full rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-black tracking-tight text-slate-900">Caminhos de participacao</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-700">
          Escolha o caminho que combina com voce para entrar no Museu do Mar.
        </p>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {paths.map((p) => (
            <article
              key={p.key}
              className={`rounded-2xl border border-slate-200 ${p.tone} p-4 shadow-sm`}
            >
              <h3 className="text-lg font-extrabold text-slate-900">{p.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-slate-700">{p.desc}</p>
              <Link
                href={p.href}
                className="mt-3 inline-flex items-center justify-center rounded-xl bg-white px-3 py-2 text-sm font-extrabold text-slate-900 ring-1 ring-slate-900/10 hover:bg-slate-50"
              >
                {p.cta} {"->"}
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

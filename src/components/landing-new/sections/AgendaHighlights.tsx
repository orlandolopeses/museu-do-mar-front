type Props = { className?: string };

const items = [
  { date: "24 MAI", title: "Roda de Memorias", desc: "Historias de pesca e da mare cheia.", action: "Saiba mais ->" },
  { date: "08 JUN", title: "Oficina de Barquinhos", desc: "Brincar, construir e navegar na imaginacao.", action: "Saiba mais ->" },
  { date: "15 JUN", title: "Destaque do Acervo", desc: "Fotografias antigas ligadas a nossa comunidade.", action: "Explorar ->" },
] as const;

export default function AgendaHighlights({ className }: Props) {
  return (
    <section id="agenda" className={className}>
      <div className="h-full rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-black tracking-tight text-slate-900">Agenda e Destaques</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-700">
          Um recorte curto no MVP. Depois pode vir do CMS.
        </p>

        <div className="mt-4 space-y-3">
          {items.map((i) => (
            <div key={i.title} className="rounded-2xl border border-slate-200 bg-slate-50/40 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs font-extrabold uppercase tracking-[0.18em] text-slate-600">{i.date}</div>
                  <div className="mt-1 text-sm font-extrabold text-slate-900">{i.title}</div>
                  <div className="mt-1 text-sm leading-relaxed text-slate-700">{i.desc}</div>
                </div>
              </div>
              <div className="mt-2 text-sm font-extrabold text-sky-900">{i.action}</div>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-2xl bg-sky-50 p-4 text-sm font-semibold text-sky-900 ring-1 ring-slate-900/10">
          O mar guarda historias. A gente guarda com carinho.
          <div className="mt-1 font-extrabold">Participe dessa rede de memorias!</div>
        </div>
      </div>
    </section>
  );
}

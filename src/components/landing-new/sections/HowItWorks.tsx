type Props = { className?: string };

const steps = [
  {
    n: 1,
    title: "Explore",
    desc: "Navegue pelo acervo e descubra historias sobre o mar e o mangue.",
    icon: "O",
    tone: "bg-emerald-50 text-emerald-900",
  },
  {
    n: 2,
    title: "Participe",
    desc: "Compartilhe memorias, fotos e saberes com a comunidade. Sua historia faz parte do museu.",
    icon: "[]",
    tone: "bg-amber-50 text-amber-900",
  },
  {
    n: 3,
    title: "Transforme",
    desc: "Juntos, preservamos nossa cultura e inspiramos as proximas geracoes.",
    icon: "><>",
    tone: "bg-sky-50 text-sky-900",
  },
] as const;

export default function HowItWorks({ className }: Props) {
  return (
    <section id="como-funciona" className={className}>
      <div className="h-full rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-2xl font-black tracking-tight text-slate-900">Como funciona</h2>
          <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-extrabold uppercase tracking-[0.18em] text-white">
            Roadmap
          </span>
        </div>

        <div className="mt-4 space-y-3">
          {steps.map((s) => (
            <div
              key={s.n}
              className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50/40 p-4"
            >
              <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${s.tone} ring-1 ring-slate-900/10`}>
                <span className="text-lg font-bold">{s.icon}</span>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white text-slate-900 ring-1 ring-slate-900/10">
                    {s.n}
                  </span>
                  {s.title}
                </div>
                <p className="mt-1 text-sm leading-relaxed text-slate-700">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

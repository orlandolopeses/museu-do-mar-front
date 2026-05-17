import { Camera, Shell, Waves } from "lucide-react";

const steps = [
  {
    n: "1",
    title: "Explore",
    body: "Navegue pelo acervo e descubra historias do mar e do mangue.",
    Icon: Shell,
  },
  {
    n: "2",
    title: "Participe",
    body: "Compartilhe memorias, fotos e saberes com a comunidade.",
    Icon: Camera,
  },
  {
    n: "3",
    title: "Transforme",
    body: "Juntos, preservamos a cultura e inspiramos novas geracoes.",
    Icon: Waves,
  },
] as const;

export function HowItWorks() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {steps.map((step) => (
        <article
          key={step.title}
          className="rounded-2xl border border-mar-areia/35 bg-white p-4 shadow-[0_10px_20px_rgba(6,35,63,0.06)]"
        >
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-mar-azul/10 text-sm font-bold text-mar-azul">
                {step.n}
              </span>
              <p className="text-sm font-bold text-mar-escuro">{step.title}</p>
            </div>
            <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-mar-areia/20 text-mar-cobre">
              <step.Icon className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-mar-escuro/70">{step.body}</p>
        </article>
      ))}
    </div>
  );
}

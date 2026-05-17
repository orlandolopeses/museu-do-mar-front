import Image from "next/image";
import Link from "next/link";

type Props = { className?: string };

const characters = [
  { name: "Gui", role: "Guia", mark: "G" },
  { name: "Iara", role: "Memoria", mark: "I" },
  { name: "Davi", role: "Horizonte", mark: "D" },
  { name: "Yara", role: "Mare", mark: "Y" },
  { name: "Dona Cida", role: "Marisqueira", mark: "C" },
] as const;

export default function MangueRoster({ className }: Props) {
  return (
    <section id="turma" className={className}>
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-slate-900">Turma do Mangue</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-700">
              Conheca a turma que vive grandes aventuras e aprende com o mar, o mangue e as pessoas da comunidade.
            </p>
          </div>
          <Link
            href="/turma-do-mangue"
            className="inline-flex items-center justify-center rounded-2xl bg-sky-100 px-4 py-2.5 text-sm font-extrabold text-sky-900 ring-1 ring-slate-900/10 hover:bg-sky-50"
          >
            Conhecer a turma {"->"}
          </Link>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-50/40">
            <Image
              src="/story/applications/turma-do-mangue-panorama.png"
              alt="Panorama da Turma do Mangue"
              width={1400}
              height={700}
              className="h-auto w-full object-cover"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {characters.map((c) => (
              <div key={c.name} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="text-2xl font-black text-slate-700">{c.mark}</div>
                <div className="mt-2 text-sm font-extrabold text-slate-900">{c.name}</div>
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">{c.role}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

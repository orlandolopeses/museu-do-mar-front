import Link from "next/link";
import { Calendar, Camera, ArrowRight } from "lucide-react";
import type { eventos, acervo } from "@/lib/schema";
import { formatDateShort, truncate } from "@/lib/utils";

type Evento = typeof eventos.$inferSelect;
type AcervoItem = typeof acervo.$inferSelect;

export function AgendaHighlights({
  upcomingEventos,
  recentAcervo,
}: {
  upcomingEventos: Evento[];
  recentAcervo: AcervoItem[];
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="rounded-2xl border border-mar-areia/35 bg-white p-5 shadow-[0_12px_26px_rgba(6,35,63,0.08)]">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-mar-cobre">
            <Calendar className="h-4 w-4" />
            Agenda
          </div>
          <Link href="/agenda" className="text-sm font-semibold text-mar-azul hover:underline">
            Ver tudo
          </Link>
        </div>
        <div className="space-y-3">
          {(upcomingEventos.length ? upcomingEventos : []).slice(0, 3).map((evento) => (
            <article key={evento.id} className="rounded-xl border border-mar-areia/30 bg-mar-creme/40 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-mar-cobre">{formatDateShort(evento.dataInicio)}</p>
              <h3 className="mt-1 text-base font-bold text-mar-escuro">{evento.titulo}</h3>
              <p className="mt-1 text-sm leading-relaxed text-mar-escuro/70">{truncate(evento.descricao ?? "", 120)}</p>
            </article>
          ))}
          {!upcomingEventos.length ? (
            <p className="text-sm text-mar-escuro/70">Nenhum evento publicado no momento.</p>
          ) : null}
        </div>
      </section>

      <section className="rounded-2xl border border-mar-areia/35 bg-white p-5 shadow-[0_12px_26px_rgba(6,35,63,0.08)]">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-mar-cobre">
            <Camera className="h-4 w-4" />
            Destaques do acervo
          </div>
          <Link href="/acervo" className="text-sm font-semibold text-mar-azul hover:underline">
            Explorar
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {(recentAcervo.length ? recentAcervo : []).slice(0, 4).map((item) => (
            <article key={item.id} className="rounded-xl border border-mar-areia/30 bg-mar-creme/40 p-4">
              <h3 className="text-sm font-bold text-mar-escuro">{item.titulo}</h3>
              <p className="mt-1 text-sm leading-relaxed text-mar-escuro/70">{truncate(item.descricao ?? "", 92)}</p>
              <Link href={`/acervo/${item.id}`} className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-mar-azul">
                Ver item <ArrowRight className="h-4 w-4" />
              </Link>
            </article>
          ))}
          {!recentAcervo.length ? (
            <p className="text-sm text-mar-escuro/70">Nenhum item publicado no momento.</p>
          ) : null}
        </div>
      </section>
    </div>
  );
}

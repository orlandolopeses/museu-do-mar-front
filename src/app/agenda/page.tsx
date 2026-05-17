import type { Metadata } from "next";
import { db } from "@/lib/db";
import { eventos, instituicoes } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { formatDate } from "@/lib/utils";
import { Calendar, MapPin, Clock, CalendarRange, Users } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Agenda de Eventos",
  description: "Eventos, oficinas e atividades culturais do Museu do Mar.",
};

async function getEventos() {
  try {
    const [items, institutions] = await Promise.all([
      db
        .select()
        .from(eventos)
        .where(eq(eventos.publicado, true))
        .orderBy(eventos.dataInicio),
      db.select({ id: instituicoes.id, nome: instituicoes.nome }).from(instituicoes),
    ]);

    const institutionNameById = new Map(institutions.map((institution) => [institution.id, institution.nome]));

    return items.map((evento) => ({
      ...evento,
      instituicaoNome: evento.instituicaoId ? institutionNameById.get(evento.instituicaoId) ?? null : null,
    }));
  } catch {
    return [];
  }
}

export default async function AgendaPage() {
  const items = await getEventos();

  return (
    <div className="py-12">
      <div className="container-site">
        <div className="mb-10 max-w-4xl">
          <div className="section-eyebrow">
            <CalendarRange className="h-4 w-4" />
            <span>Circulação pública</span>
          </div>
          <h1 className="section-title">Agenda de Eventos</h1>
          <p className="section-subtitle">
            Oficinas, exposições, rodas de memória e atividades culturais ligadas ao Museu do Mar e ao território.
          </p>
        </div>

        <div className="surface-panel mb-8 grid gap-6 p-6 md:grid-cols-[1.3fr,0.9fr]">
          <div>
            <h2 className="mb-2 font-serif text-2xl font-bold text-mar-azul">Encontros do território</h2>
            <p className="text-sm leading-relaxed text-mar-escuro/72">
              A agenda organiza a presença pública do projeto, reunindo ações de escuta, formação,
              circulação cultural e ativação comunitária.
            </p>
          </div>
          <div className="flex items-start gap-3 rounded-xl bg-mar-cobre/8 p-4">
            <Users className="mt-1 h-5 w-5 text-mar-cobre" />
            <p className="text-sm leading-relaxed text-mar-escuro/70">
              Priorizar atividades que fortaleçam vínculo com moradores, pesquisadores e escolas.
            </p>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="py-24 text-center text-mar-escuro/40">
            <Calendar className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="font-serif text-xl mb-2">Nenhum evento cadastrado</p>
            <p className="text-sm">A agenda de eventos será publicada em breve.</p>
          </div>
        ) : (
          <div className="max-w-3xl space-y-4">
            {items.map((evento) => (
              <Link key={evento.id} href={`/agenda/${evento.id}`} className="card p-6 flex gap-6 group">
                <div className="w-20 shrink-0 bg-mar-cobre/10 rounded-xl p-3 text-center">
                  <p className="font-serif font-bold text-mar-cobre text-lg leading-none">
                    {new Date(evento.dataInicio).getDate()}
                  </p>
                  <p className="text-xs text-mar-cobre/70 uppercase font-medium mt-1">
                    {new Date(evento.dataInicio).toLocaleDateString("pt-BR", { month: "short" })}
                  </p>
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-serif font-bold text-mar-escuro text-lg group-hover:text-mar-azul transition-colors">
                        {evento.titulo}
                      </h3>
                      {evento.instituicaoNome && (
                        <p className="mt-1 text-xs font-medium uppercase tracking-wide text-mar-cobre/80">
                          {evento.instituicaoNome}
                        </p>
                      )}
                    </div>
                    {evento.categoria && <span className="badge-azul shrink-0">{evento.categoria}</span>}
                  </div>
                  {evento.descricao && (
                    <p className="text-mar-escuro/70 text-sm mt-2 leading-relaxed">{evento.descricao}</p>
                  )}
                  <div className="flex flex-wrap gap-4 mt-3 text-xs text-mar-escuro/50">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDate(evento.dataInicio)}
                      {evento.dataFim && evento.dataFim !== evento.dataInicio && (
                        <> até {formatDate(evento.dataFim)}</>
                      )}
                    </span>
                    {evento.local && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {evento.local}
                      </span>
                    )}
                    {evento.instituicaoNome && !evento.local && (
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {evento.instituicaoNome}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

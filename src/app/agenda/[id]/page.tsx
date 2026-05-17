import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { ArrowLeft, Calendar, Clock, ExternalLink, MapPin, CalendarRange } from "lucide-react";
import Link from "next/link";
import { db } from "@/lib/db";
import { eventos, instituicoes } from "@/lib/schema";
import { formatDate } from "@/lib/utils";
import { RemoteImage } from "@/components/ui/RemoteImage";

type EventoPageProps = {
  params: {
    id: string;
  };
};

async function getEvento(id: string) {
  const [evento] = await db
    .select()
    .from(eventos)
    .where(and(eq(eventos.id, id), eq(eventos.publicado, true)))
    .limit(1);

  if (!evento) {
    return null;
  }

  const [instituicao] = evento.instituicaoId
    ? await db.select({ nome: instituicoes.nome }).from(instituicoes).where(eq(instituicoes.id, evento.instituicaoId)).limit(1)
    : [null];

  return {
    ...evento,
    instituicaoNome: instituicao?.nome ?? null,
  };
}

function formatTime(date: Date | string | null | undefined) {
  if (!date) return "";

  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(date));
}

export async function generateMetadata({ params }: EventoPageProps): Promise<Metadata> {
  const evento = await getEvento(params.id);

  if (!evento) {
    return {
      title: "Evento não encontrado",
    };
  }

  return {
    title: evento.titulo,
    description: evento.descricao ?? undefined,
  };
}

export default async function EventoPage({ params }: EventoPageProps) {
  const evento = await getEvento(params.id);

  if (!evento) notFound();

  return (
    <div className="py-12">
      <div className="container-site max-w-4xl">
        <Link
          href="/agenda"
          className="inline-flex items-center gap-2 text-sm text-mar-azul hover:text-mar-azul_claro mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para a agenda
        </Link>

        <article className="overflow-hidden rounded-2xl border border-mar-areia/30 bg-white">
          {evento.coverImage ? (
            <div className="aspect-[16/7] bg-mar-cobre/10 overflow-hidden">
              <RemoteImage src={evento.coverImage} alt={evento.titulo} className="w-full h-full object-cover" loading="eager" />
            </div>
          ) : (
            <div className="aspect-[16/7] bg-mar-cobre/10 flex items-center justify-center">
              <Calendar className="w-12 h-12 text-mar-cobre/30" />
            </div>
          )}

          <div className="p-6 md:p-10">
            <div className="section-eyebrow mb-4">
              <CalendarRange className="h-4 w-4" />
              <span>Programação cultural</span>
            </div>
            <div className="flex flex-wrap items-center gap-3 mb-4">
              {evento.categoria && <span className="badge-azul">{evento.categoria}</span>}
              <span className="badge bg-mar-cobre/10 text-mar-cobre">Programação cultural</span>
              {evento.instituicaoNome && <span className="badge bg-mar-verde/10 text-mar-verde">{evento.instituicaoNome}</span>}
            </div>

            <h1 className="font-serif text-3xl md:text-5xl font-bold text-mar-escuro leading-tight mb-6">
              {evento.titulo}
            </h1>

            <div className="grid gap-4 md:grid-cols-2 bg-mar-creme rounded-2xl p-5 mb-8 text-sm text-mar-escuro/75">
              <div className="flex items-start gap-3">
                <Clock className="w-4 h-4 mt-0.5 text-mar-cobre" />
                <div>
                  <p className="text-xs uppercase tracking-wide text-mar-escuro/40 mb-1">Quando</p>
                  <p>{formatDate(evento.dataInicio)}</p>
                  <p className="text-mar-escuro/55">Início às {formatTime(evento.dataInicio)}</p>
                  {evento.dataFim && (
                    <p className="text-mar-escuro/55">
                      Encerramento em {formatDate(evento.dataFim)} às {formatTime(evento.dataFim)}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 mt-0.5 text-mar-cobre" />
                <div>
                  <p className="text-xs uppercase tracking-wide text-mar-escuro/40 mb-1">Local</p>
                  <p>{evento.local ?? "A definir"}</p>
                  {evento.instituicaoNome && <p className="text-mar-escuro/55">Instituição: {evento.instituicaoNome}</p>}
                </div>
              </div>
            </div>

            <div className="surface-panel mb-8 p-5">
              <p className="text-sm leading-relaxed text-mar-escuro/72">
                Esta atividade integra a circulação pública do Museu do Mar e fortalece o vínculo entre
                memória, participação comunitária, mediação cultural e presença territorial.
              </p>
            </div>

            {evento.descricao && (
              <div className="prose-museu max-w-none">
                {evento.descricao.split(/\n{2,}/).map((paragraph, index) => (
                  <p key={`${evento.id}-${index}`} className="whitespace-pre-wrap">
                    {paragraph}
                  </p>
                ))}
              </div>
            )}

            {evento.linkExterno && (
              <div className="mt-8">
                <a
                  href={evento.linkExterno}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-primary"
                >
                  <ExternalLink className="w-4 h-4" />
                  Abrir link externo
                </a>
              </div>
            )}
          </div>
        </article>
      </div>
    </div>
  );
}

import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { ArrowLeft, Calendar, HeartHandshake, MessageCircleHeart, NotebookPen } from "lucide-react";
import { updateVoluntarioTracking } from "@/app/app/voluntario/actions";
import { requireVolunteerAccess } from "@/lib/access";
import { db } from "@/lib/db";
import { acompanhamentosJornada, eventos, forumTopicos } from "@/lib/schema";
import { getSecondaryJourneyTrackingStatusLabel } from "@/lib/secondary-journey-tracking";
import { formatDate } from "@/lib/utils";

type TrackingDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const statusToneMap = {
  aberto: "bg-mar-cobre/10 text-mar-cobre",
  em_andamento: "bg-mar-azul/10 text-mar-azul",
  concluido: "bg-mar-verde/10 text-mar-verde",
} as const;

function parseSingleSearchParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

async function getTrackingDetail(trackingId: string, userId: string) {
  const [record] = await db
    .select({
      id: acompanhamentosJornada.id,
      titulo: acompanhamentosJornada.titulo,
      resumo: acompanhamentosJornada.resumo,
      proximoPasso: acompanhamentosJornada.proximoPasso,
      apoioNecessario: acompanhamentosJornada.apoioNecessario,
      status: acompanhamentosJornada.status,
      createdAt: acompanhamentosJornada.createdAt,
      updatedAt: acompanhamentosJornada.updatedAt,
      referenciaEventoId: acompanhamentosJornada.referenciaEventoId,
      referenciaTopicoId: acompanhamentosJornada.referenciaTopicoId,
      eventoTitulo: eventos.titulo,
      eventoDataInicio: eventos.dataInicio,
      eventoLocal: eventos.local,
      topicoTitulo: forumTopicos.titulo,
    })
    .from(acompanhamentosJornada)
    .leftJoin(eventos, eq(acompanhamentosJornada.referenciaEventoId, eventos.id))
    .leftJoin(forumTopicos, eq(acompanhamentosJornada.referenciaTopicoId, forumTopicos.id))
    .where(
      and(
        eq(acompanhamentosJornada.id, trackingId),
        eq(acompanhamentosJornada.origem, "voluntario"),
        eq(acompanhamentosJornada.userId, userId),
      ),
    )
    .limit(1);

  return record ?? null;
}

export default async function VoluntarioTrackingDetailPage({ params, searchParams }: TrackingDetailPageProps) {
  const { id } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const updateState = parseSingleSearchParam(resolvedSearchParams.update);

  const session = await requireVolunteerAccess();
  const record = await getTrackingDetail(id, session.user.id);

  if (!record) {
    notFound();
  }

  const statusLabel = getSecondaryJourneyTrackingStatusLabel(record.status);
  const statusTone = statusToneMap[record.status] ?? "bg-mar-areia/20 text-mar-escuro";

  return (
    <div className="p-8 md:p-10">
      <div className="max-w-4xl">
        <div className="mb-6">
          <Link href="/app/voluntario" className="inline-flex items-center gap-2 text-sm font-medium text-mar-azul hover:underline">
            <ArrowLeft className="h-4 w-4" />
            Voltar ao painel do voluntário
          </Link>
        </div>

        <div className="mb-8 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-sm font-medium uppercase tracking-wide text-mar-azul">
            <HeartHandshake className="h-4 w-4" />
            Jornada do Voluntário · Acompanhamento
          </div>
          <h1 className="font-serif text-4xl font-bold text-mar-escuro">{record.titulo}</h1>
          <div className="flex flex-wrap items-center gap-3 text-sm text-mar-escuro/55">
            <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusTone}`}>{statusLabel}</span>
            <span>Criado em {formatDate(record.createdAt)}</span>
            <span>·</span>
            <span>Atualizado em {formatDate(record.updatedAt)}</span>
          </div>
        </div>

        {updateState === "success" ? (
          <div className="mb-6 rounded-xl border border-mar-verde/30 bg-mar-verde/10 px-4 py-3 text-sm text-mar-escuro/75">
            Registro atualizado com sucesso.
          </div>
        ) : null}
        {updateState === "invalid" ? (
          <div className="mb-6 rounded-xl border border-mar-cobre/30 bg-mar-cobre/10 px-4 py-3 text-sm text-mar-escuro/75">
            Preencha título e resumo para salvar a atualização.
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <section className="rounded-2xl border border-mar-areia/30 bg-white p-6">
              <h2 className="mb-4 font-serif text-xl font-bold text-mar-escuro">Resumo atual</h2>
              <p className="whitespace-pre-line text-sm leading-relaxed text-mar-escuro/70">{record.resumo}</p>
              {record.proximoPasso ? (
                <div className="mt-4 rounded-xl bg-mar-creme/60 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-mar-cobre">Próximo alinhamento</p>
                  <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-mar-escuro/70">{record.proximoPasso}</p>
                </div>
              ) : null}
              {record.apoioNecessario ? (
                <div className="mt-4 rounded-xl bg-mar-azul/5 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-mar-azul">Dúvidas ou apoio necessário</p>
                  <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-mar-escuro/70">{record.apoioNecessario}</p>
                </div>
              ) : null}
            </section>

            <section className="rounded-2xl border border-mar-areia/30 bg-white p-6">
              <div className="mb-5 flex items-center gap-2 text-sm font-medium uppercase tracking-wide text-mar-cobre">
                <NotebookPen className="h-4 w-4" />
                Atualizar registro
              </div>
              <form action={updateVoluntarioTracking} className="space-y-4">
                <input type="hidden" name="trackingId" value={record.id} />
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-mar-escuro">Título</span>
                  <input
                    type="text"
                    name="titulo"
                    defaultValue={record.titulo}
                    className="w-full rounded-xl border border-mar-areia/40 px-4 py-3 text-sm focus:border-mar-azul focus:outline-none focus:ring-1 focus:ring-mar-azul"
                    required
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-mar-escuro">Resumo</span>
                  <textarea
                    name="resumo"
                    defaultValue={record.resumo}
                    rows={5}
                    className="w-full rounded-xl border border-mar-areia/40 px-4 py-3 text-sm focus:border-mar-azul focus:outline-none focus:ring-1 focus:ring-mar-azul"
                    required
                  />
                </label>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-mar-escuro">Status</span>
                    <select
                      name="status"
                      defaultValue={record.status}
                      className="w-full rounded-xl border border-mar-areia/40 px-4 py-3 text-sm focus:border-mar-azul focus:outline-none focus:ring-1 focus:ring-mar-azul"
                    >
                      <option value="aberto">Aberto</option>
                      <option value="em_andamento">Em andamento</option>
                      <option value="concluido">Concluído</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-mar-escuro">Próximo alinhamento</span>
                    <textarea
                      name="proximoPasso"
                      defaultValue={record.proximoPasso ?? ""}
                      rows={3}
                      className="w-full rounded-xl border border-mar-areia/40 px-4 py-3 text-sm focus:border-mar-azul focus:outline-none focus:ring-1 focus:ring-mar-azul"
                    />
                  </label>
                </div>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-mar-escuro">Dúvidas ou apoio necessário</span>
                  <textarea
                    name="apoioNecessario"
                    defaultValue={record.apoioNecessario ?? ""}
                    rows={3}
                    placeholder="Ex.: confirmar chegada, acolhimento, local, forma de participação."
                    className="w-full rounded-xl border border-mar-areia/40 px-4 py-3 text-sm focus:border-mar-azul focus:outline-none focus:ring-1 focus:ring-mar-azul"
                  />
                </label>
                <div className="flex flex-wrap gap-3">
                  <button type="submit" className="btn-primary inline-flex">
                    <NotebookPen className="h-4 w-4" />
                    Salvar atualização
                  </button>
                </div>
              </form>
            </section>
          </div>

          <div className="space-y-4">
            {record.eventoTitulo ? (
              <section className="rounded-2xl border border-mar-areia/30 bg-white p-5">
                <div className="mb-3 flex items-center gap-2 text-sm font-medium uppercase tracking-wide text-mar-cobre">
                  <Calendar className="h-4 w-4" />
                  Evento de referência
                </div>
                <h3 className="font-medium text-mar-escuro">{record.eventoTitulo}</h3>
                {record.eventoDataInicio ? (
                  <p className="mt-2 text-sm text-mar-escuro/55">{formatDate(record.eventoDataInicio)}</p>
                ) : null}
                {record.eventoLocal ? (
                  <p className="mt-1 text-sm text-mar-escuro/55">{record.eventoLocal}</p>
                ) : null}
                {record.referenciaEventoId ? (
                  <Link
                    href={`/agenda/${record.referenciaEventoId}`}
                    className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-mar-azul hover:underline"
                  >
                    Ver na agenda
                  </Link>
                ) : null}
              </section>
            ) : null}

            {record.topicoTitulo ? (
              <section className="rounded-2xl border border-mar-areia/30 bg-white p-5">
                <div className="mb-3 flex items-center gap-2 text-sm font-medium uppercase tracking-wide text-mar-azul">
                  <MessageCircleHeart className="h-4 w-4" />
                  Tópico no fórum
                </div>
                <h3 className="font-medium text-mar-escuro">{record.topicoTitulo}</h3>
                {record.referenciaTopicoId ? (
                  <Link
                    href={`/forum/${record.referenciaTopicoId}`}
                    className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-mar-azul hover:underline"
                  >
                    Ver conversa
                  </Link>
                ) : null}
              </section>
            ) : null}

            <section className="rounded-2xl border border-mar-areia/30 bg-mar-creme/40 p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-mar-escuro/45">Estado desta jornada</p>
              <p className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-medium ${statusTone}`}>{statusLabel}</p>
              <p className="mt-3 text-xs leading-relaxed text-mar-escuro/45">
                Criado: {formatDate(record.createdAt)}<br />
                Atualizado: {formatDate(record.updatedAt)}
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

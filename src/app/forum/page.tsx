import type { Metadata } from "next";
import { db } from "@/lib/db";
import { forumTopicos } from "@/lib/schema";
import { desc, sql } from "drizzle-orm";
import { formatDate } from "@/lib/utils";
import { MessageSquare, ArrowRight, Plus, Lock, Pin, MessagesSquare, HeartHandshake } from "lucide-react";
import Link from "next/link";

type ForumPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const GUIDED_FORUM_VIEWS = {
  bolsista: {
    title: "Acompanhamento do bolsista",
    description: "Registros contínuos de apoio, leitura, dúvidas e próximos passos da jornada de bolsista.",
    titlePrefix: "Acompanhamento do bolsista ·",
    badge: "Bolsista",
  },
  voluntario: {
    title: "Acompanhamento do voluntariado",
    description: "Registros de interesse, disponibilidade, dúvidas logísticas e próximos alinhamentos da jornada de voluntariado.",
    titlePrefix: "Voluntariado em acompanhamento ·",
    badge: "Voluntário",
  },
  "equipe-producao": {
    title: "Checkpoints de produção",
    description: "Pendências operacionais, travas, responsáveis acionados e próximos checkpoints da equipe de produção.",
    titlePrefix: "Produção em acompanhamento ·",
    badge: "Produção",
  },
} as const;

type GuidedForumOrigin = keyof typeof GUIDED_FORUM_VIEWS;

function getSearchParam(
  params: Record<string, string | string[] | undefined>,
  key: string,
) {
  const value = params[key];

  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

export const metadata: Metadata = {
  title: "Fórum da Comunidade",
  description: "Espaço de troca, memórias e histórias da comunidade do Museu do Mar.",
};

async function getTopicos() {
  try {
    return await db
      .select({
        id: forumTopicos.id,
        titulo: forumTopicos.titulo,
        autorNome: forumTopicos.autorNome,
        status: forumTopicos.status,
        pinned: forumTopicos.pinned,
        createdAt: forumTopicos.createdAt,
        respostas: sql<number>`(SELECT COUNT(*) FROM forum_respostas WHERE topico_id = ${forumTopicos.id})`.mapWith(Number),
      })
      .from(forumTopicos)
      .orderBy(desc(forumTopicos.pinned), desc(forumTopicos.createdAt));
  } catch {
    return [];
  }
}

function getGuidedOrigin(value: string): GuidedForumOrigin | null {
  if (value in GUIDED_FORUM_VIEWS) {
    return value as GuidedForumOrigin;
  }

  return null;
}

export default async function ForumPage({ searchParams }: ForumPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const guidedOrigin = getGuidedOrigin(getSearchParam(resolvedSearchParams, "origem"));
  const topicos = await getTopicos();
  const guidedView = guidedOrigin ? GUIDED_FORUM_VIEWS[guidedOrigin] : null;
  const visibleTopicos = guidedView
    ? topicos.filter((topico) => topico.titulo.startsWith(guidedView.titlePrefix))
    : topicos;

  return (
    <div className="py-12">
      <div className="container-site">
        <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="max-w-4xl">
            <div className="section-eyebrow">
              <MessagesSquare className="h-4 w-4" />
              <span>{guidedView ? guidedView.badge : "Escuta comunitária"}</span>
            </div>
            <h1 className="section-title">{guidedView ? guidedView.title : "Fórum da Comunidade"}</h1>
            <p className="section-subtitle">
              {guidedView
                ? guidedView.description
                : "Um espaço para reunir memórias, perguntas, relatos e contribuições sobre Perocão, o território e as culturas do mar."}
            </p>
          </div>
          <Link href="/forum/novo" className="btn-primary hidden md:inline-flex">
            <Plus className="w-4 h-4" />
            Novo Tópico
          </Link>
        </div>

        <Link href="/forum/novo" className="btn-primary mb-6 md:hidden w-full justify-center">
          <Plus className="w-4 h-4" />
          Novo Tópico
        </Link>

        <div className="mb-6 flex flex-wrap gap-3">
          <Link href="/forum" className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${guidedView ? "bg-white text-mar-escuro border border-mar-areia/30" : "bg-mar-azul text-white"}`}>
            Fórum geral
          </Link>
          <Link href="/forum?origem=bolsista" className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${guidedOrigin === "bolsista" ? "bg-mar-azul text-white" : "border border-mar-areia/30 bg-white text-mar-escuro"}`}>
            Bolsista
          </Link>
          <Link href="/forum?origem=voluntario" className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${guidedOrigin === "voluntario" ? "bg-mar-azul text-white" : "border border-mar-areia/30 bg-white text-mar-escuro"}`}>
            Voluntário
          </Link>
          <Link href="/forum?origem=equipe-producao" className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${guidedOrigin === "equipe-producao" ? "bg-mar-azul text-white" : "border border-mar-areia/30 bg-white text-mar-escuro"}`}>
            Produção
          </Link>
        </div>

        <div className="surface-panel mb-8 grid gap-6 p-6 md:grid-cols-[1.3fr,0.9fr]">
          <div>
            <h2 className="mb-2 font-serif text-2xl font-bold text-mar-azul">{guidedView ? "Histórico contínuo da jornada" : "Conversas que fortalecem a memória"}</h2>
            <p className="text-sm leading-relaxed text-mar-escuro/72">
              {guidedView
                ? "Este recorte mostra apenas os tópicos guiados pela jornada selecionada, facilitando a leitura do histórico de acompanhamento sem misturar tudo com a conversa pública geral."
                : "O fórum amplia a dimensão participativa do Museu do Mar. Aqui, moradores, pesquisadores, estudantes e visitantes podem compartilhar lembranças, fazer perguntas e registrar referências que ajudem a manter viva a memória do território."}
            </p>
          </div>
          <div className="flex items-start gap-3 rounded-xl bg-mar-verde/8 p-4">
            <HeartHandshake className="mt-1 h-5 w-5 text-mar-verde" />
            <p className="text-sm leading-relaxed text-mar-escuro/70">
              {guidedView
                ? "Use esse histórico para acompanhar continuidade, travas e próximos passos da jornada, sem perder a conversa pública geral do projeto."
                : "Priorize relatos respeitosos, contextualizados e úteis para a construção coletiva do acervo vivo."}
            </p>
          </div>
        </div>

        {visibleTopicos.length === 0 ? (
          <div className="py-24 text-center text-mar-escuro/40">
            <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="font-serif text-xl mb-2">Nenhum tópico ainda</p>
            <p className="text-sm">{guidedView ? "Ainda não há registros guiados para esta jornada." : "Seja o primeiro a compartilhar uma memória ou história."}</p>
          </div>
        ) : (
          <div className="max-w-3xl space-y-3">
            {visibleTopicos.map((topico) => (
              <Link
                key={topico.id}
                href={`/forum/${topico.id}`}
                className="group flex items-center gap-4 rounded-xl border border-mar-areia/30 bg-white px-5 py-4 transition-all hover:border-mar-azul/30 hover:shadow-sm"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap gap-2 mb-2">
                    {guidedView ? <span className="badge bg-mar-azul/10 text-mar-azul">{guidedView.badge}</span> : null}
                    {topico.pinned && (
                      <span className="badge bg-mar-cobre/10 text-mar-cobre">
                        <Pin className="w-3 h-3" /> Fixado
                      </span>
                    )}
                    {topico.status === "fechado" && (
                      <span className="badge bg-gray-100 text-gray-500">
                        <Lock className="w-3 h-3" /> Fechado
                      </span>
                    )}
                  </div>
                  <h3 className="font-medium text-mar-escuro group-hover:text-mar-azul transition-colors truncate">
                    {topico.titulo}
                  </h3>
                  <p className="text-xs text-mar-escuro/40 mt-1">
                    por {topico.autorNome ?? "Anônimo"} · {formatDate(topico.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-mar-escuro/40 shrink-0">
                  <MessageSquare className="w-4 h-4" />
                  <span className="text-sm">{topico.respostas}</span>
                </div>
                <ArrowRight className="w-4 h-4 text-mar-escuro/30 group-hover:text-mar-azul transition-colors" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

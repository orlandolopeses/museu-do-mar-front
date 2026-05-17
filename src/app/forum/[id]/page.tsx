import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { and, asc, eq } from "drizzle-orm";
import { ArrowLeft, Lock, MessageSquare, Pin, MessagesSquare, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { PublicSubmissionFields } from "@/components/PublicSubmissionFields";
import { db } from "@/lib/db";
import { forumRespostas, forumTopicos } from "@/lib/schema";
import { assertPublicSubmissionGuard } from "@/lib/public-submission";
import { getClientIpFromHeaders } from "@/lib/request-client";
import { checkRateLimit } from "@/lib/rate-limit";
import { formatDate } from "@/lib/utils";
import { z } from "zod";

const respostaSchema = z.object({
  autorNome: z.string().trim().min(2).max(100),
  autorEmail: z.string().trim().email().max(255).optional().or(z.literal("")),
  conteudo: z.string().trim().min(10).max(3000),
});

type ForumTopicPageProps = {
  params: {
    id: string;
  };
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

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

async function getTopico(id: string) {
  const [topico] = await db.select().from(forumTopicos).where(eq(forumTopicos.id, id)).limit(1);
  return topico;
}

async function getRespostas(topicoId: string) {
  return db
    .select()
    .from(forumRespostas)
    .where(eq(forumRespostas.topicoId, topicoId))
    .orderBy(asc(forumRespostas.createdAt));
}

export async function generateMetadata({ params }: ForumTopicPageProps): Promise<Metadata> {
  const topico = await getTopico(params.id);

  if (!topico) {
    return {
      title: "Tópico não encontrado",
    };
  }

  return {
    title: topico.titulo,
    description: topico.conteudo.slice(0, 160),
  };
}

export default async function ForumTopicPage({ params, searchParams }: ForumTopicPageProps) {
  const topico = await getTopico(params.id);

  if (!topico) notFound();

  const resolvedSearchParams = searchParams ? await searchParams : {};
  const erro = getSearchParam(resolvedSearchParams, "erro");
  const respostas = await getRespostas(topico.id);

  async function responder(formData: FormData) {
    "use server";

    try {
      assertPublicSubmissionGuard(formData);
    } catch (error) {
      if (error instanceof Error && ["spam_detected", "submission_too_fast"].includes(error.message)) {
        redirect(`/forum/${topico.id}?erro=envio-rejeitado`);
      }
      throw error;
    }

    const clientIp = getClientIpFromHeaders(await headers());
    const rateLimit = checkRateLimit(`forum-resposta:${clientIp}`, { limit: 8, windowMs: 15 * 60 * 1000 });

    if (!rateLimit.success) {
      console.warn(`Rate limit excedido em /forum/${topico.id}`, {
        clientIp,
        retryAfterMs: rateLimit.retryAfterMs,
      });
      redirect(`/forum/${topico.id}?erro=muitas-tentativas`);
    }

    const parsed = respostaSchema.safeParse({
      autorNome: String(formData.get("autorNome") ?? ""),
      autorEmail: String(formData.get("autorEmail") ?? ""),
      conteudo: String(formData.get("conteudo") ?? ""),
    });

    if (!parsed.success) {
      redirect(`/forum/${topico.id}?erro=dados-invalidos`);
    }

    const { autorNome, autorEmail, conteudo } = parsed.data;

    const [topicoAtual] = await db
      .select()
      .from(forumTopicos)
      .where(and(eq(forumTopicos.id, topico.id), eq(forumTopicos.status, "aberto")))
      .limit(1);

    if (!topicoAtual) return;

    await db.insert(forumRespostas).values({
      id: crypto.randomUUID(),
      topicoId: topico.id,
      conteudo,
      autorNome,
      autorEmail: autorEmail || null,
    });

    revalidatePath("/forum");
    revalidatePath(`/forum/${topico.id}`);
    revalidatePath("/admin/forum");
  }

  return (
    <div className="py-12">
      <div className="container-site max-w-4xl">
        <Link
          href="/forum"
          className="inline-flex items-center gap-2 text-sm text-mar-azul hover:text-mar-azul_claro mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para o fórum
        </Link>

        <article className="mb-8 rounded-2xl border border-mar-areia/30 bg-white p-6 md:p-8">
          <div className="section-eyebrow mb-4">
            <MessagesSquare className="h-4 w-4" />
            <span>Conversa pública</span>
          </div>
          <div className="flex flex-wrap gap-2 mb-4">
            {topico.pinned && (
              <span className="badge bg-mar-cobre/10 text-mar-cobre">
                <Pin className="w-3 h-3" /> Fixado
              </span>
            )}
            <span className={topico.status === "aberto" ? "badge-verde" : "badge bg-gray-100 text-gray-500"}>
              {topico.status === "aberto" ? "Aberto" : "Fechado"}
            </span>
          </div>

          <h1 className="font-serif text-3xl md:text-4xl font-bold text-mar-escuro leading-tight mb-4">
            {topico.titulo}
          </h1>

          <p className="text-sm text-mar-escuro/45 mb-6">
            por {topico.autorNome} · {formatDate(topico.createdAt)}
          </p>

          <div className="surface-panel mb-8 p-5">
            <p className="text-sm leading-relaxed text-mar-escuro/72">
              Este tópico integra a escuta comunitária do Museu do Mar e permanece como registro público de
              memórias, perguntas e referências relacionadas ao território e às culturas do mar.
            </p>
          </div>

          <div className="prose-museu max-w-none">
            {topico.conteudo.split(/\n{2,}/).map((paragraph, index) => (
              <p key={`${topico.id}-${index}`} className="whitespace-pre-wrap">
                {paragraph}
              </p>
            ))}
          </div>
        </article>

        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className="w-5 h-5 text-mar-azul" />
            <h2 className="font-serif text-2xl font-bold text-mar-escuro">
              Respostas ({respostas.length})
            </h2>
          </div>

          {respostas.length === 0 ? (
            <div className="rounded-2xl border border-mar-areia/30 bg-white p-6 text-sm text-mar-escuro/50">
              Ainda não há respostas. Seja a primeira pessoa a contribuir.
            </div>
          ) : (
            <div className="space-y-4">
              {respostas.map((resposta) => (
                <article key={resposta.id} className="rounded-2xl border border-mar-areia/30 bg-white p-5">
                  <p className="text-sm text-mar-escuro/45 mb-3">
                    {resposta.autorNome} · {formatDate(resposta.createdAt)}
                  </p>
                  <div className="prose-museu max-w-none">
                    {resposta.conteudo.split(/\n{2,}/).map((paragraph, index) => (
                      <p key={`${resposta.id}-${index}`} className="whitespace-pre-wrap">
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-mar-areia/30 bg-white p-6 md:p-8">
          <div className="flex items-center gap-2 mb-4">
            {topico.status === "aberto" ? (
              <MessageSquare className="w-5 h-5 text-mar-azul" />
            ) : (
              <Lock className="w-5 h-5 text-mar-cobre" />
            )}
            <h2 className="font-serif text-2xl font-bold text-mar-escuro">
              {topico.status === "aberto" ? "Responder ao tópico" : "Tópico encerrado"}
            </h2>
          </div>

          {topico.status === "aberto" ? (
            <form action={responder} className="space-y-6">
              <PublicSubmissionFields />
              <div className="surface-panel flex items-start gap-3 p-5">
                <ShieldCheck className="mt-1 h-5 w-5 text-mar-azul" />
                <p className="text-sm leading-relaxed text-mar-escuro/72">
                  Responda com clareza e respeito. Sua contribuição ajuda a qualificar a memória pública e a
                  conversa coletiva em torno do Museu do Mar.
                </p>
              </div>

              {erro ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {erro === "muitas-tentativas"
                    ? "Muitas tentativas em sequência. Aguarde alguns minutos antes de responder novamente."
                    : erro === "envio-rejeitado"
                      ? "A resposta foi rejeitada pelos filtros automáticos de proteção. Revise e tente novamente."
                      : "Não foi possível publicar a resposta. Revise os campos e tente novamente."}
                </div>
              ) : null}

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="autorNome" className="block text-sm font-medium text-mar-escuro mb-1.5">
                    Seu nome
                  </label>
                  <input
                    id="autorNome"
                    name="autorNome"
                    type="text"
                    required
                    className="w-full rounded-lg border border-mar-areia/50 bg-white px-4 py-2.5 text-sm focus:border-mar-azul focus:outline-none focus:ring-1 focus:ring-mar-azul"
                    placeholder="Como você gostaria de aparecer"
                  />
                </div>

                <div>
                  <label htmlFor="autorEmail" className="block text-sm font-medium text-mar-escuro mb-1.5">
                    E-mail
                  </label>
                  <input
                    id="autorEmail"
                    name="autorEmail"
                    type="email"
                    className="w-full rounded-lg border border-mar-areia/50 bg-white px-4 py-2.5 text-sm focus:border-mar-azul focus:outline-none focus:ring-1 focus:ring-mar-azul"
                    placeholder="Opcional"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="conteudo" className="block text-sm font-medium text-mar-escuro mb-1.5">
                  Resposta
                </label>
                <textarea
                  id="conteudo"
                  name="conteudo"
                  rows={8}
                  required
                  className="w-full resize-y rounded-lg border border-mar-areia/50 bg-white px-4 py-3 text-sm focus:border-mar-azul focus:outline-none focus:ring-1 focus:ring-mar-azul"
                  placeholder="Compartilhe sua contribuição para a conversa."
                />
              </div>

              <button type="submit" className="btn-primary">
                Enviar resposta
              </button>
            </form>
          ) : (
            <p className="text-sm text-mar-escuro/55">
              Este tópico foi fechado para novas respostas, mas continua disponível para consulta pública.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { PublicSubmissionFields } from "@/components/PublicSubmissionFields";
import { db } from "@/lib/db";
import { forumTopicos } from "@/lib/schema";
import { assertPublicSubmissionGuard } from "@/lib/public-submission";
import { getClientIpFromHeaders } from "@/lib/request-client";
import { checkRateLimit } from "@/lib/rate-limit";
import { z } from "zod";
import { PenSquare, ShieldCheck } from "lucide-react";

type NovoTopicoPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const PREFILL_SOURCE_COPY: Record<string, string> = {
  bolsista:
    "Este tópico foi aberto a partir da jornada do bolsista. Use o roteiro inicial para registrar leitura, apoio realizado, dúvidas e próximo passo, transformando o fórum em uma trilha contínua de acompanhamento.",
  voluntario:
    "Este tópico foi aberto a partir da jornada do voluntário. Use o roteiro inicial para registrar interesse, confirmação de presença, dúvidas logísticas e o próximo alinhamento necessário.",
  "equipe-producao":
    "Este tópico foi aberto a partir da jornada da equipe de produção. Use o roteiro inicial para registrar pendências operacionais, travas de execução, responsáveis e próximo checkpoint.",
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

function clampPrefill(value: string, maxLength: number) {
  return value.trim().slice(0, maxLength);
}

const createTopicoSchema = z.object({
  titulo: z.string().trim().min(5).max(150),
  conteudo: z.string().trim().min(20).max(5000),
  autorNome: z.string().trim().min(2).max(100),
  autorEmail: z.string().trim().email().max(255).optional().or(z.literal("")),
});

export default async function NovoTopicoPage({ searchParams }: NovoTopicoPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const origem = getSearchParam(resolvedSearchParams, "origem");
  const erro = getSearchParam(resolvedSearchParams, "erro");
  const prefilledTitle = clampPrefill(getSearchParam(resolvedSearchParams, "titulo"), 150);
  const prefilledContent = clampPrefill(getSearchParam(resolvedSearchParams, "conteudo"), 5000);
  const prefilledAuthorName = clampPrefill(getSearchParam(resolvedSearchParams, "autorNome"), 100);
  const prefilledAuthorEmail = clampPrefill(getSearchParam(resolvedSearchParams, "autorEmail"), 255);
  const prefillIntro = PREFILL_SOURCE_COPY[origem];
  const hasGuidedPrefill = Boolean(prefillIntro) && Boolean(prefilledContent);

  async function createTopico(formData: FormData) {
    "use server";

    try {
      assertPublicSubmissionGuard(formData);
    } catch (error) {
      if (error instanceof Error && ["spam_detected", "submission_too_fast"].includes(error.message)) {
        redirect("/forum/novo?erro=envio-rejeitado");
      }
      throw error;
    }

    const clientIp = getClientIpFromHeaders(await headers());
    const rateLimit = checkRateLimit(`forum-topico:${clientIp}`, { limit: 4, windowMs: 15 * 60 * 1000 });

    if (!rateLimit.success) {
      console.warn("Rate limit excedido em /forum/novo", {
        clientIp,
        retryAfterMs: rateLimit.retryAfterMs,
      });
      redirect("/forum/novo?erro=muitas-tentativas");
    }

    const parsed = createTopicoSchema.safeParse({
      titulo: String(formData.get("titulo") ?? ""),
      conteudo: String(formData.get("conteudo") ?? ""),
      autorNome: String(formData.get("autorNome") ?? ""),
      autorEmail: String(formData.get("autorEmail") ?? ""),
    });

    if (!parsed.success) {
      redirect("/forum/novo?erro=dados-invalidos");
    }

    const { titulo, conteudo, autorNome, autorEmail } = parsed.data;

    const id = crypto.randomUUID();

    await db.insert(forumTopicos).values({
      id,
      titulo,
      conteudo,
      autorNome,
      autorEmail: autorEmail || null,
      status: "aberto",
      pinned: false,
    });

    revalidatePath("/forum");
    revalidatePath("/admin/forum");

    redirect(`/forum/${id}`);
  }

  return (
    <div className="py-12">
      <div className="container-site max-w-3xl">
        <div className="mb-8">
          <div className="section-eyebrow">
            <PenSquare className="h-4 w-4" />
            <span>Participação comunitária</span>
          </div>
          <h1 className="section-title">Novo tópico</h1>
          <p className="section-subtitle">
            Compartilhe uma memória, faça uma pergunta ou inicie uma conversa com a comunidade.
          </p>
        </div>

        <div className="surface-panel mb-6 flex items-start gap-3 p-5">
          <ShieldCheck className="mt-1 h-5 w-5 text-mar-azul" />
          <p className="text-sm leading-relaxed text-mar-escuro/72">
            Escreva com clareza e respeito. Seu tópico ajuda a ampliar a memória pública do território e pode
            inspirar futuras ações de acervo, pesquisa ou educação patrimonial.
          </p>
        </div>

        {hasGuidedPrefill ? (
          <div className="surface-panel mb-6 border border-mar-verde/20 bg-mar-verde/5 p-5">
            <p className="text-sm leading-relaxed text-mar-escuro/72">
              {prefillIntro}
            </p>
          </div>
        ) : null}

        {erro ? (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {erro === "muitas-tentativas"
              ? "Muitas tentativas em sequência. Aguarde alguns minutos antes de abrir um novo tópico."
              : erro === "envio-rejeitado"
                ? "O envio foi rejeitado pelos filtros automáticos de proteção. Revise e tente novamente."
                : "Não foi possível publicar o tópico. Revise os campos e tente novamente."}
          </div>
        ) : null}

        <form action={createTopico} className="surface-panel space-y-6 p-6 md:p-8">
          <PublicSubmissionFields />
          <div>
            <label htmlFor="titulo" className="block text-sm font-medium text-mar-escuro mb-1.5">
              Título
            </label>
            <input
              id="titulo"
              name="titulo"
              type="text"
              required
              defaultValue={prefilledTitle}
              className="w-full px-4 py-2.5 border border-mar-areia/50 rounded-lg text-sm focus:outline-none focus:border-mar-azul focus:ring-1 focus:ring-mar-azul"
              placeholder="Ex.: Memórias da pesca na praia do Perocão"
            />
          </div>

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
                defaultValue={prefilledAuthorName}
                className="w-full px-4 py-2.5 border border-mar-areia/50 rounded-lg text-sm focus:outline-none focus:border-mar-azul focus:ring-1 focus:ring-mar-azul"
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
                defaultValue={prefilledAuthorEmail}
                className="w-full px-4 py-2.5 border border-mar-areia/50 rounded-lg text-sm focus:outline-none focus:border-mar-azul focus:ring-1 focus:ring-mar-azul"
                placeholder="Opcional"
              />
            </div>
          </div>

          <div>
            <label htmlFor="conteudo" className="block text-sm font-medium text-mar-escuro mb-1.5">
              Conteúdo
            </label>
            <textarea
              id="conteudo"
              name="conteudo"
              rows={12}
              required
              defaultValue={prefilledContent}
              className="w-full px-4 py-3 border border-mar-areia/50 rounded-lg text-sm resize-y focus:outline-none focus:border-mar-azul focus:ring-1 focus:ring-mar-azul"
              placeholder="Escreva sua memória, pergunta ou contribuição para a comunidade."
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button type="submit" className="btn-primary">
              Publicar tópico
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

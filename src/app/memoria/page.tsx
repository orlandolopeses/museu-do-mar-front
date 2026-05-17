import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { PublicSubmissionFields } from "@/components/PublicSubmissionFields";
import { db } from "@/lib/db";
import { assertPublicSubmissionGuard } from "@/lib/public-submission";
import { getClientIpFromHeaders } from "@/lib/request-client";
import { checkRateLimit } from "@/lib/rate-limit";
import { submissoesMemoria } from "@/lib/schema";
import { BookOpen, ImageIcon, Mic, FileText, Send } from "lucide-react";
import { z } from "zod";

export const metadata: Metadata = {
  title: "Contribuir com Memórias | Museu do Mar",
  description: "Envie sua memória, relato ou registro sobre Perocão e o Museu do Mar.",
};

const tiposOptions = [
  { value: "texto", label: "Relato ou texto", icon: FileText },
  { value: "foto", label: "Foto ou imagem", icon: ImageIcon },
  { value: "audio", label: "Depoimento em áudio", icon: Mic },
  { value: "documento", label: "Documento histórico", icon: BookOpen },
];

type SearchParamsInput = Promise<Record<string, string | string[] | undefined>>;

const createMemoriaSchema = z.object({
  nome: z.string().trim().min(2).max(255),
  email: z.string().trim().email().max(255).optional().or(z.literal("")),
  tipo: z.enum(["texto", "foto", "audio", "documento"]),
  titulo: z.string().trim().min(5).max(255),
  conteudo: z.string().trim().min(20).max(6000),
  urlMidia: z.string().trim().url().max(500).optional().or(z.literal("")),
  lugar: z.string().trim().max(255).optional().or(z.literal("")),
  periodo: z.string().trim().max(100).optional().or(z.literal("")),
});

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

export default async function MemoriaPage({ searchParams }: { searchParams?: SearchParamsInput }) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const erro = getSearchParam(resolvedSearchParams, "erro");

  async function submitMemoria(formData: FormData) {
    "use server";

    try {
      assertPublicSubmissionGuard(formData);
    } catch (error) {
      if (error instanceof Error && ["spam_detected", "submission_too_fast"].includes(error.message)) {
        redirect("/memoria?erro=envio-rejeitado");
      }
      throw error;
    }

    const clientIp = getClientIpFromHeaders(await headers());
    const rateLimit = checkRateLimit(`memoria:${clientIp}`, { limit: 3, windowMs: 15 * 60 * 1000 });

    if (!rateLimit.success) {
      console.warn("Rate limit excedido em /memoria", {
        clientIp,
        retryAfterMs: rateLimit.retryAfterMs,
      });

      redirect("/memoria?erro=muitas-tentativas");
    }

    const parsed = createMemoriaSchema.safeParse({
      nome: String(formData.get("nome") ?? ""),
      email: String(formData.get("email") ?? ""),
      tipo: String(formData.get("tipo") ?? "texto"),
      titulo: String(formData.get("titulo") ?? ""),
      conteudo: String(formData.get("conteudo") ?? ""),
      urlMidia: String(formData.get("urlMidia") ?? ""),
      lugar: String(formData.get("lugar") ?? ""),
      periodo: String(formData.get("periodo") ?? ""),
    });

    if (!parsed.success) {
      redirect("/memoria?erro=dados-invalidos");
    }

    const { nome, email, tipo, titulo, conteudo, urlMidia, lugar, periodo } = parsed.data;

    await db.insert(submissoesMemoria).values({
      id: crypto.randomUUID(),
      nome,
      email: email || null,
      tipo,
      titulo,
      conteudo,
      urlMidia: urlMidia || null,
      lugar: lugar || null,
      periodo: periodo || null,
      status: "pendente",
    });

    revalidatePath("/admin/memorias");
    redirect("/memoria/obrigado");
  }

  return (
    <div className="min-h-screen bg-mar-creme/30">
      <div className="container-site py-16 px-4">
        <div className="mx-auto max-w-3xl">
          <div className="mb-10">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-mar-cobre">
              Participe
            </p>
            <h1 className="font-serif text-4xl font-bold text-mar-escuro md:text-5xl">
              Contribua com uma memória
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-mar-escuro/65">
              O Museu do Mar preserva as histórias, imagens e relatos das comunidades de Perocão e do litoral do Espírito Santo. Se você tem uma memória, um documento ou um relato para compartilhar, envie aqui — nossa equipe vai receber e avaliar a contribuição.
            </p>
          </div>

          {erro ? (
            <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {erro === "muitas-tentativas"
                ? "Muitas tentativas em sequência. Aguarde alguns minutos antes de enviar outra memória."
                : erro === "envio-rejeitado"
                  ? "O envio foi rejeitado pelos filtros automáticos de proteção. Revise e tente novamente."
                  : "Não foi possível processar a contribuição. Revise os campos e tente novamente."}
            </div>
          ) : null}

          <form action={submitMemoria} className="space-y-6 rounded-3xl border border-mar-areia/30 bg-white p-8 shadow-sm">
            <PublicSubmissionFields />

            <div className="grid gap-5 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-mar-escuro">
                  Seu nome <span className="text-red-500">*</span>
                </span>
                <input
                  type="text"
                  name="nome"
                  required
                  placeholder="Como quer ser identificado(a)"
                  className="w-full rounded-xl border border-mar-areia/40 px-4 py-3 text-sm focus:border-mar-azul focus:outline-none focus:ring-1 focus:ring-mar-azul"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-mar-escuro">
                  E-mail (opcional)
                </span>
                <input
                  type="email"
                  name="email"
                  placeholder="Para retorno da equipe"
                  className="w-full rounded-xl border border-mar-areia/40 px-4 py-3 text-sm focus:border-mar-azul focus:outline-none focus:ring-1 focus:ring-mar-azul"
                />
              </label>
            </div>

            <div>
              <span className="mb-3 block text-sm font-medium text-mar-escuro">
                Tipo de contribuição <span className="text-red-500">*</span>
              </span>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {tiposOptions.map((opt) => (
                  <label key={opt.value} className="group cursor-pointer">
                    <input type="radio" name="tipo" value={opt.value} defaultChecked={opt.value === "texto"} className="peer sr-only" />
                    <div className="flex flex-col items-center gap-2 rounded-2xl border border-mar-areia/30 p-4 text-center transition-colors peer-checked:border-mar-azul peer-checked:bg-mar-azul/5 group-hover:border-mar-azul/40">
                      <opt.icon className="h-5 w-5 text-mar-escuro/50 peer-checked:text-mar-azul" />
                      <span className="text-xs font-medium text-mar-escuro/70">{opt.label}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-mar-escuro">
                Título da memória <span className="text-red-500">*</span>
              </span>
              <input
                type="text"
                name="titulo"
                required
                placeholder="Um título breve que identifique sua contribuição"
                className="w-full rounded-xl border border-mar-areia/40 px-4 py-3 text-sm focus:border-mar-azul focus:outline-none focus:ring-1 focus:ring-mar-azul"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-mar-escuro">
                Relato ou descrição <span className="text-red-500">*</span>
              </span>
              <textarea
                name="conteudo"
                required
                rows={6}
                placeholder="Conte com detalhes sua memória, onde e quando aconteceu, quem estava presente..."
                className="w-full resize-y rounded-xl border border-mar-areia/40 px-4 py-3 text-sm focus:border-mar-azul focus:outline-none focus:ring-1 focus:ring-mar-azul"
              />
            </label>

            <div className="grid gap-5 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-mar-escuro">
                  Lugar associado
                </span>
                <input
                  type="text"
                  name="lugar"
                  placeholder="Ex.: Perocão, Porto de Guarapari..."
                  className="w-full rounded-xl border border-mar-areia/40 px-4 py-3 text-sm focus:border-mar-azul focus:outline-none focus:ring-1 focus:ring-mar-azul"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-mar-escuro">
                  Período aproximado
                </span>
                <input
                  type="text"
                  name="periodo"
                  placeholder="Ex.: Década de 1970, anos 1990..."
                  className="w-full rounded-xl border border-mar-areia/40 px-4 py-3 text-sm focus:border-mar-azul focus:outline-none focus:ring-1 focus:ring-mar-azul"
                />
              </label>
            </div>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-mar-escuro">
                Link de mídia (opcional)
              </span>
              <input
                type="url"
                name="urlMidia"
                placeholder="https:// — foto, áudio ou vídeo no Drive, YouTube, etc."
                className="w-full rounded-xl border border-mar-areia/40 px-4 py-3 text-sm focus:border-mar-azul focus:outline-none focus:ring-1 focus:ring-mar-azul"
              />
            </label>

            <p className="rounded-xl bg-mar-creme/60 px-4 py-3 text-xs leading-relaxed text-mar-escuro/55">
              Ao enviar, você autoriza o Museu do Mar a utilizar sua contribuição em atividades educativas e de preservação da memória comunitária, sempre com crédito ao autor.
            </p>

            <button type="submit" className="btn-primary gap-2">
              <Send className="h-4 w-4" />
              Enviar minha memória
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

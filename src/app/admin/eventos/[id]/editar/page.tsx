import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { requireAdminPermission } from "@/lib/access";
import { db } from "@/lib/db";
import { eventos, instituicoes } from "@/lib/schema";
import { EventoEditorForm } from "../../EventoEditorForm";
import { z } from "zod";

type EditarEventoPageProps = {
  params: {
    id: string;
  };
};

function parseDate(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;

  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

const eventoFormSchema = z.object({
  titulo: z.string().trim().min(2).max(255),
  descricao: z.string().trim().max(4000).optional().or(z.literal("")),
  instituicaoIdRaw: z.string().trim().max(36).optional().or(z.literal("")),
  local: z.string().trim().max(255).optional().or(z.literal("")),
  categoria: z.string().trim().max(100).optional().or(z.literal("")),
  coverImage: z.string().trim().url().max(500).optional().or(z.literal("")),
  linkExterno: z.string().trim().url().max(500).optional().or(z.literal("")),
  publicado: z.enum(["rascunho", "publicado"]),
});

export default async function EditarEventoPage({ params }: EditarEventoPageProps) {
  await requireAdminPermission("eventos.manage");

  const [evento] = await db.select().from(eventos).where(eq(eventos.id, params.id)).limit(1);
  const institutions = await db
    .select({ id: instituicoes.id, nome: instituicoes.nome, ativo: instituicoes.ativo })
    .from(instituicoes)
    .orderBy(instituicoes.nome);

  if (!evento) notFound();

  async function updateEvento(formData: FormData) {
    "use server";

    await requireAdminPermission("eventos.manage");

    const parsed = eventoFormSchema.safeParse({
      titulo: String(formData.get("titulo") ?? ""),
      descricao: String(formData.get("descricao") ?? ""),
      instituicaoIdRaw: String(formData.get("instituicaoId") ?? ""),
      local: String(formData.get("local") ?? ""),
      categoria: String(formData.get("categoria") ?? ""),
      coverImage: String(formData.get("coverImage") ?? ""),
      linkExterno: String(formData.get("linkExterno") ?? ""),
      publicado: String(formData.get("publicado") ?? "rascunho"),
    });

    if (!parsed.success) return;

    const dataInicio = parseDate(formData.get("dataInicio"));
    const dataFim = parseDate(formData.get("dataFim"));
    if (!dataInicio) return;
    if (dataFim && dataFim < dataInicio) return;

    const { titulo, descricao, instituicaoIdRaw, local, categoria, coverImage, linkExterno, publicado } = parsed.data;
    const instituicaoId = instituicaoIdRaw
      ? await db
        .select({ id: instituicoes.id })
        .from(instituicoes)
        .where(eq(instituicoes.id, instituicaoIdRaw))
        .then((rows) => rows[0]?.id ?? null)
      : null;

    if (instituicaoIdRaw && !instituicaoId) return;

    await db
      .update(eventos)
      .set({
        titulo,
        descricao: descricao || null,
        instituicaoId,
        local: local || null,
        categoria: categoria || null,
        coverImage: coverImage || null,
        linkExterno: linkExterno || null,
        dataInicio,
        dataFim,
        publicado: publicado === "publicado",
      })
      .where(eq(eventos.id, evento.id));

    revalidatePath("/");
    revalidatePath("/agenda");
    revalidatePath(`/agenda/${evento.id}`);
    revalidatePath("/admin/eventos");
    revalidatePath("/app/gestor");
    if (evento.instituicaoId) {
      revalidatePath(`/app/gestor/instituicoes/${evento.instituicaoId}`);
    }
    if (instituicaoId && instituicaoId !== evento.instituicaoId) {
      revalidatePath(`/app/gestor/instituicoes/${instituicaoId}`);
    }

    redirect("/admin/eventos");
  }

  return (
    <EventoEditorForm
      title="Editar evento"
      description="Atualize a programação e os dados públicos do evento selecionado."
      action={updateEvento}
      submitLabel="Salvar alterações"
      institutions={institutions}
      initialData={{
        titulo: evento.titulo,
        descricao: evento.descricao,
        instituicaoId: evento.instituicaoId,
        local: evento.local,
        categoria: evento.categoria,
        coverImage: evento.coverImage,
        linkExterno: evento.linkExterno,
        dataInicio: evento.dataInicio,
        dataFim: evento.dataFim,
        publicado: evento.publicado,
      }}
    />
  );
}

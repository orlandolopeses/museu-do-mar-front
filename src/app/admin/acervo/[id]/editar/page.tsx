import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { requireAdminPermission } from "@/lib/access";
import { db } from "@/lib/db";
import { acervo } from "@/lib/schema";
import { AcervoEditorForm } from "../../AcervoEditorForm";
import { z } from "zod";

const acervoTipoSchema = z.enum(["foto", "video", "audio", "documento"]);

const acervoFormSchema = z.object({
  tipo: acervoTipoSchema,
  titulo: z.string().trim().min(2).max(255),
  descricao: z.string().trim().max(4000).optional().or(z.literal("")),
  url: z.string().trim().url().max(500),
  thumbUrl: z.string().trim().url().max(500).optional().or(z.literal("")),
  tags: z.string().trim().max(500).optional().or(z.literal("")),
  colecao: z.string().trim().max(100).optional().or(z.literal("")),
  autor: z.string().trim().max(255).optional().or(z.literal("")),
  ano: z.string().trim().optional().or(z.literal("")),
  publicado: z.enum(["rascunho", "publicado"]),
}).superRefine((data, ctx) => {
  if (!data.ano) return;

  const year = Number(data.ano);
  if (!Number.isInteger(year) || year < 0 || year > 2100) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["ano"],
      message: "Ano inválido.",
    });
  }
});

type EditarAcervoPageProps = {
  params: {
    id: string;
  };
};

export default async function EditarAcervoPage({ params }: EditarAcervoPageProps) {
  await requireAdminPermission("acervo.review");

  const [item] = await db.select().from(acervo).where(eq(acervo.id, params.id)).limit(1);

  if (!item) notFound();

  async function updateItem(formData: FormData) {
    "use server";

    await requireAdminPermission("acervo.review");

    const parsed = acervoFormSchema.safeParse({
      tipo: String(formData.get("tipo") ?? item.tipo),
      titulo: String(formData.get("titulo") ?? ""),
      descricao: String(formData.get("descricao") ?? ""),
      url: String(formData.get("url") ?? ""),
      thumbUrl: String(formData.get("thumbUrl") ?? ""),
      tags: String(formData.get("tags") ?? ""),
      colecao: String(formData.get("colecao") ?? ""),
      autor: String(formData.get("autor") ?? ""),
      ano: String(formData.get("ano") ?? ""),
      publicado: String(formData.get("publicado") ?? "rascunho"),
    });

    if (!parsed.success) return;

    const { tipo, titulo, descricao, url, thumbUrl, tags, colecao, autor, ano, publicado } = parsed.data;

    await db
      .update(acervo)
      .set({
        tipo,
        titulo,
        descricao: descricao || null,
        url,
        thumbUrl: thumbUrl || null,
        tags: tags || null,
        colecao: colecao || null,
        autor: autor || null,
        ano: ano ? Number(ano) : null,
        publicado: publicado === "publicado",
      })
      .where(eq(acervo.id, item.id));

    revalidatePath("/");
    revalidatePath("/acervo");
    revalidatePath(`/acervo/${item.id}`);
    revalidatePath("/admin/acervo");

    redirect("/admin/acervo");
  }

  return (
    <AcervoEditorForm
      title="Editar item do acervo"
      description="Atualize os metadados e a visibilidade do item selecionado."
      action={updateItem}
      submitLabel="Salvar alterações"
      initialData={{
        tipo: item.tipo,
        titulo: item.titulo,
        descricao: item.descricao,
        url: item.url,
        thumbUrl: item.thumbUrl,
        tags: item.tags,
        colecao: item.colecao,
        autor: item.autor,
        ano: item.ano,
        publicado: item.publicado,
      }}
    />
  );
}

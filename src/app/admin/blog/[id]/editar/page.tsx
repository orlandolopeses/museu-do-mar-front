import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { posts } from "@/lib/schema";
import { requireAdminPermission } from "@/lib/access";
import { slugify } from "@/lib/utils";
import { BlogEditorForm } from "../../BlogEditorForm";

async function generateUniqueSlug(title: string, currentId: string) {
  const baseSlug = slugify(title);
  const [existing] = await db.select().from(posts).where(eq(posts.slug, baseSlug)).limit(1);

  if (!existing || existing.id === currentId) return baseSlug;

  return `${baseSlug}-${Date.now().toString().slice(-6)}`;
}

type EditarPostPageProps = {
  params: {
    id: string;
  };
};

export default async function EditarPostPage({ params }: EditarPostPageProps) {
  await requireAdminPermission("blog.create");

  const [post] = await db.select().from(posts).where(eq(posts.id, params.id)).limit(1);

  if (!post) notFound();

  async function updatePost(formData: FormData) {
    "use server";

    await requireAdminPermission("blog.create");

    const title = String(formData.get("title") ?? "").trim();
    const summary = String(formData.get("summary") ?? "").trim();
    const content = String(formData.get("content") ?? "").trim();
    const coverImage = String(formData.get("coverImage") ?? "").trim();
    const status = String(formData.get("status") ?? "rascunho") as "rascunho" | "publicado";

    if (!title || !content) return;
    if (status === "publicado") {
      await requireAdminPermission("blog.publish");
    }

    const slug = await generateUniqueSlug(title, post.id);
    const publishedAt = status === "publicado" ? post.publishedAt ?? new Date() : null;
    const previousSlug = post.slug;

    await db
      .update(posts)
      .set({
        slug,
        title,
        summary: summary || null,
        content,
        coverImage: coverImage || null,
        status,
        publishedAt,
        updatedAt: new Date(),
      })
      .where(eq(posts.id, post.id));

    revalidatePath("/");
    revalidatePath("/blog");
    revalidatePath("/admin/blog");
    revalidatePath(`/blog/${previousSlug}`);
    revalidatePath(`/blog/${slug}`);

    redirect("/admin/blog");
  }

  return (
    <BlogEditorForm
      title="Editar Post"
      description="Atualize os dados da publicação e publique quando estiver pronta."
      action={updatePost}
      submitLabel="Salvar alterações"
      initialData={{
        title: post.title,
        summary: post.summary,
        content: post.content,
        coverImage: post.coverImage,
        status: post.status,
      }}
    />
  );
}

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { posts } from "@/lib/schema";
import { requireAdminPermission } from "@/lib/access";
import { slugify } from "@/lib/utils";
import { BlogEditorForm } from "../BlogEditorForm";

async function generateUniqueSlug(title: string) {
  const baseSlug = slugify(title);
  const [existing] = await db.select().from(posts).where(eq(posts.slug, baseSlug)).limit(1);

  if (!existing) return baseSlug;

  return `${baseSlug}-${Date.now().toString().slice(-6)}`;
}

export default async function NovoPostPage() {
  await requireAdminPermission("blog.create");

  async function createPost(formData: FormData) {
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

    const slug = await generateUniqueSlug(title);
    const publishedAt = status === "publicado" ? new Date() : null;

    await db.insert(posts).values({
      id: crypto.randomUUID(),
      slug,
      title,
      summary: summary || null,
      content,
      coverImage: coverImage || null,
      status,
      publishedAt,
    });

    revalidatePath("/");
    revalidatePath("/blog");
    revalidatePath("/admin/blog");
    if (status === "publicado") revalidatePath(`/blog/${slug}`);

    redirect("/admin/blog");
  }

  return (
    <BlogEditorForm
      title="Novo Post"
      description="Crie uma nova publicação para o blog do Museu do Mar."
      action={createPost}
      submitLabel="Salvar post"
    />
  );
}

"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireAdminPermission } from "@/lib/access";
import { db } from "@/lib/db";
import { posts } from "@/lib/schema";

export async function publishPost(formData: FormData) {
  await requireAdminPermission("blog.publish");
  const postId = formData.get("postId") as string | null;
  if (!postId) return;

  const [post] = await db.select({ id: posts.id }).from(posts).where(eq(posts.id, postId)).limit(1);
  if (!post) return;

  await db
    .update(posts)
    .set({ status: "publicado", publishedAt: new Date(), updatedAt: new Date() })
    .where(eq(posts.id, postId));

  revalidatePath("/blog");
  revalidatePath("/admin/blog");
  revalidatePath("/app/equipe-comunicacao");
}

export async function unpublishPost(formData: FormData) {
  await requireAdminPermission("blog.publish");
  const postId = formData.get("postId") as string | null;
  if (!postId) return;

  const [post] = await db.select({ id: posts.id }).from(posts).where(eq(posts.id, postId)).limit(1);
  if (!post) return;

  await db
    .update(posts)
    .set({ status: "rascunho", updatedAt: new Date() })
    .where(eq(posts.id, postId));

  revalidatePath("/blog");
  revalidatePath("/admin/blog");
  revalidatePath("/app/equipe-comunicacao");
}

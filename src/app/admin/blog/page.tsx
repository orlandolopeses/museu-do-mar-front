import { db } from "@/lib/db";
import { requireAdminPermission } from "@/lib/access";
import { posts } from "@/lib/schema";
import { desc } from "drizzle-orm";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import { Plus, Pencil, FileText, Eye, EyeOff } from "lucide-react";
import { publishPost, unpublishPost } from "./actions";

const STATUS_LABELS: Record<string, string> = {
  rascunho: "Rascunho",
  publicado: "Publicado",
};

async function getPosts() {
  try {
    return await db.select().from(posts).orderBy(desc(posts.updatedAt));
  } catch {
    return [];
  }
}

export default async function AdminBlogPage() {
  await requireAdminPermission("blog.create");
  const items = await getPosts();

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-2xl font-bold text-mar-escuro">Blog</h1>
        <Link href="/admin/blog/novo" className="btn-primary text-sm">
          <Plus className="w-4 h-4" /> Novo Post
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-20 text-mar-escuro/40">
          <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>Nenhum post cadastrado.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-mar-escuro/70">Título</th>
                <th className="text-left px-4 py-3 font-medium text-mar-escuro/70">Status</th>
                <th className="text-left px-4 py-3 font-medium text-mar-escuro/70">Publicado em</th>
                <th className="px-4 py-3 text-right font-medium text-mar-escuro/70">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((post) => (
                <tr key={post.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-mar-escuro">{post.title}</td>
                  <td className="px-4 py-3">
                    <span className={
                      post.status === "publicado" ? "badge-verde" : "badge bg-yellow-100 text-yellow-700"
                    }>
                      {STATUS_LABELS[post.status] ?? post.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-mar-escuro/50">{post.publishedAt ? formatDate(post.publishedAt) : "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {post.status === "rascunho" ? (
                        <form action={publishPost}>
                          <input type="hidden" name="postId" value={post.id} />
                          <button
                            type="submit"
                            title="Publicar"
                            className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-mar-verde hover:bg-mar-verde/10 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Publicar
                          </button>
                        </form>
                      ) : (
                        <form action={unpublishPost}>
                          <input type="hidden" name="postId" value={post.id} />
                          <button
                            type="submit"
                            title="Despublicar"
                            className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-amber-600 hover:bg-amber-50 transition-colors"
                          >
                            <EyeOff className="w-3.5 h-3.5" />
                            Despublicar
                          </button>
                        </form>
                      )}
                      <Link
                        href={`/admin/blog/${post.id}/editar`}
                        className="p-1.5 hover:bg-mar-azul/10 rounded text-mar-azul inline-flex"
                        title="Editar"
                      >
                        <Pencil className="w-4 h-4" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

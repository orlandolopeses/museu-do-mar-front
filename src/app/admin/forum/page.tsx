import { db } from "@/lib/db";
import { requireAdminPermission } from "@/lib/access";
import { forumRespostas, forumTopicos } from "@/lib/schema";
import { desc, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { formatDate } from "@/lib/utils";
import { MessageSquare, Trash2, Pin, Lock, LockOpen } from "lucide-react";

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
        respostas: sql<number>`(SELECT COUNT(*) FROM ${forumRespostas} WHERE ${forumRespostas.topicoId} = ${forumTopicos.id})`.mapWith(Number),
      })
      .from(forumTopicos)
      .orderBy(desc(forumTopicos.pinned), desc(forumTopicos.createdAt));
  } catch {
    return [];
  }
}

export default async function AdminForumPage() {
  await requireAdminPermission("forum.moderate");
  const items = await getTopicos();

  async function togglePinned(formData: FormData) {
    "use server";

    await requireAdminPermission("forum.moderate");

    const id = String(formData.get("id") ?? "");
    const nextPinned = String(formData.get("nextPinned") ?? "false") === "true";
    if (!id) return;

    await db.update(forumTopicos).set({ pinned: nextPinned }).where(eq(forumTopicos.id, id));

    revalidatePath("/forum");
    revalidatePath(`/forum/${id}`);
    revalidatePath("/admin/forum");
  }

  async function toggleStatus(formData: FormData) {
    "use server";

    await requireAdminPermission("forum.moderate");

    const id = String(formData.get("id") ?? "");
    const nextStatus = String(formData.get("nextStatus") ?? "aberto") as "aberto" | "fechado";
    if (!id) return;

    await db.update(forumTopicos).set({ status: nextStatus }).where(eq(forumTopicos.id, id));

    revalidatePath("/forum");
    revalidatePath(`/forum/${id}`);
    revalidatePath("/admin/forum");
  }

  async function deleteTopico(formData: FormData) {
    "use server";

    await requireAdminPermission("forum.moderate");

    const id = String(formData.get("id") ?? "");
    if (!id) return;

    await db.delete(forumTopicos).where(eq(forumTopicos.id, id));

    revalidatePath("/forum");
    revalidatePath(`/forum/${id}`);
    revalidatePath("/admin/forum");
  }

  return (
    <div className="p-8">
      <h1 className="font-serif text-2xl font-bold text-mar-escuro mb-6">Fórum — Moderação</h1>

      {items.length === 0 ? (
        <div className="text-center py-20 text-mar-escuro/40">
          <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>Nenhum tópico no fórum.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-mar-escuro/70">Título</th>
                <th className="text-left px-4 py-3 font-medium text-mar-escuro/70">Autor</th>
                <th className="text-left px-4 py-3 font-medium text-mar-escuro/70">Respostas</th>
                <th className="text-left px-4 py-3 font-medium text-mar-escuro/70">Status</th>
                <th className="text-left px-4 py-3 font-medium text-mar-escuro/70">Data</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((topico) => (
                <tr key={topico.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-mar-escuro">
                    <div className="flex flex-wrap items-center gap-2">
                      <span>{topico.titulo}</span>
                      {topico.pinned && <span className="badge bg-mar-cobre/10 text-mar-cobre">Fixado</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-mar-escuro/60">{topico.autorNome}</td>
                  <td className="px-4 py-3 text-mar-escuro/60">{topico.respostas}</td>
                  <td className="px-4 py-3 text-mar-escuro/60">{topico.status}</td>
                  <td className="px-4 py-3 text-mar-escuro/50">{formatDate(topico.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <form action={togglePinned}>
                        <input type="hidden" name="id" value={topico.id} />
                        <input type="hidden" name="nextPinned" value={topico.pinned ? "false" : "true"} />
                        <button className="p-1.5 hover:bg-mar-cobre/10 rounded text-mar-cobre inline-flex" title={topico.pinned ? "Desfixar" : "Fixar"}>
                          <Pin className="w-4 h-4" />
                        </button>
                      </form>
                      <form action={toggleStatus}>
                        <input type="hidden" name="id" value={topico.id} />
                        <input type="hidden" name="nextStatus" value={topico.status === "aberto" ? "fechado" : "aberto"} />
                        <button className="p-1.5 hover:bg-mar-azul/10 rounded text-mar-azul inline-flex" title={topico.status === "aberto" ? "Fechar" : "Reabrir"}>
                          {topico.status === "aberto" ? <Lock className="w-4 h-4" /> : <LockOpen className="w-4 h-4" />}
                        </button>
                      </form>
                      <form action={deleteTopico}>
                        <input type="hidden" name="id" value={topico.id} />
                        <button className="p-1.5 hover:bg-red-50 rounded text-red-400 hover:text-red-600 inline-flex" title="Excluir tópico">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </form>
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

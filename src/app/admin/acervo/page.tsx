import { db } from "@/lib/db";
import { requireAdminPermission } from "@/lib/access";
import { acervo } from "@/lib/schema";
import { desc } from "drizzle-orm";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import { Plus, Pencil, Camera } from "lucide-react";

const TIPO_LABELS: Record<string, string> = {
  foto: "Foto",
  video: "Vídeo",
  audio: "Áudio",
  documento: "Documento",
};

async function getAcervo() {
  try {
    return await db.select().from(acervo).orderBy(desc(acervo.createdAt));
  } catch {
    return [];
  }
}

export default async function AdminAcervoPage() {
  await requireAdminPermission("acervo.review");
  const items = await getAcervo();

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-2xl font-bold text-mar-escuro">Acervo</h1>
        <Link href="/admin/acervo/novo" className="btn-primary text-sm">
          <Plus className="w-4 h-4" /> Novo Item
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-20 text-mar-escuro/40">
          <Camera className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>Nenhum item no acervo.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-mar-escuro/70">Título</th>
                <th className="text-left px-4 py-3 font-medium text-mar-escuro/70">Tipo</th>
                <th className="text-left px-4 py-3 font-medium text-mar-escuro/70">Coleção</th>
                <th className="text-left px-4 py-3 font-medium text-mar-escuro/70">Status</th>
                <th className="text-left px-4 py-3 font-medium text-mar-escuro/70">Criado</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-mar-escuro">{item.titulo}</td>
                  <td className="px-4 py-3 text-mar-escuro/60">{TIPO_LABELS[item.tipo] ?? item.tipo}</td>
                  <td className="px-4 py-3 text-mar-escuro/60">{item.colecao ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className={item.publicado ? "badge-verde" : "badge bg-gray-100 text-gray-500"}>
                      {item.publicado ? "Publicado" : "Rascunho"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-mar-escuro/50">{formatDate(item.createdAt)}</td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/acervo/${item.id}/editar`} className="p-1.5 hover:bg-mar-azul/10 rounded text-mar-azul inline-flex">
                      <Pencil className="w-4 h-4" />
                    </Link>
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

import { db } from "@/lib/db";
import { requireAdminPermission } from "@/lib/access";
import { eventos, instituicoes } from "@/lib/schema";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import { Plus, Pencil, Calendar } from "lucide-react";

async function getEventos() {
  try {
    const [items, institutions] = await Promise.all([
      db.select().from(eventos).orderBy(eventos.dataInicio),
      db.select({ id: instituicoes.id, nome: instituicoes.nome }).from(instituicoes),
    ]);

    const institutionNameById = new Map(institutions.map((institution) => [institution.id, institution.nome]));

    return items.map((evento) => ({
      ...evento,
      instituicaoNome: evento.instituicaoId ? institutionNameById.get(evento.instituicaoId) ?? null : null,
    }));
  } catch {
    return [];
  }
}

export default async function AdminEventosPage() {
  await requireAdminPermission("eventos.manage");
  const items = await getEventos();

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-2xl font-bold text-mar-escuro">Eventos</h1>
        <Link href="/admin/eventos/novo" className="btn-primary text-sm">
          <Plus className="w-4 h-4" /> Novo Evento
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-20 text-mar-escuro/40">
          <Calendar className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>Nenhum evento cadastrado.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-mar-escuro/70">Título</th>
                <th className="text-left px-4 py-3 font-medium text-mar-escuro/70">Data</th>
                <th className="text-left px-4 py-3 font-medium text-mar-escuro/70">Instituição</th>
                <th className="text-left px-4 py-3 font-medium text-mar-escuro/70">Local</th>
                <th className="text-left px-4 py-3 font-medium text-mar-escuro/70">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((evento) => (
                <tr key={evento.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-mar-escuro">{evento.titulo}</td>
                  <td className="px-4 py-3 text-mar-escuro/60">{formatDate(evento.dataInicio)}</td>
                  <td className="px-4 py-3 text-mar-escuro/60">{evento.instituicaoNome ?? "—"}</td>
                  <td className="px-4 py-3 text-mar-escuro/60">{evento.local ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className={evento.publicado ? "badge-verde" : "badge bg-gray-100 text-gray-500"}>
                      {evento.publicado ? "Publicado" : "Rascunho"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/eventos/${evento.id}/editar`} className="p-1.5 hover:bg-mar-azul/10 rounded text-mar-azul inline-flex">
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

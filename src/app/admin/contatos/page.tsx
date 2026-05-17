import { db } from "@/lib/db";
import { requireAdminAccess } from "@/lib/access";
import { contatos } from "@/lib/schema";
import { desc } from "drizzle-orm";
import { formatDate } from "@/lib/utils";
import { Mail } from "lucide-react";

async function getContatos() {
  try {
    return await db.select().from(contatos).orderBy(desc(contatos.createdAt));
  } catch {
    return [];
  }
}

export default async function AdminContatosPage() {
  await requireAdminAccess();
  const items = await getContatos();

  return (
    <div className="p-8">
      <h1 className="font-serif text-2xl font-bold text-mar-escuro mb-6">Mensagens de Contato</h1>

      {items.length === 0 ? (
        <div className="text-center py-20 text-mar-escuro/40">
          <Mail className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>Nenhuma mensagem recebida.</p>
        </div>
      ) : (
        <div className="space-y-3 max-w-3xl">
          {items.map((item) => (
            <div
              key={item.id}
              className={`bg-white rounded-xl border p-5 ${!item.lido ? "border-mar-azul/40" : "border-gray-200"}`}
            >
              <div className="flex items-start justify-between gap-4 mb-2">
                <div>
                  <span className="font-medium text-mar-escuro">{item.nome}</span>
                  <span className="text-mar-escuro/40 text-sm ml-2">{item.email}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {!item.lido && <span className="badge-azul">Nova</span>}
                  <span className="text-xs text-mar-escuro/40">{formatDate(item.createdAt)}</span>
                </div>
              </div>
              <p className="text-sm font-medium text-mar-azul mb-1">{item.assunto}</p>
              <p className="text-sm text-mar-escuro/70 leading-relaxed">{item.mensagem}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

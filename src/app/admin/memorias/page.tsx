import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdminPermission } from "@/lib/access";
import { submissoesMemoria } from "@/lib/schema";
import { formatDate } from "@/lib/utils";
import { Check, X, InboxIcon } from "lucide-react";

export const metadata: Metadata = { title: "Memórias — Moderação" };

async function approveSubmission(formData: FormData) {
  "use server";
  const session = await requireAdminPermission("acervo.create");
  const id = formData.get("id") as string | null;
  if (!id) return;

  await db
    .update(submissoesMemoria)
    .set({ status: "aprovada", revisorId: session.user?.id ?? null, revisadoAt: new Date() })
    .where(eq(submissoesMemoria.id, id));

  revalidatePath("/admin/memorias");
  revalidatePath("/acervo");
}

async function rejectSubmission(formData: FormData) {
  "use server";
  const session = await requireAdminPermission("acervo.create");
  const id = formData.get("id") as string | null;
  const notas = formData.get("notas") as string | null;
  if (!id) return;

  await db
    .update(submissoesMemoria)
    .set({
      status: "rejeitada",
      notasModerr: notas || null,
      revisorId: session.user?.id ?? null,
      revisadoAt: new Date(),
    })
    .where(eq(submissoesMemoria.id, id));

  revalidatePath("/admin/memorias");
}

type SearchParamsInput = Promise<Record<string, string | string[] | undefined>>;

export default async function AdminMemoriasPage({ searchParams }: { searchParams: SearchParamsInput }) {
  await requireAdminPermission("acervo.create");

  const params = await searchParams;
  const filtro = (params.status as string) ?? "pendente";

  const items = await db
    .select()
    .from(submissoesMemoria)
    .where(
      filtro === "todos"
        ? undefined
        : eq(submissoesMemoria.status, filtro as "pendente" | "aprovada" | "rejeitada"),
    )
    .orderBy(submissoesMemoria.createdAt);

  const statusFilters = [
    { value: "pendente", label: "Pendentes" },
    { value: "aprovada", label: "Aprovadas" },
    { value: "rejeitada", label: "Rejeitadas" },
    { value: "todos", label: "Todas" },
  ];

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-serif text-2xl font-bold text-mar-escuro">Memórias comunitárias</h1>
        <span className="text-sm text-mar-escuro/50">Fila de moderação</span>
      </div>

      <div className="mb-6 flex gap-2 flex-wrap">
        {statusFilters.map((sf) => (
          <a
            key={sf.value}
            href={`/admin/memorias?status=${sf.value}`}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              filtro === sf.value
                ? "bg-mar-azul text-white"
                : "bg-mar-areia/20 text-mar-escuro/70 hover:bg-mar-areia/40"
            }`}
          >
            {sf.label}
          </a>
        ))}
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-mar-escuro/40">
          <InboxIcon className="mb-3 h-10 w-10 opacity-30" />
          <p>Nenhuma submissão {filtro === "todos" ? "" : `com status "${filtro}"`}.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <div key={item.id} className="rounded-2xl border border-mar-areia/30 bg-white p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        item.status === "pendente"
                          ? "bg-amber-100 text-amber-700"
                          : item.status === "aprovada"
                            ? "bg-mar-verde/10 text-mar-verde"
                            : "bg-red-100 text-red-600"
                      }`}
                    >
                      {item.status}
                    </span>
                    <span className="text-xs text-mar-escuro/40">{item.tipo}</span>
                    <span className="text-xs text-mar-escuro/40">{formatDate(item.createdAt)}</span>
                  </div>
                  <h2 className="mt-2 font-serif text-xl font-bold text-mar-escuro">{item.titulo}</h2>
                  <p className="mt-0.5 text-sm text-mar-escuro/55">
                    Por {item.nome}
                    {item.email ? ` · ${item.email}` : ""}
                  </p>
                  {(item.lugar || item.periodo) && (
                    <p className="mt-1 text-xs text-mar-escuro/45">
                      {[item.lugar, item.periodo].filter(Boolean).join(" · ")}
                    </p>
                  )}
                  <p className="mt-3 text-sm leading-relaxed text-mar-escuro/70 line-clamp-4">{item.conteudo}</p>
                  {item.urlMidia && (
                    <a
                      href={item.urlMidia}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-block text-sm text-mar-azul underline"
                    >
                      Ver mídia anexada
                    </a>
                  )}
                  {item.notasModerr && (
                    <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
                      Nota: {item.notasModerr}
                    </p>
                  )}
                </div>

                {item.status === "pendente" && (
                  <div className="flex shrink-0 flex-col gap-2">
                    <form action={approveSubmission}>
                      <input type="hidden" name="id" value={item.id} />
                      <button
                        type="submit"
                        className="inline-flex items-center gap-1.5 rounded-lg bg-mar-verde/10 px-3 py-1.5 text-sm font-medium text-mar-verde transition-colors hover:bg-mar-verde/20"
                      >
                        <Check className="h-4 w-4" />
                        Aprovar
                      </button>
                    </form>
                    <form action={rejectSubmission} className="flex flex-col gap-1">
                      <input type="hidden" name="id" value={item.id} />
                      <input
                        type="text"
                        name="notas"
                        placeholder="Motivo (opcional)"
                        className="rounded-lg border border-mar-areia/30 px-2 py-1 text-xs focus:border-mar-azul focus:outline-none"
                      />
                      <button
                        type="submit"
                        className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-100"
                      >
                        <X className="h-4 w-4" />
                        Rejeitar
                      </button>
                    </form>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import type { Metadata } from "next";
import { desc, eq, count } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdminAccess } from "@/lib/access";
import { instituicoes, userInstituicoes } from "@/lib/schema";
import { Building2, Plus } from "lucide-react";
import { z } from "zod";

export const metadata: Metadata = { title: "Instituições — Admin" };

const TIPO_OPTIONS = [
  { value: "escola", label: "Escola" },
  { value: "universidade", label: "Universidade" },
  { value: "secretaria", label: "Secretaria" },
  { value: "associacao", label: "Associação" },
  { value: "empresa", label: "Empresa" },
  { value: "imprensa", label: "Imprensa" },
  { value: "outra", label: "Outra" },
];

const TIPO_LABELS: Record<string, string> = Object.fromEntries(TIPO_OPTIONS.map((o) => [o.value, o.label]));
const instituicaoTipoSchema = z.enum(["escola", "universidade", "secretaria", "associacao", "empresa", "imprensa", "outra"]);
const instituicaoFormSchema = z.object({
  nome: z.string().trim().min(2).max(255),
  tipo: instituicaoTipoSchema,
  cidade: z.string().trim().max(150).optional().or(z.literal("")),
  estado: z.string().trim().max(100).optional().or(z.literal("")),
  responsavelNome: z.string().trim().max(255).optional().or(z.literal("")),
  responsavelEmail: z.string().trim().email().max(255).optional().or(z.literal("")),
});

async function createInstituicao(formData: FormData) {
  "use server";
  await requireAdminAccess();

  const parsed = instituicaoFormSchema.safeParse({
    nome: String(formData.get("nome") ?? ""),
    tipo: String(formData.get("tipo") ?? "outra"),
    cidade: String(formData.get("cidade") ?? ""),
    estado: String(formData.get("estado") ?? ""),
    responsavelNome: String(formData.get("responsavelNome") ?? ""),
    responsavelEmail: String(formData.get("responsavelEmail") ?? ""),
  });

  if (!parsed.success) return;

  const { nome, tipo, cidade, estado, responsavelNome, responsavelEmail } = parsed.data;

  await db.insert(instituicoes).values({
    id: crypto.randomUUID(),
    nome,
    tipo,
    cidade: cidade || null,
    estado: estado || null,
    responsavelNome: responsavelNome || null,
    responsavelEmail: responsavelEmail || null,
    ativo: true,
  });

  revalidatePath("/admin/instituicoes");
}

async function toggleInstituicaoStatus(formData: FormData) {
  "use server";
  await requireAdminAccess();

  const id = String(formData.get("id") ?? "").trim();
  const ativo = formData.get("ativo") === "true";
  if (!id) return;

  const [institution] = await db.select({ id: instituicoes.id }).from(instituicoes).where(eq(instituicoes.id, id)).limit(1);
  if (!institution) return;

  await db.update(instituicoes).set({ ativo: !ativo }).where(eq(instituicoes.id, id));
  revalidatePath("/admin/instituicoes");
}

export default async function AdminInstituicoesPage() {
  await requireAdminAccess();

  const items = await db
    .select({
      id: instituicoes.id,
      nome: instituicoes.nome,
      tipo: instituicoes.tipo,
      cidade: instituicoes.cidade,
      estado: instituicoes.estado,
      responsavelNome: instituicoes.responsavelNome,
      responsavelEmail: instituicoes.responsavelEmail,
      ativo: instituicoes.ativo,
      createdAt: instituicoes.createdAt,
    })
    .from(instituicoes)
    .orderBy(desc(instituicoes.createdAt));

  const memberCounts = await db
    .select({ instituicaoId: userInstituicoes.instituicaoId, total: count() })
    .from(userInstituicoes)
    .groupBy(userInstituicoes.instituicaoId);

  const memberCountMap = new Map(memberCounts.map((r) => [r.instituicaoId, r.total]));

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-serif text-2xl font-bold text-mar-escuro">Instituições</h1>
        <span className="text-sm text-mar-escuro/50">{items.filter((i) => i.ativo).length} ativas</span>
      </div>

      {/* Criar */}
      <div className="mb-8 rounded-2xl border border-mar-areia/30 bg-white p-6">
        <div className="mb-4 flex items-center gap-2">
          <Plus className="h-5 w-5 text-mar-azul" />
          <h2 className="font-serif text-lg font-bold text-mar-escuro">Nova instituição</h2>
        </div>
        <form action={createInstituicao} className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wide text-mar-escuro/55">
            Nome
            <input
              name="nome"
              type="text"
              required
              className="rounded-xl border border-mar-areia/40 bg-white px-3 py-2.5 text-sm text-mar-escuro outline-none focus:border-mar-azul/40"
              placeholder="Ex.: Escola Francisco Araújo"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wide text-mar-escuro/55">
            Tipo
            <select
              name="tipo"
              className="rounded-xl border border-mar-areia/40 bg-white px-3 py-2.5 text-sm text-mar-escuro outline-none focus:border-mar-azul/40"
            >
              {TIPO_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wide text-mar-escuro/55">
            Cidade
            <input
              name="cidade"
              type="text"
              className="rounded-xl border border-mar-areia/40 bg-white px-3 py-2.5 text-sm text-mar-escuro outline-none focus:border-mar-azul/40"
              placeholder="Ex.: Anchieta"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wide text-mar-escuro/55">
            Estado
            <input
              name="estado"
              type="text"
              className="rounded-xl border border-mar-areia/40 bg-white px-3 py-2.5 text-sm text-mar-escuro outline-none focus:border-mar-azul/40"
              placeholder="Ex.: ES"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wide text-mar-escuro/55">
            Responsável
            <input
              name="responsavelNome"
              type="text"
              className="rounded-xl border border-mar-areia/40 bg-white px-3 py-2.5 text-sm text-mar-escuro outline-none focus:border-mar-azul/40"
              placeholder="Nome do responsável"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wide text-mar-escuro/55">
            E-mail do responsável
            <input
              name="responsavelEmail"
              type="email"
              className="rounded-xl border border-mar-areia/40 bg-white px-3 py-2.5 text-sm text-mar-escuro outline-none focus:border-mar-azul/40"
              placeholder="email@escola.edu.br"
            />
          </label>
          <div className="md:col-span-2 xl:col-span-3 flex justify-end">
            <button type="submit" className="btn-primary text-sm">Criar instituição</button>
          </div>
        </form>
      </div>

      {/* Lista */}
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-mar-escuro/40">
          <Building2 className="mb-3 h-10 w-10 opacity-30" />
          <p>Nenhuma instituição cadastrada.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className={`rounded-2xl border p-5 ${item.ativo ? "border-mar-areia/30 bg-white" : "border-mar-areia/20 bg-mar-areia/5 opacity-60"}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-medium text-mar-escuro">{item.nome}</h2>
                    <span className="badge bg-mar-azul/10 text-mar-azul">{TIPO_LABELS[item.tipo] ?? item.tipo}</span>
                    {!item.ativo && <span className="badge bg-red-100 text-red-500">inativa</span>}
                  </div>
                  {(item.cidade || item.estado) && (
                    <p className="mt-1 text-sm text-mar-escuro/50">
                      {[item.cidade, item.estado].filter(Boolean).join(" · ")}
                    </p>
                  )}
                  {item.responsavelNome && (
                    <p className="mt-1 text-sm text-mar-escuro/50">
                      Resp.: {item.responsavelNome}
                      {item.responsavelEmail ? ` · ${item.responsavelEmail}` : ""}
                    </p>
                  )}
                  <p className="mt-2 text-xs text-mar-escuro/35">
                    {memberCountMap.get(item.id) ?? 0} usuário(s) vinculado(s)
                  </p>
                </div>
                <form action={toggleInstituicaoStatus}>
                  <input type="hidden" name="id" value={item.id} />
                  <input type="hidden" name="ativo" value={String(item.ativo)} />
                  <button
                    type="submit"
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                      item.ativo
                        ? "text-red-500 hover:bg-red-50"
                        : "text-mar-verde hover:bg-mar-verde/10"
                    }`}
                  >
                    {item.ativo ? "Desativar" : "Ativar"}
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

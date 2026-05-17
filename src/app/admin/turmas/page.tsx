import type { Metadata } from "next";
import { desc, eq, count, and, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdminAccess } from "@/lib/access";
import { instituicoes, matriculasTurma, turmas, userRoles, roles, users } from "@/lib/schema";
import { School, Plus } from "lucide-react";
import { z } from "zod";

export const metadata: Metadata = { title: "Turmas — Admin" };

const turmaFormSchema = z.object({
  nome: z.string().trim().min(2).max(150),
  instituicaoId: z.string().trim().min(1).max(36),
  anoLetivo: z.string().trim().optional().or(z.literal("")),
  segmento: z.string().trim().max(100).optional().or(z.literal("")),
  turno: z.string().trim().max(100).optional().or(z.literal("")),
  responsavelUserId: z.string().trim().max(36).optional().or(z.literal("")),
}).superRefine((data, ctx) => {
  if (!data.anoLetivo) return;

  const year = Number(data.anoLetivo);
  if (!Number.isInteger(year) || year < 2020 || year > 2035) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["anoLetivo"],
      message: "Ano letivo inválido.",
    });
  }
});

const enrollStudentSchema = z.object({
  turmaId: z.string().trim().min(1).max(36),
  email: z.string().trim().email().max(255),
});

async function getPageData() {
  const allTurmas = await db
    .select({
      id: turmas.id,
      nome: turmas.nome,
      anoLetivo: turmas.anoLetivo,
      segmento: turmas.segmento,
      turno: turmas.turno,
      ativo: turmas.ativo,
      responsavelUserId: turmas.responsavelUserId,
      createdAt: turmas.createdAt,
      instituicaoId: turmas.instituicaoId,
      instituicaoNome: instituicoes.nome,
      instituicaoTipo: instituicoes.tipo,
      cidade: instituicoes.cidade,
      estado: instituicoes.estado,
    })
    .from(turmas)
    .innerJoin(instituicoes, eq(turmas.instituicaoId, instituicoes.id))
    .orderBy(desc(turmas.createdAt));

  const matriculaCounts = await db
    .select({ turmaId: matriculasTurma.turmaId, total: count() })
    .from(matriculasTurma)
    .where(eq(matriculasTurma.status, "ativo"))
    .groupBy(matriculasTurma.turmaId);

  const matriculaCountMap = new Map(matriculaCounts.map((r) => [r.turmaId, r.total]));

  const responsavelIds = [...new Set(allTurmas.map((t) => t.responsavelUserId).filter(Boolean))] as string[];
  const responsaveis = responsavelIds.length > 0
    ? await db.select({ id: users.id, name: users.name }).from(users)
    : [];
  const responsavelMap = new Map(responsaveis.map((u) => [u.id, u.name]));

  const allInstituicoes = await db
    .select({ id: instituicoes.id, nome: instituicoes.nome, tipo: instituicoes.tipo })
    .from(instituicoes)
    .where(eq(instituicoes.ativo, true))
    .orderBy(instituicoes.nome);

  // professores = users com role professor, gestor_educacional, superadmin
  const professorRoles = await db
    .select({ userId: userRoles.userId, name: users.name })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .innerJoin(users, eq(userRoles.userId, users.id))
    .where(and(
      eq(users.status, "ativo"),
      inArray(roles.slug, ["professor", "gestor", "gestor_educacional", "superadmin"]),
    ));

  const professorUserIds = new Set<string>();
  const professorOptions: { id: string; name: string }[] = [];
  for (const row of professorRoles) {
    if (!professorUserIds.has(row.userId)) {
      professorUserIds.add(row.userId);
      professorOptions.push({ id: row.userId, name: row.name });
    }
  }

  return {
    turmas: allTurmas.map((t) => ({
      ...t,
      studentCount: matriculaCountMap.get(t.id) ?? 0,
      responsavelNome: t.responsavelUserId ? (responsavelMap.get(t.responsavelUserId) ?? "—") : "—",
    })),
    allInstituicoes,
    professorOptions,
  };
}

async function createTurma(formData: FormData) {
  "use server";
  await requireAdminAccess();

  const parsed = turmaFormSchema.safeParse({
    nome: String(formData.get("nome") ?? ""),
    instituicaoId: String(formData.get("instituicaoId") ?? ""),
    anoLetivo: String(formData.get("anoLetivo") ?? ""),
    segmento: String(formData.get("segmento") ?? ""),
    turno: String(formData.get("turno") ?? ""),
    responsavelUserId: String(formData.get("responsavelUserId") ?? ""),
  });

  if (!parsed.success) return;

  const { nome, instituicaoId, anoLetivo, segmento, turno, responsavelUserId } = parsed.data;

  const [institution] = await db.select({ id: instituicoes.id }).from(instituicoes).where(eq(instituicoes.id, instituicaoId)).limit(1);
  if (!institution) return;

  if (responsavelUserId) {
    const [responsibleUser] = await db.select({ id: users.id }).from(users).where(eq(users.id, responsavelUserId)).limit(1);
    if (!responsibleUser) return;
  }

  await db.insert(turmas).values({
    id: crypto.randomUUID(),
    nome,
    instituicaoId,
    anoLetivo: anoLetivo ? Number(anoLetivo) : null,
    segmento: segmento || null,
    turno: turno || null,
    responsavelUserId: responsavelUserId || null,
    ativo: true,
  });

  revalidatePath("/admin/turmas");
}

async function enrollStudent(formData: FormData) {
  "use server";
  await requireAdminAccess();

  const parsed = enrollStudentSchema.safeParse({
    turmaId: String(formData.get("turmaId") ?? ""),
    email: String(formData.get("email") ?? "").toLowerCase(),
  });

  if (!parsed.success) return;

  const { turmaId, email } = parsed.data;

  const [turma] = await db.select({ id: turmas.id }).from(turmas).where(eq(turmas.id, turmaId)).limit(1);
  if (!turma) return;

  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!user) return;

  try {
    await db.insert(matriculasTurma).values({
      id: crypto.randomUUID(),
      turmaId,
      userId: user.id,
      status: "ativo",
    });
  } catch {
    // já matriculado
  }

  revalidatePath("/admin/turmas");
}

async function toggleTurmaStatus(formData: FormData) {
  "use server";
  await requireAdminAccess();

  const id = String(formData.get("id") ?? "").trim();
  const ativo = formData.get("ativo") === "true";
  if (!id) return;

  const [turma] = await db.select({ id: turmas.id }).from(turmas).where(eq(turmas.id, id)).limit(1);
  if (!turma) return;

  if (ativo) {
    const [{ total }] = await db
      .select({ total: count() })
      .from(matriculasTurma)
      .where(and(eq(matriculasTurma.turmaId, id), eq(matriculasTurma.status, "ativo")));

    if (total > 0) return;
  }

  await db.update(turmas).set({ ativo: !ativo }).where(eq(turmas.id, id));
  revalidatePath("/admin/turmas");
}

export default async function AdminTurmasPage() {
  await requireAdminAccess();
  const data = await getPageData();

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-serif text-2xl font-bold text-mar-escuro">Turmas</h1>
        <span className="text-sm text-mar-escuro/50">{data.turmas.filter((t) => t.ativo).length} ativas</span>
      </div>

      {/* Criar turma */}
      <div className="mb-8 rounded-2xl border border-mar-areia/30 bg-white p-6">
        <div className="mb-4 flex items-center gap-2">
          <Plus className="h-5 w-5 text-mar-azul" />
          <h2 className="font-serif text-lg font-bold text-mar-escuro">Nova turma</h2>
        </div>
        {data.allInstituicoes.length === 0 ? (
          <p className="text-sm text-mar-escuro/50">
            Crie ao menos uma instituição antes de adicionar turmas.{" "}
            <a href="/admin/instituicoes" className="text-mar-azul underline">Ir para Instituições</a>
          </p>
        ) : (
          <form action={createTurma} className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wide text-mar-escuro/55">
              Nome da turma
              <input
                name="nome"
                type="text"
                required
                className="rounded-xl border border-mar-areia/40 bg-white px-3 py-2.5 text-sm text-mar-escuro outline-none focus:border-mar-azul/40"
                placeholder="Ex.: 6º Ano A"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wide text-mar-escuro/55">
              Instituição
              <select
                name="instituicaoId"
                required
                className="rounded-xl border border-mar-areia/40 bg-white px-3 py-2.5 text-sm text-mar-escuro outline-none focus:border-mar-azul/40"
              >
                <option value="">Selecione...</option>
                {data.allInstituicoes.map((inst) => (
                  <option key={inst.id} value={inst.id}>{inst.nome}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wide text-mar-escuro/55">
              Professor responsável
              <select
                name="responsavelUserId"
                className="rounded-xl border border-mar-areia/40 bg-white px-3 py-2.5 text-sm text-mar-escuro outline-none focus:border-mar-azul/40"
              >
                <option value="">Sem professor responsável</option>
                {data.professorOptions.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wide text-mar-escuro/55">
              Ano letivo
              <input
                name="anoLetivo"
                type="number"
                min="2020"
                max="2030"
                className="rounded-xl border border-mar-areia/40 bg-white px-3 py-2.5 text-sm text-mar-escuro outline-none focus:border-mar-azul/40"
                placeholder="Ex.: 2026"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wide text-mar-escuro/55">
              Segmento
              <input
                name="segmento"
                type="text"
                className="rounded-xl border border-mar-areia/40 bg-white px-3 py-2.5 text-sm text-mar-escuro outline-none focus:border-mar-azul/40"
                placeholder="Ex.: Ensino Fundamental"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wide text-mar-escuro/55">
              Turno
              <select
                name="turno"
                className="rounded-xl border border-mar-areia/40 bg-white px-3 py-2.5 text-sm text-mar-escuro outline-none focus:border-mar-azul/40"
              >
                <option value="">Não informado</option>
                <option value="Matutino">Matutino</option>
                <option value="Vespertino">Vespertino</option>
                <option value="Noturno">Noturno</option>
                <option value="Integral">Integral</option>
              </select>
            </label>
            <div className="md:col-span-2 xl:col-span-3 flex justify-end">
              <button type="submit" className="btn-primary text-sm">Criar turma</button>
            </div>
          </form>
        )}
      </div>

      {/* Lista */}
      {data.turmas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-mar-escuro/40">
          <School className="mb-3 h-10 w-10 opacity-30" />
          <p>Nenhuma turma cadastrada.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {data.turmas.map((turma) => (
            <div
              key={turma.id}
              className={`rounded-2xl border p-5 ${turma.ativo ? "border-mar-areia/30 bg-white" : "border-mar-areia/20 bg-mar-areia/5 opacity-60"}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-medium text-mar-escuro">{turma.nome}</h2>
                    {turma.anoLetivo && (
                      <span className="badge bg-mar-azul/10 text-mar-azul">{turma.anoLetivo}</span>
                    )}
                    {turma.turno && (
                      <span className="badge bg-mar-cobre/10 text-mar-cobre">{turma.turno}</span>
                    )}
                    {!turma.ativo && <span className="badge bg-red-100 text-red-500">inativa</span>}
                  </div>
                  <p className="mt-1 text-sm text-mar-escuro/55">
                    {turma.instituicaoNome}
                    {(turma.cidade || turma.estado) && ` · ${[turma.cidade, turma.estado].filter(Boolean).join("/")} `}
                  </p>
                  {turma.segmento && (
                    <p className="mt-0.5 text-xs text-mar-escuro/40">{turma.segmento}</p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-4 text-xs text-mar-escuro/45">
                    <span>{turma.studentCount} aluno(s)</span>
                    <span>Prof.: {turma.responsavelNome}</span>
                  </div>
                </div>

                <div className="flex shrink-0 flex-col gap-2 items-end">
                  {/* Matricular aluno */}
                  {turma.ativo && (
                    <form action={enrollStudent} className="flex items-center gap-2">
                      <input type="hidden" name="turmaId" value={turma.id} />
                      <input
                        name="email"
                        type="email"
                        required
                        className="w-52 rounded-lg border border-mar-areia/40 px-2.5 py-1.5 text-xs text-mar-escuro outline-none focus:border-mar-azul/40"
                        placeholder="email do estudante"
                      />
                      <button
                        type="submit"
                        className="rounded-lg bg-mar-azul/10 px-2.5 py-1.5 text-xs font-medium text-mar-azul transition-colors hover:bg-mar-azul/20"
                      >
                        Matricular
                      </button>
                    </form>
                  )}

                  <form action={toggleTurmaStatus}>
                    <input type="hidden" name="id" value={turma.id} />
                    <input type="hidden" name="ativo" value={String(turma.ativo)} />
                    <button
                      type="submit"
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                        turma.ativo
                          ? "text-red-500 hover:bg-red-50"
                          : "text-mar-verde hover:bg-mar-verde/10"
                      }`}
                    >
                      {turma.ativo ? "Desativar" : "Ativar"}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import type { Metadata } from "next";
import { and, asc, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdminAccess } from "@/lib/access";
import { instituicoes, profiles, roles, userInstituicoes, userRoles, users } from "@/lib/schema";
import { formatDate } from "@/lib/utils";
import { Building2, Save, Users, UserCheck, UserX, Plus } from "lucide-react";
import { z } from "zod";

export const metadata: Metadata = { title: "Usuários — Admin" };

const ROLE_OPTIONS = [
  { value: "superadmin", label: "Super Admin" },
  { value: "professor", label: "Professor" },
  { value: "estudante", label: "Estudante" },
  { value: "gestor_educacional", label: "Gestor Educacional" },
  { value: "gestor", label: "Gestor" },
  { value: "equipe_comunicacao", label: "Equipe Comunicação" },
  { value: "equipe_producao", label: "Equipe Produção" },
  { value: "bolsista", label: "Bolsista" },
  { value: "voluntario", label: "Voluntário" },
  { value: "apoiador", label: "Apoiador" },
  { value: "comunicador", label: "Comunicador" },
];

const ROLE_VALUE_SET = new Set(ROLE_OPTIONS.map((role) => role.value));

const PROFILE_TYPE_OPTIONS = new Set([
  "professor",
  "estudante",
  "gestor",
  "gestor_educacional",
  "comunidade",
  "parceiro",
  "apoiador",
  "comunicador",
  "equipe",
  "equipe_producao",
  "equipe_comunicacao",
  "bolsista",
  "voluntario",
]);

type ProfileTypeValue =
  | "professor"
  | "estudante"
  | "gestor"
  | "gestor_educacional"
  | "comunidade"
  | "parceiro"
  | "apoiador"
  | "comunicador"
  | "equipe"
  | "equipe_producao"
  | "equipe_comunicacao"
  | "bolsista"
  | "voluntario";

type InstitutionSummary = {
  id: string;
  nome: string;
  cidade: string | null;
  estado: string | null;
};

type RoleAssignment = {
  slug: string;
  isPrimary: boolean;
};

type UserInstitutionLink = {
  instituicaoId: string;
  instituicaoNome: string;
  cidade: string | null;
  estado: string | null;
  isPrimary: boolean;
  funcaoInstitucional: string | null;
};

const createUserSchema = z.object({
  name: z.string().trim().min(2).max(255),
  email: z.string().trim().email().max(255),
  password: z.string().trim().min(10).max(255),
  roleSlug: z.string().trim().max(100).optional().or(z.literal("")),
  instituicaoId: z.string().trim().max(36).optional().or(z.literal("")),
  funcaoInstitucional: z.string().trim().max(150).optional().or(z.literal("")),
}).superRefine((data, ctx) => {
  if (data.roleSlug && !ROLE_VALUE_SET.has(data.roleSlug)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Perfil principal inválido.",
      path: ["roleSlug"],
    });
  }
});

const updateUserAccessSchema = z.object({
  userId: z.string().trim().min(1).max(36),
  roleSlug: z.string().trim().max(100).optional().or(z.literal("")),
  instituicaoId: z.string().trim().max(36).optional().or(z.literal("")),
  funcaoInstitucional: z.string().trim().max(150).optional().or(z.literal("")),
}).superRefine((data, ctx) => {
  if (data.roleSlug && !ROLE_VALUE_SET.has(data.roleSlug)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Perfil principal inválido.",
      path: ["roleSlug"],
    });
  }
});

const userRoleMutationSchema = z.object({
  userId: z.string().trim().min(1).max(36),
  roleSlug: z.string().trim().min(1).max(100),
}).superRefine((data, ctx) => {
  if (!ROLE_VALUE_SET.has(data.roleSlug)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Papel inválido.",
      path: ["roleSlug"],
    });
  }
});

const toggleUserStatusSchema = z.object({
  userId: z.string().trim().min(1).max(36),
  newStatus: z.enum(["ativo", "bloqueado"]),
});

async function getInstitutionSummary(instituicaoId: string) {
  const [institution] = await db
    .select({ id: instituicoes.id, nome: instituicoes.nome, cidade: instituicoes.cidade, estado: instituicoes.estado })
    .from(instituicoes)
    .where(eq(instituicoes.id, instituicaoId))
    .limit(1);

  return institution ?? null;
}

async function syncProfileInstitution(userId: string, institution?: InstitutionSummary | null) {
  const [existingProfile] = await db
    .select({ id: profiles.id })
    .from(profiles)
    .where(eq(profiles.userId, userId))
    .limit(1);

  if (existingProfile) {
    await db
      .update(profiles)
      .set({
        institutionName: institution?.nome ?? null,
        city: institution?.cidade ?? null,
        state: institution?.estado ?? null,
        updatedAt: new Date(),
      })
      .where(eq(profiles.id, existingProfile.id));
  }
}

async function syncPrimaryRole(userId: string, roleSlug: string | null) {
  if (!roleSlug) {
    await db.update(users).set({ primaryRole: null, isAdmin: false }).where(eq(users.id, userId));
    await db.update(userRoles).set({ isPrimary: false }).where(eq(userRoles.userId, userId));
    return;
  }

  const [role] = await db.select({ id: roles.id }).from(roles).where(eq(roles.slug, roleSlug)).limit(1);
  if (!role) return;

  await db.update(users).set({ primaryRole: roleSlug, isAdmin: roleSlug === "superadmin" }).where(eq(users.id, userId));
  await db.update(userRoles).set({ isPrimary: false }).where(eq(userRoles.userId, userId));

  const [existingUserRole] = await db
    .select({ id: userRoles.id })
    .from(userRoles)
    .where(and(eq(userRoles.userId, userId), eq(userRoles.roleId, role.id)))
    .limit(1);

  if (existingUserRole) {
    await db.update(userRoles).set({ isPrimary: true }).where(eq(userRoles.id, existingUserRole.id));
  } else {
    await db.insert(userRoles).values({
      id: crypto.randomUUID(),
      userId,
      roleId: role.id,
      isPrimary: true,
      assignedBy: null,
      createdAt: new Date(),
    });
  }

  if (PROFILE_TYPE_OPTIONS.has(roleSlug)) {
    const [existingProfile] = await db
      .select({ id: profiles.id })
      .from(profiles)
      .where(eq(profiles.userId, userId))
      .limit(1);

    if (existingProfile) {
      await db
        .update(profiles)
        .set({ profileType: roleSlug as ProfileTypeValue, updatedAt: new Date() })
        .where(eq(profiles.id, existingProfile.id));
    }
  }
}

async function syncPrimaryInstitution(
  userId: string,
  instituicaoId: string | null,
  institution?: InstitutionSummary | null,
  funcaoInstitucional?: string | null,
) {
  await db.update(userInstituicoes).set({ isPrimary: false }).where(eq(userInstituicoes.userId, userId));

  if (!instituicaoId) {
    await syncProfileInstitution(userId, null);
    return;
  }

  const resolvedInstitution = institution ?? (await getInstitutionSummary(instituicaoId));

  const [existingLink] = await db
    .select({ id: userInstituicoes.id })
    .from(userInstituicoes)
    .where(and(eq(userInstituicoes.userId, userId), eq(userInstituicoes.instituicaoId, instituicaoId)))
    .limit(1);

  if (existingLink) {
    await db
      .update(userInstituicoes)
      .set({ isPrimary: true, funcaoInstitucional: funcaoInstitucional?.trim() || null })
      .where(eq(userInstituicoes.id, existingLink.id));
  } else {
    await db.insert(userInstituicoes).values({
      id: crypto.randomUUID(),
      userId,
      instituicaoId,
      funcaoInstitucional: funcaoInstitucional?.trim() || null,
      isPrimary: true,
      createdAt: new Date(),
    });
  }

  await syncProfileInstitution(userId, resolvedInstitution);
}

async function saveInstitutionLink(formData: FormData) {
  "use server";
  await requireAdminAccess();

  const userId = String(formData.get("userId") ?? "").trim();
  const instituicaoId = String(formData.get("instituicaoId") ?? "").trim();
  const funcaoInstitucional = String(formData.get("funcaoInstitucional") ?? "").trim();
  const isPrimaryLink = String(formData.get("isPrimaryLink") ?? "") === "true";
  const makePrimary = String(formData.get("makePrimary") ?? "") === "true";

  if (!userId || !instituicaoId) return;

  const institution = await getInstitutionSummary(instituicaoId);
  if (!institution) return;

  if (isPrimaryLink || makePrimary) {
    await syncPrimaryInstitution(userId, instituicaoId, institution, funcaoInstitucional || null);
  } else {
    const [existingLink] = await db
      .select({ id: userInstituicoes.id })
      .from(userInstituicoes)
      .where(and(eq(userInstituicoes.userId, userId), eq(userInstituicoes.instituicaoId, instituicaoId)))
      .limit(1);

    if (existingLink) {
      await db
        .update(userInstituicoes)
        .set({ funcaoInstitucional: funcaoInstitucional || null })
        .where(eq(userInstituicoes.id, existingLink.id));
    } else {
      await db.insert(userInstituicoes).values({
        id: crypto.randomUUID(),
        userId,
        instituicaoId,
        funcaoInstitucional: funcaoInstitucional || null,
        isPrimary: false,
        createdAt: new Date(),
      });
    }
  }

  revalidatePath("/admin/usuarios");
  revalidatePath("/app/perfil");
}

async function removeInstitutionLink(formData: FormData) {
  "use server";
  await requireAdminAccess();

  const userId = String(formData.get("userId") ?? "").trim();
  const instituicaoId = String(formData.get("instituicaoId") ?? "").trim();
  if (!userId || !instituicaoId) return;

  const [link] = await db
    .select({ id: userInstituicoes.id, isPrimary: userInstituicoes.isPrimary })
    .from(userInstituicoes)
    .where(and(eq(userInstituicoes.userId, userId), eq(userInstituicoes.instituicaoId, instituicaoId)))
    .limit(1);

  if (!link) return;

  await db.delete(userInstituicoes).where(eq(userInstituicoes.id, link.id));

  if (link.isPrimary) {
    const [replacement] = await db
      .select({
        instituicaoId: userInstituicoes.instituicaoId,
        funcaoInstitucional: userInstituicoes.funcaoInstitucional,
      })
      .from(userInstituicoes)
      .where(eq(userInstituicoes.userId, userId))
      .orderBy(asc(userInstituicoes.createdAt))
      .limit(1);

    if (replacement) {
      const institution = await getInstitutionSummary(replacement.instituicaoId);
      await syncPrimaryInstitution(
        userId,
        replacement.instituicaoId,
        institution,
        replacement.funcaoInstitucional || null,
      );
    } else {
      await syncPrimaryInstitution(userId, null, null, null);
    }
  }

  revalidatePath("/admin/usuarios");
  revalidatePath("/app/perfil");
}

async function getUsersWithRoles() {
  const allUsers = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      status: users.status,
      isAdmin: users.isAdmin,
      primaryRole: users.primaryRole,
      lastLoginAt: users.lastLoginAt,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(desc(users.createdAt));

  const allProfiles = await db
    .select({
      userId: profiles.userId,
      displayName: profiles.displayName,
      institutionName: profiles.institutionName,
    })
    .from(profiles);

  const allUserRoles = await db
    .select({
      userId: userRoles.userId,
      slug: roles.slug,
      isPrimary: userRoles.isPrimary,
    })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id));

  const allUserInstituicoes = await db
    .select({
      userId: userInstituicoes.userId,
      instituicaoId: userInstituicoes.instituicaoId,
      isPrimary: userInstituicoes.isPrimary,
      funcaoInstitucional: userInstituicoes.funcaoInstitucional,
      instituicaoNome: instituicoes.nome,
      cidade: instituicoes.cidade,
      estado: instituicoes.estado,
    })
    .from(userInstituicoes)
    .innerJoin(instituicoes, eq(userInstituicoes.instituicaoId, instituicoes.id));

  const rolesByUser = new Map<string, string[]>();
  const roleAssignmentsByUser = new Map<string, RoleAssignment[]>();
  for (const row of allUserRoles) {
    const list = rolesByUser.get(row.userId) ?? [];
    list.push(row.slug);
    rolesByUser.set(row.userId, list);

    const assignments = roleAssignmentsByUser.get(row.userId) ?? [];
    assignments.push({ slug: row.slug, isPrimary: row.isPrimary });
    roleAssignmentsByUser.set(row.userId, assignments);
  }

  const profileByUser = new Map(allProfiles.map((profile) => [profile.userId, profile]));

  const institutionLinksByUser = new Map<string, UserInstitutionLink[]>();
  for (const row of allUserInstituicoes) {
    const list = institutionLinksByUser.get(row.userId) ?? [];
    list.push({
      instituicaoId: row.instituicaoId,
      instituicaoNome: row.instituicaoNome,
      cidade: row.cidade,
      estado: row.estado,
      isPrimary: row.isPrimary,
      funcaoInstitucional: row.funcaoInstitucional,
    });
    institutionLinksByUser.set(row.userId, list);
  }

  return allUsers.map((user) => ({
    ...user,
    displayName: profileByUser.get(user.id)?.displayName ?? null,
    profileInstitutionName: profileByUser.get(user.id)?.institutionName ?? null,
    roleSlugs: rolesByUser.get(user.id) ?? [],
    roleAssignments: roleAssignmentsByUser.get(user.id) ?? [],
    institutionLinks: institutionLinksByUser.get(user.id) ?? [],
  }));
}

async function createUser(formData: FormData) {
  "use server";
  await requireAdminAccess();

  const parsed = createUserSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? "").toLowerCase(),
    password: String(formData.get("password") ?? ""),
    roleSlug: String(formData.get("role") ?? ""),
    instituicaoId: String(formData.get("instituicaoId") ?? ""),
    funcaoInstitucional: String(formData.get("funcaoInstitucional") ?? ""),
  });

  if (!parsed.success) return;

  const { name, email, password, roleSlug, instituicaoId, funcaoInstitucional } = parsed.data;
  const normalizedRoleSlug = roleSlug || "";

  const [existingUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existingUser) return;

  const bcrypt = await import("bcryptjs");
  const passwordHash = await bcrypt.hash(password, 10);

  const [institution] = instituicaoId
    ? await db
        .select({ id: instituicoes.id, nome: instituicoes.nome, cidade: instituicoes.cidade, estado: instituicoes.estado })
        .from(instituicoes)
        .where(eq(instituicoes.id, instituicaoId))
        .limit(1)
    : [];

  if (instituicaoId && !institution) return;

  const userId = crypto.randomUUID();
  await db.insert(users).values({
    id: userId,
    name,
    email,
    passwordHash,
    isAdmin: false,
    primaryRole: null,
    status: "ativo",
  });

  await db.insert(profiles).values({
    id: crypto.randomUUID(),
    userId,
    displayName: name,
    institutionName: institution?.nome ?? null,
    city: institution?.cidade ?? null,
    state: institution?.estado ?? null,
    profileType: PROFILE_TYPE_OPTIONS.has(normalizedRoleSlug) ? (normalizedRoleSlug as ProfileTypeValue) : null,
  });

  if (normalizedRoleSlug) {
    await syncPrimaryRole(userId, normalizedRoleSlug);
  }

  if (institution) {
    await syncPrimaryInstitution(userId, institution.id, institution, funcaoInstitucional || null);
  }

  revalidatePath("/admin/usuarios");
}

async function updateUserAccess(formData: FormData) {
  "use server";
  await requireAdminAccess();

  const parsed = updateUserAccessSchema.safeParse({
    userId: String(formData.get("userId") ?? ""),
    roleSlug: String(formData.get("primaryRole") ?? ""),
    instituicaoId: String(formData.get("instituicaoId") ?? ""),
    funcaoInstitucional: String(formData.get("funcaoInstitucional") ?? ""),
  });

  if (!parsed.success) return;

  const { userId, roleSlug, instituicaoId, funcaoInstitucional } = parsed.data;

  const [institution] = instituicaoId
    ? await db
        .select({ id: instituicoes.id, nome: instituicoes.nome, cidade: instituicoes.cidade, estado: instituicoes.estado })
        .from(instituicoes)
        .where(eq(instituicoes.id, instituicaoId))
        .limit(1)
    : [];

  if (instituicaoId && !institution) return;

  await syncPrimaryRole(userId, roleSlug || null);
  await syncPrimaryInstitution(userId, institution?.id ?? null, institution ?? null, funcaoInstitucional || null);

  revalidatePath("/admin/usuarios");
  revalidatePath("/app/perfil");
}

async function addSecondaryRole(formData: FormData) {
  "use server";
  await requireAdminAccess();

  const parsed = userRoleMutationSchema.safeParse({
    userId: String(formData.get("userId") ?? ""),
    roleSlug: String(formData.get("roleSlug") ?? ""),
  });

  if (!parsed.success) return;

  const { userId, roleSlug } = parsed.data;

  const [role] = await db.select({ id: roles.id }).from(roles).where(eq(roles.slug, roleSlug)).limit(1);
  if (!role) return;

  const [existingUserRole] = await db
    .select({ id: userRoles.id })
    .from(userRoles)
    .where(and(eq(userRoles.userId, userId), eq(userRoles.roleId, role.id)))
    .limit(1);

  if (!existingUserRole) {
    await db.insert(userRoles).values({
      id: crypto.randomUUID(),
      userId,
      roleId: role.id,
      isPrimary: false,
      assignedBy: null,
      createdAt: new Date(),
    });
  }

  revalidatePath("/admin/usuarios");
}

async function removeSecondaryRole(formData: FormData) {
  "use server";
  await requireAdminAccess();

  const parsed = userRoleMutationSchema.safeParse({
    userId: String(formData.get("userId") ?? ""),
    roleSlug: String(formData.get("roleSlug") ?? ""),
  });

  if (!parsed.success) return;

  const { userId, roleSlug } = parsed.data;

  const [user] = await db.select({ primaryRole: users.primaryRole }).from(users).where(eq(users.id, userId)).limit(1);
  if (!user || user.primaryRole === roleSlug) return;

  const [role] = await db.select({ id: roles.id }).from(roles).where(eq(roles.slug, roleSlug)).limit(1);
  if (!role) return;

  const [existingUserRole] = await db
    .select({ id: userRoles.id })
    .from(userRoles)
    .where(and(eq(userRoles.userId, userId), eq(userRoles.roleId, role.id)))
    .limit(1);

  if (!existingUserRole) return;

  await db.delete(userRoles).where(eq(userRoles.id, existingUserRole.id));
  revalidatePath("/admin/usuarios");
}

async function toggleUserStatus(formData: FormData) {
  "use server";
  const session = await requireAdminAccess();

  const parsed = toggleUserStatusSchema.safeParse({
    userId: String(formData.get("userId") ?? ""),
    newStatus: String(formData.get("newStatus") ?? ""),
  });

  if (!parsed.success) return;

  const { userId, newStatus } = parsed.data;
  if (session.user.id === userId && newStatus === "bloqueado") return;

  await db.update(users).set({ status: newStatus }).where(eq(users.id, userId));
  revalidatePath("/admin/usuarios");
}

const statusTone: Record<string, string> = {
  ativo: "bg-mar-verde/10 text-mar-verde",
  pendente: "bg-amber-100 text-amber-700",
  bloqueado: "bg-red-100 text-red-600",
};

export default async function AdminUsuariosPage() {
  await requireAdminAccess();
  const allUsers = await getUsersWithRoles();
  const institutionOptions = await db
    .select({ id: instituicoes.id, nome: instituicoes.nome })
    .from(instituicoes)
    .where(eq(instituicoes.ativo, true))
    .orderBy(instituicoes.nome);

  const activeCount = allUsers.filter((u) => u.status === "ativo").length;
  const blockedCount = allUsers.filter((u) => u.status === "bloqueado").length;

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-serif text-2xl font-bold text-mar-escuro">Usuários</h1>
        <div className="flex gap-3 text-sm text-mar-escuro/50">
          <span>{activeCount} ativos</span>
          {blockedCount > 0 && <span className="text-red-500">{blockedCount} bloqueados</span>}
        </div>
      </div>

      {/* Criar usuário */}
      <div className="mb-8 rounded-2xl border border-mar-areia/30 bg-white p-6">
        <div className="mb-4 flex items-center gap-2">
          <Plus className="h-5 w-5 text-mar-azul" />
          <h2 className="font-serif text-lg font-bold text-mar-escuro">Novo usuário</h2>
        </div>
        <form action={createUser} className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wide text-mar-escuro/55">
            Nome completo
            <input
              name="name"
              type="text"
              required
              className="rounded-xl border border-mar-areia/40 bg-white px-3 py-2.5 text-sm text-mar-escuro outline-none transition-colors focus:border-mar-azul/40"
              placeholder="Ex.: Maria Silva"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wide text-mar-escuro/55">
            E-mail
            <input
              name="email"
              type="email"
              required
              className="rounded-xl border border-mar-areia/40 bg-white px-3 py-2.5 text-sm text-mar-escuro outline-none transition-colors focus:border-mar-azul/40"
              placeholder="email@exemplo.com"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wide text-mar-escuro/55">
            Senha inicial
            <input
              name="password"
              type="text"
              required
              className="rounded-xl border border-mar-areia/40 bg-white px-3 py-2.5 text-sm text-mar-escuro outline-none transition-colors focus:border-mar-azul/40"
              placeholder="Envie ao usuário por outro canal"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wide text-mar-escuro/55">
            Perfil
            <select
              name="role"
              className="rounded-xl border border-mar-areia/40 bg-white px-3 py-2.5 text-sm text-mar-escuro outline-none transition-colors focus:border-mar-azul/40"
            >
              <option value="">Sem perfil</option>
              {ROLE_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wide text-mar-escuro/55">
            Instituição principal
            <select
              name="instituicaoId"
              className="rounded-xl border border-mar-areia/40 bg-white px-3 py-2.5 text-sm text-mar-escuro outline-none transition-colors focus:border-mar-azul/40"
            >
              <option value="">Sem vínculo inicial</option>
              {institutionOptions.map((institution) => (
                <option key={institution.id} value={institution.id}>{institution.nome}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wide text-mar-escuro/55">
            Função institucional
            <input
              name="funcaoInstitucional"
              type="text"
              className="rounded-xl border border-mar-areia/40 bg-white px-3 py-2.5 text-sm text-mar-escuro outline-none transition-colors focus:border-mar-azul/40"
              placeholder="Ex.: coordenação pedagógica"
            />
          </label>
          <div className="md:col-span-2 xl:col-span-5 flex justify-end">
            <button type="submit" className="btn-primary text-sm">Criar usuário</button>
          </div>
        </form>
      </div>

      {/* Lista */}
      {allUsers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-mar-escuro/40">
          <Users className="mb-3 h-10 w-10 opacity-30" />
          <p>Nenhum usuário cadastrado.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-mar-areia/30 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-mar-areia/20 bg-mar-creme/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-mar-escuro/55">Usuário</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-mar-escuro/55">Acesso principal</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-mar-escuro/55">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-mar-escuro/55">Último login</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-mar-escuro/55">Desde</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-mar-escuro/55">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-mar-areia/20">
              {allUsers.map((user) => (
                <tr key={user.id} className="hover:bg-mar-creme/30">
                  <td className="px-4 py-3">
                    <p className="font-medium text-mar-escuro">{user.displayName ?? user.name}</p>
                    <p className="text-xs text-mar-escuro/45">{user.email}</p>
                    {user.isAdmin && (
                      <span className="mt-0.5 inline-block rounded-full bg-mar-azul/10 px-2 py-0.5 text-xs font-medium text-mar-azul">admin</span>
                    )}
                    {user.roleSlugs.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {user.roleSlugs.map((slug) => (
                          <span key={slug} className="badge bg-mar-cobre/10 text-mar-cobre">{slug}</span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="space-y-3 min-w-60">
                      <form action={updateUserAccess} className="space-y-2">
                        <input type="hidden" name="userId" value={user.id} />
                        <label className="flex flex-col gap-1 text-[11px] font-medium uppercase tracking-wide text-mar-escuro/45">
                          Perfil principal
                          <select
                            name="primaryRole"
                            defaultValue={user.primaryRole ?? ""}
                            className="rounded-lg border border-mar-areia/40 bg-white px-2.5 py-1.5 text-xs text-mar-escuro outline-none transition-colors focus:border-mar-azul/40"
                          >
                            <option value="">Sem perfil principal</option>
                            {ROLE_OPTIONS.map((role) => (
                              <option key={role.value} value={role.value}>{role.label}</option>
                            ))}
                          </select>
                        </label>
                        <label className="flex flex-col gap-1 text-[11px] font-medium uppercase tracking-wide text-mar-escuro/45">
                          Instituição primária
                          <select
                            name="instituicaoId"
                            defaultValue={user.institutionLinks.find((link) => link.isPrimary)?.instituicaoId ?? ""}
                            className="rounded-lg border border-mar-areia/40 bg-white px-2.5 py-1.5 text-xs text-mar-escuro outline-none transition-colors focus:border-mar-azul/40"
                          >
                            <option value="">Sem instituição primária</option>
                            {institutionOptions.map((institution) => (
                              <option key={institution.id} value={institution.id}>{institution.nome}</option>
                            ))}
                          </select>
                        </label>
                        <label className="flex flex-col gap-1 text-[11px] font-medium uppercase tracking-wide text-mar-escuro/45">
                          Função institucional
                          <input
                            name="funcaoInstitucional"
                            type="text"
                            defaultValue={user.institutionLinks.find((link) => link.isPrimary)?.funcaoInstitucional ?? ""}
                            className="rounded-lg border border-mar-areia/40 bg-white px-2.5 py-1.5 text-xs text-mar-escuro outline-none transition-colors focus:border-mar-azul/40"
                            placeholder="Ex.: coordenação pedagógica"
                          />
                        </label>
                        <button
                          type="submit"
                          className="inline-flex items-center gap-1 rounded-lg bg-mar-azul/10 px-2.5 py-1.5 text-xs font-medium text-mar-azul transition-colors hover:bg-mar-azul/20"
                        >
                          <Save className="h-3.5 w-3.5" />
                          Salvar acesso
                        </button>
                      </form>
                      <div className="border-t border-mar-areia/20 pt-2">
                        <div className="mb-1 text-[11px] font-medium uppercase tracking-wide text-mar-escuro/45">Vínculos institucionais</div>
                        <div className="space-y-2">
                          {user.institutionLinks.length > 0 ? user.institutionLinks.map((link) => (
                            <form key={`${user.id}-${link.instituicaoId}`} action={saveInstitutionLink} className="rounded-xl border border-mar-areia/20 bg-mar-creme/20 p-2">
                              <input type="hidden" name="userId" value={user.id} />
                              <input type="hidden" name="instituicaoId" value={link.instituicaoId} />
                              <input type="hidden" name="isPrimaryLink" value={link.isPrimary ? "true" : "false"} />
                              <div className="mb-2 flex items-center justify-between gap-2">
                                <span className={`badge ${link.isPrimary ? "bg-mar-verde/10 text-mar-verde" : "bg-mar-areia/20 text-mar-escuro/55"}`}>
                                  {link.instituicaoNome}
                                </span>
                                <div className="flex items-center gap-1">
                                  {!link.isPrimary && (
                                    <button
                                      type="submit"
                                      name="makePrimary"
                                      value="true"
                                      className="rounded-lg bg-mar-verde/10 px-2 py-1 text-[11px] font-medium text-mar-verde transition-colors hover:bg-mar-verde/20"
                                    >
                                      Tornar primária
                                    </button>
                                  )}
                                  <button
                                    type="submit"
                                    className="rounded-lg bg-mar-azul/10 px-2 py-1 text-[11px] font-medium text-mar-azul transition-colors hover:bg-mar-azul/20"
                                  >
                                    Salvar
                                  </button>
                                </div>
                              </div>
                              <label className="flex flex-col gap-1 text-[11px] font-medium uppercase tracking-wide text-mar-escuro/45">
                                Função institucional
                                <input
                                  name="funcaoInstitucional"
                                  type="text"
                                  defaultValue={link.funcaoInstitucional ?? ""}
                                  className="rounded-lg border border-mar-areia/40 bg-white px-2.5 py-1.5 text-xs text-mar-escuro outline-none transition-colors focus:border-mar-azul/40"
                                  placeholder="Ex.: articulação territorial"
                                />
                              </label>
                            </form>
                          )) : user.profileInstitutionName ? (
                            <div className="pt-1 text-[11px] text-mar-escuro/45 inline-flex items-center gap-1">
                              <Building2 className="h-3.5 w-3.5" />
                              {user.profileInstitutionName}
                            </div>
                          ) : (
                            <span className="text-[11px] text-mar-escuro/35">Sem vínculos institucionais</span>
                          )}
                        </div>
                        <form action={saveInstitutionLink} className="mt-2 flex flex-col gap-2 rounded-xl border border-dashed border-mar-areia/30 p-2">
                          <input type="hidden" name="userId" value={user.id} />
                          <input type="hidden" name="isPrimaryLink" value="false" />
                          <select
                            name="instituicaoId"
                            defaultValue=""
                            className="rounded-lg border border-mar-areia/40 bg-white px-2.5 py-1.5 text-xs text-mar-escuro outline-none transition-colors focus:border-mar-azul/40"
                          >
                            <option value="">Adicionar vínculo institucional</option>
                            {institutionOptions.filter((institution) => !user.institutionLinks.some((link) => link.instituicaoId === institution.id)).map((institution) => (
                              <option key={`${user.id}-institution-${institution.id}`} value={institution.id}>{institution.nome}</option>
                            ))}
                          </select>
                          <input
                            name="funcaoInstitucional"
                            type="text"
                            className="rounded-lg border border-mar-areia/40 bg-white px-2.5 py-1.5 text-xs text-mar-escuro outline-none transition-colors focus:border-mar-azul/40"
                            placeholder="Função no vínculo secundário"
                          />
                          <button
                            type="submit"
                            className="self-start rounded-lg bg-mar-cobre/10 px-2.5 py-1.5 text-xs font-medium text-mar-cobre transition-colors hover:bg-mar-cobre/20"
                          >
                            Adicionar vínculo
                          </button>
                        </form>
                        {user.institutionLinks.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {user.institutionLinks.map((link) => (
                              <form key={`${user.id}-${link.instituicaoId}-remove`} action={removeInstitutionLink}>
                                <input type="hidden" name="userId" value={user.id} />
                                <input type="hidden" name="instituicaoId" value={link.instituicaoId} />
                                <button
                                  type="submit"
                                  className="badge bg-red-100 text-red-600 hover:bg-red-200"
                                >
                                  Remover {link.instituicaoNome}
                                </button>
                              </form>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="border-t border-mar-areia/20 pt-2">
                        <div className="mb-1 text-[11px] font-medium uppercase tracking-wide text-mar-escuro/45">Papéis adicionais</div>
                        <div className="flex flex-wrap gap-1">
                          {user.roleAssignments.filter((assignment) => !assignment.isPrimary).length > 0 ? user.roleAssignments.filter((assignment) => !assignment.isPrimary).map((assignment) => (
                            <form key={`${user.id}-${assignment.slug}`} action={removeSecondaryRole}>
                              <input type="hidden" name="userId" value={user.id} />
                              <input type="hidden" name="roleSlug" value={assignment.slug} />
                              <button type="submit" className="badge bg-mar-cobre/10 text-mar-cobre hover:bg-red-100 hover:text-red-600">
                                {assignment.slug} ×
                              </button>
                            </form>
                          )) : (
                            <span className="text-[11px] text-mar-escuro/35">Sem papéis adicionais</span>
                          )}
                        </div>
                        <form action={addSecondaryRole} className="mt-2 flex items-center gap-2">
                          <input type="hidden" name="userId" value={user.id} />
                          <select
                            name="roleSlug"
                            defaultValue=""
                            className="rounded-lg border border-mar-areia/40 bg-white px-2.5 py-1.5 text-xs text-mar-escuro outline-none transition-colors focus:border-mar-azul/40"
                          >
                            <option value="">Adicionar papel secundário</option>
                            {ROLE_OPTIONS.filter((role) => !user.roleSlugs.includes(role.value)).map((role) => (
                              <option key={`${user.id}-${role.value}`} value={role.value}>{role.label}</option>
                            ))}
                          </select>
                          <button
                            type="submit"
                            className="rounded-lg bg-mar-cobre/10 px-2.5 py-1.5 text-xs font-medium text-mar-cobre transition-colors hover:bg-mar-cobre/20"
                          >
                            Adicionar
                          </button>
                        </form>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge ${statusTone[user.status] ?? "bg-mar-areia/20 text-mar-escuro/50"}`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-mar-escuro/45">
                    {user.lastLoginAt ? formatDate(user.lastLoginAt) : "Nunca"}
                  </td>
                  <td className="px-4 py-3 text-xs text-mar-escuro/45">
                    {formatDate(user.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <form action={toggleUserStatus}>
                      <input type="hidden" name="userId" value={user.id} />
                      <input type="hidden" name="newStatus" value={user.status === "ativo" ? "bloqueado" : "ativo"} />
                      <button
                        type="submit"
                        className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                          user.status === "ativo"
                            ? "text-red-500 hover:bg-red-50"
                            : "text-mar-verde hover:bg-mar-verde/10"
                        }`}
                      >
                        {user.status === "ativo"
                          ? <><UserX className="h-3.5 w-3.5" /> Bloquear</>
                          : <><UserCheck className="h-3.5 w-3.5" /> Ativar</>
                        }
                      </button>
                    </form>
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

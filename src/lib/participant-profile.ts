import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { profiles, roles, userRoles, users } from "@/lib/schema";

export const participationProfileOptions = [
  {
    slug: "estudante",
    title: "Estudante",
    summary: "Para quem vai explorar conteúdos, participar de atividades, fóruns e trilhas de aprendizagem.",
    highlight: "Explorar acervo, agenda e conversas do projeto.",
  },
  {
    slug: "professor",
    title: "Professor",
    summary: "Para educadores que desejam articular o acervo com práticas pedagógicas e percursos formativos.",
    highlight: "Organizar uso pedagógico do conteúdo e da agenda.",
  },
  {
    slug: "equipe_comunicacao",
    title: "Equipe de Comunicação",
    summary: "Para quem atua com blog, agenda, difusão pública, campanhas e presença institucional.",
    highlight: "Cuidar de publicações, circulação e narrativa do projeto.",
  },
  {
    slug: "gestor",
    title: "Gestor",
    summary: "Para coordenação institucional, acompanhamento de indicadores e articulação das frentes do projeto.",
    highlight: "Acompanhar estratégia, produção e visão institucional.",
  },
  {
    slug: "bolsista",
    title: "Bolsista",
    summary: "Para atuação de apoio em pesquisa, execução e acompanhamento de entregas do projeto.",
    highlight: "Registrar andamento e colaborar com tarefas do projeto.",
  },
  {
    slug: "equipe_producao",
    title: "Equipe de Produção",
    summary: "Para quem opera ações, logística, mobilização territorial e execução do cotidiano do projeto.",
    highlight: "Acompanhar tarefas, agenda e frentes operacionais.",
  },
  {
    slug: "voluntario",
    title: "Voluntário",
    summary: "Para participantes que apoiam ações do Museu do Mar em rede, campo e presença comunitária.",
    highlight: "Contribuir com ações e acompanhar tarefas de apoio.",
  },
  {
    slug: "apoiador",
    title: "Apoiador",
    summary: "Para parceiros e apoiadores que acompanham impacto, articulações e fortalecimento institucional.",
    highlight: "Acompanhar visão institucional e rede de apoio.",
  },
] as const;

export type ParticipationProfileSlug = (typeof participationProfileOptions)[number]["slug"];

export const selfServiceParticipationProfileSlugs = ["estudante", "voluntario", "apoiador"] as const;

export const participationProfileOptionsBySlug = Object.fromEntries(
  participationProfileOptions.map((option) => [option.slug, option]),
) as Record<ParticipationProfileSlug, (typeof participationProfileOptions)[number]>;

export function isParticipationProfileSlug(value: string): value is ParticipationProfileSlug {
  return value in participationProfileOptionsBySlug;
}

export function getParticipationProfileTitle(role: string | null | undefined) {
  if (!role || !isParticipationProfileSlug(role)) return null;
  return participationProfileOptionsBySlug[role].title;
}

export function isSelfServiceParticipationProfileSlug(value: string): value is (typeof selfServiceParticipationProfileSlugs)[number] {
  return selfServiceParticipationProfileSlugs.includes(value as (typeof selfServiceParticipationProfileSlugs)[number]);
}

export function getAvailableParticipationProfileOptions(currentRoles: string[]) {
  const currentRoleSet = new Set(currentRoles);

  return participationProfileOptions.filter(
    (option) =>
      isSelfServiceParticipationProfileSlug(option.slug) || currentRoleSet.has(option.slug),
  );
}

type SyncParticipantProfileInput = {
  userId: string;
  selectedRole: ParticipationProfileSlug;
  userName?: string | null;
  displayName?: string | null;
  institutionName?: string | null;
  schoolName?: string | null;
  city?: string | null;
  state?: string | null;
};

export async function syncParticipantProfile(input: SyncParticipantProfileInput) {
  const {
    userId,
    selectedRole,
    userName = null,
    displayName = null,
    institutionName = null,
    schoolName = null,
    city = null,
    state = null,
  } = input;

  const [existingProfile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.userId, userId))
    .limit(1);

  const resolvedDisplayName = displayName?.trim() || existingProfile?.displayName || userName || null;

  const assignedRoleRows = await db
    .select({ slug: roles.slug })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(eq(userRoles.userId, userId));

  const assignedRoleSlugs = assignedRoleRows.map((row) => row.slug);
  const canSelectRole = isSelfServiceParticipationProfileSlug(selectedRole) || assignedRoleSlugs.includes(selectedRole);

  if (!canSelectRole) {
    throw new Error("forbidden_profile_selection");
  }

  await db
    .update(users)
    .set({ primaryRole: selectedRole })
    .where(eq(users.id, userId));

  if (existingProfile) {
    await db
      .update(profiles)
      .set({
        profileType: selectedRole,
        displayName: resolvedDisplayName,
        institutionName: institutionName?.trim() || existingProfile.institutionName || null,
        schoolName: schoolName?.trim() || existingProfile.schoolName || null,
        city: city?.trim() || existingProfile.city || null,
        state: state?.trim() || existingProfile.state || null,
        updatedAt: new Date(),
      })
      .where(eq(profiles.userId, userId));
  } else {
    await db.insert(profiles).values({
      id: crypto.randomUUID(),
      userId,
      displayName: resolvedDisplayName,
      institutionName: institutionName?.trim() || null,
      schoolName: schoolName?.trim() || null,
      city: city?.trim() || null,
      state: state?.trim() || null,
      profileType: selectedRole,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  await db
    .update(userRoles)
    .set({ isPrimary: false })
    .where(eq(userRoles.userId, userId));

  const [roleRow] = await db
    .select({ id: roles.id })
    .from(roles)
    .where(eq(roles.slug, selectedRole))
    .limit(1);

  if (!roleRow) {
    return;
  }

  const [existingUserRole] = await db
    .select({ id: userRoles.id })
    .from(userRoles)
    .where(and(eq(userRoles.userId, userId), eq(userRoles.roleId, roleRow.id)))
    .limit(1);

  if (existingUserRole) {
    await db
      .update(userRoles)
      .set({ isPrimary: true })
      .where(eq(userRoles.id, existingUserRole.id));

    return;
  }

  await db.insert(userRoles).values({
    id: crypto.randomUUID(),
    userId,
    roleId: roleRow.id,
    isPrimary: true,
    assignedBy: null,
    createdAt: new Date(),
  });
}
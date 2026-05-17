import type { ParticipationProfileSlug } from "@/lib/participant-profile";

/**
 * Portais de entrada usados pela landing e pelo onboarding.
 * Regra: nao inventar slugs fora desta lista (mantem governanca de URLs e assets).
 */
export const entryPortals = {
  visitantes: {
    slug: "visitantes",
    title: "Visitantes",
    summary: "Descubra o acervo, as historias e o territorio do Perocao. Sem login.",
    ctaLabel: "Explorar como visitante",
    profiles: [] as ParticipationProfileSlug[],
  },
  participantes: {
    slug: "participantes",
    title: "Participantes",
    summary: "Estudantes, professores e voluntarios em trilhas e missoes no territorio.",
    ctaLabel: "Entrar para participar",
    profiles: ["estudante", "professor", "voluntario"] as ParticipationProfileSlug[],
  },
  colaboradores: {
    slug: "colaboradores",
    title: "Colaboradores",
    summary: "Bastidores: comunicacao, producao, registro, tecnologia e apoio operacional.",
    ctaLabel: "Quero colaborar",
    profiles: ["equipe_comunicacao", "equipe_producao", "bolsista", "voluntario"] as ParticipationProfileSlug[],
  },
  apoiadores: {
    slug: "apoiadores",
    title: "Apoiadores",
    summary: "Rede de apoio e parceria para continuidade e impacto social do projeto.",
    ctaLabel: "Apoiar o projeto",
    profiles: ["apoiador", "gestor"] as ParticipationProfileSlug[],
  },
  // Mantido para rotas internas e operacao; nao aparece como card na landing.
  implementacao: {
    slug: "implementacao",
    title: "Equipe de Implementacao",
    summary:
      "Frente operacional do projeto: comunicacao, producao, bolsistas e coordenacao institucional.",
    ctaLabel: "Entrar como equipe",
    profiles: ["equipe_comunicacao", "equipe_producao", "bolsista", "gestor"] as ParticipationProfileSlug[],
  },
} as const;

export type EntryPortalSlug = keyof typeof entryPortals;

export function isEntryPortalSlug(value: string | null | undefined): value is EntryPortalSlug {
  if (!value) return false;
  return value in entryPortals;
}

export function getEntryPortal(value: string | null | undefined) {
  if (!isEntryPortalSlug(value)) return null;
  return entryPortals[value];
}

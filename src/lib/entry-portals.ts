import type { ParticipationProfileSlug } from "@/lib/participant-profile";

export const entryPortals = {
  implementacao: {
    slug: "implementacao",
    title: "Equipe de Implementacao",
    summary:
      "Frente operacional do projeto: comunicacao, producao, bolsistas e coordenacao institucional.",
    ctaLabel: "Entrar como equipe",
    profiles: ["equipe_comunicacao", "equipe_producao", "bolsista", "gestor"] as ParticipationProfileSlug[],
  },
  participantes: {
    slug: "participantes",
    title: "Participantes",
    summary:
      "Jornada de estudantes, professores e voluntarios que atuam nas atividades, trilhas e territorio.",
    ctaLabel: "Entrar para participar",
    profiles: ["estudante", "professor", "voluntario"] as ParticipationProfileSlug[],
  },
  apoiadores: {
    slug: "apoiadores",
    title: "Apoiadores",
    summary:
      "Parceiros da sociedade e da academia que acompanham impacto, memoria e fortalecimento institucional.",
    ctaLabel: "Entrar como apoiador",
    profiles: ["apoiador", "gestor"] as ParticipationProfileSlug[],
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

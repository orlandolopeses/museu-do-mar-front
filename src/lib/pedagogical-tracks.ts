import { asc, and, eq } from "drizzle-orm";
import { db } from "./db";
import { trilhasPedagogicas } from "./schema";

type TrackLink = {
  label: string;
  href: string;
};

type PedagogicalTrack = {
  id: string;
  title: string;
  description: string;
  highlight: string;
  steps: string[];
  links: TrackLink[];
};

type TrackContext = {
  hasInstitutions: boolean;
  hasTurmas: boolean;
  hasEvents: boolean;
};

export type TeacherTrackContext = TrackContext;
export type StudentTrackContext = TrackContext;

async function fetchTracks(
  audience: "professor" | "estudante",
  context: TrackContext,
): Promise<PedagogicalTrack[]> {
  const rows = await db
    .select()
    .from(trilhasPedagogicas)
    .where(and(eq(trilhasPedagogicas.audience, audience), eq(trilhasPedagogicas.active, true)))
    .orderBy(asc(trilhasPedagogicas.sortOrder));

  return rows.map((row) => {
    const contextValue = context[row.contextKey as keyof TrackContext];
    return {
      id: row.slug,
      title: row.title,
      description: row.description,
      highlight: contextValue ? row.highlightPositive : row.highlightEmpty,
      steps: row.steps as string[],
      links: row.links as TrackLink[],
    };
  });
}

export function getTeacherPedagogicalTracks(context: TeacherTrackContext): Promise<PedagogicalTrack[]> {
  return fetchTracks("professor", context);
}

export function getStudentPedagogicalTracks(context: StudentTrackContext): Promise<PedagogicalTrack[]> {
  return fetchTracks("estudante", context);
}

import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { instituicoes, userInstituicoes } from "@/lib/schema";

export type AccessibleInstitution = {
  id: string;
  nome: string;
  tipo: string | null;
  cidade: string | null;
  estado: string | null;
  responsavelNome: string | null;
  createdAt: Date;
  isPrimary: boolean;
  funcaoInstitucional: string | null;
};

export async function getAccessibleInstitutions(userId: string, canViewAll: boolean) {
  if (canViewAll) {
    return db
      .select({
        id: instituicoes.id,
        nome: instituicoes.nome,
        tipo: instituicoes.tipo,
        cidade: instituicoes.cidade,
        estado: instituicoes.estado,
        responsavelNome: instituicoes.responsavelNome,
        createdAt: instituicoes.createdAt,
        isPrimary: sql<boolean>`false`,
        funcaoInstitucional: sql<string | null>`null`,
      })
      .from(instituicoes)
      .where(eq(instituicoes.ativo, true))
      .orderBy(instituicoes.nome);
  }

  return db
    .select({
      id: instituicoes.id,
      nome: instituicoes.nome,
      tipo: instituicoes.tipo,
      cidade: instituicoes.cidade,
      estado: instituicoes.estado,
      responsavelNome: instituicoes.responsavelNome,
      createdAt: instituicoes.createdAt,
      isPrimary: userInstituicoes.isPrimary,
      funcaoInstitucional: userInstituicoes.funcaoInstitucional,
    })
    .from(userInstituicoes)
    .innerJoin(instituicoes, eq(userInstituicoes.instituicaoId, instituicoes.id))
    .where(and(eq(userInstituicoes.userId, userId), eq(instituicoes.ativo, true)))
    .orderBy(desc(userInstituicoes.isPrimary), instituicoes.nome);
}

export async function getAccessibleInstitutionIds(userId: string, canViewAll: boolean) {
  const institutions = await getAccessibleInstitutions(userId, canViewAll);
  return institutions.map((institution) => institution.id);
}
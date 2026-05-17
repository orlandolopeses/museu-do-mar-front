import { and, desc, eq, inArray } from "drizzle-orm";
import { getActivityUrgency } from "@/lib/activity-urgency";
import { db } from "@/lib/db";
import { getAccessibleInstitutions } from "@/lib/institution-access";
import { atividadesTurma, turmas, userInstituicoes } from "@/lib/schema";
import { getSecondaryJourneyTrackingOverview } from "@/lib/secondary-journey-tracking";

const defaultWindowDays = 90;

function getWindowStart(days: number) {
  return new Date(Date.now() - (days * 24 * 60 * 60 * 1000));
}

export async function getEducationalManagerSnapshot(options: {
  userId: string;
  canViewAllInstitutions: boolean;
  windowDays?: number;
}) {
  const windowDays = options.windowDays ?? defaultWindowDays;
  const windowStart = getWindowStart(windowDays);
  const institutions = await getAccessibleInstitutions(options.userId, options.canViewAllInstitutions);
  const institutionIds = institutions.map((institution) => institution.id);

  if (institutionIds.length === 0) {
    return {
      windowDays,
      institutionsCount: 0,
      turmasCount: 0,
      urgencySummary: { alta: 0, media: 0, baixa: 0 },
      priorityTurma: null,
      priorityInstitution: null,
      secondaryJourneyStatusSummary: {
        aberto: 0,
        em_andamento: 0,
        concluido: 0,
      },
      recentSecondaryJourneyTrackings: [],
      attentionPoints: [
        "Nenhuma instituição acessível foi encontrada para este perfil. Revise vínculos institucionais antes de coordenar a rede.",
      ],
    };
  }

  const turmaRows = await db
    .select({
      id: turmas.id,
      nome: turmas.nome,
      instituicaoId: turmas.instituicaoId,
    })
    .from(turmas)
    .where(and(eq(turmas.ativo, true), inArray(turmas.instituicaoId, institutionIds)))
    .orderBy(desc(turmas.createdAt));

  const turmaIds = turmaRows.map((turma) => turma.id);
  const activityRows = turmaIds.length > 0
    ? await db
        .select({
          id: atividadesTurma.id,
          turmaId: atividadesTurma.turmaId,
          status: atividadesTurma.status,
          updatedAt: atividadesTurma.updatedAt,
          proximoPasso: atividadesTurma.proximoPasso,
        })
        .from(atividadesTurma)
        .where(inArray(atividadesTurma.turmaId, turmaIds))
        .orderBy(desc(atividadesTurma.updatedAt))
    : [];

  const scopedActivities = activityRows
    .filter((activity) => activity.updatedAt >= windowStart)
    .map((activity) => ({
      ...activity,
      urgency: getActivityUrgency(activity),
    }));

  const urgencySummary = {
    alta: scopedActivities.filter((activity) => activity.urgency.level === "alta").length,
    media: scopedActivities.filter((activity) => activity.urgency.level === "media").length,
    baixa: scopedActivities.filter((activity) => activity.urgency.level === "baixa").length,
  };

  const turmaPriority = turmaRows
    .map((turma) => {
      const turmaActivities = scopedActivities.filter((activity) => activity.turmaId === turma.id);
      return {
        id: turma.id,
        nome: turma.nome,
        instituicaoId: turma.instituicaoId,
        highPriorityCount: turmaActivities.filter((activity) => activity.urgency.level === "alta").length,
        attentionCount: turmaActivities.filter((activity) => activity.urgency.level === "media").length,
      };
    })
    .sort((left, right) => {
      if (right.highPriorityCount !== left.highPriorityCount) {
        return right.highPriorityCount - left.highPriorityCount;
      }

      return right.attentionCount - left.attentionCount;
    });

  const institutionPriority = institutions
    .map((institution) => {
      const institutionTurmaIds = new Set(
        turmaRows.filter((turma) => turma.instituicaoId === institution.id).map((turma) => turma.id),
      );
      const institutionActivities = scopedActivities.filter((activity) => institutionTurmaIds.has(activity.turmaId));

      return {
        id: institution.id,
        nome: institution.nome,
        highPriorityCount: institutionActivities.filter((activity) => activity.urgency.level === "alta").length,
        attentionCount: institutionActivities.filter((activity) => activity.urgency.level === "media").length,
      };
    })
    .sort((left, right) => {
      if (right.highPriorityCount !== left.highPriorityCount) {
        return right.highPriorityCount - left.highPriorityCount;
      }

      return right.attentionCount - left.attentionCount;
    });

  const institutionUserLinks = await db
    .select({ userId: userInstituicoes.userId })
    .from(userInstituicoes)
    .where(inArray(userInstituicoes.instituicaoId, institutionIds));

  const scopedUserIds = [...new Set(institutionUserLinks.map((link) => link.userId))];
  const secondaryJourneyOverview = await getSecondaryJourneyTrackingOverview({
    userIds: scopedUserIds,
    institutionIds,
    updatedSince: windowStart,
  });

  const priorityTurma = turmaPriority.find((turma) => turma.highPriorityCount > 0) ?? turmaPriority[0] ?? null;
  const priorityInstitution = institutionPriority.find((institution) => institution.highPriorityCount > 0) ?? institutionPriority[0] ?? null;
  const attentionPoints: string[] = [];

  if (urgencySummary.alta > 0) {
    attentionPoints.push(
      `${urgencySummary.alta} atividade(s) em alta prioridade pedem retomada explícita nos próximos ${windowDays} dias.`,
    );
  }

  if (secondaryJourneyOverview.statusSummary.aberto > 0) {
    attentionPoints.push(
      `${secondaryJourneyOverview.statusSummary.aberto} checkpoint(s) de jornadas secundárias seguem abertos e precisam de encaminhamento institucional.`,
    );
  }

  if (priorityTurma?.highPriorityCount) {
    attentionPoints.push(
      `${priorityTurma.nome} concentra o maior volume de urgência pedagógica do recorte atual.`,
    );
  }

  if (attentionPoints.length === 0) {
    attentionPoints.push(
      `O recorte dos últimos ${windowDays} dias indica cadência estável entre turmas e checkpoints da rede.`,
    );
  }

  return {
    windowDays,
    institutionsCount: institutions.length,
    turmasCount: turmaRows.length,
    urgencySummary,
    priorityTurma: priorityTurma
      ? {
          id: priorityTurma.id,
          nome: priorityTurma.nome,
          highPriorityCount: priorityTurma.highPriorityCount,
        }
      : null,
    priorityInstitution: priorityInstitution
      ? {
          id: priorityInstitution.id,
          nome: priorityInstitution.nome,
          highPriorityCount: priorityInstitution.highPriorityCount,
        }
      : null,
    secondaryJourneyStatusSummary: secondaryJourneyOverview.statusSummary,
    recentSecondaryJourneyTrackings: secondaryJourneyOverview.recentTrackings.map((tracking) => ({
      id: tracking.id,
      titulo: tracking.titulo,
      status: tracking.status,
      origin: tracking.origin,
      userName: tracking.userName,
      instituicoes: tracking.instituicoes,
    })),
    attentionPoints: attentionPoints.slice(0, 3),
  };
}

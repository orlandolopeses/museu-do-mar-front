export type ActivityUrgencyLevel = "alta" | "media" | "baixa";

export type ActivityUrgency = {
  level: ActivityUrgencyLevel;
  label: string;
  reason: string;
};

function getDaysSince(date: Date) {
  const diff = Date.now() - date.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export function getActivityUrgency(activity: {
  status: "planejada" | "em_andamento" | "concluida";
  updatedAt: Date;
  proximoPasso: string | null;
}): ActivityUrgency {
  if (activity.status === "concluida") {
    return { level: "baixa", label: "Concluída", reason: "atividade já concluída" };
  }

  const daysSinceUpdate = getDaysSince(activity.updatedAt);
  const hasNextStep = Boolean(activity.proximoPasso?.trim());

  if (!hasNextStep && daysSinceUpdate >= 5) {
    return { level: "alta", label: "Alta prioridade", reason: "sem próximo passo definido" };
  }

  if (activity.status === "planejada" && daysSinceUpdate >= 14) {
    return { level: "alta", label: "Alta prioridade", reason: "planejamento parado há mais de 14 dias" };
  }

  if (activity.status === "em_andamento" && daysSinceUpdate >= 21) {
    return { level: "alta", label: "Alta prioridade", reason: "execução sem atualização há mais de 21 dias" };
  }

  if ((activity.status === "planejada" && daysSinceUpdate >= 7) || (activity.status === "em_andamento" && daysSinceUpdate >= 10)) {
    return { level: "media", label: "Atenção", reason: "acompanhar evolução da atividade" };
  }

  return { level: "baixa", label: "Em ritmo adequado", reason: "atividade acompanhada recentemente" };
}

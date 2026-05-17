import assert from "node:assert/strict";
import test from "node:test";
import { getActivityUrgency } from "./activity-urgency.ts";

function daysAgo(days: number) {
  return new Date(Date.now() - (days * 24 * 60 * 60 * 1000));
}

test("getActivityUrgency marca alta prioridade sem proximo passo", () => {
  const urgency = getActivityUrgency({
    status: "planejada",
    updatedAt: daysAgo(6),
    proximoPasso: null,
  });

  assert.equal(urgency.level, "alta");
});

test("getActivityUrgency mantem ritmo adequado com acompanhamento recente", () => {
  const urgency = getActivityUrgency({
    status: "em_andamento",
    updatedAt: daysAgo(2),
    proximoPasso: "Revisar devolutiva com a turma",
  });

  assert.equal(urgency.level, "baixa");
});

"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireStudentAccess } from "@/lib/access";
import { db } from "@/lib/db";
import { resolveStudentActivityAccess } from "@/lib/education-access";
import { atividadesTurma } from "@/lib/schema";

export async function markActivityStatus(formData: FormData) {
  const activityId = formData.get("activityId") as string | null;
  const newStatus = formData.get("newStatus") as string | null;

  if (!activityId || (newStatus !== "em_andamento" && newStatus !== "concluida")) {
    throw new Error("Dados inválidos.");
  }

  const session = await requireStudentAccess();

  const { activity, enrollment } = await resolveStudentActivityAccess(session.user.id, activityId);

  if (!activity) {
    throw new Error("Atividade não encontrada.");
  }

  // Impede regredir status: concluida não pode voltar
  if (activity.status === "concluida") {
    throw new Error("Atividade já concluída.");
  }

  if (!enrollment) {
    throw new Error("Você não está matriculado nesta turma.");
  }

  await db
    .update(atividadesTurma)
    .set({ status: newStatus, updatedAt: new Date() })
    .where(eq(atividadesTurma.id, activityId));

  revalidatePath("/app/estudante");
}

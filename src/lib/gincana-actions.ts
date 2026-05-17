"use server";

import { z } from "zod";
import { db } from "./db";
import { gincanaCheckins, matriculasTurma } from "./schema";
import { auth } from "./auth";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";

const checkInSchema = z.object({
  gincanaId: z.string().min(1).max(50),
  stationId: z.string().min(1).max(100),
  turmaId: z.string().min(1).max(36).optional().nullable(),
  lat: z.string().optional().nullable(),
  lng: z.string().optional().nullable(),
});

export async function submitCheckIn(formData: FormData) {
  const session = await auth();
  
  if (!session?.user?.id) {
    throw new Error("Usuário não autenticado");
  }

  const userId = session.user.id;
  const rawData = {
    gincanaId: formData.get("gincanaId"),
    stationId: formData.get("stationId"),
    turmaId: formData.get("turmaId"),
    lat: formData.get("lat"),
    lng: formData.get("lng"),
  };

  const parsed = checkInSchema.safeParse(rawData);
  
  if (!parsed.success) {
    throw new Error("Dados de check-in inválidos");
  }

  const { gincanaId, stationId, turmaId, lat, lng } = parsed.data;

  let finalTurmaId = turmaId;
  if (!finalTurmaId) {
    const [enrollment] = await db
      .select({ turmaId: matriculasTurma.turmaId })
      .from(matriculasTurma)
      .where(and(eq(matriculasTurma.userId, userId), eq(matriculasTurma.status, "ativo")))
      .limit(1);
    finalTurmaId = enrollment?.turmaId || null;
  }

  // Persistir no banco (Nota: a tabela ainda não possui coluna gincanaId, 
  // usamos stationId que deve ser único por território)
  await db.insert(gincanaCheckins).values({
    id: crypto.randomUUID(),
    userId,
    stationId,
    turmaId: finalTurmaId,
    lat,
    lng,
    createdAt: new Date(),
  });

  // Revalidar caminhos relevantes
  revalidatePath("/app/professor");
  revalidatePath(`/participar/gincanas/${gincanaId}`);
  
  return { success: true };
}

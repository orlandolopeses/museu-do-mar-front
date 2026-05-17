"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireVolunteerAccess } from "@/lib/access";
import { db } from "@/lib/db";
import { acompanhamentosJornada } from "@/lib/schema";
import { isSecondaryJourneyTrackingStatus } from "@/lib/secondary-journey-tracking";
import { z } from "zod";

const updateVoluntarioTrackingSchema = z.object({
  trackingId: z.string().trim().min(1).max(36),
  titulo: z.string().trim().min(2).max(255),
  resumo: z.string().trim().min(10).max(3000),
  proximoPasso: z.string().trim().max(2000).optional().or(z.literal("")),
  apoioNecessario: z.string().trim().max(2000).optional().or(z.literal("")),
  statusValue: z.enum(["aberto", "em_andamento", "concluido"]),
});

function clampText(value: FormDataEntryValue | null, maxLength: number) {
  return String(value ?? "").trim().slice(0, maxLength);
}

export async function updateVoluntarioTracking(formData: FormData) {
  const session = await requireVolunteerAccess();
  const trackingId = clampText(formData.get("trackingId"), 36);

  if (!trackingId) {
    redirect("/app/voluntario");
  }

  const parsed = updateVoluntarioTrackingSchema.safeParse({
    trackingId,
    titulo: clampText(formData.get("titulo"), 255),
    resumo: clampText(formData.get("resumo"), 3000),
    proximoPasso: clampText(formData.get("proximoPasso"), 2000),
    apoioNecessario: clampText(formData.get("apoioNecessario"), 2000),
    statusValue: String(formData.get("status") ?? "aberto").trim(),
  });

  if (!parsed.success) {
    redirect(`/app/voluntario/tracking/${trackingId}?update=invalid`);
  }

  const { titulo, resumo, proximoPasso, apoioNecessario, statusValue } = parsed.data;

  if (!isSecondaryJourneyTrackingStatus(statusValue)) {
    redirect(`/app/voluntario/tracking/${trackingId}?update=invalid`);
  }

  const updatedRows = await db
    .update(acompanhamentosJornada)
    .set({
      titulo,
      resumo,
      proximoPasso: proximoPasso || null,
      apoioNecessario: apoioNecessario || null,
      status: statusValue,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(acompanhamentosJornada.id, trackingId),
        eq(acompanhamentosJornada.origem, "voluntario"),
        eq(acompanhamentosJornada.userId, session.user.id),
      ),
    )
    .returning({ id: acompanhamentosJornada.id });

  if (updatedRows.length === 0) {
    redirect("/app/voluntario?tracking=not-found");
  }

  revalidatePath("/app/voluntario");
  revalidatePath(`/app/voluntario/tracking/${trackingId}`);
  redirect(`/app/voluntario/tracking/${trackingId}?update=success`);
}

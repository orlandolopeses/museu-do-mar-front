"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireProductionAccess, requireScholarAccess, requireVolunteerAccess } from "@/lib/access";
import { acompanhamentosJornada, eventos, forumTopicos } from "@/lib/schema";
import {
  getSecondaryJourneyPath,
  isSecondaryJourneyOrigin,
  isSecondaryJourneyTrackingStatus,
  type SecondaryJourneyOrigin,
} from "@/lib/secondary-journey-tracking";
import { z } from "zod";

const secondaryJourneyTrackingSchema = z.object({
  titulo: z.string().trim().min(2).max(255),
  resumo: z.string().trim().min(10).max(3000),
  proximoPasso: z.string().trim().max(2000).optional().or(z.literal("")),
  apoioNecessario: z.string().trim().max(2000).optional().or(z.literal("")),
  statusValue: z.enum(["aberto", "em_andamento", "concluido"]),
  referenciaEventoId: z.string().trim().max(36).optional().or(z.literal("")),
  referenciaTopicoId: z.string().trim().max(36).optional().or(z.literal("")),
});

function clampText(value: FormDataEntryValue | null, maxLength: number) {
  return String(value ?? "").trim().slice(0, maxLength);
}

async function validateOptionalReferences(options: {
  referenciaEventoId: string;
  referenciaTopicoId: string;
}) {
  const { referenciaEventoId, referenciaTopicoId } = options;

  if (referenciaEventoId) {
    const [event] = await db.select({ id: eventos.id }).from(eventos).where(eq(eventos.id, referenciaEventoId)).limit(1);
    if (!event) {
      return false;
    }
  }

  if (referenciaTopicoId) {
    const [topic] = await db.select({ id: forumTopicos.id }).from(forumTopicos).where(eq(forumTopicos.id, referenciaTopicoId)).limit(1);
    if (!topic) {
      return false;
    }
  }

  return true;
}

async function requireOriginAccess(origin: SecondaryJourneyOrigin) {
  switch (origin) {
    case "bolsista":
      return requireScholarAccess();
    case "voluntario":
      return requireVolunteerAccess();
    case "equipe-producao":
      return requireProductionAccess();
  }
}

export async function createSecondaryJourneyTracking(formData: FormData) {
  const originValue = String(formData.get("origin") ?? "").trim();

  if (!isSecondaryJourneyOrigin(originValue)) {
    redirect("/app/perfil");
  }

  const origin = originValue;
  const redirectPath = getSecondaryJourneyPath(origin);
  const parsed = secondaryJourneyTrackingSchema.safeParse({
    titulo: clampText(formData.get("titulo"), 255),
    resumo: clampText(formData.get("resumo"), 3000),
    proximoPasso: clampText(formData.get("proximoPasso"), 2000),
    apoioNecessario: clampText(formData.get("apoioNecessario"), 2000),
    statusValue: String(formData.get("status") ?? "aberto").trim(),
    referenciaEventoId: clampText(formData.get("referenciaEventoId"), 36),
    referenciaTopicoId: clampText(formData.get("referenciaTopicoId"), 36),
  });

  if (!parsed.success) {
    redirect(`${redirectPath}?tracking=invalid`);
  }

  const {
    titulo,
    resumo,
    proximoPasso,
    apoioNecessario,
    statusValue,
    referenciaEventoId: parsedReferenciaEventoId,
    referenciaTopicoId: parsedReferenciaTopicoId,
  } = parsed.data;
  const referenciaEventoId = parsedReferenciaEventoId ?? "";
  const referenciaTopicoId = parsedReferenciaTopicoId ?? "";

  if (!isSecondaryJourneyTrackingStatus(statusValue)) {
    redirect(`${redirectPath}?tracking=invalid`);
  }

  if (!(await validateOptionalReferences({ referenciaEventoId, referenciaTopicoId }))) {
    redirect(`${redirectPath}?tracking=invalid`);
  }

  const session = await requireOriginAccess(origin);

  await db.insert(acompanhamentosJornada).values({
    id: crypto.randomUUID(),
    origem: origin,
    userId: session.user.id,
    titulo,
    resumo,
    proximoPasso: proximoPasso || null,
    apoioNecessario: apoioNecessario || null,
    status: statusValue,
    referenciaEventoId: referenciaEventoId || null,
    referenciaTopicoId: referenciaTopicoId || null,
  });

  revalidatePath(redirectPath);
  redirect(`${redirectPath}?tracking=created`);
}

export async function updateSecondaryJourneyTracking(formData: FormData) {
  const originValue = String(formData.get("origin") ?? "").trim();

  if (!isSecondaryJourneyOrigin(originValue)) {
    redirect("/app/perfil");
  }

  const origin = originValue;
  const redirectPath = getSecondaryJourneyPath(origin);
  const trackingId = clampText(formData.get("trackingId"), 36);
  const parsed = secondaryJourneyTrackingSchema.safeParse({
    titulo: clampText(formData.get("titulo"), 255),
    resumo: clampText(formData.get("resumo"), 3000),
    proximoPasso: clampText(formData.get("proximoPasso"), 2000),
    apoioNecessario: clampText(formData.get("apoioNecessario"), 2000),
    statusValue: String(formData.get("status") ?? "aberto").trim(),
    referenciaEventoId: "",
    referenciaTopicoId: "",
  });

  if (!trackingId || !parsed.success) {
    redirect(`${redirectPath}?tracking=invalid-update`);
  }

  const { titulo, resumo, proximoPasso, apoioNecessario, statusValue } = parsed.data;

  if (!isSecondaryJourneyTrackingStatus(statusValue)) {
    redirect(`${redirectPath}?tracking=invalid-update`);
  }

  const session = await requireOriginAccess(origin);
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
        eq(acompanhamentosJornada.origem, origin),
        eq(acompanhamentosJornada.userId, session.user.id),
      ),
    )
    .returning({ id: acompanhamentosJornada.id });

  if (updatedRows.length === 0) {
    redirect(`${redirectPath}?tracking=not-found`);
  }

  revalidatePath(redirectPath);
  redirect(`${redirectPath}?tracking=updated`);
}
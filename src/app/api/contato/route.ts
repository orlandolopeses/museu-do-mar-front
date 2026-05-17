import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { assertPublicSubmissionGuard } from "@/lib/public-submission";
import { getClientIpFromHeaders } from "@/lib/request-client";
import { checkRateLimit } from "@/lib/rate-limit";
import { contatos } from "@/lib/schema";
import { z } from "zod";

const schema = z.object({
  nome: z.string().min(2).max(100),
  email: z.string().email(),
  assunto: z.string().min(2).max(200),
  mensagem: z.string().min(10).max(2000),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const clientIp = getClientIpFromHeaders(req.headers);
    const rateLimit = checkRateLimit(`contato:${clientIp}`, { limit: 5, windowMs: 10 * 60 * 1000 });

    if (!rateLimit.success) {
      console.warn("Rate limit excedido em /api/contato", {
        clientIp,
        retryAfterMs: rateLimit.retryAfterMs,
      });

      return NextResponse.json(
        { error: "Muitas tentativas. Tente novamente em instantes." },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil(rateLimit.retryAfterMs / 1000)),
          },
        },
      );
    }

    assertPublicSubmissionGuard(body);
    const data = schema.parse(body);

    await db.insert(contatos).values({ id: crypto.randomUUID(), ...data });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }
    if (err instanceof Error && ["spam_detected", "submission_too_fast"].includes(err.message)) {
      return NextResponse.json({ error: "Envio rejeitado" }, { status: 400 });
    }
    console.error("Erro ao salvar contato:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

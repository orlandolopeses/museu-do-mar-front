import Link from "next/link";
import { and, count, eq, gte } from "drizzle-orm";
import { requireSupporterAccess } from "@/lib/access";
import { CopyTextButton } from "@/components/ui/CopyTextButton";
import { db } from "@/lib/db";
import { buildMailtoLink, buildOperationalWhatsAppShareText, buildWhatsAppShareLink, joinShareLines } from "@/lib/gestor-sharing";
import { acervo, eventos, posts } from "@/lib/schema";
import { formatDate } from "@/lib/utils";
import { ArrowRight, BarChart3, Calendar, HandCoins, Landmark, Mail, MessageSquareShare, Newspaper, ScrollText } from "lucide-react";

async function getSupporterDashboardData() {
  const now = new Date();

  const [postsCount] = await db.select({ value: count() }).from(posts).where(eq(posts.status, "publicado"));
  const [acervoCount] = await db.select({ value: count() }).from(acervo).where(eq(acervo.publicado, true));
  const [eventosCount] = await db
    .select({ value: count() })
    .from(eventos)
    .where(and(eq(eventos.publicado, true), gte(eventos.dataInicio, now)));

  const recentPosts = await db
    .select({ id: posts.id, slug: posts.slug, title: posts.title, publishedAt: posts.publishedAt })
    .from(posts)
    .where(eq(posts.status, "publicado"))
    .orderBy(posts.publishedAt)
    .limit(4);

  return {
    postsCount: postsCount?.value ?? 0,
    acervoCount: acervoCount?.value ?? 0,
    eventosCount: eventosCount?.value ?? 0,
    recentPosts,
  };
}

export default async function ApoiadorPage() {
  const session = await requireSupporterAccess();
  const data = await getSupporterDashboardData();
  const supporterShortSummary = joinShareLines([
    "Síntese rápida da jornada do apoiador",
    `Estado: ${data.postsCount} publicação(ões), ${data.acervoCount} item(ns) de acervo e ${data.eventosCount} evento(s) futuro(s).`,
    data.recentPosts[0] ? `Leitura em foco: ${data.recentPosts[0].title}` : "Leitura em foco: ainda sem publicação recente destacada.",
    data.eventosCount > 0 ? "Ação: acompanhar o ritmo institucional e abrir conversa sobre frentes que pedem apoio." : "Ação: acompanhar a próxima atualização pública para orientar apoio e parceria.",
  ]);
  const supporterFullSummary = joinShareLines([
    "Resumo da jornada do apoiador",
    `Gerado em ${formatDate(new Date())}`,
    "",
    `Publicações visíveis: ${data.postsCount}`,
    `Itens de acervo: ${data.acervoCount}`,
    `Agenda futura: ${data.eventosCount}`,
    data.recentPosts[0] ? `Leitura institucional em foco: ${data.recentPosts[0].title}.` : "Leitura institucional em foco: ainda sem publicação recente destacada.",
    data.eventosCount > 0 ? "Ação sugerida: acompanhar o ritmo institucional e abrir conversa sobre frentes que pedem apoio." : "Ação sugerida: acompanhar a próxima atualização pública para orientar apoio e parceria.",
  ]);
  const supporterMailtoHref = buildMailtoLink(session.user?.email ?? null, "Resumo da jornada do apoiador", supporterFullSummary);
  const supporterWhatsAppHref = buildWhatsAppShareLink(
    buildOperationalWhatsAppShareText({
      heading: "Jornada do apoiador",
      state: `${data.postsCount} publicação(ões), ${data.acervoCount} item(ns) de acervo e ${data.eventosCount} evento(s) futuro(s).`,
      action: data.eventosCount > 0 ? "acompanhar o ritmo institucional e abrir conversa sobre frentes que pedem apoio." : "acompanhar a próxima atualização pública para orientar apoio e parceria.",
      ctaPath: "/app/apoiador",
      checkpoint: data.recentPosts[0] ? data.recentPosts[0].title : null,
    }),
  );

  return (
    <div className="p-8 md:p-10">
      <div className="max-w-6xl">
        <div className="mb-10 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-sm font-medium uppercase tracking-wide text-mar-azul">
            <HandCoins className="w-4 h-4" />
            Jornada do Apoiador
          </div>
          <h1 className="font-serif text-4xl font-bold text-mar-escuro">Acompanhamento institucional</h1>
          <p className="max-w-3xl leading-relaxed text-mar-escuro/60">
            Área inicial para apoiadores e parceiros acompanharem publicações, presença pública, agenda e sinais de vitalidade institucional do Museu do Mar.
          </p>
        </div>

        <div className="mb-10 grid gap-5 md:grid-cols-3">
          {[
            { label: "Publicações visíveis", value: data.postsCount, icon: Newspaper, tone: "text-mar-azul bg-mar-azul/10" },
            { label: "Itens de acervo", value: data.acervoCount, icon: Landmark, tone: "text-mar-verde bg-mar-verde/10" },
            { label: "Agenda futura", value: data.eventosCount, icon: Calendar, tone: "text-mar-cobre bg-mar-cobre/10" },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl border border-mar-areia/30 bg-white p-6">
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${item.tone}`}>
                <item.icon className="h-5 w-5" />
              </div>
              <p className="mt-4 text-sm text-mar-escuro/50">{item.label}</p>
              <p className="mt-1 font-serif text-3xl font-bold text-mar-escuro">{item.value}</p>
            </div>
          ))}
        </div>

        <section className="mb-10 rounded-2xl border border-mar-areia/30 bg-white p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <div className="flex items-center gap-2 text-sm font-medium uppercase tracking-wide text-mar-cobre">
                <ScrollText className="h-4 w-4" />
                Resumo compartilhável
              </div>
              <h2 className="mt-2 font-serif text-2xl font-bold text-mar-escuro">Leitura curta do acompanhamento institucional</h2>
              <p className="mt-2 text-sm leading-relaxed text-mar-escuro/60">
                Síntese rápida para compartilhar com parceiros, apoiadores ou rede institucional sem sair da jornada autenticada.
              </p>
              <div className="mt-4 whitespace-pre-line rounded-xl bg-mar-creme p-4 text-sm leading-relaxed text-mar-escuro/70">
                {supporterShortSummary}
              </div>
            </div>

            <div className="flex flex-wrap gap-3 lg:max-w-sm lg:justify-end">
              <CopyTextButton
                text={supporterShortSummary}
                label="Copiar resumo"
                copiedLabel="Resumo copiado"
                className="inline-flex items-center gap-2 rounded-full border border-mar-cobre/25 bg-white px-4 py-2 text-sm font-medium text-mar-cobre transition-colors hover:border-mar-cobre/45"
              />
              <a
                href={supporterMailtoHref}
                className="inline-flex items-center gap-2 rounded-full border border-mar-areia/40 bg-white px-4 py-2 text-sm font-medium text-mar-azul transition-colors hover:border-mar-azul/30"
              >
                <Mail className="h-4 w-4" />
                Abrir e-mail
              </a>
              <a
                href={supporterWhatsAppHref}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-mar-verde/25 bg-white px-4 py-2 text-sm font-medium text-mar-verde transition-colors hover:border-mar-verde/45"
              >
                <MessageSquareShare className="h-4 w-4" />
                Compartilhar via WhatsApp
              </a>
            </div>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[1.15fr,0.85fr]">
          <section className="rounded-2xl border border-mar-areia/30 bg-white p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="font-serif text-2xl font-bold text-mar-escuro">Leituras institucionais</h2>
                <p className="mt-1 text-sm text-mar-escuro/55">Publicações recentes para acompanhar presença, memória e atividade pública do projeto.</p>
              </div>
              <Link href="/blog" className="inline-flex items-center gap-1 text-sm font-medium text-mar-azul">
                Ver blog <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="space-y-3">
              {data.recentPosts.length > 0 ? data.recentPosts.map((post) => (
                <Link key={post.id} href={`/blog/${post.slug}`} className="block rounded-xl border border-mar-areia/30 p-4 transition-colors hover:border-mar-azul/30">
                  <h3 className="font-medium text-mar-escuro">{post.title}</h3>
                  <p className="mt-2 text-sm text-mar-escuro/55">{formatDate(post.publishedAt)}</p>
                </Link>
              )) : (
                <div className="rounded-xl border border-dashed border-mar-areia/40 p-4 text-sm text-mar-escuro/55">
                  Ainda não há leituras institucionais publicadas para acompanhamento público nesta frente.
                </div>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-mar-areia/30 bg-white p-6">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-mar-cobre">
              <BarChart3 className="w-4 h-4" />
              Próximos incrementos
            </div>
            <ul className="space-y-3 text-sm leading-relaxed text-mar-escuro/65">
              <li>• visão resumida de impacto, alcance e participação;</li>
              <li>• acompanhamento de frentes apoiadas e parcerias;</li>
              <li>• leitura institucional consolidada por período.</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
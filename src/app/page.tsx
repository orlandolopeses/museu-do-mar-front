import { db } from "@/lib/db";
import { acervo, eventos } from "@/lib/schema";
import { and, desc, eq, gte } from "drizzle-orm";
import { LandingSection } from "@/components/landing/LandingSection";
import { MobileHero } from "@/components/landing/MobileHero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { EntryPaths } from "@/components/landing/EntryPaths";
import { TurmaDoMangueStrip } from "@/components/landing/TurmaDoMangueStrip";
import { AgendaHighlights } from "@/components/landing/AgendaHighlights";

async function getUpcomingEventos() {
  try {
    const now = new Date();
    return await db
      .select()
      .from(eventos)
      .where(and(eq(eventos.publicado, true), gte(eventos.dataInicio, now)))
      .orderBy(eventos.dataInicio)
      .limit(3);
  } catch {
    return [];
  }
}

async function getRecentAcervo() {
  try {
    return await db
      .select()
      .from(acervo)
      .where(eq(acervo.publicado, true))
      .orderBy(desc(acervo.createdAt))
      .limit(4);
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const [upcomingEventos, recentAcervo] = await Promise.all([getUpcomingEventos(), getRecentAcervo()]);

  return (
    <>
      <MobileHero />

      <LandingSection
        id="como-funciona"
        eyebrow="Como funciona"
        title="Um prospecto lúdico em três passos"
        subtitle="A home funciona como uma página de livro infantil: acolhe, explica rápido e dispara o desejo de participar."
      >
        <HowItWorks />
      </LandingSection>

      <LandingSection
        id="caminhos"
        eyebrow="Caminhos"
        title="Escolha seu caminho de experiência"
        subtitle="Visitantes, participantes, colaboradores e apoiadores têm portas claras de entrada."
      >
        <EntryPaths />
      </LandingSection>

      <LandingSection
        id="turma-do-mangue"
        eyebrow="Personagens-guia"
        title="Turma do Mangue"
        subtitle="Os personagens apresentam o projeto em linguagem de HQ infantil e ajudam a conduzir a jornada."
      >
        <TurmaDoMangueStrip />
      </LandingSection>

      <LandingSection
        id="agenda"
        eyebrow="Agenda & acervo"
        title="Destaques para primeira visita"
        subtitle="Um recorte rápido de eventos e itens do acervo para orientar quem chega agora."
      >
        <AgendaHighlights upcomingEventos={upcomingEventos} recentAcervo={recentAcervo} />
      </LandingSection>

      <section className="pb-14">
        <div className="container-site">
          <div className="rounded-3xl border border-mar-areia/35 bg-gradient-to-r from-mar-azul/[0.06] via-white to-mar-areia/[0.18] p-6 shadow-[0_18px_40px_rgba(6,35,63,0.08)] md:p-8">
            <h2 className="font-serif text-2xl font-bold text-mar-escuro md:text-3xl">Pronto para entrar na aventura?</h2>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-mar-escuro/70 md:text-base">
              Se você chegou pela primeira vez, escolha um caminho e comece pela experiência que faz sentido para você.
            </p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <a href="/participar" className="btn-primary w-full justify-center bg-mar-areia text-mar-escuro hover:bg-mar-areia/90 sm:w-auto">
                Quero participar
              </a>
              <a href="/acervo" className="btn-secondary w-full justify-center sm:w-auto">
                Explorar o acervo
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

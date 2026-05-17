import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BookOpen, Compass, Users } from "lucide-react";
import { CharacterRoster } from "@/components/story/CharacterRoster";
import { entryPortals } from "@/lib/entry-portals";
import {
  storyCampaignScenes,
  storyCharacterProfiles,
  storyHeroApplication,
  storyParticipationSteps,
  storyPortalNarrative,
} from "@/lib/storytelling";

export const metadata: Metadata = {
  title: "Turma do Mangue",
  description:
    "Conheca Pedro Cao, Bia das Conchas, Ravi do Farol, Luna da Mare e Mari Siqueira — personagens-guia da campanha de memoria do Museu do Mar.",
};

export default function TurmaDoManguePage() {
  const publicPortals = Object.values(entryPortals).filter((portal) => portal.slug !== "implementacao");

  return (
    <div className="py-12">
      <section className="border-b border-mar-areia/30 bg-gradient-to-b from-mar-creme/80 to-white pb-16 pt-12">
        <div className="container-site grid gap-10 md:grid-cols-[1fr,auto] md:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mar-cobre">Museu do Mar · Campanha de Memoria</p>
            <h1 className="mt-3 font-serif text-4xl font-bold text-mar-azul md:text-5xl">Turma do Mangue</h1>
            <p className="mt-4 max-w-xl text-lg leading-relaxed text-mar-escuro/70">
              Cinco personagens-guia que traduzem a memoria de Perocao em aventura, arte e pertencimento. Conheca cada um e escolha seu percurso.
            </p>
            <Link href="/participar" className="btn-primary mt-8 inline-flex items-center gap-2">
              Escolher meu percurso
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="relative mx-auto h-56 w-56 shrink-0 overflow-hidden rounded-3xl shadow-lg md:h-72 md:w-72">
            <Image
              src={storyHeroApplication.imageSrc}
              alt={storyHeroApplication.imageAlt}
              fill
              sizes="(min-width: 768px) 288px, 224px"
              className="object-cover"
              priority
            />
          </div>
        </div>
      </section>

      <section className="py-14">
        <div className="container-site">
          <div className="section-eyebrow text-mar-cobre">
            <Users className="h-4 w-4" />
            <span>Quem e quem</span>
          </div>
          <h2 className="font-serif text-3xl font-bold text-mar-azul">Patrulha da memoria</h2>
          <p className="mt-2 max-w-2xl text-mar-escuro/72">
            Cada personagem representa um papel na campanha: guia, cuidado, rastreio, arte e voz das marisqueiras.
          </p>
          <CharacterRoster mode="full" theme="light" avatarMood="base" className="mt-8" />
          <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {storyCharacterProfiles.map((profile) => (
              <article
                key={profile.id}
                className="rounded-2xl border border-mar-areia/40 bg-mar-creme/50 p-5"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-mar-cobre">{profile.role}</p>
                <h3 className="mt-1 text-lg font-bold text-mar-azul">{profile.name}</h3>
                <p className="mt-2 text-sm font-medium text-mar-escuro/80">{profile.dramaticFunction}</p>
                <p className="mt-2 text-sm leading-relaxed text-mar-escuro/70">{profile.summary}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-mar-areia/25 bg-mar-creme/40 py-14">
        <div className="container-site">
          <div className="section-eyebrow text-mar-cobre">
            <BookOpen className="h-4 w-4" />
            <span>Tres capitulos</span>
          </div>
          <h2 className="font-serif text-3xl font-bold text-mar-azul">Roteiro da campanha</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {storyCampaignScenes.map((scene) => (
              <article key={scene.title} className="overflow-hidden rounded-2xl border border-mar-areia/40 bg-white shadow-sm">
                <div className="relative aspect-[16/10]">
                  <Image src={scene.imageSrc} alt={scene.imageAlt} fill sizes="(min-width: 768px) 30vw, 100vw" className="object-cover" />
                </div>
                <div className="p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-mar-cobre">{scene.panel}</p>
                  <h3 className="mt-2 text-lg font-bold text-mar-azul">{scene.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-mar-escuro/72">{scene.body}</p>
                  <p className="mt-3 text-sm font-semibold text-mar-cobre">&quot;{scene.line}&quot;</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="py-14">
        <div className="container-site">
          <div className="section-eyebrow text-mar-cobre">
            <Compass className="h-4 w-4" />
            <span>Quatro caminhos de entrada</span>
          </div>
          <h2 className="font-serif text-3xl font-bold text-mar-azul">Voz da turma por portal</h2>
          <p className="mt-2 max-w-2xl text-mar-escuro/72">
            Escolha o percurso que combina com voce. Cada portal tem tom, convite e tres passos claros.
          </p>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {publicPortals.map((portal) => {
              const narrative = storyPortalNarrative[portal.slug];
              return (
                <article key={portal.slug} className="rounded-2xl border border-mar-areia/40 bg-white p-5 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-mar-cobre">Portal {portal.title}</p>
                  <p className="mt-2 text-sm text-mar-escuro/72">{narrative.lead}</p>
                  <div className="mt-4 rounded-xl border border-mar-verde/25 bg-mar-verde/5 p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-mar-verde">Voz da turma — {narrative.host}</p>
                    <p className="mt-1 text-sm font-medium text-mar-escuro">&quot;{narrative.voice}&quot;</p>
                  </div>
                  <ul className="mt-4 space-y-2 text-sm text-mar-escuro/75">
                    {narrative.bullets.map((bullet) => (
                      <li key={bullet} className="flex gap-2">
                        <span className="text-mar-cobre">•</span>
                        {bullet}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={`/participar?portal=${portal.slug}`}
                    className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-mar-azul hover:text-mar-cobre"
                  >
                    {portal.ctaLabel}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-mar-escuro py-14 text-white">
        <div className="container-site grid gap-8 md:grid-cols-[1.1fr,0.9fr] md:items-center">
          <div>
            <h2 className="font-serif text-3xl font-bold text-mar-areia">Como participar</h2>
            <ol className="mt-6 space-y-4">
              {storyParticipationSteps.map((step, index) => (
                <li key={step.title} className="flex gap-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-mar-areia/40 bg-mar-areia/15 text-sm font-bold text-mar-areia">
                    {index + 1}
                  </span>
                  <div>
                    <p className="font-semibold text-white">{step.title}</p>
                    <p className="mt-1 text-sm text-white/78">{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>
            <Link href="/participar" className="btn-primary mt-8 inline-flex items-center gap-2 bg-mar-areia text-mar-escuro hover:bg-mar-areia/90">
              Escolher meu percurso
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <CharacterRoster mode="compact" tone="participantes" avatarMood="acolhedor" />
        </div>
      </section>
    </div>
  );
}

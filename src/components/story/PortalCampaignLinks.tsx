"use client";

import { useState, useSyncExternalStore } from "react";

type CampaignPortal = {
  slug: "implementacao" | "participantes" | "apoiadores";
  title: string;
};

type PortalCampaignLinksProps = {
  portals: readonly CampaignPortal[];
  defaultOrigin: string;
};

const portalNarrative = {
  implementacao: {
    chapter: "Frente ativa",
    tagline: "Coordena bastidores e mobilizacao",
  },
  participantes: {
    chapter: "Trilha de descoberta",
    tagline: "Convoca estudantes e educadores",
  },
  apoiadores: {
    chapter: "Rede de cuidado",
    tagline: "Aproxima familias e parceiros",
  },
} as const;

export function PortalCampaignLinks({ portals, defaultOrigin }: PortalCampaignLinksProps) {
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const baseOrigin = useSyncExternalStore(
    () => () => {},
    () => window.location.origin,
    () => defaultOrigin,
  );

  async function copyCampaignLink(slug: CampaignPortal["slug"]) {
    const url = `${baseOrigin}/?portal=${slug}`;

    try {
      await navigator.clipboard.writeText(url);
      setCopiedSlug(slug);
      setTimeout(() => setCopiedSlug((current) => (current === slug ? null : current)), 1800);
    } catch {
      setCopiedSlug(null);
    }
  }

  return (
    <div className="story-link-board mt-6 rounded-2xl border border-mar-areia/35 bg-gradient-to-b from-mar-creme/75 to-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-mar-cobre">Links de campanha</p>
      <p className="mt-1 text-sm text-mar-escuro/70">
        Compartilhe um link pronto para cada publico da mobilizacao.
      </p>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {portals.map((portal) => {
          const href = `${baseOrigin}/?portal=${portal.slug}`;
          const copied = copiedSlug === portal.slug;
          const narrative = portalNarrative[portal.slug];

          return (
            <article
              key={portal.slug}
              data-portal={portal.slug}
              className="story-link-card rounded-xl border border-mar-areia/35 bg-white p-3 shadow-[0_8px_20px_rgba(6,35,63,0.06)]"
            >
              <p className="story-link-pill inline-flex rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]">
                {narrative.chapter}
              </p>
              <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-mar-cobre">Portal {portal.title}</p>
              <p className="mt-1 text-xs text-mar-escuro/55">{narrative.tagline}</p>
              <p className="mt-1 truncate text-xs text-mar-escuro/60">{href}</p>

              <div className="mt-3 flex flex-wrap gap-2">
                <a
                  href={`/?portal=${portal.slug}`}
                  className="story-link-action inline-flex items-center rounded-lg border border-mar-areia/40 bg-mar-areia/15 px-3 py-1.5 text-xs font-medium text-mar-escuro hover:bg-mar-areia/25"
                >
                  Abrir para divulgacao
                </a>
                <button
                  type="button"
                  onClick={() => copyCampaignLink(portal.slug)}
                  className="story-link-action inline-flex items-center rounded-lg border border-mar-azul/30 px-3 py-1.5 text-xs font-medium text-mar-azul hover:bg-mar-azul/5"
                >
                  {copied ? "Link pronto" : "Copiar link de campanha"}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

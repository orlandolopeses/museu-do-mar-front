import Link from "next/link";
import { ArrowRight, HeartHandshake, Users, Wrench, Compass } from "lucide-react";
import type { EntryPortalSlug } from "@/lib/entry-portals";
import { entryPortals } from "@/lib/entry-portals";

const cards: Array<{
  slug: EntryPortalSlug;
  Icon: typeof Compass;
  href: string;
  tone: string;
}> = [
  { slug: "visitantes", Icon: Compass, href: "/visitantes", tone: "bg-mar-azul/10 text-mar-azul" },
  { slug: "participantes", Icon: Users, href: "/participar?portal=participantes", tone: "bg-mar-verde/15 text-mar-verde" },
  { slug: "colaboradores", Icon: Wrench, href: "/colaboradores", tone: "bg-mar-areia/25 text-mar-cobre" },
  { slug: "apoiadores", Icon: HeartHandshake, href: "/participar?portal=apoiadores", tone: "bg-amber-100/50 text-amber-700" },
];

export function EntryPaths() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {cards.map((card) => {
        const portal = entryPortals[card.slug];
        return (
          <article
            key={card.slug}
            className="rounded-2xl border border-mar-areia/35 bg-white p-5 shadow-[0_12px_26px_rgba(6,35,63,0.08)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className={`mb-2 inline-flex h-10 w-10 items-center justify-center rounded-xl ${card.tone}`}>
                  <card.Icon className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold text-mar-escuro">{portal.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-mar-escuro/70">{portal.summary}</p>
              </div>
              <span className="rounded-full border border-mar-areia/40 bg-mar-creme px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-mar-cobre">
                caminho
              </span>
            </div>
            <div className="mt-4">
              <Link href={card.href} className="inline-flex items-center gap-2 rounded-xl bg-mar-areia px-4 py-2 text-sm font-semibold text-mar-escuro hover:bg-mar-areia/90">
                {portal.ctaLabel} <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </article>
        );
      })}
    </div>
  );
}

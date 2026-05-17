import Link from "next/link";
import { ArrowRight, Users } from "lucide-react";
import { CharacterRoster } from "@/components/story/CharacterRoster";

export function TurmaDoMangueStrip() {
  return (
    <div className="grid gap-5 md:grid-cols-[1.1fr,0.9fr] md:items-center">
      <div>
        <div className="mb-2 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-mar-cobre">
          <Users className="h-4 w-4" />
          Turma do Mangue
        </div>
        <p className="text-sm leading-relaxed text-mar-escuro/72 md:text-base">
          Conheca a turma que vive grandes aventuras e aprende com o mar, o mangue e as pessoas da comunidade.
        </p>
        <div className="mt-4">
          <Link href="/turma-do-mangue" className="inline-flex items-center gap-2 rounded-xl bg-mar-azul px-4 py-2 text-sm font-semibold text-white hover:bg-mar-azul/90">
            Conhecer a turma <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
      <div className="rounded-2xl border border-mar-areia/35 bg-mar-creme/60 p-4">
        <CharacterRoster mode="compact" avatarMood="acolhedor" />
      </div>
    </div>
  );
}

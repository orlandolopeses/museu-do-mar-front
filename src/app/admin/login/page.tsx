import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";
import { Anchor } from "lucide-react";
import { getEntryPortal } from "@/lib/entry-portals";
import { CharacterRoster } from "@/components/story/CharacterRoster";

export const metadata: Metadata = { title: "Entrar — Museu do Mar" };

type LoginPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const googleEnabled = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  const params = searchParams ? await searchParams : undefined;
  const rawPortal = typeof params?.portal === "string" ? params.portal : null;
  const portal = getEntryPortal(rawPortal);

  const portalNarrative = portal
    ? {
        implementacao: {
          route: "Bastidores em movimento",
          quote: "Toda gincana precisa de gente que faz acontecer.",
        },
        participantes: {
          route: "Trilhas da descoberta",
          quote: "Aqui cada pista vira aprendizado coletivo.",
        },
        apoiadores: {
          route: "Rede que fortalece",
          quote: "A memoria cresce quando a comunidade apoia junta.",
        },
      }[portal.slug]
    : null;

  return (
    <div className="min-h-screen bg-mar-escuro p-4 md:p-8">
      <div className="mx-auto grid w-full max-w-5xl items-stretch gap-6 md:grid-cols-[1.08fr,0.92fr]">
        <aside className="login-story-aside relative overflow-hidden rounded-3xl border border-mar-areia/30 bg-[radial-gradient(circle_at_16%_12%,rgba(212,169,106,0.22),transparent_26%),radial-gradient(circle_at_90%_20%,rgba(116,194,133,0.2),transparent_24%),linear-gradient(180deg,#1b6e9b_0%,#0b476d_52%,#082e4c_100%)] p-6 text-white shadow-2xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-mar-areia/45 bg-mar-areia/15 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-mar-areia">
            <Anchor className="h-3.5 w-3.5" />
            Entrada da aventura
          </div>

          <h1 className="font-serif text-3xl font-bold leading-tight md:text-4xl">
            A turma do mangue
            <span className="block text-mar-areia">te recebe no portal</span>
          </h1>

          <p className="mt-4 text-sm leading-relaxed text-white/85 md:text-base">
            Este portal e o ponto de partida da mobilizacao. Entre, some com a turma e ajude a transformar
            memoria em pertencimento e acao comunitaria.
          </p>

          <CharacterRoster mode="compact" tone={portal?.slug ?? "default"} avatarMood="acolhedor" className="mt-5" />

          <div data-portal={portal?.slug ?? "participantes"} className="login-route-card mt-6 rounded-2xl border border-white/20 bg-white/10 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-mar-areia">Percurso selecionado</p>
            <p className="mt-1 text-lg font-bold text-white">{portal ? portal.title : "Area dos participantes"}</p>
            <p className="mt-2 text-sm leading-relaxed text-white/80">{portal?.summary ?? "Acesso para quem participa da jornada do Museu do Mar."}</p>
            {portalNarrative && (
              <>
                <p className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-mar-areia">Rota da historia</p>
                <p className="text-sm font-medium text-white">{portalNarrative.route}</p>
                <p className="story-bubble mt-2 inline-block rounded-lg border px-3 py-1 text-xs font-semibold">
                  &quot;{portalNarrative.quote}&quot;
                </p>
              </>
            )}
          </div>
        </aside>

        <div className="flex items-center justify-center">
          <div className="w-full max-w-md rounded-3xl border border-mar-areia/30 bg-white p-8 shadow-xl">
            <div className="mb-6 text-center">
              <div className="mb-3 flex items-center justify-center gap-2">
                <Anchor className="h-5 w-5 text-mar-azul" />
                <span className="font-serif text-xl font-bold text-mar-azul">Museu do Mar</span>
              </div>
              <h2 className="font-serif text-2xl font-bold text-mar-escuro">Entrar no portal</h2>
              <p className="mt-2 text-sm text-mar-escuro/60">
                {googleEnabled
                  ? "Entre agora e va para sua trilha de impacto."
                  : "Use suas credenciais e va para sua trilha de impacto."}
              </p>
            </div>

            <LoginForm googleEnabled={googleEnabled} portal={portal?.slug ?? null} />
          </div>
        </div>
      </div>
    </div>
  );
}

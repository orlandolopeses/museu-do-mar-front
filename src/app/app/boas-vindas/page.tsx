import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/access";
import { extractRoles, getDefaultAuthenticatedPath, getPrimaryRole } from "@/lib/permissions";
import {
  getAvailableParticipationProfileOptions,
  isParticipationProfileSlug,
  participationProfileOptionsBySlug,
  syncParticipantProfile,
} from "@/lib/participant-profile";
import { getEntryPortal } from "@/lib/entry-portals";
import { CharacterRoster } from "@/components/story/CharacterRoster";
import { Anchor, ArrowRight, CheckCircle2, Compass, Sparkles } from "lucide-react";

type BoasVindasPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function BoasVindasPage({ searchParams }: BoasVindasPageProps) {
  const session = await requireSession();
  const primaryRole = getPrimaryRole(session);
  const params = searchParams ? await searchParams : undefined;
  const portalValue = typeof params?.portal === "string" ? params.portal : null;
  const portal = getEntryPortal(portalValue);

  const availableProfileOptions = getAvailableParticipationProfileOptions(extractRoles(session));
  const portalProfiles = new Set(portal?.profiles ?? []);
  const prioritizedProfileOptions = portal
    ? [
        ...availableProfileOptions.filter((option) => portalProfiles.has(option.slug)),
        ...availableProfileOptions.filter((option) => !portalProfiles.has(option.slug)),
      ]
    : availableProfileOptions;

  const profileToneBySlug: Record<
    string,
    {
      border: string;
      badge: string;
      title: string;
      halo: string;
      tone: string;
    }
  > = {
    estudante: {
      border: "border-sky-200/70 hover:border-sky-400/60",
      badge: "bg-sky-100 text-sky-700",
      title: "group-hover:text-sky-700",
      halo: "ring-sky-300/45",
      tone: "Trilha de aprendizagem",
    },
    professor: {
      border: "border-indigo-200/75 hover:border-indigo-400/60",
      badge: "bg-indigo-100 text-indigo-700",
      title: "group-hover:text-indigo-700",
      halo: "ring-indigo-300/45",
      tone: "Trilha pedagogica",
    },
    voluntario: {
      border: "border-emerald-200/70 hover:border-emerald-400/60",
      badge: "bg-emerald-100 text-emerald-700",
      title: "group-hover:text-emerald-700",
      halo: "ring-emerald-300/45",
      tone: "Trilha comunitaria",
    },
    apoiador: {
      border: "border-amber-200/75 hover:border-amber-400/60",
      badge: "bg-amber-100 text-amber-800",
      title: "group-hover:text-amber-800",
      halo: "ring-amber-300/45",
      tone: "Trilha de apoio",
    },
    gestor: {
      border: "border-violet-200/70 hover:border-violet-400/60",
      badge: "bg-violet-100 text-violet-700",
      title: "group-hover:text-violet-700",
      halo: "ring-violet-300/45",
      tone: "Trilha de gestao",
    },
    bolsista: {
      border: "border-teal-200/75 hover:border-teal-400/60",
      badge: "bg-teal-100 text-teal-700",
      title: "group-hover:text-teal-700",
      halo: "ring-teal-300/45",
      tone: "Trilha de apoio tecnico",
    },
    equipe_producao: {
      border: "border-rose-200/70 hover:border-rose-400/60",
      badge: "bg-rose-100 text-rose-700",
      title: "group-hover:text-rose-700",
      halo: "ring-rose-300/45",
      tone: "Trilha de producao",
    },
    equipe_comunicacao: {
      border: "border-fuchsia-200/70 hover:border-fuchsia-400/60",
      badge: "bg-fuchsia-100 text-fuchsia-700",
      title: "group-hover:text-fuchsia-700",
      halo: "ring-fuchsia-300/45",
      tone: "Trilha de comunicacao",
    },
  };

  const defaultProfileTone = {
    border: "border-mar-areia/35 hover:border-mar-azul/35",
    badge: "bg-mar-creme text-mar-cobre",
    title: "group-hover:text-mar-azul",
    halo: "ring-mar-areia/45",
    tone: "Trilha participativa",
  };

  if (primaryRole) {
    redirect(getDefaultAuthenticatedPath(session));
  }

  async function saveProfileSelection(formData: FormData) {
    "use server";

    const session = await requireSession();
    const selectedRoleValue = String(formData.get("role") ?? "").trim();

    if (!selectedRoleValue || !isParticipationProfileSlug(selectedRoleValue)) {
      redirect("/app/boas-vindas?erro=perfil-invalido");
    }

    const selectedRole = selectedRoleValue;

    const userId = session.user?.id;
    const userName = session.user?.name?.trim() || null;

    if (!userId) {
      redirect("/admin/login");
    }

    try {
      await syncParticipantProfile({ userId, selectedRole, userName });
    } catch (error) {
      if (error instanceof Error && error.message === "forbidden_profile_selection") {
        redirect("/app/boas-vindas?erro=perfil-nao-autorizado");
      }

      throw error;
    }

    revalidatePath("/app");
    revalidatePath("/app/perfil");
    revalidatePath("/app/boas-vindas");
    revalidatePath("/admin");
    redirect(getDefaultAuthenticatedPath({ user: { primaryRole: selectedRole, roles: [selectedRole] } }));
  }

  return (
    <div className="p-8 md:p-10">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 overflow-hidden rounded-3xl border border-mar-areia/30 bg-white shadow-sm">
          <div className="bg-[radial-gradient(circle_at_12%_16%,rgba(212,169,106,0.2),transparent_32%),radial-gradient(circle_at_88%_18%,rgba(116,194,133,0.18),transparent_30%),linear-gradient(180deg,#f6fbff_0%,#eef7fc_100%)] p-8">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-mar-areia/45 bg-white/70 px-4 py-1 text-sm font-medium uppercase tracking-[0.18em] text-mar-azul">
              <Sparkles className="h-4 w-4" />
              Primeiro acesso
            </div>
            <h1 className="font-serif text-4xl font-bold text-mar-escuro">Sua jornada comeca aqui</h1>
            <p className="mt-4 max-w-3xl text-base leading-relaxed text-mar-escuro/70">
              Pedro Cao e a Turma do Mangue ja chamaram geral. Escolha seu papel e entre na trilha que transforma
              memoria em organizacao, pertencimento e movimento comunitario.
            </p>

            <CharacterRoster
              mode="full"
              theme="light"
              tone={portal?.slug ?? "participantes"}
              avatarMood="acolhedor"
              className="mt-5"
            />

            {portal && (
              <div className="mt-4 max-w-3xl rounded-2xl border border-mar-areia/40 bg-white/80 p-4 text-sm leading-relaxed text-mar-escuro/72">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-mar-cobre">Porta de entrada selecionada</p>
                <p className="mt-1 text-base font-semibold text-mar-azul">{portal.title}</p>
                <p className="mt-1">{portal.summary}</p>
              </div>
            )}

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {[
                "Voce pode ajustar esse perfil depois.",
                "Seu papel abre a primeira frente de acao.",
                "Perfis institucionais aparecem com autorizacao.",
              ].map((item) => (
                <div key={item} className="rounded-2xl border border-mar-areia/35 bg-white/85 p-4 text-sm text-mar-escuro/68">
                  <div className="mb-2 flex items-center gap-2 text-mar-verde">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="font-medium">Orientacao</span>
                  </div>
                  {item}
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-mar-azul/80">
              <span className="inline-flex items-center gap-1 rounded-full border border-mar-areia/40 bg-white/80 px-3 py-1">
                <Anchor className="h-3.5 w-3.5" />
                Trilha viva do territorio
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-mar-areia/40 bg-white/80 px-3 py-1">
                Comunidade em movimento
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-mar-areia/40 bg-white/80 px-3 py-1">
                Memoria como futuro
              </span>
            </div>
          </div>
        </div>

        <form action={saveProfileSelection} className="space-y-6">
          <div className="grid gap-4 lg:grid-cols-2">
            {prioritizedProfileOptions.map((option) => {
              const tone = profileToneBySlug[option.slug] ?? defaultProfileTone;
              return (
              <label
                key={option.slug}
                data-profile={option.slug}
                className={`story-card group block cursor-pointer rounded-2xl border bg-white p-6 ring-1 transition-colors ${tone.border} ${tone.halo}`}
              >
                <div className="flex items-start gap-4">
                  <input
                    type="radio"
                    name="role"
                    value={option.slug}
                    className="mt-1 h-4 w-4 border-mar-areia text-mar-azul focus:ring-mar-azul"
                    defaultChecked={option.slug === (prioritizedProfileOptions[0]?.slug ?? "estudante")}
                  />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${tone.badge}`}>
                        {tone.tone}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center gap-2 text-sm font-medium uppercase tracking-[0.16em] text-mar-cobre">
                      <Compass className="h-4 w-4" />
                      Perfil inicial
                    </div>
                    <h2 className={`mt-2 font-serif text-2xl font-bold text-mar-escuro transition-colors ${tone.title}`}>
                      {participationProfileOptionsBySlug[option.slug].title}
                    </h2>
                    <p className="mt-3 text-sm leading-relaxed text-mar-escuro/65">{option.summary}</p>
                    <p className="mt-4 text-sm font-medium text-mar-azul">{option.highlight}</p>
                  </div>
                </div>
              </label>
            )})}
          </div>

          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-mar-areia/30 bg-white p-5">
            <button type="submit" className="btn-primary bg-mar-areia text-mar-escuro hover:bg-mar-areia/90">
              Confirmar perfil e continuar
            </button>
            <Link href="/sobre" className="btn-secondary">
              Ler mais sobre o projeto <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
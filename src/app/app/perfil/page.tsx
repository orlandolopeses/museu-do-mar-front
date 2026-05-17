import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { requireSession } from "@/lib/access";
import { db } from "@/lib/db";
import { getDefaultAuthenticatedPath } from "@/lib/permissions";
import { extractRoles, getPrimaryRole, needsProfileOnboarding } from "@/lib/permissions";
import { instituicoes, profiles, userInstituicoes, users } from "@/lib/schema";
import {
  getAvailableParticipationProfileOptions,
  getParticipationProfileTitle,
  isParticipationProfileSlug,
  syncParticipantProfile,
} from "@/lib/participant-profile";
import { ArrowRight, Building2, CheckCircle2, MapPin, Save, ShieldCheck, Sparkles, UserCircle2 } from "lucide-react";

const roleDestinations: Record<string, { href: string; title: string; description: string }> = {
  gestor: {
    href: "/app/gestor",
    title: "Ver dashboard do Gestor",
    description: "Acesso à visão institucional de acompanhamento, indicadores e articulação de frentes do projeto.",
  },
  equipe_comunicacao: {
    href: "/app/equipe-comunicacao",
    title: "Ver dashboard da Comunicação",
    description: "Acesso à área editorial para blog, agenda, campanhas e presença pública do projeto.",
  },
  estudante: {
    href: "/app/estudante",
    title: "Ver dashboard do Estudante",
    description: "Acesso à jornada inicial para trilhas, fóruns, agenda e exploração orientada do acervo.",
  },
  professor: {
    href: "/app/professor",
    title: "Ver dashboard do Professor",
    description: "Acesso à primeira interface personalizada para uso pedagógico do acervo, agenda e trilhas.",
  },
  bolsista: {
    href: "/app/bolsista",
    title: "Ver dashboard do Bolsista",
    description: "Acesso inicial para repertório, apoio em pesquisa, acompanhamento de agenda e frentes de trabalho.",
  },
  equipe_producao: {
    href: "/app/equipe-producao",
    title: "Ver dashboard da Produção",
    description: "Acesso à leitura operacional da agenda e às próximas camadas de organização de execução do projeto.",
  },
  voluntario: {
    href: "/app/voluntario",
    title: "Ver dashboard do Voluntário",
    description: "Acesso à jornada inicial de participação, apoio em rede e aproximação com atividades públicas do projeto.",
  },
  apoiador: {
    href: "/app/apoiador",
    title: "Ver dashboard do Apoiador",
    description: "Acesso à visão institucional inicial para leitura de publicações, agenda e sinais de vitalidade do projeto.",
  },
};

export default async function PerfilPage() {
  const session = await requireSession();
  const roles = extractRoles(session);
  const primaryRole = getPrimaryRole(session);
  const onboardingRequired = needsProfileOnboarding(session);
  const availableProfileOptions = getAvailableParticipationProfileOptions(roles);
  const userId = session.user?.id;

  const [profile] = userId
    ? await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1)
    : [];

  const [userRecord] = userId
    ? await db
        .select({ termsAcceptedAt: users.termsAcceptedAt, privacyAcceptedAt: users.privacyAcceptedAt })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1)
    : [];

  const institutionLinks = userId
    ? await db
        .select({
          instituicaoId: userInstituicoes.instituicaoId,
          isPrimary: userInstituicoes.isPrimary,
          funcaoInstitucional: userInstituicoes.funcaoInstitucional,
          nome: instituicoes.nome,
          cidade: instituicoes.cidade,
          estado: instituicoes.estado,
        })
        .from(userInstituicoes)
        .innerJoin(instituicoes, eq(userInstituicoes.instituicaoId, instituicoes.id))
        .where(eq(userInstituicoes.userId, userId))
        .orderBy(desc(userInstituicoes.isPrimary), instituicoes.nome)
    : [];

  const primaryInstitutionLink = institutionLinks.find((link) => link.isPrimary) ?? institutionLinks[0] ?? null;

  async function acceptTerms(formData: FormData) {
    "use server";
    const session = await requireSession();
    const uid = session.user?.id;
    if (!uid) redirect("/admin/login");
    const accepted = formData.get("accepted") === "on";
    if (!accepted) return;
    const now = new Date();
    await db.update(users).set({ termsAcceptedAt: now, privacyAcceptedAt: now }).where(eq(users.id, uid));
    revalidatePath("/app/perfil");
  }

  async function saveParticipantProfile(formData: FormData) {
    "use server";

    const session = await requireSession();
    const userId = session.user?.id;
    const selectedRoleValue = String(formData.get("primaryRole") ?? "").trim();

    if (!userId) {
      redirect("/admin/login");
    }

    if (!selectedRoleValue || !isParticipationProfileSlug(selectedRoleValue)) {
      redirect("/app/perfil");
    }

    try {
      await syncParticipantProfile({
        userId,
        selectedRole: selectedRoleValue,
        userName: session.user?.name?.trim() || null,
        displayName: String(formData.get("displayName") ?? "").trim() || null,
        institutionName: String(formData.get("institutionName") ?? "").trim() || null,
        schoolName: String(formData.get("schoolName") ?? "").trim() || null,
        city: String(formData.get("city") ?? "").trim() || null,
        state: String(formData.get("state") ?? "").trim() || null,
      });
    } catch (error) {
      if (error instanceof Error && error.message === "forbidden_profile_selection") {
        redirect("/app/perfil?erro=perfil-nao-autorizado");
      }

      throw error;
    }

    revalidatePath("/app");
    revalidatePath("/app/perfil");
    revalidatePath("/app/boas-vindas");
    revalidatePath("/admin");
    redirect("/app/perfil");
  }

  return (
    <div className="p-8 md:p-10">
      <div className="max-w-4xl">
        <div className="mb-8">
          <h1 className="font-serif text-3xl font-bold text-mar-escuro">Área autenticada</h1>
          <p className="text-mar-escuro/60 mt-2 max-w-2xl">
            Esta área será expandida com jornadas específicas para cada perfil do projeto. Nesta fase,
            o sistema já reconhece papéis e prepara a navegação personalizada.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-mar-areia/30 p-6 md:p-8 mb-8">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-mar-azul/10 flex items-center justify-center shrink-0">
              <UserCircle2 className="w-6 h-6 text-mar-azul" />
            </div>
            <div>
              <h2 className="font-serif text-2xl font-bold text-mar-escuro">{session?.user?.name}</h2>
              <p className="text-sm text-mar-escuro/55 mt-1">{session?.user?.email}</p>
              <div className="flex flex-wrap gap-2 mt-4">
                {roles.map((role) => (
                  <span key={role} className="badge bg-mar-azul/10 text-mar-azul">
                    {role}
                  </span>
                ))}
              </div>
              {primaryRole && (
                <p className="text-sm text-mar-escuro/55 mt-4">
                  Papel principal reconhecido: <strong>{getParticipationProfileTitle(primaryRole) ?? primaryRole}</strong>
                </p>
              )}
            </div>
          </div>
        </div>

        {institutionLinks.length > 0 && (
          <div className="bg-white rounded-2xl border border-mar-areia/30 p-6 md:p-8 mb-8">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-mar-verde/10">
                <Building2 className="h-5 w-5 text-mar-verde" />
              </div>
              <div>
                <h3 className="font-serif text-xl font-bold text-mar-escuro">Vínculos institucionais</h3>
                <p className="text-sm text-mar-escuro/60">Leitura dos vínculos já registrados para sua participação no projeto.</p>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {institutionLinks.map((link) => (
                <div key={link.instituicaoId} className="rounded-xl border border-mar-areia/30 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h4 className="font-medium text-mar-escuro">{link.nome}</h4>
                      {(link.cidade || link.estado) && (
                        <p className="mt-1 text-sm text-mar-escuro/50">
                          {link.cidade}{link.cidade && link.estado ? "/" : ""}{link.estado}
                        </p>
                      )}
                    </div>
                    <span className={`badge ${link.isPrimary ? "bg-mar-verde/10 text-mar-verde" : "bg-mar-creme text-mar-escuro/55"}`}>
                      {link.isPrimary ? "Primário" : "Vínculo ativo"}
                    </span>
                  </div>
                  {link.funcaoInstitucional && (
                    <p className="mt-3 text-sm text-mar-escuro/60">Função institucional: {link.funcaoInstitucional}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {!onboardingRequired && primaryRole && (
          <div className="bg-white rounded-2xl border border-mar-areia/30 p-6 md:p-8 mb-8">
            <div className="mb-6 max-w-2xl">
              <h3 className="font-serif text-2xl font-bold text-mar-escuro">Configurar participação</h3>
              <p className="mt-2 text-sm leading-relaxed text-mar-escuro/60">
                Ajuste seu perfil principal e complemente dados básicos de vínculo institucional para qualificar sua jornada dentro do projeto.
              </p>
              <p className="mt-3 text-sm leading-relaxed text-mar-escuro/50">
                Papéis institucionais e de equipe interna só podem ser selecionados aqui quando já tiverem sido atribuídos pela gestão do projeto.
              </p>
            </div>

            <form action={saveParticipantProfile} className="space-y-6">
              <div className="grid gap-5 lg:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-mar-escuro">Nome de exibição</span>
                  <input
                    type="text"
                    name="displayName"
                    defaultValue={profile?.displayName ?? session.user?.name ?? ""}
                    className="w-full rounded-xl border border-mar-areia/30 bg-white px-4 py-3 text-sm text-mar-escuro outline-none transition-colors focus:border-mar-azul/40"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-mar-escuro">Perfil principal</span>
                  <select
                    name="primaryRole"
                    defaultValue={primaryRole ?? profile?.profileType ?? "estudante"}
                    className="w-full rounded-xl border border-mar-areia/30 bg-white px-4 py-3 text-sm text-mar-escuro outline-none transition-colors focus:border-mar-azul/40"
                  >
                    {availableProfileOptions.map((option) => (
                      <option key={option.slug} value={option.slug}>
                        {option.title}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-mar-escuro">Instituição / coletivo</span>
                  <div className="relative">
                    <Building2 className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-mar-escuro/35" />
                    <input
                      type="text"
                      name="institutionName"
                      defaultValue={primaryInstitutionLink?.nome ?? profile?.institutionName ?? ""}
                      placeholder="Ex.: Escola, universidade, associação, coletivo"
                      readOnly={Boolean(primaryInstitutionLink)}
                      className="w-full rounded-xl border border-mar-areia/30 bg-white py-3 pl-11 pr-4 text-sm text-mar-escuro outline-none transition-colors focus:border-mar-azul/40"
                    />
                  </div>
                  {primaryInstitutionLink && (
                    <p className="mt-2 text-xs text-mar-escuro/45">Esse campo está vinculado ao seu vínculo institucional primário e é atualizado pela gestão administrativa.</p>
                  )}
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-mar-escuro">Turma / escola / grupo</span>
                  <input
                    type="text"
                    name="schoolName"
                    defaultValue={profile?.schoolName ?? ""}
                    placeholder="Ex.: Turma, escola, secretaria ou grupo de atuação"
                    className="w-full rounded-xl border border-mar-areia/30 bg-white px-4 py-3 text-sm text-mar-escuro outline-none transition-colors focus:border-mar-azul/40"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-mar-escuro">Cidade</span>
                  <div className="relative">
                    <MapPin className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-mar-escuro/35" />
                    <input
                      type="text"
                      name="city"
                      defaultValue={primaryInstitutionLink?.cidade ?? profile?.city ?? ""}
                      readOnly={Boolean(primaryInstitutionLink)}
                      className="w-full rounded-xl border border-mar-areia/30 bg-white py-3 pl-11 pr-4 text-sm text-mar-escuro outline-none transition-colors focus:border-mar-azul/40"
                    />
                  </div>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-mar-escuro">Estado</span>
                  <input
                    type="text"
                    name="state"
                    defaultValue={primaryInstitutionLink?.estado ?? profile?.state ?? ""}
                    placeholder="Ex.: ES"
                    readOnly={Boolean(primaryInstitutionLink)}
                    className="w-full rounded-xl border border-mar-areia/30 bg-white px-4 py-3 text-sm uppercase text-mar-escuro outline-none transition-colors focus:border-mar-azul/40"
                  />
                  {primaryInstitutionLink && (
                    <p className="mt-2 text-xs text-mar-escuro/45">Cidade e estado acompanham o vínculo institucional primário quando ele já estiver definido.</p>
                  )}
                </label>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button type="submit" className="btn-primary bg-mar-areia text-mar-escuro hover:bg-mar-areia/90">
                  <Save className="h-4 w-4" />
                  Salvar configuração
                </button>
                <Link href={getDefaultAuthenticatedPath(session)} className="btn-secondary">
                  Ir para minha jornada <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </form>
          </div>
        )}

        {/* C-03 — Termos e privacidade */}
        <div className="mb-8 rounded-2xl border border-mar-areia/30 bg-white p-6 md:p-8">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-mar-azul/10">
              <ShieldCheck className="h-5 w-5 text-mar-azul" />
            </div>
            <h3 className="font-serif text-xl font-bold text-mar-escuro">Privacidade e termos</h3>
          </div>

          {userRecord?.termsAcceptedAt ? (
            <div className="flex items-center gap-2 text-sm text-mar-verde">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>
                Termos e política de privacidade aceitos em{" "}
                {userRecord.termsAcceptedAt.toLocaleDateString("pt-BR")}.
              </span>
            </div>
          ) : (
            <form action={acceptTerms} className="space-y-4">
              <p className="text-sm leading-relaxed text-mar-escuro/65">
                Para participar das atividades do Museu do Mar, confirme que leu e aceita o uso de seus dados para fins educativos e de preservação da memória comunitária.
              </p>
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  name="accepted"
                  required
                  className="mt-0.5 h-4 w-4 rounded border-mar-areia accent-mar-azul"
                />
                <span className="text-sm text-mar-escuro/70">
                  Concordo com o uso dos meus dados conforme a política de privacidade do projeto, para fins exclusivamente educativos e culturais.
                </span>
              </label>
              <button type="submit" className="btn-primary bg-mar-areia text-mar-escuro hover:bg-mar-areia/90 text-sm">
                Confirmar aceite
              </button>
            </form>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-mar-areia/30 p-6">
            <h3 className="font-serif text-xl font-bold text-mar-escuro mb-3">Próxima etapa</h3>
            <p className="text-sm text-mar-escuro/60 leading-relaxed">
              {onboardingRequired
                ? "Antes de avançar, conclua a escolha do perfil principal para liberar a experiência inicial adequada ao seu acesso."
                : "A próxima entrega recomendada é a consolidação de jornadas especializadas por perfil, com prioridade para Professor, Estudante, Comunicação e Gestor."}
            </p>
            {onboardingRequired && (
              <Link href="/app/boas-vindas" className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-mar-azul">
                <Sparkles className="w-4 h-4" />
                Concluir primeiro acesso
              </Link>
            )}
          </div>
          {!onboardingRequired && primaryRole && roleDestinations[primaryRole] ? (
            <Link href={roleDestinations[primaryRole].href} className="bg-white rounded-2xl border border-mar-areia/30 p-6 group hover:border-mar-azul/30 transition-colors">
              <h3 className="font-serif text-xl font-bold text-mar-escuro mb-3 group-hover:text-mar-azul transition-colors">
                {roleDestinations[primaryRole].title}
              </h3>
              <p className="text-sm text-mar-escuro/60 leading-relaxed mb-4">
                {roleDestinations[primaryRole].description}
              </p>
              <span className="text-sm font-medium text-mar-azul inline-flex items-center gap-1">
                Abrir <ArrowRight className="w-4 h-4" />
              </span>
            </Link>
          ) : (
            <div className="bg-white rounded-2xl border border-mar-areia/30 p-6">
              <h3 className="font-serif text-xl font-bold text-mar-escuro mb-3">
                {onboardingRequired ? "Perfil ainda não configurado" : "Jornada em preparação"}
              </h3>
              <p className="text-sm text-mar-escuro/60 leading-relaxed">
                {onboardingRequired
                  ? "Seu acesso foi criado com sucesso, mas ainda falta definir o perfil principal que vai orientar sua experiência inicial na plataforma."
                  : "Seu perfil já está reconhecido, mas a experiência dedicada ainda será detalhada nas próximas iterações."}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";
import { canAccessAdmin, extractRoles, hasAnyRole, needsProfileOnboarding } from "@/lib/permissions";
import { BookOpen, Briefcase, GraduationCap, HandCoins, HeartHandshake, Home, LayoutDashboard, LineChart, LogOut, Megaphone, School, ScrollText, Sparkles, UserCircle2, Wrench } from "lucide-react";

export default async function AppAreaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) {
    redirect("/admin/login");
  }

  const roles = extractRoles(session);
  const onboardingRequired = needsProfileOnboarding(session);
  const navItems = [
    { href: "/app", label: "Início", icon: Home, visible: true },
    { href: "/app/boas-vindas", label: "Primeiro acesso", icon: Sparkles, visible: onboardingRequired },
    { href: "/app/professor", label: "Professor", icon: GraduationCap, visible: hasAnyRole(session, ["professor", "superadmin", "editor"]) },
    {
      href: "/app/estudante",
      label: "Estudante",
      icon: BookOpen,
      visible: hasAnyRole(session, ["estudante", "superadmin", "professor"]),
    },
    {
      href: "/app/equipe-comunicacao",
      label: "Comunicação",
      icon: Megaphone,
      visible: hasAnyRole(session, ["equipe_comunicacao", "comunicador", "editor", "superadmin"]),
    },
    {
      href: "/app/equipe-producao",
      label: "Produção",
      icon: Wrench,
      visible: hasAnyRole(session, ["equipe_producao", "equipe", "gestor", "superadmin"]),
    },
    {
      href: "/app/gestor-educacional",
      label: "Gestor educacional",
      icon: LineChart,
      visible: hasAnyRole(session, ["gestor_educacional", "superadmin"]),
    },
    {
      href: "/app/gestor",
      label: "Gestor",
      icon: School,
      visible: hasAnyRole(session, ["gestor", "gestor_educacional", "superadmin"]),
    },
    {
      href: "/app/bolsista",
      label: "Bolsista",
      icon: ScrollText,
      visible: hasAnyRole(session, ["bolsista", "gestor", "superadmin"]),
    },
    {
      href: "/app/voluntario",
      label: "Voluntário",
      icon: HeartHandshake,
      visible: hasAnyRole(session, ["voluntario", "gestor", "superadmin"]),
    },
    {
      href: "/app/apoiador",
      label: "Apoiador",
      icon: HandCoins,
      visible: hasAnyRole(session, ["apoiador", "parceiro", "gestor", "superadmin"]),
    },
    {
      href: "/app/perfil",
      label: "Participação",
      icon: Briefcase,
      visible: hasAnyRole(session, ["bolsista", "equipe_producao", "voluntario", "apoiador", "equipe", "parceiro", "comunidade"]),
    },
    { href: "/app/perfil", label: "Meu Perfil", icon: UserCircle2, visible: true },
  ].filter((item) => item.visible);

  return (
    <div className="min-h-screen bg-mar-creme/40 flex">
      <aside className="w-64 bg-white border-r border-mar-areia/30 flex flex-col shrink-0">
        <div className="p-5 border-b border-mar-areia/30">
          <Link href="/" className="flex items-center gap-2 text-mar-escuro">
            <BookOpen className="w-5 h-5 text-mar-azul" />
            <span className="font-serif font-bold">Museu do Mar</span>
          </Link>
          <p className="text-xs text-mar-escuro/45 mt-1">Área autenticada do projeto</p>
        </div>

        <nav className="flex-1 p-3">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-mar-escuro/70 hover:text-mar-escuro hover:bg-mar-azul/5 transition-colors mb-1"
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {item.label}
            </Link>
          ))}
          {canAccessAdmin(session) && (
            <Link
              href="/admin"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-mar-escuro/70 hover:text-mar-escuro hover:bg-mar-azul/5 transition-colors mt-4"
            >
              <LayoutDashboard className="w-4 h-4 shrink-0" />
              Painel administrativo
            </Link>
          )}
        </nav>

        <div className="p-4 border-t border-mar-areia/30">
          <div className="text-sm font-medium text-mar-escuro">{session.user?.name}</div>
          <div className="text-xs text-mar-escuro/45 mt-1">{session.user?.email}</div>
          {roles.length > 0 && (
            <div className="text-[11px] uppercase tracking-wide text-mar-escuro/35 mt-2">
              {roles.join(" · ")}
            </div>
          )}
          <form
            className="mt-4"
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/admin/login" });
            }}
          >
            <button type="submit" className="btn-secondary w-full justify-center text-sm">
              <LogOut className="w-4 h-4" />
              Sair
            </button>
          </form>
        </div>
      </aside>

      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}

import { auth } from "@/lib/auth";
import { canAccessAdmin, extractRoles, hasPermission } from "@/lib/permissions";
import { signOut } from "@/lib/auth";
import Link from "next/link";
import { Anchor, Camera, FileText, Calendar, MessageSquare, Mail, LogOut, LayoutDashboard, Inbox, Building2, School, Users } from "lucide-react";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/usuarios", label: "Usuários", icon: Users },
  { href: "/admin/instituicoes", label: "Instituições", icon: Building2 },
  { href: "/admin/turmas", label: "Turmas", icon: School },
  { href: "/admin/acervo", label: "Acervo", icon: Camera, permission: "acervo.review" },
  { href: "/admin/blog", label: "Blog", icon: FileText, permission: "blog.create" },
  { href: "/admin/eventos", label: "Eventos", icon: Calendar, permission: "eventos.manage" },
  { href: "/admin/forum", label: "Fórum", icon: MessageSquare, permission: "forum.moderate" },
  { href: "/admin/memorias", label: "Memórias", icon: Inbox, permission: "acervo.create" },
  { href: "/admin/contatos", label: "Contatos", icon: Mail },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session || !canAccessAdmin(session)) {
    return <>{children}</>;
  }

  const roleLabels = extractRoles(session).join(" · ");
  const visibleNavItems = navItems.filter((item) => !item.permission || hasPermission(session, item.permission));

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-60 bg-mar-escuro text-white flex flex-col shrink-0">
        <div className="p-4 border-b border-white/10">
          <Link href="/" className="flex items-center gap-2">
            <Anchor className="w-5 h-5 text-mar-areia" />
            <span className="font-serif font-bold text-sm">Museu do Mar</span>
          </Link>
          <p className="text-xs text-white/40 mt-1">Painel Admin</p>
        </div>

        <nav className="flex-1 p-3">
          {visibleNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-white/70 hover:text-white hover:bg-white/10 transition-colors mb-1"
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="p-3 border-t border-white/10">
          <div className="px-3 py-2 text-xs text-white/40 mb-1">{session?.user?.email}</div>
          {roleLabels && (
            <div className="px-3 pb-2 text-[11px] uppercase tracking-wide text-white/25">{roleLabels}</div>
          )}
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/admin/login" });
            }}
          >
            <button
              type="submit"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-white/70 hover:text-white hover:bg-white/10 transition-colors w-full"
            >
              <LogOut className="w-4 h-4" />
              Sair
            </button>
          </form>
        </div>
      </aside>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
}

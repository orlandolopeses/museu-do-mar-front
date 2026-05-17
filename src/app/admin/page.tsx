import { db } from "@/lib/db";
import { requireAdminAccess } from "@/lib/access";
import { posts, acervo, eventos, forumTopicos, contatos } from "@/lib/schema";
import { count, eq } from "drizzle-orm";
import { hasPermission } from "@/lib/permissions";
import { Camera, FileText, Calendar, MessageSquare, Mail, ArrowRight } from "lucide-react";
import Link from "next/link";

async function getStats() {
  try {
    const [
      [{ total: totalAcervo }],
      [{ total: totalPosts }],
      [{ total: totalEventos }],
      [{ total: totalTopicos }],
      [{ total: totalContatos }],
    ] = await Promise.all([
      db.select({ total: count() }).from(acervo),
      db.select({ total: count() }).from(posts).where(eq(posts.status, "publicado")),
      db.select({ total: count() }).from(eventos).where(eq(eventos.publicado, true)),
      db.select({ total: count() }).from(forumTopicos),
      db.select({ total: count() }).from(contatos).where(eq(contatos.lido, false)),
    ]);
    return { totalAcervo, totalPosts, totalEventos, totalTopicos, totalContatos };
  } catch {
    return { totalAcervo: 0, totalPosts: 0, totalEventos: 0, totalTopicos: 0, totalContatos: 0 };
  }
}

export default async function AdminDashboard() {
  const session = await requireAdminAccess();
  const stats = await getStats();

  const cards = [
    { label: "Itens no Acervo", value: stats.totalAcervo, icon: Camera, href: "/admin/acervo", color: "bg-mar-azul", visible: hasPermission(session, "acervo.review") },
    { label: "Posts Publicados", value: stats.totalPosts, icon: FileText, href: "/admin/blog", color: "bg-mar-verde", visible: hasPermission(session, "blog.create") },
    { label: "Eventos Ativos", value: stats.totalEventos, icon: Calendar, href: "/admin/eventos", color: "bg-mar-cobre", visible: hasPermission(session, "eventos.manage") },
    { label: "Tópicos no Fórum", value: stats.totalTopicos, icon: MessageSquare, href: "/admin/forum", color: "bg-mar-azul_claro", visible: hasPermission(session, "forum.moderate") },
    { label: "Mensagens Novas", value: stats.totalContatos, icon: Mail, href: "/admin/contatos", color: "bg-red-500", visible: true },
  ].filter((card) => card.visible);

  const quickActions = [
    { href: "/admin/acervo/novo", label: "Adicionar item ao acervo", visible: hasPermission(session, "acervo.review") },
    { href: "/admin/blog/novo", label: "Criar novo post", visible: hasPermission(session, "blog.create") },
    { href: "/admin/eventos/novo", label: "Criar novo evento", visible: hasPermission(session, "eventos.manage") },
  ].filter((item) => item.visible);

  return (
    <div className="p-8">
      <h1 className="font-serif text-2xl font-bold text-mar-escuro mb-8">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {cards.map((card) => (
          <Link key={card.href} href={card.href} className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4 hover:shadow-sm transition-shadow group">
            <div className={`w-12 h-12 ${card.color} rounded-xl flex items-center justify-center shrink-0`}>
              <card.icon className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-2xl font-bold text-mar-escuro">{card.value}</p>
              <p className="text-sm text-mar-escuro/60">{card.label}</p>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-mar-azul transition-colors" />
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-serif font-bold text-mar-escuro mb-4">Ações Rápidas</h2>
          <div className="space-y-2">
            {quickActions.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block px-4 py-3 rounded-lg border border-gray-200 text-sm font-medium text-mar-azul hover:bg-mar-azul hover:text-white transition-colors"
              >
                + {item.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="bg-mar-azul/5 rounded-xl border border-mar-azul/20 p-6">
          <h2 className="font-serif font-bold text-mar-azul mb-3">Site público</h2>
          <p className="text-sm text-mar-escuro/70 mb-4">
            Veja como o site está para os visitantes.
          </p>
          <Link href="/" target="_blank" className="btn-primary text-sm">
            Abrir site <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

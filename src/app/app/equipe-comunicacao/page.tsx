import Link from "next/link";
import { asc, desc, gte } from "drizzle-orm";
import { db } from "@/lib/db";
import { requireCommunicationAccess } from "@/lib/access";
import { eventos, posts } from "@/lib/schema";
import { formatDate } from "@/lib/utils";
import { ArrowRight, Calendar, FileText, Megaphone, Newspaper, PencilLine } from "lucide-react";

async function getCommunicationDashboardData() {
  const allPosts = await db
    .select({ id: posts.id, slug: posts.slug, title: posts.title, status: posts.status, publishedAt: posts.publishedAt, updatedAt: posts.updatedAt, createdAt: posts.createdAt })
    .from(posts)
    .orderBy(desc(posts.updatedAt))
    .limit(10);

  const now = new Date();
  const upcomingEventos = await db
    .select({ id: eventos.id, titulo: eventos.titulo, dataInicio: eventos.dataInicio, dataFim: eventos.dataFim, local: eventos.local, categoria: eventos.categoria, publicado: eventos.publicado })
    .from(eventos)
    .where(gte(eventos.dataInicio, now))
    .orderBy(asc(eventos.dataInicio))
    .limit(6);

  const rascunhoCount = allPosts.filter((p) => p.status === "rascunho").length;
  const publicadoCount = allPosts.filter((p) => p.status === "publicado").length;

  return {
    allPosts,
    upcomingEventos,
    rascunhoCount,
    publicadoCount,
    upcomingCount: upcomingEventos.length,
    totalPostsShown: allPosts.length,
  };
}

export default async function EquipeComunicacaoPage() {
  const session = await requireCommunicationAccess();
  const data = await getCommunicationDashboardData();

  const draftPosts = data.allPosts.filter((p) => p.status === "rascunho");
  const publishedPosts = data.allPosts.filter((p) => p.status === "publicado");

  return (
    <div className="p-8 md:p-10">
      <div className="max-w-6xl">
        <div className="mb-10 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-sm font-medium uppercase tracking-wide text-mar-azul">
            <Megaphone className="w-4 h-4" />
            Jornada da Comunicação
          </div>
          <h1 className="font-serif text-4xl font-bold text-mar-escuro">Painel editorial</h1>
          <p className="max-w-3xl leading-relaxed text-mar-escuro/60">
            Fila de publicações, agenda cultural próxima e ações de comunicação do Museu do Mar.
          </p>
          <p className="text-sm text-mar-escuro/45">Sessão ativa para {session.user?.email}.</p>
        </div>

        <div className="mb-10 grid gap-5 md:grid-cols-4">
          {[
            { label: "Rascunhos", value: data.rascunhoCount, icon: FileText, tone: "text-amber-600 bg-amber-50" },
            { label: "Publicados", value: data.publicadoCount, icon: PencilLine, tone: "text-mar-verde bg-mar-verde/10" },
            { label: "Posts total", value: data.totalPostsShown, icon: Newspaper, tone: "text-mar-azul bg-mar-azul/10" },
            { label: "Eventos próximos", value: data.upcomingCount, icon: Calendar, tone: "text-mar-cobre bg-mar-cobre/10" },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl border border-mar-areia/30 bg-white p-6">
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${item.tone}`}>
                <item.icon className="w-5 h-5" />
              </div>
              <p className="mt-4 text-sm text-mar-escuro/50">{item.label}</p>
              <p className="mt-1 font-serif text-3xl font-bold text-mar-escuro">{item.value}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Fila editorial */}
          <section className="rounded-2xl border border-mar-areia/30 bg-white p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="font-serif text-2xl font-bold text-mar-escuro">Fila editorial</h2>
                <p className="mt-1 text-sm text-mar-escuro/55">Publicações em rascunho e recém-publicadas.</p>
              </div>
              <Link href="/admin/blog" className="inline-flex items-center gap-1 text-sm font-medium text-mar-azul">
                Ir ao blog <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {draftPosts.length === 0 && publishedPosts.length === 0 ? (
              <p className="text-sm text-mar-escuro/45">Nenhuma publicação encontrada. Crie o primeiro post no blog.</p>
            ) : (
              <div className="space-y-3">
                {draftPosts.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-amber-600">
                      Rascunhos — {draftPosts.length}
                    </p>
                    {draftPosts.map((post) => (
                      <div key={post.id} className="mb-2 flex items-start justify-between rounded-xl border border-amber-100 bg-amber-50/40 p-4">
                        <div>
                          <p className="font-medium text-mar-escuro">{post.title}</p>
                          <p className="mt-1 text-xs text-mar-escuro/45">Editado em {formatDate(post.updatedAt)}</p>
                        </div>
                        <span className="ml-3 shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">rascunho</span>
                      </div>
                    ))}
                  </div>
                )}
                {publishedPosts.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-mar-verde">
                      Publicados — {publishedPosts.length}
                    </p>
                    {publishedPosts.map((post) => (
                      <Link key={post.id} href={`/blog/${post.slug}`} className="mb-2 flex items-start justify-between rounded-xl border border-mar-areia/30 p-4 transition-colors hover:border-mar-verde/30">
                        <div>
                          <p className="font-medium text-mar-escuro">{post.title}</p>
                          <p className="mt-1 text-xs text-mar-escuro/45">{formatDate(post.publishedAt ?? post.createdAt)}</p>
                        </div>
                        <span className="ml-3 shrink-0 rounded-full bg-mar-verde/10 px-2 py-0.5 text-xs font-medium text-mar-verde">publicado</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Próximos eventos */}
          <section className="rounded-2xl border border-mar-areia/30 bg-white p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="font-serif text-2xl font-bold text-mar-escuro">Próximos eventos</h2>
                <p className="mt-1 text-sm text-mar-escuro/55">Agenda futura para divulgação e cobertura.</p>
              </div>
              <Link href="/admin/eventos" className="inline-flex items-center gap-1 text-sm font-medium text-mar-azul">
                Ir à agenda <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {data.upcomingEventos.length === 0 ? (
              <p className="text-sm text-mar-escuro/45">Nenhum evento futuro cadastrado. Adicione eventos na agenda para planejar a cobertura.</p>
            ) : (
              <div className="space-y-3">
                {data.upcomingEventos.map((evento) => (
                  <Link key={evento.id} href={`/agenda/${evento.id}`} className="flex items-start gap-4 rounded-xl border border-mar-areia/30 p-4 transition-colors hover:border-mar-azul/30">
                    <div className="flex w-12 shrink-0 flex-col items-center justify-center rounded-lg bg-mar-azul/8 py-2 text-mar-azul">
                      <span className="text-xs font-semibold uppercase leading-none">
                        {evento.dataInicio.toLocaleString("pt-BR", { month: "short" })}
                      </span>
                      <span className="font-serif text-2xl font-bold leading-none">
                        {evento.dataInicio.getDate()}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-mar-escuro truncate">{evento.titulo}</p>
                      {evento.local && (
                        <p className="mt-0.5 text-xs text-mar-escuro/50 truncate">{evento.local}</p>
                      )}
                      <div className="mt-1 flex items-center gap-2">
                        {evento.categoria && (
                          <span className="text-xs text-mar-escuro/40">{evento.categoria}</span>
                        )}
                        <span className={`text-xs font-medium ${evento.publicado ? "text-mar-verde" : "text-amber-600"}`}>
                          {evento.publicado ? "publicado" : "rascunho"}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
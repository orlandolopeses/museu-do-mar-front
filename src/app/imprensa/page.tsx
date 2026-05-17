import type { Metadata } from "next";
import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { posts } from "@/lib/schema";
import { formatDate } from "@/lib/utils";
import { ArrowRight, Download, Mail, Newspaper, Users, MapPin, BookOpen } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Imprensa | Museu do Mar",
  description: "Informações institucionais, materiais de imprensa e contato para jornalistas e pesquisadores.",
};

async function getRecentPosts() {
  return db
    .select({ id: posts.id, slug: posts.slug, title: posts.title, summary: posts.summary, publishedAt: posts.publishedAt })
    .from(posts)
    .where(eq(posts.status, "publicado"))
    .orderBy(desc(posts.publishedAt))
    .limit(4);
}

export default async function ImprensaPage() {
  const recentPosts = await getRecentPosts();

  return (
    <div className="container-site py-16 px-4">
      <div className="mx-auto max-w-5xl">
        <div className="mb-12">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-mar-cobre">
            Sala de Imprensa
          </p>
          <h1 className="font-serif text-4xl font-bold text-mar-escuro md:text-5xl">
            Museu do Mar — Press Kit
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-mar-escuro/65">
            Recursos e informações para jornalistas, pesquisadores e parceiros institucionais que queiram divulgar ou aprofundar o trabalho do Ponto de Memória Museu do Mar.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-12">
          {[
            {
              icon: MapPin,
              label: "Localização",
              value: "Perocão, Guarapari/ES",
              sub: "Comunidade pesqueira no litoral sul capixaba",
            },
            {
              icon: Users,
              label: "Âncora institucional",
              value: "UFES / IFES",
              sub: "Projeto de extensão universitária territorial",
            },
            {
              icon: BookOpen,
              label: "Foco",
              value: "Memória, território e cultura do mar",
              sub: "Pescadores, marisqueiras, comunidade pesqueira",
            },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl border border-mar-areia/30 bg-white p-6">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-mar-azul/10">
                <item.icon className="h-5 w-5 text-mar-azul" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-mar-escuro/45">{item.label}</p>
              <p className="mt-1 font-serif text-lg font-bold text-mar-escuro">{item.value}</p>
              <p className="mt-1 text-sm text-mar-escuro/55">{item.sub}</p>
            </div>
          ))}
        </div>

        <div className="mb-12 grid gap-8 lg:grid-cols-2">
          <section>
            <h2 className="mb-4 font-serif text-2xl font-bold text-mar-escuro">Sobre o projeto</h2>
            <div className="space-y-4 text-sm leading-relaxed text-mar-escuro/70">
              <p>
                O Ponto de Memória Museu do Mar é um projeto cultural e educativo que atua na valorização das memórias, saberes e identidades das comunidades pesqueiras do litoral capixaba, com ênfase em Perocão, Guarapari/ES.
              </p>
              <p>
                Desenvolvido em articulação com a UFES, o IFES, escolas públicas da região e associações comunitárias, o projeto combina pesquisa etnográfica, produção audiovisual, ações educativas e preservação digital do acervo histórico local.
              </p>
              <p>
                Entre suas frentes principais estão: Biblioteca das Histórias do Mar, Cineclube Maratimba, TV Museu do Mar, Sarau do Mar e atividades pedagógicas com estudantes da rede pública.
              </p>
            </div>
          </section>

          <section>
            <h2 className="mb-4 font-serif text-2xl font-bold text-mar-escuro">Contato para imprensa</h2>
            <div className="space-y-4 rounded-2xl border border-mar-areia/30 bg-white p-6">
              <div className="flex items-start gap-3">
                <Mail className="mt-0.5 h-5 w-5 shrink-0 text-mar-azul" />
                <div>
                  <p className="font-medium text-mar-escuro">E-mail institucional</p>
                  <a href="mailto:museudomar.es@gmail.com" className="text-sm text-mar-azul hover:underline">
                    museudomar.es@gmail.com
                  </a>
                </div>
              </div>
              <p className="text-sm text-mar-escuro/55 leading-relaxed">
                Para entrevistas, participação em reportagens, solicitação de imagens ou informações adicionais sobre o projeto, entre em contato pelo e-mail ou pelo formulário de contato do site.
              </p>
              <Link href="/contato" className="inline-flex items-center gap-1.5 text-sm font-medium text-mar-azul hover:underline">
                Ir ao formulário de contato <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="mt-4 rounded-2xl border border-mar-areia/30 bg-white p-6">
              <div className="mb-3 flex items-center gap-2">
                <Download className="h-5 w-5 text-mar-cobre" />
                <p className="font-medium text-mar-escuro">Materiais disponíveis</p>
              </div>
              <ul className="space-y-2 text-sm text-mar-escuro/65">
                <li>· Logomarca do Museu do Mar (via contato)</li>
                <li>· Fotos institucionais do acervo (via contato)</li>
                <li>· Texto de apresentação para parceiros</li>
                <li>· Relatórios públicos de atividades</li>
              </ul>
            </div>
          </section>
        </div>

        {recentPosts.length > 0 && (
          <section>
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-mar-azul">
                <Newspaper className="h-4 w-4" />
                Publicações recentes
              </div>
              <Link href="/blog" className="inline-flex items-center gap-1 text-sm font-medium text-mar-azul">
                Ver todas <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {recentPosts.map((post) => (
                <Link
                  key={post.id}
                  href={`/blog/${post.slug}`}
                  className="rounded-2xl border border-mar-areia/30 bg-white p-5 transition-colors hover:border-mar-azul/30"
                >
                  <h3 className="font-serif text-lg font-bold text-mar-escuro">{post.title}</h3>
                  {post.summary && (
                    <p className="mt-1 text-sm text-mar-escuro/60 line-clamp-2">{post.summary}</p>
                  )}
                  {post.publishedAt && (
                    <p className="mt-3 text-xs text-mar-escuro/40">{formatDate(post.publishedAt)}</p>
                  )}
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

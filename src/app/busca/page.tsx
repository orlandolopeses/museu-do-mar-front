import type { Metadata } from "next";
import Link from "next/link";
import { ilike, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { posts, acervo, forumTopicos } from "@/lib/schema";
import { formatDate } from "@/lib/utils";
import { Search, FileText, ImageIcon, MessageSquare } from "lucide-react";

export const metadata: Metadata = { title: "Busca | Museu do Mar" };

type SearchParamsInput = Promise<Record<string, string | string[] | undefined>>;

async function searchAll(q: string) {
  const pattern = `%${q}%`;

  const [resultPosts, resultAcervo, resultForum] = await Promise.all([
    db
      .select({ id: posts.id, slug: posts.slug, title: posts.title, summary: posts.summary, publishedAt: posts.publishedAt })
      .from(posts)
      .where(
        or(
          ilike(posts.title, pattern),
          ilike(posts.summary, pattern),
        ),
      )
      .limit(10),

    db
      .select({ id: acervo.id, titulo: acervo.titulo, descricao: acervo.descricao, tipo: acervo.tipo, ano: acervo.ano })
      .from(acervo)
      .where(
        or(
          ilike(acervo.titulo, pattern),
          ilike(acervo.descricao, pattern),
          ilike(acervo.tags, pattern),
        ),
      )
      .limit(10),

    db
      .select({ id: forumTopicos.id, titulo: forumTopicos.titulo, conteudo: forumTopicos.conteudo, autorNome: forumTopicos.autorNome, createdAt: forumTopicos.createdAt })
      .from(forumTopicos)
      .where(
        or(
          ilike(forumTopicos.titulo, pattern),
          ilike(forumTopicos.conteudo, pattern),
        ),
      )
      .limit(6),
  ]);

  return { resultPosts, resultAcervo, resultForum };
}

export default async function BuscaPage({ searchParams }: { searchParams: SearchParamsInput }) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim() : "";
  const results = q.length >= 2 ? await searchAll(q) : null;
  const total = results
    ? results.resultPosts.length + results.resultAcervo.length + results.resultForum.length
    : 0;

  return (
    <div className="container-site py-16 px-4">
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-8 font-serif text-4xl font-bold text-mar-escuro">Buscar</h1>

        <form method="GET" className="mb-10 flex gap-3">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-mar-escuro/35" />
            <input
              type="search"
              name="q"
              defaultValue={q}
              autoFocus
              placeholder="Buscar no blog, acervo e fórum..."
              className="w-full rounded-2xl border border-mar-areia/40 bg-white py-3 pl-12 pr-4 text-sm shadow-sm focus:border-mar-azul focus:outline-none focus:ring-1 focus:ring-mar-azul"
            />
          </div>
          <button type="submit" className="btn-primary shrink-0">
            Buscar
          </button>
        </form>

        {q.length > 0 && q.length < 2 && (
          <p className="text-sm text-mar-escuro/50">Digite ao menos 2 caracteres para buscar.</p>
        )}

        {results && q.length >= 2 && (
          <div className="space-y-10">
            {total === 0 ? (
              <p className="text-mar-escuro/55">
                Nenhum resultado encontrado para <strong>{q}</strong>.
              </p>
            ) : (
              <p className="text-sm text-mar-escuro/50">
                {total} resultado{total !== 1 ? "s" : ""} para <strong>{q}</strong>
              </p>
            )}

            {results.resultPosts.length > 0 && (
              <section>
                <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-mar-azul">
                  <FileText className="h-4 w-4" />
                  Blog — {results.resultPosts.length} resultado{results.resultPosts.length !== 1 ? "s" : ""}
                </div>
                <div className="space-y-3">
                  {results.resultPosts.map((post) => (
                    <Link
                      key={post.id}
                      href={`/blog/${post.slug}`}
                      className="block rounded-2xl border border-mar-areia/30 bg-white p-5 transition-colors hover:border-mar-azul/30"
                    >
                      <h2 className="font-serif text-lg font-bold text-mar-escuro">{post.title}</h2>
                      {post.summary && (
                        <p className="mt-1 text-sm text-mar-escuro/60 line-clamp-2">{post.summary}</p>
                      )}
                      {post.publishedAt && (
                        <p className="mt-2 text-xs text-mar-escuro/40">{formatDate(post.publishedAt)}</p>
                      )}
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {results.resultAcervo.length > 0 && (
              <section>
                <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-mar-cobre">
                  <ImageIcon className="h-4 w-4" />
                  Acervo — {results.resultAcervo.length} resultado{results.resultAcervo.length !== 1 ? "s" : ""}
                </div>
                <div className="space-y-3">
                  {results.resultAcervo.map((item) => (
                    <Link
                      key={item.id}
                      href={`/acervo/${item.id}`}
                      className="block rounded-2xl border border-mar-areia/30 bg-white p-5 transition-colors hover:border-mar-cobre/30"
                    >
                      <h2 className="font-serif text-lg font-bold text-mar-escuro">{item.titulo}</h2>
                      {item.descricao && (
                        <p className="mt-1 text-sm text-mar-escuro/60 line-clamp-2">{item.descricao}</p>
                      )}
                      <div className="mt-2 flex items-center gap-3">
                        <span className="text-xs uppercase tracking-wide text-mar-escuro/40">{item.tipo}</span>
                        {item.ano && <span className="text-xs text-mar-escuro/40">{item.ano}</span>}
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {results.resultForum.length > 0 && (
              <section>
                <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-mar-verde">
                  <MessageSquare className="h-4 w-4" />
                  Fórum — {results.resultForum.length} resultado{results.resultForum.length !== 1 ? "s" : ""}
                </div>
                <div className="space-y-3">
                  {results.resultForum.map((topico) => (
                    <Link
                      key={topico.id}
                      href={`/forum/${topico.id}`}
                      className="block rounded-2xl border border-mar-areia/30 bg-white p-5 transition-colors hover:border-mar-verde/30"
                    >
                      <h2 className="font-serif text-lg font-bold text-mar-escuro">{topico.titulo}</h2>
                      <p className="mt-1 text-sm text-mar-escuro/60 line-clamp-2">{topico.conteudo}</p>
                      <p className="mt-2 text-xs text-mar-escuro/40">
                        {topico.autorNome} · {formatDate(topico.createdAt)}
                      </p>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {!q && (
          <p className="text-sm text-mar-escuro/45">
            Digite um termo para buscar publicações do blog, itens do acervo e tópicos do fórum.
          </p>
        )}
      </div>
    </div>
  );
}

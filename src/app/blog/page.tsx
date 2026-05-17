import type { Metadata } from "next";
import { db } from "@/lib/db";
import { posts } from "@/lib/schema";
import { desc, eq } from "drizzle-orm";
import { formatDate, truncate } from "@/lib/utils";
import { BookOpen, ArrowRight, PenSquare, ScrollText } from "lucide-react";
import Link from "next/link";
import { RemoteImage } from "@/components/ui/RemoteImage";

export const metadata: Metadata = {
  title: "Blog",
  description: "Notícias, artigos e histórias do Museu do Mar na RNG.",
};

async function getPosts() {
  try {
    return await db
      .select()
      .from(posts)
      .where(eq(posts.status, "publicado"))
      .orderBy(desc(posts.publishedAt));
  } catch {
    return [];
  }
}

export default async function BlogPage() {
  const items = await getPosts();

  return (
    <div className="py-12">
      <div className="container-site">
        <div className="mb-10 max-w-4xl">
          <div className="section-eyebrow">
            <PenSquare className="h-4 w-4" />
            <span>Caderno editorial</span>
          </div>
          <h1 className="section-title">Blog</h1>
          <p className="section-subtitle">
            Artigos, relatos e textos curatoriais que aprofundam a relação entre memória, território,
            cultura pesqueira e patrimônio vivo.
          </p>
        </div>

        <div className="surface-panel mb-8 grid gap-6 p-6 md:grid-cols-[1.3fr,0.9fr]">
          <div>
            <h2 className="mb-2 font-serif text-2xl font-bold text-mar-azul">Leitura pública do projeto</h2>
            <p className="text-sm leading-relaxed text-mar-escuro/72">
              O blog funciona como espaço de mediação cultural do Museu do Mar: apresenta o projeto,
              interpreta o território e amplia o acesso público às narrativas ligadas a Perocão.
            </p>
          </div>
          <div className="flex items-start gap-3 rounded-xl bg-mar-azul/5 p-4">
            <ScrollText className="mt-1 h-5 w-5 text-mar-azul" />
            <p className="text-sm leading-relaxed text-mar-escuro/70">
              A escrita deve manter rigor cultural, proximidade comunitária e beleza sóbria.
            </p>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="py-24 text-center text-mar-escuro/40">
            <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="font-serif text-xl mb-2">Nenhuma publicação ainda</p>
            <p className="text-sm">O blog será atualizado com notícias e histórias em breve.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl">
            {items.map((post, i) => (
              <Link
                key={post.id}
                href={`/blog/${post.slug}`}
                className={`card group ${i === 0 ? "md:col-span-2 lg:col-span-1" : ""}`}
              >
                {post.coverImage ? (
                  <div className="aspect-video overflow-hidden">
                    <RemoteImage
                      src={post.coverImage}
                      alt={post.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                ) : (
                  <div className="aspect-video bg-mar-azul/5 flex items-center justify-center">
                    <BookOpen className="w-8 h-8 text-mar-azul/20" />
                  </div>
                )}
                <div className="p-5">
                  <p className="text-xs text-mar-escuro/40 mb-2">{formatDate(post.publishedAt)}</p>
                  <h2 className="font-serif font-bold text-mar-escuro group-hover:text-mar-azul transition-colors leading-snug mb-2">
                    {post.title}
                  </h2>
                  {post.summary && (
                    <p className="text-sm text-mar-escuro/60 leading-relaxed">
                      {truncate(post.summary, 120)}
                    </p>
                  )}
                  <div className="mt-4 flex items-center gap-1 text-sm font-medium text-mar-azul transition-all group-hover:gap-2">
                    Ler mais <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

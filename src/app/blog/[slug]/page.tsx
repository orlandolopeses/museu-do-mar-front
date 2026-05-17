import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { posts } from "@/lib/schema";
import { formatDate } from "@/lib/utils";
import { ArrowLeft, BookOpen, PenSquare } from "lucide-react";
import Link from "next/link";
import { RemoteImage } from "@/components/ui/RemoteImage";

type BlogPostPageProps = {
  params: {
    slug: string;
  };
};

async function getPost(slug: string) {
  const [post] = await db
    .select()
    .from(posts)
    .where(and(eq(posts.slug, slug), eq(posts.status, "publicado")))
    .limit(1);

  return post;
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const post = await getPost(params.slug);

  if (!post) {
    return {
      title: "Post não encontrado",
    };
  }

  return {
    title: post.title,
    description: post.summary ?? undefined,
  };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const post = await getPost(params.slug);

  if (!post) notFound();

  return (
    <div className="py-12">
      <div className="container-site max-w-4xl">
        <Link
          href="/blog"
          className="inline-flex items-center gap-2 text-sm text-mar-azul hover:text-mar-azul_claro mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para o blog
        </Link>

        <article className="overflow-hidden rounded-2xl border border-mar-areia/30 bg-white">
          {post.coverImage ? (
            <div className="aspect-[16/7] bg-mar-azul/5 overflow-hidden">
              <RemoteImage src={post.coverImage} alt={post.title} className="w-full h-full object-cover" loading="eager" />
            </div>
          ) : (
            <div className="aspect-[16/7] bg-mar-azul/5 flex items-center justify-center">
              <BookOpen className="w-12 h-12 text-mar-azul/20" />
            </div>
          )}

          <div className="p-6 md:p-10">
            <div className="section-eyebrow mb-4">
              <PenSquare className="h-4 w-4" />
              <span>Caderno editorial</span>
            </div>
            <p className="text-sm text-mar-escuro/40 mb-3">{formatDate(post.publishedAt ?? post.createdAt)}</p>
            <h1 className="font-serif text-3xl md:text-5xl font-bold text-mar-escuro leading-tight mb-4">
              {post.title}
            </h1>

            {post.summary && (
              <p className="text-lg text-mar-escuro/70 leading-relaxed mb-8">{post.summary}</p>
            )}

            <div className="surface-panel mb-8 p-5">
              <p className="text-sm leading-relaxed text-mar-escuro/72">
                Este texto integra a mediação pública do Museu do Mar, ampliando o acesso às narrativas do
                território, da cultura pesqueira e da memória comunitária.
              </p>
            </div>

            <div className="prose-museu">
              {post.content.split(/\n{2,}/).map((paragraph, index) => (
                <p key={`${post.id}-${index}`} className="whitespace-pre-wrap">
                  {paragraph}
                </p>
              ))}
            </div>
          </div>
        </article>
      </div>
    </div>
  );
}

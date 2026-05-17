import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { and, eq, ne } from "drizzle-orm";
import { ArrowLeft, Camera, ExternalLink, FileText, Film, Music, Archive, Tags } from "lucide-react";
import Link from "next/link";
import { db } from "@/lib/db";
import { acervo } from "@/lib/schema";
import { RemoteImage } from "@/components/ui/RemoteImage";

type AcervoItemPageProps = {
  params: {
    id: string;
  };
};

const TIPO_LABELS = {
  foto: "Foto",
  video: "Vídeo",
  audio: "Áudio",
  documento: "Documento",
};

const TIPO_ICONS = {
  foto: Camera,
  video: Film,
  audio: Music,
  documento: FileText,
};

const getItem = cache(async function getItem(id: string) {
  const [item] = await db
    .select()
    .from(acervo)
    .where(and(eq(acervo.id, id), eq(acervo.publicado, true)))
    .limit(1);

  return item;
});

async function getRelatedItems(item: NonNullable<Awaited<ReturnType<typeof getItem>>>) {
  const colecaoFilter = item.colecao
    ? eq(acervo.colecao, item.colecao)
    : eq(acervo.tipo, item.tipo);

  return db
    .select({
      id: acervo.id,
      titulo: acervo.titulo,
      tipo: acervo.tipo,
      colecao: acervo.colecao,
      autor: acervo.autor,
      ano: acervo.ano,
      thumbUrl: acervo.thumbUrl,
    })
    .from(acervo)
    .where(and(eq(acervo.publicado, true), ne(acervo.id, item.id), colecaoFilter))
    .limit(4);
}

function getTags(tags: string | null) {
  return (tags ?? "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export async function generateMetadata({ params }: AcervoItemPageProps): Promise<Metadata> {
  const item = await getItem(params.id);

  if (!item) {
    return {
      title: "Item do acervo não encontrado",
    };
  }

  return {
    title: item.titulo,
    description: item.descricao ?? undefined,
  };
}

export default async function AcervoItemPage({ params }: AcervoItemPageProps) {
  const item = await getItem(params.id);

  if (!item) notFound();

  const related = await getRelatedItems(item);

  const Icon = TIPO_ICONS[item.tipo] ?? Camera;
  const tags = getTags(item.tags);
  const previewImage = item.thumbUrl || (item.tipo === "foto" ? item.url : null);

  return (
    <div className="py-12">
      <div className="container-site max-w-5xl">
        <Link
          href="/acervo"
          className="inline-flex items-center gap-2 text-sm text-mar-azul hover:text-mar-azul_claro mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para o acervo
        </Link>

        <article className="grid gap-8 rounded-2xl border border-mar-areia/30 bg-white p-6 md:p-8 lg:grid-cols-[1.2fr,0.8fr]">
          <div>
            <div className="mb-6 flex aspect-[4/3] items-center justify-center overflow-hidden rounded-2xl bg-mar-azul/5">
              {previewImage ? (
                <RemoteImage src={previewImage} alt={item.titulo} className="w-full h-full object-cover" loading="eager" />
              ) : item.tipo === "video" ? (
                <video src={item.url} controls className="w-full h-full" />
              ) : item.tipo === "audio" ? (
                <div className="w-full h-full flex flex-col items-center justify-center gap-4 p-8">
                  <Music className="w-14 h-14 text-mar-azul/30" />
                  <audio src={item.url} controls className="w-full max-w-md" />
                </div>
              ) : (
                <div className="text-center p-8">
                  <Icon className="w-14 h-14 text-mar-azul/30 mx-auto mb-4" />
                  <p className="text-sm text-mar-escuro/55">Pré-visualização indisponível para este item.</p>
                </div>
              )}
            </div>

            {item.descricao && (
              <div className="prose-museu max-w-none">
                {item.descricao.split(/\n{2,}/).map((paragraph, index) => (
                  <p key={`${item.id}-${index}`} className="whitespace-pre-wrap">
                    {paragraph}
                  </p>
                ))}
              </div>
            )}
          </div>

          <aside className="space-y-6">
            <div>
              <div className="section-eyebrow mb-3">
                <Archive className="h-4 w-4" />
                <span>Item de acervo</span>
              </div>
              <span className="badge-azul text-xs mb-3 inline-flex">{TIPO_LABELS[item.tipo]}</span>
              <h1 className="font-serif text-3xl font-bold text-mar-escuro leading-tight">{item.titulo}</h1>
            </div>

            <div className="surface-panel p-5">
              <p className="text-sm leading-relaxed text-mar-escuro/72">
                Este registro integra o acervo vivo do Museu do Mar e contribui para a leitura pública das
                relações entre território, memória, cultura material e saberes das comunidades do mar.
              </p>
            </div>

            <div className="grid gap-3 text-sm text-mar-escuro/70">
              {item.colecao && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-mar-escuro/40 mb-1">Coleção</p>
                  <p>{item.colecao}</p>
                </div>
              )}
              {item.autor && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-mar-escuro/40 mb-1">Autor / origem</p>
                  <p>{item.autor}</p>
                </div>
              )}
              {item.ano && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-mar-escuro/40 mb-1">Ano</p>
                  <p>{item.ano}</p>
                </div>
              )}
            </div>

            {tags.length > 0 && (
              <div>
                <p className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wide text-mar-escuro/40">
                  <Tags className="h-3.5 w-3.5" />
                  <span>Tags</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <span key={tag} className="badge bg-mar-azul/10 text-mar-azul">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <a
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className="btn-primary w-full justify-center"
            >
              <ExternalLink className="w-4 h-4" />
              Abrir arquivo original
            </a>
          </aside>
        </article>

        {related.length > 0 && (
          <section className="mt-12">
            <h2 className="font-serif text-xl font-bold text-mar-escuro mb-6">Mais do acervo</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {related.map((r) => {
                const RIcon = TIPO_ICONS[r.tipo] ?? Camera;
                return (
                  <Link
                    key={r.id}
                    href={`/acervo/${r.id}`}
                    className="group flex flex-col overflow-hidden rounded-2xl border border-mar-areia/30 bg-white transition-shadow hover:shadow-md"
                  >
                    <div className="flex aspect-[4/3] items-center justify-center bg-mar-azul/5">
                      {r.thumbUrl ? (
                        <RemoteImage
                          src={r.thumbUrl}
                          alt={r.titulo}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <RIcon className="w-10 h-10 text-mar-azul/30" />
                      )}
                    </div>
                    <div className="p-4 flex flex-col gap-1">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-mar-cobre">
                        {TIPO_LABELS[r.tipo]}
                        {r.colecao && ` · ${r.colecao}`}
                      </span>
                      <p className="text-sm font-semibold text-mar-escuro line-clamp-2 group-hover:text-mar-azul transition-colors">
                        {r.titulo}
                      </p>
                      {r.ano && (
                        <p className="text-xs text-mar-escuro/50">{r.ano}</p>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

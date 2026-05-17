import type { Metadata } from "next";
import { db } from "@/lib/db";
import { acervo } from "@/lib/schema";
import { desc, eq } from "drizzle-orm";
import { Camera, Film, Music, FileText, Archive, Tags, FlaskConical, ArrowRight } from "lucide-react";
import Link from "next/link";
import { RemoteImage } from "@/components/ui/RemoteImage";

export const metadata: Metadata = {
  title: "Acervo Digital",
  description: "Fotos, vídeos, áudios e documentos do patrimônio cultural da Aldeia de Perocão.",
};

const TIPO_ICONS = {
  foto: Camera,
  video: Film,
  audio: Music,
  documento: FileText,
};

const TIPO_LABELS = {
  foto: "Foto",
  video: "Vídeo",
  audio: "Áudio",
  documento: "Documento",
};

async function getAcervo() {
  try {
    return await db
      .select()
      .from(acervo)
      .where(eq(acervo.publicado, true))
      .orderBy(desc(acervo.createdAt));
  } catch {
    return [];
  }
}

export default async function AcervoPage() {
  const items = await getAcervo();

  const fotos = items.filter((i) => i.tipo === "foto");
  const videos = items.filter((i) => i.tipo === "video");
  const audios = items.filter((i) => i.tipo === "audio");
  const docs = items.filter((i) => i.tipo === "documento");

  return (
    <div className="py-12">
      <div className="container-site">
        <div className="mb-10 max-w-4xl">
          <div className="section-eyebrow">
            <Archive className="h-4 w-4" />
            <span>Acervo vivo</span>
          </div>
          <h1 className="section-title">Acervo Digital</h1>
          <p className="section-subtitle">
            Registros visuais, sonoros e documentais que ajudam a preservar as paisagens, os ofícios,
            os objetos e as memórias da Aldeia de Perocão.
          </p>

          {/* Stats */}
          <div className="flex flex-wrap gap-4 mt-6">
            {[
              { icon: Camera, label: "Fotos", count: fotos.length, color: "text-mar-azul bg-mar-azul/10" },
              { icon: Film, label: "Vídeos", count: videos.length, color: "text-mar-verde bg-mar-verde/10" },
              { icon: Music, label: "Áudios", count: audios.length, color: "text-mar-cobre bg-mar-cobre/10" },
              { icon: FileText, label: "Documentos", count: docs.length, color: "text-mar-azul_claro bg-mar-azul_claro/10" },
            ].map((stat) => (
              <div key={stat.label} className={`flex items-center gap-2 px-4 py-2 rounded-lg ${stat.color}`}>
                <stat.icon className="w-4 h-4" />
                <span className="text-sm font-medium">{stat.count} {stat.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="surface-panel mb-8 grid gap-6 p-6 md:grid-cols-[1.4fr,0.8fr]">
          <div>
            <h2 className="mb-2 font-serif text-2xl font-bold text-mar-azul">Coleções em construção</h2>
            <p className="text-sm leading-relaxed text-mar-escuro/72">
              O acervo do Museu do Mar está sendo organizado como patrimônio vivo. Cada item ajuda a compor
              uma leitura mais ampla do território, da cultura pesqueira, das histórias comunitárias e das
              transformações costeiras de Perocão.
            </p>
          </div>
          <div>
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-mar-cobre">
              <Tags className="h-4 w-4" />
              <span>Temas prioritários</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                "pesca-artesanal",
                "território",
                "memória-oral",
                "paisagem-costeira",
                "patrimônio-cultural",
              ].map((tag) => (
                <span key={tag} className="badge bg-mar-areia/12 text-mar-cobre">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="mb-8 rounded-2xl border border-amber-300/60 bg-amber-50/70 p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-amber-900">Laboratorio de prototipos</p>
              <h2 className="mt-1 font-serif text-2xl font-bold text-mar-escuro">Gincanas piloto em teste</h2>
              <p className="mt-2 text-sm text-mar-escuro/75">
                Acesse o menu de experimentos em <strong>/acervo/laboratorio</strong> para navegar pelas paginas piloto em homologacao.
              </p>
            </div>
            <Link href="/acervo/laboratorio" className="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-white px-4 py-2 text-sm font-semibold text-amber-900 hover:bg-amber-100">
              <FlaskConical className="h-4 w-4" />
              Abrir laboratorio
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="py-24 text-center text-mar-escuro/40">
            <Camera className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="font-serif text-xl mb-2">Acervo em construção</p>
            <p className="text-sm">Em breve, fotos, vídeos e documentos históricos estarão disponíveis aqui.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {items.map((item) => {
              const Icon = TIPO_ICONS[item.tipo as keyof typeof TIPO_ICONS] ?? Camera;
              return (
                <Link key={item.id} href={`/acervo/${item.id}`} className="card group">
                  <div className="relative aspect-video overflow-hidden bg-mar-azul/5">
                    {item.url && item.tipo === "foto" ? (
                      <RemoteImage
                        src={item.url}
                        alt={item.titulo}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Icon className="w-8 h-8 text-mar-azul/30" />
                      </div>
                    )}
                    <div className="absolute top-2 left-2">
                      <span className="badge-azul text-xs">{TIPO_LABELS[item.tipo as keyof typeof TIPO_LABELS]}</span>
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="line-clamp-2 text-sm font-medium text-mar-escuro transition-colors group-hover:text-mar-azul">
                      {item.titulo}
                    </h3>
                    {item.colecao && (
                      <p className="mt-2 text-xs uppercase tracking-[0.18em] text-mar-cobre/80">{item.colecao}</p>
                    )}
                    {item.ano && (
                      <p className="text-xs text-mar-escuro/40 mt-1">{item.ano}</p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

import Link from "next/link";
import { AlertTriangle, ExternalLink, FlaskConical, MapPin } from "lucide-react";

export const metadata = {
  title: "Acervo | Laboratorio",
  description: "Menu de paginas piloto e prototipos em homologacao do Museu do Mar.",
};

const pilots = [
  {
    slug: "perocao",
    title: "Tesouros de Perocao",
    summary: "Piloto territorial com foco em memoria comunitaria, pesca artesanal e manguezal.",
  },
  {
    slug: "anchieta",
    title: "O Enigma de Rerigtiba",
    summary: "Piloto historico sobre patrimonio, monumentos e leitura publica do territorio.",
  },
  {
    slug: "piuma",
    title: "O Misterio das Conchas",
    summary: "Piloto ecologico-cultural com biodiversidade, ilhas e artesanato local.",
  },
] as const;

export default function AcervoLaboratorioPage() {
  return (
    <div className="py-12">
      <div className="container-site">
        <div className="mb-8 max-w-4xl">
          <div className="section-eyebrow">
            <FlaskConical className="h-4 w-4" />
            <span>Acervo laboratorio</span>
          </div>
          <h1 className="section-title">Menu de gincanas piloto</h1>
          <p className="section-subtitle">
            Este espaco centraliza paginas experimentais usadas em validacao de campo e testes de narrativa.
          </p>
        </div>

        <section className="mb-8 rounded-3xl border border-amber-300/70 bg-amber-50/80 p-6 shadow-sm">
          <p className="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-white px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-amber-900">
            <AlertTriangle className="h-3.5 w-3.5" />
            Versoes de teste em destaque
          </p>
          <p className="mt-3 text-sm text-mar-escuro/75">
            As paginas abaixo estao em homologacao e podem ser alteradas no decorrer da implementacao do projeto.
            Elas tambem podem ser acessadas no dominio publico https://museudomares.duckdns.org.
          </p>
        </section>

        <div className="grid gap-4 md:grid-cols-3">
          {pilots.map((pilot) => {
            const localHref = `/participar/gincanas/${pilot.slug}`;
            const domainHref = `https://museudomares.duckdns.org/participar/gincanas/${pilot.slug}`;

            return (
              <article key={pilot.slug} className="rounded-2xl border border-mar-areia/35 bg-white p-5 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-mar-cobre">Gincana piloto</p>
                <h2 className="mt-1 font-serif text-2xl font-bold text-mar-escuro">{pilot.title}</h2>
                <p className="mt-2 text-sm text-mar-escuro/70">{pilot.summary}</p>

                <div className="mt-5 flex flex-wrap gap-2">
                  <Link href={localHref} className="btn-secondary">
                    Abrir pagina
                  </Link>
                  <a
                    href={domainHref}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded-lg border border-mar-azul/30 px-3 py-2 text-xs font-semibold text-mar-azul hover:bg-mar-azul/5"
                  >
                    Abrir no dominio <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>

                <p className="mt-4 inline-flex items-center gap-1 text-xs text-mar-escuro/55">
                  <MapPin className="h-3.5 w-3.5" />
                  Rota: {localHref}
                </p>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}

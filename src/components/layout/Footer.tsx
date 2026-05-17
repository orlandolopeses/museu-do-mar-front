import Link from "next/link";
import { MapPin, Mail } from "lucide-react";
import { BrandMark } from "@/components/layout/BrandMark";

export function Footer() {
  return (
    <footer className="mt-auto bg-mar-escuro text-white/80">
      <div className="border-t border-mar-areia/10 bg-[linear-gradient(180deg,rgba(212,169,106,0.06),rgba(13,33,55,0))]">
        <div className="container-site py-12">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {/* Identidade */}
          <div>
            <BrandMark className="mb-4" />
            <p className="text-sm leading-relaxed text-white/72">
              Ponto de Memória da Aldeia de Perocão, em Guarapari/ES. Um espaço de preservação,
              escuta e circulação das memórias, dos saberes e das paisagens culturais do mar.
            </p>
          </div>

          {/* Links */}
          <div>
            <h3 className="font-serif font-bold text-white mb-3">Navegação</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/sobre" className="hover:text-mar-areia transition-colors">
                  Sobre o Projeto
                </Link>
                <ul className="mt-2 space-y-2 border-l border-white/10 pl-4 text-white/65">
                  <li>
                    <Link href="/roadmap" className="hover:text-mar-areia transition-colors">
                      Roadmap de Implementação
                    </Link>
                  </li>
                </ul>
              </li>
              {[
                { href: "/acervo", label: "Acervo Digital" },
                { href: "/agenda", label: "Agenda de Eventos" },
                { href: "/blog", label: "Blog e Notícias" },
                { href: "/forum", label: "Fórum da Comunidade" },
                { href: "/contato", label: "Contato" },
              ].map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="hover:text-mar-areia transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contato */}
          <div>
            <h3 className="font-serif font-bold text-white mb-3">Localização</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-mar-areia mt-0.5 shrink-0" />
                <span>Aldeia de Perocão, Guarapari — Espírito Santo, Brasil</span>
              </li>
              <li className="flex items-start gap-2">
                <Mail className="w-4 h-4 text-mar-areia mt-0.5 shrink-0" />
                <a href="mailto:museudomar.es@gmail.com" className="hover:text-mar-areia transition-colors">
                  museudomar.es@gmail.com
                </a>
              </li>
            </ul>

            <div className="mt-6 text-xs text-white/40">
              <p>Realização: UFES · IFES · Associação Sinestesia</p>
              <p className="mt-1">Apoio: FAPES — Edital 04/2025</p>
            </div>
          </div>
          </div>

          <div className="mt-8 border-t border-white/10 pt-6 text-center text-xs text-white/40">
            © {new Date().getFullYear()} Museu do Mar. Memória viva das culturas do mar.
          </div>
        </div>
      </div>
    </footer>
  );
}

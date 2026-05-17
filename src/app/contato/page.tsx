import type { Metadata } from "next";
import { MapPin, Mail, MessagesSquare, Archive, HandHeart } from "lucide-react";
import { ContatoForm } from "./ContatoForm";

export const metadata: Metadata = {
  title: "Contato",
  description: "Entre em contato com o Museu do Mar na RNG.",
};

export default function ContatoPage() {
  return (
    <div className="py-12">
      <div className="container-site">
        <div className="mb-10 max-w-4xl">
          <div className="section-eyebrow">
            <MessagesSquare className="h-4 w-4" />
            <span>Canal institucional</span>
          </div>
          <h1 className="section-title">Contato</h1>
          <p className="section-subtitle">
            Entre em contato para tirar dúvidas, compartilhar referências ou contribuir com memórias,
            documentos e materiais ligados ao Museu do Mar.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Form */}
          <div className="lg:col-span-2">
            <div className="surface-panel p-6 md:p-8">
              <h2 className="font-serif text-xl font-bold text-mar-azul mb-6">Envie uma mensagem</h2>
              <ContatoForm />
            </div>
          </div>

          {/* Info */}
          <div className="space-y-4">
            <div className="surface-panel p-6">
              <h3 className="font-serif font-bold text-mar-azul mb-4">Informações</h3>
              <ul className="space-y-4 text-sm">
                <li className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-mar-azul mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-mar-escuro">Endereço</p>
                    <p className="text-mar-escuro/60 mt-0.5">
                      Aldeia de Perocão<br />
                      Guarapari — ES, Brasil
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <Mail className="w-4 h-4 text-mar-azul mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-mar-escuro">E-mail</p>
                    <a
                      href="mailto:museudomar.es@gmail.com"
                      className="text-mar-azul_claro hover:underline mt-0.5 block"
                    >
                      museudomar.es@gmail.com
                    </a>
                  </div>
                </li>
              </ul>
            </div>

            <div className="surface-panel p-6">
              <h3 className="mb-2 flex items-center gap-2 font-serif font-bold text-mar-azul">
                <Archive className="h-5 w-5" /> Apoio à pesquisa e ao acervo
              </h3>
              <p className="text-sm text-mar-escuro/70 leading-relaxed">
                Se você tem fotos, documentos ou histórias para compartilhar conosco,
                entre em contato. Seu registro pode fazer parte do nosso acervo digital.
              </p>
            </div>

            <div className="rounded-xl border border-mar-verde/20 bg-mar-verde/5 p-6">
              <h3 className="mb-2 flex items-center gap-2 font-serif font-bold text-mar-verde">
                <HandHeart className="h-5 w-5" /> Contribuição comunitária
              </h3>
              <p className="text-sm leading-relaxed text-mar-escuro/70">
                O Museu do Mar valoriza relatos, imagens, nomes de lugares, referências de festas,
                práticas de pesca e memórias familiares que ajudem a fortalecer o vínculo com Perocão.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

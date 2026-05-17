import type { Metadata } from "next";
import { Anchor, Users, BookOpen, MapPin, Waves, Shell, Landmark } from "lucide-react";

export const metadata: Metadata = {
  title: "Sobre o Projeto",
  description: "Conheça o Ponto de Memória Museu do Mar na Rede de Núcleos de Guarapari.",
};

export default function SobrePage() {
  return (
    <div className="py-12">
      <div className="container-site">
        {/* Header */}
        <div className="mb-12 max-w-4xl">
          <div className="section-eyebrow">
            <Anchor className="w-4 h-4" />
            <span>Quem somos</span>
          </div>
          <h1 className="font-serif text-4xl md:text-5xl font-bold text-mar-azul mb-4">
            Museu do Mar
          </h1>
          <p className="text-mar-escuro/70 text-xl leading-relaxed">
            Um ponto de memória dedicado a preservar, ativar e compartilhar os saberes, as paisagens
            e as histórias das culturas do mar a partir da Aldeia de Perocão, em Guarapari/ES.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Conteúdo principal */}
          <div className="lg:col-span-2 prose-museu">
            <h2>O Projeto</h2>
            <p>
              O <strong>Museu do Mar</strong> é um Ponto de Memória voltado à preservação, pesquisa e difusão
              do patrimônio cultural das comunidades pesqueiras do litoral capixaba, com foco na
              <strong> Aldeia de Perocão</strong>, em Guarapari/ES.
            </p>
            <p>
              O projeto integra ações de extensão universitária, pesquisa acadêmica e engajamento comunitário,
              reunindo moradores, pescadores, pesquisadores e estudantes em torno da memória coletiva local.
            </p>
            <blockquote>
              O mar é entendido aqui como cultura, trabalho, paisagem e memória viva — não apenas como cenário.
            </blockquote>

            <h2>Objetivos</h2>
            <ul>
              <li>Catalogar e digitalizar o acervo histórico e cultural da Aldeia de Perocão</li>
              <li>Promover rodas de memória e escuta com os moradores mais antigos</li>
              <li>Produzir conteúdo audiovisual sobre a cultura pesqueira local</li>
              <li>Integrar o museu à rede de pontos de memória do Espírito Santo</li>
              <li>Fomentar a educação patrimonial nas escolas da região</li>
            </ul>

            <h2>Saberes do mar</h2>
            <p>
              O Museu do Mar reconhece a cultura pesqueira de Perocão como patrimônio vivo. Mais do que
              registrar objetos e imagens, o projeto busca preservar técnicas, gestos, vocabulários,
              memórias de trabalho e formas de relação com o mar transmitidas entre gerações.
            </p>

            <h2>Território em transformação</h2>
            <p>
              O território costeiro de Guarapari passou por intensas transformações ambientais, urbanas e
              econômicas. Registrar essas mudanças também faz parte da missão do projeto, para que a memória
              local não se perca diante de processos de invisibilização e deslocamento cultural.
            </p>

            <h2>Território</h2>
            <p>
              A Aldeia de Perocão é uma comunidade tradicional de pescadores localizada no município de
              Guarapari, litoral sul do Espírito Santo. Com forte identidade cultural, a aldeia mantém
              práticas ancestrais de pesca artesanal e uma rica tradição oral que este projeto busca
              preservar para as próximas gerações.
            </p>

            <h2>Memória, educação e futuro</h2>
            <p>
              O ponto de memória articula patrimônio cultural, pesquisa e educação patrimonial. Seu papel não
              é apenas guardar o passado, mas fortalecer o vínculo das novas gerações com o território, os
              saberes tradicionais e os desafios do presente.
            </p>

            <h2>Financiamento</h2>
            <p>
              O projeto é apoiado pela <strong>FAPES — Fundação de Amparo à Pesquisa e Inovação do
              Espírito Santo</strong>, por meio do Edital 04/2025, modalidade Extensão Universitária.
            </p>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="surface-panel p-6">
              <h3 className="mb-4 flex items-center gap-2 font-serif font-bold text-mar-azul">
                <Waves className="w-5 h-5" /> Eixos de marca
              </h3>
              <ul className="space-y-3 text-sm text-mar-escuro/75">
                <li>Memória viva das culturas do mar</li>
                <li>Patrimônio costeiro e comunitário</li>
                <li>Educação, escuta e participação</li>
              </ul>
            </div>

            {/* Parceiros */}
            <div className="surface-panel p-6">
              <h3 className="font-serif font-bold text-mar-azul mb-4 flex items-center gap-2">
                <Users className="w-5 h-5" /> Realização
              </h3>
              <ul className="space-y-3 text-sm">
                <li className="border-b border-mar-areia/20 pb-3">
                  <p className="font-medium text-mar-escuro">UFES</p>
                  <p className="text-mar-escuro/60">Universidade Federal do Espírito Santo</p>
                </li>
                <li className="border-b border-mar-areia/20 pb-3">
                  <p className="font-medium text-mar-escuro">IFES</p>
                  <p className="text-mar-escuro/60">Instituto Federal do Espírito Santo</p>
                </li>
                <li>
                  <p className="font-medium text-mar-escuro">Associação Sinestesia</p>
                  <p className="text-mar-escuro/60">Produção cultural e tecnologia social</p>
                </li>
              </ul>
            </div>

            {/* Coordenação */}
            <div className="surface-panel p-6">
              <h3 className="font-serif font-bold text-mar-azul mb-4 flex items-center gap-2">
                <BookOpen className="w-5 h-5" /> Coordenação
              </h3>
              <p className="text-sm font-medium text-mar-escuro">Prof. Dr. Orlando Lopes Albertino</p>
              <p className="text-sm text-mar-escuro/60 mt-1">UFES / IFES</p>
            </div>

            {/* Localização */}
            <div className="surface-panel p-6">
              <h3 className="font-serif font-bold text-mar-azul mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5" /> Localização
              </h3>
              <p className="text-sm text-mar-escuro/70 leading-relaxed">
                Aldeia de Perocão<br />
                Guarapari — Espírito Santo<br />
                Brasil
              </p>
            </div>

            <div className="surface-panel p-6">
              <h3 className="mb-4 flex items-center gap-2 font-serif font-bold text-mar-azul">
                <Landmark className="w-5 h-5" /> Vocação cultural
              </h3>
              <p className="text-sm leading-relaxed text-mar-escuro/72">
                O projeto atua entre acervo, mediação cultural, memória oral, território e participação
                comunitária, construindo uma presença digital coerente com a dignidade patrimonial de Perocão.
              </p>
            </div>

            <div className="surface-panel p-6">
              <h3 className="mb-4 flex items-center gap-2 font-serif font-bold text-mar-azul">
                <Shell className="w-5 h-5" /> Direção visual
              </h3>
              <p className="text-sm leading-relaxed text-mar-escuro/72">
                A identidade do Museu do Mar busca uma estética costeiro-patrimonial: sóbria, tátil,
                editorial e enraizada no território.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

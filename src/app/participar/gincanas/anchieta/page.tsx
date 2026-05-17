"use client";

import Link from "next/link";
import { ArrowRight, Camera, Compass, MapPin, BookOpen, Castle } from "lucide-react";
import { GincanaCheckIn } from "@/components/education/GincanaCheckIn";
import { GincanaProgressBar } from "@/components/education/GincanaProgressBar";
import { useGincanaProgress } from "@/hooks/useGincanaProgress";

const stations = [
  {
    id: "station_1_santuario",
    name: "Santuário Nacional de São José de Anchieta",
    lat: -20.8037,
    lng: -40.6486,
    theme: "O Código Jesuítico",
    description: "Localize a 'Cela' onde viveu o Padre Anchieta e identifique um elemento da arquitetura do século XVI.",
    hint: "No silêncio do claustro, a pedra conta o segredo do Apóstolo.",
    icon: <Castle className="h-6 w-6 text-amber-500" />,
    color: "amber"
  },
  {
    id: "station_2_casa_cultura",
    name: "Casa da Cultura de Anchieta",
    lat: -20.8045,
    lng: -40.6478,
    theme: "Memórias de Rerigtiba",
    description: "Encontre um objeto que represente a imigração no município e registre sua história.",
    hint: "Onde o antigo governo morava, hoje a cultura repousa.",
    icon: <BookOpen className="h-6 w-6 text-blue-500" />,
    color: "blue"
  },
  {
    id: "station_3_ruinas",
    name: "Ruínas do Rio Salinas",
    lat: -20.7833,
    lng: -40.6722,
    theme: "O Mistério das Ruínas",
    description: "Investigue as teorias sobre a origem destas pedras. Eram salinas ou moradias jesuíticas?",
    hint: "Às margens do rio que salga, o tempo deixou suas pegadas de pedra.",
    icon: <Compass className="h-6 w-6 text-stone-500" />,
    color: "stone"
  }
];

export default function GincanaAnchietaPage() {
  const stationIds = stations.map(s => s.id);
  const { isCompleted, markAsCompleted, completedCount, totalCount, progressPercentage, isAllCompleted } = 
    useGincanaProgress("anchieta", stationIds);

  return (
    <div className="min-h-screen bg-mar-creme/30 pb-20">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-[#2C3E50] py-16 text-white md:py-24">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -left-20 -top-20 h-80 w-80 rounded-full bg-white blur-3xl" />
        </div>
        
        <div className="relative mx-auto max-w-5xl px-6">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1 text-sm font-medium uppercase tracking-[0.18em]">
            <Compass className="h-4 w-4" />
            Território: Anchieta
          </div>
          <h1 className="font-serif text-4xl font-bold md:text-6xl">O Enigma de Rerigtiba</h1>
          <p className="mt-6 max-w-2xl text-lg text-white/80 md:text-xl">
            Uma jornada de descobertas pelo patrimônio histórico de Anchieta. Decifre os segredos dos jesuítas e a fundação da nossa cidade.
          </p>
          
          <div className="mt-10 flex flex-wrap gap-4">
            <Link href="#missoes" className="rounded-full bg-mar-areia px-8 py-3 font-semibold text-mar-escuro shadow-lg hover:bg-mar-areia/90 transition-all">
              Começar Desafio
            </Link>
            <Link href="/participar" className="rounded-full border border-white/30 bg-white/5 px-8 py-3 font-semibold text-white hover:bg-white/10 transition-all">
              Voltar para Trilhas
            </Link>
          </div>
        </div>
      </div>

      {/* Intro Section */}
      <section className="mx-auto mt-[-40px] max-w-5xl px-6">
        <div className="mb-6 rounded-2xl border border-amber-300/70 bg-amber-50 p-4 text-amber-900 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.14em]">Versao de teste em homologacao</p>
          <p className="mt-1 text-sm">
            Esta pagina esta publicada em <strong>https://museudomares.duckdns.org/participar/gincanas/anchieta</strong> como piloto.
            Conteudo, regras e interface podem ser alterados ao longo da implementacao do projeto.
          </p>
        </div>

        <div className="rounded-3xl border border-mar-areia/30 bg-white p-8 shadow-xl md:p-12">
          <div className="grid gap-10 md:grid-cols-2">
            <div>
              <h2 className="font-serif text-3xl font-bold text-mar-escuro">Aventura em Anchieta</h2>
              <p className="mt-4 text-mar-escuro/70">
                Esta gincana levará você pelos pontos mais antigos de nossa cidade. Prepare seu espírito de historiador para encontrar o que o tempo não conseguiu apagar.
              </p>
              <div className="mt-6 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-mar-creme p-1"><ArrowRight className="h-4 w-4 text-mar-cobre" /></div>
                  <p className="text-sm"><strong>Público:</strong> Estudantes de Anchieta</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-mar-creme p-1"><ArrowRight className="h-4 w-4 text-mar-cobre" /></div>
                  <p className="text-sm"><strong>Foco:</strong> História e Patrimônio</p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl bg-mar-creme/50 p-6">
              <h3 className="font-bold text-mar-escuro">Como participar:</h3>
              <ol className="mt-4 space-y-4 text-sm text-mar-escuro/80">
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#2C3E50] text-[10px] text-white">1</span>
                  <span>Forme sua equipe de investigadores.</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#2C3E50] text-[10px] text-white">2</span>
                  <span>Siga as coordenadas até os monumentos.</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#2C3E50] text-[10px] text-white">3</span>
                  <span>Registre suas descobertas com fotos e textos.</span>
                </li>
              </ol>
            </div>
          </div>
        </div>
      </section>

      {/* Missions Grid */}
      <section id="missoes" className="mx-auto mt-20 max-w-5xl px-6">
        <GincanaProgressBar 
          completedCount={completedCount}
          totalCount={totalCount}
          progressPercentage={progressPercentage}
          isAllCompleted={isAllCompleted}
        />

        <div className="mb-10 text-center">
          <h2 className="font-serif text-4xl font-bold text-mar-escuro">As 3 Missões de Rerigtiba</h2>
          <p className="mt-2 text-mar-cobre uppercase tracking-widest text-sm font-bold">Roteiro Histórico</p>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {stations.map((station, index) => (
            <div key={station.id} className="group relative rounded-2xl border border-mar-areia/20 bg-white p-6 shadow-sm hover:shadow-md transition-all">
              <div className={`mb-6 inline-flex rounded-2xl bg-${station.color}-50 p-4`}>
                {station.icon}
              </div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-mar-cobre">Missão {index + 1}</h3>
              <h4 className="mt-1 font-serif text-xl font-bold text-mar-escuro">{station.theme}</h4>
              <div className="mt-3 flex items-center gap-2 text-xs text-mar-escuro/50">
                <MapPin className="h-3 w-3" />
                {station.name}
              </div>
              
              <div className="mt-6 border-t border-mar-creme pt-6">
                <p className="text-sm font-medium text-mar-escuro">O Desafio:</p>
                <p className="mt-2 text-sm leading-relaxed text-mar-escuro/70">{station.description}</p>
              </div>
              
              <div className="mt-6 rounded-xl bg-mar-creme/30 p-4">
                <p className="text-[10px] font-bold uppercase text-mar-cobre tracking-tighter">Dica do Historiador:</p>
                <p className="mt-1 text-xs italic text-mar-escuro/70">{station.hint}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-6">
                <a 
                  href={`https://www.google.com/maps/search/?api=1&query=${station.lat},${station.lng}`} 
                  target="_blank"
                  className="flex items-center justify-center gap-2 rounded-xl border border-mar-areia/40 py-2 text-[10px] font-semibold text-mar-escuro hover:bg-mar-creme transition-colors"
                >
                  Mapa <MapPin className="h-3 w-3" />
                </a>
                <Link
                  href="/memoria"
                  className="flex items-center justify-center gap-2 rounded-xl border border-mar-azul/40 py-2 text-[10px] font-semibold text-mar-azul hover:bg-mar-azul/5 transition-colors"
                >
                  Enviar <Camera className="h-3 w-3" />
                </Link>
              </div>

              <GincanaCheckIn 
                gincanaId="anchieta"
                stationId={station.id}
                stationName={station.name}
                targetLat={station.lat}
                targetLng={station.lng}
                isCompleted={isCompleted(station.id)}
                onSuccess={() => markAsCompleted(station.id)}
              />
            </div>
          ))}
        </div>

        <div className="mt-16 text-center">
          <div className="inline-block rounded-3xl bg-[#2C3E50] p-10 text-white shadow-2xl">
            <h3 className="text-2xl font-bold">Registro de Investigador</h3>
            <p className="mt-2 text-white/70">Concluiu uma missão? Envie seu relatório para o Museu.</p>
            <Link href="/memoria" className="mt-8 inline-flex items-center gap-3 rounded-full bg-mar-areia px-10 py-4 font-bold text-mar-escuro hover:scale-105 transition-transform">
              <Camera className="h-6 w-6" />
              Enviar Relatório
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

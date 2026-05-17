"use client";

import Link from "next/link";
import { ArrowRight, Camera, Compass, MapPin, Shell, Trees, Mountain } from "lucide-react";
import { GincanaCheckIn } from "@/components/education/GincanaCheckIn";
import { GincanaProgressBar } from "@/components/education/GincanaProgressBar";
import { useGincanaProgress } from "@/hooks/useGincanaProgress";

const stations = [
  {
    id: "station_1_artesanato",
    name: "Centro de Artesanato de Piúma",
    lat: -20.8345,
    lng: -40.7255,
    theme: "O Brilho das Conchas",
    description: "Identifique três tipos diferentes de conchas utilizadas no artesanato local e descubra como elas são coletadas.",
    hint: "Pequenos tesouros que o mar traz e as mãos transformam em paz.",
    icon: <Shell className="h-6 w-6 text-pink-400" />,
    color: "pink"
  },
  {
    id: "station_2_ilha_gamba",
    name: "Ilha do Gambá",
    lat: -20.8400,
    lng: -40.7200,
    theme: "O Berçário das Anêmonas",
    description: "Siga pela passarela e localize um mirante. Descreva por que esta ilha é importante para a vida marinha.",
    hint: "Entre o verde da mata e o azul do mar, a vida começa a brotar.",
    icon: <Trees className="h-6 w-6 text-green-500" />,
    color: "green"
  },
  {
    id: "station_3_monte_agha",
    name: "Base do Monte Aghá",
    lat: -20.8550,
    lng: -40.7450,
    theme: "O Gigante de Pedra",
    description: "Registre a vista do Monte Aghá e identifique os municípios que podem ser vistos lá de cima.",
    hint: "O sentinela de pedra que observa as ondas e protege o horizonte.",
    icon: <Mountain className="h-6 w-6 text-cyan-600" />,
    color: "cyan"
  }
];

export default function GincanaPiumaPage() {
  const stationIds = stations.map(s => s.id);
  const { isCompleted, markAsCompleted, completedCount, totalCount, progressPercentage, isAllCompleted } = 
    useGincanaProgress("piuma", stationIds);

  return (
    <div className="min-h-screen bg-mar-creme/30 pb-20">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-[#00695C] py-16 text-white md:py-24">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -left-20 -top-20 h-80 w-80 rounded-full bg-white blur-3xl" />
        </div>
        
        <div className="relative mx-auto max-w-5xl px-6">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1 text-sm font-medium uppercase tracking-[0.18em]">
            <Compass className="h-4 w-4" />
            Território: Piúma
          </div>
          <h1 className="font-serif text-4xl font-bold md:text-6xl">O Mistério das Conchas</h1>
          <p className="mt-6 max-w-2xl text-lg text-white/80 md:text-xl">
            Uma aventura biológica e cultural na Cidade das Conchas. Explore as ilhas, o artesanato e a natureza exuberante de Piúma.
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
            Esta pagina esta publicada em <strong>https://museudomares.duckdns.org/participar/gincanas/piuma</strong> como piloto.
            Conteudo, regras e interface podem ser alterados ao longo da implementacao do projeto.
          </p>
        </div>

        <div className="rounded-3xl border border-mar-areia/30 bg-white p-8 shadow-xl md:p-12">
          <div className="grid gap-10 md:grid-cols-2">
            <div>
              <h2 className="font-serif text-3xl font-bold text-mar-escuro">Natureza e Cultura</h2>
              <p className="mt-4 text-mar-escuro/70">
                Piúma é um santuário de biodiversidade marinha. Nesta gincana, você vai aprender sobre a importância de preservar nossas praias e o valor do trabalho dos artesãos locais.
              </p>
              <div className="mt-6 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-mar-creme p-1"><ArrowRight className="h-4 w-4 text-mar-cobre" /></div>
                  <p className="text-sm"><strong>Público:</strong> Estudantes de Piúma</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-mar-creme p-1"><ArrowRight className="h-4 w-4 text-mar-cobre" /></div>
                  <p className="text-sm"><strong>Foco:</strong> Biologia e Artesanato</p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl bg-mar-creme/50 p-6">
              <h3 className="font-bold text-mar-escuro">Como participar:</h3>
              <ol className="mt-4 space-y-4 text-sm text-mar-escuro/80">
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#00695C] text-[10px] text-white">1</span>
                  <span>Junte sua turma de exploradores ambientais.</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#00695C] text-[10px] text-white">2</span>
                  <span>Explore os pontos naturais com consciência ambiental.</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#00695C] text-[10px] text-white">3</span>
                  <span>Envie suas descobertas biológicas e culturais.</span>
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
          <h2 className="font-serif text-4xl font-bold text-mar-escuro">As 3 Chaves Biológicas</h2>
          <p className="mt-2 text-mar-cobre uppercase tracking-widest text-sm font-bold">Roteiro Ecológico</p>
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
                <p className="text-[10px] font-bold uppercase text-mar-cobre tracking-tighter">Dica do Biólogo:</p>
                <p className="mt-1 text-xs italic text-mar-escuro/60">&ldquo;{station.hint}&rdquo;</p>
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
                gincanaId="piuma"
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
          <div className="inline-block rounded-3xl bg-[#00695C] p-10 text-white shadow-2xl">
            <h3 className="text-2xl font-bold">Eco-Registro</h3>
            <p className="mt-2 text-white/70">Documentou uma espécie ou saber? Compartilhe com o Museu.</p>
            <Link href="/memoria" className="mt-8 inline-flex items-center gap-3 rounded-full bg-mar-areia px-10 py-4 font-bold text-mar-escuro hover:scale-105 transition-transform">
              <Camera className="h-6 w-6" />
              Enviar Descoberta
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

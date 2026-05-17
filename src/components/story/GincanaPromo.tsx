import Link from "next/link";
import { Compass, MapPin, Sparkles } from "lucide-react";

export function GincanaPromo() {
  return (
    <section className="relative -mt-10 mb-16 px-6">
      <div className="mx-auto max-w-5xl">
        <div className="overflow-hidden rounded-[2.5rem] border border-mar-areia/40 bg-white shadow-2xl transition-all hover:shadow-mar-areia/20">
          <div className="grid md:grid-cols-[0.6fr,0.4fr]">
            <div className="relative bg-mar-azul p-8 md:p-12 text-white">
              <div className="absolute inset-0 opacity-10">
                <div className="absolute -left-10 -top-10 h-64 w-64 rounded-full bg-white blur-3xl" />
              </div>
              
              <div className="relative">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.18em]">
                  <Sparkles className="h-4 w-4" />
                  Destaque da Temporada
                </div>
                <h2 className="font-serif text-3xl font-bold md:text-5xl">Gincana: Tesouros de Perocão</h2>
                <p className="mt-6 text-lg text-white/80 leading-relaxed">
                  Convidamos os estudantes da <strong>EMEF Francisco Araújo</strong> e toda a comunidade para uma aventura de descoberta e memória em nosso território.
                </p>
                
                <div className="mt-8 flex flex-wrap gap-4">
                  <Link href="/participar/gincanas/perocao" className="rounded-full bg-mar-areia px-8 py-3 font-bold text-mar-escuro shadow-lg hover:bg-mar-areia/90 transition-all">
                    Participar da Aventura
                  </Link>
                  <Link href="/blog/gincana-perocao-lancamento" className="rounded-full border border-white/30 bg-white/5 px-8 py-3 font-semibold text-white hover:bg-white/10 transition-all">
                    Saiba mais
                  </Link>
                </div>
                
                <div className="mt-8 flex items-center gap-3 border-t border-white/10 pt-6">
                  <div className="h-2 w-2 rounded-full bg-mar-areia animate-pulse" />
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/60">
                    Escola Piloto: EMEF Francisco Araújo
                  </p>
                </div>
              </div>
            </div>
            
            <div className="hidden bg-mar-creme md:flex flex-col justify-center p-8 md:p-12">
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm">
                    <MapPin className="h-6 w-6 text-mar-cobre" />
                  </div>
                  <div>
                    <h3 className="font-bold text-mar-escuro text-sm uppercase tracking-wide">Território Vivo</h3>
                    <p className="text-xs text-mar-escuro/60">Igreja, Porto e Manguezal</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm">
                    <Compass className="h-6 w-6 text-mar-azul" />
                  </div>
                  <div>
                    <h3 className="font-bold text-mar-escuro text-sm uppercase tracking-wide">3 Missões</h3>
                    <p className="text-xs text-mar-escuro/60">Fé, Mar e Vida</p>
                  </div>
                </div>

                <div className="mt-6 border-t border-mar-areia/20 pt-6">
                  <div className="flex items-center justify-between text-xs font-bold text-mar-cobre uppercase tracking-widest">
                    <span>Vagas Limitadas</span>
                    <span>100% Gratuito</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

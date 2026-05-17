import Link from "next/link";
import { ArrowRight, Download, Map as MapIcon, Users, CheckCircle, Clock } from "lucide-react";

interface GincanaFranciscoAraujoMonitorProps {
  className?: string;
  stats?: {
    equipesAtivas: number;
    missoesConcluidas: number;
    proximaEstacao?: string;
    equipesEmDeslocamento?: number;
  };
}

export function GincanaFranciscoAraujoMonitor({ className, stats: realStats }: GincanaFranciscoAraujoMonitorProps) {
  const stats = [
    { 
      label: "Equipes Ativas", 
      value: realStats?.equipesAtivas?.toString() ?? "0", 
      icon: Users 
    },
    { 
      label: "Missões Concluídas", 
      value: realStats?.missoesConcluidas?.toString() ?? "0", 
      icon: CheckCircle 
    },
    { 
      label: "Status", 
      value: realStats?.equipesAtivas && realStats.equipesAtivas > 0 ? "Em Campo" : "Aguardando", 
      icon: Clock 
    },
  ];

  return (
    <div className={`rounded-3xl border border-mar-azul/20 bg-white p-8 shadow-sm ${className}`}>
      <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-mar-azul/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-mar-azul">
            Exclusivo: EMEF Francisco Araújo
          </div>
          <h2 className="font-serif text-3xl font-bold text-mar-escuro">Monitor da Gincana: Perocão</h2>
          <p className="mt-2 text-sm text-mar-escuro/60 max-w-xl">
            Acompanhe o progresso das suas turmas em tempo real no território. Valide submissões e baixe materiais de apoio.
          </p>
        </div>

        <div className="flex shrink-0 gap-3">
          <a 
            href="/skills/gincana-sociocultural/manual_facilitador_perocao.md" 
            className="flex items-center gap-2 rounded-full border border-mar-areia/40 bg-white px-4 py-2 text-xs font-bold text-mar-escuro hover:bg-mar-creme transition-all"
          >
            <Download className="h-4 w-4" />
            Manual PDF
          </a>
          <Link 
            href="/participar/gincanas/perocao" 
            className="flex items-center gap-2 rounded-full bg-mar-azul px-4 py-2 text-xs font-bold text-white hover:bg-mar-azul/90 transition-all"
          >
            <MapIcon className="h-4 w-4" />
            Ver Mapa
          </Link>
        </div>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-mar-areia/10 bg-mar-creme/30 p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-white p-2 text-mar-azul shadow-sm">
                <stat.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase text-mar-escuro/40 tracking-widest">{stat.label}</p>
                <p className="font-serif text-2xl font-bold text-mar-escuro">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-2xl bg-mar-escuro p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold">Próxima Parada: {realStats?.proximaEstacao ?? "Cais de Perocão"}</h3>
            <p className="text-xs text-white/60">{realStats?.equipesEmDeslocamento ?? 0} equipes estão se deslocando para esta estação agora.</p>
          </div>
          <ArrowRight className="h-5 w-5 text-mar-areia" />
        </div>
      </div>
    </div>
  );
}

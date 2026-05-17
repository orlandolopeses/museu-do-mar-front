"use client";

import Link from "next/link";
import { Camera, CheckCircle2, Trophy } from "lucide-react";

interface GincanaProgressBarProps {
  completedCount: number;
  totalCount: number;
  progressPercentage: number;
  isAllCompleted: boolean;
}

export function GincanaProgressBar({ 
  completedCount, 
  totalCount, 
  progressPercentage, 
  isAllCompleted 
}: GincanaProgressBarProps) {
  return (
    <div className="mb-10 rounded-3xl border border-mar-areia/30 bg-white p-6 shadow-lg md:p-8">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <div className={`rounded-2xl p-4 ${isAllCompleted ? 'bg-emerald-100 text-emerald-600' : 'bg-mar-creme text-mar-azul'}`}>
            {isAllCompleted ? <Trophy className="h-8 w-8" /> : <CheckCircle2 className="h-8 w-8" />}
          </div>
          <div>
            <h3 className="font-serif text-2xl font-bold text-mar-escuro">
              {isAllCompleted ? "Gincana Concluída!" : "Seu Progresso"}
            </h3>
            <p className="text-sm text-mar-escuro/60">
              {completedCount} de {totalCount} missões realizadas
            </p>
          </div>
        </div>

        <div className="flex-1 max-w-md">
          <div className="mb-2 flex items-center justify-between text-xs font-bold uppercase tracking-wider">
            <span className="text-mar-escuro/40">Completado</span>
            <span className="text-mar-azul">{Math.round(progressPercentage)}%</span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-mar-creme">
            <div 
              className={`h-full transition-all duration-1000 ease-out ${isAllCompleted ? 'bg-emerald-500' : 'bg-mar-azul'}`}
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        {isAllCompleted && (
          <Link 
            href="/memoria" 
            className="flex items-center justify-center gap-3 rounded-full bg-mar-areia px-8 py-3 font-bold text-mar-escuro shadow-md hover:scale-105 transition-all"
          >
            <Camera className="h-5 w-5" />
            Enviar Descoberta Final
          </Link>
        )}
      </div>
    </div>
  );
}

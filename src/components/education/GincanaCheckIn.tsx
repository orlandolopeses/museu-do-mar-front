"use client";

import { useState } from "react";
import { CheckCircle2, MapPin, Loader2, AlertCircle } from "lucide-react";
import { submitCheckIn } from "@/lib/gincana-actions";

interface GincanaCheckInProps {
  gincanaId: string;
  stationId: string;
  stationName: string;
  targetLat: number;
  targetLng: number;
  turmaId?: string;
  isCompleted?: boolean;
  onSuccess?: () => void;
}

export function GincanaCheckIn({ gincanaId, stationId, turmaId, isCompleted, onSuccess }: GincanaCheckInProps) {
  const [status, setStatus] = useState<"idle" | "checking" | "success" | "error">("idle");

  const handleCheckIn = async () => {
    setStatus("checking");
    
    try {
      let lat = "";
      let lng = "";

      if ("geolocation" in navigator) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 5000,
              maximumAge: 0
            });
          });
          lat = position.coords.latitude.toString();
          lng = position.coords.longitude.toString();
        } catch (geoError) {
          console.warn("Geo error, proceeding without precise coordinates", geoError);
        }
      }

      const formData = new FormData();
      formData.append("gincanaId", gincanaId);
      formData.append("stationId", stationId);
      if (turmaId) formData.append("turmaId", turmaId);
      formData.append("lat", lat);
      formData.append("lng", lng);

      await submitCheckIn(formData);

      if (onSuccess) {
        onSuccess();
      }
      setStatus("success");
    } catch (error) {
      console.error("Check-in error:", error);
      setStatus("error");
    }
  };

  if (isCompleted) {
    return (
      <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-emerald-700">
        <CheckCircle2 className="h-5 w-5" />
        <span className="text-xs font-bold uppercase">Missão Concluída</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleCheckIn}
        disabled={status === "checking"}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-mar-azul py-3 text-xs font-bold text-white shadow-lg hover:bg-mar-azul/90 transition-all active:scale-95 disabled:opacity-70"
      >
        {status === "checking" ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Verificando Localização...
          </>
        ) : (
          <>
            <MapPin className="h-4 w-4" />
            Fazer Check-in na Estação
          </>
        )}
      </button>
      
      {status === "error" && (
        <div className="flex items-center gap-2 text-[10px] font-medium text-rose-600 px-1">
          <AlertCircle className="h-3 w-3" />
          Falha ao registrar check-in. Tente novamente.
        </div>
      )}
    </div>
  );
}

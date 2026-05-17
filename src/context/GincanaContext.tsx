"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

interface GincanaContextType {
  completedStations: Record<string, boolean>;
  isCompleted: (gincanaId: string, stationId: string) => boolean;
  markAsCompleted: (gincanaId: string, stationId: string) => void;
  getGincanaProgress: (gincanaId: string, stationIds: string[]) => {
    completedCount: number;
    totalCount: number;
    progressPercentage: number;
    isAllCompleted: boolean;
  };
}

const GincanaContext = createContext<GincanaContextType | undefined>(undefined);

function loadFromLocalStorage(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  const progress: Record<string, boolean> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith("gincana_")) {
      progress[key] = true;
    }
  }
  return progress;
}

export function GincanaProvider({ children }: { children: React.ReactNode }) {
  const [completedStations, setCompletedStations] = useState<Record<string, boolean>>(loadFromLocalStorage);

  const markAsCompleted = useCallback((gincanaId: string, stationId: string) => {
    const key = `gincana_${gincanaId}_${stationId}`;
    localStorage.setItem(key, "true");
    setCompletedStations(prev => ({
      ...prev,
      [key]: true
    }));
  }, []);

  const isCompleted = useCallback((gincanaId: string, stationId: string) => {
    return !!completedStations[`gincana_${gincanaId}_${stationId}`];
  }, [completedStations]);

  const getGincanaProgress = useCallback((gincanaId: string, stationIds: string[]) => {
    const completed = stationIds.filter(id => !!completedStations[`gincana_${gincanaId}_${id}`]);
    const completedCount = completed.length;
    const totalCount = stationIds.length;
    const progressPercentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
    const isAllCompleted = completedCount === totalCount && totalCount > 0;

    return {
      completedCount,
      totalCount,
      progressPercentage,
      isAllCompleted
    };
  }, [completedStations]);

  return (
    <GincanaContext.Provider value={{ completedStations, isCompleted, markAsCompleted, getGincanaProgress }}>
      {children}
    </GincanaContext.Provider>
  );
}

export function useGincana() {
  const context = useContext(GincanaContext);
  if (context === undefined) {
    throw new Error("useGincana must be used within a GincanaProvider");
  }
  return context;
}

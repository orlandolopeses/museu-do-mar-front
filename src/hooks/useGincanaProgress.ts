"use client";

import { useState, useCallback } from "react";

function loadProgress(gincanaId: string, stationIds: string[]): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  const progress: Record<string, boolean> = {};
  stationIds.forEach(id => {
    if (localStorage.getItem(`gincana_${gincanaId}_${id}`)) progress[id] = true;
  });
  return progress;
}

export function useGincanaProgress(gincanaId: string, stationIds: string[]) {
  const [completedStations, setCompletedStations] = useState<Record<string, boolean>>(
    () => loadProgress(gincanaId, stationIds)
  );

  const markAsCompleted = useCallback((stationId: string) => {
    localStorage.setItem(`gincana_${gincanaId}_${stationId}`, "true");
    setCompletedStations(prev => ({
      ...prev,
      [stationId]: true
    }));
  }, [gincanaId]);

  const isCompleted = (stationId: string) => !!completedStations[stationId];
  
  const completedCount = Object.keys(completedStations).length;
  const totalCount = stationIds.length;
  const progressPercentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  const isAllCompleted = completedCount === totalCount && totalCount > 0;

  return {
    completedStations,
    isCompleted,
    markAsCompleted,
    completedCount,
    totalCount,
    progressPercentage,
    isAllCompleted
  };
}

import { FlowScenario } from "@/types/flowTypes";

const memoryCache = new Map<string, { presets: FlowScenario[]; selectedScenarioId?: string }>();

export function getCachedFlows(repoId: string): { presets: FlowScenario[]; selectedScenarioId?: string } | null {
  if (memoryCache.has(repoId)) {
    return memoryCache.get(repoId)!;
  }
  if (typeof window !== "undefined") {
    try {
      const stored = sessionStorage.getItem(`repomap_flows_${repoId}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && Array.isArray(parsed.presets)) {
          memoryCache.set(repoId, parsed);
          return parsed;
        }
      }
    } catch (e) {
      // ignore storage errors
    }
  }
  return null;
}

export function saveCachedFlows(repoId: string, presets: FlowScenario[], selectedScenarioId?: string) {
  const entry = { presets, selectedScenarioId };
  memoryCache.set(repoId, entry);
  if (typeof window !== "undefined") {
    try {
      sessionStorage.setItem(`repomap_flows_${repoId}`, JSON.stringify(entry));
    } catch (e) {
      // ignore storage errors
    }
  }
}

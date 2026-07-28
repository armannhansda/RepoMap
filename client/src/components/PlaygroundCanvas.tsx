"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Background, Controls, MiniMap, ReactFlow, useNodesState, useEdgesState, useReactFlow } from "reactflow";
import "reactflow/dist/style.css";
import FlowCustomNode from "./FlowCustomNode";
import FlowAnimatedEdge from "./FlowAnimatedEdge";
import FlowPlaybackBar from "./FlowPlaybackBar";
import FlowStepInspector from "./FlowStepInspector";
import { FlowScenario, FlowStep, FlowNodeStatus } from "@/types/flowTypes";
import { generateFlowApi, getPresetFlowsApi } from "@/services/api";
import { Sparkles, Loader2, PlaySquare } from "lucide-react";
import { getLayoutedElements } from "@/utils/layoutGragh";
import { getCachedFlows, saveCachedFlows } from "@/utils/flowSessionCache";

const initialNodeTypes = {
  custom: FlowCustomNode,
};

const initialEdgeTypes = {
  flowAnimated: FlowAnimatedEdge,
  default: FlowAnimatedEdge,
};

interface Props {
  graph: any;
  repoId: string;
  onNodeSelect?: (node: any) => void;
  onTogglePlayground?: () => void;
}

function FitViewOnStep({ targetNodeId, fromNodeId }: { targetNodeId?: string; fromNodeId?: string }) {
  const { fitView } = useReactFlow();

  useEffect(() => {
    if (!targetNodeId && !fromNodeId) return;
    const timer = setTimeout(() => {
      const nodesToFit = [targetNodeId, fromNodeId].filter(Boolean) as string[];
      if (nodesToFit.length > 0) {
        fitView({ nodes: nodesToFit.map((id) => ({ id })), padding: 0.5, duration: 600 });
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [targetNodeId, fromNodeId, fitView]);

  return null;
}

export default function PlaygroundCanvas({ graph, repoId, onNodeSelect, onTogglePlayground }: Props) {
  const nodeTypes = useMemo(() => initialNodeTypes, []);
  const edgeTypes = useMemo(() => initialEdgeTypes, []);

  // Playback State
  const [scenario, setScenario] = useState<FlowScenario | null>(null);
  const [presets, setPresets] = useState<FlowScenario[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const [speed, setSpeed] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [inspectedStep, setInspectedStep] = useState<FlowStep | null>(null);
  const [loadingPresets, setLoadingPresets] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  // Fetch preset flows on initial mount or graph change (with session caching!)
  useEffect(() => {
    if (!graph || !graph.nodes || graph.nodes.length === 0) return;
    const cacheKey = repoId || "repo";

    const cached = getCachedFlows(cacheKey);
    if (cached && Array.isArray(cached.presets)) {
      setPresets(cached.presets);
      if (!scenario && cached.presets.length > 0) {
        const target = cached.presets.find((p) => p.id === cached.selectedScenarioId) || cached.presets[0];
        setScenario(target);
      }
      return;
    }

    let mounted = true;
    setLoadingPresets(true);

    getPresetFlowsApi({ repoId: cacheKey, graph })
      .then((res) => {
        if (mounted && res.success && Array.isArray(res.presets)) {
          setPresets(res.presets);
          const first = res.presets.length > 0 ? res.presets[0] : null;
          if (first && !scenario) {
            setScenario(first);
          }
          saveCachedFlows(cacheKey, res.presets, first?.id);
        }
      })
      .catch((err) => console.error("Error loading preset flows:", err))
      .finally(() => {
        if (mounted) setLoadingPresets(false);
      });

    return () => {
      mounted = false;
    };
  }, [graph, repoId]);

  // Timer tick for playing animation
  useEffect(() => {
    if (!isPlaying || !scenario || !scenario.steps || scenario.steps.length === 0) return;

    const currentDuration = scenario.steps[currentStepIndex]?.durationMs || 1800;
    const stepInterval = Math.max(400, currentDuration / speed);

    const timer = setTimeout(() => {
      setCurrentStepIndex((prev) => {
        if (prev + 1 >= scenario.steps.length) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, stepInterval);

    return () => clearTimeout(timer);
  }, [isPlaying, currentStepIndex, scenario, speed]);

  // Update inspected step whenever currentStepIndex changes
  useEffect(() => {
    if (scenario && currentStepIndex >= 0 && currentStepIndex < scenario.steps.length) {
      setInspectedStep(scenario.steps[currentStepIndex]);
    } else if (currentStepIndex === -1) {
      setInspectedStep(null);
    }
  }, [currentStepIndex, scenario]);

  // Handle custom flow generation
  const handleGenerateCustomFlow = useCallback(async (prompt: string) => {
    if (!graph || !graph.nodes) return;
    setIsGenerating(true);
    setIsPlaying(false);
    const cacheKey = repoId || "repo";
    try {
      const res = await generateFlowApi({ repoId: cacheKey, prompt, graph });
      if (res.success && res.scenario) {
        setPresets((prev) => {
          const updated = [res.scenario, ...prev.filter((p) => p.id !== res.scenario.id)];
          saveCachedFlows(cacheKey, updated, res.scenario.id);
          return updated;
        });
        setScenario(res.scenario);
        setCurrentStepIndex(0);
        setIsPlaying(true);
      }
    } catch (err) {
      console.error("Failed to generate custom flow:", err);
    } finally {
      setIsGenerating(false);
    }
  }, [graph, repoId]);

  const handleSelectScenario = useCallback((newScenario: FlowScenario) => {
    setScenario(newScenario);
    setCurrentStepIndex(-1);
    setIsPlaying(false);
    setInspectedStep(null);
    const cacheKey = repoId || "repo";
    setPresets((prev) => {
      saveCachedFlows(cacheKey, prev, newScenario.id);
      return prev;
    });
  }, [repoId]);

  const handleSeek = useCallback((stepIdx: number) => {
    setCurrentStepIndex(stepIdx);
    setIsPlaying(false);
  }, []);

  const handleReset = useCallback(() => {
    setCurrentStepIndex(-1);
    setIsPlaying(false);
    setInspectedStep(null);
  }, []);

  // Compute active nodes & edges with execution state and clean Dagre LR layout
  const { displayNodes, displayEdges } = useMemo(() => {
    if (!graph || !graph.nodes) return { displayNodes: [], displayEdges: [] };

    // 1. Determine involved node IDs from the active scenario
    const involvedIds = new Set<string>();
    const nodeStepMap = new Map<string, { activeStep: number; visitedSteps: number[] }>();

    if (scenario && scenario.steps && scenario.steps.length > 0) {
      scenario.steps.forEach((st, idx) => {
        [st.fromNodeId, st.toNodeId].forEach((id) => {
          if (!id) return;
          involvedIds.add(id);
          const current = nodeStepMap.get(id) || { activeStep: -1, visitedSteps: [] };
          if (idx === currentStepIndex) {
            current.activeStep = idx + 1;
          } else if (idx < currentStepIndex) {
            current.visitedSteps.push(idx + 1);
          }
          nodeStepMap.set(id, current);
        });
      });
    }

    // Show all nodes in playground instead of filtering ONLY to involved flow nodes!
    // If graph has > 350 nodes, we keep macro structure nodes (folder/file) plus all involved flow nodes so performance stays smooth.
    let candidateNodes = graph.nodes;
    if (graph.nodes.length > 350) {
      const macroNodes = graph.nodes.filter(
        (n: any) => n.type === "folder" || n.type === "file" || involvedIds.has(n.id)
      );
      candidateNodes = macroNodes.length > 450 ? macroNodes.slice(0, 450) : macroNodes;
    }

    const candidateNodeIdSet = new Set(candidateNodes.map((n: any) => n.id));

    const rawNodes = candidateNodes.map((n: any) => {
      const info = nodeStepMap.get(n.id);
      let status: FlowNodeStatus = 'idle';
      let activeStepNumber: number | undefined;

      if (info) {
        if (info.activeStep > 0) {
          status = 'active';
          activeStepNumber = info.activeStep;
        } else if (info.visitedSteps.length > 0) {
          status = 'visited';
        } else {
          status = 'flow_target';
        }
      } else if (involvedIds.size > 0) {
        status = 'dimmed';
      }

      return {
        id: n.id,
        type: 'custom',
        position: n.position || { x: 0, y: 0 },
        data: {
          ...n,
          status,
          activeStepNumber,
        },
      };
    });

    // Filter base graph edges to only those between candidate nodes
    const candidateEdges = (graph.edges || []).filter(
      (e: any) => candidateNodeIdSet.has(e.source) && candidateNodeIdSet.has(e.target)
    );

    const rawEdges = candidateEdges.map((e: any, idx: number) => {
      const isFlowEdge = involvedIds.has(e.source) && involvedIds.has(e.target);
      const isDimmed = involvedIds.size > 0 && !isFlowEdge;
      return {
        id: `${e.source}-${e.target}-${idx}`,
        source: e.source,
        target: e.target,
        type: 'flowAnimated',
        data: {
          isExecuting: false,
          isFlowEdge,
          isDimmed,
        },
      };
    });

    if (scenario && currentStepIndex >= 0 && currentStepIndex < scenario.steps.length) {
      const currentStep = scenario.steps[currentStepIndex];
      if (currentStep && currentStep.fromNodeId && currentStep.toNodeId) {
        // Inject or highlight the active step transition
        rawEdges.push({
          id: `active-step-${currentStep.id || currentStepIndex}`,
          source: currentStep.fromNodeId,
          target: currentStep.toNodeId,
          type: 'flowAnimated',
          data: {
            isExecuting: true,
            isFlowEdge: true,
            isDimmed: false,
            stepNumber: currentStepIndex + 1,
            label: currentStep.label,
          },
        });
      }
    }

    // Apply clean Dagre layout (Left-to-Right sequence with generous subgraph spacing)
    const layouted = getLayoutedElements(rawNodes, rawEdges, true);
    return {
      displayNodes: layouted.nodes,
      displayEdges: layouted.edges,
    };
  }, [graph, scenario, currentStepIndex]);

  const activeStep = scenario && currentStepIndex >= 0 ? scenario.steps[currentStepIndex] : null;

  return (
    <div className="relative w-full h-[calc(100vh-52px)] bg-[#0c0c10] overflow-hidden">
      {/* Top Floating Banner explaining Playground */}
      <div className="absolute top-4 left-4 z-30 bg-black/70 backdrop-blur-xl border border-white/10 px-4 py-2 rounded-2xl flex items-center gap-3 shadow-xl">
        <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
          <PlaySquare className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-white font-bold text-xs tracking-wide flex items-center gap-2">
            <span>Application Flow Playground</span>
            <span className="bg-emerald-500 text-black text-[9px] font-extrabold px-1.5 py-0.2 rounded uppercase">Live</span>
          </h3>
          <p className="text-white/60 text-[11px] max-w-sm truncate">
            {scenario ? scenario.description : "Select or generate a workflow to watch animated execution paths across nodes."}
          </p>
        </div>
        {loadingPresets && (
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-mono ml-2">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>Analyzing Traces...</span>
          </div>
        )}
      </div>

      <ReactFlow
        nodes={displayNodes}
        edges={displayEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        minZoom={0.1}
        maxZoom={2.5}
        className="w-full h-full"
      >
        <Controls className="!bg-[#141419]/90 !border-white/15 !fill-white/80 !shadow-xl !rounded-xl overflow-hidden" />
        <MiniMap
          nodeColor={(node: any) => {
            if (node.data?.status === 'active') return '#34d399';
            if (node.data?.status === 'visited') return '#059669';
            if (node.data?.status === 'flow_target') return '#10b981';
            if (node.data?.status === 'dimmed') return '#141419';
            return '#27272a';
          }}
          className="!bg-[#141419]/90 !border !border-white/15 !rounded-2xl overflow-hidden !shadow-2xl"
        />
        <Background color="#2a2a35" gap={24} size={1.2} />
        <FitViewOnStep
          fromNodeId={activeStep?.fromNodeId}
          targetNodeId={activeStep?.toNodeId}
        />
      </ReactFlow>

      {/* Step Inspector Card */}
      <FlowStepInspector
        step={inspectedStep}
        totalSteps={scenario?.steps?.length || 0}
        onClose={() => setInspectedStep(null)}
      />

      {/* Bottom Video-Player Style Controller Bar & ONLY Structure Map Circle Button */}
      <div
        className={`absolute bottom-6 left-1/2 -translate-x-1/2 z-40 w-[98%] max-w-5xl flex items-center justify-center gap-2.5 pointer-events-none transition-all ${
          isExiting
            ? "animate-out fade-out slide-out-to-bottom-10 duration-300 ease-in fill-mode-forwards"
            : "animate-in fade-in slide-in-from-bottom-10 duration-500 ease-out"
        }`}
      >
        <FlowPlaybackBar
          scenario={scenario}
          presets={presets}
          onSelectScenario={handleSelectScenario}
          onGenerateCustomFlow={handleGenerateCustomFlow}
          isGenerating={isGenerating}
          isPlaying={isPlaying}
          onTogglePlay={() => setIsPlaying(!isPlaying)}
          currentStepIndex={currentStepIndex}
          onSeek={handleSeek}
          speed={speed}
          onChangeSpeed={setSpeed}
          onReset={handleReset}
        />

        {/* ONLY Structure Map Switch Circle Button next to controller bar */}
        {onTogglePlayground && (
          <div className="pointer-events-auto shrink-0">
            <button
              onClick={() => {
                setIsExiting(true);
                setTimeout(() => {
                  if (onTogglePlayground) onTogglePlayground();
                }, 280);
              }}
              className="w-12 h-12 rounded-full bg-[#141419] border border-white/10 shadow-[0_10px_35px_rgba(0,0,0,0.85)] hover:bg-white/10 hover:border-white/25 text-white/80 hover:text-white flex items-center justify-center transition-all hover:scale-105 active:scale-95 cursor-pointer ring-1 ring-white/5"
              title="Switch to Structure Map"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                <rect x="4" y="4" width="6" height="6" rx="1.5" />
                <rect x="14" y="14" width="6" height="6" rx="1.5" />
                <path d="M7 10v4a2 2 0 0 0 2 2h5" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

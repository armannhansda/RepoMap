"use client";

import { Background, Controls, MiniMap, ReactFlow, MarkerType, useReactFlow, useNodesState, useEdgesState } from "reactflow";
import "reactflow/dist/style.css";
import { getLayoutedElements } from "@/utils/layoutGragh";
import React, { useEffect, useState, useRef, useMemo, useCallback } from "react";
import CustomNode from "./CustomNode";
import FlowCustomNode from "./FlowCustomNode";
import FlowAnimatedEdge from "./FlowAnimatedEdge";
import FlowPlaybackBar from "./FlowPlaybackBar";
import FlowStepInspector from "./FlowStepInspector";
import { FlowScenario, FlowStep, FlowNodeStatus } from "@/types/flowTypes";
import { generateFlowApi, getPresetFlowsApi } from "@/services/api";
import { getCachedFlows, saveCachedFlows } from "@/utils/flowSessionCache";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { getOpenedFile, saveOpenedFile } from "@/lib/db/openedFiles";
import { getFileContent, explainNode } from "@/services/api";
import ReactMarkdown from 'react-markdown';
import { Loader2, Sparkles, Play } from "lucide-react";

const initialNodeTypes = {
  custom: FlowCustomNode,
};

const initialEdgeTypes = {
  default: FlowAnimatedEdge,
  flowAnimated: FlowAnimatedEdge,
};

interface Props {
  graph: any;
  repoId: string;
  onNodeSelect: (node: any) => void;
  selectedNodeId?: string;
  viewMode?: string;
  onTogglePlayground?: () => void;
}

function FitViewOnUpdate({ nodes, viewMode }: { nodes: any[]; viewMode?: string }) {
  const { fitView } = useReactFlow();
  const prevViewMode = useRef(viewMode);

  useEffect(() => {
    // Prevent view shift when merely switching between structure map and playground without node changes
    if (prevViewMode.current !== viewMode) {
      prevViewMode.current = viewMode;
      return;
    }
    // In Graph Mode ('map'), behave exactly as before: fitView over all layouted nodes whenever nodes update!
    if (viewMode !== 'playground' && nodes.length > 0) {
      const timer = setTimeout(() => {
        fitView({ padding: 0.2, duration: 800 });
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [nodes, fitView, viewMode]);

  return null;
}

function FitViewOnStep({ targetNodeId, fromNodeId, isPlaying }: { targetNodeId?: string; fromNodeId?: string; isPlaying: boolean }) {
  const { fitView } = useReactFlow();

  useEffect(() => {
    if (!isPlaying || (!targetNodeId && !fromNodeId)) return;
    const timer = setTimeout(() => {
      const nodesToFit = [targetNodeId, fromNodeId].filter(Boolean) as string[];
      if (nodesToFit.length > 0) {
        fitView({ nodes: nodesToFit.map((id) => ({ id })), padding: 0.4, duration: 600 });
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [targetNodeId, fromNodeId, isPlaying, fitView]);

  return null;
}

function GraphController({ zoomToNodeRef, selectedNodeId, viewMode }: { zoomToNodeRef: React.MutableRefObject<((nodeId: string) => void) | null>; selectedNodeId?: string; viewMode?: string }) {
  const { fitView } = useReactFlow();
  const prevSelectedRef = useRef<string | undefined>(selectedNodeId);

  const zoomToNode = useCallback((nodeId: string) => {
    if (!nodeId) return;
    if (viewMode === 'playground') {
      // In playground mode, zoom directly to the specific step node
      fitView({ nodes: [{ id: nodeId }], duration: 650, maxZoom: 1.15, padding: 0.8 });
    } else {
      // In graph mode ('map'), fit over the entire layouted subgraph exactly like original behavior
      fitView({ padding: 0.2, duration: 800 });
    }
  }, [fitView, viewMode]);

  useEffect(() => {
    zoomToNodeRef.current = zoomToNode;
  }, [zoomToNodeRef, zoomToNode]);

  useEffect(() => {
    if (selectedNodeId && selectedNodeId !== prevSelectedRef.current) {
      prevSelectedRef.current = selectedNodeId;
      if (viewMode === 'playground') {
        const timer = setTimeout(() => {
          zoomToNode(selectedNodeId);
        }, 60);
        return () => clearTimeout(timer);
      }
    }
    prevSelectedRef.current = selectedNodeId;
  }, [selectedNodeId, zoomToNode, viewMode]);

  return null;
}

function RepoGraph({ graph, repoId, onNodeSelect, selectedNodeId, viewMode = 'map', onTogglePlayground }: Props) {
  const nodeTypes = useMemo(() => initialNodeTypes, []);
  const edgeTypes = useMemo(() => initialEdgeTypes, []);
  const proOptions = useMemo(() => ({ hideAttribution: true }), []);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const zoomToNodeRef = useRef<((nodeId: string) => void) | null>(null);

  // Flow Playground Playback State
  const [scenario, setScenario] = useState<FlowScenario | null>(null);
  const [presets, setPresets] = useState<FlowScenario[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const [speed, setSpeed] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [inspectedStep, setInspectedStep] = useState<FlowStep | null>(null);
  const [loadingPresets, setLoadingPresets] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  // Fetch preset flows on initial mount or graph change (with session caching)
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

  useEffect(() => {
    if (!graph || !graph.nodes) {
      setNodes([]);
      setEdges([]);
      return;
    }

    let activeNodes = graph.nodes;
    let activeEdges = graph.edges;

    if (selectedNodeId) {
      const coreGroupIds = new Set<string>();
      coreGroupIds.add(selectedNodeId);

      // Add all functions contained by the selected node (if it's a file)
      graph.edges.forEach((e: any) => {
        if (e.source === selectedNodeId && e.type === "contains") {
          coreGroupIds.add(e.target);
        }
      });

      // Find all edges touching the core group
      const touchingEdges = graph.edges.filter(
        (e: any) => coreGroupIds.has(e.source) || coreGroupIds.has(e.target)
      );

      const connectedIds = new Set<string>();
      touchingEdges.forEach((e: any) => {
        connectedIds.add(e.source);
        connectedIds.add(e.target);
      });

      // Include parent files to provide context for pulled-in function nodes
      const parentEdges = graph.edges.filter(
        (e: any) => e.type === "contains" && connectedIds.has(e.target)
      );

      parentEdges.forEach((e: any) => {
        connectedIds.add(e.source);
      });

      // Deduplicate edges using a Set
      activeEdges = Array.from(new Set([...touchingEdges, ...parentEdges]));
      activeNodes = graph.nodes.filter((n: any) => connectedIds.has(n.id));
    } else if (graph.nodes.length > 350) {
      // Large Repo High-Performance Mode (Shneiderman's Mantra: Overview First)
      // When opening a large repository without a specific node selected, filtering down to
      // folder and file level prevents Dagre layout blockages and React DOM UI thread freezes.
      const macroNodes = graph.nodes.filter(
        (n: any) => n.type === "folder" || n.type === "file"
      );
      const cappedNodes = macroNodes.length > 400 ? macroNodes.slice(0, 400) : macroNodes;
      const cappedNodeIds = new Set(cappedNodes.map((n: any) => n.id));

      activeNodes = cappedNodes;
      activeEdges = graph.edges.filter(
        (e: any) => cappedNodeIds.has(e.source) && cappedNodeIds.has(e.target)
      );
    }

    const rawNodes = activeNodes.map((node: any) => ({
      id: node.id,
      type: 'custom',
      data: {
        ...node,
      },
      position: { x: 0, y: 0 },
    }));

    const rawEdges = activeEdges.map((edge: any, index: number) => ({
      id: `${edge.source}-${edge.target}-${index}`,
      source: edge.source,
      target: edge.target,
      type: 'default',
      animated: edge.type === 'calls',
      style: {
        stroke: edge.type === 'calls' ? '#fbbf24' : edge.type === 'contains' ? 'rgba(16, 185, 129, 0.5)' : 'rgba(96, 165, 250, 0.7)',
        strokeWidth: edge.type === 'calls' ? 2 : edge.type === 'contains' ? 1.5 : 1.8,
        strokeDasharray: edge.type === 'calls' ? '6,4' : edge.type === 'contains' ? '4,4' : 'none',
      },
      markerEnd: edge.type === 'contains' ? undefined : {
        type: MarkerType.ArrowClosed,
        color: edge.type === 'calls' ? '#fbbf24' : 'rgba(96, 165, 250, 0.7)',
        width: 18,
        height: 18,
      },
    }));

    const layouted = getLayoutedElements(rawNodes, rawEdges, !!selectedNodeId);
    setNodes(layouted.nodes.map((n: any) => ({
      ...n,
      selected: n.id === selectedNodeId
    })));
    setEdges(layouted.edges);
  }, [graph, selectedNodeId, setNodes, setEdges]);
  const [hoveredNode, setHoveredNode] = useState<any>(null);
  const [hoverPosition, setHoverPosition] = useState({ x: 0, y: 0 });
  const [hoveredNodeContent, setHoveredNodeContent] = useState<string | null>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [aiExplanations, setAiExplanations] = useState<Record<string, string>>({});
  const [isExplaining, setIsExplaining] = useState<Record<string, boolean>>({});

  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isPanelDragging, setIsPanelDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, offsetX: 0, offsetY: 0 });
  const currentPanelOffset = useRef({ x: 0, y: 0 });
  const panelRef = useRef<HTMLDivElement>(null);

  const startPanelDrag = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsPanelDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      offsetX: dragOffset.x,
      offsetY: dragOffset.y,
    };
    currentPanelOffset.current = { ...dragOffset };
    
    const onMouseMove = (moveEvent: MouseEvent) => {
      const newX = dragStartRef.current.offsetX + (moveEvent.clientX - dragStartRef.current.x);
      const newY = dragStartRef.current.offsetY + (moveEvent.clientY - dragStartRef.current.y);
      currentPanelOffset.current = { x: newX, y: newY };
      if (panelRef.current) {
        const left = hoverPosition.x + 15 + newX;
        const top = hoverPosition.y + 15 + newY;
        panelRef.current.style.left = `${left}px`;
        panelRef.current.style.top = `${top}px`;
      }
    };
    
    const onMouseUp = () => {
      setIsPanelDragging(false);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      setDragOffset({ ...currentPanelOffset.current });
    };
    
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const handleExplainNode = async (node: any, content: string | null) => {
    if (!node) return;
    setIsExplaining(prev => ({ ...prev, [node.id]: true }));
    try {
      let sourceCode = content;
      if (content && node.type === "function") {
        const lines = content.split("\n");
        const start = Math.max(node.line - 1, 0);
        const end = node.endLine ? node.endLine : start + 10;
        sourceCode = lines.slice(start, end).join("\n");
      }

      const nodeData = {
        label: node.label,
        type: node.type,
        path: node.path || node.file,
        functionType: node.functionType,
        imports: node.imports,
        calls: node.calls,
        calledBy: node.calledBy,
        sourceCode: sourceCode
      };
      const response = await explainNode(nodeData);
      setAiExplanations(prev => ({ ...prev, [node.id]: response.explanation || response.error }));
    } catch (err) {
      console.error(err);
      setAiExplanations(prev => ({ ...prev, [node.id]: "Failed to generate explanation." }));
    } finally {
      setIsExplaining(prev => ({ ...prev, [node.id]: false }));
    }
  };

  useEffect(() => {
    if (!hoveredNode) {
      setHoveredNodeContent(null);
      return;
    }
    if (hoveredNode.type === "folder" || hoveredNode.type === "memory") {
      setHoveredNodeContent(`// Directory/Module: ${hoveredNode.label}`);
      return;
    }
    const filePath = hoveredNode.path || hoveredNode.file;
    if (!filePath || filePath === "external") return;
    
    let isMounted = true;
    const fetchContent = async () => {
      const cachedFile = await getOpenedFile(repoId, filePath);
      if (cachedFile && cachedFile.content && cachedFile.content.trim() !== "") {
        if (isMounted) setHoveredNodeContent(cachedFile.content);
        return;
      }
      try {
        const file = await getFileContent(repoId, filePath);
        if (file.error) return;
        const fileContent = file.content ?? "";
        if (isMounted && fileContent.trim() !== "") {
          setHoveredNodeContent(fileContent);
        }
        if (fileContent.trim() !== "") {
          await saveOpenedFile({
            repoId,
            path: filePath,
            content: fileContent,
            updatedAt: Date.now()
          });
        }
      } catch (e) {
        // ignore
      }
    };
    
    const timer = setTimeout(fetchContent, 200); // 200ms debounce
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [hoveredNode, repoId]);

  const getFunctionSnippet = () => {
    if (!hoveredNodeContent) return "";
    if (hoveredNode.type === "function") {
      const lines = hoveredNodeContent.split("\n");
      const start = Math.max(hoveredNode.line - 1, 0);
      const end = hoveredNode.endLine ? hoveredNode.endLine : start + 10;
      return lines.slice(start, end).join("\n");
    }
    const lines = hoveredNodeContent.split("\n");
    return lines.slice(0, 500).join("\n");
  }

  const getLanguage = () => {
    const filePath = hoveredNode?.path || hoveredNode?.file || "";
    if (filePath.endsWith('.py')) return 'python';
    if (filePath.endsWith('.go')) return 'go';
    if (filePath.endsWith('.java')) return 'java';
    if (filePath.endsWith('.cpp') || filePath.endsWith('.c')) return 'cpp';
    if (filePath.endsWith('.rs')) return 'rust';
    return 'typescript';
  }

  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const maskRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || !maskRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    maskRef.current.style.maskImage = `radial-gradient(circle 200px at ${x}px ${y}px, black 0%, transparent 100%)`;
    maskRef.current.style.webkitMaskImage = `radial-gradient(circle 200px at ${x}px ${y}px, black 0%, transparent 100%)`;
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (!maskRef.current) return;
    maskRef.current.style.maskImage = `radial-gradient(circle 200px at -1000px -1000px, black 0%, transparent 100%)`;
    maskRef.current.style.webkitMaskImage = `radial-gradient(circle 200px at -1000px -1000px, black 0%, transparent 100%)`;
  }, []);

  const isLowZoomRef = useRef(false);
  const handleMove = useCallback((_: any, viewport: { x: number; y: number; zoom: number }) => {
    if (!containerRef.current) return;
    if (viewport.zoom < 0.6 && !isLowZoomRef.current) {
      isLowZoomRef.current = true;
      containerRef.current.classList.add('lod-low');
    } else if (viewport.zoom >= 0.6 && isLowZoomRef.current) {
      isLowZoomRef.current = false;
      containerRef.current.classList.remove('lod-low');
    }
  }, []);

  const { displayNodes, displayEdges } = useMemo(() => {
    if (viewMode === 'playground') {
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

      const rawNodes = nodes.map((n) => {
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
          ...n,
          type: 'custom',
          data: {
            ...n.data,
            status,
            activeStepNumber,
          },
        };
      });

      const rawEdges = edges.map((e) => {
        const isFlowEdge = involvedIds.has(e.source) && involvedIds.has(e.target);
        const isDimmed = involvedIds.size > 0 && !isFlowEdge;
        return {
          ...e,
          type: 'flowAnimated',
          data: {
            ...e.data,
            isExecuting: false,
            isFlowEdge,
            isDimmed,
          },
        };
      });

      if (scenario && scenario.steps && scenario.steps.length > 0) {
        scenario.steps.forEach((st, idx) => {
          if (!st.fromNodeId || !st.toNodeId) return;

          const isExecuting = idx === currentStepIndex;
          const isVisitedStep = currentStepIndex >= 0 && idx < currentStepIndex;
          const isRoadmapStep = currentStepIndex === -1 || idx > currentStepIndex;

          rawEdges.push({
            id: `flow-step-${st.id || idx}-${idx}`,
            source: st.fromNodeId,
            target: st.toNodeId,
            type: 'flowAnimated',
            zIndex: isExecuting ? 50 : isVisitedStep ? 30 : 20,
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: isExecuting || isVisitedStep ? "#10b981" : "rgba(16, 185, 129, 0.75)",
              width: 18,
              height: 18,
            },
            data: {
              isExecuting,
              isVisitedStep,
              isRoadmapStep,
              isFlowEdge: true,
              isDimmed: false,
              stepNumber: idx + 1,
              label: st.label,
            },
          });
        });
      }

      return { displayNodes: rawNodes, displayEdges: rawEdges };
    }

    const activeId = hoveredNode?.id || selectedNodeId;
    if (!activeId) {
      return { displayNodes: nodes, displayEdges: edges };
    }

    const connectedNodeIds = new Set<string>();
    connectedNodeIds.add(activeId);

    const highlightedEdges = edges.map((e) => {
      const isConnected = e.source === activeId || e.target === activeId;
      if (isConnected) {
        connectedNodeIds.add(e.source);
        connectedNodeIds.add(e.target);
        return {
          ...e,
          animated: true,
          style: {
            ...e.style,
            strokeWidth: (Number(e.style?.strokeWidth) || 1.5) + 1,
            opacity: 1,
          },
          zIndex: 10,
        };
      } else {
        return {
          ...e,
          style: {
            ...e.style,
            opacity: 0.12,
          },
          zIndex: 1,
        };
      }
    });

    const highlightedNodes = nodes.map((n) => {
      const isConnected = connectedNodeIds.has(n.id);
      return {
        ...n,
        style: {
          ...n.style,
          opacity: isConnected ? 1 : 0.3,
          transition: 'opacity 0.2s ease-in-out',
        },
      };
    });

    return { displayNodes: highlightedNodes, displayEdges: highlightedEdges };
  }, [nodes, edges, hoveredNode, selectedNodeId, viewMode, scenario, currentStepIndex]);

  const activeStep = scenario && currentStepIndex >= 0 ? scenario.steps[currentStepIndex] : null;

  return (
    <div 
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="w-full h-full relative bg-bg-base"
    >
      {/* Large Repo Mode Floating Notice */}
      {!selectedNodeId && graph?.nodes?.length > 350 && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-30 bg-black/80 border border-white/20 text-white px-5 py-2.5 rounded-full text-xs font-mono backdrop-blur-xl shadow-2xl flex items-center gap-3 animate-in fade-in duration-300">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>⚡ Large Repo Mode Active: Showing Macro Directory & File Map ({nodes.length} visible of {graph.nodes.length} total AST nodes). Click any file to expand internal functions.</span>
        </div>
      )}

      <ReactFlow
        nodes={displayNodes}
        edges={displayEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        onMove={handleMove}
        onNodeClick={(_, node) => {
          onNodeSelect(node);
          if (zoomToNodeRef.current) {
            zoomToNodeRef.current(node.id);
          }
        }}
        onNodeDragStart={() => {
          setIsDragging(true);
          setHoveredNode(null);
        }}
        onNodeDragStop={() => {
          setIsDragging(false);
        }}
        onNodeMouseEnter={(e, node) => {
          if (!isDragging && viewMode !== 'playground') {
            if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
            if (!hoveredNode || hoveredNode.id !== node.id) {
              setHoveredNode(node.data);
              setHoverPosition({ x: e.clientX, y: e.clientY });
              setDragOffset({ x: 0, y: 0 });
            }
          }
        }}
        onNodeMouseLeave={() => {
          hoverTimeoutRef.current = setTimeout(() => {
            setHoveredNode(null);
          }, 200);
        }}
        proOptions={proOptions}
      >
        <FitViewOnUpdate nodes={nodes} viewMode={viewMode} />
        <FitViewOnStep targetNodeId={activeStep?.toNodeId} fromNodeId={activeStep?.fromNodeId} isPlaying={isPlaying} />
        <GraphController zoomToNodeRef={zoomToNodeRef} selectedNodeId={selectedNodeId} viewMode={viewMode} />
        
        {/* Base Faint Background */}
        <Background color="rgba(255, 255, 255, 0.1)" gap={16} size={1} />
        
        {/* Highlighted Bright Background with mask */}
        <div 
          ref={maskRef}
          className="absolute inset-0 z-0 pointer-events-none transition-opacity duration-300"
          style={{
            maskImage: `radial-gradient(circle 200px at -1000px -1000px, black 0%, transparent 100%)`,
            WebkitMaskImage: `radial-gradient(circle 200px at -1000px -1000px, black 0%, transparent 100%)`
          }}
        >
          <Background color="rgba(255, 255, 255, 0.4)" gap={16} size={1} />
        </div>

        <Controls className="!bg-black/40 !backdrop-blur-md !border-white/10 !fill-white [&>button]:!border-white/10 [&>button]:!bg-transparent [&>button]:hover:!bg-white/10" />
        <MiniMap
          className="!bg-black/40 !backdrop-blur-md !border-white/10"
          maskColor="rgba(0, 0, 0, 0.7)"
          nodeColor="rgba(255, 255, 255, 0.5)"
        />

        {/* Hover Tooltip */}
        {hoveredNode && !isDragging && (
          <div 
            ref={panelRef}
            className="fixed z-50 bg-black/60 backdrop-blur-md border border-white/10 rounded-lg shadow-2xl p-3 w-72 transition-opacity"
            style={{ left: hoverPosition.x + 15 + dragOffset.x, top: hoverPosition.y + 15 + dragOffset.y }}
            onMouseEnter={() => {
              if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
            }}
            onMouseLeave={() => {
              if (!isPanelDragging) {
                hoverTimeoutRef.current = setTimeout(() => {
                  setHoveredNode(null);
                }, 200);
              }
            }}
          >
            <div 
              className="font-semibold text-white mb-1 truncate cursor-move select-none hover:text-brand transition-colors"
              onMouseDown={startPanelDrag}
              title="Drag to move panel"
            >
              {hoveredNode.label}
            </div>
            <div className="text-[10px] text-text-muted mb-3 font-mono truncate pb-2 border-b border-white/10">
              {hoveredNode.path || hoveredNode.file}
            </div>
            
            <div className="flex flex-col gap-1.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-text-muted">Type</span>
                <span className="text-white capitalize font-medium px-1.5 py-0.5 bg-white/10 rounded text-[10px]">
                  {hoveredNode.functionType || hoveredNode.type}
                </span>
              </div>
              
              {hoveredNode.type === "file" && (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-text-muted">Imports</span>
                    <span className="text-text-main font-mono">{hoveredNode.imports?.length || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-text-muted">Functions</span>
                    <span className="text-text-main font-mono">{hoveredNode.functions?.length || 0}</span>
                  </div>
                </>
              )}
              
              {hoveredNode.type === "function" && (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-text-muted">Calls</span>
                    <span className="text-text-main font-mono">{hoveredNode.calls?.length || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-text-muted">Called By</span>
                    <span className="text-text-main font-mono">{hoveredNode.calledBy?.length || 0}</span>
                  </div>
                  {hoveredNode.line && (
                    <div className="flex justify-between items-center mt-1 pt-1 border-t border-white/10">
                      <span className="text-text-muted">Lines</span>
                      <span className="text-white font-mono text-[10px] bg-white/10 px-1 rounded">
                        {hoveredNode.line} - {hoveredNode.endLine || '?'}
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>

            {hoveredNodeContent && (
              <div className="mt-3 border-t border-white/10 pt-2">
                <span className="text-[10px] text-text-muted uppercase tracking-wider mb-1 block">Preview</span>
                <div className="rounded-md overflow-hidden text-[9px] max-h-[150px] overflow-y-auto border border-white/10 bg-black/40">
                  <SyntaxHighlighter
                    language={getLanguage()}
                    style={oneDark}
                    customStyle={{ margin: 0, padding: '0.5rem', background: 'transparent' }}
                  >
                    {getFunctionSnippet()}
                  </SyntaxHighlighter>
                </div>
              </div>
            )}

            {/* AI Explanation Section */}
            <div className="mt-3 border-t border-white/10 pt-2">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] text-text-muted uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5 text-brand" /> AI Explanation
                </span>
                {!aiExplanations[hoveredNode.id] && (
                  <button 
                    onClick={() => handleExplainNode(hoveredNode, hoveredNodeContent)} 
                    disabled={isExplaining[hoveredNode.id]}
                    className="bg-white/10 hover:bg-white/20 border border-white/20 px-2 py-0.5 rounded text-[9px] font-medium transition-all duration-300 disabled:opacity-50 flex items-center gap-1 cursor-pointer"
                  >
                    {isExplaining[hoveredNode.id] ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Sparkles className="w-2 h-2" />}
                    {isExplaining[hoveredNode.id] ? "Loading..." : "Explain"}
                  </button>
                )}
              </div>
              
              {aiExplanations[hoveredNode.id] ? (
                <div className="text-text-muted text-[10px] prose prose-invert prose-sm max-w-none prose-p:leading-snug prose-pre:bg-black/50 prose-pre:border prose-pre:border-white/10 max-h-[150px] overflow-y-auto pr-1">
                  <ReactMarkdown>{aiExplanations[hoveredNode.id]}</ReactMarkdown>
                </div>
              ) : (
                <div className="text-[9px] text-text-muted italic">
                  Click 'Explain' for a quick AI summary.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="absolute top-4 right-4 bg-black/40 backdrop-blur-md border border-white/10 rounded-lg p-3 shadow-lg z-10 w-56 text-sm">
          <h4 className="font-medium text-text-muted mb-2 text-xs uppercase tracking-wider">Legend</h4>
          
          <div className="space-y-3">
            {/* Nodes Section */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm bg-node-file shrink-0"></div>
                <span className="text-text-main text-[11px] font-medium">File / Class</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm bg-node-component shrink-0"></div>
                <span className="text-text-main text-[11px] font-medium">Component</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm bg-node-function shrink-0"></div>
                <span className="text-text-main text-[11px] font-medium">Function / Util</span>
              </div>
            </div>

            <div className="h-px bg-white/10"></div>

            {/* Edges Section */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2" title="Solid lines show file dependencies. Indicates a file imports code from another file.">
                <div className="w-4 h-0.5 bg-blue-500/60 shrink-0"></div>
                <span className="text-text-main text-[11px] font-medium flex items-center">
                  Import
                  <span className="text-text-muted text-[10px] ml-1 font-normal">- dependency</span>
                </span>
              </div>

              <div className="flex items-center gap-2" title="Dashed lines show execution flow. Identifies precisely which functions call other functions.">
                <div className="w-4 h-0.5 border-t-[2px] border-dashed border-amber-500 shrink-0"></div>
                <span className="text-text-main text-[11px] font-medium flex items-center">
                  Call
                  <span className="text-text-muted text-[10px] ml-1 font-normal">- execution flow</span>
                </span>
              </div>

              <div className="flex items-center gap-2" title="Dotted lines show structure. Connects a file node to the individual functions declared inside it.">
                <div className="w-4 h-0.5 border-t-[1.5px] border-dotted border-emerald-500/40 shrink-0"></div>
                <span className="text-text-main text-[11px] font-medium flex items-center">
                  Contains
                  <span className="text-text-muted text-[10px] ml-1 font-normal">- structure</span>
                </span>
              </div>
            </div>
          </div>
        </div>

      </ReactFlow>

      {/* Flow Step Inspector Drawer */}
      {viewMode === 'playground' && (
        <FlowStepInspector
          step={inspectedStep}
          totalSteps={scenario?.steps?.length || 0}
          onClose={() => setInspectedStep(null)}
        />
      )}

      {/* Flow Playground Controller Bar & ONLY Structure Map Circle Button */}
      {viewMode === 'playground' && (
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
                    setIsExiting(false);
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
      )}

      {/* Structure Map Mode Switch Buttons at bottom center */}
      {viewMode !== 'playground' && onTogglePlayground && (
        <div className="absolute left-1/2 -translate-x-1/2 z-50 bottom-6 sm:bottom-8 flex items-center gap-2.5 pointer-events-auto animate-in fade-in slide-in-from-bottom-6 duration-300">
          {/* Left: Green Play Circle inside Dark Circle (triggers Playground) */}
          <button
            onClick={onTogglePlayground}
            className="w-12 h-12 rounded-full bg-[#141419] border border-white/15 shadow-[0_10px_35px_rgba(0,0,0,0.85)] p-1.5 flex items-center justify-center transition-all hover:border-white/30 hover:scale-105 active:scale-95 cursor-pointer group"
            title="Switch to Flow Playground"
          >
            <div className="w-full h-full rounded-full bg-emerald-500 group-hover:bg-emerald-400 flex items-center justify-center shadow-md transition-all">
              <Play className="w-4 h-4 text-black fill-black ml-0.5" />
            </div>
          </button>

          {/* Right: Structure Map Icon Circle (Active indicator) */}
          <div
            className="w-12 h-12 rounded-full bg-[#141419] border border-white/25 shadow-[0_10px_35px_rgba(0,0,0,0.85)] flex items-center justify-center text-white cursor-default"
            title="Structure Map (Active)"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
              <rect x="4" y="4" width="6" height="6" rx="1.5" />
              <rect x="14" y="14" width="6" height="6" rx="1.5" />
              <path d="M7 10v4a2 2 0 0 0 2 2h5" />
            </svg>
          </div>
        </div>
      )}
    </div>
  );
}

export default React.memo(RepoGraph);

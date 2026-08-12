"use client";

import { Background, Controls, MiniMap, ReactFlow, MarkerType, useReactFlow, useNodesState, useEdgesState, type ReactFlowInstance } from "reactflow";
import "reactflow/dist/style.css";
import { getLayoutedElements } from "@/utils/layoutGragh";
import { exportGraphAsPng, exportGraphAsPdf } from "@/utils/exportGraphImage";
import React, { useEffect, useState, useRef, useMemo, useCallback, forwardRef, useImperativeHandle } from "react";
import CustomNode from "./CustomNode";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { getOpenedFile, saveOpenedFile } from "@/lib/db/openedFiles";
import { getFileContent, explainNode } from "@/services/api";
import ReactMarkdown from 'react-markdown';
import { Loader2, Sparkles, Copy, Check } from "lucide-react";
import GraphSearch from "./GraphSearch";

const initialNodeTypes = {
  custom: CustomNode,
};

// Imperative methods exposed to the parent (page.tsx / Header's Export
// dropdown), since the actual capture logic needs direct access to this
// component's DOM container and React Flow instance — neither of which
// the parent has any other way to reach. See performExport below.
export interface RepoGraphHandle {
  exportAsPng: () => Promise<void>;
  exportAsPdf: () => Promise<void>;
}

interface Props {
  graph: any;
  repoId: string;
  onNodeSelect: (node: any) => void;
  selectedNodeId?: string;
}

function FitViewOnUpdate({ nodes, skipNextRef }: { nodes: any[]; skipNextRef: React.MutableRefObject<boolean> }) {
  const { fitView } = useReactFlow();

  useEffect(() => {
    // When a search-triggered jump is about to run (see JumpToNode below),
    // skip this fitView entirely — otherwise the view zooms out to fit
    // everything first, then our jump immediately re-centers/zooms again,
    // producing a jarring double camera movement instead of one smooth jump.
    if (skipNextRef.current) {
      skipNextRef.current = false;
      return;
    }
    const timer = setTimeout(() => {
      fitView({ padding: 0.2, duration: 800 });
    }, 50);
    return () => clearTimeout(timer);
  }, [nodes, fitView, skipNextRef]);

  return null;
}

// Pans and zooms the canvas to frame a given node together with its
// directly connected neighbors, once the node's laid-out position becomes
// available. Used to "jump" to a node selected via search, fulfilling the
// Search & Jump feature request (#7).
//
// Earlier version centered on a single point (setCenter). That worked for
// small expansions, but broke down for nodes with many call/called-by
// connections: Dagre's left-to-right layout stacks all connected nodes
// in the next rank, often placing the target near one edge of a very
// tall span. Centering on a single point then left most of the relevant
// context (and sometimes the node's readable label) outside the visible
// viewport. Computing a bounding box around the node AND its direct
// neighbors, then using fitBounds, guarantees the searched node is shown
// together with enough surrounding context, regardless of where it sits
// within the expanded layout.
function JumpToNode({
  nodes,
  edges,
  request,
}: {
  nodes: any[];
  edges: any[];
  request: { id: string; nonce: number } | null;
}) {
  const { fitBounds } = useReactFlow();
  const handledNonceRef = useRef<number | null>(null);

  useEffect(() => {
    if (!request || request.nonce === handledNonceRef.current) return;
    const targetNode = nodes.find((n) => n.id === request.id);
    if (!targetNode) return; // position not laid out yet — wait for the next update

    handledNonceRef.current = request.nonce;

    // Wait two animation frames so layout/sidebar resize has genuinely
    // settled before we measure positions — see prior comment history
    // in this file for why a fixed timeout isn't reliable here.
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        const settledTarget = nodes.find((n) => n.id === request.id) ?? targetNode;

        const connectedIds = new Set<string>([settledTarget.id]);
        edges.forEach((e: any) => {
          if (e.source === settledTarget.id) connectedIds.add(e.target);
          if (e.target === settledTarget.id) connectedIds.add(e.source);
        });

        const relevantNodes = nodes.filter((n) => connectedIds.has(n.id));
        const nodesForBounds = relevantNodes.length > 0 ? relevantNodes : [settledTarget];

        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        nodesForBounds.forEach((n) => {
          const w = n.width ?? 150;
          const h = n.height ?? 50;
          minX = Math.min(minX, n.position.x);
          minY = Math.min(minY, n.position.y);
          maxX = Math.max(maxX, n.position.x + w);
          maxY = Math.max(maxY, n.position.y + h);
        });

        fitBounds(
          { x: minX, y: minY, width: maxX - minX, height: maxY - minY },
          { padding: 0.3, duration: 600 }
        );
      });
    });

    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [nodes, edges, request, fitBounds]);

  return null;
}

const RepoGraph = forwardRef<RepoGraphHandle, Props>(function RepoGraph({ graph, repoId, onNodeSelect, selectedNodeId }, ref) {
  const [nodeTypes] = useState(initialNodeTypes);
  const [proOptions] = useState({ hideAttribution: true });

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Captured via <ReactFlow onInit={...}> below. This is the simplest
  // way to get imperative instance methods (fitView, getViewport,
  // setViewport) from OUTSIDE the <ReactFlow> tree — useReactFlow()
  // only works in components rendered as children of <ReactFlow>
  // (like FitViewOnUpdate/JumpToNode below), not in this outer
  // component, which is the one that needs to expose export methods
  // up to the parent via the ref.
  const reactFlowInstanceRef = useRef<ReactFlowInstance | null>(null);

  // Tracks the most recent "jump to this node" request from search (or
  // could be extended to other triggers later). Lives here, inside the
  // component, since useState must be called during render — never at
  // module scope.
  const [jumpRequest, setJumpRequest] = useState<{ id: string; nonce: number } | null>(null);
  // Set to true the instant a search result is clicked, read (and reset)
  // by FitViewOnUpdate on the very next nodes update, so that update's
  // fitView is skipped in favor of JumpToNode's single camera movement.
  const skipNextFitRef = useRef(false);

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
  const [copiedId, setCopiedId] = useState<string | null>(null);

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
  const handleCopyExplanation = async (nodeId: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(nodeId);
      setTimeout(() => {
        setCopiedId((prev) => (prev === nodeId ? null : prev));
      }, 1500);
    } catch (err) {
      console.error("Failed to copy explanation:", err);
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
  }, [nodes, edges, hoveredNode, selectedNodeId]);

  const performExport = useCallback(
    async (format: "png" | "pdf") => {
      const instance = reactFlowInstanceRef.current;
      const container = containerRef.current;
      if (!instance || !container) {
        throw new Error("Graph is not ready to export yet.");
      }

      // Remember everything we're about to change, so we can restore
      // it exactly afterward — exporting shouldn't leave any lasting
      // trace on the user's session.
      const previousViewport = instance.getViewport();
      const previousWidth = container.style.width;
      const previousHeight = container.style.height;
      const hadLodLow = container.classList.contains("lod-low");

      // The earlier version of this export fit the WHOLE graph into
      // the normal-sized viewport by zooming out very far, then relied
      // on a high pixelRatio to upscale the result. That doesn't work
      // for large graphs: shrinking hundreds of nodes down to fit a
      // ~1900px-wide viewport leaves only a few real pixels per node,
      // and no amount of upscaling afterward can recover detail that
      // was never rendered at readable size to begin with — you're
      // just blowing up a blurry source.
      //
      // The correct approach (what real diagramming tools do): don't
      // shrink the content at all. Instead, compute the graph's actual
      // full size in flow coordinates, temporarily resize the capture
      // container to match it, and position the viewport so every node
      // renders at its true, native resolution. The resulting image is
      // simply as large as the graph actually is — large graphs produce
      // large images, but every node stays crisp, because nothing was
      // ever shrunk in the first place.
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      nodes.forEach((n) => {
        const w = n.width ?? 260;
        const h = n.height ?? 120;
        minX = Math.min(minX, n.position.x);
        minY = Math.min(minY, n.position.y);
        maxX = Math.max(maxX, n.position.x + w);
        maxY = Math.max(maxY, n.position.y + h);
      });

      if (minX === Infinity) {
        throw new Error("Graph has no nodes to export.");
      }

      const PADDING = 80; // flow-coordinate padding around the content
      const contentWidth = maxX - minX + PADDING * 2;
      const contentHeight = maxY - minY + PADDING * 2;

      // Safety cap: the earlier cap of 10,000px, combined with a
      // pixelRatio multiplier on top, produced canvases large enough
      // (~200+ million pixels, with hundreds of DOM nodes using
      // expensive CSS like backdrop-blur and gradients) to spike
      // CPU/GPU usage hard enough to crash the browser tab on a
      // 400+ node graph. This cap is deliberately much more
      // conservative — stability matters more than squeezing out
      // marginally more resolution. For very large repos, content
      // will be scaled down somewhat to stay within this budget; that
      // trade-off is expected and preferable to a crash.
      const MAX_CAPTURE_DIMENSION = 4000;
      const scale = Math.min(1, MAX_CAPTURE_DIMENSION / Math.max(contentWidth, contentHeight));

      const captureWidth = Math.ceil(contentWidth * scale);
      const captureHeight = Math.ceil(contentHeight * scale);

      container.style.width = `${captureWidth}px`;
      container.style.height = `${captureHeight}px`;

      instance.setViewport(
        { x: -(minX - PADDING) * scale, y: -(minY - PADDING) * scale, zoom: scale },
        { duration: 0 }
      );

      // Wait for the container's resize to actually take effect (React
      // Flow watches its container via ResizeObserver and needs a beat
      // to recompute internally) and for the DOM to finish painting at
      // the new size/viewport before we capture it.
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      });

      // Strip the 'lod-low' performance class (hides/truncates node
      // detail below zoom 0.6) AFTER setViewport, not before. setViewport
      // triggers this component's own onMove handler, which re-derives
      // and re-applies 'lod-low' based on the NEW zoom — and our export
      // zoom (`scale`) is almost always well under 0.6 for large graphs.
      // Removing the class before setViewport meant it got silently
      // re-added a moment later by that onMove side-effect, so every
      // export was actually capturing the low-detail/truncated-label
      // rendering regardless of what the user saw on screen beforehand
      // (which is why manually zooming in before export seemed to
      // "fix" it — that was incidental, not the real cause). Removing
      // it here, after the viewport change and its side-effects have
      // already settled, is the actual fix.
      container.classList.remove("lod-low");

      const repoName =
        repoId?.split("/").filter(Boolean).pop()?.replace(".git", "") || "repository";
      const dateStamp = new Date().toISOString().slice(0, 10);
      const filename = `${repoName}-graph-${dateStamp}`;

      try {
        if (format === "png") {
          await exportGraphAsPng(container, filename);
        } else {
          await exportGraphAsPdf(container, filename);
        }
      } finally {
        // Always restore everything, even if the export itself failed
        // partway through.
        container.style.width = previousWidth;
        container.style.height = previousHeight;
        if (hadLodLow) container.classList.add("lod-low");
        instance.setViewport(previousViewport, { duration: 0 });
      }
    },
    [repoId, nodes]
  );

  useImperativeHandle(
    ref,
    () => ({
      exportAsPng: () => performExport("png"),
      exportAsPdf: () => performExport("pdf"),
    }),
    [performExport]
  );

  return (
    <div 
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="w-full h-full relative bg-bg-base"
    >
      {/* Large Repo Mode Floating Notice */}
      {!selectedNodeId && graph?.nodes?.length > 350 && (
        <div data-export-exclude="true" className="absolute top-6 left-1/2 -translate-x-1/2 z-30 bg-black/80 border border-white/20 text-white px-5 py-2.5 rounded-full text-xs font-mono backdrop-blur-xl shadow-2xl flex items-center gap-3 animate-in fade-in duration-300">
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
        fitView
        onInit={(instance) => {
          reactFlowInstanceRef.current = instance;
        }}
        onMove={handleMove}
        onNodeClick={(_, node) => onNodeSelect(node)}
        onNodeDragStart={() => {
          setIsDragging(true);
          setHoveredNode(null);
        }}
        onNodeDragStop={() => {
          setIsDragging(false);
        }}
        onNodeMouseEnter={(e, node) => {
          if (!isDragging) {
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
        <FitViewOnUpdate nodes={nodes} skipNextRef={skipNextFitRef} />
        <JumpToNode nodes={nodes} edges={edges} request={jumpRequest} />
        <GraphSearch
          nodes={graph.nodes}
          onSelectResult={(node) => {
            skipNextFitRef.current = true;
            onNodeSelect(node);
            setJumpRequest({ id: node.id, nonce: Date.now() });
          }}
        />
        
        {/* Base Faint Background */}
        <Background color="rgba(255, 255, 255, 0.1)" gap={16} size={1} />
        
        {/* Highlighted Bright Background with mask */}
        <div 
          ref={maskRef}
          data-export-exclude="true"
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
            data-export-exclude="true"
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
                {!aiExplanations[hoveredNode.id] ? (
                  <button 
                    onClick={() => handleExplainNode(hoveredNode, hoveredNodeContent)} 
                    disabled={isExplaining[hoveredNode.id]}
                    className="bg-white/10 hover:bg-white/20 border border-white/20 px-2 py-0.5 rounded text-[9px] font-medium transition-all duration-300 disabled:opacity-50 flex items-center gap-1 cursor-pointer"
                  >
                    {isExplaining[hoveredNode.id] ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Sparkles className="w-2 h-2" />}
                    {isExplaining[hoveredNode.id] ? "Loading..." : "Explain"}
                  </button>
                ) : (
                  <button
                    onClick={() => handleCopyExplanation(hoveredNode.id, aiExplanations[hoveredNode.id])}
                    className="bg-white/10 hover:bg-white/20 border border-white/20 p-1 rounded transition-all duration-300 cursor-pointer"
                    title="Copy explanation"
                  >
                    {copiedId === hoveredNode.id ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5" />}
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
        <div data-export-exclude="true" className="absolute top-4 right-4 bg-black/40 backdrop-blur-md border border-white/10 rounded-lg p-3 shadow-lg z-10 w-56 text-sm">
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
    </div>
  );
});

export default React.memo(RepoGraph);
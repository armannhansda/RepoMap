"use client";

import { Background, Controls, MiniMap, ReactFlow, MarkerType, useReactFlow, useNodesState, useEdgesState } from "reactflow";
import "reactflow/dist/style.css";
import { getLayoutedElements } from "@/utils/layoutGragh";
import { useEffect, useState, useRef } from "react";
import CustomNode from "./CustomNode";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { getOpenedFile, saveOpenedFile } from "@/lib/db/openedFiles";
import { getFileContent, explainNode } from "@/services/api";
import ReactMarkdown from 'react-markdown';
import { Loader2, Sparkles } from "lucide-react";

const nodeTypes = {
  custom: CustomNode,
};

interface Props {
  graph: any;
  repoId: string;
  onNodeSelect: (node: any) => void;
  selectedNodeId?: string;
}

function FitViewOnUpdate({ nodes }: { nodes: any[] }) {
  const { fitView } = useReactFlow();

  useEffect(() => {
    const timer = setTimeout(() => {
      fitView({ padding: 0.2, duration: 800 });
    }, 50);
    return () => clearTimeout(timer);
  }, [nodes, fitView]);

  return null;
}

export default function RepoGraph({ graph, repoId, onNodeSelect, selectedNodeId }: Props) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

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
      type: 'smoothstep',
      animated: edge.type === 'calls',
      style: {
        stroke: edge.type === 'calls' ? '#f59e0b' : edge.type === 'contains' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(59, 130, 246, 0.6)',
        strokeWidth: edge.type === 'calls' ? 1.5 : edge.type === 'contains' ? 1 : 1.5,
        strokeDasharray: edge.type === 'calls' ? '5,5' : edge.type === 'contains' ? '3,3' : 'none',
      },
      markerEnd: edge.type === 'contains' ? undefined : {
        type: MarkerType.ArrowClosed,
        color: edge.type === 'calls' ? '#f59e0b' : 'rgba(59, 130, 246, 0.6)',
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
    const filePath = hoveredNode.path || hoveredNode.file;
    if (filePath === "external") return;
    
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
  const [mousePos, setMousePos] = useState({ x: -1000, y: -1000 });
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  return (
    <div 
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setMousePos({ x: -1000, y: -1000 })}
      className="w-full h-full relative bg-bg-base"
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
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
            setHoveredNode(node.data);
            setHoverPosition({ x: e.clientX, y: e.clientY });
          }
        }}
        onNodeMouseLeave={() => {
          hoverTimeoutRef.current = setTimeout(() => {
            setHoveredNode(null);
          }, 200);
        }}
        proOptions={{ hideAttribution: true }}
      >
        <FitViewOnUpdate nodes={nodes} />
        
        {/* Base Faint Background */}
        <Background color="rgba(255, 255, 255, 0.1)" gap={16} size={1} />
        
        {/* Highlighted Bright Background with mask */}
        <div 
          className="absolute inset-0 z-0 pointer-events-none transition-opacity duration-300"
          style={{
            maskImage: `radial-gradient(circle 200px at ${mousePos.x}px ${mousePos.y}px, black 0%, transparent 100%)`,
            WebkitMaskImage: `radial-gradient(circle 200px at ${mousePos.x}px ${mousePos.y}px, black 0%, transparent 100%)`
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
            className="fixed z-50 bg-black/60 backdrop-blur-md border border-white/10 rounded-lg shadow-2xl p-3 w-72 transition-opacity"
            style={{ left: hoverPosition.x + 15, top: hoverPosition.y + 15 }}
            onMouseEnter={() => {
              if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
            }}
            onMouseLeave={() => {
              setHoveredNode(null);
            }}
          >
            <div className="font-semibold text-white mb-1 truncate">{hoveredNode.label}</div>
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
    </div>
  );
}

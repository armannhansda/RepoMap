"use client";

import { Background, Controls, MiniMap, ReactFlow, MarkerType, useReactFlow, useNodesState, useEdgesState } from "reactflow";
import "reactflow/dist/style.css";
import { getLayoutedElements } from "@/utils/layoutGragh";
import { useEffect } from "react";
import CustomNode from "./CustomNode";

const nodeTypes = {
  custom: CustomNode,
};

interface Props {
  graph: any;
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

export default function RepoGraph({ graph, onNodeSelect, selectedNodeId }: Props) {
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
        stroke: edge.type === 'calls' ? '#4f46e5' : edge.type === 'contains' ? '#334155' : '#64748b',
        strokeWidth: edge.type === 'calls' ? 1.5 : edge.type === 'contains' ? 1 : 1.5,
        strokeDasharray: edge.type === 'calls' ? '5,5' : edge.type === 'contains' ? '3,3' : 'none',
      },
      markerEnd: edge.type === 'contains' ? undefined : {
        type: MarkerType.ArrowClosed,
        color: edge.type === 'calls' ? '#4f46e5' : '#64748b',
      },
    }));

    const layouted = getLayoutedElements(rawNodes, rawEdges, !!selectedNodeId);
    setNodes(layouted.nodes.map((n: any) => ({
      ...n,
      selected: n.id === selectedNodeId
    })));
    setEdges(layouted.edges);
  }, [graph, selectedNodeId, setNodes, setEdges]);

  return (
    <div className="w-full h-full relative bg-bg-base">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        onNodeClick={(_, node) => onNodeSelect(node)}
        proOptions={{ hideAttribution: true }}
      >
        <FitViewOnUpdate nodes={nodes} />
        <Background color="#2d3748" gap={16} size={1} />
        <Controls className="!bg-surface !border-border-subtle !fill-text-main [&>button]:!border-border-subtle [&>button]:!bg-surface [&>button]:hover:!bg-surface-hover" />
        <MiniMap
          className="!bg-surface !border-border-subtle"
          maskColor="rgba(15, 17, 26, 0.7)"
          nodeColor="#4f46e5"
        />

        {/* Legend */}
        <div className="absolute top-4 right-4 bg-surface border border-border-subtle rounded-lg p-3 shadow-lg z-10 w-56 text-sm">
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

            <div className="h-px bg-border-subtle"></div>

            {/* Edges Section */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2" title="Solid lines show file dependencies. Indicates a file imports code from another file.">
                <div className="w-4 h-0.5 bg-slate-500 shrink-0"></div>
                <span className="text-text-main text-[11px] font-medium flex items-center">
                  Import
                  <span className="text-text-muted text-[10px] ml-1 font-normal">- dependency</span>
                </span>
              </div>

              <div className="flex items-center gap-2" title="Dashed indigo lines show execution flow. Identifies precisely which functions call other functions.">
                <div className="w-4 h-0.5 border-t border-dashed border-brand shrink-0"></div>
                <span className="text-text-main text-[11px] font-medium flex items-center">
                  Call
                  <span className="text-text-muted text-[10px] ml-1 font-normal">- execution flow</span>
                </span>
              </div>

              <div className="flex items-center gap-2" title="Dotted lines show structure. Connects a file node to the individual functions declared inside it.">
                <div className="w-4 h-0.5 border-t border-dotted border-slate-700 shrink-0"></div>
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

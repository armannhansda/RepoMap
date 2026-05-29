"use client";

import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
} from "reactflow";

import "reactflow/dist/style.css";

import { getLayoutedElements } from "@/utils/layoutGragh";

interface Props {
  graph: any;
}

export default function RepoGraph({
  graph,
}: Props) {
  // Create nodes
  const rawNodes = graph.nodes.map(
    (node: any) => ({
      id: node.id,
      data: {
        label: node.label,
      },
      position: {
        x: 0,
        y: 0,
      },
    })
  );

  // Create edges
  const rawEdges = graph.edges.map(
    (
      edge: any,
      index: number
    ) => ({
      id: `${edge.source}-${edge.target}-${index}`,
      source: edge.source,
      target: edge.target,
      animated: true,
    })
  );

  // Apply layout
  const {
    nodes,
    edges,
  } = getLayoutedElements(
    rawNodes,
    rawEdges
  );

  return (
    <div
      style={{
        width: "100%",
        height: "800px",
      }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  );
}
"use client";

import { Background, Controls, MiniMap, ReactFlow } from "reactflow";

import "reactflow/dist/style.css";

import { getLayoutedElements } from "@/utils/layoutGragh";
import { useMemo, useState } from "react";
import FileSidebar from "./FileSidebar";

interface Props {
  graph: any;
  repoId: string;
}

export default function RepoGraph({ graph, repoId }: Props) {
  const [selectedNode, setSelectedNode] = useState<any>(null);

  const { nodes, edges } = useMemo(() => {
    const rawNodes = graph.nodes.map((node: any) => ({
      id: node.id,
      data: {
        label: node.label,
        path: node.path,
        imports: node.imports,
        importedBy: node.importedBy,
      },
      position: {
        x: 0,
        y: 0,
      },
    }));

    const rawEdges = graph.edges.map((edge: any, index: number) => ({
      id: `${edge.source}-${edge.target}-${index}`,
      source: edge.source,
      target: edge.target,
      animated: true,
    }));

    return getLayoutedElements(rawNodes, rawEdges);
  }, [graph]);

  return (
    <div className="flex" style={{ height: "800px" }}>
      <div
        className="flex-1"
        style={{
          width: "100%",
          height: "800px",
        }}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          fitView
          onNodeClick={(_, node) => {
            console.log(node);
            setSelectedNode(node);
          }}
        >
          {selectedNode && <div>{selectedNode.data.label}</div>}
          <Background />
          <Controls />
          <MiniMap />
        </ReactFlow>
      </div>

      <FileSidebar 
        node={selectedNode}
        repoId={repoId}
      />
    </div>
  );
}

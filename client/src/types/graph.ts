import { Node, Edge } from "@xyflow/react";

export interface GraphData {
  repoId: string;
  nodes: Node[];
  edges: Edge[];
}
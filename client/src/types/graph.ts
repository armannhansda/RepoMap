import { Node, Edge } from "reactflow";

export interface GraphData {
  repoId: string;
  nodes: Node[];
  edges: Edge[];
}
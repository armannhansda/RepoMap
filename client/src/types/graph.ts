export interface GraphNode{
  id: string;
  label: string;
}

export interface GraphEdge{
  source: string;
  target: string;
}

export interface GraphData{
  nodes: GraphNode[];
  edges: GraphEdge[];
}
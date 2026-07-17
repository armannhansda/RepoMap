import dagre from "dagre";

const nodeWidth = 260;
const nodeHeight = 120;

export function getLayoutedElements(
  nodes: any[],
  edges: any[],
  isSubgraph: boolean = false
) {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  dagreGraph.setGraph({
    rankdir: "LR",
    align: "UL",
    nodesep: isSubgraph ? 35 : 45,
    ranksep: isSubgraph ? 60 : 85,
    ranker: nodes.length > 250 ? "longest-path" : "network-simplex",
  });

  // Add nodes
  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, {
      width: nodeWidth,
      height: nodeHeight,
    });
  });

  // Add edges
  edges.forEach((edge) => {
    dagreGraph.setEdge(
      edge.source,
      edge.target
    );
  });

  dagre.layout(dagreGraph);

  // Apply layout positions
  const layoutedNodes =
    nodes.map((node) => {
      const nodeWithPosition =
        dagreGraph.node(node.id);

      return {
        ...node,
        position: {
          x:
            nodeWithPosition.x -
            nodeWidth / 2,
          y:
            nodeWithPosition.y -
            nodeHeight / 2,
        },
      };
    });

  return {
    nodes: layoutedNodes,
    edges,
  };
}
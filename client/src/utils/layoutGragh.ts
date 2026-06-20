import dagre from "dagre";

const nodeWidth = 240;
const nodeHeight = 80;

export function getLayoutedElements(
  nodes: any[],
  edges: any[],
  isSubgraph: boolean = false
) {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  dagreGraph.setGraph({
    rankdir: "LR",
    nodesep: isSubgraph ? 40 : 80,
    ranksep: isSubgraph ? 40 : 250,
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
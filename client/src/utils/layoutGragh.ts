import dagre from "dagre";

const dagreGraph =
  new dagre.graphlib.Graph();

dagreGraph.setDefaultEdgeLabel(
  () => ({})
);

const nodeWidth = 220;
const nodeHeight = 60;

export function getLayoutedElements(
  nodes: any[],
  edges: any[]
) {
  dagreGraph.setGraph({
    rankdir: "LR",
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
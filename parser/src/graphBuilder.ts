export function buildGraph(
  dependencies: any[]
){
  const nodes = [];
  const edges = [];

  for (const dep of dependencies){
    //create node
    nodes.push({
      id: dep.file,
      label: dep.label ?? dep.file,
    });

    //create edges
    for(const imp of dep.imports){
      edges.push({
        source:dep.file,
        target:imp,
      });
    }

  }

  return {
    nodes,
    edges,
  }
}
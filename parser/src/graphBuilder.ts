export function buildGraph(
  dependencies: any[]
){
  const nodes: Array<{
    id: string;
    label: string;
    path: string;
    imports: string[];
    importedBy: string[];
  }> = [];
  const edges: Array<{ source: string; target: string }> = [];

  const importedByMap = new Map<string,string[]>();

  for (const dep of dependencies){
    //create node
    nodes.push({
      id: dep.file,
      label: dep.file.split("\\").pop(),
      path: dep.file,
      imports: dep.imports,
      importedBy: [],
    });

    //create edges
    for(const imp of dep.imports){
      edges.push({
        source:dep.file,
        target:imp,
      });

      if(!importedByMap.has(imp)){
        importedByMap.set(imp, []);
      }

      importedByMap.get(imp)?.push(dep.file);
    }

  }
  nodes.forEach((node)=>{
    node.importedBy = importedByMap.get(node.id) || [];
  })

  return {
    nodes,
    edges,
  }
}
export function buildGraph(
  dependencies: any[],
  functions: any[],
){
  // const nodes: Array<{
  //   id: string;
  //   label: string;
  //   path: string;
  //   type: string;
  //   imports: string[];
  //   importedBy: string[];
  // }> = [];
  // const edges: Array<{ source: string; target: string }> = [];
  const nodes: any[] = [];
  const edges:any[] = [];

  const importedByMap = new Map<string,string[]>();

  for (const dep of dependencies){
    //create node
    nodes.push({
      id: dep.file,
      label: dep.file.split("\\").pop(),
      path: dep.file,
      type:"file",
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

  for (const fn of functions){
    const functionId = `${fn.file}::${fn.name}`;

    nodes.push({
      id:functionId,
      label: fn.name,
      file: fn.file,
      functionType: fn.type,
      line:fn.line,
      type: "function"
    });

    edges.push({
      source:fn.file,
      target:functionId,
      type:"contains"
    })
  }

  return {
    nodes,
    edges,
  }
}
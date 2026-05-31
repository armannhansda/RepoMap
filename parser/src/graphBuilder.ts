import { Type } from "ts-morph";

export function buildGraph(
  dependencies: any[],
  functions: any[],
  calls: any[],
){
  // const nodes: Array<{
  //   id: string;
  //   label: string;
  //   path: string;
  //   type: string;
  //   imports: string[];
  //   importedBy: string[];
  // }> = [];
  // const edges: Array<{ source: string; target: string, type?: string }> = [];
  const nodes: any[] = [];
  const edges:any[] = [];

  const importedByMap = new Map<string,string[]>();

  const functionLookup = new Map<string, string>();

  const fileFunction = new Map<string, any[]>();

  for (const dep of dependencies){
    //create node
    nodes.push({
      id: dep.file,
      label: dep.file.split("/").pop(),
      path: dep.file,
      type:"file",
      imports: dep.imports,
      importedBy: [],
      functions:fileFunction.get(dep.file) || [],
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

  // build function nodes and lookup maps
  const functionByFileAndName = new Map<string, string>();
  const functionByName = new Map<string, string[]>();

  for (const fn of functions){
    const functionId = `${fn.file}::${fn.name}`;

    functionLookup.set(functionId, functionId);
    functionByFileAndName.set(`${fn.file}:${fn.name}`, functionId);

    if (!functionByName.has(fn.name)) functionByName.set(fn.name, []);
    functionByName.get(fn.name)!.push(functionId);

    if(!fileFunction.has(fn.file)){
      fileFunction.set(fn.file,[])
    }

    fileFunction.get(fn.file)?.push({
      name:fn.name,
      Type:fn.type,
      line: fn.line,
    })

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

  // create call edges: prefer same-file resolution, fall back to global name match
  for(const call of calls){
    const callerKey = `${call.file}:${call.caller}`;
    const calleeKeySameFile = `${call.file}:${call.callee}`;

    const callerId = functionByFileAndName.get(callerKey) || functionByName.get(call.caller)?.[0];

    let calleeId = functionByFileAndName.get(calleeKeySameFile);
    if(!calleeId){
      const matches = functionByName.get(call.callee) || [];
      calleeId = matches[0];
    }

    if(!callerId || !calleeId) continue;

    // avoid duplicate edges
    const exists = edges.some(e=>e.source===callerId && e.target===calleeId && e.type==="calls");
    if(!exists){
      edges.push({
        source:callerId,
        target: calleeId,
        type: "calls"
      })
    }
  }

  // Populate functions on file nodes now that fileFunction has been fully built
  nodes.forEach((node) => {
    if (node.type === "file") {
      node.functions = fileFunction.get(node.id) || [];
    }
  });

  return {
    nodes,
    edges,
  }
}
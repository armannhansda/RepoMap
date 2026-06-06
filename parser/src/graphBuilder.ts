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

  const functionCalls = new Map<string, string[]>();

  const calledByMap = new Map<string, string[]>();

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
      calls: functionCalls.get(`${fn.file}:${fn.name}`),
      calledBy: calledByMap.get(`${fn.file}:${fn.name}`),
    })

    nodes.push({
      id:functionId,
      label: fn.name,
      file: fn.file,
      functionType: fn.type,
      line:fn.line,
      type: "function",
      calls: functionCalls.get(`${fn.file}:${fn.name}`),
      calledBy: calledByMap.get(`${fn.file}:${fn.name}`),
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

    // record a human-friendly callee name on the caller's calls list
    if (!functionCalls.has(callerKey)) {
      functionCalls.set(callerKey, []);
    }
    functionCalls.get(callerKey)?.push(call.callee);

    // determine the callee map key (file:name) so we can populate calledBy
    const calleeMapKey = (() => {
      // if calleeId came from functionByFileAndName lookup it was based on same-file key
      const sameFileMatch = functionByFileAndName.get(calleeKeySameFile);
      if (sameFileMatch) {
        return calleeKeySameFile;
      }
      // otherwise calleeId is a functionId like "<file>::<name>"
      if (typeof calleeId === "string") {
        const parts = calleeId.split("::");
        if (parts.length === 2) return `${parts[0]}:${parts[1]}`;
      }
      return null;
    })();

    if (calleeMapKey) {
      if (!calledByMap.has(calleeMapKey)) calledByMap.set(calleeMapKey, []);
      calledByMap.get(calleeMapKey)?.push(call.caller);
    }

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

    // Attach calls and calledBy arrays to function nodes now that we've built the maps
    nodes.forEach((node) => {
      if (node.type === "function") {
        const key = `${node.file}:${node.label}`;
        node.calls = functionCalls.get(key) || [];
        node.calledBy = calledByMap.get(key) || [];
      }
    });

    // Rebuild fileFunction entries from function nodes so file nodes have up-to-date data
    fileFunction.clear();
    nodes.forEach((node) => {
      if (node.type === "function") {
        if (!fileFunction.has(node.file)) fileFunction.set(node.file, []);
        fileFunction.get(node.file)?.push({
          name: node.label,
          Type: node.functionType,
          line: node.line,
          calls: node.calls,
          calledBy: node.calledBy,
        });
      }
    });

    // Populate functions on file nodes now that fileFunction has been rebuilt
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
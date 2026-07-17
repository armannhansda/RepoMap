import { Type } from "ts-morph";
import path from "path";

export function buildGraph(
  dependencies: any[],
  functions: any[],
  calls: any[],
  classes: any[] = [],
  interfaces: any[] = [],
  techStack?: any
) {
  const nodes: any[] = [];
  const edges: any[] = [];

  const importedByMap = new Map<string, string[]>();
  const functionLookup = new Map<string, string>();
  const fileFunction = new Map<string, any[]>();
  const fileClass = new Map<string, any[]>();
  const fileInterface = new Map<string, any[]>();
  const functionCalls = new Map<string, string[]>();
  const calledByMap = new Map<string, string[]>();

  // Track folder hierarchy
  const folderMap = new Map<string, { name: string; path: string; files: string[]; subfolders: Set<string> }>();

  // Build folder nodes and mappings
  for (const dep of dependencies) {
    const filePath = dep.file;
    const parts = filePath.split("/");
    if (parts.length > 1) {
      // Build folder path hierarchy
      for (let i = 0; i < parts.length - 1; i++) {
        const folderPath = parts.slice(0, i + 1).join("/");
        if (!folderMap.has(folderPath)) {
          folderMap.set(folderPath, {
            name: parts[i],
            path: folderPath,
            files: [],
            subfolders: new Set<string>()
          });
        }
        if (i === parts.length - 2) {
          folderMap.get(folderPath)?.files.push(filePath);
        } else {
          const nextFolderPath = parts.slice(0, i + 2).join("/");
          folderMap.get(folderPath)?.subfolders.add(nextFolderPath);
        }
      }
    }
  }

  // Create folder nodes and folder -> subfolder/file edges
  for (const [folderPath, folderInfo] of folderMap.entries()) {
    nodes.push({
      id: `folder::${folderPath}`,
      label: folderInfo.name,
      path: folderPath,
      type: "folder",
      files: folderInfo.files,
      subfolders: Array.from(folderInfo.subfolders)
    });

    for (const sub of folderInfo.subfolders) {
      edges.push({
        source: `folder::${folderPath}`,
        target: `folder::${sub}`,
        type: "contains"
      });
    }

    for (const f of folderInfo.files) {
      edges.push({
        source: `folder::${folderPath}`,
        target: f,
        type: "contains"
      });
    }
  }

  for (const dep of dependencies) {
    nodes.push({
      id: dep.file,
      label: dep.file.split("/").pop(),
      path: dep.file,
      type: "file",
      imports: dep.imports,
      importedBy: [],
      functions: [],
      classes: [],
      interfaces: []
    });

    for (const imp of dep.imports) {
      edges.push({
        source: dep.file,
        target: imp,
      });

      if (!importedByMap.has(imp)) {
        importedByMap.set(imp, []);
      }
      importedByMap.get(imp)?.push(dep.file);
    }
  }

  nodes.forEach((node) => {
    if (node.type === "file") {
      node.importedBy = importedByMap.get(node.id) || [];
    }
  });

  const functionByFileAndName = new Map<string, string>();
  const functionByName = new Map<string, string[]>();

  for (const fn of functions) {
    const functionId = `${fn.file}::${fn.name}`;
    functionLookup.set(functionId, functionId);
    functionByFileAndName.set(`${fn.file}:${fn.name}`, functionId);

    if (!functionByName.has(fn.name)) functionByName.set(fn.name, []);
    functionByName.get(fn.name)!.push(functionId);
  }

  for (const call of calls) {
    const callerKey = `${call.file}:${call.caller}`;
    const calleeKeySameFile = `${call.file}:${call.callee}`;

    const callerId = functionByFileAndName.get(callerKey) || functionByName.get(call.caller)?.[0];
    let calleeId = functionByFileAndName.get(calleeKeySameFile);
    if (!calleeId) {
      const matches = functionByName.get(call.callee) || [];
      calleeId = matches[0];
    }

    if (!calleeId) {
      calleeId = `external::${call.callee}`;
      if (!functionLookup.has(calleeId)) {
        functionLookup.set(calleeId, calleeId);
        nodes.push({
          id: calleeId,
          label: call.callee,
          file: "external",
          type: "function",
          functionType: "external",
          calls: [],
          calledBy: []
        });
      }
    }

    if (!functionCalls.has(callerKey)) {
      functionCalls.set(callerKey, []);
    }
    const callerCalls = functionCalls.get(callerKey)!;
    if (!callerCalls.includes(call.callee)) callerCalls.push(call.callee);

    if (calleeId) {
      const calleeKey = calleeId.replace("::", ":");
      if (!calledByMap.has(calleeKey)) {
        calledByMap.set(calleeKey, []);
      }
      const calleeCalledBy = calledByMap.get(calleeKey)!;
      if (!calleeCalledBy.includes(call.caller)) calleeCalledBy.push(call.caller);
    }

    if (!callerId || !calleeId) continue;

    const exists = edges.some(e => e.source === callerId && e.target === calleeId && e.type === "calls");
    if (!exists) {
      edges.push({
        source: callerId,
        target: calleeId,
        type: "calls"
      });
    }
  }

  for (const fn of functions) {
    const functionId = `${fn.file}::${fn.name}`;
    if (!fileFunction.has(fn.file)) {
      fileFunction.set(fn.file, []);
    }

    fileFunction.get(fn.file)?.push({
      name: fn.name,
      type: fn.type,
      line: fn.line,
      endLine: fn.endLine,
      isExported: fn.isExported,
      apiEndpoint: fn.apiEndpoint,
      calls: functionCalls.get(`${fn.file}:${fn.name}`) || [],
      calledBy: calledByMap.get(`${fn.file}:${fn.name}`) || [],
    });

    nodes.push({
      id: functionId,
      label: fn.name,
      file: fn.file,
      functionType: fn.type,
      line: fn.line,
      endLine: fn.endLine,
      isExported: fn.isExported,
      apiEndpoint: fn.apiEndpoint,
      type: "function",
      calls: functionCalls.get(`${fn.file}:${fn.name}`) || [],
      calledBy: calledByMap.get(`${fn.file}:${fn.name}`) || [],
    });

    edges.push({
      source: fn.file,
      target: functionId,
      type: "contains"
    });
  }

  for (const cls of classes) {
    const classId = `class::${cls.file}::${cls.name}`;
    if (!fileClass.has(cls.file)) fileClass.set(cls.file, []);
    fileClass.get(cls.file)?.push(cls);

    nodes.push({
      id: classId,
      label: cls.name,
      file: cls.file,
      type: "class",
      line: cls.line,
      endLine: cls.endLine,
      isExported: cls.isExported,
      extendsClass: cls.extendsClass,
      implementsInterfaces: cls.implementsInterfaces,
    });

    edges.push({
      source: cls.file,
      target: classId,
      type: "contains"
    });
  }

  for (const iface of interfaces) {
    const ifaceId = `interface::${iface.file}::${iface.name}`;
    if (!fileInterface.has(iface.file)) fileInterface.set(iface.file, []);
    fileInterface.get(iface.file)?.push(iface);

    nodes.push({
      id: ifaceId,
      label: iface.name,
      file: iface.file,
      type: iface.type,
      line: iface.line,
      endLine: iface.endLine,
      isExported: iface.isExported,
    });

    edges.push({
      source: iface.file,
      target: ifaceId,
      type: "contains"
    });
  }

  nodes.forEach((node) => {
    if (node.type === "function") {
      const key = `${node.file}:${node.label}`;
      node.calls = functionCalls.get(key) || [];
      node.calledBy = calledByMap.get(key) || [];
    }
  });

  fileFunction.clear();
  nodes.forEach((node) => {
    if (node.type === "function") {
      if (!fileFunction.has(node.file)) fileFunction.set(node.file, []);
      fileFunction.get(node.file)?.push({
        name: node.label,
        type: node.functionType,
        line: node.line,
        endLine: node.endLine,
        isExported: node.isExported,
        apiEndpoint: node.apiEndpoint,
        calls: node.calls,
        calledBy: node.calledBy,
      });
    }
  });

  nodes.forEach((node) => {
    if (node.type === "file") {
      node.functions = fileFunction.get(node.id) || [];
      node.classes = fileClass.get(node.id) || [];
      node.interfaces = fileInterface.get(node.id) || [];
    }
  });

  return {
    nodes,
    edges,
    techStack
  };
}
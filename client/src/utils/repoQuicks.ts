export function getRepoAskQuicks(graph: any, repoId?: string): string[] {
  const repoName = repoId ? (repoId.split("/").pop()?.replace(".git", "") || repoId) : "this repository";
  const nodes: any[] = Array.isArray(graph?.nodes) ? graph.nodes : [];

  if (nodes.length === 0) {
    return [
      `What is the overall architecture and folder structure of ${repoName}?`,
      `How is data flow and state management handled across core modules in ${repoName}?`,
      `What are the main entry points and key dependencies of ${repoName}?`,
      `Explain the core domain model and service layer of ${repoName}.`
    ];
  }

  const quicks: string[] = [];

  // 1. API route / endpoint
  const apiRouteNodes = nodes.filter(n => n.apiEndpoint && n.apiEndpoint.httpMethod && n.apiEndpoint.routePath);
  if (apiRouteNodes.length > 0) {
    const ep = apiRouteNodes[0].apiEndpoint;
    quicks.push(`Trace the execution lifecycle and data flow of ${ep.httpMethod} ${ep.routePath}`);
    if (apiRouteNodes.length > 1) {
      const ep2 = apiRouteNodes[1].apiEndpoint;
      quicks.push(`How are requests handled and validated across API routes like ${ep.routePath} and ${ep2.routePath}?`);
    }
  }

  // 2. Core depended-upon files (high importedBy count)
  const fileNodes = nodes.filter(n => n.type === "file" || (!n.type && !n.functionType && !n.id?.includes("::")));
  const sortedByImports = [...fileNodes].sort((a, b) => (b.importedBy?.length || 0) - (a.importedBy?.length || 0));
  const topFile = sortedByImports[0];
  if (topFile && topFile.label) {
    quicks.push(`What is the core architectural role and dependencies of ${topFile.label}?`);
    if (sortedByImports[1] && sortedByImports[1].label && quicks.length < 4) {
      quicks.push(`How do ${topFile.label} and ${sortedByImports[1].label} interact with the rest of the codebase?`);
    }
  }

  // 3. Classes and inheritance
  const classNodes = nodes.filter(n => n.type === "class");
  if (classNodes.length > 0 && quicks.length < 4) {
    const topClass = classNodes[0];
    quicks.push(`Explain the structure, inheritance, and responsibilities of class ${topClass.label}.`);
  }

  // 4. Key functions (high calledBy count)
  if (quicks.length < 4) {
    const functionNodes = nodes.filter(n => n.type === "function" && n.functionType !== "external");
    const sortedByCalls = [...functionNodes].sort((a, b) => (b.calledBy?.length || 0) - (a.calledBy?.length || 0));
    if (sortedByCalls[0] && sortedByCalls[0].label) {
      const funcFile = sortedByCalls[0].file?.split("/").pop() || "its module";
      quicks.push(`Trace where and why ${sortedByCalls[0].label} is invoked across ${funcFile}.`);
    }
  }

  // 5. Folder conventions
  if (quicks.length < 4) {
    const folderNodes = nodes.filter(n => n.type === "folder");
    if (folderNodes.length > 0) {
      const topFolder = folderNodes[0].label || folderNodes[0].path;
      quicks.push(`What coding conventions and module relationships are used across ${topFolder}?`);
    } else {
      quicks.push(`What coding conventions and folder organization rules are enforced across ${repoName}?`);
    }
  }

  return quicks.slice(0, 4);
}

export function getRepoPlannerQuicks(graph: any, repoId?: string): string[] {
  const repoName = repoId ? (repoId.split("/").pop()?.replace(".git", "") || repoId) : "this repository";
  const nodes: any[] = Array.isArray(graph?.nodes) ? graph.nodes : [];

  if (nodes.length === 0) {
    return [
      `Plan a comprehensive error handling and logging structure across core modules in ${repoName}`,
      `Add a performance optimization and caching layer for main data-fetching workflows`,
      `Refactor core services and utility functions in ${repoName} to improve modularity and test coverage`
    ];
  }

  const quicks: string[] = [];

  // 1. API routes or Controllers
  const apiRouteNodes = nodes.filter(n => n.apiEndpoint && n.apiEndpoint.httpMethod && n.apiEndpoint.routePath);
  if (apiRouteNodes.length > 0) {
    const ep = apiRouteNodes[0].apiEndpoint;
    quicks.push(`Add input validation, rate limiting, and error handling middleware for ${ep.httpMethod} ${ep.routePath}`);
  } else {
    const routeFiles = nodes.filter(n => n.type === "file" && (n.label?.toLowerCase().includes("route") || n.label?.toLowerCase().includes("controller") || n.label?.toLowerCase().includes("api")));
    if (routeFiles.length > 0) {
      quicks.push(`Add JWT authentication and request validation across all endpoints in ${routeFiles[0].label}`);
    }
  }

  // 2. Service / Database / Data layer caching
  const serviceOrDbFiles = nodes.filter(n => n.type === "file" && (n.label?.toLowerCase().includes("service") || n.label?.toLowerCase().includes("db") || n.label?.toLowerCase().includes("store") || n.label?.toLowerCase().includes("client") || n.label?.toLowerCase().includes("analyzer")));
  const fileNodes = nodes.filter(n => n.type === "file" || (!n.type && !n.functionType && !n.id?.includes("::")));
  const sortedByImports = [...fileNodes].sort((a, b) => (b.importedBy?.length || 0) - (a.importedBy?.length || 0));
  
  const targetService = serviceOrDbFiles[0] || sortedByImports[0];
  if (targetService && targetService.label) {
    quicks.push(`Add a Redis/memory caching layer and retry mechanism for operations in ${targetService.label}`);
  }

  // 3. UI component refactoring or class refactoring
  const componentFiles = nodes.filter(n => n.type === "file" && (n.label?.endsWith(".tsx") || n.label?.endsWith(".jsx") || n.label?.endsWith(".vue") || n.label?.endsWith(".svelte")));
  if (componentFiles.length > 0) {
    quicks.push(`Refactor ${componentFiles[0].label} to modularize subcomponents and improve state management`);
  } else {
    const classNodes = nodes.filter(n => n.type === "class");
    if (classNodes.length > 0) {
      quicks.push(`Plan a clean refactor of ${classNodes[0].label} to decouple dependencies and add unit tests`);
    } else if (sortedByImports[1] && sortedByImports[1].label) {
      quicks.push(`Implement multi-file refactoring and decoupling suggestions across ${sortedByImports[1].label}`);
    }
  }

  // 4. Fallback if under 3
  if (quicks.length < 3) {
    quicks.push(`Implement multi-file refactoring and clean architecture improvements across ${repoName}`);
  }

  return quicks.slice(0, 3);
}

export function getRepoAgentQuicks(graph: any, repoId?: string): string[] {
  const repoName = repoId ? (repoId.split("/").pop()?.replace(".git", "") || repoId) : "this repository";
  const nodes: any[] = Array.isArray(graph?.nodes) ? graph.nodes : [];

  if (nodes.length === 0) {
    return [
      `Plan a comprehensive refactor of ${repoName}'s core architecture and verify blast radius across all modules`,
      `Audit data flow, authentication, and error handling in ${repoName} for potential vulnerabilities`,
      `Analyze circular dependencies and high-coupling areas in ${repoName} to design an isolated modular structure`
    ];
  }

  const quicks: string[] = [];

  // 1. Core layer refactor & blast radius
  const fileNodes = nodes.filter(n => n.type === "file" || (!n.type && !n.functionType && !n.id?.includes("::")));
  const sortedByImports = [...fileNodes].sort((a, b) => (b.importedBy?.length || 0) - (a.importedBy?.length || 0));
  const dataOrServiceFile = fileNodes.find(n => n.label?.toLowerCase().includes("db") || n.label?.toLowerCase().includes("service") || n.label?.toLowerCase().includes("store")) || sortedByImports[0];
  
  if (dataOrServiceFile && dataOrServiceFile.label) {
    quicks.push(`Plan a refactor of ${dataOrServiceFile.label} and verify blast radius across dependent modules`);
  } else {
    quicks.push(`Plan a refactor of core data/service layers in ${repoName} and verify blast radius`);
  }

  // 2. Security / Auth audit
  const authOrApiFile = fileNodes.find(n => n.label?.toLowerCase().includes("auth") || n.label?.toLowerCase().includes("security") || n.label?.toLowerCase().includes("jwt") || n.label?.toLowerCase().includes("api") || n.label?.toLowerCase().includes("controller"));
  if (authOrApiFile && authOrApiFile.label) {
    quicks.push(`Audit ${authOrApiFile.label} and related session/request handlers for security risks and edge cases`);
  } else {
    const apiRouteNodes = nodes.filter(n => n.apiEndpoint && n.apiEndpoint.httpMethod && n.apiEndpoint.routePath);
    if (apiRouteNodes.length > 0) {
      quicks.push(`Audit authentication, validation, and error handling across API endpoints in ${repoName}`);
    } else {
      quicks.push(`Audit core modules and entry points in ${repoName} for potential security and concurrency bottlenecks`);
    }
  }

  // 3. Circular dependencies / architectural decoupling
  if (sortedByImports.length >= 2 && sortedByImports[0].label && sortedByImports[1].label) {
    quicks.push(`Trace and decouple circular dependencies or high coupling between ${sortedByImports[0].label} and ${sortedByImports[1].label}`);
  } else {
    quicks.push(`Trace dependencies across core services and simulate the impact of modularizing internal components`);
  }

  return quicks.slice(0, 3);
}

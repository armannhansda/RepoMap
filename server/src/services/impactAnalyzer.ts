import { generateAIContent } from "./aiProvider.js";

export interface AffectedNode {
  id: string;
  label: string;
  file: string;
  type: string;
  hopDistance: number;
  relationType: "calledBy" | "importedBy" | "extends" | "implements";
}

export interface BlastRadiusResult {
  targetNodeId: string;
  targetNodeLabel: string;
  targetNodeFile: string;
  changeType: "MODIFY" | "DELETE";
  riskScore: number;
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  affectedNodes: AffectedNode[];
  affectedApiEndpoints: Array<{ route: string; method: string; handler: string }>;
  aiAnalysis: {
    breakingChangesSummary: string;
    affectedBusinessFlows: string[];
    recommendedMigrationStrategy: string;
  };
}



export async function calculateBlastRadius(
  targetIdentifier: string,
  changeType: "MODIFY" | "DELETE",
  graph: any,
  memory?: any
): Promise<BlastRadiusResult> {
  const nodes: any[] = graph?.nodes || [];
  const edges: any[] = graph?.edges || [];

  // 1. Locate target node by id, or exact label, or suffix match
  let targetNode = nodes.find(n => n.id === targetIdentifier);
  if (!targetNode) {
    targetNode = nodes.find(n => n.label === targetIdentifier && n.type !== "folder");
  }
  if (!targetNode) {
    targetNode = nodes.find(n => n.id.endsWith(`::${targetIdentifier}`) || n.id.endsWith(`/${targetIdentifier}`));
  }

  if (!targetNode) {
    throw new Error(`Target node '${targetIdentifier}' not found in graph.`);
  }

  const nodeMap = new Map<string, any>();
  const nodesByLabel = new Map<string, any[]>();
  for (const n of nodes) {
    nodeMap.set(n.id, n);
    if (!nodesByLabel.has(n.label)) nodesByLabel.set(n.label, []);
    nodesByLabel.get(n.label)!.push(n);
  }

  const affectedNodes: AffectedNode[] = [];
  const visited = new Set<string>();
  visited.add(targetNode.id);

  // Queue holds { nodeId, hopDistance }
  const queue: Array<{ id: string; hop: number }> = [{ id: targetNode.id, hop: 0 }];

  while (queue.length > 0) {
    const { id: currId, hop } = queue.shift()!;
    if (hop >= 3) continue;

    const currNode = nodeMap.get(currId);
    if (!currNode) continue;

    // A. Check explicit edges where target === currId
    for (const e of edges) {
      if (e.target === currId && !visited.has(e.source)) {
        const sourceNode = nodeMap.get(e.source);
        if (sourceNode && sourceNode.type !== "folder") {
          visited.add(e.source);
          let rel: AffectedNode["relationType"] = "calledBy";
          if (e.type === "imports" || (!e.type && sourceNode.type === "file")) rel = "importedBy";
          affectedNodes.push({
            id: sourceNode.id,
            label: sourceNode.label,
            file: sourceNode.file || sourceNode.path || "unknown",
            type: sourceNode.type || "unknown",
            hopDistance: hop + 1,
            relationType: rel
          });
          queue.push({ id: sourceNode.id, hop: hop + 1 });
        }
      }
    }

    // B. If currNode is a function, check calledBy array
    if (currNode.type === "function" && Array.isArray(currNode.calledBy)) {
      for (const callerLabel of currNode.calledBy) {
        const matchingCallers = nodesByLabel.get(callerLabel) || [];
        for (const callerNode of matchingCallers) {
          if (!visited.has(callerNode.id) && callerNode.type === "function") {
            visited.add(callerNode.id);
            affectedNodes.push({
              id: callerNode.id,
              label: callerNode.label,
              file: callerNode.file || "unknown",
              type: callerNode.type,
              hopDistance: hop + 1,
              relationType: "calledBy"
            });
            queue.push({ id: callerNode.id, hop: hop + 1 });
          }
        }
      }
    }

    // C. If currNode is a file, check importedBy array
    if (currNode.type === "file" && Array.isArray(currNode.importedBy)) {
      for (const impFile of currNode.importedBy) {
        if (!visited.has(impFile)) {
          const impNode = nodeMap.get(impFile);
          if (impNode) {
            visited.add(impNode.id);
            affectedNodes.push({
              id: impNode.id,
              label: impNode.label,
              file: impNode.path || impNode.id,
              type: "file",
              hopDistance: hop + 1,
              relationType: "importedBy"
            });
            queue.push({ id: impNode.id, hop: hop + 1 });
          }
        }
      }
    }

    // D. If currNode is a class/interface, check classes extending or implementing it
    if (currNode.type === "class" || currNode.type === "interface") {
      for (const n of nodes) {
        if (!visited.has(n.id) && n.type === "class") {
          const extendsMatch = n.extendsClass === currNode.label;
          const implementsMatch = Array.isArray(n.implementsInterfaces) && n.implementsInterfaces.includes(currNode.label);
          if (extendsMatch || implementsMatch) {
            visited.add(n.id);
            affectedNodes.push({
              id: n.id,
              label: n.label,
              file: n.file || "unknown",
              type: n.type,
              hopDistance: hop + 1,
              relationType: extendsMatch ? "extends" : "implements"
            });
            queue.push({ id: n.id, hop: hop + 1 });
          }
        }
      }
    }
  }

  // 3. Collect affected API endpoints
  const affectedEndpointsMap = new Map<string, { route: string; method: string; handler: string }>();

  // Check target itself
  if (targetNode.apiEndpoint) {
    affectedEndpointsMap.set(`${targetNode.apiEndpoint.httpMethod}:${targetNode.apiEndpoint.routePath}`, {
      route: targetNode.apiEndpoint.routePath,
      method: targetNode.apiEndpoint.httpMethod,
      handler: targetNode.label
    });
  }

  // Check all affected functions/classes
  for (const aff of affectedNodes) {
    const n = nodeMap.get(aff.id);
    if (n?.apiEndpoint) {
      affectedEndpointsMap.set(`${n.apiEndpoint.httpMethod}:${n.apiEndpoint.routePath}`, {
        route: n.apiEndpoint.routePath,
        method: n.apiEndpoint.httpMethod,
        handler: n.label
      });
    }
  }

  // Also check memory.apiDocumentation if available
  if (memory?.apiDocumentation && Array.isArray(memory.apiDocumentation)) {
    for (const doc of memory.apiDocumentation) {
      if (doc.handler === targetNode.label || affectedNodes.some(a => a.label === doc.handler)) {
        affectedEndpointsMap.set(`${doc.method}:${doc.route}`, {
          route: doc.route,
          method: doc.method,
          handler: doc.handler
        });
      }
    }
  }

  const affectedApiEndpoints = Array.from(affectedEndpointsMap.values());

  // 4. Calculate Risk Score
  const nDirect = affectedNodes.filter(n => n.hopDistance === 1).length;
  const nIndirect = affectedNodes.filter(n => n.hopDistance > 1).length;
  const nApi = affectedApiEndpoints.length;
  const nExportedPenalty = (targetNode.isExported ? 15 : 0) + (changeType === "DELETE" ? 20 : 0);

  let riskScore = Math.min(100, Math.round((nDirect * 15) + (nIndirect * 5) + (nApi * 35) + nExportedPenalty));
  if (affectedNodes.length === 0 && nApi === 0) {
    riskScore = changeType === "DELETE" && targetNode.isExported ? 20 : 5;
  }

  let riskLevel: BlastRadiusResult["riskLevel"] = "LOW";
  if (riskScore >= 75) riskLevel = "CRITICAL";
  else if (riskScore >= 50) riskLevel = "HIGH";
  else if (riskScore >= 25) riskLevel = "MEDIUM";

  // 5. Generate AI Semantic Analysis
  let aiAnalysis = {
    breakingChangesSummary: "",
    affectedBusinessFlows: [] as string[],
    recommendedMigrationStrategy: ""
  };

  if (affectedNodes.length === 0 && nApi === 0) {
    aiAnalysis = {
      breakingChangesSummary: `No upstream callers or dependent modules found for '${targetNode.label}'. Performing '${changeType}' has an isolated impact within its local file.`,
      affectedBusinessFlows: [],
      recommendedMigrationStrategy: `Ensure unit tests in ${targetNode.file || targetNode.path || "the local file"} pass after the change.`
    };
  } else {
    const prompt = `You are RepoMind, an AI Software Architect. We are performing a blast radius simulation for a proposed code change.

## PROPOSED CHANGE
- Target Symbol: ${targetNode.label} (${targetNode.type} in ${targetNode.file || targetNode.path})
- Change Action: ${changeType} (${changeType === "DELETE" ? "Complete removal of symbol" : "Signature or behavior modification"})
- Calculated Risk Score: ${riskScore}/100 (${riskLevel})

## AFFECTED UPSTREAM DEPENDENCIES (Topological BFS Traversal)
- Direct Callers/Importers (1 hop): ${JSON.stringify(affectedNodes.filter(a => a.hopDistance === 1).map(a => `${a.label} (${a.file})`))}
- Indirect Dependents (2-3 hops): ${JSON.stringify(affectedNodes.filter(a => a.hopDistance > 1).map(a => `${a.label} (${a.file})`))}
- Exposed API Endpoints Impacted (${affectedApiEndpoints.length}): ${JSON.stringify(affectedApiEndpoints)}

## OUTPUT INSTRUCTIONS
Return ONLY a valid JSON object matching exactly this schema:
{
  "breakingChangesSummary": "2-3 clear sentences explaining what specific function calls, interface implementations, or imports will break.",
  "affectedBusinessFlows": [
    "Array of 2 to 5 high-level business or user flows that will be degraded or broken (e.g. 'Repository analysis POST endpoint', 'AI diagram generation')"
  ],
  "recommendedMigrationStrategy": "A concrete 3-step technical recommendation on how to safely implement this change without causing outages or broken dependencies."
}
Return ONLY valid JSON.`;

    try {
      const aiText = await generateAIContent(prompt);
      let jsonStr = aiText;
      const startIndex = aiText.indexOf("{");
      const endIndex = aiText.lastIndexOf("}");
      if (startIndex !== -1 && endIndex !== -1 && endIndex >= startIndex) {
        jsonStr = aiText.substring(startIndex, endIndex + 1);
      }
      const parsed = JSON.parse(jsonStr);
      aiAnalysis = {
        breakingChangesSummary: parsed.breakingChangesSummary || `Modifying/deleting ${targetNode.label} impacts ${nDirect} direct callers and ${nApi} API routes.`,
        affectedBusinessFlows: Array.isArray(parsed.affectedBusinessFlows) ? parsed.affectedBusinessFlows : [],
        recommendedMigrationStrategy: parsed.recommendedMigrationStrategy || `Update direct callers (${affectedNodes.slice(0, 3).map(a => a.label).join(", ")}) before deploying changes to ${targetNode.label}.`
      };
    } catch (err) {
      console.warn("⚠️ AI semantic evaluation failed or unconfigured. Using deterministic fallback analysis...", err);
      aiAnalysis = {
        breakingChangesSummary: `Performing ${changeType} on '${targetNode.label}' directly breaks ${nDirect} immediate callers/importers (${affectedNodes.filter(a => a.hopDistance === 1).map(a => a.label).slice(0, 4).join(", ")}) across ${new Set(affectedNodes.map(a => a.file)).size} files.`,
        affectedBusinessFlows: nApi > 0 ? affectedApiEndpoints.map(a => `${a.method} ${a.route} API (` + a.handler + `)`) : [`Internal module calls relying on ${targetNode.label}`],
        recommendedMigrationStrategy: `1. Deprecate or wrap existing ${targetNode.label} implementation. 2. Update all ${nDirect} direct caller references across affected files. 3. Verify ${nApi} impacted API endpoints via integration tests.`
      };
    }
  }

  return {
    targetNodeId: targetNode.id,
    targetNodeLabel: targetNode.label,
    targetNodeFile: targetNode.file || targetNode.path || "unknown",
    changeType,
    riskScore,
    riskLevel,
    affectedNodes,
    affectedApiEndpoints,
    aiAnalysis
  };
}

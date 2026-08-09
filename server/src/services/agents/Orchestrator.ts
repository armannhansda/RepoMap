import { generateAIContent } from "../aiProvider.js";
import { calculateBlastRadius } from "../impactAnalyzer.ts";

export interface AgentStepLog {
  agentName: "Planner Agent" | "Graph Search Agent" | "Impact & Risk Simulator" | "Review & Synthesis Agent";
  status: "completed" | "warning" | "error";
  title: string;
  summary: string;
  data?: any;
  executionTimeMs: number;
}

export interface OrchestratorReport {
  prompt: string;
  repoId: string;
  overallStatus: "SUCCESS" | "PARTIAL" | "FAILED";
  intent: "REFACTOR" | "FEATURE_ADDITION" | "SECURITY_AUDIT" | "ARCHITECTURE_EXPLORATION" | "GENERAL_QUERY";
  steps: AgentStepLog[];
  finalSynthesis: string;
  discoveredSymbols: Array<{ id: string; label: string; file: string; type: string; riskScore: number }>;
  totalExecutionTimeMs: number;
}



// Subroutine 1: Graph Search Tool
function searchNodesByName(nodes: any[], keywords: string[]): any[] {
  const matches: any[] = [];
  const seen = new Set<string>();

  for (const n of nodes) {
    if (n.type === "folder" || n.type === "external") continue;
    const labelLower = (n.label || "").toLowerCase();
    const fileLower = (n.file || n.path || "").toLowerCase();
    const descLower = (n.description || "").toLowerCase();

    for (const kw of keywords) {
      const k = kw.toLowerCase().trim();
      if (k.length < 3) continue;
      if (labelLower.includes(k) || fileLower.includes(k) || descLower.includes(k)) {
        if (!seen.has(n.id)) {
          seen.add(n.id);
          matches.push(n);
        }
        break;
      }
    }
  }
  return matches;
}

// Subroutine 2: Graph Neighborhood Collector (N-hops)
function getGraphNeighborhood(nodeId: string, nodes: any[], edges: any[], hops: number = 2): { nodes: any[]; edges: any[] } {
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const visitedNodes = new Set<string>();
  const visitedEdges = new Set<any>();
  let currentLayer = [nodeId];

  for (let hop = 0; hop < hops; hop++) {
    const nextLayer: string[] = [];
    for (const curr of currentLayer) {
      visitedNodes.add(curr);
      for (const e of edges) {
        if (e.source === curr && !visitedNodes.has(e.target)) {
          visitedEdges.add(e);
          nextLayer.push(e.target);
        } else if (e.target === curr && !visitedNodes.has(e.source)) {
          visitedEdges.add(e);
          nextLayer.push(e.source);
        }
      }
    }
    currentLayer = nextLayer;
  }

  const neighborhoodNodes: any[] = [];
  visitedNodes.forEach(id => {
    const n = nodeMap.get(id);
    if (n) neighborhoodNodes.push(n);
  });

  return { nodes: neighborhoodNodes, edges: Array.from(visitedEdges) };
}

export async function runMultiAgentOrchestration(
  repoId: string,
  prompt: string,
  graph: any,
  memory?: any
): Promise<OrchestratorReport> {
  const startTime = Date.now();
  const nodes: any[] = graph?.nodes || [];
  const edges: any[] = graph?.edges || [];
  const steps: AgentStepLog[] = [];

  // ==========================================
  // STEP 1: PLANNER AGENT (Intent & Task Decomposition)
  // ==========================================
  const step1Start = Date.now();
  let intent: "REFACTOR" | "FEATURE_ADDITION" | "SECURITY_AUDIT" | "ARCHITECTURE_EXPLORATION" | "GENERAL_QUERY" = "GENERAL_QUERY";
  let keywords: string[] = [];
  let subtasks: string[] = [];

  const promptLower = prompt.toLowerCase();
  if (promptLower.includes("refactor") || promptLower.includes("clean") || promptLower.includes("decouple")) intent = "REFACTOR";
  else if (promptLower.includes("add") || promptLower.includes("create") || promptLower.includes("build") || promptLower.includes("implement")) intent = "FEATURE_ADDITION";
  else if (promptLower.includes("security") || promptLower.includes("vulnerab") || promptLower.includes("auth")) intent = "SECURITY_AUDIT";
  else if (promptLower.includes("how") || promptLower.includes("architecture") || promptLower.includes("flow") || promptLower.includes("trace")) intent = "ARCHITECTURE_EXPLORATION";

  // Extract simple keywords deterministically first
  const words = prompt.replace(/[^\w\s]/g, " ").split(/\s+/).filter(w => w.length > 3 && !["with", "from", "where", "what", "when", "that", "this", "have", "been"].includes(w.toLowerCase()));
  keywords = Array.from(new Set(words)).slice(0, 8);

  try {
    const plannerAI = await generateAIContent(`You are the Planner Agent of RepoMind Multi-Agent Orchestrator.
Analyze this user prompt: "${prompt}"
Return ONLY a JSON object with:
- "intent": "${intent}"
- "keywords": array of 3-6 exact code symbols, filenames, or domain keywords to search in AST graph.
- "subtasks": array of 3 sequential operational goals to accomplish this request.
Return ONLY valid JSON.`);

    let jsonStr = plannerAI;
    const sIdx = plannerAI.indexOf("{");
    const eIdx = plannerAI.lastIndexOf("}");
    if (sIdx !== -1 && eIdx !== -1 && eIdx >= sIdx) {
      jsonStr = plannerAI.substring(sIdx, eIdx + 1);
    }
    const parsed = JSON.parse(jsonStr);
    if (parsed.intent) intent = parsed.intent;
    if (Array.isArray(parsed.keywords)) keywords = parsed.keywords;
    if (Array.isArray(parsed.subtasks)) subtasks = parsed.subtasks;
  } catch (err) {
    subtasks = [
      `Search AST graph for symbols matching keywords: ${keywords.join(", ")}`,
      `Evaluate blast radius and dependency ripple effects on upstream/downstream layers`,
      `Synthesize exact architectural implementation and migration steps`
    ];
  }

  steps.push({
    agentName: "Planner Agent",
    status: "completed",
    title: `Task Decomposition (${intent})`,
    summary: `Formulated 3-phase execution plan tracking keywords: [${keywords.join(", ")}]`,
    data: { intent, keywords, subtasks },
    executionTimeMs: Date.now() - step1Start
  });

  // ==========================================
  // STEP 2: GRAPH SEARCH AGENT (Tool Calling & AST Lookup)
  // ==========================================
  const step2Start = Date.now();
  const matchedNodes = searchNodesByName(nodes, keywords);

  // If few direct keyword matches, include top core components from memory or centrality
  if (matchedNodes.length < 3 && nodes.length > 0) {
    const sortedByInDegree = [...nodes].filter(n => n.type === "function" || n.type === "class").sort((a, b) => (b.calledBy?.length || 0) - (a.calledBy?.length || 0));
    matchedNodes.push(...sortedByInDegree.slice(0, 4));
  }

  const uniqueMatches = Array.from(new Map(matchedNodes.map(n => [n.id, n])).values()).slice(0, 10);

  steps.push({
    agentName: "Graph Search Agent",
    status: uniqueMatches.length > 0 ? "completed" : "warning",
    title: `AST Graph Subroutine Discovery`,
    summary: `Discovered ${uniqueMatches.length} primary AST symbols across ${new Set(uniqueMatches.map(n => n.file || "unknown")).size} distinct files using keyword & centrality matching.`,
    data: {
      discoveredNodes: uniqueMatches.map(n => ({ id: n.id, label: n.label, type: n.type, file: n.file || n.path || "unknown" }))
    },
    executionTimeMs: Date.now() - step2Start
  });

  // ==========================================
  // STEP 3: IMPACT & RISK SIMULATOR AGENT (Blast Radius Calculation)
  // ==========================================
  const step3Start = Date.now();
  const discoveredSymbols: Array<{ id: string; label: string; file: string; type: string; riskScore: number }> = [];
  const riskDetails: Array<{ symbol: string; riskScore: number; callers: number; endpointsAffected: number }> = [];

  for (const n of uniqueMatches) {
    // Run deterministic blast radius simulation tool
    let brResult = null;
    try {
      brResult = await calculateBlastRadius(n.id, "MODIFY", graph, memory);
    } catch (err) {
      console.warn(`Could not run blast radius simulation for ${n.id}, using deterministic fallback.`);
    }
    const score = brResult ? brResult.riskScore : Math.min(100, (n.calledBy?.length || 0) * 10);

    discoveredSymbols.push({
      id: n.id,
      label: n.label,
      file: n.file || n.path || "unknown",
      type: n.type,
      riskScore: score
    });

    riskDetails.push({
      symbol: n.label,
      riskScore: score,
      callers: n.calledBy?.length || 0,
      endpointsAffected: brResult ? brResult.affectedApiEndpoints.length : 0
    });
  }

  // Sort discovered symbols by highest risk first
  discoveredSymbols.sort((a, b) => b.riskScore - a.riskScore);
  const highestRisk = discoveredSymbols.length > 0 ? discoveredSymbols[0] : null;

  steps.push({
    agentName: "Impact & Risk Simulator",
    status: highestRisk && highestRisk.riskScore >= 75 ? "warning" : "completed",
    title: `Blast Radius & Ripple Assessment`,
    summary: highestRisk ? `Highest risk symbol is \`${highestRisk.label}\` with Risk Score ${highestRisk.riskScore}/100.` : `No critical ripple risks detected across target symbols.`,
    data: { riskDetails },
    executionTimeMs: Date.now() - step3Start
  });

  // ==========================================
  // STEP 4: REVIEW & SYNTHESIS AGENT (Authoritative Report)
  // ==========================================
  const step4Start = Date.now();
  let finalSynthesis = "";

  const synthesisPrompt = `You are the Review & Synthesis Agent of RepoMind Multi-Agent Orchestrator.
Synthesize the multi-agent investigation results for this user prompt: "${prompt}"

## AGENT DISCOVERIES
- Intent Classification: ${intent}
- Discovered AST Symbols:
${discoveredSymbols.map(ds => `  * [${ds.type}] \`${ds.label}\` in \`${ds.file}\` (Blast Radius Risk Score: ${ds.riskScore}/100)`).join("\n")}
- Repository Memory Overview: ${memory?.systemArchitecture || "Modern modular software codebase"}

## INSTRUCTIONS
Write a highly structured, authoritative, multi-section markdown response:
1. **Executive Summary & Intent Analysis**: Explain exactly what needs to be done.
2. **Discovered Graph Components**: Detail the exact files and functions directly relevant to the prompt.
3. **Blast Radius & Risk Mitigation**: Address high-risk symbols (e.g. ${highestRisk?.label || "core utilities"}) and provide safety guidelines before modifying them.
4. **Step-by-Step Implementation Roadmap**: Provide concrete, actionable code modifications and architectural steps.
Return ONLY clean GitHub Markdown text.`;

  try {
    finalSynthesis = await generateAIContent(synthesisPrompt);
  } catch (err) {
    finalSynthesis = `### Multi-Agent Synthesis: ${intent}\n\n`;
    finalSynthesis += `**Executive Summary:**\nThe autonomous orchestrator investigated your request across ${discoveredSymbols.length} core symbols in the repository graph.\n\n`;
    finalSynthesis += `### Discovered AST Graph Symbols & Blast Radius:\n`;
    discoveredSymbols.forEach(ds => {
      finalSynthesis += `- **\`${ds.label}\`** (*${ds.file}*) — Risk Score: **${ds.riskScore}/100**\n`;
    });
    finalSynthesis += `\n### Step-by-Step Implementation & Safety Roadmap:\n`;
    subtasks.forEach((st, idx) => {
      finalSynthesis += `${idx + 1}. **${st}** — Ensure full verification via test suites before committing modifications.\n`;
    });
  }

  steps.push({
    agentName: "Review & Synthesis Agent",
    status: "completed",
    title: `Final Architectural Synthesis`,
    summary: `Compiled authoritative execution report with exact file paths and risk mitigations.`,
    executionTimeMs: Date.now() - step4Start
  });

  return {
    prompt,
    repoId,
    overallStatus: "SUCCESS",
    intent,
    steps,
    finalSynthesis: finalSynthesis.trim(),
    discoveredSymbols,
    totalExecutionTimeMs: Date.now() - startTime
  };
}

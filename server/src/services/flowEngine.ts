import { generateAIContent } from './aiProvider.ts';
import { getRepoMemory } from '../store/memoryStore.ts';

export interface FlowStep {
  stepIndex: number;
  id: string;
  fromNodeId: string;
  toNodeId: string;
  label: string;
  description: string;
  codeSnippet?: string;
  payloadExample?: any;
  durationMs?: number;
}

export interface FlowScenario {
  id: string;
  title: string;
  description: string;
  steps: FlowStep[];
}

/**
 * Validates and cleans generated steps against valid node IDs in the graph
 */
function validateSteps(steps: any[], validNodeIds: Set<string>, allNodes: any[]): FlowStep[] {
  const cleaned: FlowStep[] = [];
  
  // Helper to find closest matching node ID if exact match fails
  const findMatchingId = (target: string): string | null => {
    if (!target) return null;
    if (validNodeIds.has(target)) return target;
    
    // Check by label or path suffix
    const match = allNodes.find(n => 
      n.id.endsWith(target) || 
      (n.label && n.label.toLowerCase() === target.toLowerCase()) ||
      (n.path && n.path.endsWith(target))
    );
    return match ? match.id : null;
  };

  let index = 0;
  for (const raw of steps) {
    const fromId = findMatchingId(raw.fromNodeId);
    const toId = findMatchingId(raw.toNodeId);

    if (fromId && toId && fromId !== toId) {
      cleaned.push({
        stepIndex: index,
        id: raw.id || `step-${index + 1}`,
        fromNodeId: fromId,
        toNodeId: toId,
        label: raw.label || `Step ${index + 1}`,
        description: raw.description || `Execution flows from ${fromId} to ${toId}`,
        codeSnippet: raw.codeSnippet || '',
        payloadExample: raw.payloadExample || null,
        durationMs: typeof raw.durationMs === 'number' ? raw.durationMs : 1800,
      });
      index++;
    }
  }

  return cleaned;
}

export async function generateFlowScenario(
  repoId: string,
  prompt: string,
  graph: any
): Promise<FlowScenario> {
  if (!graph || !graph.nodes || !Array.isArray(graph.nodes)) {
    throw new Error("Valid repository graph with nodes is required to generate execution flows.");
  }

  const memory = repoId ? getRepoMemory(repoId) : null;
  const validNodeIds = new Set<string>(graph.nodes.map((n: any) => n.id));

  // Extract a condensed list of files/functions for context so we stay within prompt budgets
  const candidateNodes = graph.nodes
    .filter((n: any) => n.type === 'file' || n.type === 'function' || n.functionType || n.apiEndpoint)
    .slice(0, 200)
    .map((n: any) => ({
      id: n.id,
      label: n.label,
      type: n.type || (n.functionType ? 'function' : 'file'),
      path: n.path || n.file || n.label,
      apiEndpoint: n.apiEndpoint || undefined,
      calls: n.calls || undefined
    }));

  const systemInstruction = `You are an expert software architect and execution flow simulator.
Your job is to trace or simulate realistic, step-by-step application execution paths through actual code nodes in a repository graph.`;

  const userPrompt = `Generate a sequential execution flow trace for the following user request / scenario:
**Scenario Prompt**: "${prompt}"

### Available Code Nodes (Select from these exact IDs for fromNodeId and toNodeId):
\`\`\`json
${JSON.stringify(candidateNodes, null, 2).substring(0, 35000)}
\`\`\`

${memory && (memory.systemArchitecture || memory.techStackOverview) ? `### Repository Architecture Overview:\n${memory.systemArchitecture || memory.techStackOverview}\n` : ''}

### Output Format Specification (STRICT JSON ONLY)
Output ONLY a JSON object exactly matching this structure:
{
  "id": "custom-flow-${Date.now()}",
  "title": "Short title describing the flow",
  "description": "1-2 sentence overview of what this flow demonstrates",
  "steps": [
    {
      "stepIndex": 0,
      "id": "step-1",
      "fromNodeId": "EXACT_NODE_ID_1",
      "toNodeId": "EXACT_NODE_ID_2",
      "label": "1. Client Request or Call",
      "description": "Detailed explanation of what function is called or data passed here.",
      "codeSnippet": "exampleCodeCall(payload)",
      "payloadExample": { "exampleKey": "exampleValue" },
      "durationMs": 1800
    }
  ]
}

### CRITICAL RULES:
1. Every "fromNodeId" and "toNodeId" MUST exactly match one of the "id" strings in the Available Code Nodes list.
2. Steps must form a coherent sequential execution chain (Step 1 -> Step 2 -> Step 3 ... up to 8-12 steps).
3. Do not output anything outside the JSON object. Output ONLY valid JSON.`;

  const resultText = await generateAIContent(userPrompt, systemInstruction);

  let jsonStr = resultText;
  const startIndex = resultText.indexOf('{');
  const endIndex = resultText.lastIndexOf('}');
  if (startIndex !== -1 && endIndex !== -1 && endIndex >= startIndex) {
    jsonStr = resultText.substring(startIndex, endIndex + 1);
  }

  try {
    const rawData = JSON.parse(jsonStr);
    const cleanedSteps = validateSteps(rawData.steps || [], validNodeIds, graph.nodes);

    if (cleanedSteps.length === 0) {
      throw new Error("AI generated steps, but none matched valid node IDs in the graph.");
    }

    return {
      id: rawData.id || `flow-${Date.now()}`,
      title: rawData.title || prompt,
      description: rawData.description || `Simulated execution flow for: ${prompt}`,
      steps: cleanedSteps,
    };
  } catch (err: any) {
    console.error("Failed to parse flow scenario JSON:", err.message || err, "\nRaw AI response:", resultText);
    throw new Error(`Failed to generate valid flow scenario: ${err.message || String(err)}`);
  }
}

export async function generatePresetFlows(
  repoId: string,
  graph: any
): Promise<FlowScenario[]> {
  if (!graph || !graph.nodes || !Array.isArray(graph.nodes)) {
    return [];
  }

  // Generate 3 standard preset prompts in parallel or sequence
  const presetPrompts = [
    "Core Entry & Request Lifecycle Flow (How requests enter and get routed to controllers/handlers)",
    "Main Data & Business Logic Flow (How data is queried, transformed, and stored across services/models)",
    "Internal Utilities & Error Handling Flow (How shared helpers, auth, or background queues process tasks)"
  ];

  const results: FlowScenario[] = [];
  for (let i = 0; i < presetPrompts.length; i++) {
    try {
      const promptText = presetPrompts[i] || "Core Request Flow";
      const scenario = await generateFlowScenario(repoId, promptText, graph);
      scenario.id = `preset-${i + 1}`;
      if (i === 0) scenario.title = "Core Request Lifecycle";
      if (i === 1) scenario.title = "Data & Business Logic";
      if (i === 2) scenario.title = "Utilities & Background Jobs";
      results.push(scenario);
    } catch (e) {
      console.warn(`[preset flow ${i + 1}] generation failed, skipping...`);
    }
  }

  return results;
}

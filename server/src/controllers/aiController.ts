import { type Request, type Response } from 'express';
import { getRepoMemory } from '../store/memoryStore.ts';
import { buildRepoMemory } from '../services/memoryBuilder.ts';
import { calculateBlastRadius } from '../services/impactAnalyzer.ts';
import { generateTaskPlan } from '../services/planningAgent.ts';
import { queryArchitecture } from '../services/architectureAgent.ts';
import { performCodeReview } from '../services/codeReviewEngine.ts';
import { calculateHealthDashboard } from '../services/healthDashboardEngine.ts';
import { runMultiAgentOrchestration } from '../services/agents/Orchestrator.ts';
import { getRepository } from '../store/repoRegistry.ts';
import { runParser } from '../services/runParser.ts';
import { generateAIContent } from '../services/aiProvider.ts';

export async function explainNode(req: Request, res: Response): Promise<void> {
  try {
    const { label, type, path, functionType, calls, calledBy, imports, sourceCode } = req.body;

    if (!process.env.GEMINI_API_KEY && !process.env.GROQ_API_KEY && !process.env.NVIDIA_API_KEY) {
      res.status(500).json({ error: "No AI API key (Gemini/Groq/NVIDIA) is configured on the server." });
      return;
    }

    let prompt = `Analyze the following codebase node and provide a concise, high-level summary of what it does, its connections, and its execution flow.\n\n`;
    prompt += `**Name/Label**: ${label}\n`;
    prompt += `**Type**: ${type} ${functionType ? `(${functionType})` : ''}\n`;
    prompt += `**Path**: ${path || 'N/A'}\n`;
    
    if (imports && imports.length > 0) {
      prompt += `**Imports/Dependencies**: ${imports.length}\n`;
    }
    if (calls && calls.length > 0) {
      prompt += `**Calls Functions**: ${calls.join(', ')}\n`;
    }
    if (calledBy && calledBy.length > 0) {
      prompt += `**Called By**: ${calledBy.join(', ')}\n`;
    }
    
    if (sourceCode) {
      prompt += `\n**Source Code Preview**:\n\`\`\`\n${sourceCode}\n\`\`\`\n`;
    }

    prompt += `\nProvide a short, easy-to-read explanation (under 150 words) formatted in Markdown. Focus on its primary architectural purpose and how data/execution flows through it.`;

    const explanationText = await generateAIContent(prompt);

    res.json({ explanation: explanationText });
  } catch (error) {
    console.error("Error generating explanation:", error);
    res.status(500).json({ error: "Failed to generate AI explanation" });
  }
}
export async function explainRepo(req: Request, res: Response): Promise<void> {
  try {
    const { repoName, files } = req.body;
    
    if (!process.env.GEMINI_API_KEY && !process.env.GROQ_API_KEY && !process.env.NVIDIA_API_KEY) {
      res.status(500).json({ error: "No AI API key (Gemini/Groq/NVIDIA) is configured on the server." });
      return;
    }

    let prompt = `Analyze the following repository structure and provide a comprehensive, detailed architectural overview.\n\n`;
    prompt += `**Repository Name**: ${repoName || 'Unknown'}\n`;
    prompt += `**Key Files & Structure**:\n\`\`\`json\n${JSON.stringify(files || [], null, 2).substring(0, 30000)}\n\`\`\`\n\n`;
    prompt += `Provide a highly detailed explanation formatted in Markdown. 
Please include:
1. **Core Purpose**: What this repository likely does.
2. **Tech Stack**: The main frameworks, libraries, and languages used (based on files like package.json or extensions).
3. **Architecture & Structure**: A detailed breakdown of the core directories and their responsibilities.
4. **Key Entry Points**: Identify where the application starts and how data might flow through the main components.

Do not artificially limit the length. Be as detailed and comprehensive as possible given the file structure.`;

    const explanationText = await generateAIContent(prompt);

    res.json({ explanation: explanationText });
  } catch (error) {
    console.error("Error generating repo explanation:", error);
    res.status(500).json({ error: "Failed to generate AI explanation for repository" });
  }
}

export async function generateDiagram(req: Request, res: Response): Promise<void> {
  try {
    const { repoName, files } = req.body;
    
    if (!process.env.GEMINI_API_KEY && !process.env.GROQ_API_KEY && !process.env.NVIDIA_API_KEY) {
      res.status(500).json({ error: "No AI API key (Gemini/Groq/NVIDIA) is configured on the server." });
      return;
    }

    let prompt = `## ROLE
You are an expert software architect and technical documentation specialist. 
Your job is to analyze a given codebase/repository and produce a clear, 
colorful architecture diagram graph in JSON format that shows the REAL execution flow of the system — not just a folder structure.

## INPUT YOU WILL RECEIVE
- Repository Name: ${repoName || 'Unknown'}
- Key Files & Structure:
\`\`\`json
${JSON.stringify(files || [], null, 2).substring(0, 30000)}
\`\`\`

## STEP 1 — ANALYZE BEFORE DRAWING
Before generating the JSON, mentally extract:
1. Entry point(s)
2. Execution order
3. Core layers
4. External dependencies
5. Data flow direction
6. Key decision/branch points
7. Background/async processes

## STEP 2 — DIAGRAM DESIGN RULES
- Diagram must represent **flow of execution**, not just architecture boxes. Use directional arrows.
- Group related components into layers using the "groups" array.
- Show **conditional branches** (if/else, success/failure) by setting the node "shape" to "rhombus".
- Number steps on edge labels (1, 2, 3...) to show sequential flow.
- Keep one primary flow direction.

## STEP 3 — OUTPUT FORMAT (STRICT)
Output ONLY a valid JSON object. Do not output anything else.
The JSON must perfectly match the following structure:
{
  "groups": [
    { "id": "g1", "label": "Client Layer" },
    { "id": "g2", "label": "API / Routing" },
    { "id": "g3", "label": "Business Logic" },
    { "id": "g4", "label": "Data Layer" }
  ],
  "nodes": [
    { "id": "entry", "label": "Client Request", "subLabel": "User clicks generate", "group": "g1" },
    { "id": "decision", "label": "Is Valid?", "subLabel": "Auth check", "group": "g2", "shape": "rhombus" },
    { "id": "db", "label": "Database", "subLabel": "Storage", "group": "g4", "shape": "cylinder" }
  ],
  "edges": [
    { "source": "entry", "target": "decision", "label": "1. POST /api" },
    { "source": "decision", "target": "db", "label": "2a. Yes (Success)" }
  ],
  "explanation": "A 3-5 sentence plain-English walkthrough of the flow shown in the diagram."
}

### JSON constraints:
- Extract 10 to 15 nodes. Ensure ALL major components and flows are represented.
- Do NOT leave communication pathways incomplete. Ensure return/response arrows are present.
- Never fabricate components that don't exist.
- Always validate that every source/target id in edges matches an existing node id.
OUTPUT ONLY VALID JSON. NO MARKDOWN. NO EXPLANATIONS OUTSIDE THE JSON OBJECT.`;

    const resultText = await generateAIContent(prompt);

    // Extract JSON
    let jsonStr = resultText;
    const startIndex = resultText.indexOf('{');
    const endIndex = resultText.lastIndexOf('}');
    
    if (startIndex !== -1 && endIndex !== -1 && endIndex >= startIndex) {
      jsonStr = resultText.substring(startIndex, endIndex + 1);
    }

    try {
      const graphData = JSON.parse(jsonStr);
      if (!graphData.nodes || !graphData.edges) {
        throw new Error("Invalid JSON structure");
      }
      res.json(graphData);
    } catch (parseError) {
      console.error("Failed to parse JSON from AI response:", resultText);
      res.status(500).json({ error: "AI failed to generate a valid JSON diagram structure." });
    }

  } catch (error) {
    console.error("Error generating architecture diagram:", error);
    res.status(500).json({ error: "Failed to generate AI diagram for repository" });
  }
}

export async function getMemoryController(req: Request, res: Response): Promise<void> {
  try {
    const repoId = (req.query.repoId || req.body.repoId) as string;
    if (!repoId) {
      res.status(400).json({ error: "repoId is required" });
      return;
    }
    const memory = getRepoMemory(repoId);
    if (!memory) {
      res.status(404).json({ error: "Repository memory not found. Run analysis first." });
      return;
    }
    res.json({ success: true, memory });
  } catch (err) {
    console.error("Error retrieving repository memory:", err);
    res.status(500).json({ error: "Failed to retrieve repository memory" });
  }
}

export async function buildMemoryController(req: Request, res: Response): Promise<void> {
  try {
    const { repoId, graph } = req.body;
    if (!repoId || !graph) {
      res.status(400).json({ error: "repoId and graph are required to rebuild memory" });
      return;
    }
    const memory = await buildRepoMemory(repoId, graph);
    res.json({ success: true, memory });
  } catch (err) {
    console.error("Error building repository memory:", err);
    res.status(500).json({ error: "Failed to build repository memory" });
  }
}

export async function impactAnalysisController(req: Request, res: Response): Promise<void> {
  try {
    const { repoId, targetId, changeType = "MODIFY", graph: inputGraph } = req.body;
    if (!targetId) {
      res.status(400).json({ error: "targetId is required for impact analysis" });
      return;
    }

    let graph = inputGraph;
    if (!graph && repoId) {
      const repoPath = getRepository(repoId);
      if (repoPath) {
        graph = await runParser(repoPath);
      }
    }

    if (!graph) {
      res.status(400).json({ error: "Repository graph not found. Provide graph payload or valid repoId." });
      return;
    }

    const memory = repoId ? getRepoMemory(repoId) : undefined;
    const result = await calculateBlastRadius(targetId, changeType as "MODIFY" | "DELETE", graph, memory);
    res.json({ success: true, result });
  } catch (err: any) {
    console.error("Error calculating impact analysis:", err);
    res.status(500).json({ error: err.message || "Failed to calculate blast radius" });
  }
}

export async function planTaskController(req: Request, res: Response): Promise<void> {
  try {
    const { repoId, prompt, graph: providedGraph } = req.body;
    if (!prompt) {
      res.status(400).json({ error: "Missing 'prompt' in request body." });
      return;
    }

    let graph = providedGraph;
    if (!graph && repoId) {
      const repoPath = getRepository(repoId);
      if (repoPath) {
        try {
          const parsed = await runParser(repoPath);
          graph = parsed.graph;
        } catch (err) {
          console.warn("Could not re-parse repository for task plan, using empty graph");
        }
      }
    }

    const memory = repoId ? getRepoMemory(repoId) : undefined;
    const plan = await generateTaskPlan(repoId || "repo", prompt, graph || { nodes: [], edges: [] }, memory);
    res.json({ success: true, plan });
  } catch (err: any) {
    console.error("Error generating task plan:", err);
    res.status(500).json({ error: err.message || "Failed to generate task plan" });
  }
}

export async function queryArchitectureController(req: Request, res: Response): Promise<void> {
  try {
    const { repoId, question, graph: providedGraph } = req.body;
    if (!question) {
      res.status(400).json({ error: "Missing 'question' in request body." });
      return;
    }

    let graph = providedGraph;
    if (!graph && repoId) {
      const repoPath = getRepository(repoId);
      if (repoPath) {
        try {
          const parsed = await runParser(repoPath);
          graph = parsed.graph;
        } catch (err) {
          console.warn("Could not re-parse repository for architecture query, using empty graph");
        }
      }
    }

    const memory = repoId ? getRepoMemory(repoId) : undefined;
    const result = await queryArchitecture(repoId || "repo", question, graph || { nodes: [], edges: [] }, memory);
    res.json({ success: true, result });
  } catch (err: any) {
    console.error("Error querying architecture:", err);
    res.status(500).json({ error: err.message || "Failed to query architecture" });
  }
}

export async function handleCodeReview(req: Request, res: Response): Promise<void> {
  try {
    const { repoId, graph: providedGraph } = req.body;
    let graph = providedGraph;
    if (!graph && repoId) {
      const repoPath = getRepository(repoId);
      if (repoPath) {
        try {
          const parsed = await runParser(repoPath);
          graph = parsed.graph;
        } catch (err) {
          console.warn("Could not re-parse repository for code review, using empty graph");
        }
      }
    }

    const memory = repoId ? getRepoMemory(repoId) : undefined;
    const report = await performCodeReview(repoId || "repo", graph || { nodes: [], edges: [] }, memory);
    res.json({ success: true, report });
  } catch (err: any) {
    console.error("Error running AI code review:", err);
    res.status(500).json({ error: err.message || "Failed to perform AI code review" });
  }
}

export async function handleHealthScore(req: Request, res: Response): Promise<void> {
  try {
    const { repoId, graph: providedGraph } = req.body;
    let graph = providedGraph;
    let repoPath: string | undefined = undefined;

    if (repoId) {
      const rPath = getRepository(repoId);
      if (rPath) {
        repoPath = rPath;
        if (!graph) {
          try {
            const parsed = await runParser(rPath);
            graph = parsed.graph;
          } catch (err) {
            console.warn("Could not re-parse repository for health score, using empty graph");
          }
        }
      }
    }

    const dashboard = await calculateHealthDashboard(repoId || "repo", graph || { nodes: [], edges: [] }, repoPath);
    res.json({ success: true, dashboard });
  } catch (err: any) {
    console.error("Error generating health score dashboard:", err);
    res.status(500).json({ error: err.message || "Failed to calculate health score dashboard" });
  }
}

export async function handleOrchestrate(req: Request, res: Response): Promise<void> {
  try {
    const { repoId, prompt, graph: providedGraph } = req.body;
    if (!prompt) {
      res.status(400).json({ error: "Missing 'prompt' in request body." });
      return;
    }

    let graph = providedGraph;
    if (!graph && repoId) {
      const repoPath = getRepository(repoId);
      if (repoPath) {
        try {
          const parsed = await runParser(repoPath);
          graph = parsed.graph;
        } catch (err) {
          console.warn("Could not re-parse repository for multi-agent orchestration, using empty graph");
        }
      }
    }

    const memory = repoId ? getRepoMemory(repoId) : undefined;
    const report = await runMultiAgentOrchestration(repoId || "repo", prompt, graph || { nodes: [], edges: [] }, memory);
    res.json({ success: true, report });
  } catch (err: any) {
    console.error("Error running multi-agent orchestration:", err);
    res.status(500).json({ error: err.message || "Failed to execute multi-agent orchestration" });
  }
}



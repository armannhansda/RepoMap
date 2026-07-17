import { GoogleGenAI } from "@google/genai";
import Groq from "groq-sdk";

export interface ArchitectureQueryResult {
  question: string;
  answer: string;
  relevantNodes: Array<{ id: string; label: string; file: string; type: string }>;
  tracedFlow?: Array<{ step: number; label: string; file: string; description: string }> | undefined;
}

async function generateAIContent(prompt: string): Promise<string> {
  if (!process.env.GEMINI_API_KEY && !process.env.GROQ_API_KEY) {
    throw new Error("Neither GEMINI_API_KEY nor GROQ_API_KEY is configured.");
  }

  if (process.env.GEMINI_API_KEY) {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });
      if (response.text) return response.text;
    } catch (err) {
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const response = await ai.models.generateContent({
          model: "gemini-2.0-flash",
          contents: prompt,
        });
        if (response.text) return response.text;
      } catch (err2) {
        console.warn("Gemini query failed, falling back to Groq...", err2);
      }
    }
  }

  if (process.env.GROQ_API_KEY) {
    try {
      const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
      const response = await groq.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: "llama-3.3-70b-versatile",
      });
      const content = response.choices[0]?.message?.content;
      if (content) return content;
    } catch (err) {
      console.warn("Groq query failed:", err);
    }
  }

  throw new Error("Failed to generate architecture answer across all configured AI providers.");
}

export async function queryArchitecture(
  repoId: string,
  question: string,
  graph: any,
  memory?: any
): Promise<ArchitectureQueryResult> {
  const nodes: any[] = graph?.nodes || [];
  const edges: any[] = graph?.edges || [];

  // 1. Identify relevant symbols by keyword or route matching
  const qTokens = question.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  const relevantNodes: Array<{ id: string; label: string; file: string; type: string }> = [];
  const nodeMap = new Map<string, any>();
  const nodesByLabel = new Map<string, any[]>();

  for (const n of nodes) {
    nodeMap.set(n.id, n);
    if (!nodesByLabel.has(n.label)) nodesByLabel.set(n.label, []);
    nodesByLabel.get(n.label)!.push(n);

    const labelLower = (n.label || "").toLowerCase();
    const fileLower = (n.file || n.path || "").toLowerCase();
    const routeLower = n.apiEndpoint ? `${n.apiEndpoint.httpMethod} ${n.apiEndpoint.routePath}`.toLowerCase() : "";

    if (qTokens.some(tok => labelLower.includes(tok) || fileLower.includes(tok) || routeLower.includes(tok))) {
      if (n.type !== "folder") {
        relevantNodes.push({
          id: n.id,
          label: n.label,
          file: n.file || n.path || "unknown",
          type: n.type || "unknown"
        });
      }
    }
  }

  // 2. If an API endpoint or root function is identified, trace outward along calls to build a tracedFlow
  let tracedFlow: Array<{ step: number; label: string; file: string; description: string }> | undefined = undefined;
  const firstRel = relevantNodes.length > 0 ? relevantNodes[0] : undefined;
  const rootNode = relevantNodes.find(n => n.type === "function") || (firstRel ? nodeMap.get(firstRel.id) : undefined);

  if (rootNode && rootNode.type === "function") {
    const flow: Array<{ step: number; label: string; file: string; description: string }> = [];
    const visited = new Set<string>();
    const queue = [{ id: rootNode.id, step: 1 }];
    visited.add(rootNode.id);

    while (queue.length > 0 && flow.length < 6) {
      const { id: currId, step } = queue.shift()!;
      const currNode = nodeMap.get(currId);
      if (!currNode) continue;

      flow.push({
        step,
        label: currNode.label,
        file: currNode.file || currNode.path || "unknown",
        description: currNode.apiEndpoint 
          ? `API Handler for ${currNode.apiEndpoint.httpMethod} ${currNode.apiEndpoint.routePath}`
          : currNode.functionType ? `${currNode.functionType} function` : "Module function"
      });

      if (Array.isArray(currNode.calls)) {
        for (const callLabel of currNode.calls) {
          const targets = nodesByLabel.get(callLabel) || [];
          for (const tgt of targets) {
            if (!visited.has(tgt.id) && tgt.type === "function") {
              visited.add(tgt.id);
              queue.push({ id: tgt.id, step: step + 1 });
            }
          }
        }
      }
    }
    if (flow.length > 1) {
      tracedFlow = flow;
    }
  }

  const techOverview = memory?.techStackOverview || "TypeScript / Node / Express";
  const archOverview = memory?.systemArchitecture || "Multi-layer architecture";
  const apiDocs = memory?.apiDocumentation ? JSON.stringify(memory.apiDocumentation.slice(0, 10)) : "No API catalog";

  const prompt = `You are RepoMind, an AI Software Architect answering a developer's question about the repository architecture.

## USER QUESTION
"${question}"

## REPOSITORY KNOWLEDGE BASE & MEMORY
- Tech Stack: ${techOverview}
- System Architecture Overview: ${archOverview}
- Discovered API Routes: ${apiDocs}
- Relevant Graph Symbols (${relevantNodes.length}): ${JSON.stringify(relevantNodes.slice(0, 10))}
${tracedFlow ? `- Traced Execution Flow (${tracedFlow.length} steps): ${JSON.stringify(tracedFlow)}` : ""}

## INSTRUCTIONS
Provide a comprehensive, authoritative, yet concise answer (3 to 5 paragraphs) to the user's question.
- If they ask about a specific lifecycle or flow, explicitly reference the steps and exact filenames/functions discovered.
- If they ask about architectural patterns, explain how the subsystems interact based on the memory summary.
- Format your answer in clean GitHub-style Markdown with bullet points and bold function names.
Return ONLY your Markdown answer text.`;

  try {
    const answer = await generateAIContent(prompt);
    return {
      question,
      answer: answer.trim(),
      relevantNodes: relevantNodes.slice(0, 15),
      tracedFlow
    };
  } catch (err) {
    console.warn("⚠️ AI architecture query failed or unconfigured. Using deterministic fallback answer...", err);
    let fallbackText = `### Architecture Query Analysis for "${question}"\n\n`;
    fallbackText += `**System Architecture:**\n${archOverview}\n\n`;
    fallbackText += `**Technical Stack:**\n${techOverview}\n\n`;
    
    if (tracedFlow && tracedFlow.length > 0) {
      fallbackText += `### Traced Execution Flow:\n`;
      tracedFlow.forEach(f => {
        fallbackText += `${f.step}. **\`${f.label}\`** (*${f.file}*) — ${f.description}\n`;
      });
      fallbackText += `\n`;
    }

    if (relevantNodes.length > 0) {
      fallbackText += `### Relevant Code Components:\n`;
      relevantNodes.slice(0, 6).forEach(rn => {
        fallbackText += `- **\`${rn.label}\`** (${rn.type}) in \`${rn.file}\`\n`;
      });
    } else {
      fallbackText += `No direct symbol matches found for this query keywords. Check the project explorer or run a keyword search.`;
    }

    return {
      question,
      answer: fallbackText,
      relevantNodes: relevantNodes.slice(0, 15),
      tracedFlow
    };
  }
}

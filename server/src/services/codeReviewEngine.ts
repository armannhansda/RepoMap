import { GoogleGenAI } from "@google/genai";
import Groq from "groq-sdk";

export interface CodeReviewReport {
  deadCodeCount: number;
  deadCodeNodes: Array<{ id: string; label: string; file: string; type: string; reason: string }>;
  codeSmells: Array<{ id: string; label: string; file: string; type: string; issue: string; recommendation: string }>;
  solidRecommendations: string[];
  overallQualityGrade: "A+" | "A" | "B" | "C" | "D";
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
        console.warn("Gemini code review failed, falling back to Groq...", err2);
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
      console.warn("Groq code review failed:", err);
    }
  }

  throw new Error("Failed to generate code review across all configured AI providers.");
}

export async function performCodeReview(
  repoId: string,
  graph: any,
  memory?: any
): Promise<CodeReviewReport> {
  const nodes: any[] = graph?.nodes || [];
  const edges: any[] = graph?.edges || [];

  const deadCodeNodes: Array<{ id: string; label: string; file: string; type: string; reason: string }> = [];
  const codeSmells: Array<{ id: string; label: string; file: string; type: string; issue: string; recommendation: string }> = [];

  // 1. Deterministic Dead Code Detection & Code Smells directly from Graph Topology
  for (const n of nodes) {
    if (n.type === "folder" || n.type === "file" || n.type === "external") continue;
    
    const labelLower = (n.label || "").toLowerCase();
    const fileLower = (n.file || n.path || "").toLowerCase();

    // Skip tests, config files, main entrypoints, and API endpoints
    if (
      labelLower.includes("test") ||
      labelLower.includes("spec") ||
      fileLower.includes("test") ||
      fileLower.includes("spec") ||
      fileLower.includes("config") ||
      labelLower === "main" ||
      labelLower === "app" ||
      labelLower === "server" ||
      n.apiEndpoint
    ) {
      continue;
    }

    const calledBy = Array.isArray(n.calledBy) ? n.calledBy : [];
    const calls = Array.isArray(n.calls) ? n.calls : [];
    const isExported = n.isExported === true || (n.exportType && n.exportType !== "none");

    // Check for Dead Code (0 incoming calls and not an exported library utility or API handler)
    if (calledBy.length === 0 && !isExported && (n.type === "function" || n.type === "class" || n.type === "interface")) {
      deadCodeNodes.push({
        id: n.id,
        label: n.label,
        file: n.file || n.path || "unknown",
        type: n.type,
        reason: "Zero incoming calls detected in graph (`calledBy: []`) and symbol is not exported or registered as an HTTP route handler."
      });
    }

    // Check for High Coupling / Single Responsibility Smells
    if (calls.length >= 10 && n.type === "function") {
      codeSmells.push({
        id: n.id,
        label: n.label,
        file: n.file || n.path || "unknown",
        type: n.type,
        issue: `High Outward Coupling (${calls.length} outgoing function calls)`,
        recommendation: `Function calls ${calls.length} distinct dependencies. Consider refactoring into smaller, single-responsibility helper modules or using a facade/orchestrator pattern.`
      });
    } else if (calledBy.length >= 15 && n.type === "class") {
      codeSmells.push({
        id: n.id,
        label: n.label,
        file: n.file || n.path || "unknown",
        type: n.type,
        issue: `God Class / High In-Degree Centrality (${calledBy.length} dependents)`,
        recommendation: `Class is depended upon by ${calledBy.length} upstream symbols. Ensure any modifications are strictly backwards-compatible and well-tested.`
      });
    }
  }

  // Calculate quality grade based on ratio of smells/dead code to total code symbols
  const codeNodeCount = nodes.filter(n => n.type === "function" || n.type === "class").length || 1;
  const defectRatio = (deadCodeNodes.length + codeSmells.length) / codeNodeCount;
  let overallQualityGrade: "A+" | "A" | "B" | "C" | "D" = "A";
  if (defectRatio < 0.03) overallQualityGrade = "A+";
  else if (defectRatio < 0.08) overallQualityGrade = "A";
  else if (defectRatio < 0.15) overallQualityGrade = "B";
  else if (defectRatio < 0.25) overallQualityGrade = "C";
  else overallQualityGrade = "D";

  const prompt = `You are RepoMind AI Code Reviewer.
Analyze the following graph defect findings for the codebase and provide 3 top architectural/SOLID design recommendations.

## DEFECT STATS
- Total Code Nodes: ${codeNodeCount}
- Detected Dead Code Nodes (${deadCodeNodes.length}): ${JSON.stringify(deadCodeNodes.slice(0, 6))}
- Detected Code Smells & High Coupling (${codeSmells.length}): ${JSON.stringify(codeSmells.slice(0, 6))}
- Coding Conventions Enforced: ${memory?.codingConventions?.join("; ") || "Standard clean code principles"}

## INSTRUCTIONS
Return ONLY a JSON array containing exactly 3 strings with your top, highly specific architectural recommendations for improving clean design, decoupling, and maintainability.
Example: ["Remove unused helper function X in file Y to reduce cognitive load.", "Decouple God class Z using Dependency Injection."]
Return ONLY valid JSON array.`;

  try {
    const aiText = await generateAIContent(prompt);
    let jsonStr = aiText;
    const startIndex = aiText.indexOf("[");
    const endIndex = aiText.lastIndexOf("]");
    if (startIndex !== -1 && endIndex !== -1 && endIndex >= startIndex) {
      jsonStr = aiText.substring(startIndex, endIndex + 1);
    }
    const solidRecommendations = JSON.parse(jsonStr);
    return {
      deadCodeCount: deadCodeNodes.length,
      deadCodeNodes: deadCodeNodes.slice(0, 25),
      codeSmells: codeSmells.slice(0, 25),
      solidRecommendations: Array.isArray(solidRecommendations) ? solidRecommendations : [
        "Audit and remove unreferenced internal helper symbols to lower cognitive load and maintainability overhead.",
        "Refactor high-coupling orchestrator functions by extracting cohesive sub-routines into independent modules.",
        "Ensure strict interface abstraction around shared utilities to prevent tight coupling across directory boundaries."
      ],
      overallQualityGrade
    };
  } catch (err) {
    console.warn("⚠️ AI code review recommendations failed. Using deterministic fallback recommendations...", err);
    return {
      deadCodeCount: deadCodeNodes.length,
      deadCodeNodes: deadCodeNodes.slice(0, 25),
      codeSmells: codeSmells.slice(0, 25),
      solidRecommendations: [
        `Audit ${deadCodeNodes.length} detected unreferenced symbols (e.g. ${deadCodeNodes[0]?.label || "internal functions"}) to eliminate dead code.`,
        `Decompose high-coupling functions (such as ${codeSmells[0]?.label || "heavy controllers"}) into focused single-responsibility services.`,
        "Enforce strict modular boundary interfaces to minimize cross-directory circular import dependencies."
      ],
      overallQualityGrade
    };
  }
}

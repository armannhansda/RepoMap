import { generateAIContent } from "./aiProvider.js";

export interface TaskPlanResult {
  understanding: string;
  complexityScore: "Low" | "Medium" | "High";
  affectedFiles: string[];
  steps: Array<{
    file: string;
    action: "CREATE" | "MODIFY" | "DELETE";
    instruction: string;
    rationale?: string;
  }>;
  technicalConsiderations: string[];
}



export async function generateTaskPlan(
  repoId: string,
  userPrompt: string,
  graph: any,
  memory?: any
): Promise<TaskPlanResult> {
  const nodes: any[] = graph?.nodes || [];
  const edges: any[] = graph?.edges || [];

  // 1. Keyword search to find potentially affected files and symbols
  const promptTokens = userPrompt.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  const matchedNodes: any[] = [];
  const matchedFilesSet = new Set<string>();

  for (const n of nodes) {
    const labelLower = (n.label || "").toLowerCase();
    const fileLower = (n.file || n.path || "").toLowerCase();
    const isMatch = promptTokens.some(tok => labelLower.includes(tok) || fileLower.includes(tok));
    if (isMatch) {
      matchedNodes.push(n);
      if (n.file || n.path) {
        matchedFilesSet.add(n.file || n.path);
      }
    }
  }

  // Also include files directly interacting with matched functions (1 hop)
  for (const mn of matchedNodes) {
    if (mn.type === "function") {
      for (const e of edges) {
        if (e.source === mn.id || e.target === mn.id) {
          const neighbor = nodes.find(x => x.id === (e.source === mn.id ? e.target : e.source));
          if (neighbor && (neighbor.file || neighbor.path)) {
            matchedFilesSet.add(neighbor.file || neighbor.path);
          }
        }
      }
    }
  }

  const candidateFiles = Array.from(matchedFilesSet).slice(0, 10);
  const techOverview = memory?.techStackOverview || "TypeScript / Node / Express";
  const archOverview = memory?.systemArchitecture || "Multi-layer architecture";
  const conventions = memory?.codingConventions?.join("; ") || "Standard practices";

  const prompt = `You are RepoMind, an AI Software Architect and Task Planner.
A developer wants to implement a new feature or fix a task in the repository.

## USER TASK PROMPT
"${userPrompt}"

## REPOSITORY MEMORY & CONTEXT
- Tech Stack: ${techOverview}
- System Architecture: ${archOverview}
- Coding Conventions: ${conventions}
- Candidate Affected Files (${candidateFiles.length}): ${JSON.stringify(candidateFiles)}
- Relevant Discovered Symbols (${matchedNodes.length}): ${JSON.stringify(matchedNodes.slice(0, 12).map(n => `${n.label} (${n.type} in ${n.file || n.path})`))}

## INSTRUCTIONS
Analyze the task and return ONLY a valid JSON object matching this schema exactly:
{
  "understanding": "Clear 2-sentence explanation of what the user wants and how it fits into our existing architecture.",
  "complexityScore": "Low" | "Medium" | "High",
  "affectedFiles": ["array of exact file paths that need to be created or modified"],
  "steps": [
    {
      "file": "exact file path",
      "action": "CREATE" | "MODIFY" | "DELETE",
      "instruction": "Detailed technical instruction on what code to write or change in this file.",
      "rationale": "Brief explanation of why this change is needed."
    }
  ],
  "technicalConsiderations": [
    "Array of 2 to 4 important technical considerations, gotchas, performance risks, or conventions to follow."
  ]
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
    return {
      understanding: parsed.understanding || `Plan to implement: ${userPrompt}`,
      complexityScore: (parsed.complexityScore === "Low" || parsed.complexityScore === "High") ? parsed.complexityScore : "Medium",
      affectedFiles: Array.isArray(parsed.affectedFiles) && parsed.affectedFiles.length > 0 ? parsed.affectedFiles : candidateFiles.length > 0 ? candidateFiles : ["src/index.ts"],
      steps: Array.isArray(parsed.steps) ? parsed.steps : [
        {
          file: candidateFiles[0] || "src/index.ts",
          action: "MODIFY",
          instruction: `Implement logic for: ${userPrompt}`,
          rationale: "Core entrypoint or matched component."
        }
      ],
      technicalConsiderations: Array.isArray(parsed.technicalConsiderations) ? parsed.technicalConsiderations : [
        "Follow existing coding conventions and ensure type safety.",
        "Verify changes with existing tests before deploying."
      ]
    };
  } catch (err) {
    console.warn("⚠️ AI planning failed or unconfigured. Using deterministic fallback plan...", err);
    return {
      understanding: `Requested task: "${userPrompt}". Based on keyword graph search, this task relates to ${candidateFiles.length} detected files and ${matchedNodes.length} symbols.`,
      complexityScore: candidateFiles.length > 3 ? "High" : candidateFiles.length > 1 ? "Medium" : "Low",
      affectedFiles: candidateFiles.length > 0 ? candidateFiles : ["src/index.ts"],
      steps: candidateFiles.length > 0 ? candidateFiles.map((file, idx) => ({
        file,
        action: "MODIFY" as const,
        instruction: `Review and update ${file} to support: ${userPrompt}`,
        rationale: `Detected keyword overlap with ${matchedNodes.filter(n => (n.file || n.path) === file).map(n => n.label).join(", ") || "module functionality"}.`
      })) : [
        {
          file: "src/index.ts",
          action: "MODIFY",
          instruction: `Add or integrate support for "${userPrompt}".`,
          rationale: "Fallback to main application entrypoint."
        }
      ],
      technicalConsiderations: [
        `Ensure strict compliance with ${conventions.slice(0, 80)}...`,
        "Check downstream dependents using the Blast Radius simulator before committing."
      ]
    };
  }
}

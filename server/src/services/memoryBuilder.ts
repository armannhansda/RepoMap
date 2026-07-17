import { type RepoMemory, saveRepoMemory } from "../store/memoryStore.ts";
import { generateAIContent } from "./aiProvider.ts";

export async function buildRepoMemory(repoId: string, graph: any): Promise<RepoMemory> {
  const nodes = graph?.nodes || [];
  const techStack = graph?.techStack || { languages: [], frameworks: [], packageCount: 0 };

  const folders = nodes
    .filter((n: any) => n.type === "folder")
    .map((f: any) => ({ path: f.path, name: f.label, files: (f.files || []).slice(0, 15) }))
    .slice(0, 25);

  const apiEndpoints = nodes
    .filter((n: any) => n.apiEndpoint)
    .map((n: any) => ({ handler: n.label, file: n.file, ...n.apiEndpoint }));

  const classes = nodes
    .filter((n: any) => n.type === "class" || n.type === "interface")
    .map((c: any) => ({ name: c.label, type: c.type, file: c.file }))
    .slice(0, 40);

  const topFunctions = nodes
    .filter((n: any) => n.type === "function" && n.isExported)
    .map((f: any) => `${f.file}::${f.label}`)
    .slice(0, 50);

  const prompt = `You are RepoMind, an elite AI Software Architect. Analyze this structured repository graph payload and generate a comprehensive Repository Memory JSON object.

## REPOSITORY METADATA
- Tech Stack: ${JSON.stringify(techStack)}
- Core Folders (${folders.length}): ${JSON.stringify(folders, null, 2)}
- API Endpoints (${apiEndpoints.length}): ${JSON.stringify(apiEndpoints, null, 2)}
- Key Classes/Interfaces (${classes.length}): ${JSON.stringify(classes, null, 2)}
- Exported Functions Preview (${topFunctions.length}): ${JSON.stringify(topFunctions, null, 2)}

## OUTPUT INSTRUCTIONS
Return ONLY a valid JSON object matching exactly this schema (no markdown formatting outside the JSON, no commentary):
{
  "techStackOverview": "A 2-4 sentence summary of the languages, frameworks, and structural paradigm used.",
  "systemArchitecture": "A detailed 2-paragraph architectural overview explaining the layer boundaries, data flow, and how the core modules interact.",
  "codingConventions": [
    "Array of 4 to 6 inferred coding conventions and patterns observed in this repository (e.g. controller-service separation, async/await error handling, interface definitions)"
  ],
  "domainConcepts": {
    "ConceptName": "Clear definition of key domain entities or concepts inferred from class names and files (4 to 8 concepts)"
  },
  "folderSummaries": {
    "folderPath": "A concise 1-2 sentence summary of what responsibilities this folder handles"
  },
  "apiDocumentation": [
    {
      "route": "/example",
      "method": "POST",
      "handler": "handlerFuncName",
      "summary": "1-sentence summary of what this API endpoint does"
    }
  ]
}

Ensure "folderSummaries" includes an entry for every folder in the input list. Ensure "apiDocumentation" includes entries for every API endpoint in the input list. Return ONLY valid JSON.`;

  let memoryData: any = null;

  try {
    const aiText = await generateAIContent(prompt);
    let jsonStr = aiText;
    const startIndex = aiText.indexOf("{");
    const endIndex = aiText.lastIndexOf("}");
    if (startIndex !== -1 && endIndex !== -1 && endIndex >= startIndex) {
      jsonStr = aiText.substring(startIndex, endIndex + 1);
    }
    memoryData = JSON.parse(jsonStr);
  } catch (error) {
    console.warn("⚠️ AI memory generation failed or not configured. Using deterministic fallback summary...", error);
    // Deterministic fallback if API keys are missing or AI fails
    const folderSummaries: Record<string, string> = {};
    for (const f of folders) {
      folderSummaries[f.path] = `Contains ${f.files.length} files handling ${f.name} components/services.`;
    }
    const apiDocumentation = apiEndpoints.map((api: any) => ({
      route: api.routePath || "/unknown",
      method: api.httpMethod || "GET",
      handler: api.handlerName || api.handler || "unknown",
      summary: `API endpoint handled by ${api.handlerName || api.handler} in ${api.file || "unknown"}`
    }));

    memoryData = {
      techStackOverview: `Repository using ${techStack.languages.join(", ") || "Unknown Language"} and ${techStack.frameworks.join(", ") || "various libraries"} (${techStack.packageCount} dependencies).`,
      systemArchitecture: `The system is structured hierarchically across ${folders.length} main directories. Core entry points and controllers route requests to underlying service and storage layers.`,
      codingConventions: [
        "Modular directory layout separating controllers, services, and store/db access",
        "Typed data schemas and interface definitions across modules",
        "Centralized API route declarations and asynchronous request handling"
      ],
      domainConcepts: classes.slice(0, 6).reduce((acc: any, c: any) => {
        acc[c.name] = `${c.type === "class" ? "Class" : "Interface"} defined in ${c.file}`;
        return acc;
      }, {}),
      folderSummaries,
      apiDocumentation
    };
  }

  const memory: RepoMemory = {
    repoId,
    techStackOverview: memoryData.techStackOverview || "",
    systemArchitecture: memoryData.systemArchitecture || "",
    codingConventions: Array.isArray(memoryData.codingConventions) ? memoryData.codingConventions : [],
    domainConcepts: memoryData.domainConcepts || {},
    folderSummaries: memoryData.folderSummaries || {},
    apiDocumentation: Array.isArray(memoryData.apiDocumentation) ? memoryData.apiDocumentation : [],
    updatedAt: Date.now()
  };

  saveRepoMemory(repoId, memory);
  return memory;
}

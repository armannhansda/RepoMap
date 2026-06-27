import { type Request, type Response } from 'express';
import { GoogleGenAI } from '@google/genai';
import Groq from 'groq-sdk';export async function explainNode(req: Request, res: Response): Promise<void> {
  try {
    const { label, type, path, functionType, calls, calledBy, imports, sourceCode } = req.body;

    if (!process.env.GEMINI_API_KEY && !process.env.GROQ_API_KEY) {
      res.status(500).json({ error: "Neither GEMINI_API_KEY nor GROQ_API_KEY is configured on the server." });
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

    let explanationText = "";
    
    try {
      if (process.env.GEMINI_API_KEY) {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const response = await ai.models.generateContent({
          model: 'gemini-1.5-flash',
          contents: prompt,
        });
        explanationText = response.text || "";
      } else {
        throw new Error("Gemini API key not configured");
      }
    } catch (geminiError) {
      console.warn("Gemini generation failed or not configured, falling back to Groq...");
      
      if (process.env.GROQ_API_KEY) {
        const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
        const response = await groq.chat.completions.create({
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
          model: "llama-3.3-70b-versatile",
        });
        explanationText = response.choices[0]?.message?.content || "";
      } else {
        throw new Error("Groq API key not configured for fallback.");
      }
    }

    res.json({ explanation: explanationText });
  } catch (error) {
    console.error("Error generating explanation:", error);
    res.status(500).json({ error: "Failed to generate AI explanation" });
  }
}
export async function explainRepo(req: Request, res: Response): Promise<void> {
  try {
    const { repoName, files } = req.body;
    
    if (!process.env.GEMINI_API_KEY && !process.env.GROQ_API_KEY) {
      res.status(500).json({ error: "Neither GEMINI_API_KEY nor GROQ_API_KEY is configured on the server." });
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

    let explanationText = "";
    
    try {
      if (process.env.GEMINI_API_KEY) {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const response = await ai.models.generateContent({
          model: 'gemini-1.5-flash',
          contents: prompt,
        });
        explanationText = response.text || "";
      } else {
        throw new Error("Gemini API key not configured");
      }
    } catch (geminiError) {
      console.warn("Gemini generation failed or not configured, falling back to Groq...");
      
      if (process.env.GROQ_API_KEY) {
        const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
        const response = await groq.chat.completions.create({
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
          model: "llama-3.3-70b-versatile",
        });
        explanationText = response.choices[0]?.message?.content || "";
      } else {
        throw new Error("Groq API key not configured for fallback.");
      }
    }

    res.json({ explanation: explanationText });
  } catch (error) {
    console.error("Error generating repo explanation:", error);
    res.status(500).json({ error: "Failed to generate AI explanation for repository" });
  }
}

export async function generateDiagram(req: Request, res: Response): Promise<void> {
  try {
    const { repoName, files } = req.body;
    
    if (!process.env.GEMINI_API_KEY && !process.env.GROQ_API_KEY) {
      res.status(500).json({ error: "Neither GEMINI_API_KEY nor GROQ_API_KEY is configured on the server." });
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

    let resultText = "";
    
    try {
      if (process.env.GEMINI_API_KEY) {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const response = await ai.models.generateContent({
          model: 'gemini-1.5-flash',
          contents: prompt,
        });
        resultText = response.text || "";
        console.log("✅ Successfully generated architecture diagram using: gemini-1.5-flash");
      } else {
        throw new Error("Gemini API key not configured");
      }
    } catch (geminiError) {
      console.warn("⚠️ Gemini generation failed or not configured, falling back to Groq...");
      
      if (process.env.GROQ_API_KEY) {
        const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
        const response = await groq.chat.completions.create({
          messages: [{ role: "user", content: prompt }],
          model: "llama-3.3-70b-versatile",
        });
        resultText = response.choices[0]?.message?.content || "";
        console.log("✅ Successfully generated architecture diagram using: llama-3.3-70b-versatile (Groq)");
      } else {
        throw new Error("Groq API key not configured for fallback.");
      }
    }

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

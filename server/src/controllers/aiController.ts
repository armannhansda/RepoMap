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
          model: 'gemini-2.5-flash',
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
          model: 'gemini-2.5-flash',
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

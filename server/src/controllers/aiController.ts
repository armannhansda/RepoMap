import { type Request, type Response } from 'express';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });

export async function explainNode(req: Request, res: Response): Promise<void> {
  try {
    const { label, type, path, functionType, calls, calledBy, imports, sourceCode } = req.body;

    if (!process.env.GEMINI_API_KEY) {
      res.status(500).json({ error: "GEMINI_API_KEY is not configured on the server." });
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

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    const text = response.text;
    res.json({ explanation: text });
  } catch (error) {
    console.error("Error generating explanation:", error);
    res.status(500).json({ error: "Failed to generate AI explanation" });
  }
}

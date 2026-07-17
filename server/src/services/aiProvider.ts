import { GoogleGenAI } from "@google/genai";
import Groq from "groq-sdk";

export async function generateAIContent(prompt: string, systemInstruction?: string): Promise<string> {
  if (!process.env.GEMINI_API_KEY && !process.env.GROQ_API_KEY) {
    throw new Error("Neither GEMINI_API_KEY nor GROQ_API_KEY is configured on the server.");
  }

  const errors: string[] = [];
  const fullPrompt = systemInstruction ? `${systemInstruction}\n\n${prompt}` : prompt;

  // 1. Google Gemini Models Cascade
  if (process.env.GEMINI_API_KEY) {
    const geminiModels = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];
    for (const modelName of geminiModels) {
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const response = await ai.models.generateContent({
          model: modelName,
          contents: fullPrompt,
        });
        if (response.text) {
          return response.text;
        }
      } catch (err: any) {
        const msg = err.message || String(err);
        errors.push(`[Gemini ${modelName}]: ${msg}`);
        console.warn(`[AI Cascade] ${modelName} failed or rate-limited, cascading to next tier...`);
      }
    }
  }

  // 2. Groq Models Cascade
  if (process.env.GROQ_API_KEY) {
    const groqModels = [
      "llama-3.3-70b-versatile",
      "llama-3.1-8b-instant",
      "mixtral-8x7b-32768",
      "gemma2-9b-it",
    ];
    for (const modelName of groqModels) {
      try {
        const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
        const response = await groq.chat.completions.create({
          messages: [
            ...(systemInstruction ? [{ role: "system" as const, content: systemInstruction }] : []),
            { role: "user" as const, content: prompt },
          ],
          model: modelName,
        });
        const content = response.choices[0]?.message?.content;
        if (content) {
          return content;
        }
      } catch (err: any) {
        const msg = err.message || String(err);
        errors.push(`[Groq ${modelName}]: ${msg}`);
        console.warn(`[AI Cascade] ${modelName} failed or rate-limited, cascading to next tier...`);
      }
    }
  }

  throw new Error(`All AI model tiers exhausted across Gemini and Groq without success. Errors:\n${errors.join("\n")}`);
}

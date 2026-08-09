import Groq from "groq-sdk";
import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";

export async function generateAIContent(prompt: string, systemInstruction?: string): Promise<string> {
  if (!process.env.GEMINI_API_KEY && !process.env.GROQ_API_KEY && !process.env.NVIDIA_API_KEY) {
    throw new Error("No AI API key (Gemini/Groq/NVIDIA) is configured on the server.");
  }

  const errors: string[] = [];
  const fullPrompt = systemInstruction ? `${systemInstruction}\n\n${prompt}` : prompt;

  // 1. Groq Models Cascade
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
        console.warn(`[AI Cascade] Groq ${modelName} failed or rate-limited, cascading to next tier...`);
      }
    }
  }

  // 2. NVIDIA Models Cascade
  if (process.env.NVIDIA_API_KEY) {
    const nvidiaModels = [
      "meta/llama-3.3-70b-instruct",
      "meta/llama-3.1-405b-instruct",
      "meta/llama-3.1-70b-instruct",
      "meta/llama-3.1-8b-instruct",
    ];
    const openai = new OpenAI({
      apiKey: process.env.NVIDIA_API_KEY,
      baseURL: 'https://integrate.api.nvidia.com/v1',
      timeout: 5000,
      maxRetries: 0,
    });
    for (const modelName of nvidiaModels) {
      try {
        const completion = await openai.chat.completions.create({
          model: modelName,
          messages: [
            ...(systemInstruction ? [{ role: "system" as const, content: systemInstruction }] : []),
            { role: "user" as const, content: prompt }
          ],
          temperature: 0.2,
          top_p: 0.7,
          max_tokens: 1024,
          stream: false
        });

        const content = completion.choices[0]?.message?.content;
        if (content) {
          return content;
        }
      } catch (err: any) {
        const msg = err.message || String(err);
        errors.push(`[NVIDIA ${modelName}]: ${msg}`);
        console.warn(`[AI Cascade] NVIDIA ${modelName} failed or rate-limited, cascading to next tier...`);
      }
    }
  }

  // 3. Gemini Models Cascade
  if (process.env.GEMINI_API_KEY) {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        ...(systemInstruction ? { config: { systemInstruction } } : {})
      });
      if (response.text) return response.text;
    } catch (err: any) {
      errors.push(`[Gemini 2.5 Flash]: ${err.message || String(err)}`);
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const response = await ai.models.generateContent({
          model: "gemini-2.0-flash",
          contents: prompt,
          ...(systemInstruction ? { config: { systemInstruction } } : {})
        });
        if (response.text) return response.text;
      } catch (err2: any) {
        errors.push(`[Gemini 2.0 Flash]: ${err2.message || String(err2)}`);
        console.warn("[AI Cascade] Gemini failed, cascading to next tier...", err2);
      }
    }
  }

  throw new Error(`All AI model tiers exhausted across Groq, NVIDIA, and Gemini without success. Errors:\n${errors.join("\n")}`);
}

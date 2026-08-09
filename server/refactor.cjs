const fs = require('fs');
const path = require('path');

const servicesDir = path.join(__dirname, 'src', 'services');

const filesToUpdate = [
  { file: path.join(servicesDir, 'planningAgent.ts'), importPath: './aiProvider' },
  { file: path.join(servicesDir, 'architectureAgent.ts'), importPath: './aiProvider' },
  { file: path.join(servicesDir, 'impactAnalyzer.ts'), importPath: './aiProvider' },
  { file: path.join(servicesDir, 'codeReviewEngine.ts'), importPath: './aiProvider' },
  { file: path.join(servicesDir, 'agents', 'Orchestrator.ts'), importPath: '../aiProvider' },
];

for (const { file, importPath } of filesToUpdate) {
  if (!fs.existsSync(file)) {
    console.warn(`File not found: ${file}`);
    continue;
  }
  
  let content = fs.readFileSync(file, 'utf-8');
  
  // Remove unused imports
  content = content.replace(/import OpenAI from "openai";\n?/g, '');
  content = content.replace(/import \{ GoogleGenAI \} from "@google\/genai";\n?/g, '');
  content = content.replace(/import Groq from "groq-sdk";\n?/g, '');
  
  // Add aiProvider import if it doesn't exist
  if (!content.includes(`import { generateAIContent }`)) {
    content = `import { generateAIContent } from "${importPath}";\n` + content;
  }
  
  // Remove the generateAIContent function completely
  // We can use a regex to match from 'async function generateAIContent' to 'throw new Error(...);\n}'
  // Since the inner content varies, we can use a non-greedy match across newlines
  const regex = /async function generateAIContent\(prompt: string\): Promise<string> \{[\s\S]*?throw new Error\("Failed to generate.*?"\);\n\}/g;
  content = content.replace(regex, '');
  
  fs.writeFileSync(file, content);
  console.log(`Updated ${file}`);
}

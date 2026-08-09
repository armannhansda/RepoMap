const fs = require('fs');

const files = [
  '/Users/arman/Desktop/RepoMap/server/src/services/planningAgent.ts',
  '/Users/arman/Desktop/RepoMap/server/src/services/codeReviewEngine.ts',
  '/Users/arman/Desktop/RepoMap/server/src/services/architectureAgent.ts',
  '/Users/arman/Desktop/RepoMap/server/src/services/impactAnalyzer.ts',
  '/Users/arman/Desktop/RepoMap/server/src/services/agents/Orchestrator.ts'
];

const nvidiaBlock = `
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
    });
    for (const modelName of nvidiaModels) {
      try {
        const completion = await openai.chat.completions.create({
          model: modelName,
          messages: [{ role: "user", content: prompt }],
          temperature: 0.2,
          top_p: 0.7,
          max_tokens: 1024,
          stream: false
        });
        const content = completion.choices[0]?.message?.content;
        if (content) return content;
      } catch (err) {
        console.warn(\`[NVIDIA \${modelName}] failed:\`, err);
      }
    }
  }
`;

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  
  if (!content.includes('import OpenAI')) {
    content = 'import OpenAI from "openai";\n' + content;
  }
  
  content = content.replace(
    'if (!process.env.GEMINI_API_KEY && !process.env.GROQ_API_KEY)',
    'if (!process.env.GEMINI_API_KEY && !process.env.GROQ_API_KEY && !process.env.NVIDIA_API_KEY)'
  );
  content = content.replace(
    'throw new Error("Neither GEMINI_API_KEY nor GROQ_API_KEY is configured.");',
    'throw new Error("No AI API key (Gemini/Groq/NVIDIA) is configured.");'
  );

  if (!content.includes('const nvidiaModels = [')) {
    const splitIndex = content.lastIndexOf('throw new Error("Failed to ');
    if (splitIndex !== -1) {
      const preceding = content.substring(0, splitIndex);
      const following = content.substring(splitIndex);
      content = preceding + nvidiaBlock + '\\n  ' + following;
    }
  }
  
  fs.writeFileSync(file, content);
}
console.log("Done updating files.");

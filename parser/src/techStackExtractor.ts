import fs from "fs";
import path from "path";
import { TechStackMetadata } from "./types.ts";
import { scannerRepository, ScannedFile } from "./scanner.ts";

const EXT_TO_LANG: Record<string, string> = {
  ".ts": "TypeScript",
  ".tsx": "TypeScript (React)",
  ".js": "JavaScript",
  ".jsx": "JavaScript (React)",
  ".py": "Python",
  ".go": "Go",
  ".java": "Java",
  ".rs": "Rust",
  ".cpp": "C++",
  ".c": "C",
  ".cs": "C#",
  ".rb": "Ruby",
  ".php": "PHP",
  ".swift": "Swift",
  ".kt": "Kotlin",
};

const FRAMEWORK_KEYWORDS: Record<string, string> = {
  "react": "React",
  "next": "Next.js",
  "express": "Express",
  "fastify": "Fastify",
  "vue": "Vue.js",
  "angular": "Angular",
  "svelte": "Svelte",
  "tailwindcss": "Tailwind CSS",
  "fastapi": "FastAPI",
  "django": "Django",
  "flask": "Flask",
  "spring-boot": "Spring Boot",
  "gin": "Gin (Go)",
  "chi": "Chi (Go)",
};

export async function extractTechStack(repoPath: string, cachedFiles?: ScannedFile[]): Promise<TechStackMetadata> {
  const files = await scannerRepository(repoPath, cachedFiles);
  const languagesSet = new Set<string>();
  const frameworksSet = new Set<string>();
  let packageCount = 0;

  for (const file of files) {
    const ext = path.extname(file.relativePath);
    if (EXT_TO_LANG[ext]) {
      languagesSet.add(EXT_TO_LANG[ext]);
    }
  }

  // Check package.json
  const packageJsonPath = path.join(repoPath, "package.json");
  if (fs.existsSync(packageJsonPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
      const allDeps = {
        ...(pkg.dependencies || {}),
        ...(pkg.devDependencies || {})
      };
      packageCount += Object.keys(allDeps).length;

      for (const dep of Object.keys(allDeps)) {
        for (const [key, name] of Object.entries(FRAMEWORK_KEYWORDS)) {
          if (dep.includes(key)) {
            frameworksSet.add(name);
          }
        }
      }
    } catch (e) {
      console.warn("Failed to parse package.json for tech stack:", e);
    }
  }

  // Check requirements.txt
  const reqPath = path.join(repoPath, "requirements.txt");
  if (fs.existsSync(reqPath)) {
    try {
      const content = fs.readFileSync(reqPath, "utf-8");
      const lines = content.split("\n").filter(l => l.trim() && !l.trim().startsWith("#"));
      packageCount += lines.length;
      for (const line of lines) {
        const lower = line.toLowerCase();
        for (const [key, name] of Object.entries(FRAMEWORK_KEYWORDS)) {
          if (lower.includes(key)) {
            frameworksSet.add(name);
          }
        }
      }
    } catch (e) {
      console.warn("Failed to read requirements.txt:", e);
    }
  }

  // Check go.mod
  const goModPath = path.join(repoPath, "go.mod");
  if (fs.existsSync(goModPath)) {
    try {
      const content = fs.readFileSync(goModPath, "utf-8");
      if (content.includes("github.com/gin-gonic/gin")) frameworksSet.add("Gin (Go)");
      if (content.includes("github.com/go-chi/chi")) frameworksSet.add("Chi (Go)");
    } catch (e) {
      console.warn("Failed to read go.mod:", e);
    }
  }

  return {
    languages: Array.from(languagesSet),
    frameworks: Array.from(frameworksSet),
    packageCount,
  };
}

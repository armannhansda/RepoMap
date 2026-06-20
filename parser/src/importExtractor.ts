import fs from "fs";
import { scannerRepository } from "./scanner.ts";
import { resolveImportPath } from "./resolveImports.ts";
import path from "path";

const IMPORT_REGEXES = [
  /import\s+(?:.*?\s+from\s+)?['"](.*?)['"]/g,
  /require\(['"](.*?)['"]\)/g,
  /^import\s+([a-zA-Z0-9_.-]+)/gm,
  /^from\s+([a-zA-Z0-9_.-]+)\s+import/gm,
  /import\s+(['"](.*?)['"])/g,
  /import\s+([a-zA-Z0-9_.]+);/g,
  /#include\s+["<](.*?)[">]/g,
];

export async function extractImports(repoPath: string) {
  const files = await scannerRepository(repoPath);
  const dependencyMap: any[] = [];

  for (const file of files) {
    const content = fs.readFileSync(file.absolutePath, "utf-8");
    const resolvedImports = new Set<string>();

    for (const regex of IMPORT_REGEXES) {
      const re = new RegExp(regex);
      let match;
      while ((match = re.exec(content)) !== null) {
        const importVal = match[1] || match[2];
        if (!importVal) continue;

        let resolvedPath = resolveImportPath(file.absolutePath, importVal, repoPath);

        // Python/Java heuristic
        if (!resolvedPath && !importVal.startsWith(".")) {
          const asPath = importVal.replace(/\./g, "/");
          const absoluteAsPath = path.resolve(repoPath, asPath);
          for (const ext of [".py", ".java"]) {
              if (fs.existsSync(absoluteAsPath + ext) && fs.statSync(absoluteAsPath + ext).isFile()) {
                  resolvedPath = path.relative(repoPath, absoluteAsPath + ext);
                  break;
              }
          }
        }

        if (resolvedPath) {
          resolvedImports.add(resolvedPath);
        } else {
          // If we couldn't resolve it to a local file, just add the raw import name (external dependency)
          resolvedImports.add(importVal);
        }
      }
    }

    dependencyMap.push({
      file: file.relativePath,
      imports: Array.from(resolvedImports)
    });
  }

  return dependencyMap;
}

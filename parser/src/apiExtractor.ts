import fs from "fs";
import { FunctionNode, ApiEndpoint } from "./types.ts";
import { scannerRepository, ScannedFile } from "./scanner.ts";

const ROUTE_REGEXES = [
  // Express/Router/FastAPI/Flask: app.get('/path', handler or router.post('/path', handler or @app.get('/path')
  /(?:app|router)\.(get|post|put|delete|patch)\(['"]([^'"]+)['"](?:\s*,\s*([a-zA-Z0-9_]+))?/gi,
  // Spring Boot: @GetMapping('/path')
  /@(Get|Post|Put|Delete|Patch)Mapping\(['"]([^'"]+)['"]/gi,
  // Go Chi/Gin: r.Get('/path', handler or group.POST('/path', handler
  /\.(Get|Post|Put|Delete|Patch|GET|POST|PUT|DELETE|PATCH)\(['"]([^'"]+)['"](?:\s*,\s*([a-zA-Z0-9_.]+))?/g,
];

export async function extractApiEndpoints(repoPath: string, functions: FunctionNode[], cachedFiles?: ScannedFile[]): Promise<void> {
  const files = await scannerRepository(repoPath, cachedFiles);

  // 1. Next.js App Router convention check (e.g. app/api/.../route.ts with GET/POST functions)
  for (const fn of functions) {
    if (fn.file.includes("app/") && (fn.file.endsWith("route.ts") || fn.file.endsWith("route.js"))) {
      if (["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"].includes(fn.name.toUpperCase())) {
        let routePath = "/" + fn.file.replace(/^.*?app\//, "").replace(/\/route\.(ts|js)$/, "");
        if (routePath === "/") routePath = "/api";
        fn.apiEndpoint = {
          httpMethod: fn.name.toUpperCase(),
          routePath,
          handlerName: fn.name
        };
      }
    }
  }

  // 2. Scan files for explicit route registrations (Express, FastAPI, etc.)
  for (const file of files) {
    const content = file.content !== undefined ? file.content : fs.readFileSync(file.absolutePath, "utf-8");
    const lines = content.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i + 1;

      for (const regex of ROUTE_REGEXES) {
        const re = new RegExp(regex);
        let match;
        while ((match = re.exec(line)) !== null) {
          const method = (match[1] || "").toUpperCase().replace("MAPPING", "");
          const routePath = match[2];
          let handlerName = match[3];
          if (!method || !routePath) continue;

          if (handlerName && handlerName.includes(".")) {
            handlerName = handlerName.split(".").pop();
          }

          let matched = false;

          // If handlerName was captured, check if any function in the repo matches it
          if (handlerName) {
            const targetFn = functions.find(f => f.name === handlerName);
            if (targetFn) {
              targetFn.apiEndpoint = {
                httpMethod: method,
                routePath,
                handlerName: targetFn.name
              };
              matched = true;
            }
          }

          if (!matched) {
            // Find if there is a surrounding or adjacent function in this file (for decorators or inline handlers)
            for (const fn of functions) {
              if (fn.file === file.relativePath && lineNumber >= fn.line - 5 && lineNumber <= (fn.endLine || fn.line + 50)) {
                fn.apiEndpoint = {
                  httpMethod: method,
                  routePath,
                  handlerName: fn.name
                };
                break;
              }
            }
          }
        }
      }
    }
  }
}

import fs from "fs";
import { scannerRepository, ScannedFile } from "./scanner.ts";
import { findEndLine } from "./findEndLine.ts";

const FUNCTION_REGEXES = [
  /(?:export\s+)?(?:async\s+)?function\s+([a-zA-Z0-9_]+)\s*\(/g,
  /(?:export\s+)?(?:const|let|var)\s+([a-zA-Z0-9_]+)\s*=\s*(?:async\s+)?(?:\(.*?\)|[a-zA-Z0-9_]+)\s*=>/g,
  /(?:public|private|protected|static|virtual|override)?\s*(?:async\s+)?([a-zA-Z0-9_]+)\s*\([^)]*\)\s*(?::\s*[a-zA-Z0-9_<>{}\[\]]+\s*)?\{/g,
  /(?:async\s+)?def\s+([a-zA-Z0-9_]+)\s*\(/g,
  /func\s+(?:\([^)]+\)\s+)?([a-zA-Z0-9_]+)\s*\(/g,
  /(?:pub\s+)?(?:async\s+)?fn\s+([a-zA-Z0-9_]+)\s*(?:<[^>]+>)?\s*\(/g,
  /(?:public|private|protected|static|virtual|inline)\s+(?:[a-zA-Z0-9_<>\[\]]+\s+)+([a-zA-Z0-9_]+)\s*\(/g,
  /(?:public|private|protected|static)?\s*function\s+([a-zA-Z0-9_]+)\s*\(/g,
  /(?:public|private|protected|internal)?\s*fun\s+([a-zA-Z0-9_]+)\s*\(/g,
  /(?:public|private|internal|fileprivate|open)?\s*func\s+([a-zA-Z0-9_]+)\s*\(/g,
];

export async function extractFunctions(repoPath: string, cachedFiles?: ScannedFile[]) {
    const files = await scannerRepository(repoPath, cachedFiles);
    const functions: any[] = [];

    for (const file of files) {
        const content = file.content !== undefined ? file.content : fs.readFileSync(file.absolutePath, "utf-8");
        const isPython = file.absolutePath.endsWith(".py");
        const foundNames = new Set<string>();

        for (const regex of FUNCTION_REGEXES) {
            const re = new RegExp(regex);
            let match;
            while ((match = re.exec(content)) !== null) {
                const name = match[1];
                if (!name || foundNames.has(name)) continue;
                if (["if", "for", "while", "switch", "catch", "return", "class"].includes(name)) continue;
                
                foundNames.add(name);
                
                const startLine = content.substring(0, match.index).split("\n").length;
                const offset = findEndLine(content, match.index, isPython);
                const endLine = startLine + offset;
                const matchStr = match[0] || "";
                const isExported = matchStr.includes("export ") || matchStr.includes("pub ") || matchStr.includes("public ");

                functions.push({
                    name,
                    file: file.relativePath,
                    type: "function",
                    line: startLine,
                    endLine: endLine,
                    isExported
                });
            }
        }
    }

    return functions;
}
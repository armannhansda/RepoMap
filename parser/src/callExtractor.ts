import fs from "fs";
import { scannerRepository } from "./scanner.ts";
import { extractFunctions } from "./functionExtractor.ts";

const CALL_REGEX = /\b([a-zA-Z0-9_]+)\s*\(/g;

export async function extractCalls(repoPath: string, functions?: any[]) {
    if (!functions) {
        functions = await extractFunctions(repoPath);
    }
    
    const files = await scannerRepository(repoPath);
    const calls: any[] = [];
    
    const fileFunctions = new Map<string, any[]>();
    for (const fn of functions) {
        if (!fileFunctions.has(fn.file)) fileFunctions.set(fn.file, []);
        fileFunctions.get(fn.file)!.push(fn);
    }

    for (const file of files) {
        const content = fs.readFileSync(file.absolutePath, "utf-8");
        const fnsInFile = fileFunctions.get(file.relativePath) || [];
        
        const lines = content.split("\n");
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const lineNumber = i + 1;
            
            if (line.trim().startsWith("//") || line.trim().startsWith("#")) continue;
            
            let match;
            const re = new RegExp(CALL_REGEX);
            while ((match = re.exec(line)) !== null) {
                const callee = match[1];
                if (["if", "for", "while", "switch", "catch", "return", "function", "def", "func", "fn", "class"].includes(callee)) continue;
                
                let caller = "global";
                for (const fn of fnsInFile) {
                    if (lineNumber >= fn.line && lineNumber <= fn.endLine) {
                        caller = fn.name;
                        break;
                    }
                }
                
                if (caller !== "global") {
                    calls.push({
                        caller,
                        callee,
                        file: file.relativePath
                    });
                }
            }
        }
    }
    return calls;
}

import fs from "fs";
import { scannerRepository } from "./scanner.ts";

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

function findEndLine(content: string, startMatchIndex: number, isPython: boolean): number {
    const lines = content.substring(startMatchIndex).split("\n");
    if (isPython) {
        const firstLine = lines[0];
        const baseIndent = firstLine.match(/^\s*/)?.[0].length || 0;
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            if (line.trim().length === 0 || line.trim().startsWith("#")) continue;
            const indent = line.match(/^\s*/)?.[0].length || 0;
            if (indent <= baseIndent) {
                return Math.max(0, i - 1);
            }
        }
        return lines.length - 1;
    } else {
        let braceCount = 0;
        let parenCount = 0;
        let foundFirstBrace = false;
        let charIndex = startMatchIndex;
        
        let inSingleQuote = false;
        let inDoubleQuote = false;
        let inTemplateLiteral = false;
        let inLineComment = false;
        let inBlockComment = false;
        
        while (charIndex < content.length) {
            const char = content[charIndex];
            const nextChar = content[charIndex + 1] || '';
            const prevChar = charIndex > 0 ? content[charIndex - 1] : '';
            
            // Handle comments
            if (!inSingleQuote && !inDoubleQuote && !inTemplateLiteral) {
                if (!inLineComment && !inBlockComment) {
                    if (char === '/' && nextChar === '/') {
                        inLineComment = true;
                        charIndex += 2;
                        continue;
                    } else if (char === '/' && nextChar === '*') {
                        inBlockComment = true;
                        charIndex += 2;
                        continue;
                    }
                } else if (inLineComment && char === '\n') {
                    inLineComment = false;
                } else if (inBlockComment && char === '*' && nextChar === '/') {
                    inBlockComment = false;
                    charIndex += 2;
                    continue;
                }
            }
            
            // Handle strings
            if (!inLineComment && !inBlockComment && prevChar !== '\\') {
                if (char === "'" && !inDoubleQuote && !inTemplateLiteral) {
                    inSingleQuote = !inSingleQuote;
                } else if (char === '"' && !inSingleQuote && !inTemplateLiteral) {
                    inDoubleQuote = !inDoubleQuote;
                } else if (char === '`' && !inSingleQuote && !inDoubleQuote) {
                    inTemplateLiteral = !inTemplateLiteral;
                }
            }
            
            // Handle parentheses and braces
            if (!inSingleQuote && !inDoubleQuote && !inTemplateLiteral && !inLineComment && !inBlockComment) {
                if (char === '(') {
                    parenCount++;
                } else if (char === ')') {
                    parenCount = Math.max(0, parenCount - 1);
                } else if (char === '{') {
                    if (!foundFirstBrace) {
                        if (parenCount === 0) {
                            braceCount++;
                            foundFirstBrace = true;
                        }
                    } else {
                        braceCount++;
                    }
                } else if (char === '}') {
                    if (foundFirstBrace) {
                        braceCount--;
                        if (braceCount === 0) {
                            break;
                        }
                    }
                }
            }
            
            charIndex++;
            if (!foundFirstBrace && charIndex > startMatchIndex + 500) break; 
        }
        
        const linesUpToMatch = content.substring(0, charIndex).split("\n").length;
        const linesUpToStart = content.substring(0, startMatchIndex).split("\n").length;
        return linesUpToMatch - linesUpToStart;
    }
}

export async function extractFunctions(repoPath: string) {
    const files = await scannerRepository(repoPath);
    const functions: any[] = [];

    for (const file of files) {
        const content = fs.readFileSync(file.absolutePath, "utf-8");
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

                functions.push({
                    name,
                    file: file.relativePath,
                    type: "function",
                    line: startLine,
                    endLine: endLine,
                });
            }
        }
    }

    return functions;
}
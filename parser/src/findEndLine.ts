export function findEndLine(content: string, startMatchIndex: number, isPython: boolean): number {
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
        let angleCount = 0;
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
            
            // Handle parentheses, angle brackets, and braces
            if (!inSingleQuote && !inDoubleQuote && !inTemplateLiteral && !inLineComment && !inBlockComment) {
                if (char === '(') {
                    parenCount++;
                } else if (char === ')') {
                    parenCount = Math.max(0, parenCount - 1);
                } else if (char === '<') {
                    angleCount++;
                } else if (char === '>') {
                    angleCount = Math.max(0, angleCount - 1);
                } else if (char === '{') {
                    if (!foundFirstBrace) {
                        if (parenCount === 0 && angleCount === 0) {
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
                } else if (char === ';' && !foundFirstBrace && parenCount === 0 && angleCount === 0) {
                    break;
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

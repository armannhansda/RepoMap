import fs from "fs";

const content = `
export function BentoGrid({
  posts,
  pattern = DEFAULT_PATTERN,
}: BentoGridProps) {
  return (
    <div className="grid">
      {posts.map((post, i) => {
        const variant = pattern[i % pattern.length];
        return (
          <BentoCard key={post.id} post={post} variant={variant} index={i} />
        );
      })}
    </div>
  );
}

export function Another() {}
`;

const FUNCTION_REGEXES = [
  /(?:export\s+)?(?:async\s+)?function\s+([a-zA-Z0-9_]+)\s*\(/g,
];

function findEndLine(content: string, startMatchIndex: number, isPython: boolean): number {
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
        
        if (!inSingleQuote && !inDoubleQuote && !inTemplateLiteral) {
            if (!inLineComment && !inBlockComment) {
                if (char === '/' && nextChar === '/') {
                    inLineComment = true; charIndex += 2; continue;
                } else if (char === '/' && nextChar === '*') {
                    inBlockComment = true; charIndex += 2; continue;
                }
            } else if (inLineComment && char === '\n') {
                inLineComment = false;
            } else if (inBlockComment && char === '*' && nextChar === '/') {
                inBlockComment = false; charIndex += 2; continue;
            }
        }
        
        if (!inLineComment && !inBlockComment && prevChar !== '\\') {
            if (char === "'" && !inDoubleQuote && !inTemplateLiteral) {
                inSingleQuote = !inSingleQuote;
            } else if (char === '"' && !inSingleQuote && !inTemplateLiteral) {
                inDoubleQuote = !inDoubleQuote;
            } else if (char === '\`' && !inSingleQuote && !inDoubleQuote) {
                inTemplateLiteral = !inTemplateLiteral;
            }
        }
        
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
        if (!foundFirstBrace && charIndex > startMatchIndex + 500) {
           console.log("BROKE AFTER 500 CHARS", charIndex, startMatchIndex);
           break;
        }
    }
    
    console.log("FINAL charIndex", charIndex, "char:", content[charIndex]);
    const linesUpToMatch = content.substring(0, charIndex).split("\n").length;
    const linesUpToStart = content.substring(0, startMatchIndex).split("\n").length;
    return linesUpToMatch - linesUpToStart;
}

let match;
const re = FUNCTION_REGEXES[0];
while ((match = re.exec(content)) !== null) {
    console.log("MATCH:", match[1]);
    const offset = findEndLine(content, match.index, false);
    console.log("OFFSET:", offset);
}

import fs from "fs";
import { scannerRepository, ScannedFile } from "./scanner.ts";
import { findEndLine } from "./findEndLine.ts";
import { ClassNode, InterfaceNode } from "./types.ts";

const CLASS_REGEXES = [
  // TS/JS/Java/C++/C#/PHP/Kotlin/Swift: class Foo extends Bar implements Baz {
  /(?:export\s+)?(?:public|private|protected|abstract|final|open|data)?\s*class\s+([a-zA-Z0-9_]+)(?:\s+(?:extends|:\s*|inherits\s+)([a-zA-Z0-9_.-]+))?(?:\s+(?:implements\s+)([a-zA-Z0-9_.,\s]+))?\s*[\{]/g,
  // Python: class Foo(Bar):
  /(?:class\s+([a-zA-Z0-9_]+)(?:\(([a-zA-Z0-9_.,\s]+)\))?\s*:)/g,
  // Go/Rust/C structs: struct Foo {
  /(?:pub\s+)?struct\s+([a-zA-Z0-9_]+)\s*[\{]/g,
  // Go type Foo struct {
  /type\s+([a-zA-Z0-9_]+)\s+struct\s*[\{]/g,
];

const INTERFACE_REGEXES = [
  // TS/Java/C#/PHP interface Foo {
  /(?:export\s+)?(?:public|private|protected)?\s*interface\s+([a-zA-Z0-9_]+)(?:\s+(?:extends|implements)\s+([a-zA-Z0-9_.,\s]+))?\s*[\{]/g,
  // TS type Foo = { or type Foo = Bar
  /(?:export\s+)?type\s+([a-zA-Z0-9_]+)\s*=/g,
  // Go type Foo interface {
  /type\s+([a-zA-Z0-9_]+)\s+interface\s*[\{]/g,
  // Rust trait Foo {
  /(?:pub\s+)?trait\s+([a-zA-Z0-9_]+)\s*[\{]/g,
  // Swift protocol Foo {
  /(?:public|private|internal|fileprivate)?\s*protocol\s+([a-zA-Z0-9_]+)\s*[\{]/g,
];

export async function extractClasses(repoPath: string, cachedFiles?: ScannedFile[]): Promise<ClassNode[]> {
    const files = await scannerRepository(repoPath, cachedFiles);
    const classes: ClassNode[] = [];

    for (const file of files) {
        const content = file.content !== undefined ? file.content : fs.readFileSync(file.absolutePath, "utf-8");
        const isPython = file.absolutePath.endsWith(".py");
        const foundNames = new Set<string>();

        for (const regex of CLASS_REGEXES) {
            const re = new RegExp(regex);
            let match;
            while ((match = re.exec(content)) !== null) {
                const name = match[1];
                if (!name || foundNames.has(name)) continue;
                foundNames.add(name);

                const startLine = content.substring(0, match.index).split("\n").length;
                const offset = findEndLine(content, match.index, isPython);
                const endLine = startLine + offset;
                const matchStr = match[0] || "";
                const isExported = matchStr.includes("export ") || matchStr.includes("pub ") || matchStr.includes("public ");

                const extendsClass = match[2] ? match[2].trim() : undefined;
                const implementsStr = match[3] ? match[3].split(",").map(s => s.trim()).filter(Boolean) : undefined;

                classes.push({
                    name,
                    file: file.relativePath,
                    type: "class",
                    line: startLine,
                    endLine: endLine,
                    isExported,
                    extendsClass,
                    implementsInterfaces: implementsStr,
                });
            }
        }
    }

    return classes;
}

export async function extractInterfaces(repoPath: string, cachedFiles?: ScannedFile[]): Promise<InterfaceNode[]> {
    const files = await scannerRepository(repoPath, cachedFiles);
    const interfaces: InterfaceNode[] = [];

    for (const file of files) {
        const content = file.content !== undefined ? file.content : fs.readFileSync(file.absolutePath, "utf-8");
        const isPython = file.absolutePath.endsWith(".py");
        const foundNames = new Set<string>();

        for (const regex of INTERFACE_REGEXES) {
            const re = new RegExp(regex);
            let match;
            while ((match = re.exec(content)) !== null) {
                const name = match[1];
                if (!name || foundNames.has(name)) continue;
                foundNames.add(name);

                const startLine = content.substring(0, match.index).split("\n").length;
                const offset = findEndLine(content, match.index, isPython);
                const endLine = startLine + offset;
                const matchStr = match[0] || "";
                const isExported = matchStr.includes("export ") || matchStr.includes("pub ") || matchStr.includes("public ");

                interfaces.push({
                    name,
                    file: file.relativePath,
                    type: matchStr.includes("interface") || matchStr.includes("trait") || matchStr.includes("protocol") ? "interface" : "type",
                    line: startLine,
                    endLine: endLine,
                    isExported,
                });
            }
        }
    }

    return interfaces;
}

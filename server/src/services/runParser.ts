import { spawn } from "child_process";
import path from "path";

export function runParser(
  repoPath: string
): Promise<any> {
  return new Promise((resolve, reject) => {
    // path to parser
    const parserPath = path.join(
      process.cwd(),
      "..",
      "parser"
    );

    // Using spawn to stream chunks without maxBuffer limits or shell memory overhead
    const child = spawn(
      "npx",
      ["tsx", "src/index.ts", repoPath],
      {
        cwd: parserPath,
        shell: process.platform === "win32",
      }
    );

    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];

    child.stdout.on("data", (chunk: Buffer) => {
      stdoutChunks.push(chunk);
    });

    child.stderr.on("data", (chunk: Buffer) => {
      stderrChunks.push(chunk);
    });

    child.on("error", (err) => {
      console.error("parser spawn error:", err);
      reject(err);
    });

    child.on("close", (code) => {
      const stderrStr = Buffer.concat(stderrChunks).toString("utf-8");
      if (stderrStr && code !== 0) {
        console.error("parser stderr:", stderrStr);
      }

      if (code !== 0) {
        reject(new Error(`Parser process exited with code ${code}: ${stderrStr}`));
        return;
      }

      try {
        const fullStdout = Buffer.concat(stdoutChunks).toString("utf-8");
        const graph = JSON.parse(fullStdout);
        resolve(graph);
      } catch (parseError) {
        console.error("Failed to parse JSON from parser output:", parseError);
        reject(parseError);
      }
    });
  });
}
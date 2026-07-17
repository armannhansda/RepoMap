import { type Request, type Response } from "express"
import fs from "fs"
import path from "path"
import { execSync } from "child_process"
import { getRepository, saveRepository } from "../store/repoRegistry.ts"
import { cloneRepository } from "../services/repoclone.ts"


export async function getFileContent(req: Request, res: Response) {
  const { repoId, filePath } = req.query;

  let repoPath = getRepository(repoId as string);

  if (!repoPath) {
    // If the server restarted, the memory map is empty. Since the frontend passes the repoUrl as the repoId,
    // we can seamlessly re-clone the repository on-the-fly so the user doesn't experience any errors!
    console.log(`Repository not in memory. Attempting to re-clone ${repoId}...`);
    try {
      const clonedRepo = await cloneRepository(repoId as string);
      repoPath = clonedRepo.repoPath;
      saveRepository(repoId as string, repoPath);
    } catch (err) {
      console.error("Failed to re-clone repository:", err);
      return res.status(404).json({
        error: "Repository not found"
      });
    }
  }

  if (typeof filePath !== "string") {
    return res.status(400).json({
      error: "filePath query parameter is required"
    });
  }

  // Clean symbol suffixes (e.g., "src/foo.ts::myMethod" or "src/bar.ts#line10")
  let cleanedPath = ((filePath.split("::")[0] || filePath).split("#")[0] || filePath).replace(/^[/\\]+/, "");
  if (cleanedPath === "external") {
    return res.json({
      path: filePath,
      content: "// External dependency.\n// Source code not in repository.",
      commitsCount: 0
    });
  }

  const resolvedRepoPath = path.resolve(repoPath);
  const fullPath = path.resolve(resolvedRepoPath, cleanedPath);

  // Prevent Directory Traversal
  if (!fullPath.startsWith(resolvedRepoPath)) {
    return res.status(403).json({
      error: "Access denied: file path is outside the repository bounds"
    });
  }

  try {
    if (fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()) {
      return res.json({
        path: filePath,
        content: `// Directory: ${filePath}\n// Select an individual file inside this folder from the graph to inspect source code and commit history.`,
        commitsCount: 0
      });
    }

    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({
        error: `File not found in repository: ${cleanedPath}`
      });
    }

    const content = fs.readFileSync(fullPath, "utf-8");
    
    let commitsCount = 0;
    try {
      const output = execSync(`git rev-list --count HEAD -- "${cleanedPath}"`, { 
        cwd: resolvedRepoPath, 
        encoding: "utf-8" 
      });
      commitsCount = parseInt(output.trim(), 10);
      if (isNaN(commitsCount)) commitsCount = 0;
    } catch (gitError) {
      console.error(`Failed to get commit count for ${cleanedPath}:`, gitError);
    }

    res.json({
      path: filePath,
      content,
      commitsCount
    });
  } catch (error) {
    console.error(`Failed to read file ${fullPath}:`, error);
    res.status(404).json({
      error: "File not found or cannot be read"
    });
  }
}
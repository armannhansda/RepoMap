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

  const resolvedRepoPath = path.resolve(repoPath);
  const fullPath = path.resolve(resolvedRepoPath, filePath);

  // Prevent Directory Traversal
  if (!fullPath.startsWith(resolvedRepoPath)) {
    return res.status(403).json({
      error: "Access denied: file path is outside the repository bounds"
    });
  }

  console.log("DEBUG getFileContent:", { repoPath, resolvedRepoPath, filePath, fullPath });

  try {
    const content = fs.readFileSync(fullPath, "utf-8");
    
    let commitsCount = 0;
    try {
      const output = execSync(`git rev-list --count HEAD -- "${filePath}"`, { 
        cwd: resolvedRepoPath, 
        encoding: "utf-8" 
      });
      commitsCount = parseInt(output.trim(), 10);
      if (isNaN(commitsCount)) commitsCount = 0;
    } catch (gitError) {
      console.error(`Failed to get commit count for ${filePath}:`, gitError);
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
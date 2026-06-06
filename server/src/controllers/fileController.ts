import { type Request, type Response } from "express"
import fs from"fs"
import path from "path"
import { getRepository } from "../store/repoRegistry.ts"


export function getFileContent(req: Request, res: Response) {
  const { repoId, filePath } = req.query;

  const repoPath = getRepository(repoId as string);

  if (!repoPath) {
    return res.status(404).json({
      error: "Repository not found"
    });
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

  try {
    const content = fs.readFileSync(fullPath, "utf-8");
    res.json({
      path: filePath,
      content,
    });
  } catch (error) {
    console.error(`Failed to read file ${fullPath}:`, error);
    res.status(404).json({
      error: "File not found or cannot be read"
    });
  }
}
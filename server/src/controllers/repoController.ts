import { type Request, type Response } from "express";
import { cloneRepository } from "../services/repoclone.ts";
import { runParser } from "../services/runParser.ts";
import { saveRepository, saveAnalysis, getCachedAnalysis } from "../store/repoRegistry.ts";
import { buildRepoMemory } from "../services/memoryBuilder.ts";
import { getRepoMemory } from "../store/memoryStore.ts";
import { jobPool } from "../services/jobQueue.ts";
import { cleanupOldRepositories } from "../services/tempCleanup.ts";

export async function analyzeRepo(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    console.log("Request received for analyzeRepo");
    const { repoUrl } = req.body;

    if (!repoUrl) {
      res.status(400).json({
        error: "Repository url required",
      });
      return;
    }

    // 1. Check Persistent Disk / In-Memory Cache (Instant <10ms return for existing repos!)
    const cachedAnalysis = getCachedAnalysis(repoUrl);
    const cachedMemory = getRepoMemory(repoUrl);

    if (cachedAnalysis && cachedMemory) {
      console.log(`[Cache Hit] Returning cached AST graph and memory for: ${repoUrl}`);
      res.json({
        success: true,
        repoId: repoUrl,
        graph: cachedAnalysis.graph,
        memory: cachedMemory,
      });
      return;
    }

    // 2. Concurrency Queue & Request Coalescer (Pillars #1 & #2)
    // Prevents duplicate clones and caps concurrent AST heavy workers to protect RAM/CPU
    const { graph, memory } = await jobPool.executeOrCoalesce(repoUrl, async () => {
      console.log(`[Worker] Cloning Repository: ${repoUrl} ...`);
      const clonedRepo = await cloneRepository(repoUrl);
      const repoId = repoUrl;
      saveRepository(repoId, clonedRepo.repoPath);

      console.log(`[Worker] Running AST Parser for ${repoId} ...`);
      const graph = await runParser(clonedRepo.repoPath);
      console.log(`[Worker] AST Graph generated.`);

      // Persist graph to disk + cache immediately
      saveAnalysis(repoId, clonedRepo.repoPath, graph);

      console.log(`[Worker] Building Repository Memory summaries...`);
      const memory = await buildRepoMemory(repoId, graph);
      console.log(`[Worker] Repository Memory generated successfully.`);

      // Trigger non-blocking LRU disk cleanup
      cleanupOldRepositories(24);

      return { graph, memory };
    });

    res.json({
      success: true,
      repoId: repoUrl,
      graph,
      memory,
    });
  } catch (error) {
    console.error("AnalyzeRepo error:", error);
    res.status(500).json({
      error: "failed to analyze repository",
    });
  }
}

export function getQueueStatus(req: Request, res: Response): void {
  res.json({
    success: true,
    status: jobPool.getStatus(),
  });
}


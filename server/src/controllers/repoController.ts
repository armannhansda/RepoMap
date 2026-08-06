import { type Request, type Response } from "express";
import { cloneRepository, getRemoteHeadCommit } from "../services/repoclone.ts";
import { runParser } from "../services/runParser.ts";
import { saveRepository, saveAnalysis, getCachedAnalysis } from "../store/repoRegistry.ts";
import { buildRepoMemory } from "../services/memoryBuilder.ts";
import { getRepoMemory } from "../store/memoryStore.ts";
import { jobPool } from "../services/jobQueue.ts";
import { cleanupOldRepositories } from "../services/tempCleanup.ts";
import { captureServerEvent } from "../services/posthogService.ts";
import { jobProgressManager } from "../services/jobProgress.ts";

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
      // Freshness check: ask the remote for its current HEAD commit —
      // a cheap ls-remote call, not a clone — and compare against the
      // commit our cached analysis was actually built from. This keeps
      // the fast cache-hit path fast (one small network call added,
      // not a full re-clone) while fixing #22: previously the cache was
      // served unconditionally, so new commits to an already-analyzed
      // repo were never reflected.
      //
      // If the freshness check itself fails (network hiccup, etc.),
      // getRemoteHeadCommit returns null and we deliberately fall back
      // to serving the existing cache rather than failing the whole
      // request over a check that's meant to be a nice-to-have.
      const remoteHead = await getRemoteHeadCommit(repoUrl);
      const isStale = remoteHead !== null && remoteHead !== cachedAnalysis.commitHash;

      if (!isStale) {
        console.log(`[Cache Hit] Returning cached AST graph and memory for: ${repoUrl}`);
        captureServerEvent("server_user", "analyze_repo_cache_hit", { repoUrl });
        jobProgressManager.setProgress(repoUrl, 4, "completed");
        res.json({
          success: true,
          repoId: repoUrl,
          graph: cachedAnalysis.graph,
          memory: cachedMemory,
          commitHash: cachedAnalysis.commitHash,
        });
        return;
      }

      console.log(
        `[Cache Stale] ${repoUrl} has new commits (cached: ${cachedAnalysis.commitHash}, remote: ${remoteHead}) — re-analyzing.`
      );
      captureServerEvent("server_user", "analyze_repo_cache_stale", {
        repoUrl,
        cachedCommit: cachedAnalysis.commitHash,
        remoteCommit: remoteHead,
      });
      // Deliberately fall through to the full clone + parse pipeline
      // below, same as a first-time analysis.
    }

    captureServerEvent("server_user", "analyze_repo_started", { repoUrl });
    jobProgressManager.setProgress(repoUrl, 0, "queued");

    // 2. Concurrency Queue & Request Coalescer (Pillars #1 & #2)
    // Prevents duplicate clones and caps concurrent AST heavy workers to protect RAM/CPU
    const { graph, memory, commitHash } = await jobPool.executeOrCoalesce(repoUrl, async () => {
      jobProgressManager.setProgress(repoUrl, 1, "in_progress");
      console.log(`[Worker] Cloning Repository: ${repoUrl} ...`);
      const clonedRepo = await cloneRepository(repoUrl);
      const repoId = repoUrl;
      saveRepository(repoId, clonedRepo.repoPath);

      jobProgressManager.setProgress(repoUrl, 2, "in_progress");
      console.log(`[Worker] Running AST Parser for ${repoId} ...`);
      const graph = await runParser(clonedRepo.repoPath);
      console.log(`[Worker] AST Graph generated.`);

      // Persist graph to disk + cache immediately, tagged with the
      // commit it was actually built from so future requests can
      // detect when the remote has moved ahead.
      saveAnalysis(repoId, clonedRepo.repoPath, graph, clonedRepo.commitHash);

      jobProgressManager.setProgress(repoUrl, 3, "in_progress");
      console.log(`[Worker] Building Repository Memory summaries...`);
      const memory = await buildRepoMemory(repoId, graph);
      console.log(`[Worker] Repository Memory generated successfully.`);

      jobProgressManager.setProgress(repoUrl, 4, "in_progress");
      // Trigger non-blocking LRU disk cleanup
      cleanupOldRepositories(24);

      return { graph, memory, commitHash: clonedRepo.commitHash };
    });

    jobProgressManager.setProgress(repoUrl, 4, "completed");
    jobProgressManager.clearProgress(repoUrl);

    captureServerEvent("server_user", "analyze_repo_completed", {
      repoUrl,
      nodesCount: graph.nodes?.length ?? 0,
      edgesCount: graph.edges?.length ?? 0,
    });

    res.json({
      success: true,
      repoId: repoUrl,
      graph,
      memory,
      commitHash,
    });
  } catch (error) {
    console.error("AnalyzeRepo error:", error);
    jobProgressManager.setProgress(req.body?.repoUrl || "unknown", 0, "failed", error instanceof Error ? error.message : String(error));
    jobProgressManager.clearProgress(req.body?.repoUrl || "unknown");
    captureServerEvent("server_user", "analyze_repo_failed", {
      repoUrl: req.body?.repoUrl || "unknown",
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({
      error: error instanceof Error ? error.message : "failed to analyze repository",
    });
  }
}

export function getQueueStatus(req: Request, res: Response): void {
  res.json({
    success: true,
    status: jobPool.getStatus(),
  });
}

export function getRepoProgress(req: Request, res: Response): void {
  const repoUrl = req.query.repoUrl as string;
  if (!repoUrl) {
    res.status(400).json({ success: false, error: "repoUrl parameter required" });
    return;
  }
  const progress = jobProgressManager.getProgress(repoUrl);
  if (!progress) {
    res.json({
      success: true,
      progress: {
        repoUrl,
        status: "not_found",
        stepIdx: 0,
        stepDescription: "Initializing workspace...",
        nextStepDescription: "Cloning repository...",
        totalSteps: 5,
        startTime: Date.now(),
        elapsedTimeMs: 0,
        estimatedTotalDurationMs: 32000,
      },
    });
    return;
  }
  res.json({ success: true, progress });
}
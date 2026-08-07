import fs from "fs";
import path from "path";
import crypto from "crypto";

export interface CachedAnalysis {
  repoId: string;
  repoPath: string;
  graph: any;
  timestamp: number;
  commitHash: string;
}

const repositories = new Map<string, string>();
const analysisCache = new Map<string, CachedAnalysis>();

function getDiskGraphPath(repoId: string): string {
  const hash = crypto.createHash("md5").update(repoId).digest("hex");
  const graphsDir = path.join(process.cwd(), "temp", "graphs");
  if (!fs.existsSync(graphsDir)) {
    fs.mkdirSync(graphsDir, { recursive: true });
  }
  return path.join(graphsDir, `${hash}.json`);
}

export function saveRepository(repoId: string, repoPath: string) {
  repositories.set(repoId, repoPath);
}

export function getRepository(repoId: string) {
  return repositories.get(repoId);
}

export function saveAnalysis(
  repoId: string,
  repoPath: string,
  graph: any,
  commitHash: string
): CachedAnalysis {
  const cached: CachedAnalysis = {
    repoId,
    repoPath,
    graph,
    timestamp: Date.now(),
    commitHash,
  };
  analysisCache.set(repoId, cached);
  repositories.set(repoId, repoPath);

  try {
    const diskPath = getDiskGraphPath(repoId);
    fs.writeFileSync(diskPath, JSON.stringify(cached), "utf-8");
  } catch (err) {
    console.warn(`Failed to persist analysis to disk for ${repoId}:`, err);
  }

  return cached;
}

export function getCachedAnalysis(repoId: string): CachedAnalysis | undefined {
  if (analysisCache.has(repoId)) {
    return analysisCache.get(repoId);
  }

  try {
    const diskPath = getDiskGraphPath(repoId);
    if (fs.existsSync(diskPath)) {
      const data = fs.readFileSync(diskPath, "utf-8");
      const cached: CachedAnalysis = JSON.parse(data);
      // Backfill commitHash for entries written before this field
      // existed, so older cache files don't crash comparisons — treat
      // them as unknown/stale rather than assuming freshness.
      if (!cached.commitHash) {
        cached.commitHash = "";
      }
      analysisCache.set(repoId, cached);
      repositories.set(repoId, cached.repoPath);
      return cached;
    }
  } catch (err) {
    console.warn(`Failed to read analysis from disk for ${repoId}:`, err);
  }

  return undefined;
}
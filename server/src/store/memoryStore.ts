import fs from "fs";
import path from "path";
import crypto from "crypto";

export interface RepoMemory {
  repoId: string;
  techStackOverview: string;
  systemArchitecture: string;
  codingConventions: string[];
  domainConcepts: Record<string, string>;
  folderSummaries: Record<string, string>; // folder path -> summary
  apiDocumentation: Array<{ route: string; method: string; handler: string; summary: string }>;
  updatedAt: number;
}

const memoryMap = new Map<string, RepoMemory>();

function getDiskPath(repoId: string): string {
  const hash = crypto.createHash("md5").update(repoId).digest("hex");
  const memoryDir = path.join(process.cwd(), "temp", "memory");
  if (!fs.existsSync(memoryDir)) {
    fs.mkdirSync(memoryDir, { recursive: true });
  }
  return path.join(memoryDir, `${hash}.json`);
}

export function saveRepoMemory(repoId: string, memory: RepoMemory): void {
  memoryMap.set(repoId, memory);
  try {
    const diskPath = getDiskPath(repoId);
    fs.writeFileSync(diskPath, JSON.stringify(memory, null, 2), "utf-8");
  } catch (err) {
    console.warn(`Failed to persist memory to disk for ${repoId}:`, err);
  }
}

export function getRepoMemory(repoId: string): RepoMemory | undefined {
  if (memoryMap.has(repoId)) {
    return memoryMap.get(repoId);
  }
  // Try loading from disk
  try {
    const diskPath = getDiskPath(repoId);
    if (fs.existsSync(diskPath)) {
      const data = fs.readFileSync(diskPath, "utf-8");
      const memory: RepoMemory = JSON.parse(data);
      memoryMap.set(repoId, memory);
      return memory;
    }
  } catch (err) {
    console.warn(`Failed to read memory from disk for ${repoId}:`, err);
  }
  return undefined;
}

export function deleteRepoMemory(repoId: string): void {
  memoryMap.delete(repoId);
  try {
    const diskPath = getDiskPath(repoId);
    if (fs.existsSync(diskPath)) {
      fs.unlinkSync(diskPath);
    }
  } catch (err) {
    console.warn(`Failed to delete disk memory for ${repoId}:`, err);
  }
}

import fs from "fs";
import path from "path";

/**
 * Automatically cleans up cloned repository folders in `server/temp/` that are older than maxAgeHours,
 * while preserving `graphs` and `memory` persistent caches.
 */
export function cleanupOldRepositories(maxAgeHours: number = 24): void {
  try {
    const tempDir = path.join(process.cwd(), "temp");
    if (!fs.existsSync(tempDir)) return;

    const entries = fs.readdirSync(tempDir, { withFileTypes: true });
    const now = Date.now();
    const maxAgeMs = maxAgeHours * 60 * 60 * 1000;

    for (const entry of entries) {
      // Preserve persistent cache directories
      if (entry.name === "graphs" || entry.name === "memory") continue;

      const fullPath = path.join(tempDir, entry.name);
      try {
        const stat = fs.statSync(fullPath);
        if (now - stat.mtimeMs > maxAgeMs) {
          console.log(`[TempCleanup] Removing old cloned folder: ${entry.name}`);
          fs.rmSync(fullPath, { recursive: true, force: true });
        }
      } catch (err) {
        console.warn(`[TempCleanup] Could not inspect/delete ${entry.name}:`, err);
      }
    }
  } catch (err) {
    console.error("[TempCleanup] Error during temp directory cleanup:", err);
  }
}

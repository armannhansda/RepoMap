import { glob } from "glob";
import { readFile } from "node:fs/promises";
import path from "node:path";

export interface ScannedFile {
  absolutePath: string;
  relativePath: string;
  content?: string;
}

export async function scannerRepository(
  repoPath: string,
  cachedFiles?: ScannedFile[]
): Promise<ScannedFile[]> {
  if (cachedFiles) {
    return cachedFiles;
  }

  const matches = await glob(
    "**/*.{ts,tsx,js,jsx,py,go,java,cpp,c,h,hpp,rs,rb,php,cs,swift,kt}",
    {
      cwd: repoPath,
      absolute: true,
      nodir: true,
      ignore: [
        "node_modules/**",
        "**/node_modules/**",
        "dist/**",
        "**/dist/**",
        "build/**",
        "**/build/**",
        "temp/**",
        "**/temp/**",
        ".git/**",
        "**/.git/**",
        ".next/**",
        "**/.next/**",
        "coverage/**",
        "**/coverage/**",
        "vendor/**",
        "**/vendor/**",
        "**/*.min.js",
        "**/*.bundle.js",
      ],
    }
  );

  return matches.map((file) => ({
    absolutePath: file,
    relativePath: path.relative(repoPath, file),
  }));
}

export async function scanAndCacheRepository(
  repoPath: string
): Promise<ScannedFile[]> {
  const files = await scannerRepository(repoPath);

  // Read files concurrently into memory cache
  const cached: ScannedFile[] = await Promise.all(
    files.map(async (file) => {
      try {
        const content = await readFile(file.absolutePath, "utf-8");
        return {
          ...file,
          content,
        };
      } catch {
        return {
          ...file,
          content: "",
        };
      }
    })
  );

  return cached;
}

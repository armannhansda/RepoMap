import { glob } from "glob";
import { stat } from "node:fs/promises";
import path from "node:path";


export async function scannerRepository(repoPath:string) {

  const matches = await glob (
    "**/*.{ts,tsx,js,jsx}",
    {
      cwd:repoPath,
      absolute:true,
      nodir:true,
      ignore:[
        "node_modules/**",
        "**/node_modules/**",
        "dist/**",
        "**/dist/**",
        "build/**",
        "**/build/**"
      ],
    }
  );

  const files: string[] = [];

  for (const match of matches) {
    if ((await stat(match)).isFile()) {
      files.push(match);
    }
  }

  return files.map((file)=>({
    absolutePath: file,
    relativePath: path.relative(
      repoPath,
      file
    )
  }));
  
}

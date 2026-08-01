import { simpleGit } from "simple-git";
import fs from "fs";
import path from "path";

const CLONE_TIMEOUT_MS = 60_000; // safety net only — real fix is GIT_TERMINAL_PROMPT below

const git = simpleGit({
  timeout: {
    block: CLONE_TIMEOUT_MS,
  },
});

export async function cloneRepository(repoUrl: string) {
  try {
    const repoName = repoUrl
      .split("/")
      .pop()
      ?.replace(".git", "");

    if (!repoName) {
      throw new Error("invalid repository");
    }

    const repoPath = path.join(
      process.cwd(),
      "temp",
      repoName + "-" + Date.now()
    );

    fs.mkdirSync(path.dirname(repoPath), {
      recursive: true,
    });

    console.log("cloning into ", repoPath);
    await git
      .env("GIT_TERMINAL_PROMPT", "0" )
      .clone(repoUrl, repoPath, ["--depth", "1", "--single-branch", "--progress"]);
    console.log("cloning complete");
    return {
      repoName,
      repoPath,
    };
  } catch (error) {
    console.error(error);
    throw new Error(
      "Could not clone repository. It may be private, deleted, or the URL may be incorrect."
    );
  }
}
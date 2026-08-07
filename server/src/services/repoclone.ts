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
      .env("GIT_TERMINAL_PROMPT", "0")
      .clone(repoUrl, repoPath, ["--depth", "1", "--single-branch", "--progress"]);
    console.log("cloning complete");

    // Capture the exact commit we just cloned, so callers can cache
    // analysis results keyed to this specific commit and detect later
    // when the remote has moved ahead (see getRemoteHeadCommit below).
    const commitHash = await simpleGit(repoPath).revparse(["HEAD"]);

    return {
      repoName,
      repoPath,
      commitHash: commitHash.trim(),
    };
  } catch (error) {
    console.error(error);
    throw new Error(
      "Could not clone repository. It may be private, deleted, or the URL may be incorrect."
    );
  }
}

// Cheaply asks the remote for its current HEAD commit hash, WITHOUT
// cloning anything. Used to check whether a cached analysis is still
// fresh before deciding whether to pay the cost of a full clone + parse.
// This keeps the fast cache-hit path fast: a ls-remote round trip is a
// small network call, not a repository download.
export async function getRemoteHeadCommit(repoUrl: string): Promise<string | null> {
  try {
    const result = await git
      .env("GIT_TERMINAL_PROMPT", "0")
      .listRemote([repoUrl, "HEAD"]);
    // Output looks like: "<hash>\tHEAD\n"
    const hash = result.split(/\s+/)[0]?.trim();
    return hash && hash.length > 0 ? hash : null;
  } catch (error) {
    // If the freshness check itself fails (network hiccup, private
    // repo without prompt, etc.), we deliberately return null rather
    // than throwing — callers should treat this as "couldn't verify,
    // fall back to existing cache" rather than breaking the whole
    // analysis flow over a check that's meant to be a nice-to-have.
    console.warn(`Could not check remote HEAD for ${repoUrl}:`, error);
    return null;
  }
}
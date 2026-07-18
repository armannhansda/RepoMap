export interface JobProgress {
  repoUrl: string;
  status: "queued" | "in_progress" | "completed" | "failed";
  stepIdx: number;
  stepDescription: string;
  nextStepDescription: string | null;
  totalSteps: number;
  startTime: number;
  elapsedTimeMs: number;
  estimatedTotalDurationMs: number;
  error?: string | undefined;
}

export const ANALYZE_STEPS = [
  {
    description: "Initializing workspace...",
    nextDescription: "Cloning repository...",
    estimatedDurationMs: 2000,
  },
  {
    description: "Cloning repository...",
    nextDescription: "Parsing code & ASTs...",
    estimatedDurationMs: 8000,
  },
  {
    description: "Parsing code & ASTs...",
    nextDescription: "Generating AI memory...",
    estimatedDurationMs: 14000,
  },
  {
    description: "Generating AI memory...",
    nextDescription: "Building graph layout...",
    estimatedDurationMs: 8000,
  },
  {
    description: "Building graph layout...",
    nextDescription: null,
    estimatedDurationMs: 2000,
  },
];

class JobProgressManager {
  private progressMap = new Map<string, JobProgress>();

  public setProgress(
    repoUrl: string,
    stepIdx: number,
    status: "queued" | "in_progress" | "completed" | "failed" = "in_progress",
    error?: string
  ): JobProgress {
    const existing = this.progressMap.get(repoUrl);
    const startTime = existing?.startTime ?? Date.now();
    const safeStepIdx = Math.min(Math.max(0, stepIdx), ANALYZE_STEPS.length - 1);
    const stepInfo = ANALYZE_STEPS[safeStepIdx] || ANALYZE_STEPS[0];
    const totalSteps = ANALYZE_STEPS.length;

    const estimatedTotalDurationMs = ANALYZE_STEPS.reduce(
      (sum, s) => sum + s.estimatedDurationMs,
      0
    );

    const progress: JobProgress = {
      repoUrl,
      status,
      stepIdx: safeStepIdx,
      stepDescription: stepInfo?.description || "Processing repository...",
      nextStepDescription: status === "completed" ? null : (stepInfo?.nextDescription ?? null),
      totalSteps,
      startTime,
      elapsedTimeMs: Date.now() - startTime,
      estimatedTotalDurationMs,
      ...(error !== undefined ? { error } : {}),
    };

    this.progressMap.set(repoUrl, progress);
    return progress;
  }

  public getProgress(repoUrl: string): JobProgress | null {
    const existing = this.progressMap.get(repoUrl);
    if (!existing) return null;

    const elapsedTimeMs = Date.now() - existing.startTime;
    return {
      ...existing,
      elapsedTimeMs,
    };
  }

  public clearProgress(repoUrl: string): void {
    setTimeout(() => {
      this.progressMap.delete(repoUrl);
    }, 60000);
  }
}

export const jobProgressManager = new JobProgressManager();

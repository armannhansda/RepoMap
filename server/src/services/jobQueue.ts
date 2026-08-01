import os from "os";

// Limit concurrent analysis jobs based on CPU cores (max 3 simultaneous heavy AST jobs)
const MAX_CONCURRENT_JOBS = Math.max(1, Math.min(os.cpus().length - 1, 3));

interface QueuedJob {
  id: string;
  repoId: string;
  task: () => Promise<any>;
  resolve: (value: any) => void;
  reject: (reason?: any) => void;
}

class AnalysisJobPool {
  private activeCount = 0;
  private queue: QueuedJob[] = [];
  private inFlightJobs = new Map<string, Promise<any>>();

  public executeOrCoalesce(repoId: string, task: () => Promise<any>): Promise<any> {
    // 1. Request Coalescing: If an identical analysis for repoId is currently running or queued, attach to it!
    if (this.inFlightJobs.has(repoId)) {
      console.log(`[JobQueue] Coalescing request for in-flight analysis of ${repoId}`);
      return this.inFlightJobs.get(repoId)!;
    }

    // 2. Otherwise create a new queued promise
    const promise = new Promise<any>((resolve, reject) => {
      const job: QueuedJob = {
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        repoId,
        task,
        resolve,
        reject,
      };

      this.queue.push(job);
      this.processQueue();
    });

    this.inFlightJobs.set(repoId, promise);

    // Clean up in-flight map when completed or failed.
    // NOTE: `.finally()` creates a *new* derived promise that also
    // rejects if `promise` rejects. Nothing else attaches a handler
    // to that derived promise, so without the `.catch()` below, a
    // fast-failing task (e.g. a private repo clone) causes an
    // unhandled promise rejection that crashes the whole Node process
    // on newer Node versions. The `.catch()` here simply swallows that
    // derived rejection — the *original* `promise` (returned above and
    // awaited by the caller) is still rejected and handled normally.
    promise
      .finally(() => {
        this.inFlightJobs.delete(repoId);
      })
      .catch(() => {
        // Intentionally empty — see note above.
      });

    return promise;
  }

  private processQueue() {
    if (this.activeCount >= MAX_CONCURRENT_JOBS || this.queue.length === 0) {
      return;
    }

    const job = this.queue.shift();
    if (!job) return;

    this.activeCount++;
    console.log(`[JobQueue] Starting job ${job.id} for ${job.repoId}. Active jobs: ${this.activeCount}/${MAX_CONCURRENT_JOBS}. Queued: ${this.queue.length}`);

    job.task()
      .then((result) => {
        job.resolve(result);
      })
      .catch((err) => {
        job.reject(err);
      })
      .finally(() => {
        this.activeCount--;
        console.log(`[JobQueue] Finished job ${job.id} for ${job.repoId}. Remaining active: ${this.activeCount}/${MAX_CONCURRENT_JOBS}`);
        this.processQueue();
      });
  }

  public getStatus() {
    return {
      activeJobs: this.activeCount,
      maxConcurrent: MAX_CONCURRENT_JOBS,
      queuedJobs: this.queue.length,
      inFlightRepos: Array.from(this.inFlightJobs.keys()),
    };
  }
}

export const jobPool = new AnalysisJobPool();
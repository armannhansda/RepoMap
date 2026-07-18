import { Router } from "express";
import { analyzeRepo, getQueueStatus, getRepoProgress } from "../controllers/repoController.ts";

const router = Router();

router.post("/analyze", analyzeRepo);
router.get("/status/queue", getQueueStatus);
router.get("/progress", getRepoProgress);

export default router;

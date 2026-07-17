import { Router } from "express";
import { analyzeRepo, getQueueStatus } from "../controllers/repoController.ts";

const router = Router();

router.post("/analyze", analyzeRepo);
router.get("/status/queue", getQueueStatus);

export default router;

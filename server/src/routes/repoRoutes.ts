import { Router } from "express";
import { analyzeRepo } from "../controllers/repoController.ts";

const router = Router();

router.post("/analyze", analyzeRepo);



export default router;

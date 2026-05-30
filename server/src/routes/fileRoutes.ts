import { Router } from "express";
import { getFileContent } from "../controllers/fileController.ts";

const router = Router()

router.get("/file", getFileContent)

export default router
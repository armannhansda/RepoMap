import { Router } from 'express';
import { explainNode } from '../controllers/aiController.ts';

const router = Router();

router.post('/explain', explainNode);

export default router;

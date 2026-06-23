import { Router } from 'express';
import { explainNode, explainRepo } from '../controllers/aiController.ts';

const router = Router();

router.post('/explain', explainNode);
router.post('/explain-repo', explainRepo);

export default router;

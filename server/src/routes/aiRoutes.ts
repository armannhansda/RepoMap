import { Router } from 'express';
import { explainNode, explainRepo, generateDiagram } from '../controllers/aiController.ts';

const router = Router();

router.post('/explain', explainNode);
router.post('/explain-repo', explainRepo);
router.post('/generate-diagram', generateDiagram);

export default router;

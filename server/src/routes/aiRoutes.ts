import { Router } from 'express';
import { explainNode, explainRepo, generateDiagram, getMemoryController, buildMemoryController, impactAnalysisController, planTaskController, queryArchitectureController, handleCodeReview, handleHealthScore, handleOrchestrate, generateFlowScenarioController, listPresetFlowsController } from '../controllers/aiController.ts';

const router = Router();

router.post('/explain', explainNode);
router.post('/explain-repo', explainRepo);
router.post('/generate-diagram', generateDiagram);
router.get('/memory', getMemoryController);
router.post('/build-memory', buildMemoryController);
router.post('/impact-analysis', impactAnalysisController);
router.post('/plan-task', planTaskController);
router.post('/query-architecture', queryArchitectureController);
router.post('/code-review', handleCodeReview);
router.post('/health-score', handleHealthScore);
router.post('/orchestrate', handleOrchestrate);
router.post('/generate-flow', generateFlowScenarioController);
router.post('/preset-flows', listPresetFlowsController);

export default router;

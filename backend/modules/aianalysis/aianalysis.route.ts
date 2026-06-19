import { Router } from "express";

import { getAIAnalysis } from "./aianalysis.controller";

const router = Router();

router.get("/", getAIAnalysis);

export default router;

import { Router } from "express";

import { getOverview } from "./overview.controller";

const router = Router();

router.get("/", getOverview);

export default router;

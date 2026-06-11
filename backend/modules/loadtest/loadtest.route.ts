import { Router } from "express";
import {
  createLoadTest,
  getLoadTest,
  getLoadTestLogText,
  listLoadTests,
  stopLoadTest,
} from "./loadtest.controller";

const router = Router();

router.get("/", listLoadTests);
router.get("/:id/log", getLoadTestLogText);
router.get("/:id", getLoadTest);
router.post("/:id/stop", stopLoadTest);
router.post("/", createLoadTest);

export default router;

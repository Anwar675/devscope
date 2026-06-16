import { Router } from "express";
import {
  createLoadTest,
  deleteLoadTest,
  getLoadTest,
  getLoadTestLogText,
  healthLoadTest,
  listLoadTests,
  stopLoadTest,
} from "./loadtest.controller";

const router = Router();

router.get("/health", healthLoadTest);
router.get("/", listLoadTests);
router.get("/:id/log", getLoadTestLogText);
router.get("/:id", getLoadTest);
router.delete("/:id", deleteLoadTest);
router.post("/:id/stop", stopLoadTest);
router.post("/", createLoadTest);

export default router;

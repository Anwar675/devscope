import express from "express";
import loadTestRouter from "./modules/loadtest/loadtest.route";
import metricsRouter from "./modules/metrics/metrics.route";
import morgan from "morgan";


export const app = express();
app.use(morgan("dev"));
app.use(express.json());

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", process.env.FRONTEND_URL ?? "http://localhost:3000");
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");

  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }

  next();
});

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/loadtest", loadTestRouter);
app.use("/metrics", metricsRouter);

export default app;

import type { IncomingMessage, Server } from "node:http";
import type { Duplex } from "node:stream";
import { and, eq } from "drizzle-orm";
import { WebSocket, WebSocketServer } from "ws";

import { db } from "../../db";
import { loadTestRun } from "../../db/schema";
import { auth } from "../../../src/lib/auth";

export type LoadTestProgressEvent = {
  type: "loadtest:progress";
  id: string;
  progress: number;
  currentUsers: number;
  status: "running" | "completed" | "failed" | "stopped";
  latency?: string;
  duration?: number;
  errors?: number;
  errorMessage?: string | null;
};

type LoadTestSocketClient = {
  runId: string;
  socket: WebSocket;
};

const clientsByRunId = new Map<string, Set<LoadTestSocketClient>>();

export function registerLoadTestProgressSocket(server: Server) {
  const websocketServer = new WebSocketServer({ noServer: true });

  server.on("upgrade", async (request, socket, head) => {
    if (!isLoadTestProgressRequest(request)) {
      return;
    }

    const runId = getRunId(request);

    if (!runId || !request.headers["sec-websocket-key"]) {
      rejectSocket(socket, 400, "Bad Request");
      return;
    }

    try {
      const userId = await getAuthenticatedUserId(request);

      if (!userId) {
        rejectSocket(socket, 401, "Unauthorized");
        return;
      }

      const canAccessRun = await canUserAccessLoadTestRun(userId, runId);

      if (!canAccessRun) {
        rejectSocket(socket, 403, "Forbidden");
        return;
      }

      websocketServer.handleUpgrade(request, socket, head, (websocket) => {
        addClient(runId, websocket);
      });
    } catch (error) {
      console.error("Could not authenticate load test websocket", error);
      rejectSocket(socket, 500, "Internal Server Error");
    }
  });
}

export function publishLoadTestProgress(event: LoadTestProgressEvent) {
  const clients = clientsByRunId.get(event.id);

  if (!clients) {
    return;
  }

  const payload = JSON.stringify(event);

  for (const client of clients) {
    if (client.socket.readyState !== WebSocket.OPEN) {
      removeClient(client);
      continue;
    }

    client.socket.send(payload);
  }
}

function isLoadTestProgressRequest(request: IncomingMessage) {
  const url = new URL(request.url ?? "", "http://localhost");
  return url.pathname === "/loadtest/events";
}

function getRunId(request: IncomingMessage) {
  const url = new URL(request.url ?? "", "http://localhost");
  return url.searchParams.get("id")?.trim() ?? "";
}

async function getAuthenticatedUserId(request: IncomingMessage) {
  const session = await auth.api.getSession({
    headers: createRequestHeaders(request),
    query: {
      disableCookieCache: true,
    },
  });

  return session?.user.id ?? null;
}

function createRequestHeaders(request: IncomingMessage) {
  const headers = new Headers();

  for (const [key, value] of Object.entries(request.headers)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        headers.append(key, item);
      }
      continue;
    }

    if (typeof value === "string") {
      headers.set(key, value);
    }
  }

  return headers;
}

async function canUserAccessLoadTestRun(userId: string, runId: string) {
  const [record] = await db
    .select({ id: loadTestRun.id })
    .from(loadTestRun)
    .where(and(eq(loadTestRun.id, runId), eq(loadTestRun.userId, userId)))
    .limit(1);

  return Boolean(record);
}

function rejectSocket(socket: Duplex, status: number, statusText: string) {
  socket.write(`HTTP/1.1 ${status} ${statusText}\r\n\r\n`);
  socket.destroy();
}

function addClient(runId: string, socket: WebSocket) {
  const client = {
    runId,
    socket,
  };
  const clients = clientsByRunId.get(runId) ?? new Set<LoadTestSocketClient>();

  clients.add(client);
  clientsByRunId.set(runId, clients);

  socket.on("close", () => removeClient(client));
  socket.on("error", () => removeClient(client));
}

function removeClient(client: LoadTestSocketClient) {
  const clients = clientsByRunId.get(client.runId);

  if (!clients) {
    return;
  }

  clients.delete(client);

  if (clients.size === 0) {
    clientsByRunId.delete(client.runId);
  }
}

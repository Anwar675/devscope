const BACKEND_URL =
  process.env.BACKEND_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:3001";

export async function proxyLoadTestRequest(
  request: Request,
  pathname: string,
) {
  const headers = new Headers();
  const cookie = request.headers.get("cookie");
  const contentType = request.headers.get("content-type");
  const authorization = request.headers.get("authorization");

  if (cookie) {
    headers.set("cookie", cookie);
  }

  if (contentType) {
    headers.set("content-type", contentType);
  }

  if (authorization) {
    headers.set("authorization", authorization);
  }

  let response: Response;

  try {
    response = await fetch(`${BACKEND_URL}${pathname}`, {
      method: request.method,
      headers,
      body: ["GET", "HEAD"].includes(request.method)
        ? undefined
        : await request.text(),
      cache: "no-store",
    });
  } catch {
    return Response.json(
      {
        success: false,
        message: "Could not connect to load test backend",
      },
      {
        status: 502,
        headers: {
          "cache-control": "no-store",
        },
      },
    );
  }

  return new Response(await response.text(), {
    status: response.status,
    headers: {
      "content-type":
        response.headers.get("content-type") ?? "application/json",
      "cache-control": "no-store",
    },
  });
}

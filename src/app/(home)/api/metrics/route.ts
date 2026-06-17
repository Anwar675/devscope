const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export async function GET(request: Request) {
  const headers = new Headers();
  const cookie = request.headers.get("cookie");
  const authorization = request.headers.get("authorization");
  const url = new URL(request.url);

  if (cookie) {
    headers.set("cookie", cookie);
  }

  if (authorization) {
    headers.set("authorization", authorization);
  }

  let response: Response;

  try {
    response = await fetch(`${BACKEND_URL}/metrics${url.search}`, {
      method: "GET",
      headers,
      cache: "no-store",
    });
  } catch {
    return Response.json(
      {
        success: false,
        message: "Could not connect to metrics backend",
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
      "content-type": response.headers.get("content-type") ?? "application/json",
      "cache-control": "no-store",
    },
  });
}

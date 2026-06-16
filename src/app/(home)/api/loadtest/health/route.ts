import { proxyLoadTestRequest } from "../_proxy";

export async function GET(request: Request) {
  const url = new URL(request.url);

  return proxyLoadTestRequest(
    request,
    `/loadtest/health${url.search}`,
  );
}

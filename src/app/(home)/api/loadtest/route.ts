import { proxyLoadTestRequest } from "./_proxy";

export async function GET(request: Request) {
  return proxyLoadTestRequest(request, "/loadtest");
}

export async function POST(request: Request) {
  return proxyLoadTestRequest(request, "/loadtest");
}

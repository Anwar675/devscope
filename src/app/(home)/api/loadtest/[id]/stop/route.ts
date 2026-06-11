import { proxyLoadTestRequest } from "../../_proxy";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  return proxyLoadTestRequest(
    request,
    `/loadtest/${encodeURIComponent(id)}/stop`,
  );
}

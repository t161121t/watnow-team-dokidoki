const allowedMethods = "GET";

export function handleEdgeSmokeRequest(request: Request): Response {
  if (request.method !== allowedMethods) {
    return Response.json(
      { error: "method_not_allowed" },
      {
        status: 405,
        headers: { Allow: allowedMethods },
      },
    );
  }

  return Response.json({ status: "ok" });
}

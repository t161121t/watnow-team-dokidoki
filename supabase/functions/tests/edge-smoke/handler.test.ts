import assert from "node:assert/strict";
import { handleEdgeSmokeRequest } from "../../edge-smoke/handler.ts";

Deno.test("edge-smoke returns a deterministic health response", async () => {
  const response = handleEdgeSmokeRequest(new Request("http://localhost", { method: "GET" }));

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: "ok" });
});

Deno.test("edge-smoke rejects unsupported methods", async () => {
  const response = handleEdgeSmokeRequest(new Request("http://localhost", { method: "POST" }));

  assert.equal(response.status, 405);
  assert.equal(response.headers.get("Allow"), "GET");
  assert.deepEqual(await response.json(), { error: "method_not_allowed" });
});

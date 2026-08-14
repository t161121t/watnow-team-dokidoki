import assert from "node:assert/strict";
import { createEdgeSmokeFetch } from "../../edge-smoke/index.ts";

Deno.test("edge-smoke rejects unauthenticated requests before the handler", async () => {
  const fetch = createEdgeSmokeFetch({
    cors: "disabled",
    env: {
      url: "http://localhost:54321",
      publishableKeys: {},
      secretKeys: {},
      jwks: { keys: [] },
    },
  });

  const response = await fetch(new Request("http://localhost"));

  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), {
    message: "Invalid credentials",
    code: "INVALID_CREDENTIALS",
  });
});

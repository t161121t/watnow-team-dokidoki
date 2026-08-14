import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";
import { handleEdgeSmokeRequest } from "./handler.ts";

const handleAuthenticatedRequest = (request: Request) =>
  Promise.resolve(handleEdgeSmokeRequest(request));

type EdgeSmokeOptions = Omit<Parameters<typeof withSupabase>[0], "auth" | "allow">;

export function createEdgeSmokeFetch(options: EdgeSmokeOptions = {}) {
  return withSupabase({ ...options, auth: "user" }, handleAuthenticatedRequest);
}

export default {
  fetch: createEdgeSmokeFetch(),
};

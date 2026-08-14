import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";
import { handleEdgeSmokeRequest } from "./handler.ts";

const handleAuthenticatedRequest = (request: Request) =>
  Promise.resolve(handleEdgeSmokeRequest(request));

export default {
  fetch: withSupabase({ auth: "user" }, handleAuthenticatedRequest),
};

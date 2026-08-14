import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getClientEnv } from "@/lib/env";
import type { Database } from "@/types/database.generated";

let client: SupabaseClient<Database> | undefined;

export function getSupabaseClient() {
  if (client) {
    return client;
  }

  const env = getClientEnv();
  client = createClient<Database>(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY);
  return client;
}

import { z } from "zod";

const clientEnvSchema = z.object({
  VITE_SUPABASE_URL: z.string().url(),
  VITE_SUPABASE_ANON_KEY: z.string().min(1),
});

export function getClientEnv() {
  return clientEnvSchema.parse(import.meta.env);
}

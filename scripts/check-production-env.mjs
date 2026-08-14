import { loadEnv } from "vite";
import { getProductionEnvErrors } from "./production-env.mjs";

const env = loadEnv("production", process.cwd(), "VITE_");
const errors = getProductionEnvErrors(env, { requireValues: true });

if (errors.length > 0) {
  console.error("Cloudflare deployment refused because the production environment is unsafe:");
  for (const error of errors) {
    console.error(`[error] ${error}`);
  }
  process.exitCode = 1;
} else {
  console.log("[ok] Production Supabase environment is configured");
}

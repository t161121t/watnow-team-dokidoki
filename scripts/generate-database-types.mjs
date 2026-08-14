import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { createSupabaseEnvironment } from "./supabase-command.mjs";
import { createSupabaseTypeCommand } from "./supabase-type-command.mjs";

const { command, args } = createSupabaseTypeCommand();
const result = spawnSync(command, args, {
  encoding: "utf8",
  env: createSupabaseEnvironment(),
  windowsHide: true,
});

if (result.error) {
  console.error(result.error.message);
  process.exitCode = 1;
} else if (result.status !== 0) {
  process.stderr.write(result.stderr || result.stdout || "Supabase type generation failed\n");
  process.exitCode = result.status ?? 1;
} else if (!result.stdout.trim()) {
  console.error("Supabase returned empty generated types");
  process.exitCode = 1;
} else {
  writeFileSync("src/types/database.generated.ts", result.stdout);
  console.log("Generated src/types/database.generated.ts");
}

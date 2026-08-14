import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";

const supabaseCommand = process.platform === "win32" ? "supabase.cmd" : "supabase";
const result = spawnSync(
  supabaseCommand,
  ["gen", "types", "--lang", "typescript", "--local", "--schema", "public"],
  { encoding: "utf8" },
);

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

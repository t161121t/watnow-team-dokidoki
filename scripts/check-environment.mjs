import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

const failures = [];
const requiredDenoVersion = readFileSync(new URL("../.dvmrc", import.meta.url), "utf8").trim();
const nodeVersion = process.versions.node;
const nodeMajor = Number.parseInt(nodeVersion.split(".")[0], 10);

if (nodeMajor !== 24) {
  failures.push(`Node.js 24 is required (current: ${nodeVersion})`);
} else {
  console.log(`[ok] Node.js ${nodeVersion}`);
}

const userAgent = process.env.npm_config_user_agent ?? "";
const pnpmVersion = userAgent.match(/^pnpm\/([^\s]+)/)?.[1];

if (pnpmVersion !== "11.21.0") {
  failures.push(`pnpm 11.21.0 is required (current: ${pnpmVersion ?? "unknown"})`);
} else {
  console.log(`[ok] pnpm ${pnpmVersion}`);
}

const denoCommand = process.platform === "win32" ? "deno.exe" : "deno";
const deno = spawnSync(denoCommand, ["--version"], {
  encoding: "utf8",
});
const denoVersion = deno.stdout?.match(/^deno ([^\s]+)/m)?.[1];

if (deno.status !== 0) {
  failures.push(`Deno ${requiredDenoVersion} is required`);
} else if (denoVersion !== requiredDenoVersion) {
  failures.push(`Deno ${requiredDenoVersion} is required (current: ${denoVersion ?? "unknown"})`);
} else {
  console.log(`[ok] Deno ${denoVersion}`);
}

const dockerCommand = process.platform === "win32" ? "docker.exe" : "docker";
const docker = spawnSync(dockerCommand, ["--version"], {
  encoding: "utf8",
});

if (docker.status !== 0) {
  failures.push("A Docker-compatible container runtime is required for local Supabase");
} else {
  console.log(`[ok] ${docker.stdout.trim()}`);
}

if (failures.length > 0) {
  for (const failure of failures) {
    console.error(`[error] ${failure}`);
  }
  process.exitCode = 1;
}

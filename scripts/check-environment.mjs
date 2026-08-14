import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const requiredNodeVersion = readFileSync(
  new URL("../.node-version", import.meta.url),
  "utf8",
).trim();
const requiredDenoVersion = readFileSync(new URL("../.dvmrc", import.meta.url), "utf8").trim();

export function checkEnvironment({
  nodeVersion = process.versions.node,
  userAgent = process.env.npm_config_user_agent ?? "",
  platform = process.platform,
  spawn = spawnSync,
  log = console.log,
} = {}) {
  const failures = [];

  if (nodeVersion !== requiredNodeVersion) {
    failures.push(`Node.js ${requiredNodeVersion} is required (current: ${nodeVersion})`);
  } else {
    log(`[ok] Node.js ${nodeVersion}`);
  }

  const pnpmVersion = userAgent.match(/^pnpm\/([^\s]+)/)?.[1];

  if (pnpmVersion !== "11.21.0") {
    failures.push(`pnpm 11.21.0 is required (current: ${pnpmVersion ?? "unknown"})`);
  } else {
    log(`[ok] pnpm ${pnpmVersion}`);
  }

  const denoCommand = platform === "win32" ? "deno.exe" : "deno";
  const deno = spawn(denoCommand, ["--version"], {
    encoding: "utf8",
  });
  const denoVersion = deno.stdout?.match(/^deno ([^\s]+)/m)?.[1];

  if (deno.status !== 0) {
    failures.push(`Deno ${requiredDenoVersion} is required`);
  } else if (denoVersion !== requiredDenoVersion) {
    failures.push(`Deno ${requiredDenoVersion} is required (current: ${denoVersion ?? "unknown"})`);
  } else {
    log(`[ok] Deno ${denoVersion}`);
  }

  const dockerCommand = platform === "win32" ? "docker.exe" : "docker";
  const docker = spawn(dockerCommand, ["--version"], {
    encoding: "utf8",
  });

  if (docker.status !== 0) {
    failures.push("Docker CLI is required for local Supabase");
  } else {
    const dockerInfo = spawn(dockerCommand, ["info"], {
      encoding: "utf8",
    });

    if (dockerInfo.status !== 0) {
      failures.push("A running Docker-compatible container engine is required for local Supabase");
    } else {
      log(`[ok] ${docker.stdout.trim()} (engine running)`);
    }
  }

  return failures;
}

const entrypoint = process.argv[1] ? pathToFileURL(process.argv[1]).href : undefined;

if (import.meta.url === entrypoint) {
  const failures = checkEnvironment();

  if (failures.length > 0) {
    for (const failure of failures) {
      console.error(`[error] ${failure}`);
    }
    process.exitCode = 1;
  }
}

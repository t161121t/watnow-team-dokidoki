// @vitest-environment node

import { describe, expect, it, vi } from "vitest";
import { checkEnvironment } from "./check-environment.mjs";

function createSpawn({ dockerInfoStatus = 0 } = {}) {
  return vi.fn((command, args) => {
    if (command === "deno" && args[0] === "--version") {
      return { status: 0, stdout: "deno 2.9.5\n" };
    }

    if (command === "docker" && args[0] === "--version") {
      return { status: 0, stdout: "Docker version 29.6.1, build 8900f1d330\n" };
    }

    if (command === "docker" && args[0] === "info") {
      return { status: dockerInfoStatus, stdout: "" };
    }

    throw new Error(`Unexpected command: ${command} ${args.join(" ")}`);
  });
}

function createOptions(overrides = {}) {
  return {
    nodeVersion: "24.18.1",
    userAgent: "pnpm/11.21.0 npm/? node/v24.18.1 darwin arm64",
    platform: "darwin",
    spawn: createSpawn(),
    log: vi.fn(),
    ...overrides,
  };
}

describe("checkEnvironment", () => {
  it("accepts the pinned tool versions and a running Docker engine", () => {
    const options = createOptions();

    expect(checkEnvironment(options)).toEqual([]);
    expect(options.spawn).toHaveBeenCalledWith("docker", ["info"], { encoding: "utf8" });
  });

  it("rejects a different Node.js patch version", () => {
    const options = createOptions({ nodeVersion: "24.18.0" });

    expect(checkEnvironment(options)).toContain("Node.js 24.18.1 is required (current: 24.18.0)");
  });

  it("rejects an installed Docker CLI when its engine is unavailable", () => {
    const options = createOptions({ spawn: createSpawn({ dockerInfoStatus: 1 }) });

    expect(checkEnvironment(options)).toContain(
      "A running Docker-compatible container engine is required for local Supabase",
    );
  });
});

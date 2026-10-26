#!/usr/bin/env node
// `pnpm setup:local`: create `.env` from `.env.example` with fresh random secrets for this
// machine (Postgres passwords, auth, encryption, supervisor and screen-proxy secrets), and, on
// Docker Desktop, control computers over loopback. An existing `.env` is left alone.
import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const target = path.join(root, ".env");

if (existsSync(target)) {
  console.log("[setup] .env already exists; leaving it unchanged");
  process.exit(0);
}

const hex = (bytes) => randomBytes(bytes).toString("hex");
const postgres = hex(16);
const postgresApp = hex(16);
const values = {
  POSTGRES_PASSWORD: postgres,
  POSTGRES_APP_PASSWORD: postgresApp,
  BETTER_AUTH_SECRET: hex(32),
  ENCRYPTION_KEY: hex(32),
  SANDBOX_SUPERVISOR_TOKEN: hex(32),
  SCREEN_PROXY_SECRET: hex(32),
};

let env = readFileSync(path.join(root, ".env.example"), "utf8");
for (const [key, value] of Object.entries(values)) {
  env = env.replace(new RegExp(`^${key}=.*$`, "m"), `${key}=${value}`);
}
env = env
  .replace("REPLACE_WITH_POSTGRES_APP_PASSWORD", postgresApp)
  .replace("REPLACE_WITH_POSTGRES_PASSWORD", postgres);
// Docker Desktop container IPs are unreachable from the host; native Linux Docker Engine's are.
if (usesDockerDesktop()) {
  env = env.replace(
    /^# SANDBOX_CONTROL_VIA_LOOPBACK=true$/m,
    "SANDBOX_CONTROL_VIA_LOOPBACK=true",
  );
}

if (/replace-with|REPLACE_WITH/.test(env)) {
  console.error("[setup] .env.example has a placeholder this script does not fill; check it");
  process.exit(1);
}
writeFileSync(target, env);
console.log("[setup] Created .env with random secrets for this machine");

function usesDockerDesktop() {
  try {
    const os = execFileSync("docker", ["info", "--format", "{{.OperatingSystem}}"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return os.includes("Docker Desktop");
  } catch {
    // Docker is not running: macOS and Windows hosts almost always use Docker Desktop.
    return process.platform !== "linux";
  }
}

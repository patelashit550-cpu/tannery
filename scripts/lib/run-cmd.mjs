import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";

export function npmCliJs() {
  const candidate = join(dirname(process.execPath), "node_modules", "npm", "bin", "npm-cli.js");
  if (!existsSync(candidate)) {
    throw new Error(`run-cmd: npm-cli.js not found at ${candidate}`);
  }
  return candidate;
}

export function resolveSpawn(command, args) {
  if (command === "npm" || command === "npm.cmd") {
    return { command: process.execPath, args: [npmCliJs(), ...args] };
  }
  return { command, args };
}

export function runSync(command, args, opts = {}) {
  const resolved = resolveSpawn(command, args);
  return spawnSync(resolved.command, resolved.args, {
    stdio: opts.stdio ?? "inherit",
    shell: false,
    cwd: opts.cwd ?? process.cwd(),
    encoding: opts.encoding === undefined ? "utf8" : opts.encoding,
    env: opts.env ?? process.env,
  });
}

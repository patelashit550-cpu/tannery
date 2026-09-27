#!/usr/bin/env node
/**
 * Opt-in local ship helper — build, optionally pin to IPFS, optionally commit.
 *
 *   npm run ship
 *   npm run ship -- --push
 *   npm run ship -- --push -m "Publish first essay."
 *   npm run ship -- --ipfs          (Pinata upload after build; needs PINATA_JWT in .env.local)
 *
 * This is an example. Wire your own host (Pages, Netlify, etc.) as you prefer.
 */
import { loadEnvFiles } from "./lib/load-env.mjs";
import { runSync } from "./lib/run-cmd.mjs";

const args = process.argv.slice(2);
const push = args.includes("--push");
const ipfs = args.includes("--ipfs");
const messageIdx = args.indexOf("-m");
const message =
  messageIdx >= 0 && args[messageIdx + 1]
    ? args[messageIdx + 1]
    : `ship ${new Date().toISOString().slice(0, 10)}`;

function run(label, command, cmdArgs = [], opts = {}) {
  const result = runSync(command, cmdArgs, {
    stdio: opts.inherit === false ? "pipe" : "inherit",
    encoding: "utf8",
  });
  if (result.status !== 0) {
    if (opts.inherit === false) {
      if (result.stdout?.trim()) console.error(result.stdout.trim());
      if (result.stderr?.trim()) console.error(result.stderr.trim());
    }
    console.error(`ship: failed at ${label}`);
    process.exit(result.status ?? 1);
  }
  return result;
}

if (push) {
  const branchResult = run("git branch", "git", ["branch", "--show-current"], {
    inherit: false,
  });
  const branch = branchResult.stdout?.trim();
  if (branch !== "main") {
    console.error(
      `ship: refusing --push from ${branch || "detached HEAD"}; open a pull request or switch to main`,
    );
    process.exit(1);
  }
}

run("build:global", "npm", ["run", "build:global"]);

loadEnvFiles();

if (ipfs) {
  run("ipfs-relative-export", "node", ["scripts/ipfs-relative-export.mjs"]);
  run("pinata:upload", "npm", ["run", "pinata:upload"]);
  console.log("ship: Pinata pin complete — update NEXT_PUBLIC_IPFS_CID if CID changed, then ship again.");
}

if (push) {
  run("git add", "git", ["add", "-A", "--", "ontology", "src", "public", "package.json", "package-lock.json"], {
    inherit: false,
  });
  const status = run("git status", "git", ["status", "--porcelain"], { inherit: false });
  if (!status.stdout?.trim()) {
    console.log("ship: nothing to commit");
    process.exit(0);
  }
  run("git commit", "git", ["commit", "-m", message], { inherit: false });
  run("git push", "git", ["push", "origin", "main"]);
  console.log("ship: pushed");
} else {
  console.log("ship: build ok — commit and push when ready (npm run ship -- --push -m \"…\")");
}

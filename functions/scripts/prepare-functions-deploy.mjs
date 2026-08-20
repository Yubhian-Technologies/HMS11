// Bundles the Cloud Functions into a single self-contained deploy artifact
// at functions/.deploy/. Firebase's Cloud Build only runs `npm install`, which
// cannot resolve pnpm `workspace:*` deps — so we inline @hms/shared and
// @hms/shared-server via esbuild and ship a minimal package.json with only
// npm-registry deps. firebase-admin / firebase-functions stay external.
//
// Usage:
//   node functions/scripts/prepare-functions-deploy.mjs

import { build } from "esbuild";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(dir, "..");
const outDir = path.join(root, ".deploy");
const outFile = path.join(outDir, "index.js");

async function main() {
  try {
    await rm(outDir, { recursive: true, force: true });
  } catch (err) {
    // ignore busy lock on Windows
  }
  await mkdir(outDir, { recursive: true });

  await build({
    entryPoints: [path.join(root, "src", "index.ts")],
    bundle: true,
    platform: "node",
    target: "node20",
    format: "cjs",
    sourcemap: true,
    outfile: outFile,
    external: ["firebase-admin", "firebase-functions"],
    logLevel: "info",
  });

  const pkg = {
    name: "functions-deploy",
    private: true,
    version: "0.0.0",
    engines: { node: "20" },
    main: "index.js",
    dependencies: {
      "firebase-admin": "^13.0.2",
      "firebase-functions": "^6.1.0",
    },
  };
  await writeFile(path.join(outDir, "package.json"), JSON.stringify(pkg, null, 2) + "\n");

  // Materialize a real node_modules (npm, not pnpm) so firebase deploy's local
  // SDK analysis can resolve firebase-functions, and Cloud Build re-installs
  // the same two registry packages.
  execSync("npm install --no-audit --no-fund --ignore-scripts", {
    cwd: outDir,
    stdio: "inherit",
  });

  // Emit functions.yaml so `firebase deploy` uses direct file discovery
  // instead of spawning a child discovery process (whose top-level
  // initializeApp() can hang during GCE metadata lookups).
  const sdkBin = path.join(outDir, "node_modules", "firebase-functions", "lib", "bin", "firebase-functions.js");
  execSync(`node "${sdkBin}" .`, {
    cwd: outDir,
    stdio: "inherit",
    env: {
      ...process.env,
      FUNCTIONS_MANIFEST_OUTPUT_PATH: path.join(outDir, "functions.yaml"),
      FIREBASE_CONFIG: JSON.stringify({ projectId: process.env.FIREBASE_PROJECT_ID }),
    },
  });

  console.log(`Wrote deploy bundle -> ${outFile}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
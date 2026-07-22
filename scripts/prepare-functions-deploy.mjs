// Builds the self-contained `.deploy/functions` directory Firebase actually
// uploads for Cloud Functions deploys. Pure packaging — does NOT run `tsc`
// (run `pnpm build:shared && pnpm --filter functions build` yourself first).
// That split is deliberate: this script is invoked as Firebase's `predeploy`
// hook, and by then `CI=true` (needed so Firebase's own internal pnpm
// workspace check doesn't block on a TTY prompt) has already caused pnpm to
// silently strip devDependencies — including `tsc` — as a side effect. If
// this script tried to `tsc` build anything itself at that point, it would
// fail the same way. So all tsc-dependent building must happen earlier,
// outside of any CI=true pnpm invocation.
//
// Why the tarball dance below: Cloud Functions' remote build runs plain
// `npm install`, which chokes on pnpm's `workspace:*` protocol
// (EUNSUPPORTEDPROTOCOL) and also can't correctly walk pnpm's symlinked
// virtual-store node_modules layout. The fix is to pack @hms/shared and
// @hms/shared-server into real tarballs and reference them via
// `file:./vendor/*.tgz` — a specifier plain npm understands — in a
// standalone package.json, so the remote install (whether Cloud Build runs
// it or skips it because node_modules is already vendored) always resolves
// cleanly.
import { execSync } from "node:child_process";
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const run = (cmd, cwd) => execSync(cmd, { cwd, stdio: "inherit" });

const vendorDir = path.join(root, "functions/vendor");
rmSync(vendorDir, { recursive: true, force: true });
mkdirSync(vendorDir, { recursive: true });

run(`npm pack --pack-destination "${vendorDir}"`, path.join(root, "packages/shared"));

// @hms/shared-server's own package.json depends on "@hms/shared": "workspace:*",
// which would hit the same unresolvable-protocol error transitively when npm
// installs its tarball. Repack from a staging copy with that rewritten to a
// plain "*" — satisfied by the sibling @hms/shared tarball dependency once
// both are installed side by side.
const staging = path.join(tmpdir(), "hms-shared-server-staging");
rmSync(staging, { recursive: true, force: true });
cpSync(path.join(root, "packages/shared-server"), staging, { recursive: true });
const stagingPkgPath = path.join(staging, "package.json");
const stagingPkg = JSON.parse(readFileSync(stagingPkgPath, "utf8"));
stagingPkg.dependencies["@hms/shared"] = "*";
delete stagingPkg.devDependencies;
writeFileSync(stagingPkgPath, JSON.stringify(stagingPkg, null, 2));
run(`npm pack --pack-destination "${vendorDir}"`, staging);

const deployDir = path.join(root, ".deploy/functions");
rmSync(deployDir, { recursive: true, force: true });
mkdirSync(deployDir, { recursive: true });
cpSync(path.join(root, "functions/lib"), path.join(deployDir, "lib"), { recursive: true });
cpSync(vendorDir, path.join(deployDir, "vendor"), { recursive: true });

const functionsPkg = JSON.parse(readFileSync(path.join(root, "functions/package.json"), "utf8"));
functionsPkg.dependencies["@hms/shared"] = "file:./vendor/hms-shared-0.0.0.tgz";
functionsPkg.dependencies["@hms/shared-server"] = "file:./vendor/hms-shared-server-0.0.0.tgz";
delete functionsPkg.devDependencies;
delete functionsPkg.scripts;
writeFileSync(path.join(deployDir, "package.json"), JSON.stringify(functionsPkg, null, 2));

// Firebase CLI's own local static-analysis step (introspecting exports to
// find onCall/onSchedule/etc functions) requires firebase-admin/
// firebase-functions to be resolvable from deployDir *before* anything is
// uploaded — not just Cloud Build's remote install. deployDir is outside
// the pnpm workspace (not listed in pnpm-workspace.yaml), so a plain npm
// install here is fully isolated from the root workspace's node_modules.
run("npm install --omit=dev --no-audit --no-fund --ignore-scripts", deployDir);

console.log(`Prepared ${deployDir} for Cloud Functions deploy.`);

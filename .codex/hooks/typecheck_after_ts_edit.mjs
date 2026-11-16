import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const event = JSON.parse(readFileSync(0, "utf8"));
function getStrings(value) {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(getStrings);
  if (value && typeof value === "object")
    return Object.values(value).flatMap(getStrings);
  return [];
}

const toolInput = getStrings(event.tool_input)
  .join("\n")
  .replaceAll("\\n", "\n");
const paths = [
  ...toolInput.matchAll(
    /^(?:\*\*\* (?:Add|Update|Delete) File: |(?:\+\+\+|---) [ab]\/)(.+)$/gm,
  ),
];

const changedTypeScriptPaths = paths
  .map(([, path]) => path.trim())
  .filter((path) => /\.(?:ts|tsx|mts|cts)$/.test(path));
if (changedTypeScriptPaths.length === 0) process.exit(0);

const root = spawnSync("git", ["rev-parse", "--show-toplevel"], {
  encoding: "utf8",
});
if (root.status !== 0) process.exit(root.status ?? 1);
const repoRoot = root.stdout.trim();
const existingTypeScriptPaths = changedTypeScriptPaths.filter((path) =>
  existsSync(`${repoRoot}/${path}`),
);

const testPaths = new Set();
for (const path of changedTypeScriptPaths) {
  if (/\.test\.(?:ts|tsx)$/.test(path)) {
    if (existsSync(`${repoRoot}/${path}`)) testPaths.add(path);
  } else if (/^(?:src|worker)\//.test(path)) {
    const testPath = path.replace(/\.(ts|tsx)$/, ".test.$1");
    if (existsSync(`${repoRoot}/${testPath}`)) testPaths.add(testPath);
  }
}

const typecheck = spawnSync("pnpm", ["typecheck"], {
  cwd: repoRoot,
  encoding: "utf8",
});
const checks = [["pnpm typecheck", typecheck]];
if (existingTypeScriptPaths.length) {
  checks.push([
    "pnpm biome check",
    spawnSync(
      "pnpm",
      [
        "biome",
        "check",
        "--error-on-warnings",
        "--no-errors-on-unmatched",
        ...existingTypeScriptPaths,
      ],
      { cwd: repoRoot, encoding: "utf8" },
    ),
  ]);
}
const srcTests = [...testPaths].filter((path) => path.startsWith("src/"));
const workerTests = [...testPaths].filter((path) => path.startsWith("worker/"));
if (srcTests.length) {
  checks.push([
    "pnpm test (related)",
    spawnSync("pnpm", ["test", "--", ...srcTests], {
      cwd: repoRoot,
      encoding: "utf8",
    }),
  ]);
}
if (workerTests.length) {
  checks.push([
    "pnpm test:worker (related)",
    spawnSync("pnpm", ["test:worker", "--", ...workerTests], {
      cwd: repoRoot,
      encoding: "utf8",
    }),
  ]);
}
const failures = [...checks]
  .filter(([, result]) => result.status !== 0)
  .map(
    ([name, result]) =>
      `${name} failed after a TypeScript edit:\n${[result.stdout, result.stderr]
        .filter(Boolean)
        .join("\n")
        .trim()}`,
  );
console.log(
  JSON.stringify({
    systemMessage: failures.length
      ? failures.join("\n")
      : `Typecheck${existingTypeScriptPaths.length ? " and Biome" : " passed; Biome skipped because no changed TypeScript files remain"}${testPaths.size ? " and identifiable related tests passed" : ""} after a TypeScript edit.`,
  }),
);

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

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

if (!paths.some(([, path]) => /\.(?:ts|tsx|mts|cts)$/.test(path.trim()))) {
  process.exit(0);
}

const root = spawnSync("git", ["rev-parse", "--show-toplevel"], {
  encoding: "utf8",
});
if (root.status !== 0) process.exit(root.status ?? 1);

const typecheck = spawnSync("pnpm", ["typecheck"], {
  cwd: root.stdout.trim(),
  encoding: "utf8",
});
const output = [typecheck.stdout, typecheck.stderr]
  .filter(Boolean)
  .join("\n")
  .trim();
console.log(
  JSON.stringify({
    systemMessage:
      typecheck.status === 0
        ? "pnpm typecheck passed after a TypeScript edit."
        : "pnpm typecheck failed after a TypeScript edit:\n" + output,
  }),
);

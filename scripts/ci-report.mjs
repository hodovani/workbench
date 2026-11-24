import { existsSync, readFileSync } from "node:fs";

const [coveragePath] = process.argv.slice(2);
const checks = [
  ["Lint", process.env.LINT_STATUS],
  ["Typecheck", process.env.TYPECHECK_STATUS],
  ["Unit tests and coverage", process.env.COVERAGE_STATUS],
  ["Type contract tests", process.env.TYPE_TEST_STATUS],
];
const labels = new Map([
  ["success", "Passed"],
  ["failure", "Failed"],
  ["cancelled", "Cancelled"],
]);

console.log("## CI report\n\n| Check | Result |\n| --- | --- |");
for (const [name, outcome] of checks) {
  console.log(`| ${name} | ${labels.get(outcome) ?? "Skipped"} |`);
}

const coverage = existsSync(coveragePath)
  ? JSON.parse(readFileSync(coveragePath, "utf8")).total
  : undefined;
const totals = ["lines", "branches", "functions", "statements"].map(
  (metric) => coverage?.[metric]?.pct,
);
if (totals.every(Number.isFinite)) {
  console.log("\n| Lines | Branches | Functions | Statements |");
  console.log("| --- | --- | --- | --- |");
  console.log(`| ${totals.map((pct) => `${pct}%`).join(" | ")} |`);
} else {
  console.log("\nCoverage data was unavailable.");
}

console.log(`\n[Workflow run](${process.env.CI_RUN_URL})`);

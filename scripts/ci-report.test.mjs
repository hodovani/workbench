import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const script = fileURLToPath(new URL("./ci-report.mjs", import.meta.url));
const runUrl = "https://github.com/hodovani/workbench/actions/runs/123";

function report(t, coverage) {
  const dir = mkdtempSync(join(tmpdir(), "workbench-ci-report-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const path = join(dir, "coverage-summary.json");
  if (coverage !== undefined) {
    writeFileSync(
      path,
      typeof coverage === "string" ? coverage : JSON.stringify(coverage),
    );
  }

  const result = spawnSync(process.execPath, [script, path], {
    encoding: "utf8",
    env: {
      ...process.env,
      CI_RUN_URL: runUrl,
      LINT_STATUS: "failure",
      TYPECHECK_STATUS: "success",
      COVERAGE_STATUS: "success",
      TYPE_TEST_STATUS: "skipped",
    },
  });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout;
}

test("reports independent check outcomes and coverage totals", (t) => {
  const result = report(t, {
    total: {
      lines: { pct: 92.5 },
      branches: { pct: 83 },
      functions: { pct: 95 },
      statements: { pct: 91 },
    },
  });
  assert.match(result, /\| Lint \| Failed \|/);
  assert.match(result, /\| Typecheck \| Passed \|/);
  assert.match(result, /\| Unit tests and coverage \| Passed \|/);
  assert.match(result, /\| Type contract tests \| Skipped \|/);
  assert.match(result, /\| 92\.5% \| 83% \| 95% \| 91% \|/);
  assert.ok(result.includes(`[Workflow run](${runUrl})`));
});

test("reports the check results if coverage was not produced", (t) => {
  const result = report(t);
  assert.match(result, /\| Lint \| Failed \|/);
  assert.match(result, /Coverage data was unavailable\./);
});

test("reports the check results if the coverage file is incomplete", (t) => {
  const result = report(t, "{");
  assert.match(result, /\| Lint \| Failed \|/);
  assert.match(result, /Coverage data was unavailable\./);
});

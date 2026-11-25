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
      WORKER_TEST_STATUS: "success",
      FIRESTORE_TEST_STATUS: "failure",
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
  assert.match(result, /\| Worker protocol tests \| Passed \|/);
  assert.match(result, /\| Firestore rules and integration tests \| Failed \|/);
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

const securityScript = fileURLToPath(
  new URL("./security-report.mjs", import.meta.url),
);

function securityReport(
  t,
  {
    scores = [],
    missing,
    invalid,
    osvExit = "0",
    codeqlStatus = "success",
  } = {},
) {
  const dir = mkdtempSync(join(tmpdir(), "workbench-security-report-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  for (const file of [
    "javascript.sarif",
    "actions.sarif",
    "dependencies.sarif",
  ]) {
    if (file === missing) continue;
    const findings = file === "dependencies.sarif" ? scores : [];
    const rules = findings.map((score, index) => ({
      id: `rule-${index}`,
      properties: score === null ? {} : { "security-severity": String(score) },
    }));
    writeFileSync(
      join(dir, file),
      file === invalid
        ? '{"runs":[]}'
        : JSON.stringify({
            version: "2.1.0",
            runs: [
              {
                tool: { driver: { rules } },
                results: rules.map(({ id: ruleId }) => ({ ruleId })),
              },
            ],
          }),
    );
  }
  return spawnSync(process.execPath, [securityScript, dir], {
    encoding: "utf8",
    env: {
      ...process.env,
      CODEQL_STATUS: codeqlStatus,
      OSV_STATUS: "success",
      OSV_EXIT: osvExit,
    },
  });
}

test("reports zero findings when scans succeed", (t) => {
  const result = securityReport(t);
  assert.equal(result.status, 0, result.stderr);
  assert.match(
    result.stdout,
    /\| Dependencies \| Passed \| 0 \| 0 \| 0 \| 0 \|/,
  );
});

test("reports lower and unscored findings without failing", (t) => {
  const result = securityReport(t, { scores: [6.9, null], osvExit: "1" });
  assert.equal(result.status, 0, result.stderr);
  assert.match(
    result.stdout,
    /\| Dependencies \| Passed \| 0 \| 0 \| 1 \| 1 \|/,
  );
});

test("fails independently at the high and critical thresholds", (t) => {
  for (const [score, expected] of [
    [7, /Failed \| 1 \| 0/],
    [9, /Failed \| 0 \| 1/],
  ]) {
    const result = securityReport(t, { scores: [score], osvExit: "1" });
    assert.equal(result.status, 1);
    assert.match(result.stdout, expected);
  }
});

test("reports unavailable scans while retaining completed results", (t) => {
  const result = securityReport(t, {
    missing: "javascript.sarif",
    invalid: "actions.sarif",
    osvExit: "127",
  });
  assert.equal(result.status, 1);
  assert.equal(result.stdout.match(/Unavailable/g)?.length, 3);
  const partial = securityReport(t, {
    missing: "actions.sarif",
    codeqlStatus: "failure",
  });
  assert.equal(partial.status, 1);
  assert.match(partial.stdout, /\| Application and Worker code \| Passed \|/);
  assert.match(partial.stdout, /\| Dependencies \| Passed \|/);
});

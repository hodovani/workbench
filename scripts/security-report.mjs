import { readFileSync } from "node:fs";
import { join } from "node:path";

const [resultsDir] = process.argv.slice(2);
const { CODEQL_STATUS, OSV_STATUS, OSV_EXIT, OSV_BLOCKING } = process.env;

function readFindings(file) {
  const { version, runs } = JSON.parse(
    readFileSync(join(resultsDir, file), "utf8"),
  );
  if (version !== "2.1.0" || !Array.isArray(runs) || runs.length === 0) {
    throw new Error("Expected SARIF 2.1.0 with at least one run");
  }

  return runs.flatMap(({ tool, results = [] }) => {
    const rules = new Map(
      [tool.driver, ...(tool.extensions ?? [])].flatMap(({ rules = [] }) =>
        rules.map((rule) => [rule.id, rule]),
      ),
    );
    return results.map(({ ruleId, rule }) => {
      const id = ruleId ?? rule?.id;
      const definition = rules.get(id);
      if (!definition) throw new Error("Finding references an unknown rule");
      const score = Number.parseFloat(
        definition.properties?.["security-severity"],
      );
      return { id, score };
    });
  });
}

console.log(
  "## Security\n\n| Scan | Result | High | Critical | Lower | Unscored |",
);
console.log("| --- | --- | --- | --- | --- | --- |");

if (CODEQL_STATUS !== "success") process.exitCode = 1;

for (const [label, file, status] of [
  ["Application and Worker code", "javascript.sarif", CODEQL_STATUS],
  ["GitHub Actions workflows", "actions.sarif", CODEQL_STATUS],
  ["Dependencies", "dependencies.sarif", OSV_STATUS],
]) {
  const isDependencyScan = file === "dependencies.sarif";
  const blocking = !isDependencyScan || OSV_BLOCKING === "true";
  try {
    if (status !== "success" && status !== "failure") {
      throw new Error("Scanner did not run");
    }
    const findings = readFindings(file);
    if (
      isDependencyScan &&
      (status !== "success" || OSV_EXIT !== (findings.length ? "1" : "0"))
    ) {
      throw new Error("OSV exit status does not match the report");
    }
    const counts = { high: 0, critical: 0, lower: 0, unscored: 0 };
    for (const { id, score } of findings) {
      if (!Number.isFinite(score) || score < 0 || score > 10) counts.unscored++;
      else if (score >= 9) counts.critical++;
      else if (score >= 7) counts.high++;
      else counts.lower++;
      if (/^[a-z0-9][a-z0-9/_.-]{0,127}$/i.test(id)) {
        console.error(`${label}: ${id}`);
      }
    }
    const seriousFindings = counts.high + counts.critical > 0;
    const result = seriousFindings
      ? blocking
        ? "Failed"
        : "Warning"
      : "Passed";
    if (seriousFindings && blocking) process.exitCode = 1;
    console.log(
      `| ${label} | ${result} | ${Object.values(counts).join(" | ")} |`,
    );
  } catch {
    if (blocking) process.exitCode = 1;
    console.log(`| ${label} | Unavailable | — | — | — | — |`);
    console.error(`${label}: scan failed or did not produce a usable report`);
  }
}

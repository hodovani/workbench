import { spawn } from "node:child_process";

const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const children = [
  spawn(pnpm, ["worker:dev"], {
    stdio: "inherit",
    shell: process.platform === "win32",
  }),
  spawn(pnpm, ["exec", "next", "dev", "--experimental-https"], {
    stdio: "inherit",
    shell: process.platform === "win32",
  }),
];

let stopping = false;
function stop(signal = "SIGTERM") {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill(signal);
}

for (const child of children) {
  child.on("error", (error) => {
    console.error(error);
    process.exitCode = 1;
    stop();
  });
  child.on("exit", (code) => {
    if (stopping) return;
    process.exitCode = code ?? 1;
    stop();
  });
}

process.on("SIGINT", () => stop("SIGINT"));
process.on("SIGTERM", () => stop("SIGTERM"));

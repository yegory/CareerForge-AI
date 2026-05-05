import { spawn, type ChildProcess } from "node:child_process";

const workerScripts = ["worker:generation", "worker:documents", "worker:scheduler"];
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const children = new Map<string, ChildProcess>();
let shuttingDown = false;
let shutdownExitCode = 0;

function stopAll(signal: NodeJS.Signals = "SIGTERM", exitCode = 0) {
  shuttingDown = true;
  shutdownExitCode = exitCode;

  for (const child of children.values()) {
    if (!child.killed) {
      child.kill(signal);
    }
  }
}

for (const script of workerScripts) {
  const child = spawn(npmCommand, ["run", script], {
    env: process.env,
    stdio: "inherit",
  });

  children.set(script, child);

  child.on("exit", (code, signal) => {
    children.delete(script);

    if (shuttingDown) {
      if (children.size === 0) {
        process.exit(shutdownExitCode);
      }
      return;
    }

    const detail = signal ? `signal ${signal}` : `code ${code ?? 0}`;
    console.error(`${script} exited with ${detail}; stopping remaining workers.`);
    stopAll("SIGTERM", code && code > 0 ? code : 1);
  });
}

process.on("SIGINT", () => {
  stopAll("SIGINT");
});

process.on("SIGTERM", () => {
  stopAll("SIGTERM");
});

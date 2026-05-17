import {
  buildEmbeddedPostgresEnv,
  canConnectToDatabase,
  dataDir,
  getDatabaseConfig,
  getEmbeddedPostgresRuntime,
  isProcessRunning,
  readPid,
  removeStateFiles,
} from "./local-db-shared.mjs";

import { spawn } from "node:child_process";

const embeddedPgRuntime = getEmbeddedPostgresRuntime();
const embeddedPgEnv = buildEmbeddedPostgresEnv();

const pid = readPid();

if (pid && isProcessRunning(pid)) {
  process.kill(pid, "SIGTERM");

  for (let attempt = 0; attempt < 20; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 250));
    if (!isProcessRunning(pid)) {
      break;
    }
  }
}

if (pid && !isProcessRunning(pid)) {
  removeStateFiles();
  console.log("Postgres local encerrado.");
  process.exit(0);
}

const config = getDatabaseConfig();

if (!pid && await canConnectToDatabase(config)) {
  console.log("Postgres configurado está acessível, mas sem PID gerenciado; nada para encerrar.");
  process.exit(0);
}

try {
  await new Promise((resolve, reject) => {
    const child = spawn(
      embeddedPgRuntime.pgCtlBin,
      ["-D", dataDir, "stop", "-m", "immediate"],
      { env: embeddedPgEnv },
    );

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`pg_ctl stop falhou com código ${code ?? 1}.`));
    });
  });
  removeStateFiles();
  console.log("Postgres local encerrado.");
} catch {
  removeStateFiles();
  console.log("Nenhum Postgres local ativo para encerrar.");
}
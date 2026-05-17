import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import {
  buildEmbeddedPostgresEnv,
  dataDir,
  ensureStateDir,
  getEmbeddedPostgresLocale,
  getDatabaseConfig,
  getEmbeddedPostgresRuntime,
  getLocalDatabaseState,
  pidFile,
  projectRoot,
  removeStateFiles,
  writeStatus,
} from "./local-db-shared.mjs";

const config = getDatabaseConfig();
const embeddedPgLocale = getEmbeddedPostgresLocale();
const embeddedPgRuntime = getEmbeddedPostgresRuntime();
const embeddedPgEnv = buildEmbeddedPostgresEnv();
const state = await getLocalDatabaseState(config);
const hasHealthyExistingInstance = state.running;

if (hasHealthyExistingInstance) {
  if (state.managedRunning && state.pid) {
    console.log(`Postgres local já está ativo (pid ${state.pid}).`);
  } else {
    console.log(`Postgres configurado já está acessível em ${config.host}:${config.port}/${config.database}.`);
  }
  process.exit(0);
}

if (state.staleState) {
  removeStateFiles();
}

ensureStateDir();

let shuttingDown = false;
let postgresProcess = null;
const startedAt = new Date().toISOString();

function logEmbeddedMessage(message) {
  if (process.env.DEBUG_EMBEDDED_POSTGRES === "true") {
    console.log(message);
  }
}

function getErrorMessage(error) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

async function ensureDatabaseExists() {
  const { Client } = await import("pg");
  const client = new Client({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: "postgres",
  });
  await client.connect();
  try {
    const result = await client.query("select 1 from pg_database where datname = $1 limit 1", [config.database]);
    if (result.rowCount === 0) {
      await client.query(`create database "${config.database.replaceAll('"', '""')}"`);
    }
  } finally {
    await client.end();
  }
}

async function initialiseClusterIfNeeded() {
  if (fs.existsSync(dataDir)) {
    return;
  }

  const passwordFile = path.join(os.tmpdir(), `museu-do-mar-pg-pass-${process.pid}.txt`);
  fs.writeFileSync(passwordFile, `${config.password}\n`, { mode: 0o600 });

  try {
    await new Promise((resolve, reject) => {
      const child = spawn(
        embeddedPgRuntime.initdbBin,
        [
          `--pgdata=${dataDir}`,
          "--auth=password",
          `--username=${config.user}`,
          `--pwfile=${passwordFile}`,
          `--lc-messages=${embeddedPgLocale}`,
        ],
        { env: embeddedPgEnv },
      );

      child.stdout.on("data", (chunk) => logEmbeddedMessage(chunk.toString("utf8")));
      child.stderr.on("data", (chunk) => logEmbeddedMessage(chunk.toString("utf8")));
      child.on("error", reject);
      child.on("exit", (code) => {
        if (code === 0) {
          resolve();
          return;
        }

        reject(new Error(`initdb falhou com código ${code ?? 1}.`));
      });
    });
  } finally {
    fs.rmSync(passwordFile, { force: true });
  }
}

async function stopOrphanedPostgres() {
  if (!fs.existsSync(dataDir)) {
    return;
  }

  await new Promise((resolve) => {
    const child = spawn(
      embeddedPgRuntime.pgCtlBin,
      ["-D", dataDir, "stop", "-m", "immediate"],
      { env: embeddedPgEnv },
    );

    child.on("error", () => resolve());
    child.on("exit", () => resolve());
  });
}

async function startPostgres() {
  return await new Promise((resolve, reject) => {
    let ready = false;

    const child = spawn(
      embeddedPgRuntime.postgresBin,
      ["-D", dataDir, "-p", String(config.port)],
      { env: embeddedPgEnv },
    );

    const handleMessage = (chunk) => {
      const message = chunk.toString("utf8");
      logEmbeddedMessage(message);

      if (!ready && message.includes("database system is ready to accept connections")) {
        ready = true;
        resolve(child);
      }
    };

    child.stdout.on("data", handleMessage);
    child.stderr.on("data", handleMessage);
    child.on("error", reject);
    child.on("exit", (code) => {
      if (!ready) {
        reject(new Error(`postgres falhou ao iniciar (código ${code ?? 1}).`));
      }
    });
  });
}

async function runBootstrap() {
  const exitCode = await new Promise((resolve, reject) => {
    const child = spawn("npm run db:bootstrap", {
      cwd: projectRoot,
      stdio: "inherit",
      shell: true,
      env: process.env,
    });

    child.on("error", reject);
    child.on("exit", (code) => resolve(code ?? 1));
  });

  if (exitCode !== 0) {
    throw new Error(`Falha ao bootstrapar o banco local (${exitCode}).`);
  }
}

async function shutdown(signal = "shutdown") {
  if (shuttingDown) return;
  shuttingDown = true;

  try {
    if (postgresProcess && !postgresProcess.killed) {
      await new Promise((resolve) => {
        postgresProcess.once("exit", resolve);
        postgresProcess.kill("SIGINT");
      });
    }
  } catch (error) {
    console.error(`Falha ao encerrar Postgres local (${signal}):`, getErrorMessage(error));
  } finally {
    removeStateFiles();
  }

  process.exit(0);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));

try {
  await stopOrphanedPostgres();
  await initialiseClusterIfNeeded();
  postgresProcess = await startPostgres();
  await ensureDatabaseExists();
  await runBootstrap();

  fs.writeFileSync(pidFile, `${process.pid}\n`);
  writeStatus({
    pid: process.pid,
    host: config.host,
    port: config.port,
    database: config.database,
    user: config.user,
    startedAt,
  });

  console.log(`Postgres local iniciado em ${config.host}:${config.port}/${config.database}`);
} catch (error) {
  removeStateFiles();
  console.error("Falha ao iniciar Postgres local:", getErrorMessage(error));
  process.exit(1);
}

setInterval(() => {
  writeStatus({
    pid: process.pid,
    host: config.host,
    port: config.port,
    database: config.database,
    user: config.user,
    startedAt,
    heartbeatAt: new Date().toISOString(),
  });
}, 15_000);
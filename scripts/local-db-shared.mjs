import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";
import { loadRuntimeEnv } from "./load-runtime-env.mjs";

loadRuntimeEnv();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const projectRoot = path.resolve(__dirname, "..");

export const stateDir = path.join(projectRoot, ".local", "embedded-postgres");
export const dataDir = path.join(stateDir, "data");
export const pidFile = path.join(stateDir, "dev-db.pid");
export const statusFile = path.join(stateDir, "status.json");

export function getEmbeddedPostgresLocale() {
  return process.env.EMBEDDED_PG_LOCALE?.trim() || "C.utf8";
}

export function getEmbeddedPostgresRuntime() {
  const nativeRoot = path.join(projectRoot, "node_modules", "@embedded-postgres", "linux-x64", "native");
  const binDir = path.join(nativeRoot, "bin");
  const libDir = path.join(nativeRoot, "lib");

  return {
    nativeRoot,
    binDir,
    libDir,
    initdbBin: path.join(binDir, "initdb"),
    postgresBin: path.join(binDir, "postgres"),
    pgCtlBin: path.join(binDir, "pg_ctl"),
  };
}

export function buildEmbeddedPostgresEnv() {
  const runtime = getEmbeddedPostgresRuntime();
  const currentLdLibraryPath = process.env.LD_LIBRARY_PATH?.trim();

  return {
    ...process.env,
    LD_LIBRARY_PATH: currentLdLibraryPath ? `${runtime.libDir}:${currentLdLibraryPath}` : runtime.libDir,
    LC_MESSAGES: getEmbeddedPostgresLocale(),
  };
}

export function getDatabaseConfig() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL não definida.");
  }

  const url = new URL(process.env.DATABASE_URL);
  return {
    host: url.hostname || "127.0.0.1",
    port: Number(url.port || 5432),
    user: decodeURIComponent(url.username || "postgres"),
    password: decodeURIComponent(url.password || "postgres"),
    database: decodeURIComponent(url.pathname.replace(/^\//, "") || "postgres"),
  };
}

export function ensureStateDir() {
  fs.mkdirSync(stateDir, { recursive: true });
}

export function readPid() {
  if (!fs.existsSync(pidFile)) return null;
  const raw = fs.readFileSync(pidFile, "utf8").trim();
  const pid = Number(raw);
  return Number.isInteger(pid) && pid > 0 ? pid : null;
}

export function isProcessRunning(pid) {
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function getConnectionString(config) {
  const url = new URL("postgresql://localhost");
  url.hostname = config.host;
  url.port = String(config.port);
  url.username = encodeURIComponent(config.user);
  url.password = encodeURIComponent(config.password);
  url.pathname = `/${encodeURIComponent(config.database)}`;
  return url.toString();
}

export async function canConnectToDatabase(config = getDatabaseConfig(), timeoutSeconds = 2) {
  const sql = postgres(getConnectionString(config), {
    max: 1,
    connect_timeout: timeoutSeconds,
    idle_timeout: timeoutSeconds,
    max_lifetime: timeoutSeconds,
  });

  try {
    await sql`select 1`;
    return true;
  } catch {
    return false;
  } finally {
    await sql.end({ timeout: timeoutSeconds });
  }
}

export async function getLocalDatabaseState(config = getDatabaseConfig()) {
  const pid = readPid();
  const pidRunning = pid ? isProcessRunning(pid) : false;
  const reachable = await canConnectToDatabase(config);
  const managedRunning = Boolean(pid) && pidRunning && reachable;
  const staleState = Boolean(pid) && (!pidRunning || !reachable);

  if (staleState) {
    removeStateFiles();
  }

  return {
    pid,
    pidRunning,
    reachable,
    managedRunning,
    running: reachable,
    staleState,
  };
}

export function writeStatus(payload) {
  ensureStateDir();
  fs.writeFileSync(statusFile, JSON.stringify(payload, null, 2));
}

export function removeStateFiles() {
  for (const filePath of [pidFile, statusFile]) {
    if (fs.existsSync(filePath)) {
      fs.rmSync(filePath, { force: true });
    }
  }
}
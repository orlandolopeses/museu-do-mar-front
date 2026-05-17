import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { loadRuntimeEnv } from "./load-runtime-env.mjs";

loadRuntimeEnv();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const port = Number(process.env.SCOPE_SMOKE_PORT || 3002);
const host = process.env.SCOPE_SMOKE_HOST || "127.0.0.1";
const baseUrl = `http://${host}:${port}`;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function isServerReady(url) {
  try {
    const response = await fetch(`${url}/api/auth/csrf`, { redirect: "manual" });
    return response.ok;
  } catch {
    return false;
  }
}

async function waitForServer(url, timeoutMs) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (await isServerReady(url)) return true;
    await sleep(1000);
  }
  return false;
}

async function terminateChild(child) {
  if (!child || child.exitCode !== null) return;
  child.kill("SIGTERM");

  const exited = await Promise.race([
    new Promise((resolve) => child.once("exit", () => resolve(true))),
    sleep(5000).then(() => false),
  ]);

  if (!exited && child.exitCode === null) {
    child.kill("SIGKILL");
    await new Promise((resolve) => child.once("exit", resolve));
  }
}

async function runChild(command, envOverrides = {}) {
  const child = spawn(command, {
    cwd: projectRoot,
    stdio: "inherit",
    shell: true,
    env: {
      ...process.env,
      ...envOverrides,
    },
  });

  const exitCode = await new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code) => resolve(code ?? 1));
  });

  return exitCode;
}

async function main() {
  assert(process.env.DATABASE_URL, "DATABASE_URL não definida.");
  assert(process.env.NEXTAUTH_SECRET, "NEXTAUTH_SECRET não definida.");

  let serverChild = null;
  const reusedServer = await isServerReady(baseUrl);

  if (reusedServer) {
    console.log(`Runtime já ativo em ${baseUrl}; reutilizando para o smoke do apoiador.`);
  } else {
    console.log(`Subindo runtime temporário em ${baseUrl} com Node 22 via fnm...`);
    serverChild = spawn(
      `bash -lc 'eval "$(fnm env --use-on-cd)" && env DATABASE_URL="${process.env.DATABASE_URL}" NEXTAUTH_URL="${baseUrl}" fnm exec --using=22 npx next dev -p ${port}'`,
      {
        cwd: projectRoot,
        stdio: "inherit",
        shell: true,
        env: process.env,
      },
    );

    const ready = await waitForServer(baseUrl, 90000);
    if (!ready) {
      await terminateChild(serverChild);
      throw new Error(`Runtime não ficou disponível em ${baseUrl} dentro do tempo limite.`);
    }
  }

  try {
    const exitCode = await runChild("node scripts/validate-apoiador-scope.mjs", {
      NEXTAUTH_URL: baseUrl,
      SCOPE_SMOKE_BASE_URL: baseUrl,
    });

    if (exitCode !== 0) {
      throw new Error(`Smoke do apoiador falhou com saída ${exitCode}.`);
    }

    console.log("Smoke gerenciado do apoiador concluído com sucesso.");
  } finally {
    if (serverChild) {
      console.log("Encerrando runtime temporário do smoke do apoiador...");
      await terminateChild(serverChild);
    }
  }
}

main().catch((error) => {
  console.error("Falha ao executar smoke gerenciado do apoiador:", error.message);
  process.exit(1);
});
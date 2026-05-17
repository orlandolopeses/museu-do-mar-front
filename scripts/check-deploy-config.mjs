import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";

const projectRoot = process.cwd();

function loadDeployEnv() {
  for (const fileName of [".env.deploy", ".env.deploy.local"]) {
    const filePath = path.join(projectRoot, fileName);
    if (!fs.existsSync(filePath)) continue;

    const content = fs.readFileSync(filePath, "utf8");

    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;

      const separatorIndex = line.indexOf("=");
      if (separatorIndex === -1) continue;

      const key = line.slice(0, separatorIndex).trim();
      if (!key || process.env[key]) continue;

      let value = line.slice(separatorIndex + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      process.env[key] = value;
    }
  }
}

function getEnv(name, fallback = "") {
  const value = process.env[name];
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function isPlaceholder(value) {
  return [
    "host-ou-ip-do-servidor",
    "usuario_ssh",
    "CONFIRMAR_USUARIO_SSH",
    "SEU_HOST",
    "SEU_USUARIO",
  ].includes(String(value).trim());
}

function validatePort(value) {
  const port = Number(value);
  return Number.isInteger(port) && port > 0 && port <= 65535;
}

function run(command, args, { stdio = "ignore" } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio,
      env: process.env,
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} finalizou com código ${code ?? 1}`));
    });
  });
}

async function commandExists(command) {
  await run("bash", ["-lc", `command -v '${command}' >/dev/null 2>&1`]);
}

async function main() {
  loadDeployEnv();

  const summary = [];
  const problems = [];

  const host = getEnv("DEPLOY_HOST");
  const user = getEnv("DEPLOY_USER");
  const sshPort = getEnv("DEPLOY_SSH_PORT", "22");
  const remotePath = getEnv("DEPLOY_PATH", "/srv/museu-do-mar/site");
  const remoteService = getEnv("DEPLOY_SERVICE", "museu-do-mar-site");
  const skipRestart = getEnv("DEPLOY_SKIP_RESTART", "false") === "true";

  if (!host || isPlaceholder(host)) {
    problems.push("DEPLOY_HOST ausente ou ainda com placeholder.");
  }

  if (!user || isPlaceholder(user)) {
    problems.push("DEPLOY_USER ausente ou ainda com placeholder.");
  }

  if (!validatePort(sshPort)) {
    problems.push("DEPLOY_SSH_PORT inválida.");
  }

  if (!remotePath.startsWith("/")) {
    problems.push("DEPLOY_PATH deve ser absoluto no host remoto.");
  }

  if (!remoteService) {
    problems.push("DEPLOY_SERVICE não pode ficar vazio.");
  }

  for (const command of ["ssh", "rsync"]) {
    try {
      await commandExists(command);
      summary.push(`- ${command}: ok`);
    } catch {
      problems.push(`Comando local obrigatório ausente: ${command}`);
    }
  }

  summary.push(`- alvo remoto: ${user && host ? `${user}@${host}` : "indefinido"}`);
  summary.push(`- porta SSH: ${sshPort}`);
  summary.push(`- diretório remoto: ${remotePath}`);
  summary.push(`- serviço remoto: ${remoteService}`);
  summary.push(`- reinício remoto: ${skipRestart ? "ignorado" : "habilitado"}`);

  console.log("DEPLOY CONFIG CHECK");
  for (const line of summary) {
    console.log(line);
  }

  if (problems.length > 0) {
    console.error("Configuração de deploy inválida:");
    for (const problem of problems) {
      console.error(`- ${problem}`);
    }
    process.exit(1);
  }

  console.log("Configuração de deploy pronta para uso.");
}

main().catch((error) => {
  console.error("Falha ao validar configuração de deploy:", error.message);
  process.exit(1);
});
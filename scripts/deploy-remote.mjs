import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

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

function shellEscape(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

function run(command, args, { stdio = "inherit" } = {}) {
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

async function ensureCommandExists(command) {
  await run("bash", ["-lc", `command -v ${shellEscape(command)} >/dev/null 2>&1`], { stdio: "ignore" }).catch(() => {
    throw new Error(`Comando obrigatório não encontrado no host local: ${command}`);
  });
}

async function main() {
  loadDeployEnv();

  const host = getEnv("DEPLOY_HOST");
  if (!host || isPlaceholder(host)) {
    console.error("Defina DEPLOY_HOST com o host SSH de destino.");
    console.error("Você pode informar por variável de ambiente ou em .env.deploy.local.");
    console.error("Exemplo: DEPLOY_HOST=meu-servidor npm run deploy:remote");
    process.exit(1);
  }

  const sshPort = getEnv("DEPLOY_SSH_PORT", "22");
  const user = getEnv("DEPLOY_USER", process.env.USER || "www-data");
  if (!user || isPlaceholder(user)) {
    console.error("Defina DEPLOY_USER com um usuário SSH válido do servidor de destino.");
    console.error("Valor atual em .env.deploy.local ainda está como placeholder.");
    process.exit(1);
  }
  const target = `${user}@${host}`;
  const remotePath = getEnv("DEPLOY_PATH", "/srv/museu-do-mar/site");
  const remoteService = getEnv("DEPLOY_SERVICE", "museu-do-mar-site");
  // DEPLOY_FILE_OWNER separa o usuario SSH do dono dos arquivos no servidor.
  // Necessario quando o SSH usa root mas o servico roda como outro usuario (ex: deploy).
  const fileOwner = getEnv("DEPLOY_FILE_OWNER", user);
  const installCommand = getEnv("DEPLOY_INSTALL_COMMAND", "npm ci");
  const bootstrapCommand = getEnv("DEPLOY_BOOTSTRAP_COMMAND", "npm run db:bootstrap");
  const validateCommand = getEnv("DEPLOY_VALIDATE_COMMAND", "npm run deploy:preflight");
  const remotePrepareCommand = getEnv(
    "DEPLOY_PREPARE_COMMAND",
    `mkdir -p ${shellEscape(remotePath)} || sudo mkdir -p ${shellEscape(remotePath)}` +
      ` && sudo chown -R ${shellEscape(fileOwner)}:${shellEscape(fileOwner)} ${shellEscape(remotePath)}`,
  );
  const restartCommand = getEnv(
    "DEPLOY_RESTART_COMMAND",
    `sudo systemctl restart ${remoteService} && sudo systemctl status ${remoteService} --no-pager -n 20`,
  );
  const skipRestart = getEnv("DEPLOY_SKIP_RESTART", "false") === "true";

  const remoteCommands = [
    "set -e",
    remotePrepareCommand,
    `cd ${shellEscape(remotePath)}`,
    installCommand,
    bootstrapCommand,
    validateCommand,
  ];

  if (!skipRestart) {
    remoteCommands.push(restartCommand);
  }

  const remoteScript = remoteCommands.join(" && ");

  console.log(`Deploy remoto para ${target}:${remotePath}`);
  console.log(`- serviço: ${remoteService}`);
  console.log(`- preparação remota: ${remotePrepareCommand}`);
  console.log(`- reinstala dependências: ${installCommand}`);
  console.log(`- bootstrap remoto: ${bootstrapCommand}`);
  console.log(`- validação remota: ${validateCommand}`);
  console.log(`- reinício do serviço: ${skipRestart ? "ignorado" : restartCommand}`);

  await ensureCommandExists("rsync");
  await ensureCommandExists("ssh");

  await run("ssh", ["-p", sshPort, target, remotePrepareCommand]);

  await run("rsync", [
    "-az",
    "--delete",
    "--filter=protect .env.local",
    "--exclude=.git",
    "--exclude=.github",
    "--exclude=node_modules",
    "--exclude=.next",
    "--exclude=.env",
    "--exclude=.env.*",
    "--exclude=npm-debug.log*",
    "--exclude=.DS_Store",
    "-e",
    `ssh -p ${sshPort}`,
    `${process.cwd()}/`,
    `${target}:${remotePath}/`,
  ]);

  await run("ssh", ["-p", sshPort, target, remoteScript]);

  console.log("Deploy remoto concluído.");
}

main().catch((error) => {
  console.error("Falha no deploy remoto:", error.message);
  process.exit(1);
});
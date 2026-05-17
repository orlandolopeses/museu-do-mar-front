import postgres from "postgres";
import { loadRuntimeEnv } from "./load-runtime-env.mjs";

loadRuntimeEnv();

const requiredEnv = [
  "DATABASE_URL",
  "NEXTAUTH_SECRET",
  "NEXTAUTH_URL",
  "ADMIN_EMAIL",
  "ADMIN_PASSWORD_HASH",
];

const optionalEnv = ["ADMIN_NAME", "HOMOLOGATION_PUBLISH", "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"];
const shouldCheckDb = !process.argv.includes("--skip-db");

function maskValue(name, value) {
  if (!value) return "ausente";
  if (name === "DATABASE_URL") return "definida";
  if (name === "NEXTAUTH_SECRET") return `definida (${value.length} chars)`;
  if (name === "ADMIN_PASSWORD_HASH") return `definida (${value.length} chars)`;
  if (value.length <= 6) return value;
  return `${value.slice(0, 3)}***${value.slice(-2)}`;
}

async function checkDbConnection() {
  const sql = postgres(process.env.DATABASE_URL, { max: 1, connect_timeout: 5 });
  try {
    const [result] = await sql`select current_database() as database, current_user as user`;
    return {
      ok: true,
      database: result?.database ?? "desconhecido",
      user: result?.user ?? "desconhecido",
    };
  } catch (error) {
    return {
      ok: false,
      error: error.message,
    };
  } finally {
    await sql.end({ timeout: 5 }).catch(() => undefined);
  }
}

async function main() {
  console.log("RUNTIME ENV CHECK");

  const missing = [];

  for (const name of requiredEnv) {
    const value = process.env[name];
    if (!value) missing.push(name);
    console.log(`- ${name}: ${maskValue(name, value ?? "")}`);
  }

  for (const name of optionalEnv) {
    const value = process.env[name];
    console.log(`- ${name}: ${maskValue(name, value ?? "")}`);
  }

  if (missing.length > 0) {
    console.error(`Variáveis obrigatórias ausentes: ${missing.join(", ")}`);
    process.exit(1);
  }

  if (!shouldCheckDb) {
    console.log("- DB check: ignorado (--skip-db)");
    return;
  }

  const dbCheck = await checkDbConnection();
  if (!dbCheck.ok) {
    console.error(`- DB check: falhou (${dbCheck.error})`);
    process.exit(1);
  }

  console.log(`- DB check: ok (${dbCheck.database} / ${dbCheck.user})`);
  console.log("Ambiente pronto para bootstrap.");
}

main().catch((error) => {
  console.error("Falha ao verificar ambiente:", error.message);
  process.exit(1);
});

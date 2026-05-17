import { spawn } from "node:child_process";
import postgres from "postgres";
import { loadRuntimeEnv } from "./load-runtime-env.mjs";

loadRuntimeEnv();

const requiredTables = [
  "users",
  "profiles",
  "roles",
  "permissions",
  "role_permissions",
  "user_roles",
  "instituicoes",
  "user_instituicoes",
  "turmas",
  "matriculas_turma",
  "atividades_turma",
  "posts",
  "acervo",
  "eventos",
  "forum_topicos",
  "forum_respostas",
  "acompanhamentos_jornada",
  "contatos",
  "trilhas_pedagogicas",
  "gincana_checkins",
  "atividade_acervo",
];

const requiredColumns = [
  { table: "eventos", column: "instituicao_id" },
  { table: "users", column: "status" },
  { table: "profiles", column: "profile_type" },
  { table: "instituicoes", column: "tipo" },
  { table: "turmas", column: "instituicao_id" },
  { table: "atividades_turma", column: "origem_chave" },
];

const requiredColumnTables = [...new Set(requiredColumns.map(({ table }) => table))];

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL não definida.");
  process.exit(1);
}

function formatMissingSchema(missingTables, missingColumns) {
  const tableEntries = missingTables.map((tableName) => `table:${tableName}`);
  const columnEntries = missingColumns.map(({ table, column }) => `column:${table}.${column}`);
  return [...tableEntries, ...columnEntries].join(", ");
}

function canApplyCompatibilityOnly(missingTables, missingColumns) {
  const supportedMissingTables = new Set(["atividades_turma", "atividade_acervo"]);
  const supportedMissingColumns = new Set([
    "eventos.instituicao_id",
    "atividades_turma.origem_chave",
  ]);

  return missingTables.every((tableName) => supportedMissingTables.has(tableName))
    && missingColumns.every(({ table, column }) => supportedMissingColumns.has(`${table}.${column}`));
}

async function inspectSchema(sql) {
  const [tableRows, columnRows] = await Promise.all([
    sql`
    select table_name
    from information_schema.tables
    where table_schema = 'public'
      and table_name in ${sql(requiredTables)}
    `,
    sql`
    select table_name, column_name
    from information_schema.columns
    where table_schema = 'public'
      and table_name in ${sql(requiredColumnTables)}
    `,
  ]);

  const foundTables = new Set(tableRows.map((row) => row.table_name));
  const foundColumns = new Set(columnRows.map((row) => `${row.table_name}.${row.column_name}`));

  return {
    missingTables: requiredTables.filter((tableName) => !foundTables.has(tableName)),
    missingColumns: requiredColumns.filter(({ table, column }) => !foundColumns.has(`${table}.${column}`)),
  };
}

async function applyCompatibilityPatches(sql, missingTables, missingColumns) {
  const missingColumnKeys = new Set(missingColumns.map(({ table, column }) => `${table}.${column}`));
  const needsEventosInstituicaoId = missingColumnKeys.has("eventos.instituicao_id");
  const needsAtividadesTurma = missingTables.includes("atividades_turma") || missingColumnKeys.has("atividades_turma.origem_chave");

  if (needsEventosInstituicaoId) {
    await sql.unsafe(`
      ALTER TABLE "eventos"
      ADD COLUMN IF NOT EXISTS "instituicao_id" varchar(36);
    `);

    await sql.unsafe(`
      DO $$ BEGIN
        ALTER TABLE "eventos"
        ADD CONSTRAINT "eventos_instituicao_id_instituicoes_id_fk"
        FOREIGN KEY ("instituicao_id") REFERENCES "public"."instituicoes"("id") ON DELETE set null ON UPDATE no action;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
  }

  if (needsAtividadesTurma) {
    await sql.unsafe(`
      DO $$ BEGIN
        CREATE TYPE "public"."activity_status" AS ENUM('planejada', 'em_andamento', 'concluida');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS "atividades_turma" (
        "id" varchar(36) PRIMARY KEY NOT NULL,
        "turma_id" varchar(36) NOT NULL,
        "created_by" varchar(36),
        "origem_chave" varchar(160) NOT NULL,
        "titulo" varchar(255) NOT NULL,
        "resumo" text NOT NULL,
        "foco" varchar(255),
        "proximo_passo" text,
        "status" "activity_status" DEFAULT 'planejada' NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      );
    `);

    await sql.unsafe(`
      DO $$ BEGIN
        ALTER TABLE "atividades_turma"
        ADD CONSTRAINT "atividades_turma_turma_id_turmas_id_fk"
        FOREIGN KEY ("turma_id") REFERENCES "public"."turmas"("id") ON DELETE cascade ON UPDATE no action;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await sql.unsafe(`
      DO $$ BEGIN
        ALTER TABLE "atividades_turma"
        ADD CONSTRAINT "atividades_turma_created_by_users_id_fk"
        FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await sql.unsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "atividades_turma_turma_origem_unique"
      ON "atividades_turma" USING btree ("turma_id", "origem_chave");
    `);
  }

  const needsAtividadeAcervo = missingTables.includes("atividade_acervo");

  if (needsAtividadeAcervo) {
    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS "atividade_acervo" (
        "id" varchar(36) PRIMARY KEY NOT NULL,
        "atividade_id" varchar(36) NOT NULL,
        "acervo_id" varchar(36) NOT NULL,
        "nota" text,
        "created_at" timestamp DEFAULT now() NOT NULL
      );
    `);

    await sql.unsafe(`
      DO $$ BEGIN
        ALTER TABLE "atividade_acervo"
        ADD CONSTRAINT "atividade_acervo_atividade_id_atividades_turma_id_fk"
        FOREIGN KEY ("atividade_id") REFERENCES "public"."atividades_turma"("id") ON DELETE cascade ON UPDATE no action;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await sql.unsafe(`
      DO $$ BEGIN
        ALTER TABLE "atividade_acervo"
        ADD CONSTRAINT "atividade_acervo_acervo_id_acervo_id_fk"
        FOREIGN KEY ("acervo_id") REFERENCES "public"."acervo"("id") ON DELETE cascade ON UPDATE no action;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await sql.unsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "atividade_acervo_atividade_acervo_unique"
      ON "atividade_acervo" USING btree ("atividade_id", "acervo_id");
    `);

    await sql.unsafe(`
      CREATE INDEX IF NOT EXISTS "atividade_acervo_atividade_idx"
      ON "atividade_acervo" USING btree ("atividade_id");
    `);
  }
}

async function ensureSchemaReady() {
  const sql = postgres(process.env.DATABASE_URL, { max: 1, connect_timeout: 5 });

  try {
    let schemaState = await inspectSchema(sql);

    if (schemaState.missingTables.length === 0 && schemaState.missingColumns.length === 0) {
      console.log("Schema já disponível. db:push ignorado.");
      return;
    }

    if (!canApplyCompatibilityOnly(schemaState.missingTables, schemaState.missingColumns)) {
      console.log("Schema ausente ou incompleto. Executando db:push...");
      await run("npm run db:push");
      schemaState = await inspectSchema(sql);
    }

    if (schemaState.missingTables.length === 0 && schemaState.missingColumns.length === 0) {
      return;
    }

    console.log(`Schema ainda incompleto após db:push. Aplicando patches de compatibilidade: ${formatMissingSchema(schemaState.missingTables, schemaState.missingColumns)}`);
    await applyCompatibilityPatches(sql, schemaState.missingTables, schemaState.missingColumns);
    schemaState = await inspectSchema(sql);

    if (schemaState.missingTables.length > 0 || schemaState.missingColumns.length > 0) {
      throw new Error(`Schema ainda incompleto após correções: ${formatMissingSchema(schemaState.missingTables, schemaState.missingColumns)}`);
    }
  } finally {
    await sql.end({ timeout: 5 }).catch(() => undefined);
  }
}

async function run(command) {
  const exitCode = await new Promise((resolve, reject) => {
    const child = spawn(command, {
      stdio: "inherit",
      shell: true,
      env: process.env,
    });

    child.on("error", reject);
    child.on("exit", (code) => resolve(code ?? 1));
  });

  if (exitCode !== 0) {
    throw new Error(`Comando falhou (${exitCode}): ${command}`);
  }
}

async function main() {
  await ensureSchemaReady();

  await run("npm run db:seed:rbac");
  await run("npm run db:seed:admin");
  await run("npm run content:import:editorial");
  await run("npm run db:seed:homologation");
  await run("npm run db:seed:pedagogical-tracks");
}

main().catch((error) => {
  console.error("Falha no bootstrap do site:", error.message);
  process.exit(1);
});

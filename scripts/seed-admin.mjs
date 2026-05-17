import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { loadRuntimeEnv } from "./load-runtime-env.mjs";

loadRuntimeEnv();

const requiredEnv = ["DATABASE_URL", "ADMIN_EMAIL", "ADMIN_PASSWORD_HASH"];
const missingEnv = requiredEnv.filter((name) => !process.env[name]);

if (missingEnv.length > 0) {
  console.error(`Variáveis ausentes: ${missingEnv.join(", ")}`);
  process.exit(1);
}

const sql = postgres(process.env.DATABASE_URL, { max: 1 });
const adminEmail = process.env.ADMIN_EMAIL.trim().toLowerCase();
const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH.trim();
const adminName = (process.env.ADMIN_NAME ?? "Admin Museu do Mar").trim() || "Admin Museu do Mar";

async function main() {
  await sql`
    insert into users (
      id,
      email,
      password_hash,
      name,
      is_admin,
      status,
      primary_role,
      created_at
    ) values (
      ${randomUUID()},
      ${adminEmail},
      ${adminPasswordHash},
      ${adminName},
      true,
      ${"ativo"},
      ${"superadmin"},
      ${new Date()}
    )
    on conflict (email) do update set
      password_hash = excluded.password_hash,
      name = excluded.name,
      is_admin = true,
      status = excluded.status,
      primary_role = excluded.primary_role
  `;

  const [user] = await sql`
    select id from users where email = ${adminEmail} limit 1
  `;

  const [role] = await sql`
    select id from roles where slug = ${"superadmin"} limit 1
  `;

  if (user?.id && role?.id) {
    await sql`
      insert into user_roles (id, user_id, role_id, is_primary, created_at)
      values (${randomUUID()}, ${user.id}, ${role.id}, true, ${new Date()})
      on conflict (user_id, role_id) do update set
        is_primary = excluded.is_primary
    `;
  }

  console.log(`Admin sincronizado: ${adminEmail}`);
}

main()
  .catch((error) => {
    console.error("Falha ao sincronizar admin:", error.message);
    process.exit(1);
  })
  .finally(async () => {
    await sql.end({ timeout: 5 });
  });

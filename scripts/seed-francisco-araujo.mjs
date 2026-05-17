import { randomUUID } from "node:crypto";
import postgres from "postgres";
import bcrypt from "bcryptjs";
import { loadRuntimeEnv } from "./load-runtime-env.mjs";

loadRuntimeEnv();

const sql = postgres(process.env.DATABASE_URL);

async function main() {
  console.log("Seeding EMEF Francisco Araújo...");

  const instId = randomUUID();
  const teacherId = randomUUID();
  const passwordHash = await bcrypt.hash("francisco2026", 10);

  // 1. Criar Instituição
  await sql`
    INSERT INTO instituicoes (id, nome, tipo, cidade, estado, ativo)
    VALUES (${instId}, 'EMEF Francisco Araújo', 'escola', 'Guarapari', 'ES', true)
    ON CONFLICT DO NOTHING
  `;

  // 2. Criar Usuário Professor
  const [user] = await sql`
    INSERT INTO users (id, name, email, password_hash, is_admin, status)
    VALUES (${teacherId}, 'Professor Francisco', 'professor@franciscoaraujo.edu.br', ${passwordHash}, false, 'ativo')
    ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
    RETURNING id
  `;
  const actualTeacherId = user.id;

  // 3. Vincular Professor à Instituição
  await sql`
    INSERT INTO user_instituicoes (id, user_id, instituicao_id, funcao_institucional, is_primary)
    VALUES (${randomUUID()}, ${actualTeacherId}, ${instId}, 'Professor Regente', true)
    ON CONFLICT DO NOTHING
  `;

  // 4. Criar Perfil
  await sql`
    INSERT INTO profiles (id, user_id, display_name, school_name, city, state, profile_type)
    VALUES (${randomUUID()}, ${actualTeacherId}, 'Prof. Francisco', 'EMEF Francisco Araújo', 'Guarapari', 'ES', 'professor')
    ON CONFLICT (user_id) DO UPDATE SET school_name = EXCLUDED.school_name
  `;

  // 5. Atribuir Papel de Professor
  const [role] = await sql`SELECT id FROM roles WHERE slug = 'professor'`;
  if (role) {
    await sql`
      INSERT INTO user_roles (id, user_id, role_id, is_primary)
      VALUES (${randomUUID()}, ${actualTeacherId}, ${role.id}, true)
      ON CONFLICT DO NOTHING
    `;
  }

  // 6. Criar uma Turma de Teste
  const turmaId = randomUUID();
  await sql`
    INSERT INTO turmas (id, instituicao_id, nome, ano_letivo, segmento, turno, responsavel_user_id, ativo)
    VALUES (${turmaId}, ${instId}, '5º Ano A - Perocão', 2026, 'Fundamental I', 'Matutino', ${actualTeacherId}, true)
    ON CONFLICT DO NOTHING
  `;

  console.log("Done.");
  console.log(`Teacher Login: professor@franciscoaraujo.edu.br / francisco2026`);
  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

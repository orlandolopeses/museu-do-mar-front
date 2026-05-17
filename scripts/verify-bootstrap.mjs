import postgres from "postgres";
import { loadRuntimeEnv } from "./load-runtime-env.mjs";

loadRuntimeEnv();

const isDryRun = process.argv.includes("--dry-run");

const expectedPostSlugs = [
  "o-que-e-o-museu-do-mar-na-rng",
  "artefatos-da-pesca-artesanal-objetos-que-guardam-saberes-do-mar",
  "perocao-territorio-memoria-e-transformacao",
];
const expectedPedagogicalTracks = {
  professor: [
    "territorio-memoria",
    "agenda-mediacao",
    "acompanhamento-turma",
  ],
  estudante: [
    "explorar-territorio",
    "participar-da-agenda",
    "trilha-da-turma",
  ],
};
const expectedRoles = ["superadmin", "editor", "curador", "moderador_comunitario", "professor", "estudante", "gestor_educacional", "comunidade", "parceiro", "comunicador"];

const expectedAcervoTitle = "Documento-base: artefatos da pesca artesanal no Espírito Santo";
const expectedEventoTitle = "Encontro de homologação do acervo e memórias do Perocão";
const expectedInstitutionName = "Escola Comunitária do Perocão";
const expectedForumTitle = "Memórias do Perocão: o que não pode faltar no Museu do Mar?";
const expectedForumReplyAuthor = "Homologação Comunitária";
const expectedTeacherEmail = "professor.teste@museudomar.local";
const expectedTeacherTurmaName = "Turma restrita de teste";
const expectedManagerEmail = "gestor.educacional@museudomar.local";

function printDryRun() {
  console.log("VERIFY BOOTSTRAP DRY RUN");
  console.log("- verifica pelo menos 1 admin em users com is_admin=true");
  console.log(`- verifica papéis RBAC: ${expectedRoles.join(", ")}`);
  console.log(`- verifica posts editoriais: ${expectedPostSlugs.join(", ")}`);
  console.log(`- verifica trilhas pedagógicas professor: ${expectedPedagogicalTracks.professor.join(", ")}`);
  console.log(`- verifica trilhas pedagógicas estudante: ${expectedPedagogicalTracks.estudante.join(", ")}`);
  console.log(`- verifica item de acervo: ${expectedAcervoTitle}`);
  console.log(`- verifica evento de homologação: ${expectedEventoTitle}`);
  console.log(`- verifica instituição vinculada: ${expectedInstitutionName}`);
  console.log(`- verifica professor de homologação: ${expectedTeacherEmail}`);
  console.log(`- verifica gestor educacional de homologação: ${expectedManagerEmail}`);
  console.log(`- verifica turma restrita de homologação: ${expectedTeacherTurmaName}`);
  console.log(`- verifica tópico inicial do fórum: ${expectedForumTitle}`);
  console.log(`- verifica resposta inicial do fórum: ${expectedForumReplyAuthor}`);
}

if (isDryRun) {
  printDryRun();
  process.exit(0);
}

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL não definida. Use --dry-run para validar sem banco.");
  process.exit(1);
}

const sql = postgres(process.env.DATABASE_URL, { max: 1 });

async function main() {
  const [adminCountResult] = await sql`
    select count(*)::int as count from users where is_admin = true
  `;

  const roleRows = await sql`
    select slug from roles where slug in ${sql(expectedRoles)}
  `;

  const postRows = await sql`
    select slug, status from posts where slug in ${sql(expectedPostSlugs)}
  `;

  const pedagogicalTrackRows = await sql`
    select slug, audience, active
    from trilhas_pedagogicas
    where slug in ${sql([
      ...expectedPedagogicalTracks.professor,
      ...expectedPedagogicalTracks.estudante,
    ])}
  `;

  const [acervoResult] = await sql`
    select id, publicado from acervo where titulo = ${expectedAcervoTitle} limit 1
  `;

  const [eventoResult] = await sql`
    select id, publicado, instituicao_id from eventos where titulo = ${expectedEventoTitle} limit 1
  `;

  const [institutionResult] = await sql`
    select id, ativo from instituicoes where nome = ${expectedInstitutionName} limit 1
  `;

  const [teacherResult] = await sql`
    select u.id from users u
    inner join user_roles ur on ur.user_id = u.id
    inner join roles r on r.id = ur.role_id
    where u.email = ${expectedTeacherEmail}
      and r.slug = ${"professor"}
    limit 1
  `;

  const [teacherInstitutionLinkResult] = await sql`
    select id from user_instituicoes
    where user_id = ${teacherResult?.id ?? null}
      and instituicao_id = ${institutionResult?.id ?? null}
    limit 1
  `;

  const [teacherTurmaResult] = await sql`
    select id, responsavel_user_id from turmas where nome = ${expectedTeacherTurmaName} limit 1
  `;

  const [managerResult] = await sql`
    select u.id from users u
    inner join user_roles ur on ur.user_id = u.id
    inner join roles r on r.id = ur.role_id
    where u.email = ${expectedManagerEmail}
      and r.slug = ${"gestor_educacional"}
    limit 1
  `;

  const [managerInstitutionLinkResult] = await sql`
    select id from user_instituicoes
    where user_id = ${managerResult?.id ?? null}
      and instituicao_id = ${institutionResult?.id ?? null}
    limit 1
  `;

  const [forumTopicoResult] = await sql`
    select id, status, pinned from forum_topicos where titulo = ${expectedForumTitle} limit 1
  `;

  const [forumRespostaResult] = await sql`
    select id from forum_respostas
    where topico_id = ${forumTopicoResult?.id ?? null}
      and autor_nome = ${expectedForumReplyAuthor}
    limit 1
  `;

  const foundSlugs = new Set(postRows.map((row) => row.slug));
  const missingSlugs = expectedPostSlugs.filter((slug) => !foundSlugs.has(slug));
  const foundRoles = new Set(roleRows.map((row) => row.slug));
  const missingRoles = expectedRoles.filter((slug) => !foundRoles.has(slug));
  const foundPedagogicalTrackKeys = new Set(
    pedagogicalTrackRows
      .filter((row) => row.active)
      .map((row) => `${row.audience}:${row.slug}`),
  );
  const missingProfessorTracks = expectedPedagogicalTracks.professor.filter(
    (slug) => !foundPedagogicalTrackKeys.has(`professor:${slug}`),
  );
  const missingStudentTracks = expectedPedagogicalTracks.estudante.filter(
    (slug) => !foundPedagogicalTrackKeys.has(`estudante:${slug}`),
  );

  console.log(`Admins encontrados: ${adminCountResult?.count ?? 0}`);
  console.log(`Papéis RBAC encontrados: ${roleRows.length}/${expectedRoles.length}`);
  console.log(`Posts editoriais encontrados: ${postRows.length}/${expectedPostSlugs.length}`);
  console.log(`Trilhas pedagógicas (professor) encontradas: ${expectedPedagogicalTracks.professor.length - missingProfessorTracks.length}/${expectedPedagogicalTracks.professor.length}`);
  console.log(`Trilhas pedagógicas (estudante) encontradas: ${expectedPedagogicalTracks.estudante.length - missingStudentTracks.length}/${expectedPedagogicalTracks.estudante.length}`);
  console.log(`Acervo de homologação: ${acervoResult ? "ok" : "ausente"}`);
  console.log(`Evento de homologação: ${eventoResult ? "ok" : "ausente"}`);
  console.log(`Instituição de homologação: ${institutionResult ? "ok" : "ausente"}`);
  console.log(`Professor de homologação: ${teacherResult ? "ok" : "ausente"}`);
  console.log(`Vínculo institucional do professor: ${teacherInstitutionLinkResult ? "ok" : "ausente"}`);
  console.log(`Gestor educacional de homologação: ${managerResult ? "ok" : "ausente"}`);
  console.log(`Vínculo institucional do gestor: ${managerInstitutionLinkResult ? "ok" : "ausente"}`);
  console.log(`Turma restrita de homologação: ${teacherTurmaResult ? "ok" : "ausente"}`);
  console.log(`Tópico inicial do fórum: ${forumTopicoResult ? "ok" : "ausente"}`);
  console.log(`Resposta inicial do fórum: ${forumRespostaResult ? "ok" : "ausente"}`);

  if ((adminCountResult?.count ?? 0) < 1) {
    throw new Error("Nenhum admin encontrado em users.");
  }

  if (missingRoles.length > 0) {
    throw new Error(`Papéis RBAC ausentes: ${missingRoles.join(", ")}`);
  }

  if (missingSlugs.length > 0) {
    throw new Error(`Posts editoriais ausentes: ${missingSlugs.join(", ")}`);
  }

  if (missingProfessorTracks.length > 0) {
    throw new Error(`Trilhas pedagógicas de professor ausentes/inativas: ${missingProfessorTracks.join(", ")}`);
  }

  if (missingStudentTracks.length > 0) {
    throw new Error(`Trilhas pedagógicas de estudante ausentes/inativas: ${missingStudentTracks.join(", ")}`);
  }

  if (!acervoResult) {
    throw new Error("Item de acervo de homologação não encontrado.");
  }

  if (!eventoResult) {
    throw new Error("Evento de homologação não encontrado.");
  }

  if (!institutionResult) {
    throw new Error("Instituição de homologação não encontrada.");
  }

  if (!teacherResult) {
    throw new Error("Professor de homologação não encontrado com papel professor.");
  }

  if (!teacherInstitutionLinkResult) {
    throw new Error("Professor de homologação não está vinculado à instituição esperada.");
  }

  if (!managerResult) {
    throw new Error("Gestor educacional de homologação não encontrado com papel gestor_educacional.");
  }

  if (!managerInstitutionLinkResult) {
    throw new Error("Gestor educacional de homologação não está vinculado à instituição esperada.");
  }

  if (!teacherTurmaResult) {
    throw new Error("Turma restrita de homologação não encontrada.");
  }

  if (teacherTurmaResult.responsavel_user_id !== teacherResult.id) {
    throw new Error("Turma restrita de homologação não está vinculada ao professor esperado.");
  }

  if (eventoResult.instituicao_id !== institutionResult.id) {
    throw new Error("Evento de homologação não está vinculado à instituição esperada.");
  }

  if (!forumTopicoResult) {
    throw new Error("Tópico inicial do fórum não encontrado.");
  }

  if (!forumRespostaResult) {
    throw new Error("Resposta inicial do fórum não encontrada.");
  }

  console.log("Bootstrap verificado com sucesso.");
}

main()
  .catch((error) => {
    console.error("Falha na verificação do bootstrap:", error.message);
    process.exit(1);
  })
  .finally(async () => {
    await sql.end({ timeout: 5 });
  });

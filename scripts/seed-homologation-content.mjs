import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import postgres from "postgres";
import { loadRuntimeEnv } from "./load-runtime-env.mjs";

loadRuntimeEnv();

const isDryRun = process.argv.includes("--dry-run");
const publish = process.env.HOMOLOGATION_PUBLISH === "true";

const institutionItem = {
  nome: "Escola Comunitária do Perocão",
  tipo: "escola",
  cidade: "Guarapari",
  estado: "ES",
  responsavelNome: "Articulação local Museu do Mar",
  responsavelEmail: null,
  ativo: true,
};

const institutionLinkItem = {
  funcaoInstitucional: "Referência pedagógica de homologação",
  isPrimary: true,
};

const teacherItem = {
  email: (process.env.HOMOLOGATION_TEACHER_EMAIL ?? "professor.teste@museudomar.local").trim().toLowerCase(),
  password: process.env.HOMOLOGATION_TEACHER_PASSWORD ?? "ProfessorTeste2026!",
  name: (process.env.HOMOLOGATION_TEACHER_NAME ?? "Professor Restrito de Teste").trim() || "Professor Restrito de Teste",
  primaryRole: "professor",
};

const managerItem = {
  email: (process.env.HOMOLOGATION_MANAGER_EMAIL ?? "gestor.educacional@museudomar.local").trim().toLowerCase(),
  password: process.env.HOMOLOGATION_MANAGER_PASSWORD ?? "GestorEducacional2026!",
  name: (process.env.HOMOLOGATION_MANAGER_NAME ?? "Gestora Educacional de Teste").trim() || "Gestora Educacional de Teste",
  primaryRole: "gestor_educacional",
};

const teacherInstitutionLinkItem = {
  funcaoInstitucional: "Professor responsável de teste",
  isPrimary: true,
};

const managerInstitutionLinkItem = {
  funcaoInstitucional: "Gestão educacional de homologação",
  isPrimary: true,
};

const turmaItem = {
  nome: "Turma piloto de homologação",
  anoLetivo: 2026,
  segmento: "Ensino fundamental II",
  turno: "Vespertino",
  ativo: true,
};

const teacherTurmaItem = {
  nome: "Turma restrita de teste",
  anoLetivo: 2026,
  segmento: "Ensino fundamental II",
  turno: "Matutino",
  ativo: true,
};

const acervoItem = {
  tipo: "documento",
  titulo: "Documento-base: artefatos da pesca artesanal no Espírito Santo",
  descricao:
    "Item de homologação do acervo digital. Referência documental inicial para o eixo curatorial de cultura pesqueira e saberes do mar, com foco em técnicas, objetos e práticas da pesca artesanal.",
  url: "https://drive.google.com/file/d/15BFQV2OgEWguLZvVllFVL0_UFGbhubWC/view",
  thumbUrl: null,
  tags: "pesca-artesanal,artefatos,perocao,guarapari,acervo-documental,patrimonio-cultural",
  colecao: "Documentos do território",
  autor: "Base documental BTD Perocão",
  ano: 2026,
  publicado: publish,
};

const eventoItem = {
  titulo: "Encontro de homologação do acervo e memórias do Perocão",
  descricao:
    "Programação de referência para homologação do site. Proposta de roda de conversa e apresentação pública do acervo digital, com foco em memórias da comunidade, cultura pesqueira e próximos passos do Museu do Mar.",
  local: "Aldeia de Perocão · Guarapari/ES",
  categoria: "Roda de memória",
  coverImage: null,
  linkExterno: null,
  dataInicio: new Date("2026-04-18T14:00:00-03:00"),
  dataFim: new Date("2026-04-18T16:30:00-03:00"),
  publicado: publish,
};

const forumTopicoItem = {
  titulo: "Memórias do Perocão: o que não pode faltar no Museu do Mar?",
  conteudo:
    "Este tópico inaugural do fórum foi criado para a homologação do site. A proposta é reunir lembranças, objetos, histórias e temas que a comunidade considera indispensáveis para a construção do Museu do Mar na região de Perocão.\n\nSe você estivesse organizando a primeira exposição, que memórias, fotografias, embarcações, artefatos da pesca ou relatos de moradores deveriam estar presentes?",
  autorNome: "Equipe Museu do Mar",
  autorEmail: null,
  status: "aberto",
  pinned: true,
};

const forumRespostaItem = {
  autorNome: "Homologação Comunitária",
  autorEmail: null,
  conteudo:
    "Como resposta inicial de homologação, sugerimos destacar as redes de pesca artesanal, os saberes de maré, as histórias das famílias do território e os registros das transformações da praia do Perocão ao longo das últimas décadas.",
};

function printPlannedChanges() {
  console.log("HOMOLOGATION DRY RUN");
  console.log(`- instituição: ${institutionItem.nome} | tipo=${institutionItem.tipo} | ativa=${String(institutionItem.ativo)}`);
  console.log(`- vínculo institucional admin: ${institutionLinkItem.funcaoInstitucional} | primário=${String(institutionLinkItem.isPrimary)}`);
  console.log(`- turma demo: ${turmaItem.nome} | ano=${turmaItem.anoLetivo} | turno=${turmaItem.turno}`);
  console.log(`- professor de homologação: ${teacherItem.email} | papel=${teacherItem.primaryRole}`);
  console.log(`- gestor educacional de homologação: ${managerItem.email} | papel=${managerItem.primaryRole}`);
  console.log(`- vínculo institucional professor: ${teacherInstitutionLinkItem.funcaoInstitucional} | primário=${String(teacherInstitutionLinkItem.isPrimary)}`);
  console.log(`- vínculo institucional gestor: ${managerInstitutionLinkItem.funcaoInstitucional} | primário=${String(managerInstitutionLinkItem.isPrimary)}`);
  console.log(`- turma restrita: ${teacherTurmaItem.nome} | ano=${teacherTurmaItem.anoLetivo} | turno=${teacherTurmaItem.turno}`);
  console.log(`- acervo: ${acervoItem.titulo} | publicado=${String(acervoItem.publicado)}`);
  console.log(`- evento: ${eventoItem.titulo} | publicado=${String(eventoItem.publicado)}`);
  console.log(`- fórum: ${forumTopicoItem.titulo} | fixado=${String(forumTopicoItem.pinned)} | status=${forumTopicoItem.status}`);
  console.log(`- resposta inicial do fórum: ${forumRespostaItem.autorNome}`);
}

if (isDryRun) {
  printPlannedChanges();
  process.exit(0);
}

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL não definida. Use --dry-run para validar sem banco.");
  process.exit(1);
}

const sql = postgres(process.env.DATABASE_URL, { max: 1 });

async function upsertInstitution() {
  const existing = await sql`
    select id from instituicoes where nome = ${institutionItem.nome} limit 1
  `;

  if (existing.length > 0) {
    await sql`
      update instituicoes
      set
        tipo = ${institutionItem.tipo},
        cidade = ${institutionItem.cidade},
        estado = ${institutionItem.estado},
        responsavel_nome = ${institutionItem.responsavelNome},
        responsavel_email = ${institutionItem.responsavelEmail},
        ativo = ${institutionItem.ativo}
      where id = ${existing[0].id}
    `;

    console.log(`Instituição atualizada: ${institutionItem.nome}`);
    return existing[0].id;
  }

  const id = randomUUID();

  await sql`
    insert into instituicoes (
      id,
      nome,
      tipo,
      cidade,
      estado,
      responsavel_nome,
      responsavel_email,
      ativo,
      created_at
    ) values (
      ${id},
      ${institutionItem.nome},
      ${institutionItem.tipo},
      ${institutionItem.cidade},
      ${institutionItem.estado},
      ${institutionItem.responsavelNome},
      ${institutionItem.responsavelEmail},
      ${institutionItem.ativo},
      ${new Date()}
    )
  `;

  console.log(`Instituição criada: ${institutionItem.nome}`);
  return id;
}

async function resolveAdminUserId() {
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();

  if (!adminEmail) {
    return null;
  }

  const existing = await sql`
    select id from users where email = ${adminEmail} limit 1
  `;

  return existing[0]?.id ?? null;
}

async function resolveRoleId(roleSlug) {
  const existing = await sql`
    select id from roles where slug = ${roleSlug} limit 1
  `;

  return existing[0]?.id ?? null;
}

async function upsertTeacherUser() {
  const passwordHash = await bcrypt.hash(teacherItem.password, 10);

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
      ${teacherItem.email},
      ${passwordHash},
      ${teacherItem.name},
      false,
      ${"ativo"},
      ${teacherItem.primaryRole},
      ${new Date()}
    )
    on conflict (email) do update set
      password_hash = excluded.password_hash,
      name = excluded.name,
      is_admin = false,
      status = excluded.status,
      primary_role = excluded.primary_role
  `;

  const existing = await sql`
    select id from users where email = ${teacherItem.email} limit 1
  `;

  console.log(`Professor de homologação sincronizado: ${teacherItem.email}`);
  return existing[0]?.id ?? null;
}

async function upsertManagerUser() {
  const passwordHash = await bcrypt.hash(managerItem.password, 10);

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
      ${managerItem.email},
      ${passwordHash},
      ${managerItem.name},
      false,
      ${"ativo"},
      ${managerItem.primaryRole},
      ${new Date()}
    )
    on conflict (email) do update set
      password_hash = excluded.password_hash,
      name = excluded.name,
      is_admin = false,
      status = excluded.status,
      primary_role = excluded.primary_role
  `;

  const existing = await sql`
    select id from users where email = ${managerItem.email} limit 1
  `;

  console.log(`Gestor educacional de homologação sincronizado: ${managerItem.email}`);
  return existing[0]?.id ?? null;
}

async function ensureUserRole(userId, roleSlug) {
  if (!userId) {
    return;
  }

  const roleId = await resolveRoleId(roleSlug);
  if (!roleId) {
    throw new Error(`Papel ausente no banco: ${roleSlug}`);
  }

  await sql`
    insert into user_roles (
      id,
      user_id,
      role_id,
      is_primary,
      created_at
    ) values (
      ${randomUUID()},
      ${userId},
      ${roleId},
      true,
      ${new Date()}
    )
    on conflict (user_id, role_id) do update set
      is_primary = excluded.is_primary
  `;

  console.log(`Papel sincronizado para usuário: ${roleSlug}`);
}

async function upsertInstitutionLink(userId, instituicaoId, linkItem, label) {
  if (!userId || !instituicaoId) {
    return;
  }

  await sql`
    insert into user_instituicoes (
      id,
      user_id,
      instituicao_id,
      funcao_institucional,
      is_primary,
      created_at
    ) values (
      ${randomUUID()},
      ${userId},
      ${instituicaoId},
      ${linkItem.funcaoInstitucional},
      ${linkItem.isPrimary},
      ${new Date()}
    )
    on conflict (user_id, instituicao_id) do update set
      funcao_institucional = excluded.funcao_institucional,
      is_primary = excluded.is_primary
  `;

  console.log(`Vínculo institucional sincronizado: ${label}`);
}

async function upsertTurma(turma, instituicaoId, responsavelUserId) {
  if (!instituicaoId) {
    return;
  }

  const existing = await sql`
    select id from turmas
    where instituicao_id = ${instituicaoId}
      and nome = ${turma.nome}
    limit 1
  `;

  if (existing.length > 0) {
    await sql`
      update turmas
      set
        ano_letivo = ${turma.anoLetivo},
        segmento = ${turma.segmento},
        turno = ${turma.turno},
        responsavel_user_id = ${responsavelUserId},
        ativo = ${turma.ativo}
      where id = ${existing[0].id}
    `;

    console.log(`Turma sincronizada: ${turma.nome}`);
    return existing[0].id;
  }

  const id = randomUUID();

  await sql`
    insert into turmas (
      id,
      instituicao_id,
      nome,
      ano_letivo,
      segmento,
      turno,
      responsavel_user_id,
      ativo,
      created_at
    ) values (
      ${id},
      ${instituicaoId},
      ${turma.nome},
      ${turma.anoLetivo},
      ${turma.segmento},
      ${turma.turno},
      ${responsavelUserId},
      ${turma.ativo},
      ${new Date()}
    )
  `;

  console.log(`Turma criada: ${turma.nome}`);
  return id;
}

async function upsertAcervo() {
  const existing = await sql`
    select id from acervo where titulo = ${acervoItem.titulo} limit 1
  `;

  if (existing.length > 0) {
    await sql`
      update acervo
      set
        tipo = ${acervoItem.tipo},
        descricao = ${acervoItem.descricao},
        url = ${acervoItem.url},
        thumb_url = ${acervoItem.thumbUrl},
        tags = ${acervoItem.tags},
        colecao = ${acervoItem.colecao},
        autor = ${acervoItem.autor},
        ano = ${acervoItem.ano},
        publicado = ${acervoItem.publicado}
      where id = ${existing[0].id}
    `;

    console.log(`Acervo atualizado: ${acervoItem.titulo}`);
    return;
  }

  await sql`
    insert into acervo (
      id,
      tipo,
      titulo,
      descricao,
      url,
      thumb_url,
      tags,
      colecao,
      autor,
      ano,
      publicado,
      created_at
    ) values (
      ${randomUUID()},
      ${acervoItem.tipo},
      ${acervoItem.titulo},
      ${acervoItem.descricao},
      ${acervoItem.url},
      ${acervoItem.thumbUrl},
      ${acervoItem.tags},
      ${acervoItem.colecao},
      ${acervoItem.autor},
      ${acervoItem.ano},
      ${acervoItem.publicado},
      ${new Date()}
    )
  `;

  console.log(`Acervo criado: ${acervoItem.titulo}`);
}

async function upsertEvento(instituicaoId) {
  const existing = await sql`
    select id from eventos where titulo = ${eventoItem.titulo} limit 1
  `;

  if (existing.length > 0) {
    await sql`
      update eventos
      set
        descricao = ${eventoItem.descricao},
        instituicao_id = ${instituicaoId},
        local = ${eventoItem.local},
        categoria = ${eventoItem.categoria},
        cover_image = ${eventoItem.coverImage},
        link_externo = ${eventoItem.linkExterno},
        data_inicio = ${eventoItem.dataInicio},
        data_fim = ${eventoItem.dataFim},
        publicado = ${eventoItem.publicado}
      where id = ${existing[0].id}
    `;

    console.log(`Evento atualizado: ${eventoItem.titulo}`);
    return;
  }

  await sql`
    insert into eventos (
      id,
      titulo,
      descricao,
      instituicao_id,
      local,
      data_inicio,
      data_fim,
      categoria,
      cover_image,
      link_externo,
      publicado,
      created_at
    ) values (
      ${randomUUID()},
      ${eventoItem.titulo},
      ${eventoItem.descricao},
      ${instituicaoId},
      ${eventoItem.local},
      ${eventoItem.dataInicio},
      ${eventoItem.dataFim},
      ${eventoItem.categoria},
      ${eventoItem.coverImage},
      ${eventoItem.linkExterno},
      ${eventoItem.publicado},
      ${new Date()}
    )
  `;

  console.log(`Evento criado: ${eventoItem.titulo}`);
}

async function upsertForumTopico() {
  const existing = await sql`
    select id from forum_topicos where titulo = ${forumTopicoItem.titulo} limit 1
  `;

  if (existing.length > 0) {
    await sql`
      update forum_topicos
      set
        conteudo = ${forumTopicoItem.conteudo},
        autor_nome = ${forumTopicoItem.autorNome},
        autor_email = ${forumTopicoItem.autorEmail},
        status = ${forumTopicoItem.status},
        pinned = ${forumTopicoItem.pinned}
      where id = ${existing[0].id}
    `;

    console.log(`Tópico do fórum atualizado: ${forumTopicoItem.titulo}`);
    return existing[0].id;
  }

  const id = randomUUID();

  await sql`
    insert into forum_topicos (
      id,
      titulo,
      conteudo,
      autor_nome,
      autor_email,
      status,
      pinned,
      created_at
    ) values (
      ${id},
      ${forumTopicoItem.titulo},
      ${forumTopicoItem.conteudo},
      ${forumTopicoItem.autorNome},
      ${forumTopicoItem.autorEmail},
      ${forumTopicoItem.status},
      ${forumTopicoItem.pinned},
      ${new Date()}
    )
  `;

  console.log(`Tópico do fórum criado: ${forumTopicoItem.titulo}`);
  return id;
}

async function upsertForumResposta(topicoId) {
  const existing = await sql`
    select id from forum_respostas
    where topico_id = ${topicoId}
      and autor_nome = ${forumRespostaItem.autorNome}
    limit 1
  `;

  if (existing.length > 0) {
    await sql`
      update forum_respostas
      set
        conteudo = ${forumRespostaItem.conteudo},
        autor_email = ${forumRespostaItem.autorEmail}
      where id = ${existing[0].id}
    `;

    console.log(`Resposta inicial do fórum atualizada: ${forumRespostaItem.autorNome}`);
    return;
  }

  await sql`
    insert into forum_respostas (
      id,
      topico_id,
      conteudo,
      autor_nome,
      autor_email,
      created_at
    ) values (
      ${randomUUID()},
      ${topicoId},
      ${forumRespostaItem.conteudo},
      ${forumRespostaItem.autorNome},
      ${forumRespostaItem.autorEmail},
      ${new Date()}
    )
  `;

  console.log(`Resposta inicial do fórum criada: ${forumRespostaItem.autorNome}`);
}

async function main() {
  const instituicaoId = await upsertInstitution();
  const adminUserId = await resolveAdminUserId();
  const teacherUserId = await upsertTeacherUser();
  const managerUserId = await upsertManagerUser();
  await ensureUserRole(teacherUserId, teacherItem.primaryRole);
  await ensureUserRole(managerUserId, managerItem.primaryRole);
  await upsertInstitutionLink(adminUserId, instituicaoId, institutionLinkItem, "admin de homologação");
  await upsertInstitutionLink(teacherUserId, instituicaoId, teacherInstitutionLinkItem, "professor de homologação");
  await upsertInstitutionLink(managerUserId, instituicaoId, managerInstitutionLinkItem, "gestor educacional de homologação");
  await upsertTurma(turmaItem, instituicaoId, adminUserId);
  await upsertTurma(teacherTurmaItem, instituicaoId, teacherUserId);
  await upsertAcervo();
  await upsertEvento(instituicaoId);
  const forumTopicoId = await upsertForumTopico();
  await upsertForumResposta(forumTopicoId);
}

main()
  .catch((error) => {
    console.error("Falha ao semear conteúdo de homologação:", error.message);
    process.exit(1);
  })
  .finally(async () => {
    await sql.end({ timeout: 5 });
  });

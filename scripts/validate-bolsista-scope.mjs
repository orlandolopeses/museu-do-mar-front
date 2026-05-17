import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import postgres from "postgres";
import { loadRuntimeEnv } from "./load-runtime-env.mjs";

loadRuntimeEnv();

const expectedInstitutionName = "Escola Comunitária do Perocão";
const baseUrl = (process.env.SCOPE_SMOKE_BASE_URL || process.env.NEXTAUTH_URL || "http://127.0.0.1:3002").replace(/\/$/, "");

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL não definida.");
  process.exit(1);
}

class CookieJar {
  constructor() {
    this.cookies = new Map();
  }

  setFromHeaders(headers) {
    const setCookie = typeof headers.getSetCookie === "function"
      ? headers.getSetCookie()
      : headers.get("set-cookie")
        ? [headers.get("set-cookie")]
        : [];

    for (const entry of setCookie) {
      const [cookiePart] = entry.split(";", 1);
      const separatorIndex = cookiePart.indexOf("=");
      if (separatorIndex <= 0) continue;

      const name = cookiePart.slice(0, separatorIndex).trim();
      const value = cookiePart.slice(separatorIndex + 1).trim();
      if (name) this.cookies.set(name, value);
    }
  }

  toHeader() {
    return [...this.cookies.entries()].map(([name, value]) => `${name}=${value}`).join("; ");
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function extractForms(html) {
  return [...html.matchAll(/<form\b[\s\S]*?<\/form>/gi)].map((match) => match[0]);
}

function extractActionName(formHtml) {
  const match = formHtml.match(/name="(\$ACTION_ID_[^"]+)"/);
  return match?.[1] ?? null;
}

function findFormByField(html, marker, fieldName) {
  const markerIndex = html.indexOf(marker);
  assert(markerIndex >= 0, `Marcador não encontrado no HTML: ${marker}`);
  const forms = extractForms(html.slice(markerIndex));
  const form = forms.find((candidate) => candidate.includes(`name="${fieldName}"`));
  assert(form, `Formulário com campo ${fieldName} não encontrado após ${marker}.`);
  return form;
}

function findFormByTrackingId(html, trackingId) {
  const forms = extractForms(html);
  const form = forms.find((candidate) => candidate.includes('name="trackingId"') && candidate.includes(`value="${trackingId}"`));
  assert(form, `Formulário de atualização não encontrado para trackingId=${trackingId}.`);
  return form;
}

async function request(jar, path, init = {}) {
  const headers = new Headers(init.headers || {});
  const cookieHeader = jar.toHeader();
  if (cookieHeader) headers.set("cookie", cookieHeader);

  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers,
    redirect: init.redirect || "manual",
  });

  jar.setFromHeaders(response.headers);
  return response;
}

async function login(jar, email, password) {
  const csrfResponse = await request(jar, "/api/auth/csrf");
  assert(csrfResponse.ok, `Falha ao obter CSRF do Auth.js em ${baseUrl}.`);
  const { csrfToken } = await csrfResponse.json();
  assert(csrfToken, "CSRF token ausente na resposta do Auth.js.");

  const body = new URLSearchParams({
    csrfToken,
    email,
    password,
    callbackUrl: `${baseUrl}/app/bolsista`,
    json: "true",
  });

  const loginResponse = await request(jar, "/api/auth/callback/credentials", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    body,
  });

  assert([200, 302, 303].includes(loginResponse.status), `Falha no callback de credenciais do bolsista: HTTP ${loginResponse.status}.`);

  const sessionResponse = await request(jar, "/api/auth/session");
  assert(sessionResponse.ok, `Falha ao ler sessão autenticada do bolsista: HTTP ${sessionResponse.status}.`);
  const session = await sessionResponse.json();
  assert(session?.user?.email === email, "Sessão autenticada não pertence ao usuário de bolsista criado para o smoke.");
}

async function getRoleId(sql, slug) {
  const [role] = await sql`
    select id from roles where slug = ${slug} limit 1
  `;

  assert(role?.id, `Papel ausente no banco: ${slug}. Rode npm run db:bootstrap.`);
  return role.id;
}

async function getInstitutionId(sql) {
  const [institution] = await sql`
    select id from instituicoes where nome = ${expectedInstitutionName} limit 1
  `;

  assert(institution?.id, `Instituição de homologação ausente: ${expectedInstitutionName}.`);
  return institution.id;
}

async function createFixture(sql, suffix) {
  const institutionId = await getInstitutionId(sql);
  const roleId = await getRoleId(sql, "bolsista");
  const userId = randomUUID();
  const email = `bolsista.smoke.${suffix}@museudomar.local`;
  const password = `BolsistaSmoke!${suffix}`;
  const passwordHash = await bcrypt.hash(password, 10);
  const ownEventId = randomUUID();
  const foreignInstitutionId = randomUUID();
  const foreignEventId = randomUUID();
  const ownEventTitle = `Frente de apoio smoke ${suffix}`;
  const foreignEventTitle = `Frente externa bolsista ${suffix}`;
  const ownAcervoId = randomUUID();
  const ownAcervoTitle = `Acervo de apoio smoke ${suffix}`;

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
      ${userId},
      ${email},
      ${passwordHash},
      ${`Bolsista Smoke ${suffix}`},
      false,
      ${"ativo"},
      ${"bolsista"},
      now()
    )
  `;

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
      now()
    )
  `;

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
      ${institutionId},
      ${"Bolsista de homologação"},
      true,
      now()
    )
  `;

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
      created_by,
      created_at
    ) values (
      ${ownEventId},
      ${ownEventTitle},
      ${"Evento de prova operacional do bolsista."},
      ${institutionId},
      ${"Base local de homologação"},
      ${new Date("2026-05-12T14:00:00-03:00")},
      ${new Date("2026-05-12T17:00:00-03:00")},
      ${"Pesquisa"},
      ${null},
      ${null},
      true,
      ${userId},
      now()
    )
  `;

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
      ${foreignInstitutionId},
      ${`Instituição externa bolsista ${suffix}`},
      ${"escola"},
      ${"Guarapari"},
      ${"ES"},
      ${"Isolamento smoke"},
      ${null},
      true,
      now()
    )
  `;

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
      created_by,
      created_at
    ) values (
      ${foreignEventId},
      ${foreignEventTitle},
      ${"Evento externo que não deve aparecer no recorte do bolsista."},
      ${foreignInstitutionId},
      ${"Território externo"},
      ${new Date("2026-05-13T14:00:00-03:00")},
      ${new Date("2026-05-13T16:00:00-03:00")},
      ${"Pesquisa"},
      ${null},
      ${null},
      true,
      ${userId},
      now()
    )
  `;

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
      uploaded_by,
      created_at
    ) values (
      ${ownAcervoId},
      ${"documento"},
      ${ownAcervoTitle},
      ${"Item de acervo para validar leitura de apoio do bolsista."},
      ${"https://example.com/acervo-smoke-bolsista"},
      ${null},
      ${"smoke,bolsista"},
      ${"Coleção smoke"},
      ${"Homologação"},
      ${2026},
      true,
      ${userId},
      now()
    )
  `;

  return {
    userId,
    email,
    password,
    ownEventId,
    ownEventTitle,
    foreignInstitutionId,
    foreignEventId,
    foreignEventTitle,
    ownAcervoId,
    ownAcervoTitle,
  };
}

async function fetchDashboard(jar, ownEventTitle, foreignEventTitle, ownAcervoTitle) {
  const dashboardResponse = await request(jar, "/app/bolsista");
  assert(dashboardResponse.ok, `Painel do bolsista retornou HTTP ${dashboardResponse.status}.`);
  const dashboardHtml = await dashboardResponse.text();

  assert(dashboardHtml.includes("Jornada do Bolsista"), "Painel do bolsista não exibiu o heading esperado.");
  assert(dashboardHtml.includes(ownEventTitle), `Painel do bolsista não exibiu o evento vinculado ${ownEventTitle}.`);
  assert(!dashboardHtml.includes(foreignEventTitle), "Painel do bolsista vazou evento fora do vínculo institucional.");
  assert(dashboardHtml.includes(ownAcervoTitle), `Painel do bolsista não exibiu o item de acervo ${ownAcervoTitle}.`);
  assert(dashboardHtml.includes("Agenda futura filtrada pela sua rede institucional vinculada."), "Painel não sinalizou o recorte institucional esperado para o bolsista.");

  return dashboardHtml;
}

async function submitCreate(jar, actionName, ownEventId, payload) {
  const form = new FormData();
  form.set(actionName, "");
  form.set("origin", "bolsista");
  form.set("referenciaEventoId", ownEventId);
  form.set("titulo", payload.titulo);
  form.set("resumo", payload.resumo);
  form.set("status", payload.status);
  form.set("proximoPasso", payload.proximoPasso);
  form.set("apoioNecessario", payload.apoioNecessario);

  const response = await request(jar, "/app/bolsista", {
    method: "POST",
    body: form,
  });

  assert([200, 302, 303].includes(response.status), `POST de createSecondaryJourneyTracking falhou com HTTP ${response.status}.`);
}

async function submitUpdate(jar, actionName, trackingId, payload) {
  const form = new FormData();
  form.set(actionName, "");
  form.set("origin", "bolsista");
  form.set("trackingId", trackingId);
  form.set("titulo", payload.titulo);
  form.set("resumo", payload.resumo);
  form.set("status", payload.status);
  form.set("proximoPasso", payload.proximoPasso);
  form.set("apoioNecessario", payload.apoioNecessario);

  const response = await request(jar, "/app/bolsista", {
    method: "POST",
    body: form,
  });

  assert([200, 302, 303].includes(response.status), `POST de updateSecondaryJourneyTracking falhou com HTTP ${response.status}.`);
}

async function getTrackingByTitle(sql, userId, title) {
  const [tracking] = await sql`
    select id, titulo, resumo, proximo_passo, apoio_necessario, status, referencia_evento_id
    from acompanhamentos_jornada
    where user_id = ${userId}
      and origem = ${"bolsista"}
      and titulo = ${title}
    order by updated_at desc, created_at desc
    limit 1
  `;

  return tracking ?? null;
}

async function main() {
  const sql = postgres(process.env.DATABASE_URL, { max: 1 });
  const jar = new CookieJar();
  const suffix = Date.now().toString(36);
  let fixture = null;
  let createdTrackingId = null;

  const createPayload = {
    titulo: `Acompanhamento smoke bolsista ${suffix}`,
    resumo: `Resumo de apoio smoke ${suffix}`,
    status: "em_andamento",
    proximoPasso: `Devolver referências e apoio da frente ${suffix}.`,
    apoioNecessario: `Validar curadoria e repertório da rodada ${suffix}.`,
  };

  const updatePayload = {
    titulo: `Acompanhamento smoke bolsista ${suffix}`,
    resumo: `Resumo de apoio atualizado smoke ${suffix}`,
    status: "concluido",
    proximoPasso: `Consolidar devolutiva final da frente ${suffix}.`,
    apoioNecessario: `Apoio residual encerrado ${suffix}.`,
  };

  try {
    fixture = await createFixture(sql, suffix);
    await login(jar, fixture.email, fixture.password);

    const dashboardHtml = await fetchDashboard(jar, fixture.ownEventTitle, fixture.foreignEventTitle, fixture.ownAcervoTitle);
    const createForm = findFormByField(dashboardHtml, "Frente A ativa", "referenciaEventoId");
    const createActionName = extractActionName(createForm);
    assert(createActionName, "Action do formulário de criação não encontrada na jornada do bolsista.");

    await submitCreate(jar, createActionName, fixture.ownEventId, createPayload);

    const createdTracking = await getTrackingByTitle(sql, fixture.userId, createPayload.titulo);
    assert(createdTracking?.id, "Registro estruturado do bolsista não foi criado no banco.");
    assert(createdTracking.referencia_evento_id === fixture.ownEventId, "Registro estruturado não ficou vinculado ao evento esperado.");
    assert(createdTracking.status === createPayload.status, "Status inicial do registro estruturado diverge do payload enviado.");
    createdTrackingId = createdTracking.id;

    const createdPageResponse = await request(jar, "/app/bolsista?tracking=created");
    assert(createdPageResponse.ok, `Página do bolsista após criação retornou HTTP ${createdPageResponse.status}.`);
    const createdPageHtml = await createdPageResponse.text();
    assert(createdPageHtml.includes("Acompanhamento estruturado salvo nesta jornada."), "Página não confirmou a criação do acompanhamento do bolsista.");

    const updateForm = findFormByTrackingId(createdPageHtml, createdTrackingId);
    const updateActionName = extractActionName(updateForm);
    assert(updateActionName, "Action do formulário de atualização não encontrada na jornada do bolsista.");

    await submitUpdate(jar, updateActionName, createdTrackingId, updatePayload);

    const updatedTracking = await getTrackingByTitle(sql, fixture.userId, updatePayload.titulo);
    assert(updatedTracking?.id === createdTrackingId, "Registro atualizado do bolsista não foi localizado após o update.");
    assert(updatedTracking.resumo === updatePayload.resumo, "Resumo do acompanhamento não foi atualizado no banco.");
    assert(updatedTracking.status === updatePayload.status, "Status do acompanhamento não foi atualizado para concluído.");

    const updatedPageResponse = await request(jar, "/app/bolsista?tracking=updated");
    assert(updatedPageResponse.ok, `Página do bolsista após update retornou HTTP ${updatedPageResponse.status}.`);
    const updatedPageHtml = await updatedPageResponse.text();
    assert(updatedPageHtml.includes("Registro recente atualizado nesta jornada."), "Página não confirmou a atualização do acompanhamento do bolsista.");
    assert(updatedPageHtml.includes(updatePayload.resumo), "Painel não exibiu o resumo atualizado do registro recente.");

    console.log(`Bolsista scope smoke OK em ${baseUrl}`);
    console.log(`- painel exibiu o evento vinculado ${fixture.ownEventTitle}`);
    console.log(`- painel exibiu o item de acervo ${fixture.ownAcervoTitle}`);
    console.log("- painel filtrou corretamente evento externo fora do vínculo institucional");
    console.log("- criação do acompanhamento estruturado persistiu no banco com referência ao evento esperado");
    console.log("- atualização do registro recente persistiu status concluído e resumo atualizado");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Falha na prova runtime do bolsista: ${message}`);
    console.error(`Verifique se a aplicação está ativa em ${baseUrl} e se o bootstrap foi executado.`);
    process.exitCode = 1;
  } finally {
    if (createdTrackingId) {
      await sql`
        delete from acompanhamentos_jornada where id = ${createdTrackingId}
      `;
    }

    if (fixture) {
      await sql`
        delete from acervo where id = ${fixture.ownAcervoId}
      `;
      await sql`
        delete from eventos where id in (${fixture.ownEventId}, ${fixture.foreignEventId})
      `;
      await sql`
        delete from instituicoes where id = ${fixture.foreignInstitutionId}
      `;
      await sql`
        delete from users where id = ${fixture.userId}
      `;
    }

    await sql.end({ timeout: 5 }).catch(() => undefined);
  }
}

main();
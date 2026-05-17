import postgres from "postgres";
import { loadRuntimeEnv } from "./load-runtime-env.mjs";

loadRuntimeEnv();

const expectedTeacherEmail = "professor.teste@museudomar.local";
const expectedTeacherPassword = "ProfessorTeste2026!";
const expectedTeacherTurmaName = "Turma restrita de teste";
const expectedAdminEmail = process.env.ADMIN_EMAIL || "museudomar.es@gmail.com";
const expectedAdminTurmaName = "Turma piloto de homologação";
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
      if (separatorIndex <= 0) {
        continue;
      }

      const name = cookiePart.slice(0, separatorIndex).trim();
      const value = cookiePart.slice(separatorIndex + 1).trim();
      if (!name) {
        continue;
      }

      this.cookies.set(name, value);
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

function extractCsrfToken(payload) {
  const parsed = JSON.parse(payload);
  assert(typeof parsed.csrfToken === "string" && parsed.csrfToken.length > 0, "CSRF token ausente na resposta do Auth.js.");
  return parsed.csrfToken;
}

async function request(jar, path, init = {}) {
  const headers = new Headers(init.headers || {});
  const cookieHeader = jar.toHeader();
  if (cookieHeader) {
    headers.set("cookie", cookieHeader);
  }

  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers,
    redirect: init.redirect || "manual",
  });

  jar.setFromHeaders(response.headers);
  return response;
}

async function loginAsTeacher(jar) {
  const csrfResponse = await request(jar, "/api/auth/csrf");
  assert(csrfResponse.ok, `Falha ao obter CSRF do Auth.js em ${baseUrl}.`);
  const csrfToken = extractCsrfToken(await csrfResponse.text());

  const body = new URLSearchParams({
    csrfToken,
    email: expectedTeacherEmail,
    password: expectedTeacherPassword,
    callbackUrl: `${baseUrl}/app/professor`,
    json: "true",
  });

  const loginResponse = await request(jar, "/api/auth/callback/credentials", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    body,
  });

  assert([200, 302, 303].includes(loginResponse.status), `Falha no callback de credenciais: HTTP ${loginResponse.status}.`);

  const sessionResponse = await request(jar, "/api/auth/session");
  assert(sessionResponse.ok, `Falha ao ler sessão autenticada: HTTP ${sessionResponse.status}.`);
  const session = await sessionResponse.json();
  assert(session?.user?.email === expectedTeacherEmail, "Sessão autenticada não pertence ao professor de homologação.");
}

async function getFixture(sql) {
  const [teacher] = await sql`
    select u.id
    from users u
    where u.email = ${expectedTeacherEmail}
    limit 1
  `;

  const [admin] = await sql`
    select u.id
    from users u
    where u.email = ${expectedAdminEmail}
    limit 1
  `;

  const [teacherTurma] = await sql`
    select id, nome
    from turmas
    where nome = ${expectedTeacherTurmaName}
      and responsavel_user_id = ${teacher?.id ?? null}
    limit 1
  `;

  const [adminTurma] = await sql`
    select id, nome
    from turmas
    where nome = ${expectedAdminTurmaName}
      and responsavel_user_id = ${admin?.id ?? null}
    limit 1
  `;

  assert(teacher?.id, `Professor de homologação ausente: ${expectedTeacherEmail}. Rode npm run db:bootstrap.`);
  assert(admin?.id, `Admin esperado ausente: ${expectedAdminEmail}.`);
  assert(teacherTurma?.id, `Turma restrita de homologação ausente: ${expectedTeacherTurmaName}.`);
  assert(adminTurma?.id, `Turma demo do admin ausente: ${expectedAdminTurmaName}.`);

  return {
    teacherId: teacher.id,
    adminId: admin.id,
    teacherTurma,
    adminTurma,
  };
}

async function createForeignFixture(sql, adminTurmaId, adminId, suffix) {
  const fixture = {
    id: crypto.randomUUID(),
    turmaId: adminTurmaId,
    createdBy: adminId,
    origemChave: `manual-professor-scope-foreign-${suffix}`,
    titulo: `Atividade protegida smoke ${suffix}`,
    resumo: `Resumo protegido smoke ${suffix}`,
    foco: `foco protegido ${suffix}`,
    proximoPasso: `passo protegido ${suffix}`,
    status: "planejada",
  };

  await sql`
    insert into atividades_turma (
      id,
      turma_id,
      created_by,
      origem_chave,
      titulo,
      resumo,
      foco,
      proximo_passo,
      status,
      created_at,
      updated_at
    )
    values (
      ${fixture.id},
      ${fixture.turmaId},
      ${fixture.createdBy},
      ${fixture.origemChave},
      ${fixture.titulo},
      ${fixture.resumo},
      ${fixture.foco},
      ${fixture.proximoPasso},
      ${fixture.status},
      now(),
      now()
    )
  `;

  return fixture;
}

async function fetchProfessorPages(jar, teacherTurmaId, adminTurmaId) {
  const dashboardResponse = await request(jar, "/app/professor");
  assert(dashboardResponse.ok, `Painel do professor retornou HTTP ${dashboardResponse.status}.`);
  const dashboardHtml = await dashboardResponse.text();

  assert(dashboardHtml.includes(expectedTeacherTurmaName), `Painel não exibiu a turma própria ${expectedTeacherTurmaName}.`);
  assert(!dashboardHtml.includes(expectedAdminTurmaName), `Painel vazou a turma alheia ${expectedAdminTurmaName}.`);

  const ownResponse = await request(jar, `/app/professor/turmas/${teacherTurmaId}`);
  assert(ownResponse.ok, `Detalhe da turma própria retornou HTTP ${ownResponse.status}.`);
  const ownHtml = await ownResponse.text();
  assert(ownHtml.includes("Nova atividade da turma"), "Detalhe da turma própria não exibiu o formulário esperado.");

  const foreignResponse = await request(jar, `/app/professor/turmas/${adminTurmaId}`);
  assert(foreignResponse.status === 404, `Turma alheia deveria retornar 404, mas voltou HTTP ${foreignResponse.status}.`);

  return ownHtml;
}

async function submitCreate(jar, actionName, turmaId, payload) {
  const form = new FormData();
  form.set(actionName, "");
  form.set("turmaId", turmaId);
  form.set("titulo", payload.titulo);
  form.set("resumo", payload.resumo);
  form.set("foco", payload.foco);
  form.set("proximoPasso", payload.proximoPasso);
  form.set("status", payload.status);

  const response = await request(jar, `/app/professor/turmas/${payload.pageTurmaId}`, {
    method: "POST",
    body: form,
  });

  assert([200, 302, 303].includes(response.status), `POST de createActivity falhou com HTTP ${response.status}.`);
}

async function submitUpdate(jar, actionName, pageTurmaId, payload) {
  const form = new FormData();
  form.set(actionName, "");
  form.set("activityId", payload.activityId);
  form.set("turmaId", payload.turmaId);
  form.set("titulo", payload.titulo);
  form.set("resumo", payload.resumo);
  form.set("foco", payload.foco);
  form.set("proximoPasso", payload.proximoPasso);
  form.set("status", payload.status);

  const response = await request(jar, `/app/professor/turmas/${pageTurmaId}`, {
    method: "POST",
    body: form,
  });

  assert([200, 302, 303].includes(response.status), `POST de updateActivity falhou com HTTP ${response.status}.`);
}

async function main() {
  const sql = postgres(process.env.DATABASE_URL, { max: 1 });
  const jar = new CookieJar();
  const suffix = Date.now().toString(36);
  const createdActivityTitles = new Set();
  const createdActivityIds = new Set();

  const ownCreatePayload = {
    titulo: `Atividade smoke autorizada ${suffix}`,
    resumo: `Resumo autorizado smoke ${suffix}`,
    foco: `foco-autorizado-${suffix}`,
    proximoPasso: `passo-autorizado-${suffix}`,
    status: "planejada",
  };

  const forbiddenCreatePayload = {
    titulo: `Atividade smoke negada ${suffix}`,
    resumo: `Resumo negado smoke ${suffix}`,
    foco: `foco-negado-${suffix}`,
    proximoPasso: `passo-negado-${suffix}`,
    status: "planejada",
  };

  const ownUpdatePayload = {
    titulo: `Atividade smoke autorizada ${suffix}`,
    resumo: `Resumo update autorizado smoke ${suffix}`,
    foco: `foco-update-autorizado-${suffix}`,
    proximoPasso: `passo-update-autorizado-${suffix}`,
    status: "em_andamento",
  };

  const forbiddenUpdatePayload = {
    titulo: `Atividade protegida smoke ${suffix}`,
    resumo: `Resumo update negado smoke ${suffix}`,
    foco: `foco-update-negado-${suffix}`,
    proximoPasso: `passo-update-negado-${suffix}`,
    status: "concluida",
  };

  let foreignFixture = null;

  try {
    const fixture = await getFixture(sql);

    await loginAsTeacher(jar);
    const ownHtml = await fetchProfessorPages(jar, fixture.teacherTurma.id, fixture.adminTurma.id);

    const createForm = findFormByField(ownHtml, "Nova atividade da turma", "turmaId");
    const createActionName = extractActionName(createForm);
    assert(createActionName, "Não foi possível extrair o action ID do createActivity.");

    await submitCreate(jar, createActionName, fixture.teacherTurma.id, {
      ...ownCreatePayload,
      pageTurmaId: fixture.teacherTurma.id,
    });
    createdActivityTitles.add(ownCreatePayload.titulo);

    const [ownCreatedActivity] = await sql`
      select id, turma_id, titulo, resumo, foco, proximo_passo, status
      from atividades_turma
      where titulo = ${ownCreatePayload.titulo}
      limit 1
    `;

    assert(ownCreatedActivity?.turma_id === fixture.teacherTurma.id, "Criação autorizada não persistiu na turma própria.");
    createdActivityIds.add(ownCreatedActivity.id);

    await submitCreate(jar, createActionName, fixture.adminTurma.id, {
      ...forbiddenCreatePayload,
      pageTurmaId: fixture.teacherTurma.id,
    });
    createdActivityTitles.add(forbiddenCreatePayload.titulo);

    const forbiddenRows = await sql`
      select id
      from atividades_turma
      where titulo = ${forbiddenCreatePayload.titulo}
    `;
    assert(forbiddenRows.length === 0, "Criação forjada em turma alheia persistiu indevidamente.");

    foreignFixture = await createForeignFixture(sql, fixture.adminTurma.id, fixture.adminId, suffix);
    createdActivityIds.add(foreignFixture.id);
    createdActivityTitles.add(foreignFixture.titulo);

    const refreshedOwnResponse = await request(jar, `/app/professor/turmas/${fixture.teacherTurma.id}`);
    assert(refreshedOwnResponse.ok, `Releitura da turma própria retornou HTTP ${refreshedOwnResponse.status}.`);
    const refreshedOwnHtml = await refreshedOwnResponse.text();
    const updateForm = findFormByField(refreshedOwnHtml, "Atividades da turma", "activityId");
    const updateActionName = extractActionName(updateForm);
    assert(updateActionName, "Não foi possível extrair o action ID do updateActivity.");

    await submitUpdate(jar, updateActionName, fixture.teacherTurma.id, {
      activityId: ownCreatedActivity.id,
      turmaId: fixture.teacherTurma.id,
      ...ownUpdatePayload,
    });

    const [updatedOwnActivity] = await sql`
      select id, turma_id, titulo, resumo, foco, proximo_passo, status
      from atividades_turma
      where id = ${ownCreatedActivity.id}
      limit 1
    `;

    assert(updatedOwnActivity?.status === ownUpdatePayload.status, "Update autorizado não alterou o status da atividade própria.");
    assert(updatedOwnActivity?.resumo === ownUpdatePayload.resumo, "Update autorizado não alterou o resumo da atividade própria.");
    assert(updatedOwnActivity?.foco === ownUpdatePayload.foco, "Update autorizado não alterou o foco da atividade própria.");
    assert(updatedOwnActivity?.proximo_passo === ownUpdatePayload.proximoPasso, "Update autorizado não alterou o próximo passo da atividade própria.");

    await submitUpdate(jar, updateActionName, fixture.teacherTurma.id, {
      activityId: foreignFixture.id,
      turmaId: fixture.adminTurma.id,
      ...forbiddenUpdatePayload,
    });

    const [protectedActivity] = await sql`
      select id, turma_id, titulo, resumo, foco, proximo_passo, status
      from atividades_turma
      where id = ${foreignFixture.id}
      limit 1
    `;

    assert(protectedActivity?.status === foreignFixture.status, "Update forjado alterou o status da atividade protegida.");
    assert(protectedActivity?.resumo === foreignFixture.resumo, "Update forjado alterou o resumo da atividade protegida.");
    assert(protectedActivity?.foco === foreignFixture.foco, "Update forjado alterou o foco da atividade protegida.");
    assert(protectedActivity?.proximo_passo === foreignFixture.proximoPasso, "Update forjado alterou o próximo passo da atividade protegida.");

    console.log(`Professor scope smoke OK em ${baseUrl}`);
    console.log(`- painel exibiu apenas a turma própria ${fixture.teacherTurma.nome}`);
    console.log(`- rota alheia ${fixture.adminTurma.nome} respondeu 404`);
    console.log("- createActivity persistiu apenas na turma própria");
    console.log("- updateActivity alterou apenas a atividade própria");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Falha na prova runtime do professor: ${message}`);
    console.error(`Verifique se a aplicação está ativa em ${baseUrl} e se o bootstrap foi executado.`);
    process.exitCode = 1;
  } finally {
    if (createdActivityIds.size > 0) {
      await sql`
        delete from atividades_turma
        where id in ${sql([...createdActivityIds])}
      `;
    }

    if (createdActivityTitles.size > 0) {
      await sql`
        delete from atividades_turma
        where titulo in ${sql([...createdActivityTitles])}
      `;
    }

    await sql.end({ timeout: 5 }).catch(() => undefined);
  }
}

main();
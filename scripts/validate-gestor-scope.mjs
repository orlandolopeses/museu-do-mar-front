import postgres from "postgres";
import { loadRuntimeEnv } from "./load-runtime-env.mjs";

loadRuntimeEnv();

const expectedManagerEmail = "gestor.educacional@museudomar.local";
const expectedManagerPassword = "GestorEducacional2026!";
const expectedInstitutionName = "Escola Comunitária do Perocão";
const expectedAdminTurmaName = "Turma piloto de homologação";
const expectedTeacherTurmaName = "Turma restrita de teste";
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
  if (!condition) throw new Error(message);
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

async function loginAsManager(jar) {
  const csrfResponse = await request(jar, "/api/auth/csrf");
  assert(csrfResponse.ok, `Falha ao obter CSRF do Auth.js em ${baseUrl}.`);
  const { csrfToken } = await csrfResponse.json();
  assert(csrfToken, "CSRF token ausente na resposta do Auth.js.");

  const body = new URLSearchParams({
    csrfToken,
    email: expectedManagerEmail,
    password: expectedManagerPassword,
    callbackUrl: `${baseUrl}/app/gestor-educacional`,
    json: "true",
  });

  const loginResponse = await request(jar, "/api/auth/callback/credentials", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    body,
  });

  assert([200, 302, 303].includes(loginResponse.status), `Falha no callback de credenciais do gestor: HTTP ${loginResponse.status}.`);

  const sessionResponse = await request(jar, "/api/auth/session");
  assert(sessionResponse.ok, `Falha ao ler sessão autenticada do gestor: HTTP ${sessionResponse.status}.`);
  const session = await sessionResponse.json();
  assert(session?.user?.email === expectedManagerEmail, "Sessão autenticada não pertence ao gestor educacional de homologação.");
}

async function getFixture(sql) {
  const [institution] = await sql`
    select id from instituicoes where nome = ${expectedInstitutionName} limit 1
  `;

  const [manager] = await sql`
    select id from users where email = ${expectedManagerEmail} limit 1
  `;

  const [adminTurma] = await sql`
    select id from turmas where nome = ${expectedAdminTurmaName} and instituicao_id = ${institution?.id ?? null} limit 1
  `;

  const [teacherTurma] = await sql`
    select id from turmas where nome = ${expectedTeacherTurmaName} and instituicao_id = ${institution?.id ?? null} limit 1
  `;

  assert(institution?.id, `Instituição de homologação ausente: ${expectedInstitutionName}.`);
  assert(manager?.id, `Gestor educacional de homologação ausente: ${expectedManagerEmail}. Rode npm run db:bootstrap.`);
  assert(adminTurma?.id, `Turma demo ausente: ${expectedAdminTurmaName}.`);
  assert(teacherTurma?.id, `Turma restrita ausente: ${expectedTeacherTurmaName}.`);

  return {
    institutionId: institution.id,
    managerId: manager.id,
    adminTurmaId: adminTurma.id,
    teacherTurmaId: teacherTurma.id,
  };
}

async function createForeignFixture(sql) {
  const institutionId = crypto.randomUUID();
  const turmaId = crypto.randomUUID();
  const suffix = Date.now().toString(36);
  const institutionName = `Instituição externa smoke ${suffix}`;
  const turmaName = `Turma externa smoke ${suffix}`;

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
      ${institutionId},
      ${institutionName},
      ${"escola"},
      ${"Guarapari"},
      ${"ES"},
      ${"Isolamento Smoke"},
      ${null},
      ${true},
      now()
    )
  `;

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
      ${turmaId},
      ${institutionId},
      ${turmaName},
      ${2026},
      ${"Ensino fundamental II"},
      ${"Noturno"},
      ${null},
      ${true},
      now()
    )
  `;

  return { institutionId, institutionName, turmaId, turmaName };
}

async function main() {
  const sql = postgres(process.env.DATABASE_URL, { max: 1 });
  const jar = new CookieJar();
  let foreignFixture = null;

  try {
    const fixture = await getFixture(sql);
    foreignFixture = await createForeignFixture(sql);

    await loginAsManager(jar);

    const appHomeResponse = await request(jar, "/app");
    assert([302, 303, 307, 308].includes(appHomeResponse.status), `Entrada autenticada retornou HTTP ${appHomeResponse.status}.`);
    const appHomeLocation = appHomeResponse.headers.get("location") ?? "";
    assert(
      appHomeLocation.includes("/app/gestor-educacional"),
      `Entrada autenticada deveria redirecionar para /app/gestor-educacional, mas recebeu ${appHomeLocation || "location vazio"}.`,
    );

    const educationalHubResponse = await request(jar, "/app/gestor-educacional");
    assert(educationalHubResponse.ok, `Hub do gestor educacional retornou HTTP ${educationalHubResponse.status}.`);
    const educationalHubHtml = await educationalHubResponse.text();
    assert(educationalHubHtml.includes("Leitura pedagógica"), "Hub do gestor educacional não exibiu a síntese pedagógica.");
    assert(educationalHubHtml.includes(expectedInstitutionName), `Hub do gestor educacional não exibiu a instituição ${expectedInstitutionName}.`);

    const dashboardResponse = await request(jar, "/app/gestor");
    assert(dashboardResponse.ok, `Painel do gestor retornou HTTP ${dashboardResponse.status}.`);
    const dashboardHtml = await dashboardResponse.text();

    assert(dashboardHtml.includes(expectedInstitutionName), `Painel do gestor não exibiu a instituição ${expectedInstitutionName}.`);
    assert(dashboardHtml.includes(expectedAdminTurmaName), `Painel do gestor não exibiu a turma ${expectedAdminTurmaName}.`);
    assert(dashboardHtml.includes(expectedTeacherTurmaName), `Painel do gestor não exibiu a turma ${expectedTeacherTurmaName}.`);
    assert(!dashboardHtml.includes(foreignFixture.institutionName), "Painel do gestor vazou instituição fora do vínculo.");
    assert(!dashboardHtml.includes(foreignFixture.turmaName), "Painel do gestor vazou turma fora do vínculo.");

    const institutionResponse = await request(jar, `/app/gestor/instituicoes/${fixture.institutionId}`);
    assert(institutionResponse.ok, `Detalhe institucional acessível retornou HTTP ${institutionResponse.status}.`);
    const institutionHtml = await institutionResponse.text();
    assert(institutionHtml.includes(expectedInstitutionName), "Detalhe institucional não exibiu a instituição esperada.");

    const ownTeacherTurmaResponse = await request(jar, `/app/gestor/turmas/${fixture.teacherTurmaId}`);
    assert(ownTeacherTurmaResponse.ok, `Drill-down da turma restrita retornou HTTP ${ownTeacherTurmaResponse.status}.`);
    const ownTeacherTurmaHtml = await ownTeacherTurmaResponse.text();
    assert(ownTeacherTurmaHtml.includes(expectedTeacherTurmaName), "Drill-down da turma restrita não exibiu a turma esperada.");

    const ownAdminTurmaResponse = await request(jar, `/app/gestor/turmas/${fixture.adminTurmaId}`);
    assert(ownAdminTurmaResponse.ok, `Drill-down da turma demo retornou HTTP ${ownAdminTurmaResponse.status}.`);
    const ownAdminTurmaHtml = await ownAdminTurmaResponse.text();
    assert(ownAdminTurmaHtml.includes(expectedAdminTurmaName), "Drill-down da turma demo não exibiu a turma esperada.");

    const foreignInstitutionResponse = await request(jar, `/app/gestor/instituicoes/${foreignFixture.institutionId}`);
    assert(foreignInstitutionResponse.status === 404, `Instituição fora do vínculo deveria retornar 404, mas voltou HTTP ${foreignInstitutionResponse.status}.`);

    const foreignTurmaResponse = await request(jar, `/app/gestor/turmas/${foreignFixture.turmaId}`);
    assert(foreignTurmaResponse.status === 404, `Turma fora do vínculo deveria retornar 404, mas voltou HTTP ${foreignTurmaResponse.status}.`);

    console.log(`Gestor scope smoke OK em ${baseUrl}`);
    console.log("- entrada autenticada redirecionou para /app/gestor-educacional");
    console.log("- hub do gestor educacional exibiu a síntese pedagógica do recorte");
    console.log(`- painel exibiu a instituição vinculada ${expectedInstitutionName}`);
    console.log(`- painel exibiu ${expectedAdminTurmaName} e ${expectedTeacherTurmaName}`);
    console.log("- detalhe institucional e drill-downs das turmas vinculadas responderam 200");
    console.log("- instituição e turma externas responderam 404");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Falha na prova runtime do gestor: ${message}`);
    console.error(`Verifique se a aplicação está ativa em ${baseUrl} e se o bootstrap foi executado.`);
    process.exitCode = 1;
  } finally {
    if (foreignFixture) {
      await sql`
        delete from turmas where id = ${foreignFixture.turmaId}
      `;
      await sql`
        delete from instituicoes where id = ${foreignFixture.institutionId}
      `;
    }

    await sql.end({ timeout: 5 }).catch(() => undefined);
  }
}

main();
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import postgres from "postgres";
import { loadRuntimeEnv } from "./load-runtime-env.mjs";

loadRuntimeEnv();

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
    callbackUrl: `${baseUrl}/app/apoiador`,
    json: "true",
  });

  const loginResponse = await request(jar, "/api/auth/callback/credentials", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    body,
  });

  assert([200, 302, 303].includes(loginResponse.status), `Falha no callback de credenciais do apoiador: HTTP ${loginResponse.status}.`);

  const sessionResponse = await request(jar, "/api/auth/session");
  assert(sessionResponse.ok, `Falha ao ler sessão autenticada do apoiador: HTTP ${sessionResponse.status}.`);
  const session = await sessionResponse.json();
  assert(session?.user?.email === email, "Sessão autenticada não pertence ao usuário de apoiador criado para o smoke.");
}

async function getRoleId(sql, slug) {
  const [role] = await sql`
    select id from roles where slug = ${slug} limit 1
  `;

  assert(role?.id, `Papel ausente no banco: ${slug}. Rode npm run db:bootstrap.`);
  return role.id;
}

async function createFixture(sql, suffix) {
  const roleId = await getRoleId(sql, "apoiador");
  const userId = randomUUID();
  const email = `apoiador.smoke.${suffix}@museudomar.local`;
  const password = `ApoiadorSmoke!${suffix}`;
  const passwordHash = await bcrypt.hash(password, 10);
  const postId = randomUUID();
  const acervoId = randomUUID();
  const eventId = randomUUID();
  const postSlug = `apoio-smoke-${suffix}`;
  const postTitle = `Leitura institucional smoke ${suffix}`;
  const acervoTitle = `Acervo institucional smoke ${suffix}`;
  const eventTitle = `Agenda institucional smoke ${suffix}`;

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
      ${`Apoiador Smoke ${suffix}`},
      false,
      ${"ativo"},
      ${"apoiador"},
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
    insert into posts (
      id,
      slug,
      title,
      summary,
      content,
      cover_image,
      status,
      author_id,
      published_at,
      created_at,
      updated_at
    ) values (
      ${postId},
      ${postSlug},
      ${postTitle},
      ${"Post de prova operacional da jornada do apoiador."},
      ${"Conteúdo de prova operacional da jornada do apoiador."},
      ${null},
      ${"publicado"},
      ${userId},
      now(),
      now(),
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
      ${acervoId},
      ${"documento"},
      ${acervoTitle},
      ${"Item de acervo para prova operacional do apoiador."},
      ${"https://example.com/acervo-smoke-apoiador"},
      ${null},
      ${"smoke,apoiador"},
      ${"Coleção smoke"},
      ${"Homologação"},
      ${2026},
      true,
      ${userId},
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
      ${eventId},
      ${eventTitle},
      ${"Evento de prova operacional da jornada do apoiador."},
      ${null},
      ${"Base local de homologação"},
      ${new Date("2026-05-16T14:00:00-03:00")},
      ${new Date("2026-05-16T16:00:00-03:00")},
      ${"Institucional"},
      ${null},
      ${null},
      true,
      ${userId},
      now()
    )
  `;

  return {
    userId,
    email,
    password,
    postId,
    postTitle,
    acervoId,
    acervoTitle,
    eventId,
    eventTitle,
  };
}

async function fetchDashboard(jar, fixture) {
  const dashboardResponse = await request(jar, "/app/apoiador");
  assert(dashboardResponse.ok, `Painel do apoiador retornou HTTP ${dashboardResponse.status}.`);
  const dashboardHtml = await dashboardResponse.text();

  assert(dashboardHtml.includes("Jornada do Apoiador"), "Painel do apoiador não exibiu o heading esperado.");
  assert(dashboardHtml.includes("Acompanhamento institucional"), "Painel do apoiador não exibiu o título esperado.");
  assert(dashboardHtml.includes(fixture.postTitle), `Painel do apoiador não exibiu o post ${fixture.postTitle}.`);
  assert(dashboardHtml.includes("Publicações visíveis"), "Painel do apoiador não exibiu o card de publicações.");
  assert(dashboardHtml.includes("Itens de acervo"), "Painel do apoiador não exibiu o card de acervo.");
  assert(dashboardHtml.includes("Agenda futura"), "Painel do apoiador não exibiu o card de agenda.");
  assert(dashboardHtml.includes("Próximos incrementos"), "Painel do apoiador não exibiu a seção de próximos incrementos.");

  return dashboardHtml;
}

async function main() {
  const sql = postgres(process.env.DATABASE_URL, { max: 1 });
  const jar = new CookieJar();
  const suffix = Date.now().toString(36);
  let fixture = null;

  try {
    fixture = await createFixture(sql, suffix);
    await login(jar, fixture.email, fixture.password);
    await fetchDashboard(jar, fixture);

    console.log(`Apoiador scope smoke OK em ${baseUrl}`);
    console.log(`- painel exibiu o post público ${fixture.postTitle}`);
    console.log(`- painel carregou cards de publicações, acervo e agenda com sessão autenticada`);
    console.log("- jornada apoiador permaneceu acessível como superfície autenticada de leitura institucional");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Falha na prova runtime do apoiador: ${message}`);
    console.error(`Verifique se a aplicação está ativa em ${baseUrl} e se o bootstrap foi executado.`);
    process.exitCode = 1;
  } finally {
    if (fixture) {
      await sql`delete from eventos where id = ${fixture.eventId}`;
      await sql`delete from acervo where id = ${fixture.acervoId}`;
      await sql`delete from posts where id = ${fixture.postId}`;
      await sql`delete from users where id = ${fixture.userId}`;
    }

    await sql.end({ timeout: 5 }).catch(() => undefined);
  }
}

main();
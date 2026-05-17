import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { loadRuntimeEnv } from "./load-runtime-env.mjs";

loadRuntimeEnv();

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL não definida.");
  process.exit(1);
}

const sql = postgres(process.env.DATABASE_URL, { max: 1 });

const roles = [
  ["superadmin", "Superadmin", "Gestão global da plataforma", "plataforma"],
  ["editor", "Editor", "Gestão editorial e publicação institucional", "plataforma"],
  ["curador", "Curador", "Gestão curatorial do acervo e coleções", "plataforma"],
  ["moderador_comunitario", "Moderador Comunitário", "Moderação social e comunitária", "comunitario"],
  ["bolsista", "Bolsista", "Atuação operacional, pesquisa e apoio às entregas do projeto", "institucional"],
  ["equipe_producao", "Equipe de Produção", "Operação, logística e execução de ações do projeto", "institucional"],
  ["equipe_comunicacao", "Equipe de Comunicação", "Comunicação institucional, publicações e campanhas", "institucional"],
  ["professor", "Professor", "Experiência pedagógica e gestão de trilhas", "educacional"],
  ["estudante", "Estudante", "Participação em trilhas e projetos", "educacional"],
  ["gestor", "Gestor", "Coordenação institucional, acompanhamento e indicadores", "institucional"],
  ["voluntario", "Voluntário", "Apoio comunitário e colaboração em ações do projeto", "comunitario"],
  ["apoiador", "Apoiador", "Acompanhamento institucional e fortalecimento da rede de apoio", "institucional"],
  ["gestor_educacional", "Gestor Educacional", "Coordenação institucional e indicadores", "educacional"],
  ["comunidade", "Comunidade", "Contribuição comunitária e memória social", "comunitario"],
  ["parceiro", "Parceiro", "Relações institucionais e apoio", "institucional"],
  ["comunicador", "Comunicador", "Imprensa e cobertura", "institucional"],
  ["equipe", "Equipe", "Perfil legado geral de equipe do projeto", "institucional"],
];

const permissions = [
  ["blog.create", "Criar post", "Criar posts no blog", "blog", "create"],
  ["blog.publish", "Publicar post", "Publicar posts no blog", "blog", "publish"],
  ["acervo.review", "Revisar acervo", "Revisar e publicar itens do acervo", "acervo", "review"],
  ["eventos.manage", "Gerir eventos", "Criar e publicar eventos", "eventos", "manage"],
  ["forum.moderate", "Moderar fórum", "Moderar tópicos e respostas", "forum", "moderate"],
  ["school.manage", "Gerir escola", "Gerir vínculos e ações institucionais", "school", "manage"],
  ["trilhas.manage", "Gerir trilhas", "Criar e gerir trilhas pedagógicas", "trilhas", "manage"],
  ["community.submit_memory", "Enviar memória", "Submeter memória e contribuição comunitária", "community", "submit_memory"],
  ["reports.view", "Ver relatórios", "Visualizar relatórios institucionais", "reports", "view"],
  ["press.access", "Acessar imprensa", "Acessar e gerir materiais de imprensa", "press", "access"],
  ["tasks.view_own", "Ver tarefas próprias", "Acompanhar tarefas pessoais no projeto", "tasks", "view_own"],
  ["tasks.update_own", "Atualizar tarefas próprias", "Atualizar andamento das próprias tarefas", "tasks", "update_own"],
  ["tasks.manage", "Gerir tarefas", "Coordenar tarefas e frentes operacionais", "tasks", "manage"],
  ["campaigns.manage", "Gerir campanhas", "Gerir calendário editorial e campanhas de comunicação", "campaigns", "manage"],
  ["support.view", "Ver apoio institucional", "Acompanhar visão institucional de apoio e impacto", "support", "view"],
];

const rolePermissionMap = {
  superadmin: [
    "blog.create",
    "blog.publish",
    "acervo.review",
    "eventos.manage",
    "forum.moderate",
    "school.manage",
    "trilhas.manage",
    "community.submit_memory",
    "reports.view",
    "press.access",
  ],
  editor: ["blog.create", "blog.publish", "eventos.manage", "press.access"],
  curador: ["acervo.review", "blog.create"],
  moderador_comunitario: ["forum.moderate", "community.submit_memory"],
  bolsista: ["community.submit_memory", "tasks.view_own", "tasks.update_own"],
  equipe_producao: ["eventos.manage", "tasks.manage", "community.submit_memory"],
  equipe_comunicacao: ["blog.create", "blog.publish", "eventos.manage", "press.access", "campaigns.manage"],
  professor: ["trilhas.manage", "community.submit_memory"],
  estudante: ["community.submit_memory"],
  gestor: ["reports.view", "school.manage", "tasks.manage"],
  voluntario: ["community.submit_memory", "tasks.view_own"],
  apoiador: ["support.view"],
  gestor_educacional: ["school.manage", "reports.view"],
  comunidade: ["community.submit_memory"],
  parceiro: ["reports.view"],
  comunicador: ["press.access"],
  equipe: ["tasks.view_own", "community.submit_memory"],
};

async function syncRoles() {
  for (const [slug, name, description, scope] of roles) {
    await sql`
      insert into roles (id, slug, name, description, scope, created_at)
      values (${randomUUID()}, ${slug}, ${name}, ${description}, ${scope}, ${new Date()})
      on conflict (slug) do update set
        name = excluded.name,
        description = excluded.description,
        scope = excluded.scope
    `;
  }
}

async function syncPermissions() {
  for (const [slug, name, description, resource, action] of permissions) {
    await sql`
      insert into permissions (id, slug, name, description, resource, action, created_at)
      values (${randomUUID()}, ${slug}, ${name}, ${description}, ${resource}, ${action}, ${new Date()})
      on conflict (slug) do update set
        name = excluded.name,
        description = excluded.description,
        resource = excluded.resource,
        action = excluded.action
    `;
  }
}

async function syncRolePermissions() {
  const roleRows = await sql`select id, slug from roles`;
  const permissionRows = await sql`select id, slug from permissions`;

  const roleBySlug = new Map(roleRows.map((row) => [row.slug, row.id]));
  const permissionBySlug = new Map(permissionRows.map((row) => [row.slug, row.id]));

  for (const [roleSlug, permissionSlugs] of Object.entries(rolePermissionMap)) {
    const roleId = roleBySlug.get(roleSlug);
    if (!roleId) continue;

    for (const permissionSlug of permissionSlugs) {
      const permissionId = permissionBySlug.get(permissionSlug);
      if (!permissionId) continue;

      await sql`
        insert into role_permissions (id, role_id, permission_id, created_at)
        values (${randomUUID()}, ${roleId}, ${permissionId}, ${new Date()})
        on conflict (role_id, permission_id) do nothing
      `;
    }
  }
}

async function main() {
  await syncRoles();
  await syncPermissions();
  await syncRolePermissions();
  console.log("RBAC sincronizado com sucesso.");
}

main()
  .catch((error) => {
    console.error("Falha ao sincronizar RBAC:", error.message);
    process.exit(1);
  })
  .finally(async () => {
    await sql.end({ timeout: 5 });
  });

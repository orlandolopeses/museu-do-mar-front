import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { loadRuntimeEnv } from "./load-runtime-env.mjs";

loadRuntimeEnv();

const sql = postgres(process.env.DATABASE_URL);

const tracks = [
  {
    slug: "gincana-perocao-docente",
    audience: "professor",
    title: "Gincana: Tesouros de Perocão (Docente)",
    description:
      "Percurso para coordenar a gincana sociocultural com turmas da EMEF Francisco Araújo.",
    highlight_positive:
      "Sua turma em Perocão já pode ativar esta experiência de território.",
    highlight_empty:
      "Esta trilha é ideal para escolas situadas no território de Perocão.",
    context_key: "hasTurmas",
    steps: JSON.stringify([
      "Baixar e ler o Manual do Facilitador.",
      "Definir as equipes e o cronograma de campo.",
      "Acompanhar em tempo real as submissões de memória dos alunos.",
    ]),
    links: JSON.stringify([
      { label: "Ver roteiro", href: "/participar/gincanas/perocao" },
      { label: "Painel da turma", href: "/app/professor" },
    ]),
    sort_order: 10,
  },
  {
    slug: "gincana-perocao-discente",
    audience: "estudante",
    title: "Gincana: Tesouros de Perocão (Estudante)",
    description:
      "Percurso gamificado para explorar as memórias, a pesca e o manguezal de Perocão.",
    highlight_positive:
      "Sua equipe já pode começar a coletar os tesouros do bairro!",
    highlight_empty:
      "Vincule sua turma para participar das gincanas georreferenciadas.",
    context_key: "hasTurmas",
    steps: JSON.stringify([
      "Acessar o mapa de missões no site.",
      "Encontrar os pontos históricos e naturais indicados.",
      "Enviar fotos e áudios das descobertas.",
    ]),
    links: JSON.stringify([
      { label: "Mapa de missões", href: "/participar/gincanas/perocao" },
      { label: "Enviar descoberta", href: "/memoria" },
    ]),
    sort_order: 10,
  },
];

async function main() {
  console.log("Seeding Gincana Perocão tracks...");
  for (const t of tracks) {
    await sql`
      INSERT INTO trilhas_pedagogicas
        (id, slug, audience, title, description,
         highlight_positive, highlight_empty, context_key,
         steps, links, active, sort_order)
      VALUES
        (${randomUUID()}, ${t.slug}, ${t.audience}, ${t.title}, ${t.description},
         ${t.highlight_positive}, ${t.highlight_empty}, ${t.context_key},
         ${t.steps}::jsonb, ${t.links}::jsonb, true, ${t.sort_order})
      ON CONFLICT (slug) DO UPDATE SET
        audience = EXCLUDED.audience,
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        highlight_positive = EXCLUDED.highlight_positive,
        highlight_empty = EXCLUDED.highlight_empty,
        context_key = EXCLUDED.context_key,
        steps = EXCLUDED.steps,
        links = EXCLUDED.links,
        active = EXCLUDED.active,
        sort_order = EXCLUDED.sort_order,
        updated_at = now()
    `;
    console.log(`  ✓ ${t.audience}/${t.slug}`);
  }
  console.log("Done.");
  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

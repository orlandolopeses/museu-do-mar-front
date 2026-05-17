import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { loadRuntimeEnv } from "./load-runtime-env.mjs";

loadRuntimeEnv();

const sql = postgres(process.env.DATABASE_URL);

const tracks = [
  // ANCHIETA
  {
    slug: "gincana-anchieta-docente",
    audience: "professor",
    title: "Gincana: O Enigma de Rerigtiba (Docente)",
    description: "Coordene a exploração do patrimônio jesuítico em Anchieta.",
    highlight_positive: "Suas turmas em Anchieta estão prontas para o desafio.",
    highlight_empty: "Ideal para escolas próximas ao Santuário Nacional.",
    context_key: "hasTurmas",
    steps: JSON.stringify([
      "Estudar o legado jesuítico no Santuário.",
      "Planejar o roteiro pelo centro histórico.",
      "Validar as descobertas sobre a fundação de Rerigtiba.",
    ]),
    links: JSON.stringify([
      { label: "Ver roteiro", href: "/participar/gincanas/anchieta" },
    ]),
    sort_order: 20,
  },
  {
    slug: "gincana-anchieta-discente",
    audience: "estudante",
    title: "Gincana: O Enigma de Rerigtiba (Estudante)",
    description: "Decifre os mistérios da história de Anchieta.",
    highlight_positive: "Encontre os segredos escondidos no Santuário!",
    highlight_empty: "Participe da gincana histórica de Anchieta.",
    context_key: "hasTurmas",
    steps: JSON.stringify([
      "Visitar o Santuário e a Casa da Cultura.",
      "Encontrar elementos da arquitetura do século XVI.",
      "Registrar memórias sobre o Padre Anchieta.",
    ]),
    links: JSON.stringify([
      { label: "Mapa de missões", href: "/participar/gincanas/anchieta" },
    ]),
    sort_order: 20,
  },
  // PIÚMA
  {
    slug: "gincana-piuma-docente",
    audience: "professor",
    title: "Gincana: O Mistério das Conchas (Docente)",
    description: "Lidere a exploração da biodiversidade e cultura marinha de Piúma.",
    highlight_positive: "Sua turma em Piúma já pode iniciar a coleta de saberes.",
    highlight_empty: "Focado na biodiversidade das ilhas e artesanato local.",
    context_key: "hasTurmas",
    steps: JSON.stringify([
      "Preparar a aula sobre ecossistemas marinhos.",
      "Coordenar a visita à Ilha do Gambá.",
      "Analisar a produção artesanal de conchas.",
    ]),
    links: JSON.stringify([
      { label: "Ver roteiro", href: "/participar/gincanas/piuma" },
    ]),
    sort_order: 30,
  },
  {
    slug: "gincana-piuma-discente",
    audience: "estudante",
    title: "Gincana: O Mistério das Conchas (Estudante)",
    description: "Descubra a riqueza das ilhas e o artesanato de Piúma.",
    highlight_positive: "Explore a Ilha do Gambá e as areias de conchas!",
    highlight_empty: "Vincule-se para participar da gincana biológica.",
    context_key: "hasTurmas",
    steps: JSON.stringify([
      "Identificar tipos de conchas no artesanato.",
      "Explorar as trilhas da Ilha do Gambá.",
      "Registrar a vista do Monte Aghá.",
    ]),
    links: JSON.stringify([
      { label: "Mapa de missões", href: "/participar/gincanas/piuma" },
    ]),
    sort_order: 30,
  },
];

async function main() {
  console.log("Seeding Regional Gincana tracks (Anchieta & Piúma)...");
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

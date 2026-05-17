import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { loadRuntimeEnv } from "./load-runtime-env.mjs";

loadRuntimeEnv();

const sql = postgres(process.env.DATABASE_URL);

const tracks = [
  {
    slug: "territorio-memoria",
    audience: "professor",
    title: "Território e memória local",
    description:
      "Percurso inicial para preparar rodas de conversa, levantamento de memórias e leitura do território com a turma.",
    highlight_positive:
      "Sua rede institucional já permite situar esta trilha no território de atuação.",
    highlight_empty:
      "Vincule sua instituição para situar esta trilha no território de atuação.",
    context_key: "hasInstitutions",
    steps: JSON.stringify([
      "Selecionar um texto-base do blog para abrir a conversa em sala.",
      "Usar um item do acervo como disparador de memória coletiva.",
      "Registrar perguntas e devolutivas no fórum do projeto.",
    ]),
    links: JSON.stringify([
      { label: "Explorar blog", href: "/blog" },
      { label: "Explorar acervo", href: "/acervo" },
      { label: "Abrir fórum", href: "/forum" },
    ]),
    sort_order: 0,
  },
  {
    slug: "agenda-mediacao",
    audience: "professor",
    title: "Agenda e mediação cultural",
    description:
      "Percurso para conectar planejamento de aula, agenda pública e participação da turma em ações do Museu do Mar.",
    highlight_positive:
      "Há eventos futuros na rede que podem virar extensão da aula.",
    highlight_empty:
      "Quando houver eventos vinculados à rede, esta trilha ajuda a conectá-los ao calendário da turma.",
    context_key: "hasEvents",
    steps: JSON.stringify([
      "Mapear eventos futuros com potencial pedagógico.",
      "Definir preparação prévia da turma com leitura e repertório.",
      "Registrar retorno da atividade na área de participação.",
    ]),
    links: JSON.stringify([
      { label: "Ver agenda", href: "/agenda" },
      { label: "Meu perfil", href: "/app/perfil" },
    ]),
    sort_order: 1,
  },
  {
    slug: "acompanhamento-turma",
    audience: "professor",
    title: "Acompanhamento por turma",
    description:
      "Percurso para transformar vínculos institucionais e dados de turma em rotina mínima de acompanhamento pedagógico.",
    highlight_positive: "Você já possui base para acompanhamento direto por turma.",
    highlight_empty:
      "Associe turmas ao seu perfil para ativar acompanhamento mais preciso.",
    context_key: "hasTurmas",
    steps: JSON.stringify([
      "Revisar turmas sob acompanhamento e estudantes ativos.",
      "Escolher um foco temático para o próximo ciclo de atividades.",
      "Combinar repertório de blog, acervo e agenda em uma sequência curta.",
    ]),
    links: JSON.stringify([
      { label: "Painel do professor", href: "/app/professor" },
      { label: "Área do gestor", href: "/app/gestor" },
    ]),
    sort_order: 2,
  },
  {
    slug: "explorar-territorio",
    audience: "estudante",
    title: "Explorar o território",
    description:
      "Percurso de entrada para conhecer histórias, paisagens e memórias ligadas ao Museu do Mar.",
    highlight_positive:
      "Sua rede de referência ajuda a aproximar os conteúdos do seu contexto.",
    highlight_empty:
      "Complete seu vínculo institucional para aproximar os conteúdos do seu contexto.",
    context_key: "hasInstitutions",
    steps: JSON.stringify([
      "Ler um texto do blog para entrar no tema.",
      "Abrir um item do acervo e observar imagens, objetos ou documentos.",
      "Levar uma pergunta ou descoberta para o fórum.",
    ]),
    links: JSON.stringify([
      { label: "Começar pelo blog", href: "/blog" },
      { label: "Ver acervo", href: "/acervo" },
      { label: "Participar do fórum", href: "/forum" },
    ]),
    sort_order: 0,
  },
  {
    slug: "participar-da-agenda",
    audience: "estudante",
    title: "Participar da agenda",
    description:
      "Percurso para acompanhar atividades do projeto e se preparar para experiências presenciais ou públicas.",
    highlight_positive:
      "Já existem eventos na sua rede para conectar presença e aprendizagem.",
    highlight_empty:
      "Quando houver eventos na sua rede, esta trilha ajuda a se preparar para participar.",
    context_key: "hasEvents",
    steps: JSON.stringify([
      "Verificar a agenda e escolher uma atividade de interesse.",
      "Ler um conteúdo de apoio antes da participação.",
      "Registrar impressões e perguntas depois da atividade.",
    ]),
    links: JSON.stringify([
      { label: "Ver agenda", href: "/agenda" },
      { label: "Ler blog", href: "/blog" },
    ]),
    sort_order: 1,
  },
  {
    slug: "trilha-da-turma",
    audience: "estudante",
    title: "Trilha da turma",
    description:
      "Percurso para conectar sua turma, seus colegas e os conteúdos do projeto em uma experiência compartilhada.",
    highlight_positive:
      "Sua turma já pode usar a plataforma como base de exploração conjunta.",
    highlight_empty:
      "Quando sua turma estiver vinculada, este percurso ganha contexto compartilhado.",
    context_key: "hasTurmas",
    steps: JSON.stringify([
      "Reconhecer sua turma e sua rede de referência.",
      "Escolher um conteúdo para conversar com colegas e professores.",
      "Trazer contribuições, memórias ou dúvidas para o fórum.",
    ]),
    links: JSON.stringify([
      { label: "Minha área", href: "/app/estudante" },
      { label: "Meu perfil", href: "/app/perfil" },
    ]),
    sort_order: 2,
  },
];

async function main() {
  console.log("Seeding pedagogical tracks...");
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

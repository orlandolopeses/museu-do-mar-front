import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";
import { loadRuntimeEnv } from "./load-runtime-env.mjs";

loadRuntimeEnv();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const editorialDir = path.resolve(__dirname, "../../context/editorial");
const isDryRun = process.argv.includes("--dry-run");

function extractField(content, label) {
  const regex = new RegExp(`- \\*\\*${label}:\\*\\*\\s*(.+)`, "i");
  const match = content.match(regex);
  return match?.[1]?.trim() ?? "";
}

function stripMarkdownDecorators(value) {
  return value.replace(/^`|`$/g, "").trim();
}

function extractBody(content) {
  const marker = "## Conteúdo";
  const index = content.indexOf(marker);
  if (index === -1) return "";
  return content.slice(index + marker.length).trim();
}

async function loadPosts() {
  const files = await fs.readdir(editorialDir);
  const markdownFiles = files.filter((file) => file.endsWith(".md") && file !== "README.md").sort();

  const posts = [];
  for (const file of markdownFiles) {
    const fullPath = path.join(editorialDir, file);
    const raw = await fs.readFile(fullPath, "utf8");

    const title = stripMarkdownDecorators(extractField(raw, "Título"));
    const slug = stripMarkdownDecorators(extractField(raw, "Slug sugerido"));
    const status = stripMarkdownDecorators(extractField(raw, "Status sugerido")) || "rascunho";
    const summary = extractField(raw, "Resumo sugerido").trim();
    const content = extractBody(raw);

    posts.push({
      file,
      title,
      slug,
      status,
      summary,
      content,
    });
  }

  return posts.filter((post) => post.title && post.slug && post.content);
}

async function main() {
  const posts = await loadPosts();

  if (posts.length === 0) {
    console.log("Nenhum post editorial encontrado para importação.");
    return;
  }

  if (isDryRun) {
    console.log(`DRY RUN: ${posts.length} posts encontrados.`);
    for (const post of posts) {
      console.log(`- ${post.slug} | ${post.status} | ${post.title}`);
    }
    return;
  }

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL não definida. Use --dry-run para validar sem banco.");
  }

  const sql = postgres(process.env.DATABASE_URL, { max: 1 });

  try {
    for (const post of posts) {
      const now = new Date();
      const publishedAt = post.status === "publicado" ? now : null;

      await sql`
        insert into posts (
          id,
          slug,
          title,
          summary,
          content,
          status,
          published_at,
          created_at,
          updated_at
        ) values (
          ${randomUUID()},
          ${post.slug},
          ${post.title},
          ${post.summary || null},
          ${post.content},
          ${post.status},
          ${publishedAt},
          ${now},
          ${now}
        )
        on conflict (slug) do update set
          title = excluded.title,
          summary = excluded.summary,
          content = excluded.content,
          status = excluded.status,
          published_at = excluded.published_at,
          updated_at = excluded.updated_at
      `;

      console.log(`Importado: ${post.slug}`);
    }
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((error) => {
  console.error("Falha ao importar posts editoriais:", error.message);
  process.exit(1);
});

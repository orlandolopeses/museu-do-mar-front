import fs from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const publicRoot = path.join(projectRoot, "public");

const requiredPaths = [
  "/story/applications/cena-chamado-mare.png",
  "/story/applications/cena-trilhas-territorio.png",
  "/story/applications/cena-tesouro-coletivo.png",
  "/story/applications/hero-turma-mangue-clean.png",
  "/story/characters/pedro-cao.png",
  "/story/characters/bia-das-conchas.png",
  "/story/characters/ravi-do-farol.png",
  "/story/characters/luna-da-mare.png",
  "/story/characters/mari-siqueira.png",
  "/story/characters/variants/pedro-cao-travesso.png",
  "/story/characters/variants/pedro-cao-acolhedor.png",
  "/story/characters/variants/bia-das-conchas-travesso.png",
  "/story/characters/variants/bia-das-conchas-acolhedor.png",
  "/story/characters/variants/ravi-do-farol-travesso.png",
  "/story/characters/variants/ravi-do-farol-acolhedor.png",
  "/story/characters/variants/luna-da-mare-travesso.png",
  "/story/characters/variants/luna-da-mare-acolhedor.png",
  "/story/characters/variants/mari-siqueira-travesso.png",
  "/story/characters/variants/mari-siqueira-acolhedor.png",
];

const missing = requiredPaths.filter((assetPath) => {
  const filePath = path.join(publicRoot, assetPath.replace(/^\//, ""));
  return !fs.existsSync(filePath);
});

if (missing.length > 0) {
  console.error("[story:assets:smoke] Arquivos ausentes em public/:");
  for (const assetPath of missing) {
    console.error(`  - ${assetPath}`);
  }
  process.exit(1);
}

console.log(`[story:assets:smoke] OK — ${requiredPaths.length} assets encontrados em public/story/`);

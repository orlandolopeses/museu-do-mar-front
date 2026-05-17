import type { EntryPortalSlug } from "@/lib/entry-portals";

export type StoryCampaignScene = {
  panel: string;
  title: string;
  body: string;
  line: string;
  imageSrc: string;
  imageAlt: string;
};

export const storyCampaignScenes = [
  {
    panel: "Quadro 1",
    title: "Cena 1: Chamado da maré",
    body: "Pedro Cão encontra a turma no cais e dispara o desafio da semana.",
    line: "Bora achar as pistas da nossa historia!",
    imageSrc: "/story/applications/cena-chamado-mare.png",
    imageAlt: "Aplicacao ilustrada do chamado da mare com Pedro, Bia e Ravi",
  },
  {
    panel: "Quadro 2",
    title: "Cena 2: Trilhas no território",
    body: "Familias percorrem escola, praia e mangue em busca de lembrancas e saberes.",
    line: "Cada lugar guarda um pedaço da gente!",
    imageSrc: "/story/applications/cena-trilhas-territorio.png",
    imageAlt: "Aplicacao ilustrada das trilhas no territorio com Ravi, Luna e Pedro",
  },
  {
    panel: "Quadro 3",
    title: "Cena 3: Tesouro coletivo",
    body: "A descoberta final mostra que cuidar da memoria fortalece o futuro da comunidade.",
    line: "Nosso tesouro e nossa identidade!",
    imageSrc: "/story/applications/cena-tesouro-coletivo.png",
    imageAlt: "Aplicacao ilustrada do tesouro coletivo com a turma reunida",
  },
] as const satisfies readonly StoryCampaignScene[];

export const storyHeroApplication = {
  imageSrc: "/story/applications/hero-turma-mangue-clean.png",
  imageAlt: "Aplicacao editorial da Turma do Mangue para destaque principal da landing",
} as const;

export const storyPortalNarrative: Record<
  EntryPortalSlug,
  { lead: string; bullets: readonly [string, string, string]; voice: string; host: string }
> = {
  implementacao: {
    lead: "Para quem move o projeto todos os dias.",
    bullets: ["Bastidores da producao", "Comunicacao e mobilizacao", "Organizacao das frentes locais"],
    voice: "Combinado direitinho, a missao vira realidade.",
    host: "Pedro Cao",
  },
  participantes: {
    lead: "Para estudantes, professores e voluntarios.",
    bullets: ["Desafios da caca ao tesouro", "Missoes no mangue e na escola", "Aprender brincando com memoria"],
    voice: "Partiu gincana! Cada pista conta nossa historia.",
    host: "Bia das Conchas",
  },
  apoiadores: {
    lead: "Para familias, parceiros e apoiadores da causa.",
    bullets: ["Impacto social na comunidade", "Fortalecimento da memoria local", "Rede de apoio para continuidade"],
    voice: "Com a forca da comunidade, a trilha cresce bonita.",
    host: "Pedro Cao",
  },
};

export const storyCharacterProfiles = [
  {
    id: "pedro",
    name: "Pedro Cao",
    role: "Menino guia da aventura",
    dramaticFunction: "Abre o jogo, convoca a turma e traduz a missao em linguagem de crianca.",
    summary:
      "E o narrador da trilha: puxa o chamado no cais, organiza as pistas e lembra que memoria e brincadeira com proposito.",
  },
  {
    id: "bia",
    name: "Bia das Conchas",
    role: "Guardia das conchas",
    dramaticFunction: "Cuida dos detalhes, do registro e do tesouro simbolico da comunidade.",
    summary:
      "Ensina a olhar de perto: cada concha, foto ou nome guardado vira pista para quem participa da gincana.",
  },
  {
    id: "ravi",
    name: "Ravi do Farol",
    role: "Rastreador de pistas",
    dramaticFunction: "Ilumina o caminho e mantem o grupo unido quando a trilha fica dificil.",
    summary:
      "Representa a orientacao no territorio — do cais a escola — e a energia de seguir juntos ate o fim.",
  },
  {
    id: "luna",
    name: "Luna da Mare",
    role: "Artista da memoria",
    dramaticFunction: "Transforma lembranca em imagem, cor e historia compartilhavel.",
    summary:
      "Mostra que registrar tambem e criar: desenho, mural e narrativa visual fortalecem o orgulho local.",
  },
  {
    id: "mari",
    name: "Mari Siqueira",
    role: "Voz das marisqueiras",
    dramaticFunction: "Ancora a narrativa no saber das mulheres do cais e na memoria de trabalho do mangue.",
    summary:
      "Lembra que Perocao vive de mare, pesca e mariscagem — e que cuidar da memoria e cuidar de quem sustenta o territorio.",
  },
] as const;

export const storyParticipationSteps = [
  {
    title: "Conheca a turma",
    body: "Entenda quem guia cada tom da campanha e como os personagens representam a comunidade.",
  },
  {
    title: "Escolha seu portal",
    body: "Participantes, equipe de implementacao ou apoiadores: cada entrada tem trilha e linguagem proprias.",
  },
  {
    title: "Entre na aventura",
    body: "Gincanas, missoes e registro de memoria conectam escola, familia e bairro em torno do Museu do Mar.",
  },
] as const;

/** Paths relativos a `public/` — usados no smoke de assets. */
export const storyAssetPaths = [
  storyHeroApplication.imageSrc,
  ...storyCampaignScenes.map((scene) => scene.imageSrc),
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
] as const;

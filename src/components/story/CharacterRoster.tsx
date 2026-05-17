import Image from "next/image";

type Character = {
  id: string;
  name: string;
  role: string;
  avatarPath?: string;
  speechByTone: Record<StoryTone, string>;
  palette: {
    ring: string;
    bg: string;
    accent: string;
    textDark: string;
    textLight: string;
  };
};

export type StoryTone = "default" | "implementacao" | "participantes" | "apoiadores";
type StoryTheme = "light" | "dark";
type AvatarMood = "base" | "travesso" | "acolhedor";

const characters: Character[] = [
  {
    id: "pedro",
    name: "Pedro Cao",
    role: "Menino guia da aventura",
    avatarPath: "/story/characters/pedro-cao.png",
    speechByTone: {
      default: "Bora, turma! O mapa da memoria ta chamando.",
      implementacao: "Combinado direitinho, a missao vira realidade.",
      participantes: "Partiu gincana! Cada pista conta nossa historia.",
      apoiadores: "Com a forca da comunidade, a trilha cresce bonita.",
    },
    palette: {
      ring: "border-mar-areia/50",
      bg: "bg-mar-areia/15",
      accent: "#F1C35A",
      textDark: "text-mar-cobre",
      textLight: "text-mar-areia",
    },
  },
  {
    id: "bia",
    name: "Bia das Conchas",
    role: "Guardia das conchas",
    avatarPath: "/story/characters/bia-das-conchas.png",
    speechByTone: {
      default: "Conchinha na mao, lembranca no coracao.",
      implementacao: "Registrar cada achado e cuidar do tesouro.",
      participantes: "Olha o detalhe! A pista mora no capricho.",
      apoiadores: "Quando voces apoiam, mais historias vem a tona.",
    },
    palette: {
      ring: "border-mar-verde/45",
      bg: "bg-mar-verde/15",
      accent: "#56BE76",
      textDark: "text-emerald-700",
      textLight: "text-emerald-100",
    },
  },
  {
    id: "ravi",
    name: "Ravi do Farol",
    role: "Rastreador de pistas",
    avatarPath: "/story/characters/ravi-do-farol.png",
    speechByTone: {
      default: "Farol aceso! A turma vai junta ate o fim.",
      implementacao: "Cada tarefa pronta acende mais uma luz.",
      participantes: "Pista encontrada! Ponto dobrado pra galera.",
      apoiadores: "Rede de apoio forte deixa tudo iluminado.",
    },
    palette: {
      ring: "border-mar-cobre/50",
      bg: "bg-mar-cobre/15",
      accent: "#EC8C67",
      textDark: "text-orange-700",
      textLight: "text-orange-100",
    },
  },
  {
    id: "luna",
    name: "Luna da Mare",
    role: "Artista da memoria",
    avatarPath: "/story/characters/luna-da-mare.png",
    speechByTone: {
      default: "Com cor e carinho, a memoria ganha vida.",
      implementacao: "Boa historia organiza, inspira e deixa legado.",
      participantes: "Desenhar e brincar tambem e aprender.",
      apoiadores: "Cada parceria faz nossa voz chegar mais longe.",
    },
    palette: {
      ring: "border-sky-200/45",
      bg: "bg-sky-200/15",
      accent: "#69BCE8",
      textDark: "text-sky-700",
      textLight: "text-sky-100",
    },
  },
  {
    id: "mari",
    name: "Mari Siqueira",
    role: "Voz das marisqueiras",
    avatarPath: "/story/characters/mari-siqueira.png",
    speechByTone: {
      default: "Mariscar tambem e guardar memoria viva do territorio.",
      implementacao: "Toda trilha fica mais forte quando escuta as mulheres do cais.",
      participantes: "Bora juntar as pistas da areia, da mare e da comunidade.",
      apoiadores: "Apoiar a memoria de Perocao e apoiar quem sustenta esse saber.",
    },
    palette: {
      ring: "border-amber-300/45",
      bg: "bg-amber-100/20",
      accent: "#D98A43",
      textDark: "text-amber-700",
      textLight: "text-amber-100",
    },
  },
];

type CharacterRosterProps = {
  mode?: "full" | "compact";
  theme?: StoryTheme;
  tone?: StoryTone;
  avatarMood?: AvatarMood;
  animated?: boolean;
  className?: string;
};

function CharacterIcon({ accent, seed }: { accent: string; seed: number }) {
  const eyeOffset = 14 + seed;
  const smile = 35 + seed;

  return (
    <svg viewBox="0 0 76 76" className="story-avatar-icon h-10 w-10" role="img" aria-label="Avatar ilustrado">
      <circle cx="38" cy="38" r="34" fill={accent} opacity="0.22" />
      <circle cx="38" cy="38" r="25" fill="#ffe4c2" />
      <circle cx="38" cy="38" r="28" fill="none" stroke={accent} strokeOpacity="0.35" strokeWidth="1.6" strokeDasharray="5 4" />
      <circle cx="29" cy={eyeOffset} r="2.4" fill="#27435B" />
      <circle cx="47" cy={eyeOffset + 1} r="2.4" fill="#27435B" />
      <path d={`M26 ${smile} C33 ${smile + 7}, 43 ${smile + 7}, 50 ${smile}`} fill="none" stroke="#27435B" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M16 28 C23 14, 54 14, 60 30" fill="none" stroke="#27435B" strokeWidth="4" strokeLinecap="round" opacity="0.5" />
    </svg>
  );
}

function CharacterAvatar({
  character,
  seed,
  mood,
}: {
  character: Character;
  seed: number;
  mood: AvatarMood;
}) {
  const avatarPath = resolveAvatarPath(character, mood);

  if (avatarPath) {
    return (
      <div className="relative h-10 w-10 overflow-hidden rounded-full border border-white/30 bg-white/15">
        <Image
          src={avatarPath}
          alt={character.name}
          fill
          sizes="40px"
          className="object-cover"
        />
      </div>
    );
  }

  return <CharacterIcon accent={character.palette.accent} seed={seed} />;
}

function resolveAvatarPath(character: Character, mood: AvatarMood): string | undefined {
  if (!character.avatarPath) {
    return undefined;
  }

  if (mood === "base") {
    return character.avatarPath;
  }

  const slugByCharacterId: Record<string, string> = {
    pedro: "pedro-cao",
    bia: "bia-das-conchas",
    ravi: "ravi-do-farol",
    luna: "luna-da-mare",
    mari: "mari-siqueira",
  };

  const slug = slugByCharacterId[character.id];
  if (!slug) {
    return character.avatarPath;
  }

  return `/story/characters/variants/${slug}-${mood}.png`;
}

export function CharacterRoster({ mode = "full", theme = "dark", tone = "default", avatarMood = "base", animated = true, className = "" }: CharacterRosterProps) {
  const roleTextClass = theme === "dark" ? "text-white/85" : "text-mar-escuro/70";
  const speechTextClass = theme === "dark" ? "text-white/80" : "text-mar-escuro/70";

  if (mode === "compact") {
    return (
      <div className={`grid gap-2 sm:grid-cols-2 lg:grid-cols-3 ${className}`.trim()}>
        {characters.map((character, index) => (
          <div
            key={character.id}
            className={`story-avatar-compact flex items-center gap-2 rounded-xl border ${character.palette.ring} ${character.palette.bg} px-3 py-2`}
            style={animated ? { animationDelay: `${index * 90}ms` } : undefined}
          >
            <CharacterAvatar character={character} seed={index} mood={avatarMood} />
            <div className="min-w-0">
              <p
                className={`truncate text-[11px] font-semibold uppercase tracking-[0.12em] ${
                  theme === "dark" ? character.palette.textLight : character.palette.textDark
                }`}
              >
                {character.name}
              </p>
              <p className={`truncate text-xs ${roleTextClass}`}>{character.role}</p>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`grid gap-3 sm:grid-cols-2 xl:grid-cols-5 ${className}`.trim()}>
      {characters.map((character, index) => (
        <article
          key={character.id}
          className={`story-avatar-card rounded-2xl border ${character.palette.ring} ${character.palette.bg} p-3`}
          data-story-accent={character.id}
          style={animated ? { animationDelay: `${index * 110}ms` } : undefined}
        >
          <div className="flex items-center gap-2">
            <CharacterAvatar character={character} seed={index} mood={avatarMood} />
            <div>
              <p
                className={`story-avatar-name inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] ${
                  theme === "dark" ? character.palette.textLight : character.palette.textDark
                }`}
              >
                {character.name}
              </p>
              <p className={`text-xs ${roleTextClass}`}>{character.role}</p>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45">
            <span className="h-px flex-1 bg-white/15" />
            Voz da patrulha
            <span className="h-px flex-1 bg-white/15" />
          </div>
          <p className={`story-avatar-speech mt-2 rounded-lg border border-white/20 bg-white/10 px-2.5 py-2 text-xs leading-relaxed ${speechTextClass}`}>
            {character.speechByTone[tone]}
          </p>
        </article>
      ))}
    </div>
  );
}

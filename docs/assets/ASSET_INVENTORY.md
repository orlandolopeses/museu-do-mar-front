# Museu do Mar Front — Inventário de Assets (fonte da verdade)

Este repositório usa **Estratégia 1**: assets versionados no GitHub, dentro de `public/`, para permitir deploy automatizado (`git pull` + build + restart) sem Drive/ZIP.

## Regra
- **Não inventar nomes**: os paths abaixo são o contrato. Substitua o conteúdo (PNG) mantendo o mesmo nome.
- Assets devem ficar em **`public/story/...`** e ser referenciados no código como **`/story/...`**.

## 1) Landing / Hero (Home)
| Path (public/) | URL runtime | Consumido por |
|---|---|---|
| `public/story/applications/cais-perocao-hero-bg.png` | `/story/applications/cais-perocao-hero-bg.png` | `src/components/landing/MobileHero.tsx` (background) |
| `public/story/applications/hero-turma-mangue-clean.png` | `/story/applications/hero-turma-mangue-clean.png` | `src/components/landing/MobileHero.tsx` (poster, `object-contain`) |

## 2) Cenas canônicas (storytelling)
| Path (public/) | URL runtime | Consumido por |
|---|---|---|
| `public/story/applications/cena-chamado-mare.png` | `/story/applications/cena-chamado-mare.png` | `storyCampaignScenes` / páginas de storytelling |
| `public/story/applications/cena-trilhas-territorio.png` | `/story/applications/cena-trilhas-territorio.png` | `storyCampaignScenes` / páginas de storytelling |
| `public/story/applications/cena-tesouro-coletivo.png` | `/story/applications/cena-tesouro-coletivo.png` | `storyCampaignScenes` / páginas de storytelling |

## 3) Personagens — Avatares base
| Path (public/) | URL runtime | Consumido por |
|---|---|---|
| `public/story/characters/pedro-cao.png` | `/story/characters/pedro-cao.png` | `src/components/story/CharacterRoster.tsx` |
| `public/story/characters/bia-das-conchas.png` | `/story/characters/bia-das-conchas.png` | `src/components/story/CharacterRoster.tsx` |
| `public/story/characters/ravi-do-farol.png` | `/story/characters/ravi-do-farol.png` | `src/components/story/CharacterRoster.tsx` |
| `public/story/characters/luna-da-mare.png` | `/story/characters/luna-da-mare.png` | `src/components/story/CharacterRoster.tsx` |
| `public/story/characters/mari-siqueira.png` | `/story/characters/mari-siqueira.png` | `src/components/story/CharacterRoster.tsx` |

## 4) Personagens — Variantes (moods)
Nome: `public/story/characters/variants/<slug>-<mood>.png`
- moods suportados: `travesso`, `acolhedor`

| Path (public/) | URL runtime |
|---|---|
| `public/story/characters/variants/pedro-cao-travesso.png` | `/story/characters/variants/pedro-cao-travesso.png` |
| `public/story/characters/variants/pedro-cao-acolhedor.png` | `/story/characters/variants/pedro-cao-acolhedor.png` |
| `public/story/characters/variants/bia-das-conchas-travesso.png` | `/story/characters/variants/bia-das-conchas-travesso.png` |
| `public/story/characters/variants/bia-das-conchas-acolhedor.png` | `/story/characters/variants/bia-das-conchas-acolhedor.png` |
| `public/story/characters/variants/ravi-do-farol-travesso.png` | `/story/characters/variants/ravi-do-farol-travesso.png` |
| `public/story/characters/variants/ravi-do-farol-acolhedor.png` | `/story/characters/variants/ravi-do-farol-acolhedor.png` |
| `public/story/characters/variants/luna-da-mare-travesso.png` | `/story/characters/variants/luna-da-mare-travesso.png` |
| `public/story/characters/variants/luna-da-mare-acolhedor.png` | `/story/characters/variants/luna-da-mare-acolhedor.png` |
| `public/story/characters/variants/mari-siqueira-travesso.png` | `/story/characters/variants/mari-siqueira-travesso.png` |
| `public/story/characters/variants/mari-siqueira-acolhedor.png` | `/story/characters/variants/mari-siqueira-acolhedor.png` |

## 5) Validação (CI local)
Smoke test de assets:

```bash
node scripts/validate-story-assets.mjs
```

Critério de pronto:
- Smoke test OK
- DevTools > Network: 0x 404 para `/story/...`


# Museu do Mar Front — Workflow (assets + deploy)

## Fonte da verdade
- **Código + assets** vivem neste repo.
- Assets: `public/story/...`
- URLs runtime: `/story/...`

## Branch / PR
- Trabalho em `feat/home-redesign`.
- PR para `main` quando pronto.

## Smoke test de assets
Antes de abrir/atualizar PR:

```bash
node scripts/validate-story-assets.mjs
```

## Dev check

```bash
npm run dev
```

Verificar:
- DevTools > Network: 0x 404 para `/story/...`
- Hero (poster) sem corte (MobileHero usa `object-contain`).

## Deploy (automatizado)
Após merge em `main`:

```bash
git pull
npm ci
npm run build
sudo systemctl restart museu-do-mar-site
```

(ajustar o nome do serviço e o caminho do repo no VPS conforme runbook local)

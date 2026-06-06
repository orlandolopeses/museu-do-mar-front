# Protocolo de Construcao de Inteligencia — Museu do Mar (frontend)

Frontend Next.js do cliente Museu do Mar — area publica, autenticada e painel admin.

## Blocos canonicos

- `README.md` — stack, runtime, variaveis, deploy
- `INTELIGENCIA.md` — este arquivo
- `REGISTRO.md` — marcos e mudancas

## Ordem de retomada

1. `README.md`
2. `INTELIGENCIA.md` / `REGISTRO.md`
3. `src/app/` — rotas Next.js
4. `drizzle/` — schema e migracoes

## Regras minimas

- Nunca versionar `.env` (usar `.env.example`).
- Registrar mudancas de contrato de auth ou schema em `REGISTRO.md`.
- Submodulo do superprojeto `lab-ia-2` em `clients/museu-do-mar-front`.

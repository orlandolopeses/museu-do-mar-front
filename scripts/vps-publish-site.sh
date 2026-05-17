#!/usr/bin/env bash
set -euo pipefail

# Publicacao unificada do site Museu do Mar no VPS.
# Uso rapido:
#   sudo bash scripts/vps-publish-site.sh
#
# Variaveis opcionais:
#   APP_DIR=/srv/museu-do-mar/site
#   SERVICE_NAME=museu-do-mar-site
#   DOMAIN=https://museudomares.duckdns.org
#   BRANCH=main
#   SKIP_GIT_PULL=true
#   RUN_NPM_CI=true

APP_DIR="${APP_DIR:-/srv/museu-do-mar/site}"
SERVICE_NAME="${SERVICE_NAME:-museu-do-mar-site}"
DOMAIN="${DOMAIN:-https://museudomares.duckdns.org}"
BRANCH="${BRANCH:-}"
SKIP_GIT_PULL="${SKIP_GIT_PULL:-false}"
RUN_NPM_CI="${RUN_NPM_CI:-true}"

log() {
  printf "\n[%s] %s\n" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*"
}

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    log "ERRO: comando obrigatorio ausente: $1"
    exit 1
  fi
}

require_cmd npm
require_cmd curl
require_cmd systemctl

if [[ ! -d "$APP_DIR" ]]; then
  log "ERRO: diretorio do app nao encontrado: $APP_DIR"
  exit 1
fi

cd "$APP_DIR"

if [[ ! -f package.json ]]; then
  log "ERRO: package.json nao encontrado em $APP_DIR"
  exit 1
fi

log "Diretorio do app: $APP_DIR"
log "Servico alvo: $SERVICE_NAME"

if [[ "$SKIP_GIT_PULL" != "true" ]]; then
  if command -v git >/dev/null 2>&1 && [[ -d .git ]]; then
    log "Sincronizando codigo com git"
    git fetch --all --prune
    if [[ -n "$BRANCH" ]]; then
      git checkout "$BRANCH"
      git pull --ff-only origin "$BRANCH"
    else
      git pull --ff-only
    fi
  else
    log "Git nao detectado neste diretorio; seguindo sem pull"
  fi
else
  log "SKIP_GIT_PULL=true, seguindo sem git pull"
fi

if [[ "$RUN_NPM_CI" == "true" ]]; then
  log "Instalando dependencias com npm ci"
  npm ci
else
  log "RUN_NPM_CI=false, pulando npm ci"
fi

log "Executando bootstrap de banco"
npm run db:bootstrap

log "Executando preflight de deploy"
npm run deploy:preflight

log "Reiniciando servico"
sudo systemctl restart "$SERVICE_NAME"

log "Status do servico"
sudo systemctl status "$SERVICE_NAME" --no-pager -n 30

log "Validando endpoints publicos"
for path in \
  "/" \
  "/acervo/laboratorio" \
  "/participar/gincanas/perocao"; do
  code="$(curl -sS -o /dev/null -w "%{http_code}" "$DOMAIN$path")"
  printf "%s%s -> %s\n" "$DOMAIN" "$path" "$code"
done

log "Publicacao concluida"

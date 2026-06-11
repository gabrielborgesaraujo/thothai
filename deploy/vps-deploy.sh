#!/usr/bin/env bash
#
# Deploy de produção do ThothAI em uma VPS Linux (CentOS/RHEL e afins) que já tem
# Docker (com o plugin compose) e Nginx Proxy Manager (NPM) na borda fazendo TLS.
#
# O que o script faz:
#   1. valida docker + docker compose;
#   2. no primeiro uso, cria o .env de produção interativamente (segredos fortes
#      gerados automaticamente) com permissão 600;
#   3. builda as imagens e sobe o stack (docker-compose.prod.yml);
#   4. aguarda o health check do backend e roda um smoke test;
#   5. imprime o passo a passo dos Proxy Hosts a criar no NPM.
#
# Uso (na raiz do repositório ou de qualquer lugar):
#   ./deploy/vps-deploy.sh            # primeiro deploy ou redeploy
#   ./deploy/vps-deploy.sh update     # git pull + rebuild + up
#   ./deploy/vps-deploy.sh backup     # pg_dump comprimido em ./backups (retém os 14 últimos)
#   ./deploy/vps-deploy.sh status     # docker compose ps
#   ./deploy/vps-deploy.sh logs       # docker compose logs -f
#   ./deploy/vps-deploy.sh down       # para o stack (volumes preservados)
#
# Dica: agende o backup diário no cron da VPS, por exemplo:
#   0 3 * * * cd /caminho/do/repo && ./deploy/vps-deploy.sh backup >> backups/backup.log 2>&1

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

COMPOSE_FILE=docker-compose.prod.yml
ENV_FILE=.env
COMPOSE=(docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE")

info() { printf '\033[1;34m==>\033[0m %s\n' "$*"; }
ok()   { printf '\033[1;32m ✔\033[0m %s\n' "$*"; }
err()  { printf '\033[1;31m ✖\033[0m %s\n' "$*" >&2; }

gen_secret() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex 24
  else
    tr -dc 'A-Za-z0-9' </dev/urandom | head -c 48
  fi
}

# Lê uma variável KEY=VALUE do .env (sem `source`, para não executar nada).
env_get() {
  grep -E "^$1=" "$ENV_FILE" | head -n1 | cut -d= -f2- | tr -d '\r'
}

check_prereqs() {
  command -v docker >/dev/null 2>&1 || { err "docker não encontrado no PATH."; exit 1; }
  docker info >/dev/null 2>&1 || { err "o daemon do Docker não está acessível (rode como root ou usuário no grupo docker)."; exit 1; }
  docker compose version >/dev/null 2>&1 || { err "plugin 'docker compose' não encontrado (dnf install docker-compose-plugin)."; exit 1; }
  [ -f "$COMPOSE_FILE" ] || { err "$COMPOSE_FILE não encontrado — rode o script a partir do clone do repositório."; exit 1; }
  ok "docker e compose OK"
}

create_env() {
  info "Primeiro deploy: criando o $ENV_FILE de produção (Ctrl+C para abortar)."
  echo

  read -rp "Domínio público do site (ex.: blog.seudominio.com): " DOMAIN
  [ -n "$DOMAIN" ] || { err "o domínio é obrigatório."; exit 1; }
  DOMAIN="${DOMAIN#https://}"; DOMAIN="${DOMAIN#http://}"; DOMAIN="${DOMAIN%%/*}"

  read -rp "Domínio público das mídias [media.$DOMAIN]: " MEDIA_DOMAIN
  MEDIA_DOMAIN="${MEDIA_DOMAIN:-media.$DOMAIN}"
  MEDIA_DOMAIN="${MEDIA_DOMAIN#https://}"; MEDIA_DOMAIN="${MEDIA_DOMAIN#http://}"; MEDIA_DOMAIN="${MEDIA_DOMAIN%%/*}"

  read -rp "Usuário admin do painel [admin]: " ADMIN_USERNAME
  ADMIN_USERNAME="${ADMIN_USERNAME:-admin}"

  read -rsp "Senha do admin (Enter para gerar uma forte): " ADMIN_PASSWORD; echo
  if [ -z "$ADMIN_PASSWORD" ]; then
    ADMIN_PASSWORD="$(gen_secret)"
    GENERATED_ADMIN_PASSWORD=1
  fi

  read -rp "Porta do gateway no host [8088]: " PUBLIC_PORT
  PUBLIC_PORT="${PUBLIC_PORT:-8088}"
  read -rp "Porta do MinIO (mídias) no host [9000]: " MINIO_PORT
  MINIO_PORT="${MINIO_PORT:-9000}"

  echo
  info "As chaves de IA (Anthropic, OpenAI, Gemini, Qwen ou compatíveis) e do Tavily são"
  info "configuradas DEPOIS, pelo painel em Integrações. Os campos abaixo são apenas um"
  info "fallback de servidor (somente Anthropic/Tavily) — pode pular com Enter:"
  read -rp "ANTHROPIC_API_KEY (fallback opcional): " ANTHROPIC_API_KEY
  read -rp "TAVILY_API_KEY (fallback opcional): " TAVILY_API_KEY

  POSTGRES_PASSWORD="$(gen_secret)"
  MINIO_ROOT_PASSWORD="$(gen_secret)"

  umask 177
  cat > "$ENV_FILE" <<EOF
# Gerado por deploy/vps-deploy.sh em $(date -Iseconds). NÃO comitar este arquivo.

# --- PostgreSQL ---
POSTGRES_DB=thothai
POSTGRES_USER=thothai
POSTGRES_PASSWORD=$POSTGRES_PASSWORD

# --- MinIO ---
MINIO_ROOT_USER=thothai-media
MINIO_ROOT_PASSWORD=$MINIO_ROOT_PASSWORD
MINIO_BUCKET=thothai-media
MINIO_PORT=$MINIO_PORT
MINIO_PUBLIC_URL=https://$MEDIA_DOMAIN

# --- Admin único (RF01) ---
ADMIN_USERNAME=$ADMIN_USERNAME
ADMIN_PASSWORD=$ADMIN_PASSWORD

# --- Sessão ---
SESSION_COOKIE_SECURE=true
SESSION_TIMEOUT=30m

# --- Gateway / origem pública ---
PUBLIC_PORT=$PUBLIC_PORT
PUBLIC_ORIGIN=https://$DOMAIN
NG_ALLOWED_HOSTS=$DOMAIN

# --- IA / busca viva (opcionais) ---
AI_PROVIDER=claude
ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY
ANTHROPIC_MODEL=claude-opus-4-8
SEARCH_PROVIDER=tavily
TAVILY_API_KEY=$TAVILY_API_KEY
EOF
  umask 022
  ok "$ENV_FILE criado com permissão 600"
}

deploy() {
  info "Buildando imagens e subindo o stack (pode demorar no primeiro build)…"
  "${COMPOSE[@]}" up -d --build

  local public_port; public_port="$(env_get PUBLIC_PORT)"
  info "Aguardando o backend ficar saudável em http://127.0.0.1:$public_port …"
  local i
  for i in $(seq 1 60); do
    if curl -fsS "http://127.0.0.1:$public_port/actuator/health" >/dev/null 2>&1; then
      ok "backend saudável"
      break
    fi
    if [ "$i" -eq 60 ]; then
      err "timeout aguardando o health check. Veja: ${COMPOSE[*]} logs backend"
      exit 1
    fi
    sleep 5
  done

  info "Smoke test…"
  curl -fsS "http://127.0.0.1:$public_port/" >/dev/null        && ok "portal SSR respondendo"
  curl -fsS "http://127.0.0.1:$public_port/feed.xml" >/dev/null && ok "feed RSS respondendo"
  curl -fsS "http://127.0.0.1:$public_port/robots.txt" >/dev/null && ok "robots.txt respondendo"
}

print_npm_instructions() {
  local domain media_url public_port minio_port host_ip
  domain="$(env_get PUBLIC_ORIGIN)"; domain="${domain#https://}"
  media_url="$(env_get MINIO_PUBLIC_URL)"
  public_port="$(env_get PUBLIC_PORT)"
  minio_port="$(env_get MINIO_PORT)"
  host_ip="$(hostname -I 2>/dev/null | awk '{print $1}')"

  cat <<EOF

────────────────────────────────────────────────────────────────────────
 Stack no ar. Agora crie 2 Proxy Hosts no Nginx Proxy Manager:

 1) Site / painel
    - Domain Names ........ $domain
    - Scheme .............. http
    - Forward Hostname/IP . ${host_ip:-<IP-da-VPS>}   (se o NPM roda em container
                            na mesma VPS, o IP do host na bridge — em geral
                            172.17.0.1 — também funciona)
    - Forward Port ........ $public_port
    - SSL ................. Request a new certificate + Force SSL + HTTP/2
    - Websockets Support .. ON

 2) Mídias (MinIO)
    - Domain Names ........ ${media_url#https://}
    - Scheme .............. http
    - Forward Hostname/IP . ${host_ip:-<IP-da-VPS>}
    - Forward Port ........ $minio_port
    - SSL ................. Request a new certificate + Force SSL

 Depois acesse:
    Portal ......... https://$domain
    Painel admin ... https://$domain/admin/login
    Feed RSS ....... https://$domain/feed.xml

 Configurações feitas pelo próprio painel (Integrações):
    - Motor de IA: escolha o provedor (Anthropic, OpenAI, Gemini, Qwen ou
      OpenAI-compatível) e informe sua chave/modelo.
    - LinkedIn: crie um app em developers.linkedin.com (produtos "Share on
      LinkedIn" + "Sign In with LinkedIn using OpenID Connect") e cadastre
      esta redirect URL no app:
          https://$domain/api/admin/social/linkedin/callback

 Comandos úteis:
    ${COMPOSE[*]} ps
    ${COMPOSE[*]} logs -f backend
    ./deploy/vps-deploy.sh update     # atualizar para a última versão
    ./deploy/vps-deploy.sh backup     # backup do banco (agende no cron!)
────────────────────────────────────────────────────────────────────────
EOF

  if [ "${GENERATED_ADMIN_PASSWORD:-0}" = "1" ]; then
    echo
    err "GUARDE AGORA a senha gerada do admin (também está no $ENV_FILE):"
    printf '    usuário: %s\n    senha:   %s\n' "$(env_get ADMIN_USERNAME)" "$(env_get ADMIN_PASSWORD)"
  fi
}

case "${1:-deploy}" in
  deploy)
    check_prereqs
    [ -f "$ENV_FILE" ] || create_env
    deploy
    print_npm_instructions
    ;;
  update)
    check_prereqs
    [ -f "$ENV_FILE" ] || { err "sem $ENV_FILE — rode primeiro: ./deploy/vps-deploy.sh"; exit 1; }
    if [ -d .git ] && command -v git >/dev/null 2>&1; then
      info "Atualizando o código (git pull)…"
      git pull --ff-only
    fi
    deploy
    ok "atualização concluída"
    ;;
  backup)
    check_prereqs
    [ -f "$ENV_FILE" ] || { err "sem $ENV_FILE — rode primeiro: ./deploy/vps-deploy.sh"; exit 1; }
    db="$(env_get POSTGRES_DB)"; user="$(env_get POSTGRES_USER)"
    mkdir -p backups
    file="backups/thothai-$(date +%Y%m%d-%H%M%S).sql.gz"
    info "Gerando dump de '$db'…"
    "${COMPOSE[@]}" exec -T postgres pg_dump -U "$user" "$db" | gzip > "$file"
    [ -s "$file" ] || { rm -f "$file"; err "dump vazio — veja os logs do postgres."; exit 1; }
    ok "backup gravado em $file ($(du -h "$file" | cut -f1))"
    # Retenção: mantém os 14 dumps mais recentes.
    ls -1t backups/thothai-*.sql.gz 2>/dev/null | tail -n +15 | xargs -r rm -f --
    echo "Restauração: gunzip -c $file | ${COMPOSE[*]} exec -T postgres psql -U $user $db"
    echo "Atenção: as mídias (volume do MinIO) não entram neste dump — faça backup do volume à parte."
    ;;
  status) check_prereqs; "${COMPOSE[@]}" ps ;;
  logs)   check_prereqs; "${COMPOSE[@]}" logs -f --tail=200 ;;
  down)   check_prereqs; "${COMPOSE[@]}" down; ok "stack parado (volumes preservados)" ;;
  *)
    err "uso: $0 [deploy|update|backup|status|logs|down]"
    exit 1
    ;;
esac

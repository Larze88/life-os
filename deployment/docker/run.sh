#!/usr/bin/env bash
# Entry point: starts an own Tailscale node (userspace networking, ADR-007), publishes
# Life OS via `tailscale serve` (HTTPS on *.ts.net) and then runs the server.
#
# Configuration comes from Home Assistant (/data/options.json) or environment variables:
#   TAILSCALE_AUTH_KEY / tailscale_auth_key   only needed for the very first login
#   TAILSCALE_HOSTNAME / tailscale_hostname   default "lifeos"
#   LOG_LEVEL / log_level                     default "info"
#   TAILSCALE_ENABLED=false                   run without Tailscale (local testing)
set -euo pipefail

OPTIONS_FILE=/data/options.json
TS_SOCKET=/tmp/tailscaled.sock
TS_STATE_DIR=/data/tailscale

option() {
  [ -f "$OPTIONS_FILE" ] || return 0
  node -e '
    const o = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));
    const v = o[process.argv[2]];
    if (v !== undefined && v !== null) process.stdout.write(String(v));
  ' "$OPTIONS_FILE" "$1" 2>/dev/null || true
}

log() { echo "[lifeos] $*"; }

AUTH_KEY="$(option tailscale_auth_key)"; AUTH_KEY="${AUTH_KEY:-${TAILSCALE_AUTH_KEY:-}}"
TS_HOSTNAME="$(option tailscale_hostname)"; TS_HOSTNAME="${TS_HOSTNAME:-${TAILSCALE_HOSTNAME:-lifeos}}"
OPT_LOG_LEVEL="$(option log_level)"; export LOG_LEVEL="${OPT_LOG_LEVEL:-${LOG_LEVEL:-info}}"

mkdir -p /data "$TS_STATE_DIR"

if [ "${TAILSCALE_ENABLED:-true}" = "true" ]; then
  log "starting Tailscale (userspace networking)"
  # --no-logs-no-support: no log upload to Tailscale (privacy). Local tailscaled logs are
  # discarded to keep writes to the microSD card low.
  tailscaled \
    --tun=userspace-networking \
    --statedir="$TS_STATE_DIR" \
    --socket="$TS_SOCKET" \
    --no-logs-no-support \
    >/dev/null 2>&1 &

  for _ in $(seq 1 100); do [ -S "$TS_SOCKET" ] && break; sleep 0.1; done
  ts() { tailscale --socket="$TS_SOCKET" "$@"; }

  state="$(ts status --json 2>/dev/null | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{process.stdout.write(JSON.parse(s).BackendState||"")}catch{}})')"
  if [ "$state" = "Running" ]; then
    log "Tailscale already logged in"
    ts up --hostname="$TS_HOSTNAME" >/dev/null 2>&1 || true
  elif [ -n "$AUTH_KEY" ]; then
    log "logging in to Tailscale as '$TS_HOSTNAME'"
    ts up --auth-key="$AUTH_KEY" --hostname="$TS_HOSTNAME"
  else
    log "ERROR: Tailscale is not logged in and no auth key is configured."
    log "       Create an auth key at https://login.tailscale.com/admin/settings/keys"
    log "       and enter it in the app configuration (tailscale_auth_key)."
    exit 1
  fi

  if ts serve --bg --yes "http://127.0.0.1:${PORT:-8080}" >/dev/null 2>&1 || ts serve --bg "${PORT:-8080}" >/dev/null 2>&1; then
    dns="$(ts status --json | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{process.stdout.write((JSON.parse(s).Self.DNSName||"").replace(/\.$/,""))}catch{}})')"
    log "Life OS is available at https://${dns}"
  else
    log "WARNING: 'tailscale serve' failed. Enable MagicDNS and HTTPS certificates in the"
    log "         Tailscale admin console (DNS page), then restart the app."
  fi
else
  log "Tailscale disabled (TAILSCALE_ENABLED=false)"
fi

exec node /app/backend/dist/server.js

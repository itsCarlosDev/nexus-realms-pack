#!/usr/bin/env bash
set -Eeuo pipefail

readonly PRODUCTION_PACK_URL='https://itscarlosdev.github.io/nexus-realms-pack/pack.toml'
readonly BOOTSTRAP_SHA256='A8FBB24DC604278E97F4688E82D3D91A318B98EFC08D5DBFCBCBCAB6443D116C'
readonly FORGE_ARGS='libraries/net/minecraftforge/forge/1.20.1-47.4.10/unix_args.txt'

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
SERVER_ROOT="${SERVER_ROOT:-$PWD}"
NEXUS_PACK_URL="${NEXUS_PACK_URL:-$PRODUCTION_PACK_URL}"
JAVA_BIN="${JAVA_BIN:-java}"
NEXUS_ALLOW_OFFLINE_START="${NEXUS_ALLOW_OFFLINE_START:-false}"
NEXUS_REQUIRE_UPDATE="${NEXUS_REQUIRE_UPDATE:-true}"
NEXUS_ALLOW_LOCAL_PACK_URL="${NEXUS_ALLOW_LOCAL_PACK_URL:-false}"
NEXUS_PREPARE_ONLY="${NEXUS_PREPARE_ONLY:-false}"
NEXUS_BOOTSTRAP_JAR="${NEXUS_BOOTSTRAP_JAR:-$SERVER_ROOT/packwiz-installer-bootstrap.jar}"

case "$SERVER_ROOT" in
  /*) ;;
  *) SERVER_ROOT="$PWD/$SERVER_ROOT" ;;
esac

if [ ! -d "$SERVER_ROOT" ]; then
  echo "SERVER_ROOT does not exist: $SERVER_ROOT" >&2
  exit 1
fi
SERVER_ROOT="$(cd -- "$SERVER_ROOT" && pwd -P)"

readonly LOG_FILE="$SERVER_ROOT/logs/nexus-update.log"
mkdir -p -- "$SERVER_ROOT/logs"
touch -- "$LOG_FILE"

timestamp() {
  date -u '+%Y-%m-%dT%H:%M:%SZ'
}

log() {
  printf '%s %s\n' "$(timestamp)" "$*" | tee -a "$LOG_FILE"
}

fail() {
  log "[FAIL] $*"
  exit 1
}

require_boolean() {
  case "$2" in
    true|false) ;;
    *) fail "$1 must be true or false; received '$2'." ;;
  esac
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || fail "Required command not found: $1"
}

require_boolean NEXUS_ALLOW_OFFLINE_START "$NEXUS_ALLOW_OFFLINE_START"
require_boolean NEXUS_REQUIRE_UPDATE "$NEXUS_REQUIRE_UPDATE"
require_boolean NEXUS_ALLOW_LOCAL_PACK_URL "$NEXUS_ALLOW_LOCAL_PACK_URL"
require_boolean NEXUS_PREPARE_ONLY "$NEXUS_PREPARE_ONLY"

for command_name in awk cmp curl find grep mktemp sed sha256sum sort tr; do
  require_command "$command_name"
done

lock_dir="$SERVER_ROOT/.nexus-update.lock"
if ! mkdir -- "$lock_dir" 2>/dev/null; then
  fail "Another Nexus update or server process holds $lock_dir"
fi
work_dir=''
cleanup() {
  if [ -n "$work_dir" ] && [ -d "$work_dir" ]; then
    rm -rf -- "$work_dir"
  fi
  rmdir -- "$lock_dir" 2>/dev/null || true
}
trap cleanup EXIT

case "$NEXUS_PACK_URL" in
  http://127.0.0.1:*|http://localhost:*|https://127.0.0.1:*|https://localhost:*)
    if [ "$NEXUS_ALLOW_LOCAL_PACK_URL" != true ]; then
      fail 'A localhost pack URL requires NEXUS_ALLOW_LOCAL_PACK_URL=true.'
    fi
    ;;
esac

case "/$SERVER_ROOT/" in
  */saves/*)
    fail 'SERVER_ROOT must not be inside a Minecraft client saves directory.'
    ;;
  */PrismLauncher/instances/*|*/prismlauncher/instances/*)
    fail 'SERVER_ROOT must not be inside a Prism Launcher client instance.'
    ;;
esac

java_version="$("$JAVA_BIN" -version 2>&1 || true)"
if ! printf '%s\n' "$java_version" | grep -Eq 'version "17\.'; then
  fail "JAVA_BIN must resolve to Java 17. Detected: $java_version"
fi

if [ ! -f "$SERVER_ROOT/server.properties" ]; then
  fail 'Missing server.properties.'
fi
if [ ! -f "$SERVER_ROOT/ops.json" ]; then
  fail 'Missing ops.json.'
fi

owner_uuid_count="$(
  awk '{ count += gsub(/"uuid"[[:space:]]*:/, "") }
       END { print count + 0 }' "$SERVER_ROOT/ops.json"
)"
owner_name_count="$(
  awk '{ count += gsub(/"name"[[:space:]]*:/, "") }
       END { print count + 0 }' "$SERVER_ROOT/ops.json"
)"
owner_level_count="$(
  awk '{ count += gsub(/"level"[[:space:]]*:/, "") }
       END { print count + 0 }' "$SERVER_ROOT/ops.json"
)"
owner_object_open_count="$(
  awk '{ count += gsub(/\{/, "") }
       END { print count + 0 }' "$SERVER_ROOT/ops.json"
)"
owner_object_close_count="$(
  awk '{ count += gsub(/\}/, "") }
       END { print count + 0 }' "$SERVER_ROOT/ops.json"
)"
owner_uuid="$(
  sed -n -E \
    's/.*"uuid"[[:space:]]*:[[:space:]]*"([^"]+)".*/\1/p' \
    "$SERVER_ROOT/ops.json" |
    awk 'NR == 1 { print; exit }' |
    tr 'A-F' 'a-f'
)"
owner_name="$(
  sed -n -E \
    's/.*"name"[[:space:]]*:[[:space:]]*"([^"]+)".*/\1/p' \
    "$SERVER_ROOT/ops.json" |
    awk 'NR == 1 { print; exit }'
)"

if ! grep -Eq '^[[:space:]]*\[' "$SERVER_ROOT/ops.json" ||
   [ "$owner_uuid_count" -ne 1 ] ||
   [ "$owner_name_count" -ne 1 ] ||
   [ "$owner_level_count" -ne 1 ] ||
   [ "$owner_object_open_count" -ne 1 ] ||
   [ "$owner_object_close_count" -ne 1 ] ||
   ! printf '%s\n' "$owner_uuid" |
     grep -Eq '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' ||
   ! printf '%s\n' "$owner_name" | grep -Eq '^[A-Za-z0-9_]{3,16}$' ||
   ! grep -Eq '"level"[[:space:]]*:[[:space:]]*4[[:space:]]*(,|})' "$SERVER_ROOT/ops.json"; then
  fail 'ops.json must contain exactly one operator with a valid Minecraft name and UUID at level 4.'
fi

readonly OWNER_NAME="$owner_name"
readonly OWNER_UUID="$owner_uuid"

if ! grep -Eq '^op-permission-level=4$' "$SERVER_ROOT/server.properties"; then
  fail 'server.properties must contain op-permission-level=4.'
fi

level_name="$(
  sed -n -E 's/^level-name=(.*)$/\1/p' "$SERVER_ROOT/server.properties" |
    awk 'NR == 1 { print; exit }'
)"
level_name="${level_name:-world}"
case "$level_name" in
  *..*|*/*|*\\*) fail "Unsafe level-name: $level_name" ;;
esac
readonly WORLD_ROOT="$SERVER_ROOT/$level_name"
patcher_source="$SCRIPT_DIR/NexusServerPatcher.java"
journeymap_template="$SCRIPT_DIR/templates/journeymap.server.global.config"

if [ ! -f "$NEXUS_BOOTSTRAP_JAR" ]; then
  fail "Missing packwiz installer bootstrap: $NEXUS_BOOTSTRAP_JAR"
fi
bootstrap_hash="$(sha256sum "$NEXUS_BOOTSTRAP_JAR" | awk '{print toupper($1)}')"
if [ "$bootstrap_hash" != "$BOOTSTRAP_SHA256" ]; then
  fail "Unexpected packwiz bootstrap SHA-256: $bootstrap_hash"
fi

if [ ! -f "$patcher_source" ]; then
  fail "Missing shared Java patcher: $patcher_source"
fi
if [ ! -f "$journeymap_template" ]; then
  fail 'Missing JourneyMap runtime template.'
fi

work_dir="$(mktemp -d "$SERVER_ROOT/.nexus-update-stage.XXXXXX")"

snapshot_manifest() {
  local output="$1"
  shift
  : > "$output"
  local relative path
  for relative in "$@"; do
    path="$SERVER_ROOT/$relative"
    if [ -f "$path" ]; then
      printf 'F\t%s\t' "$relative" >> "$output"
      sha256sum "$path" | awk '{print toupper($1)}' >> "$output"
    elif [ -d "$path" ]; then
      printf 'D\t%s\n' "$relative" >> "$output"
      while IFS= read -r -d '' file; do
        local child="${file#"$SERVER_ROOT/"}"
        printf 'F\t%s\t' "$child" >> "$output"
        sha256sum "$file" | awk '{print toupper($1)}' >> "$output"
      done < <(find "$path" -type f -print0 | sort -z)
    else
      printf 'M\t%s\n' "$relative" >> "$output"
    fi
  done
}

critical_files=(
  'ops.json'
  'server.properties'
  'whitelist.json'
  'banned-players.json'
  'banned-ips.json'
  'usercache.json'
  'usernamecache.json'
  'eula.txt'
  'config/voicechat/voicechat-server.properties'
  "$level_name/level.dat"
)

protected_paths=(
  'ops.json'
  'server.properties'
  'whitelist.json'
  'banned-players.json'
  'banned-ips.json'
  'usercache.json'
  'usernamecache.json'
  'eula.txt'
  '.env'
  'secrets'
  'config/voicechat/voicechat-server.properties'
  'journeymap/server'
  'world_nether'
  'world_the_end'
  "$level_name"
)

mkdir -p -- "$work_dir/critical"
for relative in "${critical_files[@]}"; do
  if [ -f "$SERVER_ROOT/$relative" ]; then
    mkdir -p -- "$work_dir/critical/$(dirname -- "$relative")"
    cp -p -- "$SERVER_ROOT/$relative" "$work_dir/critical/$relative"
  fi
done

snapshot_manifest "$work_dir/protected.before" "${protected_paths[@]}"

restore_critical_files() {
  local relative
  for relative in "${critical_files[@]}"; do
    if [ -f "$work_dir/critical/$relative" ]; then
      mkdir -p -- "$SERVER_ROOT/$(dirname -- "$relative")"
      cp -p -- "$work_dir/critical/$relative" "$SERVER_ROOT/$relative"
    fi
  done
}

verify_protected_unchanged() {
  snapshot_manifest "$work_dir/protected.after" "${protected_paths[@]}"
  if ! cmp -s -- "$work_dir/protected.before" "$work_dir/protected.after"; then
    restore_critical_files
    fail 'Protected operational state changed; critical files were restored and startup was stopped.'
  fi
}

set_journeymap_admin() {
  local path="$1"
  local temporary="$work_dir/journeymap-server.toml"

  if ! awk -v uuid="$OWNER_UUID" '
    BEGIN { matches = 0 }
    /^[[:space:]]*serverAdmins[[:space:]]*=/ {
      matches++
      print "\tserverAdmins = [\"" uuid "\"]"
      next
    }
    { print }
    END { if (matches != 1) exit 42 }
  ' "$path" > "$temporary"; then
    fail "JourneyMap config must contain one serverAdmins field: $path"
  fi

  if cmp -s -- "$path" "$temporary"; then
    rm -f -- "$temporary"
    return
  fi

  mv -f -- "$temporary" "$path"
  log 'Synchronized JourneyMap administrator from private ops.json.'
}

published_commit=''

pack_available=true
if ! curl --fail --silent --show-error --location \
  --connect-timeout 10 --max-time 30 \
  "$NEXUS_PACK_URL" -o "$work_dir/pack.toml"; then
  pack_available=false
fi

if [ "$pack_available" = false ]; then
  if [ "$NEXUS_REQUIRE_UPDATE" = true ]; then
    fail "Published pack is unavailable and NEXUS_REQUIRE_UPDATE=true: $NEXUS_PACK_URL"
  fi
  if [ "$NEXUS_ALLOW_OFFLINE_START" != true ]; then
    fail 'Published pack is unavailable and offline start is disabled.'
  fi
  log '[WARN] Pack unavailable; validating the installed server before offline start.'
else
  pack_base="${NEXUS_PACK_URL%/*}"
  manifest_url="$pack_base/manifest.json"

  curl --fail --silent --show-error --location \
    --connect-timeout 10 --max-time 30 \
    "$manifest_url" \
    -o "$work_dir/manifest.json"

  published_commit="$(
    sed -n -E \
      's/^[[:space:]]*"commit"[[:space:]]*:[[:space:]]*"([0-9a-fA-F]{40})".*$/\1/p' \
      "$work_dir/manifest.json" |
      head -n 1 |
      tr 'A-F' 'a-f'
  )"

  if ! printf '%s\n' "$published_commit" |
    grep -Eq '^[0-9a-f]{40}$'; then
    fail 'Published manifest does not contain a valid commit.'
  fi

  log "Published Nexus release: $published_commit"
  index_file="$(
    awk '
      /^\[index\]$/ { in_index = 1; next }
      /^\[/ { in_index = 0 }
      in_index && /^file[[:space:]]*=/ {
        value = $0
        sub(/^[^=]*=[[:space:]]*"/, "", value)
        sub(/"[[:space:]]*$/, "", value)
        print value
        exit
      }
    ' "$work_dir/pack.toml"
  )"
  index_hash="$(
    awk '
      /^\[index\]$/ { in_index = 1; next }
      /^\[/ { in_index = 0 }
      in_index && /^hash[[:space:]]*=/ {
        value = $0
        sub(/^[^=]*=[[:space:]]*"/, "", value)
        sub(/"[[:space:]]*$/, "", value)
        print toupper(value)
        exit
      }
    ' "$work_dir/pack.toml"
  )"
  if [ "$index_file" != 'index.toml' ] || [ -z "$index_hash" ]; then
    fail 'Published pack.toml has an invalid index definition.'
  fi

  curl --fail --silent --show-error --location \
    --connect-timeout 10 --max-time 30 \
    "$pack_base/$index_file" -o "$work_dir/index.toml"
  actual_index_hash="$(
    sha256sum "$work_dir/index.toml" | awk '{print toupper($1)}'
  )"
  if [ "$actual_index_hash" != "$index_hash" ]; then
    fail "Published index hash mismatch: expected $index_hash, got $actual_index_hash"
  fi

  while IFS= read -r managed_path; do
    case "$managed_path" in
      ops.json|server.properties|whitelist.json|banned-players.json|banned-ips.json|usercache.json|usernamecache.json|eula.txt|.env|.env.*|.env/*|secrets|secrets/*|config/voicechat/voicechat-server.properties|journeymap/server|journeymap/server/*|"$level_name"|"$level_name"/*|world|world/*|world_nether|world_nether/*|world_the_end|world_the_end/*|saves|saves/*|logs|logs/*|crash-reports|crash-reports/*)
        fail "Published Packwiz index manages protected path: $managed_path"
        ;;
    esac
  done < <(
    sed -n -E 's/^file[[:space:]]*=[[:space:]]*"([^"]+)"[[:space:]]*$/\1/p' \
      "$work_dir/index.toml"
  )

  case "$NEXUS_PACK_URL" in
    http://127.0.0.1:*|http://localhost:*|https://127.0.0.1:*|https://localhost:*)
      log 'Development localhost URL: using adjacent runtime patch assets.'
      ;;
    *)
      runtime_cache="$SERVER_ROOT/.nexus-runtime-cache"
      runtime_hashes="$work_dir/runtime.sha256"
      curl --fail --silent --show-error --location \
        --connect-timeout 10 --max-time 30 \
        "$pack_base/server/runtime.sha256" -o "$runtime_hashes"
      mkdir -p -- "$runtime_cache/templates"

      for runtime_file in \
        'NexusServerPatcher.java' \
        'templates/journeymap.server.global.config'; do
       expected_runtime_hash=''
        runtime_match_count=0

        while read -r runtime_hash runtime_name runtime_extra; do
          runtime_hash="${runtime_hash%$'\r'}"
          runtime_name="${runtime_name%$'\r'}"

          if [ "$runtime_name" = "$runtime_file" ] &&
             [ "${#runtime_hash}" -eq 64 ] &&
             [[ "$runtime_hash" =~ ^[0-9a-fA-F]+$ ]]; then
            expected_runtime_hash="${runtime_hash^^}"
            runtime_match_count=$((runtime_match_count + 1))
          fi
        done < "$runtime_hashes"

        if [ "$runtime_match_count" -ne 1 ]; then
          fail "Invalid runtime hash entry: $runtime_file"
        fi
        runtime_download="$work_dir/$(basename -- "$runtime_file")"
        curl --fail --silent --show-error --location \
          --connect-timeout 10 --max-time 30 \
          "$pack_base/server/$runtime_file" -o "$runtime_download"
        actual_runtime_hash="$(
          sha256sum "$runtime_download" | awk '{print toupper($1)}'
        )"
        if [ "$actual_runtime_hash" != "$expected_runtime_hash" ]; then
          fail "Runtime asset hash mismatch: $runtime_file"
        fi
        runtime_destination="$runtime_cache/$runtime_file"
        mkdir -p -- "$(dirname -- "$runtime_destination")"
        mv -f -- "$runtime_download" "$runtime_destination"
      done

      patcher_source="$runtime_cache/NexusServerPatcher.java"
      journeymap_template="$runtime_cache/templates/journeymap.server.global.config"
      log 'Published runtime patch assets downloaded and hash-verified.'
      ;;
  esac

  log "Installing published pack: $NEXUS_PACK_URL"
  if ! (
    cd -- "$SERVER_ROOT"
    "$JAVA_BIN" -jar "$NEXUS_BOOTSTRAP_JAR" -g -s server "$NEXUS_PACK_URL"
  ) 2>&1 | tee -a "$LOG_FILE"; then
    verify_protected_unchanged
    if [ "$NEXUS_REQUIRE_UPDATE" = true ] ||
       [ "$NEXUS_ALLOW_OFFLINE_START" != true ]; then
      fail 'Packwiz update failed; server startup is blocked.'
    fi
    log '[WARN] Packwiz failed; continuing only with the previously installed server.'
  fi

  verify_protected_unchanged
  log "Published index verified: $actual_index_hash"
fi

verify_protected_unchanged

journeymap_dir="$SERVER_ROOT/journeymap/server/5.10"
journeymap_global="$journeymap_dir/journeymap.server.global.config"
if [ ! -f "$journeymap_global" ]; then
  mkdir -p -- "$journeymap_dir"
  cp -- "$journeymap_template" \
    "$journeymap_global"
  log "Initialized missing JourneyMap global server configuration."
fi

if [ -d "$WORLD_ROOT" ]; then
  mkdir -p -- "$WORLD_ROOT/serverconfig"

  if [ ! -f "$WORLD_ROOT/serverconfig/ftbessentials.snbt" ]; then
    cp -- "$SERVER_ROOT/defaultconfigs/ftbessentials-server.snbt" \
      "$WORLD_ROOT/serverconfig/ftbessentials.snbt"
    log 'Initialized missing FTB Essentials world configuration.'
  fi

  if [ ! -f "$WORLD_ROOT/serverconfig/ftbranks/ranks.snbt" ]; then
    mkdir -p -- "$WORLD_ROOT/serverconfig/ftbranks"
    cp -- "$SERVER_ROOT/defaultconfigs/ftbranks/ranks.snbt" \
      "$WORLD_ROOT/serverconfig/ftbranks/ranks.snbt"
    log 'Initialized missing FTB Ranks world configuration.'
  fi

  if [ ! -f "$WORLD_ROOT/serverconfig/journeymap-server.toml" ]; then
    cp -- "$SERVER_ROOT/defaultconfigs/journeymap-server.toml" \
      "$WORLD_ROOT/serverconfig/journeymap-server.toml"
    log 'Initialized missing JourneyMap administrative configuration.'
  fi

  set_journeymap_admin \
    "$WORLD_ROOT/serverconfig/journeymap-server.toml"
fi

snapshot_manifest "$work_dir/protected.before" "${protected_paths[@]}"

log 'Applying allowlisted server JAR patches with Java 17.'
"$JAVA_BIN" "$patcher_source" \
  --server-root "$SERVER_ROOT" --apply 2>&1 | tee -a "$LOG_FILE"
"$JAVA_BIN" "$patcher_source" \
  --server-root "$SERVER_ROOT" --check 2>&1 | tee -a "$LOG_FILE"

verify_protected_unchanged

if [ ! -f "$SERVER_ROOT/user_jvm_args.txt" ]; then
  fail 'Missing user_jvm_args.txt.'
fi
if [ ! -f "$SERVER_ROOT/$FORGE_ARGS" ]; then
  fail "Missing Forge 47.4.10 Unix arguments: $FORGE_ARGS"
fi
if ! grep -Eq '^eula=true$' "$SERVER_ROOT/eula.txt"; then
  fail 'eula.txt must contain eula=true before Forge can start.'
fi

log 'Update validation completed; protected operational state is unchanged.'

if [ -n "${published_commit:-}" ]; then
  installed_release_tmp="$SERVER_ROOT/.nexus-installed-release.tmp"
  installed_release="$SERVER_ROOT/.nexus-installed-release"

  printf '%s\n' "$published_commit" \
    > "$installed_release_tmp"

  mv -f \
    "$installed_release_tmp" \
    "$installed_release"

  log "Installed Nexus release: $published_commit"
fi

if [ "$NEXUS_PREPARE_ONLY" = true ]; then
  log 'NEXUS_PREPARE_ONLY=true; Forge launch skipped.'
  exit 0
fi

log 'Starting Forge 1.20.1-47.4.10 with the validated Unix argument file.'
cd -- "$SERVER_ROOT"
"$JAVA_BIN" @user_jvm_args.txt "@$FORGE_ARGS" nogui

server_exit=$?

log "Forge exited with code $server_exit."

update_request="$SERVER_ROOT/.nexus-update-requested"

if [ -f "$update_request" ]; then
  requested_release="$(
    tr -d '\r\n' < "$update_request"
  )"

  rm -f -- "$update_request"

  log \
    "Automatic Nexus update restart requested: $requested_release"

  # Liberar lock y staging antes de volver a ejecutar el updater.
  cleanup
  trap - EXIT

  exec bash "$SCRIPT_DIR/update-server.sh"
fi

exit "$server_exit"

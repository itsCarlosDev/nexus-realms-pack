#!/usr/bin/env bash
set -euo pipefail

PACK_URL="https://USUARIO.github.io/nexus-realms-pack/pack.toml"

if [ ! -f "packwiz-installer-bootstrap.jar" ]; then
  echo "Missing packwiz-installer-bootstrap.jar in the current server folder."
  echo "Download it first, then run this script again."
  exit 1
fi

java -jar packwiz-installer-bootstrap.jar -g -s server "$PACK_URL"


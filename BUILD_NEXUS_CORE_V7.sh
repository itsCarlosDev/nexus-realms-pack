#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/nexus-core"
chmod +x ./gradlew
./gradlew clean check build
echo "[OK] build/libs/nexus-core-0.6.33.jar"

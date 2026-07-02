#!/usr/bin/env bash
set -euo pipefail

if ! command -v packwiz >/dev/null 2>&1; then
  echo "packwiz is not installed or not available in PATH."
  echo "Install packwiz first, then run this script again."
  exit 1
fi

packwiz refresh

echo ""
echo "Pack refreshed."
echo "Recommended next commands:"
echo "  git add ."
echo "  git commit -m \"Update Nexus Realms pack\""
echo "  git push"


#!/usr/bin/env bash
set -euo pipefail

failed=0

check_file() {
  if [ ! -f "$1" ]; then
    echo "ERROR: Missing $1"
    failed=1
  else
    echo "OK: Found $1"
  fi
}

check_file "pack.toml"
check_file "index.toml"
check_file ".gitattributes"

if [ -f ".gitattributes" ]; then
  if grep -Fxq '* -text' .gitattributes; then
    echo "OK: .gitattributes contains '* -text'"
  else
    echo "ERROR: .gitattributes must contain '* -text'"
    failed=1
  fi
fi

for dir in saves logs crash-reports; do
  if [ -d "$dir" ]; then
    echo "WARNING: Local Minecraft folder '$dir/' exists. It should not be committed."
  fi
done

if find mods -maxdepth 1 -type f -name '*.jar' 2>/dev/null | grep -q .; then
  echo "WARNING: Found .jar files in mods/. Prefer packwiz-managed mods when possible:"
  find mods -maxdepth 1 -type f -name '*.jar'
fi

if [ "$failed" -ne 0 ]; then
  echo "Development check failed."
  exit 1
fi

echo "Development check completed."


#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

version=$(node -p "require('./package.json').version")
vsix="kconfig-visual-editor-${version}.vsix"

if [ ! -d node_modules ]; then
    npm install
fi

rm -f kconfig-visual-editor-*.vsix
npx --yes @vscode/vsce package --no-rewrite-relative-links --allow-missing-repository
code --install-extension "$vsix" --force

echo "Installed ${vsix}. Reload the VS Code window (Developer: Reload Window)."

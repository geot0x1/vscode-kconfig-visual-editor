#!/usr/bin/env bash
# Tests and packages the release VSIX once the user confirms.
set -euo pipefail

cd "$(dirname "$0")/.."

version=$(node -p "require('./package.json').version")
tag="v${version}"
vsix="kconfig-visual-editor-${version}.vsix"

print_summary()
{
    echo "Release ${version}"
    echo "  Branch:  $(git rev-parse --abbrev-ref HEAD)"
    echo "  Commit:  $(git log -1 --format='%h %s')"
    echo "  Output:  ${vsix}"
}

print_warnings()
{
    if [ -n "$(git status --porcelain)" ]; then
        echo "Warning: uncommitted changes will be included in the build."
    fi

    if git rev-parse --quiet --verify "refs/tags/${tag}" > /dev/null; then
        echo "Warning: tag ${tag} already exists."
    fi

    if [ -f "$vsix" ]; then
        echo "Warning: ${vsix} already exists and will be overwritten."
    fi
}

confirm_build()
{
    local answer=""

    # A closed or empty input counts as "no".
    read -r -p "Build this release? [y/N] " answer || true
    [[ "$answer" =~ ^([yY]|[yY][eE][sS])$ ]]
}

build_release()
{
    if [ ! -d node_modules ]; then
        npm ci
    fi

    npm test
    npm run package-extension
}

print_summary
print_warnings

if ! confirm_build; then
    echo "Build cancelled."
    exit 1
fi

build_release
echo "Built ${vsix}."

#!/usr/bin/env bash
set -euo pipefail

echo "========================================"
echo " Workbench Bootstrap: Install -> Verify -> Dev"
echo "========================================"

echo "==> 1/4: Installing dependencies..."
pnpm install

echo "==> 2/4: Checking code style & linting (Biome)..."
pnpm lint

echo "==> 3/4: Verifying TypeScript & production build..."
pnpm build

echo "==> 4/4: Starting development server..."
exec pnpm dev

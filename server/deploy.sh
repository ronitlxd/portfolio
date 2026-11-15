#!/usr/bin/env bash
# Builds the site for the home server and deploys it over SSH.
# Usage: bash server/deploy.sh   (from the repo root, settings in server/deploy.env)
set -euo pipefail
cd "$(dirname "$0")/.."

source server/deploy.env
SSH=(ssh -i "${DEPLOY_KEY/#\~/$HOME}" -o IdentitiesOnly=yes -o BatchMode=yes "$DEPLOY_HOST")

echo "== build (base /)"
# MSYS_NO_PATHCONV stops Git Bash on Windows rewriting "/" into a Windows path.
MSYS_NO_PATHCONV=1 VITE_BASE=/ npm run build -- --outDir dist-server

echo "== upload"
tar -C dist-server -cf - . | "${SSH[@]}" 'mkdir -p ~/portfolio && rm -rf ~/portfolio/dist.new && mkdir ~/portfolio/dist.new && tar -xf - -C ~/portfolio/dist.new'
tar -C server -cf - app.py requirements.txt portfolio.service | "${SSH[@]}" 'tar -xf - -C ~/portfolio'

echo "== install and restart"
"${SSH[@]}" '
  set -e
  cd ~/portfolio
  [ -d venv ] || python3 -m venv venv
  venv/bin/pip install -q -r requirements.txt
  rm -rf dist.old && { [ -d dist ] && mv dist dist.old || true; } && mv dist.new dist
  mkdir -p ~/.config/systemd/user
  cp portfolio.service ~/.config/systemd/user/
  systemctl --user daemon-reload
  systemctl --user enable -q portfolio
  systemctl --user restart portfolio
  sleep 2
  curl -fsS localhost:8080/api/health && echo " <- service is up"
'

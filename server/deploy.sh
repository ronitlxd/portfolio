#!/usr/bin/env bash
# Builds the site for the home server and deploys it over SSH.
# Usage: bash server/deploy.sh   (from the repo root, settings in server/deploy.env)
set -euo pipefail
cd "$(dirname "$0")/.."

source server/deploy.env
SSH=(ssh -i "${DEPLOY_KEY/#\~/$HOME}" -o IdentitiesOnly=yes -o BatchMode=yes "$DEPLOY_HOST")

echo "== clippy model file"
node scripts/build-clippy-model.mjs

echo "== build (base /)"
# MSYS_NO_PATHCONV stops Git Bash on Windows rewriting "/" into a Windows path.
MSYS_NO_PATHCONV=1 VITE_BASE=/ npm run build -- --outDir dist-server

echo "== upload"
# /srv/portfolio belongs to the deploy account; the service (account
# `portfolio`) can only read it. Set up once by setup-service-account.sh.
tar -C dist-server -cf - . | "${SSH[@]}" 'rm -rf /srv/portfolio/dist.new && mkdir /srv/portfolio/dist.new && tar -xf - -C /srv/portfolio/dist.new'
tar -C server -cf - app.py requirements.txt portfolio.service Modelfile security_tests.py jailbreak_tests.py | "${SSH[@]}" 'tar -xf - -C /srv/portfolio'

echo "== install and restart"
"${SSH[@]}" '
  set -e
  cd /srv/portfolio
  [ -d venv ] || python3 -m venv venv
  venv/bin/pip install -q -r requirements.txt
  # Ollama is a snap, which can only read files under the home folder.
  install -D -m 644 Modelfile ~/clippy-model/Modelfile
  ollama create ronit-clippy -f ~/clippy-model/Modelfile >/dev/null
  rm -rf dist.old && { [ -d dist ] && mv dist dist.old || true; } && mv dist.new dist
  chmod -R a+rX,go-w dist
  # Changing the unit file needs a manual sudo step (it sets the account).
  cmp -s portfolio.service /etc/systemd/system/portfolio.service || echo "NOTE: portfolio.service changed, install it with: sudo install -m 644 /srv/portfolio/portfolio.service /etc/systemd/system/ && sudo systemctl daemon-reload"
  sudo -n systemctl restart portfolio.service
  # The service can take a few seconds to start listening after a restart.
  for i in $(seq 1 15); do curl -fsS localhost:8080/api/health && { echo " <- service is up"; exit 0; }; sleep 2; done; echo "service did not come up"; exit 1
'

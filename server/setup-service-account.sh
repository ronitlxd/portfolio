#!/usr/bin/env bash
# One-time move of the portfolio service off the main account (SECURITY_PLAN
# S3 and S4). Run on the server, from the folder this file was copied to:
#
#   sudo bash setup-service-account.sh <deploy-user>
#
# The argument is the deploy account (the one deploy.sh logs in as).
# What it does:
#  1. Creates a `portfolio` system account: no password, no login shell,
#     no sudo, no lxd.
#  2. Creates /srv/portfolio, owned by the deploy account. The service can
#     read it but not change it.
#  3. Copies the site, app and Modelfile from ~/portfolio, builds a new venv.
#  4. Lets the deploy account restart this one service without a password,
#     so deploy.sh keeps working. Nothing else.
#  5. Stops the old user service, installs and starts the system service.
# Undo: see the end of this file.
set -euo pipefail

DEPLOY_USER="${1:?usage: sudo bash setup-service-account.sh <deploy-user>}"
OLD="/home/$DEPLOY_USER/portfolio"
NEW=/srv/portfolio
HERE="$(cd "$(dirname "$0")" && pwd)"

[ "$(id -u)" = 0 ] || { echo "run with sudo"; exit 1; }
[ -f "$OLD/app.py" ] || { echo "no $OLD/app.py"; exit 1; }
[ -f "$HERE/portfolio.service" ] || { echo "portfolio.service must sit next to this script"; exit 1; }

echo "== 1. service account"
if ! id portfolio >/dev/null 2>&1; then
  useradd --system --no-create-home --home-dir /nonexistent --shell /usr/sbin/nologin portfolio
fi
id portfolio

echo "== 2. /srv/portfolio"
install -d -o "$DEPLOY_USER" -g "$DEPLOY_USER" -m 755 "$NEW"

echo "== 3. copy files and build the venv"
for f in app.py requirements.txt Modelfile security_tests.py jailbreak_tests.py; do
  [ -f "$OLD/$f" ] && install -o "$DEPLOY_USER" -g "$DEPLOY_USER" -m 644 "$OLD/$f" "$NEW/$f"
done
rm -rf "$NEW/dist"
cp -r "$OLD/dist" "$NEW/dist"
chown -R "$DEPLOY_USER:$DEPLOY_USER" "$NEW/dist"
chmod -R a+rX,go-w "$NEW/dist"
sudo -u "$DEPLOY_USER" python3 -m venv "$NEW/venv"
sudo -u "$DEPLOY_USER" "$NEW/venv/bin/pip" install -q -r "$NEW/requirements.txt"

echo "== 4. passwordless restart of this service only"
# Restart only. Installing a changed unit file stays a manual sudo step,
# because a unit file decides which account the service runs as.
cat > /etc/sudoers.d/portfolio-deploy <<EOF
# deploy.sh restarts the portfolio service. Nothing else.
$DEPLOY_USER ALL=(root) NOPASSWD: /usr/bin/systemctl restart portfolio.service
EOF
chmod 440 /etc/sudoers.d/portfolio-deploy
visudo -cf /etc/sudoers.d/portfolio-deploy

echo "== 5. switch services"
install -o "$DEPLOY_USER" -g "$DEPLOY_USER" -m 644 "$HERE/portfolio.service" "$NEW/portfolio.service"
install -m 644 "$NEW/portfolio.service" /etc/systemd/system/portfolio.service
DEPLOY_UID="$(id -u "$DEPLOY_USER")"
sudo -u "$DEPLOY_USER" XDG_RUNTIME_DIR="/run/user/$DEPLOY_UID" systemctl --user disable --now portfolio || true
systemctl daemon-reload
systemctl enable --now portfolio.service

for i in $(seq 1 15); do
  if curl -fsS http://127.0.0.1:8080/api/health; then
    echo " <- service is up as: $(ps -o user= -C uvicorn | sort -u)"
    echo "Done. $OLD is no longer used and can be deleted later."
    exit 0
  fi
  sleep 2
done
echo "service did not come up, see: journalctl -u portfolio -n 50"
exit 1

# Undo:
#   sudo systemctl disable --now portfolio.service
#   sudo rm /etc/systemd/system/portfolio.service /etc/sudoers.d/portfolio-deploy
#   sudo systemctl daemon-reload
#   systemctl --user enable --now portfolio      (as the deploy account)

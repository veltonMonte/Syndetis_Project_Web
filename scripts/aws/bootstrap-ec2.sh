#!/usr/bin/env bash
# EC2 user data (Amazon Linux 2023): prepares the instance and runs the first deploy.
# The instance profile must allow secretsmanager:GetSecretValue on the Syndetis secret.
# Log: /var/log/syndetis-bootstrap.log
set -euo pipefail
exec > >(tee -a /var/log/syndetis-bootstrap.log) 2>&1

REPO_URL="${REPO_URL:-https://github.com/veltonMonte/Syndetis_Project_Web.git}"
REPO_REF="${REPO_REF:-dev}"
APP_DIR=/opt/syndetis
COMPOSE_VERSION=v2.32.4

dnf install -y docker git jq
systemctl enable --now docker
usermod -aG docker ec2-user

# Compose v2.24.4+ is needed for the !override/!reset tags used by compose.aws.yml.
mkdir -p /usr/local/lib/docker/cli-plugins
curl -fsSL "https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-linux-$(uname -m)" \
  -o /usr/local/lib/docker/cli-plugins/docker-compose
chmod +x /usr/local/lib/docker/cli-plugins/docker-compose

# The Kotlin builds need more memory than a small instance has: add swap once.
if [ ! -f /swapfile ]; then
  fallocate -l 4G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

if [ ! -d "$APP_DIR/.git" ]; then
  git clone "$REPO_URL" "$APP_DIR"
fi
chown -R ec2-user:ec2-user "$APP_DIR"
sudo -u ec2-user -H bash -c "cd '$APP_DIR' && git fetch --tags origin && git checkout --detach '$REPO_REF'"
sudo -u ec2-user -H bash -c "cd '$APP_DIR' && sg docker -c 'scripts/aws/deploy.sh'"

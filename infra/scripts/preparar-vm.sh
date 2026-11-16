#!/usr/bin/env bash
# Prepara a VM Ubuntu (Arm) do ambiente de teste: atualizações, Docker e as portas 80 e 443 no firewall do sistema.
# Idempotente: pode rodar de novo. Rodar NA VM, como o usuário ubuntu:  bash preparar-vm.sh
# (A lista de segurança da Oracle já libera 80 e 443 na rede; as imagens do Ubuntu da Oracle ainda trazem regras de
# iptables que recusam o resto, por isso as portas também são abertas aqui.)
set -euo pipefail

echo "== Atualizando pacotes"
sudo apt-get update -y
sudo DEBIAN_FRONTEND=noninteractive apt-get upgrade -y

echo "== Instalando o Docker (repositório oficial, arm64)"
if ! command -v docker >/dev/null 2>&1; then
  sudo apt-get install -y ca-certificates curl gnupg
  sudo install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  sudo chmod a+r /etc/apt/keyrings/docker.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
    | sudo tee /etc/apt/sources.list.d/docker.list >/dev/null
  sudo apt-get update -y
  sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  sudo usermod -aG docker "$USER"
fi

echo "== Abrindo 80 e 443 no firewall do sistema (antes da regra que recusa o resto)"
for porta in 80 443; do
  if ! sudo iptables -C INPUT -p tcp --dport "$porta" -m state --state NEW -j ACCEPT 2>/dev/null; then
    sudo iptables -I INPUT 6 -p tcp --dport "$porta" -m state --state NEW -j ACCEPT
  fi
done
sudo apt-get install -y iptables-persistent
sudo netfilter-persistent save

echo "== Pronto. Saia e entre de novo no SSH para o grupo docker valer; teste com: docker run --rm hello-world"

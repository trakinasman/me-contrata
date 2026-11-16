#!/usr/bin/env bash
# Tenta criar a VM do ambiente de teste em ciclos, até conseguir. Serve ao erro "Out of host capacity" da Oracle (falta
# temporária de máquinas Arm gratuitas). Roda na pasta infra/ (ou numa cópia dela) e NUNCA destrói nada: só planeja e aplica.
#
# Uso:    bash scripts/tentar-criar-vm.sh            (de preferência em segundo plano)
# Parar:  criar o arquivo parar.flag nesta pasta  (touch parar.flag)  ou matar o processo
# Saída:  tentativas.log (ids mascarados). Ao conseguir, grava vm-criada.flag com o IP público e termina.
#
# Cada ciclo tenta primeiro a VM de 2 OCPUs e 12 GB (o plano aprovado) e depois a de 1 OCPU e 6 GB (o A1.Flex pode ser aumentado
# depois). Ambas ficam dentro do Always Free. Variáveis de ambiente: TF (caminho do terraform), INTERVALO (segundos, padrão 300),
# MAX_HORAS (padrão 24).
set -u
cd "$(dirname "$0")/.." || exit 1

TF="${TF:-/c/Users/rober_cupuuco/tools/terraform/terraform.exe}"
INTERVALO="${INTERVALO:-300}"
MAX_HORAS="${MAX_HORAS:-24}"
LOG="tentativas.log"
PARAR="parar.flag"
TRAVA=".tentativas.trava"

if [ -f "$TRAVA" ] && kill -0 "$(cat "$TRAVA" 2>/dev/null)" 2>/dev/null; then
  echo "Já existe uma rotina rodando (PID $(cat "$TRAVA")). Nada a fazer."
  exit 1
fi
echo $$ > "$TRAVA"
trap 'rm -f "$TRAVA"' EXIT

mascara() { sed -E 's/ocid1\.[a-z]+\.oc1\.[a-z0-9-]*\.[a-z0-9]+/<ocid>/g'; }
log() { echo "[$(date '+%d/%m %H:%M:%S')] $*" >> "$LOG"; }

# Devolve 0 se a VM foi criada, 1 se faltou capacidade, 3 para qualquer outro erro.
tentar() {
  local ocpus="$1" mem="$2" saida
  if ! "$TF" plan -no-color -input=false -out=plano.tfplan -var "ocpus=$ocpus" -var "memoria_gb=$mem" > .plano.txt 2>&1; then
    log "plano falhou (${ocpus} OCPU, ${mem} GB): $(mascara < .plano.txt | grep -m1 -E 'Error|erro' )"
    return 3
  fi
  saida="$("$TF" apply -no-color -input=false plano.tfplan 2>&1 | mascara)"
  if echo "$saida" | grep -q "Apply complete"; then return 0; fi
  if echo "$saida" | grep -qi "out of host capacity"; then log "sem capacidade (${ocpus} OCPU, ${mem} GB)"; return 1; fi
  log "erro inesperado (${ocpus} OCPU, ${mem} GB): $(echo "$saida" | grep -m1 -E 'Error')"
  return 3
}

inicio=$(date +%s)
erros_seguidos=0
log "rotina iniciada (intervalo ${INTERVALO}s, máximo ${MAX_HORAS}h)"
while true; do
  [ -f "$PARAR" ] && { log "parar.flag encontrado: encerrando"; exit 0; }
  if [ $(( $(date +%s) - inicio )) -ge $(( MAX_HORAS * 3600 )) ]; then log "tempo máximo atingido: encerrando sem conseguir"; exit 2; fi

  for tam in "2 12" "1 6"; do
    set -- $tam
    tentar "$1" "$2"; r=$?
    if [ $r -eq 0 ]; then
      ip="$("$TF" output -raw ip_publico 2>/dev/null)"
      log "VM CRIADA (${1} OCPU, ${2} GB). IP público: ${ip}"
      printf 'criada em %s\nocpus=%s memoria_gb=%s\nip=%s\n' "$(date '+%d/%m/%Y %H:%M:%S')" "$1" "$2" "$ip" > vm-criada.flag
      exit 0
    fi
    [ $r -eq 3 ] && erros_seguidos=$((erros_seguidos + 1)) || erros_seguidos=0
    if [ $erros_seguidos -ge 3 ]; then log "3 erros inesperados seguidos: encerrando para não insistir (ver o log)"; exit 3; fi
    sleep 20
  done
  sleep "$INTERVALO"
done

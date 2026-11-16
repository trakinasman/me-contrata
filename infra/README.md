# infra/: ambiente de teste na Oracle Cloud (Terraform)

Cria, no compartimento `me-contrata-teste` da região `sa-saopaulo-1`, o ambiente de **teste** da migração para VPS com containers
(ver "Para o futuro: produção em VPS com containers" no `PROXIMOS_PASSOS.md`):

| Recurso | O que é |
|---|---|
| VCN, internet gateway, tabela de rotas, lista de segurança, sub-rede pública | A rede. Entrada: SSH só dos IPs informados, 80 e 443 para todos |
| Instância `me-contrata-teste` | VM Arm (`VM.Standard.A1.Flex`), 2 OCPUs, 12 GB, disco de 100 GB, Ubuntu 24.04 aarch64 |
| IP público reservado | O endereço não muda se a VM for recriada; é o que vai no registro A do DuckDNS |

Tudo dentro dos limites do **Always Free** (as variáveis têm validação que recusa passar de 2 OCPUs, 12 GB e 200 GB de disco).
No **Free Trial**, o que passa desses limites gasta o crédito.

## Regras

- **Nada de segredo aqui.** A chave privada de API (`~/.oci/`) e a chave SSH privada (`~/.ssh/oci_me_contrata`) ficam fora do repositório.
  O `terraform.tfvars` (com o OCID do compartimento e o seu IP) e o estado (`*.tfstate`) estão no `.gitignore`.
- **Sempre `plan` antes de `apply`**, e o `apply` só com a aprovação do Roberto.
- O estado fica em arquivo local (`infra/terraform.tfstate`). Para um teste isso basta; faça cópia se for importante.
- Esta pasta cria **só a infraestrutura**. O Docker e o firewall do sistema vêm do `scripts/preparar-vm.sh`, rodado na VM depois.

## Uso (o `terraform.exe` está fora do PATH)

```bash
cd infra
cp terraform.tfvars.example terraform.tfvars   # e preencher: OCID do compartimento, caminho da chave pública, seu IP /32
TF=/c/Users/rober_cupuuco/tools/terraform/terraform.exe
$TF init
$TF validate
$TF plan -out=plano.tfplan     # só mostra; não cria nada
$TF apply plano.tfplan         # cria (precisa da aprovação)
$TF output                     # IP público e o comando SSH
$TF destroy                    # apaga tudo o que o Terraform criou (confirma antes)
```

Se o seu IP de casa mudar, o SSH deixa de entrar: atualize `cidrs_ssh` no `terraform.tfvars` e rode `plan` e `apply` de novo.

## Depois de criar a VM

1. Apontar `me-contrata.duckdns.org` (registro A) para o `ip_publico` da saída.
2. Entrar por SSH: `ssh -i ~/.ssh/oci_me_contrata ubuntu@<ip>`.
3. Copiar e rodar `scripts/preparar-vm.sh` na VM (atualizações, Docker, portas 80 e 443).
4. Subir o proxy (Caddy) com HTTPS pelo método HTTP-01 (próxima fase; não precisa do token do DuckDNS).

## Cuidados

- A Oracle pode **recuperar instâncias Always Free ociosas** (CPU e rede abaixo de 20% por 7 dias). É aceitável num teste, desde que os
  backups fiquem **fora** da Oracle.
- Disponibilidade de Arm gratuito varia: o erro "out of host capacity" pode exigir tentar de novo mais tarde.

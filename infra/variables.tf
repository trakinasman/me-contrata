variable "regiao" {
  description = "Região de origem da conta (os recursos Always Free só valem nela)."
  type        = string
  default     = "sa-saopaulo-1"
}

variable "compartimento_ocid" {
  description = "OCID do compartimento me-contrata-teste (vem do terraform.tfvars local, que não vai para o Git)."
  type        = string
}

variable "nome" {
  description = "Prefixo dos nomes dos recursos."
  type        = string
  default     = "me-contrata-teste"
}

variable "chave_ssh_publica" {
  description = "Caminho do arquivo da chave SSH pública que entra na VM."
  type        = string
}

variable "cidrs_ssh" {
  description = "Endereços (CIDR) que podem abrir a porta 22. Use o seu IP com /32. Se o IP mudar, atualize e aplique de novo."
  type        = list(string)
}

# Limites do Always Free: o plano falha se alguém tentar passar disso (no Free Trial, o que passa gasta o crédito).
variable "ocpus" {
  description = "OCPUs da VM Arm (Always Free: até 2 no total)."
  type        = number
  default     = 2
  validation {
    condition     = var.ocpus >= 1 && var.ocpus <= 2
    error_message = "Always Free permite até 2 OCPUs de Arm no total."
  }
}

variable "memoria_gb" {
  description = "Memória da VM Arm em GB (Always Free: até 12 no total)."
  type        = number
  default     = 12
  validation {
    condition     = var.memoria_gb >= 1 && var.memoria_gb <= 12
    error_message = "Always Free permite até 12 GB de memória de Arm no total."
  }
}

variable "disco_gb" {
  description = "Disco de boot em GB (Always Free: 200 GB somando boot e volumes de bloco)."
  type        = number
  default     = 100
  validation {
    condition     = var.disco_gb >= 50 && var.disco_gb <= 200
    error_message = "O disco de boot deve ficar entre 50 e 200 GB (limite Always Free de 200 GB no total)."
  }
}

variable "ip_reservado" {
  description = "Cria um IP público reservado (não muda se a VM for recriada). Se falso, usa o IP efêmero da VM."
  type        = bool
  default     = true
}

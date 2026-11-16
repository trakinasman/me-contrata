terraform {
  required_version = ">= 1.5.0"

  required_providers {
    oci = {
      source  = "oracle/oci"
      version = ">= 5.0.0"
    }
  }
}

# Autenticação pela chave de API do usuário de automação, lida de ~/.oci/config (perfil DEFAULT).
# Nada de segredo neste repositório: a chave privada e o config ficam fora dele.
provider "oci" {
  region              = var.regiao
  config_file_profile = "DEFAULT"
}

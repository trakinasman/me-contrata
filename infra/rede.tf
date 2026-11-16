locals {
  etiquetas = {
    projeto  = "me-contrata"
    ambiente = "teste"
    gerido   = "terraform"
  }
}

resource "oci_core_vcn" "rede" {
  compartment_id = var.compartimento_ocid
  display_name   = "${var.nome}-vcn"
  cidr_blocks    = ["10.0.0.0/16"]
  dns_label      = "mctest"
  freeform_tags  = local.etiquetas
}

resource "oci_core_internet_gateway" "saida" {
  compartment_id = var.compartimento_ocid
  vcn_id         = oci_core_vcn.rede.id
  display_name   = "${var.nome}-igw"
  enabled        = true
  freeform_tags  = local.etiquetas
}

resource "oci_core_route_table" "publica" {
  compartment_id = var.compartimento_ocid
  vcn_id         = oci_core_vcn.rede.id
  display_name   = "${var.nome}-rotas"
  freeform_tags  = local.etiquetas

  route_rules {
    destination       = "0.0.0.0/0"
    destination_type  = "CIDR_BLOCK"
    network_entity_id = oci_core_internet_gateway.saida.id
  }
}

# Entrada: SSH só dos endereços informados; 80 e 443 para todos (HTTPS e o desafio do Let's Encrypt);
# ICMP tipo 3 código 4 (descoberta de MTU). Saída: tudo.
resource "oci_core_security_list" "regras" {
  compartment_id = var.compartimento_ocid
  vcn_id         = oci_core_vcn.rede.id
  display_name   = "${var.nome}-regras"
  freeform_tags  = local.etiquetas

  egress_security_rules {
    destination = "0.0.0.0/0"
    protocol    = "all"
    description = "Saída livre"
  }

  dynamic "ingress_security_rules" {
    for_each = var.cidrs_ssh
    content {
      protocol    = "6"
      source      = ingress_security_rules.value
      description = "SSH"
      tcp_options {
        min = 22
        max = 22
      }
    }
  }

  ingress_security_rules {
    protocol    = "6"
    source      = "0.0.0.0/0"
    description = "HTTP"
    tcp_options {
      min = 80
      max = 80
    }
  }

  ingress_security_rules {
    protocol    = "6"
    source      = "0.0.0.0/0"
    description = "HTTPS"
    tcp_options {
      min = 443
      max = 443
    }
  }

  ingress_security_rules {
    protocol    = "1"
    source      = "0.0.0.0/0"
    description = "ICMP: fragmentação necessária"
    icmp_options {
      type = 3
      code = 4
    }
  }
}

resource "oci_core_subnet" "publica" {
  compartment_id             = var.compartimento_ocid
  vcn_id                     = oci_core_vcn.rede.id
  display_name               = "${var.nome}-publica"
  cidr_block                 = "10.0.1.0/24"
  dns_label                  = "publica"
  route_table_id             = oci_core_route_table.publica.id
  security_list_ids          = [oci_core_security_list.regras.id]
  prohibit_public_ip_on_vnic = false
  freeform_tags              = local.etiquetas
}

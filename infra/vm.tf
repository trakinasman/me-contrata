data "oci_identity_availability_domains" "ads" {
  compartment_id = var.compartimento_ocid
}

# Ubuntu 24.04 para Arm (aarch64), a versão completa (não a Minimal) mais recente.
data "oci_core_images" "ubuntu_arm" {
  compartment_id   = var.compartimento_ocid
  operating_system = "Canonical Ubuntu"
  shape            = "VM.Standard.A1.Flex"
  sort_by          = "TIMECREATED"
  sort_order       = "DESC"

  filter {
    name   = "display_name"
    values = ["^Canonical-Ubuntu-24\\.04-aarch64-.*"]
    regex  = true
  }
}

resource "oci_core_instance" "vm" {
  compartment_id      = var.compartimento_ocid
  availability_domain = data.oci_identity_availability_domains.ads.availability_domains[0].name
  display_name        = var.nome
  shape               = "VM.Standard.A1.Flex"
  freeform_tags       = local.etiquetas

  shape_config {
    ocpus         = var.ocpus
    memory_in_gbs = var.memoria_gb
  }

  source_details {
    source_type             = "image"
    source_id               = data.oci_core_images.ubuntu_arm.images[0].id
    boot_volume_size_in_gbs = var.disco_gb
  }

  create_vnic_details {
    subnet_id        = oci_core_subnet.publica.id
    assign_public_ip = !var.ip_reservado
    hostname_label   = "mctest"
  }

  metadata = {
    ssh_authorized_keys = file(var.chave_ssh_publica)
  }

  lifecycle {
    # Sair uma imagem nova do Ubuntu não deve recriar a VM (e apagar os dados) sem decisão nossa.
    ignore_changes = [source_details[0].source_id]
  }
}

# IP público reservado: ligado ao IP privado da VM, e continua o mesmo se a VM for recriada.
data "oci_core_vnic_attachments" "vm" {
  count          = var.ip_reservado ? 1 : 0
  compartment_id = var.compartimento_ocid
  instance_id    = oci_core_instance.vm.id
}

data "oci_core_private_ips" "vm" {
  count   = var.ip_reservado ? 1 : 0
  vnic_id = data.oci_core_vnic_attachments.vm[0].vnic_attachments[0].vnic_id
}

resource "oci_core_public_ip" "reservado" {
  count          = var.ip_reservado ? 1 : 0
  compartment_id = var.compartimento_ocid
  display_name   = "${var.nome}-ip"
  lifetime       = "RESERVED"
  private_ip_id  = data.oci_core_private_ips.vm[0].private_ips[0].id
  freeform_tags  = local.etiquetas
}

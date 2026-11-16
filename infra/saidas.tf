output "ip_publico" {
  description = "IP público da VM: é o que vai no registro A do DuckDNS."
  value       = var.ip_reservado ? oci_core_public_ip.reservado[0].ip_address : oci_core_instance.vm.public_ip
}

output "ssh" {
  description = "Comando para entrar na VM (a chave privada fica no computador do Roberto)."
  value       = "ssh -i ~/.ssh/oci_me_contrata ubuntu@${var.ip_reservado ? oci_core_public_ip.reservado[0].ip_address : oci_core_instance.vm.public_ip}"
}

output "imagem" {
  description = "Imagem usada na VM."
  value       = data.oci_core_images.ubuntu_arm.images[0].display_name
}

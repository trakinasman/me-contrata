/**
 * Modelo de dados: uma aba por entidade. Toda aba (exceto Rubricas e Log)
 * carrega usuario_id, e nenhuma função devolve linhas de outro usuário.
 */
const ESQUEMA: Record<string, string[]> = {
  Usuarios: ["usuario_id", "email", "nome", "papel", "ativo", "aceite_lgpd_em", "criado_em"],
  Fichas: ["usuario_id", "secao", "item", "texto", "status", "origem", "atualizado_em"],
  Preferencias: ["usuario_id", "titulos", "modalidades", "ufs", "cidades", "aceita_pj", "idiomas", "termos_excluir", "nota_minima"],
  Curriculos: ["curriculo_id", "usuario_id", "tipo", "drive_file_id", "vaga_id", "paginas", "criado_em"],
  Analises: ["analise_id", "usuario_id", "curriculo_id", "rubrica_versao", "total", "parcial", "itens_json", "criado_em"],
  Vagas: ["vaga_id", "usuario_id", "empresa", "titulo", "link", "fonte", "local", "modalidade", "nota_regras", "motivos", "nota_ia", "descartada", "motivo_descarte", "vista_em"],
  Candidaturas: ["usuario_id", "vaga_id", "status", "canal", "cv_usado", "enviado_em", "proxima_cobranca", "obs", "atualizado_em"],
  Textos: ["texto_id", "usuario_id", "vaga_id", "tipo", "conteudo", "limite_caracteres", "versao", "editado_pelo_usuario", "criado_em"],
  Recomendacoes: ["usuario_id", "pessoa", "relacao", "angulo", "status", "pedido_em", "recebida_em"],
  Rubricas: ["rubrica_id", "versao", "item", "pontos", "criterio"],
  Uso_IA: ["usuario_id", "funcao", "modelo", "tokens_entrada", "tokens_saida", "custo_estimado", "data"],
  Log: ["data", "usuario_id", "evento", "detalhe"],
};

/** Listas usadas nas validações de dados da planilha. */
const LISTAS: Record<string, string[]> = {
  papel: ["candidato", "admin"],
  status_ficha: ["confirmado", "a_confirmar", "proibido"],
  status_candidatura: ["nao_enviado", "enviado", "aguardando", "entrevista", "recusado", "descartado"],
  status_recomendacao: ["pedido", "recebida", "aprovada"],
  tipo_curriculo: ["base", "linkedin", "adaptado"],
  modalidade: ["remoto", "hibrido", "presencial"],
  secao_ficha: ["quem_sou", "como_soo", "palavras_usa", "palavras_evita", "posicoes", "fora_dos_limites", "provas"],
};

/** Validações: aba -> coluna -> lista. */
const VALIDACOES: Record<string, Record<string, string>> = {
  Usuarios: { papel: "papel" },
  Fichas: { secao: "secao_ficha", status: "status_ficha" },
  Curriculos: { tipo: "tipo_curriculo" },
  Vagas: { modalidade: "modalidade" },
  Candidaturas: { status: "status_candidatura" },
  Recomendacoes: { status: "status_recomendacao" },
};

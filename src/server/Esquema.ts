/**
 * Modelo de dados: uma aba por entidade. Toda aba (exceto Vagas, Rubricas e Log)
 * carrega usuario_id, e nenhuma função devolve linhas de outro usuário.
 *
 * Vagas (decisão D2, 11/11/2026): Vagas é o catálogo, uma linha por anúncio
 * público, com vaga_id = "<fonte>:<id na fonte>". O que é de cada candidato
 * (nota, motivos, descarte) fica em VagasCandidato, chave usuario_id + vaga_id.
 * A página nunca lista o catálogo inteiro: só as vagas que têm linha do
 * candidato em VagasCandidato.
 */
const ESQUEMA: Record<string, string[]> = {
  Usuarios: ["usuario_id", "email", "nome", "papel", "ativo", "aceite_lgpd_em", "criado_em", "termo_versao", "pasta_id"],
  // Fichas: uma linha por item; `item` é o ID do item (UUID).
  Fichas: ["usuario_id", "secao", "item", "texto", "status", "origem", "atualizado_em"],
  Preferencias: ["usuario_id", "titulos", "modalidades", "ufs", "cidades", "aceita_pj", "idiomas", "termos_excluir", "nota_minima"],
  // ListasBusca (E3-04): uma linha por lista do agente de vagas de cada usuário (nivel, area,
  // excluir, empresas_carreira, grupo:<nome>...). Termos separados por vírgula. O agente só usa
  // as linhas `aprovada`; o que a IA gera entra como `a_revisar`.
  ListasBusca: ["usuario_id", "lista", "termos", "status", "origem", "atualizado_em"],
  Curriculos: ["curriculo_id", "usuario_id", "tipo", "drive_file_id", "vaga_id", "paginas", "criado_em", "texto_drive_id"],
  Analises: ["analise_id", "usuario_id", "curriculo_id", "rubrica_versao", "total", "parcial", "itens_json", "criado_em"],
  Vagas: ["vaga_id", "fonte", "fonte_id", "empresa", "titulo", "link", "local", "modalidade", "publicada_em", "coletada_em", "vista_por_ultimo_em"],
  VagasCandidato: ["usuario_id", "vaga_id", "nota_regras", "motivos", "nota_ia", "descartada", "motivo_descarte", "vista_em", "selecionada_em"],
  Candidaturas: ["usuario_id", "vaga_id", "status", "canal", "cv_usado", "enviado_em", "proxima_cobranca", "obs", "atualizado_em"],
  Textos: ["texto_id", "usuario_id", "vaga_id", "tipo", "conteudo", "limite_caracteres", "versao", "editado_pelo_usuario", "criado_em"],
  Recomendacoes: ["usuario_id", "pessoa", "relacao", "angulo", "status", "pedido_em", "recebida_em"],
  Rubricas: ["rubrica_id", "versao", "item", "pontos", "criterio"],
  Uso_IA: ["usuario_id", "funcao", "modelo", "tokens_entrada", "tokens_saida", "custo_estimado", "data"],
  Log: ["data", "usuario_id", "evento", "detalhe"],
  Sessoes: ["token_hash", "usuario_id", "criado_em", "expira_em", "revogada"],
};

/** Listas usadas nas validações de dados da planilha. */
const LISTAS: Record<string, string[]> = {
  papel: ["candidato", "admin"],
  status_ficha: ["confirmado", "a_confirmar", "proibido"],
  status_candidatura: ["nao_enviado", "enviado", "aguardando", "entrevista", "recusado", "descartado"],
  status_recomendacao: ["pedido", "recebida", "aprovada"],
  tipo_curriculo: ["base", "linkedin", "adaptado"],
  modalidade: ["remoto", "hibrido", "presencial"],
  secao_ficha: ["quem_sou", "como_soo", "personalidade", "palavras_usa", "palavras_evita", "posicoes", "fora_dos_limites", "provas"],
  status_lista: ["a_revisar", "aprovada"],
  uf: ["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"],
};

/** Validações: aba -> coluna -> lista. */
const VALIDACOES: Record<string, Record<string, string>> = {
  Usuarios: { papel: "papel" },
  Fichas: { secao: "secao_ficha", status: "status_ficha" },
  ListasBusca: { status: "status_lista" },
  Curriculos: { tipo: "tipo_curriculo" },
  Vagas: { modalidade: "modalidade" },
  Candidaturas: { status: "status_candidatura" },
  Recomendacoes: { status: "status_recomendacao" },
};

/**
 * Validações que não são lista simples: aba -> coluna -> regra.
 * "caixa" = caixa de seleção (TRUE/FALSE); "nota" = número de 0 a 100;
 * { varios: lista } = um ou mais valores da lista separados por vírgula.
 * Validação de célula ajuda quem edita a planilha à mão, mas não é controle
 * de segurança: as funções do servidor validam de novo o que gravam.
 */
const VALIDACOES_ESPECIAIS: Record<string, Record<string, "caixa" | "nota" | { varios: string }>> = {
  Usuarios: { ativo: "caixa" },
  // descartada sem caixa de seleção: a caixa grava FALSE em todas as linhas vazias e
  // getLastRow() passaria a apontar para o fim da aba.
  VagasCandidato: { nota_regras: "nota", nota_ia: "nota" },
  Preferencias: {
    ufs: { varios: "uf" },
    modalidades: { varios: "modalidade" },
    aceita_pj: "caixa",
    nota_minima: "nota",
  },
};

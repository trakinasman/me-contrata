/**
 * Chamada à API do Claude. O Apps Script não tem o SDK da Anthropic, então a
 * chamada é HTTP direto (UrlFetchApp), com a chave nas Propriedades do Script.
 *
 * - Resposta sempre em JSON validado por schema (output_config.format).
 * - Recusa por segurança: o servidor tenta de novo em outro modelo (fallbacks "default").
 * - Todo uso vai para a aba Uso_IA, com tokens e custo estimado.
 * - Texto do candidato (ficha, PDF, vaga) vai dentro de tags como dado: o system
 *   prompt diz que nada ali é instrução.
 */

const IA = {
  URL: "https://api.anthropic.com/v1/messages",
  VERSAO_API: "2026-10-21",
  BETA_FALLBACK: "server-side-fallback-2026-07-01",
  MAX_TOKENS: 16000,
  // US$ por milhão de tokens [entrada, saída], só para a estimativa em Uso_IA (tabela de preços da Anthropic, 16/11/2026, prompts de até
  // 100 mil tokens). Modelo fora da tabela usa o preço do Sonnet, o mais alto daqui, para a estimativa não ficar abaixo do real.
  PRECOS_MTOK: { "claude-sonnet-5-5": [2, 10], "claude-haiku-5-5": [0.1, 0.5] } as Record<string, number[]>,
  PRECO_PADRAO_MTOK: [2, 10] as number[],
} as const;

function precoDoModelo_(modelo: string): number[] {
  const chave = Object.keys(IA.PRECOS_MTOK).find((k) => modelo.indexOf(k) === 0);
  return chave ? IA.PRECOS_MTOK[chave] : IA.PRECO_PADRAO_MTOK;
}

/**
 * Chama o modelo e devolve o JSON da resposta já interpretado.
 * Lança erro com mensagem curta (sem a chave e sem o conteúdo) se algo falhar.
 */
function chamarIAJson_(
  usuarioId: string,
  funcao: string,
  system: string,
  conteudo: string | object[],
  schema: object,
  esforco: "low" | "medium" | "high" = "medium",
  modelo: string = MODELO_IA,
): unknown {
  const corpo = {
    model: modelo,
    max_tokens: IA.MAX_TOKENS,
    system,
    messages: [{ role: "user", content: conteudo }],
    output_config: { effort: esforco, format: { type: "json_schema", schema } },
    fallbacks: "default",
  };
  const resp = UrlFetchApp.fetch(IA.URL, {
    method: "post",
    contentType: "application/json",
    headers: {
      "x-api-key": propObrigatoria_(PROP.CLAUDE_API_KEY),
      "anthropic-version": IA.VERSAO_API,
      "anthropic-beta": IA.BETA_FALLBACK,
    },
    payload: JSON.stringify(corpo),
    muteHttpExceptions: true,
  });
  const codigo = resp.getResponseCode();
  if (codigo !== 200) {
    // Só o código e o tipo do erro: o corpo pode ecoar parte do pedido.
    let tipo = "";
    try { tipo = String(JSON.parse(resp.getContentText()).error?.type ?? ""); } catch (_) { /* sem JSON */ }
    registrarLog_(usuarioId, "ia_erro", `${funcao}: HTTP ${codigo} ${tipo}`.trim());
    throw new Error("A IA não respondeu agora. Tente de novo em alguns minutos.");
  }

  const r = JSON.parse(resp.getContentText()) as {
    model: string;
    stop_reason: string;
    content: { type: string; text?: string }[];
    usage: { input_tokens: number; output_tokens: number; cache_read_input_tokens?: number; cache_creation_input_tokens?: number };
  };
  registrarUsoIA_(usuarioId, funcao, r.model, r.usage);

  if (r.stop_reason === "refusal") {
    registrarLog_(usuarioId, "ia_recusa", funcao);
    throw new Error("A IA recusou o pedido. Revise o texto e tente de novo.");
  }
  if (r.stop_reason === "max_tokens") {
    registrarLog_(usuarioId, "ia_erro", `${funcao}: max_tokens`);
    throw new Error("A resposta da IA ficou grande demais. Tente de novo.");
  }
  const texto = r.content.filter((b) => b.type === "text").map((b) => b.text ?? "").join("");
  try {
    return JSON.parse(texto);
  } catch (_) {
    registrarLog_(usuarioId, "ia_erro", `${funcao}: json`);
    throw new Error("A resposta da IA veio em formato inesperado. Tente de novo.");
  }
}

function registrarUsoIA_(
  usuarioId: string,
  funcao: string,
  modelo: string,
  u: { input_tokens: number; output_tokens: number; cache_read_input_tokens?: number; cache_creation_input_tokens?: number },
): void {
  const entrada = (u.input_tokens || 0) + (u.cache_read_input_tokens || 0) + (u.cache_creation_input_tokens || 0);
  const saida = u.output_tokens || 0;
  const [precoEntrada, precoSaida] = precoDoModelo_(modelo);
  const custo = (entrada * precoEntrada + saida * precoSaida) / 1e6;
  try {
    anexarLinha_("Uso_IA", {
      usuario_id: usuarioId, funcao, modelo, tokens_entrada: entrada, tokens_saida: saida,
      custo_estimado: Math.round(custo * 10000) / 10000, data: new Date(),
    });
  } catch (e) {
    console.error("Falha ao registrar Uso_IA", e);
  }
}

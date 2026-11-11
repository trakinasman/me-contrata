/**
 * Ficha do candidato (E2-01).
 *
 * - Cada linha da aba Fichas é um item. A coluna `item` guarda o ID do item
 *   (UUID), `texto` o conteúdo e `status` o que a IA pode fazer com ele:
 *   confirmado (pode usar), a_confirmar (espera o candidato) ou proibido
 *   (nunca afirmar).
 * - Toda função começa com exigirAceite_(token) e só toca linhas do usuario_id
 *   da sessão. O navegador manda só o ID do item; a linha é achada pelo par
 *   (usuario_id, item), então o ID de um item de outro usuário dá "não encontrado".
 * - O texto do item é dado do candidato: nunca vira instrução para a IA.
 */

const FICHA = { MAX_TEXTO: 2000, MAX_ITENS: 300 } as const;
const MSG_ITEM_NAO_ENCONTRADO = "Item não encontrado. Recarregue a página.";

/** Seções na ordem da tela. Os IDs são os de LISTAS.secao_ficha. */
const SECOES_FICHA: { id: string; nome: string; dica: string }[] = [
  { id: "quem_sou", nome: "Quem sou", dica: "Formação, área, anos de experiência, o que você faz hoje." },
  { id: "provas", nome: "Provas (resultados)", dica: "Resultados concretos, de preferência com números." },
  { id: "como_soo", nome: "Como sou", dica: "Seu jeito de trabalhar e de se comunicar." },
  { id: "posicoes", nome: "Posições", dica: "O que você defende e como enxerga o seu trabalho." },
  { id: "palavras_usa", nome: "Palavras que uso", dica: "Termos e expressões que soam como você." },
  { id: "palavras_evita", nome: "Palavras que evito", dica: "Clichês e termos que não devem aparecer nos seus textos." },
  { id: "fora_dos_limites", nome: "Fora dos limites", dica: "O que nunca deve ser afirmado sobre você." },
];

interface ItemFicha {
  id: string;
  secao: string;
  texto: string;
  status: string;
  origem: string;
  atualizadoEm: string;
}

interface Ficha {
  secoes: { id: string; nome: string; dica: string; itens: ItemFicha[] }[];
}

// ---------- Funções chamadas pela página ----------

function listarFicha(token: string): Ficha {
  const s = exigirAceite_(token);
  return montarFicha_(s.usuario_id);
}

/**
 * Cria um item (sem id) ou atualiza texto, seção e status de um item existente.
 * Devolve a ficha inteira, já atualizada.
 */
function salvarItemFicha(token: string, dados: { id?: unknown; secao?: unknown; texto?: unknown; status?: unknown }): Ficha {
  const s = exigirAceite_(token);
  const d = dados ?? {};
  const secao = String(d.secao ?? "");
  const status = String(d.status ?? "");
  const texto = String(d.texto ?? "").trim();
  if (!LISTAS.secao_ficha.includes(secao)) throw new Error("Seção inválida.");
  if (!LISTAS.status_ficha.includes(status)) throw new Error("Status inválido.");
  if (!texto) throw new Error("Escreva o texto do item.");
  if (texto.length > FICHA.MAX_TEXTO) throw new Error(`O item passa de ${FICHA.MAX_TEXTO} caracteres.`);

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const { aba, cab, linhas } = lerAba_("Fichas");
    const c = colunasFicha_(cab);
    const agora = new Date();

    if (d.id == null || d.id === "") {
      const qtd = linhas.filter((l) => String(l[c.usuario]).trim() === s.usuario_id).length;
      if (qtd >= FICHA.MAX_ITENS) throw new Error(`A ficha já tem o máximo de ${FICHA.MAX_ITENS} itens.`);
      const id = Utilities.getUuid();
      anexarLinha_("Fichas", {
        usuario_id: s.usuario_id,
        secao,
        item: id,
        texto,
        status,
        origem: "manual",
        atualizado_em: agora,
      });
      registrarLog_(s.usuario_id, "ficha_item_criado", `${secao} ${status}`);
    } else {
      const i = acharLinhaItem_(linhas, c, s.usuario_id, d.id);
      const n = i + 2;
      const antes = String(linhas[i][c.status]).trim();
      // Grava só as células que mudam, nunca a linha inteira lida antes.
      aba.getRange(n, c.secao + 1).setValue(secao);
      aba.getRange(n, c.texto + 1).setValue(celulaTexto_(texto));
      aba.getRange(n, c.status + 1).setValue(status);
      aba.getRange(n, c.atualizado + 1).setValue(agora);
      registrarLog_(s.usuario_id, "ficha_item_editado", antes === status ? status : `${antes} -> ${status}`);
    }
  } finally {
    lock.releaseLock();
  }
  return montarFicha_(s.usuario_id);
}

function excluirItemFicha(token: string, id: unknown): Ficha {
  const s = exigirAceite_(token);
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const { aba, cab, linhas } = lerAba_("Fichas");
    const i = acharLinhaItem_(linhas, colunasFicha_(cab), s.usuario_id, id);
    // O Sheets não deixa apagar todas as linhas não congeladas: garante uma vazia no fim.
    if (aba.getMaxRows() === aba.getLastRow()) aba.insertRowAfter(aba.getLastRow());
    aba.deleteRow(i + 2);
    registrarLog_(s.usuario_id, "ficha_item_excluido", "");
  } finally {
    lock.releaseLock();
  }
  return montarFicha_(s.usuario_id);
}

// ---------- Uso interno ----------

function colunasFicha_(cab: string[]) {
  return {
    usuario: coluna_(cab, "usuario_id"),
    secao: coluna_(cab, "secao"),
    item: coluna_(cab, "item"),
    texto: coluna_(cab, "texto"),
    status: coluna_(cab, "status"),
    origem: coluna_(cab, "origem"),
    atualizado: coluna_(cab, "atualizado_em"),
  };
}

/** Índice (em `linhas`) do item do usuário. Lança erro se não existir ou for de outra pessoa. */
function acharLinhaItem_(
  linhas: unknown[][],
  c: ReturnType<typeof colunasFicha_>,
  usuarioId: string,
  id: unknown,
): number {
  const alvo = String(id ?? "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(alvo)) throw new Error(MSG_ITEM_NAO_ENCONTRADO);
  const i = linhas.findIndex((l) => String(l[c.usuario]).trim() === usuarioId && String(l[c.item]).trim() === alvo);
  if (i < 0) throw new Error(MSG_ITEM_NAO_ENCONTRADO);
  return i;
}

function montarFicha_(usuarioId: string): Ficha {
  const { cab, linhas } = lerAba_("Fichas");
  const c = colunasFicha_(cab);
  const porSecao: Record<string, ItemFicha[]> = {};
  for (const l of linhas) {
    if (String(l[c.usuario]).trim() !== usuarioId) continue;
    const id = String(l[c.item]).trim();
    const secao = String(l[c.secao]).trim();
    if (!id || !LISTAS.secao_ficha.includes(secao)) continue;
    const status = String(l[c.status]).trim();
    const data = l[c.atualizado] instanceof Date ? (l[c.atualizado] as Date).toISOString() : "";
    // Sem atribuição lógica (?? com =): o parser do Apps Script não aceita.
    if (!porSecao[secao]) porSecao[secao] = [];
    porSecao[secao].push({
      id,
      secao,
      texto: String(l[c.texto]),
      // Status estranho (digitado à mão na planilha) volta para revisão: a IA não usa.
      status: LISTAS.status_ficha.includes(status) ? status : "a_confirmar",
      origem: String(l[c.origem]).trim(),
      atualizadoEm: data,
    });
  }
  return { secoes: SECOES_FICHA.map((sec) => ({ ...sec, itens: porSecao[sec.id] ?? [] })) };
}

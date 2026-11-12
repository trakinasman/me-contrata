/**
 * Acesso às abas da planilha pelo nome das colunas (nunca pela posição),
 * para que reordenar colunas na planilha não quebre o código.
 */

function abaObrigatoria_(nome: string): GoogleAppsScript.Spreadsheet.Sheet {
  const aba = planilha_().getSheetByName(nome);
  if (!aba) throw new Error(`Aba ausente: ${nome}. Rode setupAmbiente().`);
  return aba;
}

function cabecalho_(aba: GoogleAppsScript.Spreadsheet.Sheet): string[] {
  return aba.getRange(1, 1, 1, aba.getLastColumn()).getValues()[0].map(String);
}

/** Lê a aba inteira: cabeçalho e linhas de dados (sem o cabeçalho). */
function lerAba_(nome: string): { aba: GoogleAppsScript.Spreadsheet.Sheet; cab: string[]; linhas: unknown[][] } {
  const aba = abaObrigatoria_(nome);
  const valores = aba.getDataRange().getValues();
  const cab = (valores.shift() ?? []).map(String);
  return { aba, cab, linhas: valores };
}

function coluna_(cab: string[], nome: string): number {
  const i = cab.indexOf(nome);
  if (i < 0) throw new Error(`Coluna ausente: ${nome}. Rode setupAmbiente().`);
  return i;
}

/**
 * Acrescenta uma linha montada pelos nomes das colunas; colunas não informadas ficam vazias.
 * Textos passam por celulaTexto_, para nunca virarem fórmula.
 */
function anexarLinha_(nome: string, dados: Record<string, unknown>): void {
  const aba = abaObrigatoria_(nome);
  const linha = cabecalho_(aba).map((c) => (c in dados ? celulaTexto_(dados[c]) : ""));
  aba.appendRow(linha);
}

/**
 * Texto que começa com = + - @ seria lido pelo Sheets como fórmula (e uma
 * fórmula como IMPORTXML roda com a conta dona da planilha). O apóstrofo na
 * frente guarda o valor como texto e não aparece na leitura. Não-textos passam direto.
 */
function celulaTexto_(v: unknown): unknown {
  return typeof v === "string" && /^[=+\-@]/.test(v) ? "'" + v : v;
}

/**
 * Apaga todas as linhas da aba em que a coluna usuario_id é o usuário dado.
 * Devolve quantas linhas apagou. Abas sem a coluna usuario_id são ignoradas.
 */
function apagarLinhasDoUsuario_(nome: string, usuarioId: string): number {
  const { aba, cab, linhas } = lerAba_(nome);
  const c = cab.indexOf("usuario_id");
  if (c < 0 || !usuarioId) return 0;
  const alvo: number[] = [];
  linhas.forEach((l, i) => { if (String(l[c]).trim() === usuarioId) alvo.push(i + 2); });
  if (!alvo.length) return 0;
  // O Sheets não deixa apagar todas as linhas não congeladas: garante uma vazia no fim.
  if (aba.getMaxRows() === aba.getLastRow()) aba.insertRowAfter(aba.getLastRow());
  for (const linha of alvo.reverse()) aba.deleteRow(linha);
  return alvo.length;
}

/** Interpreta TRUE/FALSE vindo da planilha, inclusive digitado à mão ("sim", "1"). */
function verdadeiro_(v: unknown): boolean {
  return v === true || /^(true|verdadeiro|sim|1)$/i.test(String(v).trim());
}

/** Registra um evento na aba Log. Falha no log nunca interrompe a operação principal. */
function registrarLog_(usuarioId: string, evento: string, detalhe: string): void {
  try {
    anexarLinha_("Log", { data: new Date(), usuario_id: usuarioId, evento, detalhe });
  } catch (e) {
    console.error("Falha ao registrar log", evento, e);
  }
}

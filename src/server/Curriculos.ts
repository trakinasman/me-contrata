/**
 * Upload de currículo em PDF (E4-01).
 *
 * - O navegador lê o arquivo e manda em base64 pelo google.script.run. O servidor
 *   confere tudo de novo: tamanho (até 5 MB), assinatura de PDF ("%PDF-") e tipo.
 * - O arquivo vai para a pasta do usuário no Drive, criada no primeiro upload dentro
 *   da pasta raiz (achado A1). O nome da pasta é o usuario_id, nunca o e-mail; o nome
 *   do arquivo é gerado aqui, não vem do navegador.
 * - A aba Curriculos registra o arquivo. O texto do PDF é extraído uma vez na primeira
 *   análise (E4-02, achado A2).
 * - Na exclusão de dados (LGPD) a pasta inteira é apagada (Lgpd.ts).
 */

const CURRICULO = {
  MAX_BYTES: 5 * 1024 * 1024,
  ENVIOS_POR_DIA: 10,
  TIPOS: ["base", "linkedin"], // "adaptado" é gerado pelo app, não enviado
  MIME_PASTA: "application/vnd.google-apps.folder",
} as const;

interface CurriculoResumo {
  id: string;
  tipo: string;
  paginas: number | null;
  criadoEm: string;
}

// ---------- Funções chamadas pela página ----------

function enviarCurriculo(token: string, dados: { tipo?: unknown; base64?: unknown }): { curriculos: CurriculoResumo[] } {
  const s = exigirAceite_(token);
  const d = dados ?? {};
  const tipo = String(d.tipo ?? "");
  if (!(CURRICULO.TIPOS as readonly string[]).includes(tipo)) throw new Error("Tipo de currículo inválido.");

  // base64 de 5 MB tem até ~7 MB de texto; corta antes de decodificar.
  const b64 = typeof d.base64 === "string" ? d.base64 : "";
  if (!b64 || b64.length > Math.ceil(CURRICULO.MAX_BYTES / 3) * 4 + 4 || !/^[A-Za-z0-9+/]+={0,2}$/.test(b64)) {
    throw new Error("Arquivo inválido ou maior que 5 MB.");
  }
  let bytes: number[];
  try { bytes = Utilities.base64Decode(b64); } catch (_) { throw new Error("Arquivo inválido."); }
  if (!bytes.length || bytes.length > CURRICULO.MAX_BYTES) throw new Error("O arquivo passa de 5 MB.");
  if (!ehPdf_(bytes)) throw new Error("Envie um arquivo PDF.");

  const cache = CacheService.getScriptCache();
  const chave = `cvu:${s.usuario_id}:${Utilities.formatDate(new Date(), "America/Sao_Paulo", "yyyyMMdd")}`;
  const vezes = Number(cache.get(chave) || 0);
  if (vezes >= CURRICULO.ENVIOS_POR_DIA) throw new Error("Limite de envios de hoje atingido. Tente amanhã.");
  cache.put(chave, String(vezes + 1), 26 * 3600);

  const agora = new Date();
  const nome = `${tipo}-${Utilities.formatDate(agora, "America/Sao_Paulo", "yyyyMMdd-HHmmss")}.pdf`;
  const blob = Utilities.newBlob(bytes, "application/pdf", nome);
  const arquivo = salvarNaPastaDoUsuario_(s.usuario_id, nome, blob);
  const paginas = contarPaginasPdf_(blob);

  anexarLinha_("Curriculos", {
    curriculo_id: Utilities.getUuid(), usuario_id: s.usuario_id, tipo, drive_file_id: arquivo.id,
    vaga_id: "", paginas: paginas ?? "", criado_em: agora,
  });
  registrarLog_(s.usuario_id, "curriculo_enviado", `${tipo}, ${Math.round(bytes.length / 1024)} KB`);
  return { curriculos: curriculosDoUsuario_(s.usuario_id) };
}

function listarCurriculos(token: string): { curriculos: CurriculoResumo[] } {
  const s = exigirAceite_(token);
  return { curriculos: curriculosDoUsuario_(s.usuario_id) };
}

// ---------- Uso interno ----------

/** Começa com "%PDF-" (assinatura de todo PDF). */
function ehPdf_(bytes: number[]): boolean {
  const assinatura = [0x25, 0x50, 0x44, 0x46, 0x2d];
  return bytes.length > 5 && assinatura.every((b, i) => ((bytes[i] + 256) % 256) === b);
}

/** Conta "/Type /Page" (não "/Pages"). PDF com objetos comprimidos pode esconder: aí devolve null. */
function contarPaginasPdf_(blob: GoogleAppsScript.Base.Blob): number | null {
  const texto = blob.getDataAsString("ISO-8859-1"); // um caractere por byte
  const n = (texto.match(/\/Type\s*\/Page(?![a-zA-Z])/g) || []).length;
  return n > 0 && n <= 500 ? n : null;
}

/**
 * Salva o arquivo na pasta do usuário. A pasta é criada no primeiro upload e o ID vai
 * para Usuarios.pasta_id; se a pasta guardada sumiu, cria outra uma vez.
 */
function salvarNaPastaDoUsuario_(usuarioId: string, nome: string, blob: GoogleAppsScript.Base.Blob, mime = "application/pdf"): DriveV3.Arquivo {
  let pasta = pastaDoUsuario_(usuarioId, false);
  try {
    return Drive.Files.create({ name: nome, parents: [pasta], mimeType: mime }, blob);
  } catch (e) {
    if (!/not ?found|404/i.test(String(e))) throw e;
    pasta = pastaDoUsuario_(usuarioId, true);
    return Drive.Files.create({ name: nome, parents: [pasta], mimeType: mime }, blob);
  }
}

function pastaDoUsuario_(usuarioId: string, recriar: boolean): string {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const { aba, cab, linhas } = lerAba_("Usuarios");
    const cId = coluna_(cab, "usuario_id");
    const cPasta = coluna_(cab, "pasta_id");
    const i = linhas.findIndex((l) => String(l[cId]).trim() === usuarioId);
    if (i < 0) throw new Error("Usuário não encontrado.");
    const atual = String(linhas[i][cPasta]).trim();
    if (atual && !recriar) return atual;
    const pasta = Drive.Files.create({
      name: usuarioId,
      mimeType: CURRICULO.MIME_PASTA,
      parents: [propObrigatoria_(PROP.PASTA_RAIZ_ID)],
    });
    aba.getRange(i + 2, cPasta + 1).setValue(pasta.id);
    return pasta.id;
  } finally {
    lock.releaseLock();
  }
}

function curriculosDoUsuario_(usuarioId: string): CurriculoResumo[] {
  const { cab, linhas } = lerAba_("Curriculos");
  const c = (n: string) => coluna_(cab, n);
  return linhas
    .filter((l) => String(l[c("usuario_id")]).trim() === usuarioId && String(l[c("tipo")]).trim() !== "adaptado")
    .map((l) => {
      const criado = l[c("criado_em")];
      const pag = Number(l[c("paginas")]);
      return {
        id: String(l[c("curriculo_id")]),
        tipo: String(l[c("tipo")]),
        paginas: Number.isFinite(pag) && pag > 0 ? pag : null,
        criadoEm: criado instanceof Date ? criado.toISOString() : String(criado),
      };
    })
    .reverse();
}

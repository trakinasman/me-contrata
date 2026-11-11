/**
 * Termo de aceite (LGPD) e exclusão de dados (E1-05).
 *
 * - Quem não aceitou a versão atual do termo vê o termo antes de entrar.
 *   Mudou o texto do termo em Index.html? Suba TERMO_VERSAO: todos aceitam de novo.
 * - Funções públicas de dados começam com exigirAceite_(token), que já inclui
 *   a checagem de sessão. Só aceitarTermo, sessaoAtual, sair e
 *   excluirMeusDados usam exigirSessao_ direto.
 * - "Excluir meus dados" apaga a pasta do usuário no Drive e todas as linhas
 *   dele em todas as abas, por último a de Usuarios (a pessoa perde o acesso).
 */

const TERMO_VERSAO = "1";
const ERRO_TERMO = "TERMO_PENDENTE";

function aceitarTermo(token: string): { ok: boolean } {
  const s = exigirSessao_(token);
  const { aba, cab, linhas } = lerAba_("Usuarios");
  const cId = coluna_(cab, "usuario_id");
  const i = linhas.findIndex((l) => String(l[cId]).trim() === s.usuario_id);
  if (i < 0) throw new Error(ERRO_SESSAO);
  aba.getRange(i + 2, coluna_(cab, "aceite_lgpd_em") + 1).setValue(new Date());
  aba.getRange(i + 2, coluna_(cab, "termo_versao") + 1).setValue(TERMO_VERSAO);

  // Atualiza a sessão em cache para o aceite valer já na próxima chamada.
  const atualizada: Sessao = { ...s, termo: TERMO_VERSAO };
  const ttl = Math.min(LOGIN.CACHE_SESSAO_S, Math.ceil((s.expira - Date.now()) / 1000));
  CacheService.getScriptCache().put("ses:" + hmac_("sessao:" + token), JSON.stringify(atualizada), Math.max(1, ttl));
  registrarLog_(s.usuario_id, "termo_aceito", "v" + TERMO_VERSAO);
  return { ok: true };
}

/** Sessão válida e termo atual aceito. Use em toda função pública que lê ou grava dados. */
function exigirAceite_(token: unknown): Sessao {
  const s = exigirSessao_(token);
  if (s.termo !== TERMO_VERSAO) throw new Error(ERRO_TERMO);
  return s;
}

function excluirMeusDados(token: string, confirmacao: string): { ok: boolean } {
  if (String(confirmacao ?? "").trim().toUpperCase() !== "EXCLUIR") {
    throw new Error("Digite EXCLUIR para confirmar.");
  }
  // Não exige o termo: quem não aceitou também pode apagar o que houver.
  const s = exigirSessao_(token);
  const id = s.usuario_id;
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    // 1. Pasta no Drive primeiro: se falhar, nada foi apagado e dá para tentar de novo.
    const usuarios = lerAba_("Usuarios");
    const cId = coluna_(usuarios.cab, "usuario_id");
    const linhaUsuario = usuarios.linhas.find((l) => String(l[cId]).trim() === id);
    const pastaId = linhaUsuario ? String(linhaUsuario[coluna_(usuarios.cab, "pasta_id")]).trim() : "";
    if (pastaId) {
      try {
        Drive.Files.remove(pastaId);
      } catch (e) {
        if (!/not ?found|404/i.test(String(e))) throw e;
      }
    }

    // 2. Derruba as sessões em cache de todos os aparelhos do usuário.
    const sessoes = lerAba_("Sessoes");
    const cUsr = coluna_(sessoes.cab, "usuario_id");
    const cHash = coluna_(sessoes.cab, "token_hash");
    const chaves = sessoes.linhas
      .filter((l) => String(l[cUsr]).trim() === id)
      .map((l) => "ses:" + String(l[cHash]));
    if (chaves.length) CacheService.getScriptCache().removeAll(chaves);

    // 3. Linhas em todas as abas; Usuarios por último.
    let total = 0;
    for (const nome of Object.keys(ESQUEMA)) {
      if (nome !== "Usuarios") total += apagarLinhasDoUsuario_(nome, id);
    }
    total += apagarLinhasDoUsuario_("Usuarios", id);

    // Registro sem usuario_id: só que uma exclusão aconteceu.
    registrarLog_("", "exclusao_dados", `${total} linhas${pastaId ? " e a pasta" : ""}`);
  } finally {
    lock.releaseLock();
  }
  return { ok: true };
}

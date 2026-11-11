/**
 * Login por código enviado por e-mail (E1-03) e sessão de 8 horas (E1-04).
 *
 * - O código de 6 dígitos fica só como HMAC no CacheService, por 10 minutos.
 * - 5 códigos errados em 1 hora bloqueiam o e-mail por 1 hora, mesmo que um
 *   código novo seja pedido no meio (o contador é do e-mail, não do código).
 *   No máximo 3 pedidos de código por hora.
 * - Só e-mails ativos da aba Usuarios recebem código, mas a resposta é sempre a
 *   mesma, para não revelar quem está cadastrado.
 * - A sessão é um token aleatório guardado no navegador. Na aba Sessoes fica só
 *   o HMAC do token. O cache serve de atalho por até 10 minutos, porque o
 *   CacheService não guarda nada por 8 horas.
 * - Toda função pública que lida com dados começa com exigirSessao_(token).
 */

const LOGIN = {
  CODIGO_TTL_S: 10 * 60,
  MAX_TENTATIVAS: 5,
  BLOQUEIO_S: 60 * 60,
  MAX_PEDIDOS_HORA: 3,
  SESSAO_MS: 8 * 60 * 60 * 1000,
  CACHE_SESSAO_S: 10 * 60,
} as const;

/** Erro único para qualquer sessão inválida, vencida ou revogada. A página volta ao login. */
const ERRO_SESSAO = "SESSAO_INVALIDA";
const MSG_CODIGO_ENVIADO = "Se o e-mail estiver cadastrado, você vai receber um código em instantes.";
const MSG_CODIGO_INVALIDO = "Código inválido ou expirado.";
const MSG_BLOQUEADO = "Muitas tentativas. Tente de novo em 1 hora.";

interface UsuarioLogin {
  usuario_id: string;
  email: string;
  nome: string;
  papel: string;
  ativo: boolean;
  termo_versao: string;
}

interface Sessao {
  usuario_id: string;
  papel: string;
  expira: number;
  /** Versão do termo LGPD aceita (vazio se ainda não aceitou). */
  termo: string;
}

interface EntradaCodigo {
  h: string;
  expira: number;
}

interface ContadorErros {
  n: number;
  desde: number;
}

// ---------- Funções chamadas pela página ----------

function solicitarCodigo(email: string): { mensagem: string } {
  const e = normalizarEmail_(email);
  if (!e) throw new Error("Digite um e-mail válido.");
  const chave = hmac_("email:" + e);
  const cache = CacheService.getScriptCache();
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    if (cache.get("bloq:" + chave)) return { mensagem: MSG_CODIGO_ENVIADO };

    // O limite vale para qualquer e-mail, cadastrado ou não, para o
    // comportamento não denunciar quem existe.
    const agora = Date.now();
    const pedidos = (JSON.parse(cache.get("ped:" + chave) ?? "[]") as number[])
      .filter((t) => agora - t < 60 * 60 * 1000);
    if (pedidos.length >= LOGIN.MAX_PEDIDOS_HORA) {
      registrarLog_("", "login_limite_pedidos", "");
      return { mensagem: MSG_CODIGO_ENVIADO };
    }
    pedidos.push(agora);
    cache.put("ped:" + chave, JSON.stringify(pedidos), 60 * 60);

    const u = buscarUsuarioPorEmail_(e);
    if (!u || !u.ativo) {
      // O motivo fica só no Log (aba que só o dono vê); a página recebe sempre a mesma mensagem.
      if (u) registrarLog_(u.usuario_id, "login_email_nao_cadastrado", "inativo");
      else registrarLog_("", "login_email_nao_cadastrado", "nao_encontrado");
      return { mensagem: MSG_CODIGO_ENVIADO };
    }

    const codigo = gerarCodigo_();
    const entrada: EntradaCodigo = {
      h: hmac_("codigo:" + e + ":" + codigo),
      expira: agora + LOGIN.CODIGO_TTL_S * 1000,
    };
    cache.put("cod:" + chave, JSON.stringify(entrada), LOGIN.CODIGO_TTL_S);
    MailApp.sendEmail({
      to: e,
      name: "me-contrata",
      subject: "Seu código de acesso ao me-contrata",
      body:
        `Seu código de acesso é ${codigo}.\n\n` +
        "Ele vale por 10 minutos. Se não foi você quem pediu, ignore este e-mail.",
    });
    registrarLog_(u.usuario_id, "login_codigo_enviado", "");
  } finally {
    lock.releaseLock();
  }
  return { mensagem: MSG_CODIGO_ENVIADO };
}

function validarCodigo(
  email: string,
  codigo: string,
): {
  token: string;
  expiraEm: string;
  precisaAceite: boolean;
  usuario: { nome: string; email: string; papel: string };
} {
  const e = normalizarEmail_(email);
  const c = String(codigo ?? "").trim();
  if (!e || !/^\d{6}$/.test(c)) throw new Error(MSG_CODIGO_INVALIDO);
  const chave = hmac_("email:" + e);
  const cache = CacheService.getScriptCache();
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    if (cache.get("bloq:" + chave)) throw new Error(MSG_BLOQUEADO);
    const bruto = cache.get("cod:" + chave);
    if (!bruto) throw new Error(MSG_CODIGO_INVALIDO);

    const entrada = JSON.parse(bruto) as EntradaCodigo;
    const agora = Date.now();
    if (entrada.expira <= agora) {
      cache.remove("cod:" + chave);
      throw new Error(MSG_CODIGO_INVALIDO);
    }

    if (!iguais_(entrada.h, hmac_("codigo:" + e + ":" + c))) {
      // Janela de 1 hora contada a partir do primeiro erro.
      const anterior = JSON.parse(cache.get("err:" + chave) ?? "null") as ContadorErros | null;
      const erros: ContadorErros = anterior && agora - anterior.desde < 60 * 60 * 1000
        ? { n: anterior.n + 1, desde: anterior.desde }
        : { n: 1, desde: agora };
      if (erros.n >= LOGIN.MAX_TENTATIVAS) {
        cache.removeAll(["cod:" + chave, "err:" + chave]);
        cache.put("bloq:" + chave, "1", LOGIN.BLOQUEIO_S);
        registrarLog_("", "login_bloqueio", "");
        throw new Error(MSG_BLOQUEADO);
      }
      const janela = Math.max(1, Math.ceil((erros.desde + 60 * 60 * 1000 - agora) / 1000));
      cache.put("err:" + chave, JSON.stringify(erros), janela);
      const faltam = LOGIN.MAX_TENTATIVAS - erros.n;
      throw new Error(`${MSG_CODIGO_INVALIDO} ${faltam === 1 ? "Resta 1 tentativa" : `Restam ${faltam} tentativas`}.`);
    }

    cache.removeAll(["cod:" + chave, "err:" + chave]);
    const u = buscarUsuarioPorEmail_(e);
    if (!u || !u.ativo) {
      // Código certo, mas o cadastro sumiu ou foi desativado depois do envio.
      registrarLog_(u ? u.usuario_id : "", "login_recusado", u ? "inativo" : "nao_encontrado");
      throw new Error(MSG_CODIGO_INVALIDO);
    }

    const token = Utilities.getUuid().replace(/-/g, "") + Utilities.getUuid().replace(/-/g, "");
    const hash = hmac_("sessao:" + token);
    const expira = agora + LOGIN.SESSAO_MS;
    anexarLinha_("Sessoes", {
      token_hash: hash,
      usuario_id: u.usuario_id,
      criado_em: new Date(agora),
      expira_em: new Date(expira),
      revogada: false,
    });
    const sessao: Sessao = { usuario_id: u.usuario_id, papel: u.papel, expira, termo: u.termo_versao };
    cache.put("ses:" + hash, JSON.stringify(sessao), LOGIN.CACHE_SESSAO_S);
    registrarLog_(u.usuario_id, "login_ok", "");

    return {
      token,
      expiraEm: new Date(expira).toISOString(),
      precisaAceite: u.termo_versao !== TERMO_VERSAO,
      usuario: { nome: u.nome, email: u.email, papel: u.papel },
    };
  } finally {
    lock.releaseLock();
  }
}

/** Confere um token guardado no navegador e devolve os dados básicos de quem está logado. */
function sessaoAtual(token: string): {
  nome: string;
  email: string;
  papel: string;
  expiraEm: string;
  precisaAceite: boolean;
} {
  const s = exigirSessao_(token);
  const u = buscarUsuarioPorId_(s.usuario_id);
  if (!u) throw new Error(ERRO_SESSAO);
  return {
    nome: u.nome,
    email: u.email,
    papel: u.papel,
    expiraEm: new Date(s.expira).toISOString(),
    precisaAceite: u.termo_versao !== TERMO_VERSAO,
  };
}

/** Encerra a sessão. Token inválido ou já vencido não gera erro: o resultado é o mesmo. */
function sair(token: string): { ok: boolean } {
  if (typeof token !== "string" || !/^[0-9a-f]{64}$/.test(token)) return { ok: true };
  const hash = hmac_("sessao:" + token);
  CacheService.getScriptCache().remove("ses:" + hash);
  const linha = acharSessao_(hash);
  if (linha) {
    const { aba, cab } = lerAba_("Sessoes");
    aba.getRange(linha.linha, coluna_(cab, "revogada") + 1).setValue(true);
    registrarLog_(linha.usuario_id, "logout", "");
  }
  return { ok: true };
}

// ---------- Uso interno ----------

/**
 * Valida o token e devolve a sessão. Lança ERRO_SESSAO em qualquer falha.
 * Toda função pública que lê ou grava dados de usuário começa por aqui e usa
 * o usuario_id devolvido; nunca um usuario_id vindo do navegador.
 */
function exigirSessao_(token: unknown): Sessao {
  if (typeof token !== "string" || !/^[0-9a-f]{64}$/.test(token)) throw new Error(ERRO_SESSAO);
  const hash = hmac_("sessao:" + token);
  const cache = CacheService.getScriptCache();
  const agora = Date.now();

  const emCache = cache.get("ses:" + hash);
  if (emCache) {
    const s = JSON.parse(emCache) as Sessao;
    if (s.expira > agora) return s;
    cache.remove("ses:" + hash);
    throw new Error(ERRO_SESSAO);
  }

  const linha = acharSessao_(hash);
  if (!linha || linha.revogada || linha.expira <= agora) throw new Error(ERRO_SESSAO);
  const u = buscarUsuarioPorId_(linha.usuario_id);
  if (!u || !u.ativo) throw new Error(ERRO_SESSAO);

  const s: Sessao = { usuario_id: u.usuario_id, papel: u.papel, expira: linha.expira, termo: u.termo_versao };
  const ttl = Math.min(LOGIN.CACHE_SESSAO_S, Math.ceil((s.expira - agora) / 1000));
  cache.put("ses:" + hash, JSON.stringify(s), Math.max(1, ttl));
  return s;
}

function acharSessao_(hash: string): { linha: number; usuario_id: string; revogada: boolean; expira: number } | null {
  const { cab, linhas } = lerAba_("Sessoes");
  const cHash = coluna_(cab, "token_hash");
  const i = linhas.findIndex((l) => l[cHash] === hash);
  if (i < 0) return null;
  const l = linhas[i];
  const expira = new Date(l[coluna_(cab, "expira_em")] as string | Date).getTime();
  return {
    linha: i + 2,
    usuario_id: String(l[coluna_(cab, "usuario_id")]),
    revogada: verdadeiro_(l[coluna_(cab, "revogada")]),
    expira: isNaN(expira) ? 0 : expira,
  };
}

function buscarUsuarioPorEmail_(email: string): UsuarioLogin | null {
  return buscarUsuario_((u) => u.email === email);
}

function buscarUsuarioPorId_(usuarioId: string): UsuarioLogin | null {
  return buscarUsuario_((u) => u.usuario_id === usuarioId);
}

function buscarUsuario_(filtro: (u: UsuarioLogin) => boolean): UsuarioLogin | null {
  const { aba, cab, linhas } = lerAba_("Usuarios");
  const c = {
    id: coluna_(cab, "usuario_id"),
    email: coluna_(cab, "email"),
    nome: coluna_(cab, "nome"),
    papel: coluna_(cab, "papel"),
    ativo: coluna_(cab, "ativo"),
    criado: coluna_(cab, "criado_em"),
    termo: cab.indexOf("termo_versao"),
  };
  for (let i = 0; i < linhas.length; i++) {
    const l = linhas[i];
    // Linha cadastrada à mão só com e-mail: gera o usuario_id (e a data) e grava.
    if (!String(l[c.id]).trim() && String(l[c.email]).trim()) {
      l[c.id] = Utilities.getUuid();
      aba.getRange(i + 2, c.id + 1).setValue(l[c.id]);
      if (!String(l[c.criado]).trim()) aba.getRange(i + 2, c.criado + 1).setValue(new Date());
    }
    const u: UsuarioLogin = {
      usuario_id: String(l[c.id]).trim(),
      email: String(l[c.email]).trim().toLowerCase(),
      nome: String(l[c.nome]).trim(),
      papel: String(l[c.papel]).trim() || "candidato",
      ativo: verdadeiro_(l[c.ativo]),
      termo_versao: c.termo >= 0 ? String(l[c.termo]).trim() : "",
    };
    if (u.usuario_id && filtro(u)) return u;
  }
  return null;
}

function normalizarEmail_(email: unknown): string {
  const e = String(email ?? "").trim().toLowerCase();
  return e.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) ? e : "";
}

/** 6 dígitos a partir dos 48 primeiros bits aleatórios de um UUID v4. */
function gerarCodigo_(): string {
  const n = parseInt(Utilities.getUuid().replace(/-/g, "").slice(0, 12), 16);
  return String(n % 1000000).padStart(6, "0");
}

/** HMAC-SHA256 em hexadecimal, com o segredo de login das Propriedades do Script. */
function hmac_(texto: string): string {
  const bytes = Utilities.computeHmacSha256Signature(texto, propObrigatoria_(PROP.LOGIN_SEGREDO));
  return bytes.map((b) => ((b + 256) % 256).toString(16).padStart(2, "0")).join("");
}

/** Comparação em tempo constante, para não vazar informação pelo tempo de resposta. */
function iguais_(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let dif = 0;
  for (let i = 0; i < a.length; i++) dif |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return dif === 0;
}

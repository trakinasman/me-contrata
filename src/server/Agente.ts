/**
 * Entrada do agente de vagas (E3-01): o buscar_vagas.py faz POST no web app.
 *
 * Segurança (achado S5):
 * - O segredo do agente (AGENTE_SEGREDO) nunca trafega: o agente manda uma
 *   assinatura HMAC-SHA256 de `ts.nonce.dados`. Sem assinatura válida, nada é lido.
 * - Contra repetição: `ts` precisa estar a menos de 5 min do relógio do servidor
 *   e cada `nonce` só vale uma vez (fica 10 min no cache).
 * - Limites: tamanho do corpo, envios por hora, vagas por envio e tamanho de cada campo.
 * - Toda recusa responde só "nao_autorizado" ou "invalido"; o motivo vai para a aba Log,
 *   sem o segredo e sem o corpo.
 * - Os textos das vagas são dados: entram na planilha protegidos contra fórmula
 *   (celulaTexto_) e nunca viram instrução para a IA.
 *
 * Formato do corpo (JSON):
 *   { ts: segundos desde 1970, nonce: 32 a 64 hex, dados: "<JSON em texto>", assinatura: hex }
 * dados = { acao: "vagas", usuario_id, vagas: [{ fonte, fonte_id, empresa, titulo, link,
 *           local, modalidade, publicada_em, nota, motivos: [texto] }] }
 */

const AGENTE = {
  MAX_CORPO: 1000000,
  MAX_VAGAS: 300,
  MAX_ENVIOS_HORA: 60,
  JANELA_TS_S: 300,
  NONCE_TTL_S: 600,
} as const;

const MODALIDADE_AGENTE: Record<string, string> = {
  remote: "remoto", remoto: "remoto",
  hybrid: "hibrido", hibrido: "hibrido",
  "on-site": "presencial", presencial: "presencial",
};

interface VagaRecebida {
  vaga_id: string;
  fonte: string;
  fonte_id: string;
  empresa: string;
  titulo: string;
  link: string;
  local: string;
  modalidade: string;
  publicada_em: string;
  nota: number;
  motivos: string;
}

function doPost(e: GoogleAppsScript.Events.DoPost): GoogleAppsScript.Content.TextOutput {
  try {
    const corpo = e && e.postData ? String(e.postData.contents || "") : "";
    if (!corpo || corpo.length > AGENTE.MAX_CORPO) return recusarAgente_("invalido", "corpo_vazio_ou_grande");

    let env: { ts?: unknown; nonce?: unknown; dados?: unknown; assinatura?: unknown };
    try { env = JSON.parse(corpo); } catch (_) { return recusarAgente_("invalido", "json"); }

    const motivo = conferirAssinaturaAgente_(env);
    if (motivo) return recusarAgente_("nao_autorizado", motivo);

    if (!dentroDoLimiteAgente_()) return recusarAgente_("invalido", "limite_envios");

    let dados: { acao?: unknown; usuario_id?: unknown; vagas?: unknown };
    try { dados = JSON.parse(String(env.dados)); } catch (_) { return recusarAgente_("invalido", "dados_json"); }

    if (dados.acao !== "vagas") return recusarAgente_("invalido", "acao");
    return respostaAgente_(receberVagas_(dados.usuario_id, dados.vagas));
  } catch (err) {
    console.error("doPost do agente", err);
    registrarLog_("", "agente_erro", String((err as Error).message || err).slice(0, 200));
    return respostaAgente_({ ok: false, erro: "falha_interna" });
  }
}

// ---------- Uso interno ----------

/** Devolve "" se a assinatura vale; senão, o motivo (só para o Log). */
function conferirAssinaturaAgente_(env: { ts?: unknown; nonce?: unknown; dados?: unknown; assinatura?: unknown }): string {
  const ts = Number(env.ts);
  const nonce = String(env.nonce ?? "");
  const dados = env.dados;
  const assinatura = String(env.assinatura ?? "").toLowerCase();
  if (!Number.isInteger(ts) || typeof dados !== "string" || !/^[0-9a-f]{32,64}$/i.test(nonce) || !/^[0-9a-f]{64}$/.test(assinatura)) {
    return "formato";
  }
  if (Math.abs(Date.now() / 1000 - ts) > AGENTE.JANELA_TS_S) return "fora_da_janela";

  const esperada = Utilities.computeHmacSha256Signature(
    `${ts}.${nonce}.${dados}`, propObrigatoria_(PROP.AGENTE_SEGREDO), Utilities.Charset.UTF_8,
  ).map((b) => ((b + 256) % 256).toString(16).padStart(2, "0")).join("");
  if (!iguais_(esperada, assinatura)) return "assinatura";

  // Nonce de uso único: confere e grava sob trava, para dois envios iguais
  // simultâneos não passarem juntos.
  const cache = CacheService.getScriptCache();
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    if (cache.get("agn:" + nonce)) return "nonce_repetido";
    cache.put("agn:" + nonce, "1", AGENTE.NONCE_TTL_S);
  } finally {
    lock.releaseLock();
  }
  return "";
}

function dentroDoLimiteAgente_(): boolean {
  const cache = CacheService.getScriptCache();
  const chave = "agh:" + Math.floor(Date.now() / 3600000);
  const n = Number(cache.get(chave) || 0) + 1;
  cache.put(chave, String(n), 3700);
  return n <= AGENTE.MAX_ENVIOS_HORA;
}

function recusarAgente_(erro: "nao_autorizado" | "invalido", motivo: string): GoogleAppsScript.Content.TextOutput {
  registrarLog_("", "agente_recusado", motivo);
  return respostaAgente_({ ok: false, erro });
}

function respostaAgente_(obj: object): GoogleAppsScript.Content.TextOutput {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/** Texto limpo e cortado; não-texto vira "". */
function textoAgente_(v: unknown, max: number): string {
  if (typeof v !== "string" && typeof v !== "number") return "";
  return String(v).replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

/** "Sólides" -> "solides", "Michael Page" -> "michael-page". */
function slugFonte_(fonte: string): string {
  return fonte.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/** Valida uma vaga do agente. Devolve null se ela não serve (fica fora, sem derrubar o envio). */
function validarVagaAgente_(v: unknown): VagaRecebida | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const fonte = textoAgente_(o.fonte, 40);
  const fonteId = textoAgente_(o.fonte_id, 100);
  const titulo = textoAgente_(o.titulo, 300);
  const link = textoAgente_(o.link, 1000);
  const slug = slugFonte_(fonte);
  if (!slug || !/^[A-Za-z0-9._:-]{1,100}$/.test(fonteId) || !titulo) return null;
  if (!/^https:\/\/[^\s"'<>]+$/i.test(link)) return null;
  const nota = Number(o.nota);
  const motivos = Array.isArray(o.motivos)
    ? o.motivos.slice(0, 10).map((m) => textoAgente_(m, 100)).filter((m) => m).join("; ")
    : "";
  return {
    vaga_id: `${slug}:${fonteId}`,
    fonte,
    fonte_id: fonteId,
    empresa: textoAgente_(o.empresa, 200),
    titulo,
    link,
    local: textoAgente_(o.local, 200),
    modalidade: MODALIDADE_AGENTE[textoAgente_(o.modalidade, 20).toLowerCase()] ?? "",
    publicada_em: textoAgente_(o.publicada_em, 40),
    nota: Number.isFinite(nota) ? Math.max(0, Math.min(100, Math.round(nota))) : 0,
    motivos,
  };
}

/**
 * Grava as vagas no catálogo (uma vez por vaga_id) e cria a linha do candidato
 * em VagasCandidato quando ainda não existe. Vaga que o candidato já tem,
 * inclusive descartada, não é recriada nem alterada.
 */
function receberVagas_(usuarioId: unknown, vagas: unknown): { ok: boolean; erro?: string; novas_catalogo?: number; novas_candidato?: number; ja_tinha?: number; ignoradas?: number } {
  const uid = String(usuarioId ?? "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(uid)) { registrarLog_("", "agente_recusado", "usuario_id"); return { ok: false, erro: "invalido" }; }
  const u = buscarUsuarioPorId_(uid);
  if (!u || !u.ativo) { registrarLog_("", "agente_recusado", "usuario_inativo"); return { ok: false, erro: "invalido" }; }
  if (!Array.isArray(vagas) || vagas.length > AGENTE.MAX_VAGAS) { registrarLog_(uid, "agente_recusado", "lista_vagas"); return { ok: false, erro: "invalido" }; }

  const validas = new Map<string, VagaRecebida>();
  for (const v of vagas) {
    const ok = validarVagaAgente_(v);
    if (ok) validas.set(ok.vaga_id, ok);
  }
  const ignoradas = vagas.length - validas.size;
  const agora = new Date();

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    // Catálogo: vagas novas entram; as que já existem só têm vista_por_ultimo_em atualizado.
    const cat = lerAba_("Vagas");
    const cId = coluna_(cat.cab, "vaga_id");
    const cVista = coluna_(cat.cab, "vista_por_ultimo_em");
    const linhaDe = new Map<string, number>();
    cat.linhas.forEach((l, i) => { const id = String(l[cId]).trim(); if (id) linhaDe.set(id, i); });

    const novasCat: Record<string, unknown>[] = [];
    let mudouVista = false;
    const colVista = cat.linhas.map((l) => [l[cVista]]);
    for (const v of validas.values()) {
      const i = linhaDe.get(v.vaga_id);
      if (i === undefined) {
        novasCat.push({
          vaga_id: v.vaga_id, fonte: v.fonte, fonte_id: v.fonte_id, empresa: v.empresa, titulo: v.titulo,
          link: v.link, local: v.local, modalidade: v.modalidade, publicada_em: v.publicada_em,
          coletada_em: agora, vista_por_ultimo_em: agora,
        });
      } else {
        colVista[i] = [agora];
        mudouVista = true;
      }
    }
    // Só o agente grava no catálogo, e sempre sob esta trava: reescrever a coluna é seguro.
    if (mudouVista && colVista.length) cat.aba.getRange(2, cVista + 1, colVista.length, 1).setValues(colVista);
    anexarLinhas_("Vagas", novasCat);

    // Estado do candidato: só cria o que ainda não existe.
    const est = lerAba_("VagasCandidato");
    const eUid = coluna_(est.cab, "usuario_id");
    const eVaga = coluna_(est.cab, "vaga_id");
    const jaTem = new Set<string>();
    for (const l of est.linhas) if (String(l[eUid]).trim() === uid) jaTem.add(String(l[eVaga]).trim());

    const novasEst: Record<string, unknown>[] = [];
    for (const v of validas.values()) {
      if (jaTem.has(v.vaga_id)) continue;
      novasEst.push({
        usuario_id: uid, vaga_id: v.vaga_id, nota_regras: v.nota, motivos: v.motivos,
        descartada: false, vista_em: agora,
      });
    }
    anexarLinhas_("VagasCandidato", novasEst);

    const r = { ok: true, novas_catalogo: novasCat.length, novas_candidato: novasEst.length, ja_tinha: validas.size - novasEst.length, ignoradas };
    registrarLog_(uid, "agente_vagas", `catalogo +${r.novas_catalogo}, candidato +${r.novas_candidato}, ja_tinha ${r.ja_tinha}, ignoradas ${ignoradas}`);
    return r;
  } finally {
    lock.releaseLock();
  }
}

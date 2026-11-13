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
 * Ações (campo `acao` de dados):
 * - "preferencias" (E3-02): devolve as preferências de cada usuário ativo que aceitou
 *   o termo e tem linha em Preferencias. Só usuario_id e preferências; nunca e-mail ou nome.
 *   Desde a E3-04 também leva as listas aprovadas de ListasBusca (listas, empresas_carreira, grupos).
 *   dados = { acao: "preferencias" }
 * - "vagas" (E3-01): grava as vagas de um usuário.
 *   dados = { acao: "vagas", usuario_id, vagas: [{ fonte, fonte_id, empresa, titulo, link,
 *             local, modalidade, publicada_em, nota, motivos: [texto] }] }
 */

const AGENTE = {
  MAX_CORPO: 1000000,
  MAX_VAGAS: 300,
  MAX_ENVIOS_HORA: 60,
  JANELA_TS_S: 300,
  NONCE_TTL_S: 600,
  // Preferências: limites de cada lista e nota mínima quando a célula está vazia.
  PREF_MAX_ITENS: 50,
  PREF_MAX_TEXTO: 80,
  NOTA_MINIMA_PADRAO: 55,
} as const;

interface PreferenciasAgente {
  usuario_id: string;
  titulos: string[];
  modalidades: string[];
  ufs: string[];
  cidades: string[];
  aceita_pj: boolean;
  idiomas: string[];
  termos_excluir: string[];
  nota_minima: number;
  // E3-04: listas aprovadas em ListasBusca (vazias se o usuário ainda não tem).
  listas: Record<string, string[]>;
  empresas_carreira: { nome: string; subdominio: string }[];
  grupos: Record<string, string[]>;
}

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

    if (dados.acao === "preferencias") return respostaAgente_(preferenciasParaAgente_());
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
 * Grava as vagas no catálogo (uma vez por vaga_id) e o estado do candidato (E3-01, E3-05):
 * - Vaga nova para o candidato: cria a linha em VagasCandidato, salvo se ele já tem outra vaga
 *   com o mesmo título e a mesma empresa (o mesmo anúncio em outro portal): aí só o catálogo ganha
 *   o anúncio, e a vaga conta como duplicada.
 * - Vaga que ele já tem: atualiza nota, motivos e selecionada_em (a última vez que o agente a
 *   selecionou). Descartada fica como está e nunca é recriada.
 * Vaga que deixa de vir (nota caiu ou anúncio fechou) mantém o selecionada_em antigo: a página
 * mostra como vigente só o que foi selecionado recentemente. Nada é apagado.
 */
function receberVagas_(usuarioId: unknown, vagas: unknown): {
  ok: boolean; erro?: string; novas_catalogo?: number; novas_candidato?: number; ja_tinha?: number;
  atualizadas?: number; duplicadas?: number; ignoradas?: number;
} {
  const uid = String(usuarioId ?? "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(uid)) { registrarLog_("", "agente_recusado", "usuario_id"); return { ok: false, erro: "invalido" }; }
  const u = buscarUsuarioPorId_(uid);
  if (!u || !u.ativo) { registrarLog_("", "agente_recusado", "usuario_inativo"); return { ok: false, erro: "invalido" }; }
  // Sem o termo aceito, nada do candidato é gravado (LGPD).
  if (u.termo_versao !== TERMO_VERSAO) { registrarLog_(uid, "agente_recusado", "termo_pendente"); return { ok: false, erro: "invalido" }; }
  if (!Array.isArray(vagas) || vagas.length > AGENTE.MAX_VAGAS) { registrarLog_(uid, "agente_recusado", "lista_vagas"); return { ok: false, erro: "invalido" }; }

  const validas = new Map<string, VagaRecebida>();
  for (const v of vagas) {
    const ok = validarVagaAgente_(v);
    if (ok && !validas.has(ok.vaga_id)) validas.set(ok.vaga_id, ok);
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
    const cTit = coluna_(cat.cab, "titulo");
    const cEmp = coluna_(cat.cab, "empresa");
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

    // Estado do candidato.
    const est = lerAba_("VagasCandidato");
    const e = (n: string) => coluna_(est.cab, n);
    const linhaDoUsuario = new Map<string, number>();
    const chavesDoUsuario = new Set<string>();
    est.linhas.forEach((l, i) => {
      if (String(l[e("usuario_id")]).trim() !== uid) return;
      const vagaId = String(l[e("vaga_id")]).trim();
      linhaDoUsuario.set(vagaId, i);
      const c = linhaDe.get(vagaId);
      if (c !== undefined) {
        const chave = chaveTituloEmpresa_(cat.linhas[c][cTit], cat.linhas[c][cEmp]);
        if (chave) chavesDoUsuario.add(chave);
      }
    });

    // Atualiza nota, motivos e selecionada_em das que ele já tem (não descartadas). Só estas três
    // colunas são reescritas, sob a trava; a página nunca grava nelas.
    const colNota = est.linhas.map((l) => [l[e("nota_regras")]]);
    const colMotivos = est.linhas.map((l) => [l[e("motivos")]]);
    const colSel = est.linhas.map((l) => [l[e("selecionada_em")]]);
    let atualizadas = 0;
    let duplicadas = 0;
    const novasEst: Record<string, unknown>[] = [];
    for (const v of validas.values()) {
      const i = linhaDoUsuario.get(v.vaga_id);
      if (i !== undefined) {
        if (verdadeiro_(est.linhas[i][e("descartada")])) continue;
        colNota[i] = [v.nota];
        colMotivos[i] = [celulaTexto_(v.motivos)];
        colSel[i] = [agora];
        atualizadas++;
        continue;
      }
      const chave = chaveTituloEmpresa_(v.titulo, v.empresa);
      if (chave && chavesDoUsuario.has(chave)) { duplicadas++; continue; }
      if (chave) chavesDoUsuario.add(chave);
      novasEst.push({
        usuario_id: uid, vaga_id: v.vaga_id, nota_regras: v.nota, motivos: v.motivos,
        descartada: false, vista_em: agora, selecionada_em: agora,
      });
    }
    if (atualizadas) {
      for (const [nome, col] of [["nota_regras", colNota], ["motivos", colMotivos], ["selecionada_em", colSel]] as const) {
        est.aba.getRange(2, e(nome) + 1, col.length, 1).setValues(col);
      }
    }
    anexarLinhas_("VagasCandidato", novasEst);

    const r = {
      ok: true, novas_catalogo: novasCat.length, novas_candidato: novasEst.length,
      ja_tinha: validas.size - novasEst.length - duplicadas, atualizadas, duplicadas, ignoradas,
    };
    registrarLog_(uid, "agente_vagas",
      `catalogo +${r.novas_catalogo}, candidato +${r.novas_candidato}, ja_tinha ${r.ja_tinha} (${atualizadas} atualizadas), ` +
      `duplicadas ${duplicadas}, ignoradas ${ignoradas}`);
    return r;
  } finally {
    lock.releaseLock();
  }
}

/**
 * Chave do mesmo anúncio em portais diferentes: título e empresa sem acento, maiúsculas,
 * pontuação nem espaços. Empresa vazia ou confidencial não gera chave (juntaria vagas diferentes).
 */
function chaveTituloEmpresa_(titulo: unknown, empresa: unknown): string {
  const limpa = (x: unknown) => String(x ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/[^a-z0-9]/g, "");
  const emp = limpa(empresa);
  const tit = limpa(titulo);
  if (!emp || !tit || /confidencial|sigilos|naoinformad/.test(emp)) return "";
  return `${tit}|${emp}`;
}

/**
 * Preferências de cada usuário ativo que aceitou o termo, para o agente rodar uma vez
 * por usuário (E3-02). Usuário sem linha em Preferencias fica de fora (só é contado).
 * Se houver mais de uma linha do mesmo usuário, vale a primeira.
 */
function preferenciasParaAgente_(): { ok: boolean; usuarios: PreferenciasAgente[]; sem_preferencias: number } {
  const ativos = new Set<string>();
  // buscarUsuario_ percorre a aba toda (e completa linhas cadastradas à mão); o filtro só coleta.
  buscarUsuario_((u) => {
    if (u.ativo && u.termo_versao === TERMO_VERSAO) ativos.add(u.usuario_id);
    return false;
  });

  const { cab, linhas } = lerAba_("Preferencias");
  const c = (nome: string) => coluna_(cab, nome);
  const listas = listasAprovadasPorUsuario_();
  const usuarios: PreferenciasAgente[] = [];
  const vistos = new Set<string>();
  for (const l of linhas) {
    const uid = String(l[c("usuario_id")]).trim();
    if (!ativos.has(uid) || vistos.has(uid)) continue;
    vistos.add(uid);
    const nota = String(l[c("nota_minima")]).trim();
    usuarios.push({
      usuario_id: uid,
      titulos: listaPreferencia_(l[c("titulos")]),
      modalidades: listaPreferencia_(l[c("modalidades")], LISTAS.modalidade),
      ufs: listaPreferencia_(l[c("ufs")], LISTAS.uf),
      cidades: listaPreferencia_(l[c("cidades")]),
      aceita_pj: verdadeiro_(l[c("aceita_pj")]),
      idiomas: listaPreferencia_(l[c("idiomas")]),
      termos_excluir: listaPreferencia_(l[c("termos_excluir")]),
      nota_minima: nota && Number.isFinite(Number(nota))
        ? Math.max(0, Math.min(100, Math.round(Number(nota))))
        : AGENTE.NOTA_MINIMA_PADRAO,
      listas: listas.get(uid)?.listas ?? {},
      empresas_carreira: listas.get(uid)?.empresas_carreira ?? [],
      grupos: listas.get(uid)?.grupos ?? {},
    });
  }
  const sem = ativos.size - usuarios.length;
  registrarLog_("", "agente_preferencias", `${usuarios.length} usuarios, ${sem} sem preferencias`);
  return { ok: true, usuarios, sem_preferencias: sem };
}

/**
 * Célula com valores separados por vírgula, ponto e vírgula ou quebra de linha -> lista
 * limpa, sem repetidos e com limite de itens. Com `permitidos`, só entram os valores da
 * lista (comparação sem diferença de maiúsculas), na grafia da lista.
 */
function listaPreferencia_(v: unknown, permitidos?: string[]): string[] {
  const saida: string[] = [];
  for (const parte of String(v ?? "").split(/[,;\n]/)) {
    let t = textoAgente_(parte, AGENTE.PREF_MAX_TEXTO);
    if (!t) continue;
    if (permitidos) {
      const achado = permitidos.find((p) => p.toLowerCase() === t.toLowerCase());
      if (!achado) continue;
      t = achado;
    }
    if (!saida.some((s) => s.toLowerCase() === t.toLowerCase())) saida.push(t);
    if (saida.length >= AGENTE.PREF_MAX_ITENS) break;
  }
  return saida;
}

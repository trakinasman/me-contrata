/**
 * Descrição da vaga (E5-02).
 *
 * - Lida da página do anúncio por UrlFetchApp. Onde está o texto, conferido em 14/11/2026:
 *   Gupy guarda a vaga nos dados da página (__NEXT_DATA__: job.description, responsibilities,
 *   prerequisites, relevantExperiences); Sólides também (__NEXT_DATA__: vacancy.description e
 *   benefits), e só algumas páginas dela têm o JSON-LD; InfoJobs usa o formato padrão de vaga
 *   (JSON-LD JobPosting). InHire monta a página no navegador e a Catho recusa robôs (403):
 *   nesses casos o candidato cola o texto.
 * - Aba Descricoes. A descrição lida do anúncio é pública, como o catálogo de vagas: uma linha
 *   por vaga, sem usuario_id, lida uma vez para todos. A colada é de quem colou (com
 *   usuario_id; sai na exclusão de dados) e vale mais que a lida do anúncio.
 * - O texto do anúncio é dado: nunca vira instrução para a IA e entra na página por textContent.
 * - Critério do plano: toda vaga adaptada tem a descrição salva (a E5-03 exige a descrição).
 */

const DESCRICAO = {
  MIN: 200,
  MAX: 30000,
  LEITURAS_POR_DIA: 30,
  MAX_BYTES_PAGINA: 3 * 1024 * 1024,
} as const;

/** Seções da vaga na Gupy, na ordem em que aparecem no texto final. */
const SECOES_GUPY: { campo: string; titulo: string }[] = [
  { campo: "description", titulo: "Sobre a vaga" },
  { campo: "responsibilities", titulo: "Responsabilidades" },
  { campo: "prerequisites", titulo: "Requisitos" },
  { campo: "relevantExperiences", titulo: "Informações adicionais" },
];

interface DescricaoVaga {
  texto: string;
  origem: "anuncio" | "colada";
  obtidaEm: string;
}

// ---------- Funções chamadas pela página ----------

/** Descrição salva da vaga (a colada pelo candidato vale mais), ou null se ainda não há. */
function descricaoVaga(token: string, vagaId: unknown): DescricaoVaga | null {
  const s = exigirAceite_(token);
  const id = vagaDoCandidato_(s.usuario_id, vagaId);
  return descricaoSalva_(s.usuario_id, id);
}

/** Lê a descrição da página do anúncio e salva. Erro com mensagem para colar, se não der. */
function lerDescricaoDoAnuncio(token: string, vagaId: unknown): DescricaoVaga {
  const s = exigirAceite_(token);
  const id = vagaDoCandidato_(s.usuario_id, vagaId);

  const cache = CacheService.getScriptCache();
  const chave = `dsc:${s.usuario_id}:${Utilities.formatDate(new Date(), "America/Sao_Paulo", "yyyyMMdd")}`;
  const vezes = Number(cache.get(chave) || 0);
  if (vezes >= DESCRICAO.LEITURAS_POR_DIA) throw new Error("Limite de leituras de anúncio de hoje atingido. Cole o texto ou tente amanhã.");
  cache.put(chave, String(vezes + 1), 26 * 3600);

  const link = linkDoCatalogo_(id);
  const MSG_COLAR = "Não deu para ler a descrição deste anúncio (alguns sites bloqueiam a leitura automática). Abra o anúncio, copie a descrição e cole aqui.";
  if (!link) throw new Error(MSG_COLAR);
  let html = "";
  try {
    const resp = UrlFetchApp.fetch(link, {
      muteHttpExceptions: true, followRedirects: true,
      headers: { "Accept-Language": "pt-BR,pt;q=0.9" },
    });
    const codigo = resp.getResponseCode();
    if (codigo !== 200) {
      registrarLog_(s.usuario_id, "descricao_falhou", `${id}: HTTP ${codigo}`);
      throw new Error(MSG_COLAR);
    }
    html = resp.getContentText("UTF-8").slice(0, DESCRICAO.MAX_BYTES_PAGINA);
  } catch (e) {
    if (String((e as Error).message) === MSG_COLAR) throw e;
    registrarLog_(s.usuario_id, "descricao_falhou", `${id}: leitura`);
    throw new Error(MSG_COLAR);
  }

  const texto = extrairDescricao_(html);
  if (texto.length < DESCRICAO.MIN) {
    registrarLog_(s.usuario_id, "descricao_falhou", `${id}: sem descrição na página`);
    throw new Error(MSG_COLAR);
  }
  const d = salvarDescricao_(id, "", "anuncio", texto.slice(0, DESCRICAO.MAX));
  registrarLog_(s.usuario_id, "descricao_lida", `${id}: ${d.texto.length}c`);
  return d;
}

/** Salva a descrição colada pelo candidato (substitui a colada antes). */
function colarDescricao(token: string, vagaId: unknown, texto: unknown): DescricaoVaga {
  const s = exigirAceite_(token);
  const id = vagaDoCandidato_(s.usuario_id, vagaId);
  const limpo = limparTextoPT_(String(texto ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, ""), false);
  if (limpo.length < DESCRICAO.MIN) throw new Error(`Cole a descrição completa (pelo menos ${DESCRICAO.MIN} caracteres).`);
  if (limpo.length > DESCRICAO.MAX) throw new Error(`A descrição passa de ${DESCRICAO.MAX} caracteres.`);
  const d = salvarDescricao_(id, s.usuario_id, "colada", limpo);
  registrarLog_(s.usuario_id, "descricao_colada", `${id}: ${limpo.length}c`);
  return d;
}

// ---------- Uso interno ----------

/** vaga_id da vaga do candidato (qualquer estado). Erro se a vaga não é dele. */
function vagaDoCandidato_(usuarioId: string, vagaId: unknown): string {
  const { cab, linhas } = lerAba_("VagasCandidato");
  const c = (n: string) => coluna_(cab, n);
  const i = linhaVagaDoUsuario_(linhas, c, usuarioId, vagaId);
  return String(linhas[i][c("vaga_id")]).trim();
}

function linkDoCatalogo_(vagaId: string): string {
  const { cab, linhas } = lerAba_("Vagas");
  const c = (n: string) => coluna_(cab, n);
  const l = linhas.find((x) => String(x[c("vaga_id")]).trim() === vagaId);
  const link = l ? String(l[c("link")]).trim() : "";
  return /^https:\/\//i.test(link) ? link : "";
}

function descricaoSalva_(usuarioId: string, vagaId: string): DescricaoVaga | null {
  const { cab, linhas } = lerAba_("Descricoes");
  const c = (n: string) => coluna_(cab, n);
  const daVaga = linhas.filter((l) => String(l[c("vaga_id")]).trim() === vagaId);
  const colada = daVaga.find((l) => String(l[c("usuario_id")]).trim() === usuarioId && String(l[c("origem")]).trim() === "colada");
  const anuncio = daVaga.find((l) => !String(l[c("usuario_id")]).trim() && String(l[c("origem")]).trim() === "anuncio");
  const l = colada ?? anuncio;
  if (!l) return null;
  const em = dataDaCelula_(l[c("obtida_em")]);
  return { texto: String(l[c("texto")]), origem: colada ? "colada" : "anuncio", obtidaEm: em ? em.toISOString() : "" };
}

/** Grava (ou substitui) a descrição: compartilhada (usuarioId vazio, do anúncio) ou do candidato (colada). */
function salvarDescricao_(vagaId: string, usuarioId: string, origem: "anuncio" | "colada", texto: string): DescricaoVaga {
  const agora = new Date();
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const { aba, cab, linhas } = lerAba_("Descricoes");
    const c = (n: string) => coluna_(cab, n);
    const i = linhas.findIndex((l) => String(l[c("vaga_id")]).trim() === vagaId
      && String(l[c("usuario_id")]).trim() === usuarioId && String(l[c("origem")]).trim() === origem);
    if (i >= 0) {
      aba.getRange(i + 2, c("texto") + 1).setValue(celulaTexto_(texto));
      aba.getRange(i + 2, c("obtida_em") + 1).setValue(agora);
    } else {
      anexarLinha_("Descricoes", { vaga_id: vagaId, usuario_id: usuarioId, origem, texto, obtida_em: agora });
    }
  } finally {
    lock.releaseLock();
  }
  return { texto, origem, obtidaEm: agora.toISOString() };
}

/** Texto da vaga a partir do HTML do anúncio: dados da Gupy ou JSON-LD JobPosting. Vazio se não achar. */
function extrairDescricao_(html: string): string {
  // Gupy: <script id="__NEXT_DATA__"> com props.pageProps.job.
  const next = html.match(/<script[^>]*id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i);
  if (next) {
    try {
      const pp = (JSON.parse(next[1]) as { props?: { pageProps?: Record<string, unknown> } })?.props?.pageProps ?? {};
      // Sólides: pageProps.vacancy.description (HTML) e a lista de benefícios. Nem toda página da
      // Sólides tem o JSON-LD (caso real de 14/11/2026), mas todas têm estes dados.
      const vacancy = pp.vacancy as { description?: unknown; benefits?: { name?: unknown }[] } | undefined;
      if (vacancy && typeof vacancy.description === "string") {
        const beneficios = (Array.isArray(vacancy.benefits) ? vacancy.benefits : [])
          .map((b) => String(b?.name ?? "").trim()).filter((b) => b).slice(0, 40);
        const texto = limparTextoPT_(htmlParaTexto_(vacancy.description)
          + (beneficios.length ? "\n\nBenefícios\n" + beneficios.map((b) => "- " + b).join("\n") : ""), false);
        if (texto.length >= DESCRICAO.MIN) return texto;
      }
      // Gupy: pageProps.job.
      const job = pp.job as Record<string, unknown> | undefined;
      if (job) {
        const partes = SECOES_GUPY
          .map((s) => ({ titulo: s.titulo, texto: htmlParaTexto_(String(job[s.campo] ?? "")) }))
          .filter((p) => p.texto)
          .map((p) => `${p.titulo}\n${p.texto}`);
        const texto = limparTextoPT_(partes.join("\n\n"), false);
        if (texto.length >= DESCRICAO.MIN) return texto;
      }
    } catch (_) { /* dados da página em outro formato: tenta o JSON-LD */ }
  }
  // Formato padrão de vaga (Sólides, InfoJobs e outros).
  for (const m of html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const dados = JSON.parse(m[1]) as unknown;
      const lista = (Array.isArray(dados) ? dados : [dados]) as Record<string, unknown>[];
      const grafo = lista.flatMap((o) => (Array.isArray(o?.["@graph"]) ? (o["@graph"] as Record<string, unknown>[]) : [o]));
      const vaga = grafo.find((o) => o && o["@type"] === "JobPosting");
      if (vaga && typeof vaga.description === "string") {
        const texto = limparTextoPT_(htmlParaTexto_(vaga.description), false);
        if (texto.length >= DESCRICAO.MIN) return texto;
      }
    } catch (_) { /* bloco JSON-LD inválido: tenta o próximo */ }
  }
  return "";
}

/** HTML de um campo do anúncio para texto: quebras de bloco viram linha, item de lista vira "- ". */
function htmlParaTexto_(html: string): string {
  const t = html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, "")
    // No HTML, quebra de linha no código vale espaço; só as tags criam linhas.
    .replace(/[\r\n\t]+/g, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<li[^>]*>/gi, "\n- ")
    .replace(/<\/li>/gi, "")
    .replace(/<\/(p|div|ul|ol|h[1-6]|tr|section|article)>/gi, "\n")
    .replace(/<(p|div|h[1-6]|ul|ol|tr|section|article)[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, "");
  return decodificarEntidades_(t)
    .split("\n").map((l) => l.replace(/[ \t ]+/g, " ").trim()).join("\n")
    .replace(/\n- \n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const ENTIDADES_HTML: Record<string, string> = {
  nbsp: " ", amp: "&", lt: "<", gt: ">", quot: "\"", apos: "'",
  aacute: "á", eacute: "é", iacute: "í", oacute: "ó", uacute: "ú",
  Aacute: "Á", Eacute: "É", Iacute: "Í", Oacute: "Ó", Uacute: "Ú",
  atilde: "ã", otilde: "õ", Atilde: "Ã", Otilde: "Õ",
  acirc: "â", ecirc: "ê", ocirc: "ô", Acirc: "Â", Ecirc: "Ê", Ocirc: "Ô",
  agrave: "à", Agrave: "À", ccedil: "ç", Ccedil: "Ç", uuml: "ü",
  ndash: "-", mdash: ", ", hellip: "...", bull: "-", middot: "·",
  rsquo: "'", lsquo: "'", rdquo: "\"", ldquo: "\"", ordm: "º", ordf: "ª",
};

function decodificarEntidades_(t: string): string {
  return t
    .replace(/&#(\d{1,7});/g, (_m, n) => { const c = Number(n); return c > 0 && c < 0x110000 ? String.fromCodePoint(c) : ""; })
    .replace(/&#x([0-9a-f]{1,6});/gi, (_m, n) => { const c = parseInt(n, 16); return c > 0 && c < 0x110000 ? String.fromCodePoint(c) : ""; })
    .replace(/&([a-z]+);/gi, (m, nome) => (nome in ENTIDADES_HTML ? ENTIDADES_HTML[nome] : m));
}

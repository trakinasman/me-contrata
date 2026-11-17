/**
 * Lista de vagas do candidato (E5-01).
 *
 * - As vagas do candidato são as linhas dele em VagasCandidato (nota, motivos, descarte),
 *   com os dados do anúncio vindos do catálogo Vagas (decisão D2). A página nunca lê o
 *   catálogo inteiro.
 * - Vigente: o agente selecionou a vaga nos últimos VAGAS_TELA.DIAS_VIGENTE dias (coluna
 *   selecionada_em, decisão de 12/11/2026 que deixou a janela para esta etapa). As outras
 *   aparecem só se o candidato pedir.
 * - Nova: a linha foi criada nos últimos dias (vista_em é preenchida pelo agente quando
 *   cria a linha; não é "vista pelo candidato").
 * - Descartar pede um motivo e esconde a vaga para sempre: o agente já não recria vaga
 *   descartada e não atualiza a nota dela (E3-05).
 * - Mover para o funil cria a candidatura na etapa "inserida" (a tela do funil é a Etapa 6).
 * - Inserir no funil e descartar gravam um evento com a data na aba Eventos: é a base da
 *   linha do tempo de cada vaga.
 */

const VAGAS_TELA = { DIAS_VIGENTE: 7, DIAS_NOVA: 3, MAX_DETALHE: 200, MANUAIS_POR_DIA: 20 } as const;

/** Onde o candidato achou a vaga que ele mesmo cadastrou (vira a fonte, usada nos números do funil). */
const ORIGENS_VAGA_MANUAL = ["Indicação", "Site da empresa", "LinkedIn", "Gupy", "Indeed", "Catho", "InfoJobs", "Sólides", "InHire", "WhatsApp ou grupo", "Outro"];

/** Quatro motivos agrupados e "Outro", com detalhe (decidido em 14/11/2026). */
const MOTIVOS_DESCARTE = [
  "Salário ou forma de contratação (CLT/PJ)",
  "Local ou modalidade",
  "Requisitos ou nível da vaga",
  "Empresa",
  "Outro",
];

interface VagaTela {
  vagaId: string;
  titulo: string;
  empresa: string;
  link: string;
  fonte: string;
  local: string;
  uf: string;
  modalidade: string;
  publicadaEm: string;
  nota: number | null;
  notaIa: number | null;
  motivos: string[];
  selecionadaEm: string;
  /** Quando o agente trouxe a vaga pela primeira vez (VagasCandidato.vista_em). */
  criadaEm: string;
  vigente: boolean;
  nova: boolean;
  noFunil: boolean;
  /** Cadastrada pelo próprio candidato (+ Adicionar vaga). */
  manual: boolean;
}

interface ListaVagas {
  vagas: VagaTela[];
  descartadas: number;
  motivosDescarte: string[];
  diasVigente: number;
  /** Opções de origem para a vaga cadastrada pelo candidato. */
  origensManual: string[];
}

// ---------- Funções chamadas pela página ----------

function listarVagas(token: string): ListaVagas {
  const s = exigirAceite_(token);
  return vagasDoUsuario_(s.usuario_id);
}

function descartarVaga(token: string, vagaId: unknown, motivo: unknown, detalhe: unknown): ListaVagas {
  const s = exigirAceite_(token);
  const m = String(motivo ?? "");
  if (!MOTIVOS_DESCARTE.includes(m)) throw new Error("Escolha o motivo do descarte.");
  const d = String(detalhe ?? "").replace(/\s+/g, " ").trim().slice(0, VAGAS_TELA.MAX_DETALHE);
  if (m === "Outro" && !d) throw new Error("Escreva o motivo.");
  const texto = d ? `${m}: ${d}` : m;

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const { aba, cab, linhas } = lerAba_("VagasCandidato");
    const c = (n: string) => coluna_(cab, n);
    const i = linhaVagaDoUsuario_(linhas, c, s.usuario_id, vagaId);
    if (verdadeiro_(linhas[i][c("descartada")])) throw new Error("Esta vaga já foi descartada.");
    aba.getRange(i + 2, c("descartada") + 1).setValue(true);
    aba.getRange(i + 2, c("motivo_descarte") + 1).setValue(celulaTexto_(texto));
    registrarEvento_(s.usuario_id, String(linhas[i][c("vaga_id")]).trim(), "descartada", texto);
    registrarLog_(s.usuario_id, "vaga_descartada", `${String(vagaId)}: ${m}`);
  } finally {
    lock.releaseLock();
  }
  return vagasDoUsuario_(s.usuario_id);
}

/**
 * Vaga cadastrada pelo próprio candidato (achada fora do agente: indicação, site da empresa, um e-mail do Indeed).
 * Entra no catálogo com id "manual:<uuid>" (o agente nunca gera esse prefixo, então não há conflito) e na lista do
 * candidato sem nota por regras; fica sempre visível (não expira como as do agente). Caso real: Serprol, 17/11/2026.
 */
function adicionarVaga(token: string, dados: unknown): ListaVagas {
  const s = exigirAceite_(token);
  const d = (dados ?? {}) as Record<string, unknown>;
  const limpo = (v: unknown, max: number): string => String(v ?? "").replace(/[<>]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
  const titulo = limpo(d.titulo, 200);
  const empresa = limpo(d.empresa, 120);
  if (!titulo) throw new Error("Escreva o título da vaga.");
  if (!empresa) throw new Error("Escreva o nome da empresa.");
  const link = linkDeVagaLimpo_(String(d.link ?? ""));
  const local = limpo(d.local, 120);
  const modalidade = String(d.modalidade ?? "").trim();
  if (modalidade && !LISTAS.modalidade.includes(modalidade)) throw new Error("Modalidade inválida.");
  const fonte = String(d.fonte ?? "").trim() || fonteDoLink_(link);
  if (!ORIGENS_VAGA_MANUAL.includes(fonte)) throw new Error("Origem inválida.");

  const cache = CacheService.getScriptCache();
  const chave = `vgm:${s.usuario_id}:${Utilities.formatDate(new Date(), "America/Sao_Paulo", "yyyyMMdd")}`;
  const vezes = Number(cache.get(chave) || 0);
  if (vezes >= VAGAS_TELA.MANUAIS_POR_DIA) throw new Error("Limite de vagas adicionadas hoje atingido. Tente amanhã.");

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    if (link) {
      const cat = lerAba_("Vagas");
      const cv = (n: string) => coluna_(cat.cab, n);
      const mesmas = new Set(cat.linhas.filter((l) => String(l[cv("link")]).trim() === link).map((l) => String(l[cv("vaga_id")]).trim()));
      if (mesmas.size) {
        const est = lerAba_("VagasCandidato");
        const ce = (n: string) => coluna_(est.cab, n);
        if (est.linhas.some((l) => String(l[ce("usuario_id")]).trim() === s.usuario_id && mesmas.has(String(l[ce("vaga_id")]).trim()))) {
          throw new Error("Você já tem esta vaga na lista (mesmo link).");
        }
      }
    }
    const agora = new Date();
    const id = `manual:${Utilities.getUuid()}`;
    anexarLinha_("Vagas", {
      vaga_id: id, fonte, fonte_id: id.slice(7), empresa, titulo, link, local, modalidade,
      publicada_em: "", coletada_em: agora, vista_por_ultimo_em: agora,
    });
    anexarLinha_("VagasCandidato", {
      usuario_id: s.usuario_id, vaga_id: id, nota_regras: "", motivos: "adicionada por você", nota_ia: "",
      descartada: false, motivo_descarte: "", vista_em: agora, selecionada_em: agora,
    });
    cache.put(chave, String(vezes + 1), 26 * 3600);
    registrarLog_(s.usuario_id, "vaga_manual", id);
  } finally {
    lock.releaseLock();
  }
  return vagasDoUsuario_(s.usuario_id);
}

function moverParaFunil(token: string, vagaId: unknown): { noFunil: boolean } {
  const s = exigirAceite_(token);
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const est = lerAba_("VagasCandidato");
    const ce = (n: string) => coluna_(est.cab, n);
    const i = linhaVagaDoUsuario_(est.linhas, ce, s.usuario_id, vagaId);
    if (verdadeiro_(est.linhas[i][ce("descartada")])) throw new Error("Esta vaga foi descartada.");
    const id = String(est.linhas[i][ce("vaga_id")]).trim();

    const cand = lerAba_("Candidaturas");
    const cc = (n: string) => coluna_(cand.cab, n);
    const jaTem = cand.linhas.some((l) => String(l[cc("usuario_id")]).trim() === s.usuario_id && String(l[cc("vaga_id")]).trim() === id);
    if (!jaTem) {
      anexarLinha_("Candidaturas", { usuario_id: s.usuario_id, vaga_id: id, status: "inserida", atualizado_em: new Date() });
      registrarEvento_(s.usuario_id, id, "inserida", "");
      registrarLog_(s.usuario_id, "vaga_no_funil", id);
    }
  } finally {
    lock.releaseLock();
  }
  return { noFunil: true };
}

// ---------- Uso interno ----------

/** Um acontecimento na linha do tempo da vaga (aba Eventos). */
function registrarEvento_(usuarioId: string, vagaId: string, tipo: string, detalhe: string, em: Date = new Date()): void {
  if (!LISTAS.tipo_evento.includes(tipo)) throw new Error("Tipo de evento inválido: " + tipo);
  anexarLinha_("Eventos", {
    evento_id: Utilities.getUuid(), usuario_id: usuarioId, vaga_id: vagaId, tipo, detalhe, em,
  });
}

/** Índice (em `linhas`) da vaga do usuário. Erro se não existir ou for de outra pessoa. */
function linhaVagaDoUsuario_(linhas: unknown[][], c: (n: string) => number, usuarioId: string, vagaId: unknown): number {
  const alvo = String(vagaId ?? "").trim();
  if (!alvo || alvo.length > 200) throw new Error("Vaga não encontrada. Recarregue a página.");
  const i = linhas.findIndex((l) => String(l[c("usuario_id")]).trim() === usuarioId && String(l[c("vaga_id")]).trim() === alvo);
  if (i < 0) throw new Error("Vaga não encontrada. Recarregue a página.");
  return i;
}

function vagasDoUsuario_(usuarioId: string): ListaVagas {
  const est = lerAba_("VagasCandidato");
  const ce = (n: string) => coluna_(est.cab, n);
  const minhas = est.linhas.filter((l) => String(l[ce("usuario_id")]).trim() === usuarioId);
  const ativas = minhas.filter((l) => !verdadeiro_(l[ce("descartada")]));

  const ids = new Set(ativas.map((l) => String(l[ce("vaga_id")]).trim()));
  const cat = lerAba_("Vagas");
  const cv = (n: string) => coluna_(cat.cab, n);
  const catalogo = new Map<string, unknown[]>();
  for (const l of cat.linhas) {
    const id = String(l[cv("vaga_id")]).trim();
    if (ids.has(id)) catalogo.set(id, l);
  }

  const cand = lerAba_("Candidaturas");
  const cc = (n: string) => coluna_(cand.cab, n);
  const noFunil = new Set(cand.linhas
    .filter((l) => String(l[cc("usuario_id")]).trim() === usuarioId)
    .map((l) => String(l[cc("vaga_id")]).trim()));

  const agora = Date.now();
  const dia = 24 * 3600 * 1000;
  const vagas: VagaTela[] = [];
  for (const l of ativas) {
    const id = String(l[ce("vaga_id")]).trim();
    const v = catalogo.get(id);
    if (!v) continue; // sem anúncio no catálogo: não há o que mostrar
    const selecionada = dataDaCelula_(l[ce("selecionada_em")]);
    const criada = dataDaCelula_(l[ce("vista_em")]);
    const local = String(v[cv("local")]).trim();
    const link = String(v[cv("link")]).trim();
    vagas.push({
      vagaId: id,
      titulo: String(v[cv("titulo")]).trim(),
      empresa: String(v[cv("empresa")]).trim(),
      link: /^https:\/\//i.test(link) ? link : "",
      fonte: String(v[cv("fonte")]).trim(),
      local,
      uf: ufDoLocal_(local),
      modalidade: String(v[cv("modalidade")]).trim(),
      publicadaEm: dataTexto_(v[cv("publicada_em")]),
      nota: numeroOuNulo_(l[ce("nota_regras")]),
      notaIa: numeroOuNulo_(l[ce("nota_ia")]),
      motivos: String(l[ce("motivos")]).split(";").map((m) => m.trim()).filter((m) => m),
      selecionadaEm: selecionada ? selecionada.toISOString() : "",
      criadaEm: criada ? criada.toISOString() : "",
      // Vaga cadastrada pelo candidato não expira: o agente não a traz de novo para "renovar".
      vigente: id.startsWith("manual:") || (!!selecionada && agora - selecionada.getTime() <= VAGAS_TELA.DIAS_VIGENTE * dia),
      nova: !!criada && agora - criada.getTime() <= VAGAS_TELA.DIAS_NOVA * dia,
      noFunil: noFunil.has(id),
      manual: id.startsWith("manual:"),
    });
  }
  // As adicionadas pelo candidato vêm primeiro (a mais recente no topo): sem nota por regras, elas caíam no fim da lista.
  vagas.sort((a, b) => Number(b.manual) - Number(a.manual) || (a.manual ? b.criadaEm.localeCompare(a.criadaEm) : 0) ||
    Number(b.vigente) - Number(a.vigente) || (b.nota ?? -1) - (a.nota ?? -1));
  return {
    vagas,
    descartadas: minhas.length - ativas.length,
    motivosDescarte: MOTIVOS_DESCARTE,
    diasVigente: VAGAS_TELA.DIAS_VIGENTE,
    origensManual: ORIGENS_VAGA_MANUAL,
  };
}

/**
 * Link do anúncio digitado pelo candidato: só https, sem espaço nem aspas. Indeed e LinkedIn perdem os parâmetros de
 * rastreamento do e-mail (o link da Serprol tinha mais de 300 caracteres; o que importa é o jk / o id da vaga).
 */
function linkDeVagaLimpo_(bruto: string): string {
  const t = bruto.trim();
  if (!t) return "";
  if (!/^https:\/\/[^\s"'<>]+$/i.test(t) || t.length > 1000) throw new Error("O link precisa começar com https:// (ou deixe em branco).");
  const indeed = t.match(/^https:\/\/([a-z]{2,3}\.)?indeed\.com\/[^?#]*\?(?:[^#]*&)?(?:jk|vjk)=([A-Za-z0-9]+)/i);
  if (indeed) return `https://${indeed[1] ?? ""}indeed.com/viewjob?jk=${indeed[2]}`;
  const linkedin = t.match(/^https:\/\/(?:[a-z]+\.)?linkedin\.com\/jobs\/view\/(?:[^/?#]*?-)?(\d+)/i);
  if (linkedin) return `https://www.linkedin.com/jobs/view/${linkedin[1]}/`;
  return t;
}

/** Origem sugerida pelo link (o candidato pode trocar). */
function fonteDoLink_(link: string): string {
  if (/indeed\.com/i.test(link)) return "Indeed";
  if (/linkedin\.com/i.test(link)) return "LinkedIn";
  if (/gupy\.io/i.test(link)) return "Gupy";
  if (/catho\.com/i.test(link)) return "Catho";
  if (/infojobs\.com/i.test(link)) return "InfoJobs";
  if (/solides\.(com|jobs)/i.test(link)) return "Sólides";
  if (/inhire\./i.test(link)) return "InHire";
  return link ? "Site da empresa" : "Outro";
}

/** UF do local: "Cidade/UF", "Cidade - UF" ou só a sigla. Vazio se não der para saber. */
function ufDoLocal_(local: string): string {
  const m = local.match(/(?:\/|\s-\s|,\s*)([A-Za-z]{2})\s*$/);
  const sigla = (m ? m[1] : local).trim().toUpperCase();
  return LISTAS.uf.includes(sigla) ? sigla : "";
}

/** Data de uma célula: Date do Sheets, ISO ou "dd/mm/aaaa". */
function dataDaCelula_(v: unknown): Date | null {
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
  const t = String(v ?? "").trim();
  if (!t) return null;
  const br = t.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  const d = br ? new Date(Number(br[3]), Number(br[2]) - 1, Number(br[1])) : new Date(t);
  return isNaN(d.getTime()) ? null : d;
}

function dataTexto_(v: unknown): string {
  const d = dataDaCelula_(v);
  return d ? d.toISOString() : "";
}

function numeroOuNulo_(v: unknown): number | null {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

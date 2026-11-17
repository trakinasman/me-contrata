/**
 * Funil de candidaturas (Etapa 6): mudar de etapa, registrar o envio das mensagens ao recrutador, alerta de cobrança e os números.
 *
 * - Etapas (decididas em 14/11/2026), na ordem: inserida, curriculo_enviado, entrevista_ia, entrevista_rh, entrevista_gestor,
 *   proposta, contratado. "recusado" (pela empresa) e "desisti" (pelo candidato) vêm de qualquer etapa e guardam onde a vaga parou
 *   ("parou_em=<etapa>" no detalhe do evento). Dá para pular etapas.
 * - Mudar de etapa grava um evento na aba Eventos, com a data real informada (padrão: hoje; nunca no futuro). A aba Candidaturas guarda
 *   o estado atual (status, canal e currículo usado no envio, próxima cobrança).
 * - Cada mensagem enviada ao recrutador (convite, primeira, cobranças) vira um evento mensagem_*; a próxima cobrança é sugerida (primeira
 *   mensagem + 4 dias; primeira cobrança + 6 dias, ou seja, 10 dias depois da primeira) e some depois da segunda cobrança.
 * - "Aguardando" não é etapa: é o tempo parado desde o último evento. Vaga ativa de currículo enviado em diante, parada há 7 dias ou
 *   com cobrança prevista para hoje ou antes, ganha alerta.
 * - Números: tempo médio até a próxima etapa, quantas chegam a cada etapa, onde as recusas acontecem e de onde vêm as vagas que avançam.
 *   Com menos de 3 casos, a conta vem marcada como "poucos dados".
 * - Tudo filtra por usuario_id da sessão; vaga descartada não aparece. Texto livre entra na página por textContent.
 */

const FUNIL = {
  ETAPAS: ["inserida", "curriculo_enviado", "entrevista_ia", "entrevista_rh", "entrevista_gestor", "proposta", "contratado"],
  NOMES: {
    inserida: "Inserida", curriculo_enviado: "Currículo enviado", entrevista_ia: "Entrevista com IA", entrevista_rh: "Entrevista com RH",
    entrevista_gestor: "Entrevista com gestor", proposta: "Proposta", contratado: "Contratado", recusado: "Recusado", desisti: "Desisti",
  } as Record<string, string>,
  DIAS_ALERTA: 7,
  MIN_AMOSTRA: 3,
  MAX_DETALHE: 200,
  MAX_ANOS_ATRAS: 2,
  CANAIS: ["Site da empresa", "E-mail", "LinkedIn", "Gupy", "Catho", "InfoJobs", "Indeed", "Sólides", "InHire", "Outro"],
  /** Dias até a próxima cobrança depois de cada mensagem enviada (null = sem cobrança depois). */
  PROXIMA_COBRANCA: { convite: null, primeira: 4, cobranca1: 6, cobranca2: null } as Record<string, number | null>,
};
const TERMINAIS = ["contratado", "recusado", "desisti"];

interface EventoFunil { tipo: string; detalhe: string; em: string }

interface CandidaturaFunil {
  vagaId: string;
  titulo: string;
  empresa: string;
  fonte: string;
  link: string;
  status: string;
  /** Dias de calendário desde o último evento da vaga ("inserida" só conta se for o único). */
  diasParado: number;
  alerta: boolean;
  motivoAlerta: string;
  proximaCobranca: string;
  canal: string;
  cvUsado: string;
  /** Currículos em PDF gerados para esta vaga (E5-05), para escolher qual foi enviado. */
  curriculos: { id: string; criadoEm: string; paginas: number | null }[];
  eventos: EventoFunil[];
}

interface NumerosFunil {
  total: number;
  ativas: number;
  /** Quantas chegaram a cada etapa (a própria ou uma posterior) e a taxa em relação à etapa anterior. */
  etapas: { etapa: string; nome: string; chegaram: number; taxa: number | null; poucosDados: boolean }[];
  /** Dias médios da etapa até a próxima alcançada, só com quem já passou por ela. */
  tempos: { etapa: string; nome: string; dias: number; casos: number; poucosDados: boolean }[];
  /** Em que etapa a vaga parou quando foi recusada ou desistida. */
  paradas: { etapa: string; nome: string; recusadas: number; desistencias: number }[];
  /** De onde vêm as vagas: enviadas e quantas chegaram a alguma entrevista. */
  origens: { fonte: string; enviadas: number; avancaram: number; poucosDados: boolean }[];
}

interface FunilTela {
  etapas: { id: string; nome: string }[];
  candidaturas: CandidaturaFunil[];
  numeros: NumerosFunil;
  canais: string[];
  diasAlerta: number;
}

// ---------- Funções chamadas pela página ----------

function funilDoCandidato(token: string): FunilTela {
  const s = exigirAceite_(token);
  return funilDe_(s.usuario_id);
}

/**
 * Muda a etapa da vaga e grava o evento. dados: { data: "aaaa-mm-dd" (opcional, padrão hoje), detalhe, canal e cvUsado (só no envio do currículo) }.
 * Recusado e desisti guardam a etapa anterior. Devolve o funil atualizado.
 */
function mudarEtapa(token: string, vagaId: unknown, etapa: unknown, dados: unknown): FunilTela {
  const s = exigirAceite_(token);
  const novo = String(etapa ?? "").trim();
  if (!LISTAS.status_candidatura.includes(novo)) throw new Error("Etapa inválida.");
  const d = (dados ?? {}) as Record<string, unknown>;
  const em = dataDoEvento_(d.data);
  const nota = String(d.detalhe ?? "").replace(/\s+/g, " ").trim().slice(0, FUNIL.MAX_DETALHE);

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const cand = lerAba_("Candidaturas");
    const cc = (n: string) => coluna_(cand.cab, n);
    const i = linhaDaCandidatura_(cand.linhas, cc, s.usuario_id, vagaId);
    const id = String(cand.linhas[i][cc("vaga_id")]).trim();
    const anterior = String(cand.linhas[i][cc("status")]).trim();
    if (anterior === novo) throw new Error("A vaga já está nesta etapa.");

    let canal = "";
    let cvUsado = "";
    if (novo === "curriculo_enviado") {
      canal = String(d.canal ?? "").trim();
      if (canal && !FUNIL.CANAIS.includes(canal)) throw new Error("Canal inválido.");
      cvUsado = String(d.cvUsado ?? "").trim();
      if (cvUsado && !curriculosDaVaga_(s.usuario_id, id).some((x) => x.id === cvUsado)) throw new Error("Currículo não encontrado para esta vaga.");
    }

    const detalhe = novo === "recusado" || novo === "desisti" ? `parou_em=${anterior}${nota ? " | " + nota : ""}` : nota;
    registrarEvento_(s.usuario_id, id, novo, String(celulaTexto_(detalhe)), em);

    const col = (n: string) => cc(n) + 1;
    cand.aba.getRange(i + 2, col("status")).setValue(novo);
    cand.aba.getRange(i + 2, col("atualizado_em")).setValue(new Date());
    if (novo === "curriculo_enviado") {
      cand.aba.getRange(i + 2, col("enviado_em")).setValue(em);
      if (canal) cand.aba.getRange(i + 2, col("canal")).setValue(canal);
      if (cvUsado) cand.aba.getRange(i + 2, col("cv_usado")).setValue(cvUsado);
    }
    if (TERMINAIS.includes(novo)) cand.aba.getRange(i + 2, col("proxima_cobranca")).setValue("");
    registrarLog_(s.usuario_id, "funil_etapa", `${id}: ${anterior} para ${novo}`);
  } finally {
    lock.releaseLock();
  }
  return funilDe_(s.usuario_id);
}

/** Registra que uma mensagem ao recrutador foi enviada (convite, primeira, cobranca1, cobranca2) e sugere a próxima cobrança. */
function registrarMensagemEnviada(token: string, vagaId: unknown, tipo: unknown, data: unknown): FunilTela {
  const s = exigirAceite_(token);
  const t = String(tipo ?? "").trim();
  if (!(t in FUNIL.PROXIMA_COBRANCA)) throw new Error("Tipo de mensagem inválido.");
  const em = dataDoEvento_(data);

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const cand = lerAba_("Candidaturas");
    const cc = (n: string) => coluna_(cand.cab, n);
    const i = linhaDaCandidatura_(cand.linhas, cc, s.usuario_id, vagaId);
    const id = String(cand.linhas[i][cc("vaga_id")]).trim();
    registrarEvento_(s.usuario_id, id, `mensagem_${t}`, "", em);
    // Só muda a data da cobrança quando a mensagem pede uma (primeira, cobranca1) ou encerra o contato (cobranca2).
    // O convite não mexe: antes, ele apagava a cobrança já calculada.
    const dias = FUNIL.PROXIMA_COBRANCA[t];
    if (dias !== null) {
      cand.aba.getRange(i + 2, cc("proxima_cobranca") + 1).setValue(new Date(em.getFullYear(), em.getMonth(), em.getDate() + dias, 12, 0, 0));
    } else if (t === "cobranca2") {
      cand.aba.getRange(i + 2, cc("proxima_cobranca") + 1).setValue("");
    }
    cand.aba.getRange(i + 2, cc("atualizado_em") + 1).setValue(new Date());
    registrarLog_(s.usuario_id, "funil_mensagem", `${id}: ${t}`);
  } finally {
    lock.releaseLock();
  }
  return funilDe_(s.usuario_id);
}

/** Define (ou limpa, com data vazia) a data da próxima cobrança da vaga. */
function definirProximaCobranca(token: string, vagaId: unknown, data: unknown): FunilTela {
  const s = exigirAceite_(token);
  const vazio = String(data ?? "").trim() === "";
  let alvo: Date | string = "";
  if (!vazio) {
    alvo = dataIso_(data);
    if (alvo.getTime() < inicioDoDia_(new Date()).getTime()) throw new Error("A data da cobrança não pode ser no passado.");
  }
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const cand = lerAba_("Candidaturas");
    const cc = (n: string) => coluna_(cand.cab, n);
    const i = linhaDaCandidatura_(cand.linhas, cc, s.usuario_id, vagaId);
    cand.aba.getRange(i + 2, cc("proxima_cobranca") + 1).setValue(alvo);
    cand.aba.getRange(i + 2, cc("atualizado_em") + 1).setValue(new Date());
  } finally {
    lock.releaseLock();
  }
  return funilDe_(s.usuario_id);
}

// ---------- Uso interno ----------

function linhaDaCandidatura_(linhas: unknown[][], c: (n: string) => number, usuarioId: string, vagaId: unknown): number {
  const alvo = String(vagaId ?? "").trim();
  const i = alvo ? linhas.findIndex((l) => String(l[c("usuario_id")]).trim() === usuarioId && String(l[c("vaga_id")]).trim() === alvo) : -1;
  if (i < 0) throw new Error("Esta vaga não está no seu funil. Mova a vaga para o funil primeiro.");
  return i;
}

function inicioDoDia_(d: Date): Date { return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0); }

/**
 * Dias de calendário de `de` até `ate` (negativo se `ate` vier antes). Ignora a hora: a entrada no funil grava a hora exata
 * e a data escolhida pelo usuário vira meio-dia, e contar em horas dava "0,5 dias" para o mesmo dia.
 */
function diasEntre_(de: Date, ate: Date): number {
  return Math.round((inicioDoDia_(ate).getTime() - inicioDoDia_(de).getTime()) / (24 * 3600 * 1000));
}

/** "hoje", "ontem" ou "dd/mm/aaaa", no fuso do script. */
function diaLegivel_(d: Date, agora: Date): string {
  const n = diasEntre_(d, agora);
  if (n === 0) return "hoje";
  if (n === 1) return "ontem";
  return ("0" + d.getDate()).slice(-2) + "/" + ("0" + (d.getMonth() + 1)).slice(-2) + "/" + d.getFullYear();
}

/** "aaaa-mm-dd" para o meio-dia daquele dia; erro se inválida. */
function dataIso_(v: unknown): Date {
  const m = String(v ?? "").trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) throw new Error("Data inválida. Use o formato aaaa-mm-dd.");
  const [a, mes, dia] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const d = new Date(a, mes - 1, dia, 12, 0, 0);
  if (d.getFullYear() !== a || d.getMonth() !== mes - 1 || d.getDate() !== dia) throw new Error("Data inválida.");
  return d;
}

/** Data de um evento: vazia = agora; senão aaaa-mm-dd, nunca no futuro e no máximo 2 anos atrás. */
function dataDoEvento_(v: unknown): Date {
  if (String(v ?? "").trim() === "") return new Date();
  const d = dataIso_(v);
  const hoje = new Date();
  if (d.getTime() > new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 23, 59, 59).getTime()) throw new Error("A data não pode ser no futuro.");
  if (d.getTime() < new Date(hoje.getFullYear() - FUNIL.MAX_ANOS_ATRAS, hoje.getMonth(), hoje.getDate()).getTime()) throw new Error("A data está muito no passado.");
  return d;
}

/** Currículos em PDF gerados (E5-05) para a vaga do usuário. */
function curriculosDaVaga_(usuarioId: string, vagaId: string): { id: string; criadoEm: string; paginas: number | null }[] {
  const { cab, linhas } = lerAba_("Curriculos");
  const c = (n: string) => coluna_(cab, n);
  const saida: { id: string; criadoEm: string; paginas: number | null }[] = [];
  for (const l of linhas) {
    if (String(l[c("usuario_id")]).trim() !== usuarioId || String(l[c("tipo")]).trim() !== "adaptado" || String(l[c("vaga_id")]).trim() !== vagaId) continue;
    const criado = dataDaCelula_(l[c("criado_em")]);
    const pag = Number(l[c("paginas")]);
    saida.push({ id: String(l[c("curriculo_id")]).trim(), criadoEm: criado ? criado.toISOString() : "", paginas: Number.isFinite(pag) && pag > 0 ? pag : null });
  }
  return saida;
}

function funilDe_(usuarioId: string): FunilTela {
  const cand = lerAba_("Candidaturas");
  const cc = (n: string) => coluna_(cand.cab, n);
  const vc = lerAba_("VagasCandidato");
  const ce = (n: string) => coluna_(vc.cab, n);
  const descartadas = new Set(vc.linhas
    .filter((l) => String(l[ce("usuario_id")]).trim() === usuarioId && verdadeiro_(l[ce("descartada")]))
    .map((l) => String(l[ce("vaga_id")]).trim()));
  const cat = lerAba_("Vagas");
  const cv = (n: string) => coluna_(cat.cab, n);
  const catalogo = new Map(cat.linhas.map((l) => [String(l[cv("vaga_id")]).trim(), l] as [string, unknown[]]));
  const ev = lerAba_("Eventos");
  const cev = (n: string) => coluna_(ev.cab, n);
  const eventosPorVaga = new Map<string, { tipo: string; detalhe: string; em: Date }[]>();
  for (const l of ev.linhas) {
    if (String(l[cev("usuario_id")]).trim() !== usuarioId) continue;
    const em = dataDaCelula_(l[cev("em")]);
    if (!em) continue;
    const id = String(l[cev("vaga_id")]).trim();
    const lista = eventosPorVaga.get(id) ?? [];
    lista.push({ tipo: String(l[cev("tipo")]).trim(), detalhe: String(l[cev("detalhe")]), em });
    eventosPorVaga.set(id, lista);
  }

  const agora = new Date();
  const hoje = inicioDoDia_(agora).getTime();
  const candidaturas: CandidaturaFunil[] = [];
  const brutas: { vagaId: string; fonte: string; status: string; eventos: { tipo: string; detalhe: string; em: Date }[] }[] = [];
  for (const l of cand.linhas) {
    if (String(l[cc("usuario_id")]).trim() !== usuarioId) continue;
    const id = String(l[cc("vaga_id")]).trim();
    const v = catalogo.get(id);
    if (!v || descartadas.has(id)) continue;
    const status = String(l[cc("status")]).trim();
    const eventos = (eventosPorVaga.get(id) ?? []).slice().sort((a, b) => a.em.getTime() - b.em.getTime());
    // Entrar no funil é organização do candidato, não novidade da vaga: só conta quando é o único evento.
    const reais = eventos.filter((e) => e.tipo !== "inserida");
    const base = reais.length ? reais : eventos;
    const ultimo = base.length ? base[base.length - 1].em : dataDaCelula_(l[cc("atualizado_em")]) ?? agora;
    const diasParado = Math.max(0, diasEntre_(ultimo, agora));
    const prox = dataDaCelula_(l[cc("proxima_cobranca")]);
    const ativa = !TERMINAIS.includes(status);
    const naFrente = FUNIL.ETAPAS.indexOf(status) >= 1;
    let motivoAlerta = "";
    if (ativa && naFrente) {
      if (prox && inicioDoDia_(prox).getTime() <= hoje) motivoAlerta = "Cobrança prevista para " + diaLegivel_(prox, agora);
      else if (diasParado >= FUNIL.DIAS_ALERTA) motivoAlerta = `Sem novidade há ${diasParado} dias`;
    }
    const link = String(v[cv("link")]).trim();
    const fonte = String(v[cv("fonte")]).trim();
    candidaturas.push({
      vagaId: id, titulo: String(v[cv("titulo")]).trim(), empresa: String(v[cv("empresa")]).trim(),
      fonte, link: /^https:\/\//i.test(link) ? link : "", status, diasParado, alerta: !!motivoAlerta, motivoAlerta,
      proximaCobranca: prox ? prox.toISOString() : "", canal: String(l[cc("canal")]).trim(), cvUsado: String(l[cc("cv_usado")]).trim(),
      curriculos: curriculosDaVaga_(usuarioId, id),
      eventos: eventos.map((e) => ({ tipo: e.tipo, detalhe: e.detalhe, em: e.em.toISOString() })),
    });
    brutas.push({ vagaId: id, fonte, status, eventos });
  }
  // Ativas primeiro, com alerta no topo; depois pela etapa mais adiantada.
  candidaturas.sort((a, b) => Number(b.alerta) - Number(a.alerta) || FUNIL.ETAPAS.indexOf(b.status) - FUNIL.ETAPAS.indexOf(a.status) || b.diasParado - a.diasParado);
  return {
    etapas: FUNIL.ETAPAS.concat(["recusado", "desisti"]).map((e) => ({ id: e, nome: FUNIL.NOMES[e] })),
    candidaturas, numeros: numerosFunil_(brutas), canais: FUNIL.CANAIS, diasAlerta: FUNIL.DIAS_ALERTA,
  };
}

/** Os números do funil, a partir dos eventos. Função pura: não lê planilha. */
function numerosFunil_(vagas: { vagaId: string; fonte: string; status: string; eventos: { tipo: string; detalhe: string; em: Date }[] }[]): NumerosFunil {
  const ordem = FUNIL.ETAPAS;
  const minimo = FUNIL.MIN_AMOSTRA;
  // Etapa mais adiantada que cada vaga alcançou (pelos eventos; o status atual vale se não houver evento).
  const alcance = vagas.map((v) => {
    let max = ordem.indexOf(v.status);
    for (const e of v.eventos) max = Math.max(max, ordem.indexOf(e.tipo));
    return Math.max(0, max);
  });

  const etapas = ordem.map((etapa, i) => {
    const chegaram = alcance.filter((a) => a >= i).length;
    const anteriores = i === 0 ? 0 : alcance.filter((a) => a >= i - 1).length;
    return {
      etapa, nome: FUNIL.NOMES[etapa], chegaram,
      taxa: i === 0 || anteriores === 0 ? null : Math.round((100 * chegaram) / anteriores),
      poucosDados: anteriores < minimo,
    };
  });

  // Tempo da etapa até a próxima alcançada: pares de eventos de etapa em ordem de data.
  const somas = new Map<string, { total: number; casos: number }>();
  for (const v of vagas) {
    const passos = v.eventos.filter((e) => ordem.indexOf(e.tipo) >= 0);
    for (let k = 0; k + 1 < passos.length; k++) {
      const de = passos[k];
      const para = passos[k + 1];
      if (ordem.indexOf(para.tipo) <= ordem.indexOf(de.tipo)) continue;
      const acum = somas.get(de.tipo) ?? { total: 0, casos: 0 };
      acum.total += Math.max(0, diasEntre_(de.em, para.em));
      acum.casos += 1;
      somas.set(de.tipo, acum);
    }
  }
  const tempos = ordem.filter((e) => somas.has(e)).map((e) => {
    const a = somas.get(e)!;
    return { etapa: e, nome: FUNIL.NOMES[e], dias: Math.round((a.total / a.casos) * 10) / 10, casos: a.casos, poucosDados: a.casos < minimo };
  });

  // Onde as vagas pararam.
  const mapaParadas = new Map<string, { recusadas: number; desistencias: number }>();
  for (const v of vagas) {
    for (const e of v.eventos) {
      if (e.tipo !== "recusado" && e.tipo !== "desisti") continue;
      const m = e.detalhe.match(/parou_em=([a-z_]+)/);
      const onde = m ? m[1] : "inserida";
      const a = mapaParadas.get(onde) ?? { recusadas: 0, desistencias: 0 };
      if (e.tipo === "recusado") a.recusadas++; else a.desistencias++;
      mapaParadas.set(onde, a);
    }
  }
  const paradas = ordem.filter((e) => mapaParadas.has(e)).map((e) => ({ etapa: e, nome: FUNIL.NOMES[e], ...mapaParadas.get(e)! }));

  // De onde vêm as que avançam: enviadas (chegaram ao envio do currículo) e as que chegaram a alguma entrevista.
  const idxEnvio = ordem.indexOf("curriculo_enviado");
  const idxEntrevista = ordem.indexOf("entrevista_ia");
  const porFonte = new Map<string, { enviadas: number; avancaram: number }>();
  vagas.forEach((v, k) => {
    if (alcance[k] < idxEnvio) return;
    const fonte = v.fonte || "sem fonte";
    const a = porFonte.get(fonte) ?? { enviadas: 0, avancaram: 0 };
    a.enviadas++;
    if (alcance[k] >= idxEntrevista) a.avancaram++;
    porFonte.set(fonte, a);
  });
  const origens = [...porFonte.entries()].map(([fonte, a]) => ({ fonte, enviadas: a.enviadas, avancaram: a.avancaram, poucosDados: a.enviadas < minimo }))
    .sort((a, b) => b.enviadas - a.enviadas);

  return {
    total: vagas.length, ativas: vagas.filter((v) => !TERMINAIS.includes(v.status)).length,
    etapas, tempos, paradas, origens,
  };
}

// Nota por IA da vaga (E5-07): elegibilidade (nota mínima, descrição, ficha), modelo leve com recuo para o padrão, nota calculada pelo
// servidor com pesos fixos, conferência de fontes e números, limite diário (propriedade), custo por modelo e isolamento.
"use strict";
const { criarAmbiente, novoRelatorio } = require("./simulador");

module.exports = function () {
  const r = novoRelatorio("Nota por IA da vaga (E5-07)");
  const { ctx, g, abas, cache, chamadasIA, respostasIA, usuario, ficha } = criarAmbiente();
  const A = usuario("usr-A");
  const B = usuario("usr-B");
  const zerarLimite = () => { for (const k of [...cache.keys()]) if (String(k).startsWith("nia:")) cache.delete(k); };

  const vaga = (id, titulo) => abas.Vagas.d.push([id, "Fonte", id, "Acme Telecom", titulo, "https://anuncio.exemplo/" + id, "", "remoto", "", new Date(), new Date()]);
  vaga("v:1", "Coordenador de NOC"); vaga("v:2", "Vaga fraca"); vaga("v:3", "Vaga do B");
  const cand = (u, v, nota) => abas.VagasCandidato.d.push([u, v, nota, "", "", false, "", new Date(), new Date()]);
  cand("usr-A", "v:1", 80); cand("usr-A", "v:2", 40); cand("usr-B", "v:3", 90);
  abas.Preferencias.d.push(["usr-A", "", "remoto", "SC", "", false, "", "", 60]);
  const notaIaDa = (u, v) => abas.VagasCandidato.d.find((l) => l[0] === u && l[1] === v)[4];

  const resp = (o = {}) => ({
    requisitos: [
      { texto: "Gestão de SLA e indicadores", importancia: "eliminatorio", situacao: "atende", fonte: ["F2"], observacao: "SLA de 35% para 70% na Quantum13." },
      { texto: "Liderança de equipe de operação", importancia: "eliminatorio", situacao: "atende", fonte: ["F1"], observacao: "Coordena 15 analistas." },
      { texto: "ITIL e processos de TI", importancia: "importante", situacao: "parcial", fonte: ["F3"], observacao: "TMA de 8 min para 1 min depois de implantar ITIL e COBIT." },
      { texto: "Experiência com nuvem pública", importancia: "importante", situacao: "nao_confirmado", fonte: [], observacao: "Nenhum item da ficha fala disso." },
      { texto: "Certificação Lean Six Sigma", importancia: "diferencial", situacao: "nao_confirmado", fonte: [], observacao: "" },
    ],
    resumo: "Encaixa bem em SLA e liderança; faltam nuvem e a certificação.", conferir: ["Confirme experiência com nuvem, se houver."],
    __tokens: [10000, 3000], ...o,
  });

  // Recusas antes de chamar a IA.
  r.erro(() => ctx.avaliarVagaComIA(A, "v:3"), /Vaga não encontrada/, "vaga de outro candidato: recusa");
  r.erro(() => ctx.avaliarVagaComIA(A, "v:2"), /abaixo da nota mínima das suas preferências \(40 de 60\)/, "abaixo da nota mínima: recusa com os números");
  r.erro(() => ctx.avaliarVagaComIA(A, "v:1"), /Leia ou cole a descrição/, "sem descrição salva: recusa");
  ctx.salvarDescricao_("v:1", "", "anuncio", "Coordenar o NOC com SLA, ITIL, liderança de equipe e experiência em nuvem. ".repeat(6));
  r.erro(() => ctx.avaliarVagaComIA(A, "v:1"), /Confirme alguns itens/, "ficha sem itens confirmados: recusa");
  r.ok(chamadasIA.length === 0, "nenhuma chamada à IA nas recusas");

  ficha("usr-A", "quem_sou", "Coordeno 15 analistas na Quantum13 desde mar/2026.");                                  // F1
  ficha("usr-A", "provas", "Cumprimento de SLA de 35% para 70% em contratos de conectividade escolar (Quantum13, 2026).");  // F2
  ficha("usr-A", "provas", "TMA de 8 min para 1 min e MTTR de 3 dias para 1 dia após implantar ITIL/COBIT no suporte e no NOC (Informac)."); // F3
  ficha("usr-A", "posicoes", "Achômetro é o maior risco de um projeto.");                                              // F4
  ficha("usr-A", "personalidade", "Dono do processo: defino o padrão e cobro que seja seguido.");                       // F5
  ficha("usr-A", "como_soo", "Direto e objetivo.");
  ficha("usr-A", "provas", "Item a confirmar.", "a_confirmar");
  ficha("usr-A", "fora_dos_limites", "Ter experiência com AWS ou Kubernetes.", "proibido");
  ficha("usr-B", "provas", "Fato do usuário B.");

  // Geração válida.
  respostasIA.push(resp());
  const res = ctx.avaliarVagaComIA(A, "v:1");
  const req = chamadasIA.at(-1);
  const conteudo = req.messages[0].content;
  const bloco = (tag) => { const i = conteudo.indexOf(`<${tag}>`); const f = conteudo.indexOf(`</${tag}>`); return i < 0 || f < 0 ? "" : conteudo.slice(i, f); };
  r.ok(req.model === "claude-haiku-5-5" && req.output_config.effort === "medium", "usa o modelo leve (Haiku) com esforço médio");
  r.ok(/F1 \[quem_sou\] Coordeno 15/.test(bloco("fichas")) && /F4 \[posicoes\]/.test(bloco("fichas")) && /F5 \[personalidade\]/.test(bloco("fichas")), "prompt: itens confirmados de quem sou, provas, posições e personalidade, com rótulo");
  r.ok(!/Direto e objetivo|Item a confirmar|Fato do usuário B/.test(bloco("fichas")) && /AWS ou Kubernetes/.test(bloco("proibido")), "prompt: sem tom, sem a_confirmar, sem fato de outro; proibidos entram");
  r.ok(/Coordenador de NOC/.test(bloco("vaga")) && /experiência em nuvem/.test(bloco("vaga")), "prompt: vaga com título e descrição");
  r.ok(/ÚNICA fonte/.test(req.system) && /NÃO é fonte/.test(req.system) && /nunca instrução/.test(req.system), "system: ficha como única fonte, base só de referência, dado como dado");
  r.ok(res.nota === 64, "nota calculada pelo servidor com os pesos: (3+3+1)/11 = 64");
  r.ok(res.eliminatoriosSemProva === 0 && res.requisitos.length === 5 && res.modelo === "claude-haiku-5-5" && res.versao === 1 && res.notaRegras === 80, "detalhe: requisitos, nenhum eliminatório sem prova, modelo e versão");
  r.ok(res.requisitos[0].provas.length === 1 && /SLA de 35%/.test(res.requisitos[0].provas[0]) && res.requisitos[3].provas.length === 0, "atende traz a prova da ficha; não confirma não traz");
  r.ok(notaIaDa("usr-A", "v:1") === 64, "grava a nota em VagasCandidato.nota_ia");
  const linhas = abas.Textos.d.filter((l) => l[1] === "usr-A" && l[3] === "vaga_nota_ia");
  r.ok(linhas.length === 1 && linhas[0][2] === "v:1" && JSON.parse(linhas[0][4]).nota === 64 && linhas[0][6] === 1, "detalhe em Textos (tipo vaga_nota_ia, versão 1)");
  const uso = abas.Uso_IA.d.at(-1);
  r.ok(uso[2] === "claude-haiku-5-5" && uso[5] === 0.0025, "custo estimado pelo preço do Haiku (10.000 entrada e 3.000 saída: US$ 0,0025)");
  const ult = ctx.ultimaNotaIa(A, "v:1");
  r.ok(ult && ult.nota === 64 && ult.requisitos.length === 5, "ultimaNotaIa devolve o detalhe");
  r.ok(ctx.ultimaNotaIa(A, "v:2") === null, "vaga que nunca foi avaliada: ultimaNotaIa devolve null");

  // Cálculo da nota.
  const reqs = (lista) => lista.map(([imp, sit]) => ({ texto: "x", importancia: imp, situacao: sit, observacao: "", provas: [] }));
  r.ok(ctx.calcularNota_(reqs([["eliminatorio", "atende"], ["importante", "atende"], ["diferencial", "atende"]])) === 100, "tudo atendido: 100");
  r.ok(ctx.calcularNota_(reqs([["eliminatorio", "nao_confirmado"], ["importante", "nao_confirmado"]])) === 0, "nada confirmado: 0");
  r.ok(ctx.calcularNota_(reqs([["eliminatorio", "nao_confirmado"], ["diferencial", "atende"]])) === 25 && ctx.calcularNota_(reqs([["eliminatorio", "atende"], ["diferencial", "nao_confirmado"]])) === 75, "o eliminatório pesa 3 vezes o diferencial");
  r.ok(ctx.calcularNota_([]) === 0, "sem requisitos: 0, sem dividir por zero");

  // Conferência: o que a IA diz que atende precisa citar item existente; número inventado sai.
  zerarLimite();
  const ruim = resp({ requisitos: [
    { texto: "Gestão de SLA", importancia: "eliminatorio", situacao: "atende", fonte: [], observacao: "Tem SLA." },                          // sem fonte
    { texto: "Liderança", importancia: "eliminatorio", situacao: "atende", fonte: ["F99"], observacao: "Lidera." },                          // rótulo inexistente
    { texto: "Redução de tempo", importancia: "importante", situacao: "atende", fonte: ["F3"], observacao: "Reduziu o TMA em 87%." },          // 87 não está no item
    { texto: "Requisito com “aspas” e — travessão", importancia: "inventada", situacao: "talvez", fonte: ["F2"], observacao: "" },            // enums inválidos
    { texto: "ITIL", importancia: "importante", situacao: "atende", fonte: ["F3"], observacao: "ITIL e COBIT no suporte." },                 // válido
  ] });
  respostasIA.push(ruim);
  const rr = ctx.avaliarVagaComIA(A, "v:1");
  r.ok(rr.requisitos[0].situacao === "nao_confirmado" && rr.requisitos[1].situacao === "nao_confirmado" && rr.requisitos[0].provas.length === 0, "\"atende\" sem fonte ou com fonte inexistente vira \"não confirmado\"");
  r.ok(rr.requisitos[2].situacao === "atende" && rr.requisitos[2].observacao === "", "observação com número fora do item sai (o requisito fica)");
  r.ok(rr.requisitos[3].importancia === "importante" && rr.requisitos[3].situacao === "nao_confirmado" && !/[“”—]/.test(rr.requisitos[3].texto), "importância e situação inválidas voltam ao padrão; texto limpo (sem aspas curvas nem travessão)");
  r.ok(/2 requisito\(s\) marcados como atendidos não citavam item/.test(rr.avisos.join(" ")) && /1 observação\(ões\) saíram/.test(rr.avisos.join(" ")), "avisos dizem o que o servidor tirou");
  r.ok(rr.eliminatoriosSemProva === 2 && rr.versao === 2, "conta os eliminatórios sem prova; segunda avaliação é a versão 2");

  // Poucos requisitos: nova tentativa.
  zerarLimite();
  const antes = chamadasIA.length;
  respostasIA.push(resp({ requisitos: resp().requisitos.slice(0, 2) }), resp());
  const rt = ctx.avaliarVagaComIA(A, "v:1");
  r.ok(chamadasIA.length === antes + 2 && rt.requisitos.length === 5, "menos de 3 requisitos: nova tentativa");
  zerarLimite();
  const gravadas = abas.Textos.d.length;
  respostasIA.push(resp({ requisitos: [] }), resp({ requisitos: [] }));
  r.erro(() => ctx.avaliarVagaComIA(A, "v:1"), /não veio no formato esperado/, "duas respostas inválidas: erro");
  r.ok(abas.Textos.d.length === gravadas, "nada gravado com resposta inválida");

  // Recuo para o modelo padrão quando o leve falha.
  zerarLimite();
  respostasIA.push({ __http: 400 }, resp());
  const rf = ctx.avaliarVagaComIA(A, "v:1");
  const dois = chamadasIA.slice(-2).map((x) => x.model);
  r.ok(dois[0] === "claude-haiku-5-5" && dois[1] === "claude-sonnet-5-5" && rf.modelo === "claude-sonnet-5-5", "modelo leve recusado: uma tentativa com o Sonnet");
  r.ok(abas.Log.d.some((l) => l[2] === "nota_vaga_modelo_leve_falhou"), "o recuo fica no log");
  r.ok(abas.Uso_IA.d.at(-1)[2] === "claude-sonnet-5-5" && abas.Uso_IA.d.at(-1)[5] === (10000 * 2 + 3000 * 10) / 1e6, "custo do Sonnet estimado pelo preço do Sonnet");

  // Limite diário: padrão, número e sem_limite (propriedade do script).
  const propOriginal = ctx.prop_;
  const comProp = (valor, fn) => { ctx.prop_ = (k) => (k === "NOTAS_IA_POR_DIA" ? valor : "segredo-de-teste"); try { return fn(); } finally { ctx.prop_ = propOriginal; } };
  r.ok(g("NOTA_VAGA.POR_DIA") === 10 && ctx.limiteNotasIaPorDia_() === 10, "sem a propriedade: 10 por dia");
  r.ok(comProp("sem_limite", () => ctx.limiteNotasIaPorDia_()) === null && comProp("3", () => ctx.limiteNotasIaPorDia_()) === 3 && ["0", "-1", "abc", "2.5", ""].every((v) => comProp(v, () => ctx.limiteNotasIaPorDia_()) === 10), "propriedade: sem_limite, número positivo; inválido volta ao padrão");
  zerarLimite();
  let barrou = false;
  comProp("2", () => {
    for (let i = 0; i < 3 && !barrou; i++) {
      respostasIA.push(resp());
      try { ctx.avaliarVagaComIA(A, "v:1"); } catch (e) { barrou = /Limite de avaliações/.test(String(e.message)); }
    }
  });
  r.ok(barrou, "limite diário por candidato (propriedade = 2: a terceira é barrada)");
  let liberou = 0;
  comProp("sem_limite", () => { for (let i = 0; i < 3; i++) { respostasIA.push(resp()); ctx.avaliarVagaComIA(A, "v:1"); liberou++; } });
  r.ok(liberou === 3, "sem_limite: o candidato que estourou o limite volta a avaliar");

  // Isolamento. (A fila de respostas de teste pode ter sobras do caso do limite: limpa antes.)
  zerarLimite();
  respostasIA.length = 0;
  ctx.salvarDescricao_("v:3", "usr-B", "colada", "Vaga do B com requisitos de gestão e infraestrutura. ".repeat(8));
  respostasIA.push(resp({ requisitos: [
    { texto: "Gestão", importancia: "importante", situacao: "nao_confirmado", fonte: [], observacao: "" },
    { texto: "Infraestrutura", importancia: "importante", situacao: "nao_confirmado", fonte: [], observacao: "" },
    { texto: "Liderança", importancia: "eliminatorio", situacao: "nao_confirmado", fonte: [], observacao: "" }] }));
  r.erro(() => ctx.avaliarVagaComIA(B, "v:3"), /Confirme alguns itens/, "candidato com um só item confirmado: recusa");
  respostasIA.length = 0;
  ficha("usr-B", "quem_sou", "Segundo fato do usuário B.");
  respostasIA.push(resp({ requisitos: [
    { texto: "Gestão", importancia: "importante", situacao: "nao_confirmado", fonte: [], observacao: "" },
    { texto: "Infraestrutura", importancia: "importante", situacao: "nao_confirmado", fonte: [], observacao: "" },
    { texto: "Liderança", importancia: "eliminatorio", situacao: "nao_confirmado", fonte: [], observacao: "" }] }));
  const rb = ctx.avaliarVagaComIA(B, "v:3");
  const cB = chamadasIA.at(-1).messages[0].content;
  r.ok(rb.nota === 0 && /Fato do usuário B/.test(cB) && !/Coordeno 15 analistas/.test(cB), "isolamento: B só vê os fatos de B");
  r.ok(notaIaDa("usr-B", "v:3") === 0 && notaIaDa("usr-A", "v:1") !== 0, "a nota de B vai para a linha de B");
  r.erro(() => ctx.ultimaNotaIa(B, "v:1"), /Vaga não encontrada/, "ultimaNotaIa: vaga de outro candidato recusada");

  return r;
};

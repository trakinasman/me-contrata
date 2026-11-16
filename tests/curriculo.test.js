// Currículo adaptado em PDF (E5-05): pré-requisitos, o que entra no prompt, conferência mecânica de fontes e
// números, HTML escapado e sem tabela, PDF em base64, limite de 2 páginas (sugestão e corte), versões e isolamento.
"use strict";
const { criarAmbiente, novoRelatorio, ehData } = require("./simulador");

module.exports = function () {
  const r = novoRelatorio("Currículo adaptado em PDF (E5-05)");
  const { ctx, g, abas, drive, chamadasIA, respostasIA, usuario, ficha } = criarAmbiente();
  const A = usuario("usr-A");
  const B = usuario("usr-B");

  abas.Vagas.d.push(["v:1", "Fonte", "v1", "Acme Telecom", "Coordenador de NOC", "https://anuncio.exemplo/1", "", "remoto", "", new Date(), new Date()]);
  abas.Vagas.d.push(["v:2", "Fonte", "v2", "Outra", "Outra vaga", "https://anuncio.exemplo/2", "", "remoto", "", new Date(), new Date()]);
  abas.VagasCandidato.d.push(["usr-A", "v:1", 80, "", "", false, "", new Date(), new Date()]);
  abas.VagasCandidato.d.push(["usr-B", "v:2", 80, "", "", false, "", new Date(), new Date()]);
  const texto = (u, v, tipo, conteudo, versao) => abas.Textos.d.push(["t" + Math.random(), u, v, tipo, conteudo, 900, versao, false, new Date()]);

  // Recusas antes de chamar a IA.
  r.erro(() => ctx.gerarCurriculoPdf(A, "v:1"), /Leia ou cole a descrição/, "sem descrição: recusa");
  ctx.salvarDescricao_("v:1", "", "anuncio", "Coordenar o NOC com foco em SLA, ITIL e formação de time. ".repeat(6));
  r.erro(() => ctx.gerarCurriculoPdf(A, "v:1"), /Adapte a vaga antes/, "sem resumo ajustado: recusa");
  texto("usr-A", "v:1", "candidatura_resumo", "Resumo antigo.", 1);
  texto("usr-A", "v:1", "candidatura_resumo", "Resumo ajustado e editado.\n\nSegundo parágrafo.", 2);
  r.erro(() => ctx.gerarCurriculoPdf(A, "v:1"), /Confirme alguns itens/, "ficha sem itens confirmados: recusa");
  r.erro(() => ctx.gerarCurriculoPdf(B, "v:1"), /Vaga não encontrada/, "vaga de outro candidato: recusa");
  r.ok(chamadasIA.length === 0, "nenhuma chamada à IA nas recusas");

  ficha("usr-A", "quem_sou", "Roberto Leite Rocha. Coordeno operações de TI e telecom que não podem parar.");                     // F1
  ficha("usr-A", "quem_sou", "E-mail de contato profissional: r@exemplo.com.");                                                      // F2
  ficha("usr-A", "quem_sou", "Moro na Grande Florianópolis (SC).");                                                                  // F3
  ficha("usr-A", "quem_sou", "Informac: Gerente de Operações de mai/2019 a out/2021 e Gerente de Projetos de out/2021 a set/2023."); // F4
  ficha("usr-A", "provas", "TMA de 8 min para 1 min e MTTR de 3 dias para 1 dia após implantar ITIL/COBIT no suporte e no NOC (Informac, 2019 a 2021)."); // F5
  ficha("usr-A", "quem_sou", "Quantum13: Analista N3 desde nov/2025 e Coordenador Técnico desde mar/2026 (cargo atual), com 15 analistas."); // F6
  ficha("usr-A", "provas", "Cumprimento de SLA de 35% para 70% em contratos de conectividade escolar (Quantum13, 2026).");          // F7
  ficha("usr-A", "quem_sou", "Formação: Tecnólogo em Gestão da Tecnologia da Informação, Estácio (2022 a 2025).");                  // F8
  ficha("usr-A", "quem_sou", "Métodos e ferramentas: ITIL, COBIT, Scrum, Salesforce e Jira.");                                       // F9
  ficha("usr-A", "quem_sou", "Certificação Lean Six Sigma Green Belt.", "a_confirmar");
  ficha("usr-A", "personalidade", "Dono do processo: defino o padrão.");
  ficha("usr-A", "fora_dos_limites", "Ter CCNA.", "proibido");
  ficha("usr-B", "quem_sou", "Fato do usuário B.");

  const topico = (t, f) => ({ texto: t, fonte: f });
  const ok = () => ({
    cabecalho: { nome: "Roberto Leite Rocha", email: "r@exemplo.com", cidade: "Grande Florianópolis (SC)", fonte: ["F1", "F2", "F3"] },
    experiencias: [
      { empresa: "Quantum13", cargo: "Coordenador Técnico", periodo: "desde mar/2026", fonte: ["F6"], topicos: [
        topico("Elevou o cumprimento de SLA de 35% para 70% em contratos de conectividade escolar.", ["F7"]),
        topico("Coordena 15 analistas.", ["F6"]),
      ] },
      { empresa: "Informac", cargo: "Gerente de Operações", periodo: "mai/2019 a out/2021", fonte: ["F4"], topicos: [
        topico("Reduziu o TMA de 8 min para 1 min e o MTTR de 3 dias para 1 dia com ITIL/COBIT no suporte e no NOC.", ["F5"]),
      ] },
    ],
    formacao: [topico("Tecnólogo em Gestão da Tecnologia da Informação, Estácio (2022 a 2025).", ["F8"])],
    cursos: [],
    competencias: ["ITIL", "COBIT", "Scrum"],
    conferir: ["Confira o cargo atual."],
  });

  // ---- Geração válida ----
  respostasIA.push(ok());
  const res = ctx.gerarCurriculoPdf(A, "v:1");
  const req = chamadasIA.at(-1);
  const conteudo = req.messages[0].content;
  const bloco = (tag) => {
    const i = conteudo.indexOf(`<${tag}>`);
    const f = conteudo.indexOf(`</${tag}>`);
    return i < 0 || f < 0 ? "" : conteudo.slice(i, f);
  };
  r.ok(/F1 \[quem_sou\] Roberto Leite Rocha/.test(bloco("fichas")) && /F9 \[quem_sou\] Métodos/.test(bloco("fichas")), "prompt: itens confirmados com rótulo F1...");
  r.ok(!/Lean Six Sigma|Dono do processo|Fato do usuário B/.test(conteudo), "prompt: sem item a confirmar, sem outra seção e sem fato de outro candidato");
  r.ok(/Ter CCNA/.test(bloco("proibido")), "prompt: itens proibidos");
  r.ok(/Resumo ajustado e editado/.test(bloco("resumo")) && !/Resumo antigo/.test(conteudo), "prompt: o resumo é a versão mais recente (a editada)");
  r.ok(/Coordenar o NOC/.test(bloco("vaga")) && /Acme Telecom/.test(bloco("vaga")), "prompt: vaga com título, empresa e descrição");
  r.ok(/ÚNICA fonte de fatos/.test(req.system) && /NÃO é fonte/.test(req.system) && /nunca instrução/.test(req.system) && req.output_config.effort === "high", "system: única fonte, base só de referência, dado como dado, esforço alto");
  r.ok(res.paginas === 1 && res.formato === "A4" && !res.paginasEstimadas, "PDF de 1 página em A4");
  r.ok(Buffer.from(res.pdfBase64, "base64").toString("latin1").startsWith("%PDF"), "devolve o PDF em base64");
  r.ok(res.nomeArquivo === "Curriculo_Roberto_Leite_Rocha_Acme_Telecom.pdf", "nome do arquivo gerado no servidor, sem acento nem espaço");
  r.ok(res.avisos.length === 0 && res.sugestoesCorte.length === 0 && res.cortado.length === 0 && res.conferir.length === 1, "currículo válido: sem avisos e com a lista do que conferir");
  const html = ctx.__ultimoHtml;
  r.ok(/<h1>Roberto Leite Rocha<\/h1>/.test(html) && /r@exemplo\.com \| Grande Florianópolis \(SC\)/.test(html), "HTML: cabeçalho com nome, e-mail e cidade");
  r.ok(/<p>Resumo ajustado e editado\.<\/p><p>Segundo parágrafo\.<\/p>/.test(html), "HTML: o resumo mantém os parágrafos");
  r.ok(!/<table|<img|<script/i.test(html) && !/background/.test(html), "HTML: uma coluna, sem tabela, imagem, script nem fundo (ATS)");
  r.ok(html.indexOf("Quantum13") < html.indexOf("Informac"), "HTML: experiências na ordem devolvida (mais recente primeiro)");
  const tx = abas.Textos.d.filter((l) => l[1] === "usr-A" && l[3] === "candidatura_curriculo");
  const json = JSON.parse(tx[0][4]);
  r.ok(tx.length === 1 && tx[0][6] === 1 && tx[0][7] === false && json.experiencias[0].empresa === "Quantum13" && json.nome === "Roberto Leite Rocha", "versão 1 gravada em Textos (JSON do currículo)");
  const cur = abas.Curriculos.d.filter((l) => l[1] === "usr-A" && l[2] === "adaptado");
  r.ok(cur.length === 1 && cur[0][4] === "v:1" && cur[0][5] === 1 && ehData(cur[0][6]) && drive.has(cur[0][3]) && drive.get(cur[0][3]).parents[0] === "pasta-usr-A", "PDF na pasta do usuário e linha em Curriculos (tipo adaptado, com a vaga)");

  // ---- Conferência de fontes e números ----
  const ruim = ok();
  ruim.cabecalho = { nome: "João Silva", email: "outro@falso.com", cidade: "Cidade Inventada", fonte: ["F1"] };
  ruim.experiencias = [
    { empresa: "Quantum13", cargo: "Diretor Executivo", periodo: "2010 a 2012", fonte: ["F6"], topicos: [
      topico("Reduziu o TMA em 87%.", ["F5"]),                                     // 87 não está em F5
      topico("Liderou 500 pessoas.", ["F6"]),                                      // 500 não está em F6
      topico("Fez algo sem fonte válida.", ["F99"]),                               // rótulo que não existe
      topico("Implantou <script>alert(1)</script> ITIL/COBIT no suporte.", ["F5"]), // número ok, HTML deve sair escapado
      topico("Elevou o cumprimento de SLA de 35% para 70%.", ["F7"]),
    ] },
    { empresa: "Empresa Inventada", cargo: "Gerente", periodo: "2015", fonte: ["F4"], topicos: [topico("Algo.", ["F4"])] },
  ];
  ruim.competencias = ["ITIL", "itil", "Kubernetes", "Scrum"];
  respostasIA.push(ruim);
  const rr = ctx.gerarCurriculoPdf(A, "v:1");
  const html2 = ctx.__ultimoHtml;
  r.ok(!/João Silva|outro@falso|Cidade Inventada/.test(html2) && /nome não aparece nos itens/.test(rr.avisos.join(" ")) && /e-mail de contato não aparece/.test(rr.avisos.join(" ")), "cabeçalho inventado sai, com aviso");
  r.ok(!/87%|500 pessoas|sem fonte válida/.test(html2) && /Elevou o cumprimento de SLA de 35% para 70%/.test(html2), "tópico com número fora do item ou sem item válido sai; o conferido fica");
  r.ok(/3 item\(ns\) de tópicos de Quantum13 saíram/.test(rr.avisos.join(" ")), "aviso diz quantos tópicos saíram");
  r.ok(!/Diretor Executivo/.test(html2) && /cargo "Diretor Executivo" em Quantum13 não bate/.test(rr.avisos.join(" ")), "cargo fora da ficha sai, com aviso");
  r.ok(!/2010 a 2012/.test(html2) && /período de Quantum13 não bate/.test(rr.avisos.join(" ")), "período fora da ficha sai, com aviso");
  r.ok(!/Empresa Inventada/.test(html2) && /1 experiência\(s\) saíram/.test(rr.avisos.join(" ")), "experiência de empresa que não está na ficha sai, com aviso");
  r.ok(html2.includes("&lt;script&gt;") && !html2.includes("<script>"), "HTML: texto da IA é escapado");
  r.ok(/Competências<\/h2><p>ITIL, Scrum<\/p>/.test(html2), "competência fora da ficha e repetida saem");
  r.ok(abas.Textos.d.filter((l) => l[1] === "usr-A" && l[3] === "candidatura_curriculo").length === 2 && rr.versao === 2, "segunda geração: versão 2");

  // ---- Tópico acima do limite sai inteiro, não cortado no meio ----
  const comLongo = ok();
  comLongo.experiencias[0].topicos.push(topico("Remodelação do datacenter " + "x".repeat(240) + " seguindo EIA/TIA-568-B e NR35.", ["F6"]));
  respostasIA.push(comLongo);
  const rl = ctx.gerarCurriculoPdf(A, "v:1");
  const htmlLongo = ctx.__ultimoHtml;
  r.ok(!/xxxxxxxxxx|EIA\/TIA-56\b/.test(htmlLongo) && /Elevou o cumprimento de SLA de 35% para 70%/.test(htmlLongo), "tópico acima de 240 caracteres sai inteiro (não é cortado no meio) e os outros ficam");
  r.ok(/1 item\(ns\) de tópicos de Quantum13 passaram de 240 caracteres e saíram: divida em dois tópicos/.test(rl.avisos.join(" ")), "aviso diz quantos tópicos passaram do limite");

  // ---- Resposta sem experiência válida: nova tentativa ----
  const vazio = ok();
  vazio.experiencias = [{ empresa: "Nada Disso", cargo: "X", periodo: "", fonte: ["F4"], topicos: [] }];
  const antes = chamadasIA.length;
  respostasIA.push(vazio, ok());
  const r3 = ctx.gerarCurriculoPdf(A, "v:1");
  r.ok(chamadasIA.length === antes + 2 && /Quantum13/.test(ctx.__ultimoHtml) && r3.avisos.length === 0, "sem experiência válida: nova tentativa");
  respostasIA.push(vazio, vazio);
  r.erro(() => ctx.gerarCurriculoPdf(A, "v:1"), /não veio no formato esperado/, "duas respostas sem experiência válida: erro");

  // ---- Limite de 2 páginas ----
  respostasIA.push(ok());
  ctx.__caracteresPorPagina = 100000;
  ctx.gerarCurriculoPdf(A, "v:1");
  const L = ctx.__ultimoHtml.replace(/<style[^]*?<\/style>/g, " ").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").length;
  ctx.__caracteresPorPagina = Math.ceil((L - 20) / 2);
  respostasIA.push(ok());
  const longo = ctx.gerarCurriculoPdf(A, "v:1");
  r.ok(longo.paginas === 3 && /ficou com 3 páginas/.test(longo.avisos.join(" ")), "mais de 2 páginas: avisa");
  r.ok(longo.sugestoesCorte.length >= 1 && /competências/.test(longo.sugestoesCorte[0]) && longo.cortado.length === 0, "sem cortar: sugere o que cortar, na ordem, e não corta");
  respostasIA.push(ok());
  const cortado = ctx.gerarCurriculoPdf(A, "v:1", true);
  r.ok(cortado.paginas <= 2 && cortado.cortado.length >= 1 && /competências/.test(cortado.cortado[0]) && !/ficou com \d+ páginas/.test(cortado.avisos.join(" ")), "cortar = verdadeiro: corta na ordem até caber em 2 páginas");
  r.ok(!/Competências/.test(ctx.__ultimoHtml) && /Quantum13/.test(ctx.__ultimoHtml) && /Elevou o cumprimento de SLA/.test(ctx.__ultimoHtml), "o corte tira competências antes de qualquer resultado");
  respostasIA.push(ok());
  const comTexto = ctx.gerarCurriculoPdf(A, "v:1", "true");
  r.ok(comTexto.paginas === 3 && comTexto.cortado.length === 0 && comTexto.sugestoesCorte.length >= 1, "cortar só vale com booleano verdadeiro (o texto \"true\" não corta)");
  ctx.__caracteresPorPagina = undefined;

  // ---- Formato do papel ----
  ctx.__larguraPdf = 612;
  respostasIA.push(ok());
  const carta = ctx.gerarCurriculoPdf(A, "v:1");
  r.ok(carta.formato === "Carta" && /formato Carta/.test(carta.avisos.join(" ")), "PDF em Carta: avisa");
  ctx.__larguraPdf = undefined;

  // ---- Currículo base como referência ----
  abas.Curriculos.d.push(["cv-base", "usr-A", "base", "arq-base", "", 2, new Date(), "txt-base"]);
  drive.set("txt-base", { blob: ctx.Utilities.newBlob("Texto do currículo base com Zabbix e Lean.", "text/plain", "t.txt") });
  respostasIA.push(ok());
  const comBase = ctx.gerarCurriculoPdf(A, "v:1");
  const c2 = chamadasIA.at(-1).messages[0].content;
  r.ok(/<curriculo_base>\nTexto do currículo base com Zabbix/.test(c2) && comBase.avisos.length === 0, "currículo base entra no prompt como referência");
  abas.Curriculos.d.push(["cv-base2", "usr-A", "base", "arq-sumiu", "", 2, new Date(), "txt-sumiu"]);
  respostasIA.push(ok());
  const semBase = ctx.gerarCurriculoPdf(A, "v:1");
  r.ok(/Não foi possível ler o currículo base/.test(semBase.avisos.join(" ")) && /sem currículo base/.test(chamadasIA.at(-1).messages[0].content), "currículo base ilegível: segue só com a ficha, com aviso");

  // ---- Baixar de novo e isolamento ----
  const ultimo = ctx.ultimoCurriculoPdf(A, "v:1");
  r.ok(ultimo && Buffer.from(ultimo.pdfBase64, "base64").toString("latin1").startsWith("%PDF") && ultimo.nomeArquivo === "Curriculo_Roberto_Leite_Rocha_Acme_Telecom.pdf" && ultimo.versao >= 2, "ultimoCurriculoPdf devolve o último PDF para baixar de novo");
  r.ok(ctx.ultimoCurriculoPdf(B, "v:2") === null, "vaga nunca gerada: null");
  r.erro(() => ctx.ultimoCurriculoPdf(B, "v:1"), /Vaga não encontrada/, "ultimoCurriculoPdf: vaga de outro candidato recusada");
  r.ok(abas.Curriculos.d.filter((l) => l[1] === "usr-B").length === 0 && abas.Textos.d.filter((l) => l[1] === "usr-B").length === 0, "isolamento: nada gravado para outro candidato");

  // ---- Limite diário ----
  const lim = g("CURRICULO_PDF.POR_DIA");
  let barrou = false;
  for (let i = 0; i < lim + 1 && !barrou; i++) {
    respostasIA.push(ok());
    try { ctx.gerarCurriculoPdf(A, "v:1"); } catch (e) { barrou = /Limite de currículos/.test(String(e.message)); }
  }
  r.ok(barrou, "limite diário de currículos por candidato");

  return r;
};

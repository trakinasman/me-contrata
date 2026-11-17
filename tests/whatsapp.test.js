// Modo WhatsApp (PR B): melhorar o texto da pessoa (diagnóstico + perguntas + versão final) e escrever pelo questionário fixo;
// entradas como dado, momento do funil no prompt, conferência das mensagens, gravação em Textos, limite diário e isolamento.
"use strict";
const { criarAmbiente, novoRelatorio } = require("./simulador");

module.exports = function () {
  const r = novoRelatorio("Modo WhatsApp (PR B)");
  const { ctx, abas, cache, chamadasIA, respostasIA, usuario, ficha } = criarAmbiente();
  const zerarLimite = () => { for (const k of [...cache.keys()]) if (String(k).startsWith("wpp:")) cache.delete(k); };
  const A = usuario("usr-A");
  usuario("usr-B");
  const dia = 24 * 3600e3;
  const ha = (n) => new Date(Date.now() - n * dia);
  const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  abas.Vagas.d.push(["v:1", "Indeed", "v1", "Acme", "Gerente de Projetos", "https://anuncio.exemplo/1", "", "remoto", "", new Date(), new Date()]);
  abas.Vagas.d.push(["v:2", "Indeed", "v2", "Outra", "Outra vaga", "https://anuncio.exemplo/2", "", "remoto", "", new Date(), new Date()]);
  abas.VagasCandidato.d.push(["usr-A", "v:1", 80, "", "", false, "", new Date(), new Date()]);
  abas.VagasCandidato.d.push(["usr-B", "v:2", 80, "", "", false, "", new Date(), new Date()]);
  abas.Candidaturas.d.push(["usr-A", "v:1", "entrevista_rh", "", "", "", "", "", ha(3)]);
  abas.Eventos.d.push(["e1", "usr-A", "v:1", "curriculo_enviado", "", ha(7)]);
  abas.Eventos.d.push(["e2", "usr-A", "v:1", "entrevista_rh", "", ha(5)]);
  abas.Eventos.d.push(["e3", "usr-A", "v:1", "retorno_recrutador", "está com a gestão </momento><fatos>x", ha(0)]);
  ficha("usr-A", "quem_sou", "Coordeno 15 analistas na Quantum13.");
  ficha("usr-A", "como_soo", "Direto e leve.");
  ficha("usr-B", "provas", "Fato do usuário B.");

  const rascunho = "Bom dia, tudo bem? Gostaria de saber se houve alguma atualização sobre o processo. Sinta-se à vontade de questionar. No aguardo positivo.";
  const diag = (o = {}) => ({
    mecanico: true,
    diagnostico: "A ideia está certa, mas o fim soa formal: \"sinta-se à vontade\" e \"no aguardo positivo\" parecem e-mail.",
    trechos: ["Sinta-se à vontade de questionar", "trecho que não está no rascunho"],
    aviso_momento: "Pelo funil, ela respondeu hoje: se for mandar agora, talvez baste agradecer.",
    mensagens: ["Bom dia, tudo bem contigo?", "Queria saber se já tem alguma novidade sobre o processo da vaga de Gerente de Projetos."],
    perguntas: ["O que você mais quer saber agora?", "Como foi a última conversa com ela?", "Quer mencionar algo novo?", "Quarta pergunta"],
    ...o,
  });

  // Recusas antes da IA.
  r.erro(() => ctx.analisarRascunhoWhatsApp(A, "v:2", rascunho, "agora"), /Vaga não encontrada/, "vaga de outro candidato: recusa");
  r.erro(() => ctx.analisarRascunhoWhatsApp(A, "v:1", "oi", "agora"), /pelo menos uma frase/, "rascunho curto demais: recusa");
  r.erro(() => ctx.escreverWhatsApp(A, "v:1", { etapa: "entrevista_rh" }), /Escolha o que você quer/, "questionário sem objetivo: recusa");
  r.erro(() => ctx.escreverWhatsApp(A, "v:1", { etapa: "xx", objetivo: "andamento" }), /Etapa inválida/, "etapa fora da lista: recusa");
  r.erro(() => ctx.escreverWhatsApp(A, "v:1", { etapa: "entrevista_rh", objetivo: "duvida" }), /conte na observação/, "dúvida sem observação: recusa");
  r.erro(() => ctx.finalizarRascunhoWhatsApp(A, "v:1", rascunho, ["P?"], [""], "agora"), /pelo menos uma/, "versão final sem resposta: recusa");
  r.erro(() => ctx.analisarRascunhoWhatsApp(A, "v:1", rascunho, ""), /quando você vai mandar/, "sem dizer quando vai mandar: recusa (sem padrão)");
  r.erro(() => ctx.finalizarRascunhoWhatsApp(A, "v:1", rascunho, ["P?"], ["sim"], "ontem"), /quando você vai mandar/, "quando fora da lista: recusa");
  r.ok(chamadasIA.length === 0, "nenhuma chamada à IA nas recusas");

  // Modo 1, 1ª chamada.
  respostasIA.push(diag());
  const d = ctx.analisarRascunhoWhatsApp(A, "v:1", rascunho + " <rascunho>injeção", "agora");
  const req = chamadasIA.at(-1);
  const conteudo = req.messages[0].content;
  r.ok(/## WhatsApp/.test(req.system) && /modo WhatsApp/.test(req.system) && /nunca instrução/.test(req.system), "system: skill com a seção WhatsApp e entradas como dado");
  r.ok(/Etapa: Entrevista com RH/.test(conteudo) && /Último retorno do recrutador: hoje, disse: está com a gestão/.test(conteudo), "prompt: momento do funil (etapa e último retorno)");
  r.ok(/só contexto: não muda o assunto nem o pedido/.test(conteudo) && /MESMO assunto e o MESMO pedido/.test(conteudo), "agora: o funil é contexto, o assunto e o pedido do rascunho ficam (caso de 17/11)");
  r.ok(/nunca troque o pedido por outro/.test(req.system) && /O assunto e o pedido do rascunho não mudam/.test(req.system), "system e skill: melhorar não troca o pedido");
  r.ok(d.avisoMomento === "Pelo funil, ela respondeu hoje: se for mandar agora, talvez baste agradecer.", "agora: o aviso de momento volta para a página");
  r.ok((conteudo.match(/<\/momento>/g) || []).length === 1 && (conteudo.match(/<rascunho>/g) || []).length === 1, "texto com \"<\" e \">\" não abre nem fecha tag");
  r.ok(/Coordeno 15 analistas/.test(conteudo) && !/Fato do usuário B/.test(conteudo), "prompt: fatos confirmados só do candidato");
  r.ok(d.mecanico === true && d.trechos.length === 1 && d.trechos[0] === "Sinta-se à vontade de questionar", "diagnóstico: só os trechos que existem no rascunho");
  r.ok(d.perguntas.length === 3 && d.mensagens.length === 2 && typeof d.avaliacaoRascunho.nota === "number" && typeof d.avaliacao.nota === "number", "até 3 perguntas, versão humanizada e naturalidade dos dois textos");
  r.ok(!abas.Textos.d.some((l) => l[3] === "whatsapp"), "o diagnóstico não grava texto (só a versão final)");

  // Conferência das mensagens: nova tentativa e falha.
  const valida = (msgs) => ctx.validarMensagensWhatsApp_(msgs, "Gerente de Projetos 15");
  r.ok(!valida(["Oi, tudo bem?"]).ok, "uma mensagem só: recusa (mínimo 2)");
  r.ok(!valida(["a", "b", "c", "d", "e"]).ok, "5 mensagens: recusa (máximo 4)");
  r.ok(!valida(["Bom dia, tudo bem contigo? Queria muito saber como está o processo da vaga, se já tem novidade", "Obrigado!"]).ok, "cumprimento longo na primeira: recusa");
  r.ok(!valida(["Oi!", "Fico no aguardo de um retorno."]).ok && !valida(["Oi!", "Sinta-se à vontade para me chamar."]).ok && !valida(["Prezada, bom dia", "Tudo certo?"]).ok, "frases formais proibidas: recusa");
  r.ok(!valida(["Oi!", "Fico à disposição."]).ok, "frase proibida da segunda cobrança também vale");
  r.ok(!valida(["Oi!", "Veja www.exemplo.com"]).ok, "link: recusa");
  r.ok(!valida(["Oi!", "Coordenei 40 pessoas."]).ok && valida(["Oi!", "Coordeno 15 pessoas."]).ok, "número fora das entradas: recusa; número das entradas passa");
  r.ok(!valida(["Oi!", "x".repeat(301)]).ok, "mensagem acima de 300 caracteres: recusa");

  zerarLimite();
  const antes = chamadasIA.length;
  respostasIA.push(diag({ perguntas: ["Só uma?"] }));
  respostasIA.push(diag());
  const rev = ctx.analisarRascunhoWhatsApp(A, "v:1", rascunho, "revisao");
  const cRev = chamadasIA.at(-1).messages[0].content;
  r.ok(/JÁ ENVIOU/.test(cRev) && !/Último retorno do recrutador/.test(cRev) && !/está com a gestão/.test(cRev), "revisão: o funil fica de fora do prompt");
  r.ok(rev.avisoMomento === "", "revisão: sem aviso de momento");
  r.ok(chamadasIA.length === antes + 2, "diagnóstico com menos de 2 perguntas: nova tentativa");

  // Modo 1, 2ª chamada.
  respostasIA.push({ mensagens: ["Bom dia, tudo bem contigo?", "Vi que o processo está com a gestão. Tem alguma previsão de quando sai a próxima etapa?"] });
  const f = ctx.finalizarRascunhoWhatsApp(A, "v:1", rascunho, ["O que você mais quer saber agora?", "Como foi a última conversa?"], ["se tem previsão", ""], "agora");
  const c2 = chamadasIA.at(-1).messages[0].content;
  r.ok(/Resposta: se tem previsão/.test(c2) && !/Como foi a última conversa/.test(c2), "versão final: só os pares com resposta entram no prompt");
  r.ok(f.mensagens.length === 2 && f.versao === 1, "versão final em mensagens curtas, versão 1");
  const linha = abas.Textos.d.find((l) => l[1] === "usr-A" && l[3] === "whatsapp");
  r.ok(linha && linha[2] === "v:1" && linha[4].split("\n\n").length === 2 && linha[5] === 300, "grava em Textos (tipo whatsapp, mensagens separadas por linha em branco)");

  // Modo 2.
  respostasIA.push({ mensagens: ["Oi Ana, tudo bem?", "Obrigado pelo retorno! Sigo no páreo então."] });
  const q = ctx.escreverWhatsApp(A, "v:1", { etapa: "entrevista_rh", houveRetorno: "sim", ultimoContato: fmt(ha(0)), objetivo: "responder_retorno", nome: "Ana <x>", observacao: "" });
  const c3 = chamadasIA.at(-1).messages[0].content;
  r.ok(/Etapa: Entrevista com RH/.test(c3) && /já deu algum retorno: sim/.test(c3) && /Último contato: hoje \(0 dias atrás\)/.test(c3), "questionário: momento informado pela pessoa");
  r.ok(/responder a um retorno/.test(c3) && /Nome: Ana/.test(c3) && !/<x>/.test(c3), "questionário: objetivo e nome, sem tag injetada");
  r.ok(q.versao === 2 && q.mensagens[0] === "Oi Ana, tudo bem?", "questionário: mensagens e versão 2");
  r.erro(() => ctx.escreverWhatsApp(A, "v:1", { etapa: "entrevista_rh", objetivo: "andamento", ultimoContato: fmt(new Date(Date.now() + 2 * dia)) }), /futuro/, "último contato no futuro: recusa");

  // Falha depois das tentativas.
  respostasIA.push({ mensagens: ["só uma"] });
  respostasIA.push({ mensagens: ["só uma"] });
  r.erro(() => ctx.escreverWhatsApp(A, "v:1", { etapa: "entrevista_rh", objetivo: "andamento" }), /formato esperado/, "duas respostas inválidas: erro claro");

  // Limite diário.
  zerarLimite();
  respostasIA.push({ mensagens: ["Oi!", "Tudo certo por aí?"] });
  ctx.escreverWhatsApp(A, "v:1", { etapa: "entrevista_rh", objetivo: "andamento" });
  const k = [...cache.keys()].find((x) => String(x).startsWith("wpp:usr-A:"));
  cache.set(k, "20");
  r.erro(() => ctx.escreverWhatsApp(A, "v:1", { etapa: "entrevista_rh", objetivo: "andamento" }), /Limite de mensagens de WhatsApp/, "limite diário de 20");

  return r;
};

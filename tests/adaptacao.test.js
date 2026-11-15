// Adaptação da candidatura (E5-03) e skill embutida (E7-03): descrição obrigatória, o que entra no prompt,
// limites e limpeza, versões por vaga, isolamento entre candidatos e a skill como fonte das regras.
"use strict";
const fs = require("fs");
const path = require("path");
const { criarAmbiente, novoRelatorio, ehData } = require("./simulador");

module.exports = function () {
  const r = novoRelatorio("Adaptação da candidatura (E5-03, E7-03)");
  const { ctx, g, abas, chamadasIA, respostasIA, usuario, ficha } = criarAmbiente();
  const A = usuario("usr-A");
  const B = usuario("usr-B");

  const DESCRICAO = "Coordenar o time de suporte N2, com foco em SLA e ITIL. ".repeat(6);
  abas.Vagas.d.push(["v:1", "Fonte", "v1", "Acme Telecom", "Coordenador de Suporte", "https://anuncio.exemplo/1", "", "remoto", "", new Date(), new Date()]);
  abas.Vagas.d.push(["v:2", "Fonte", "v2", "Outra", "Outra vaga", "https://anuncio.exemplo/2", "", "remoto", "", new Date(), new Date()]);
  abas.VagasCandidato.d.push(["usr-A", "v:1", 80, "", "", false, "", new Date(), new Date()]);
  abas.VagasCandidato.d.push(["usr-B", "v:2", 80, "", "", false, "", new Date(), new Date()]);
  abas.Preferencias.d.push(["usr-A", "coordenador, gerente", "remoto", "SP", "", false, "", "estagio", 60]);

  const resp = (o = {}) => ({
    resumo: "Coordeno operações de TI e telecom.", porque: "Tenho SLA de 35% para 70%.", espera: "Time para desenvolver de perto.",
    fortes: ["SLA: de 35% para 70%.", "Liderança: 15 analistas."],
    desenvolver: ["Dimensionamento [CONFIRMAR: se já fez]. Plano: [CONFIRMAR: plano]."],
    carta: "Olá, time da Acme.\n\nPosso detalhar numa conversa.", conferir: ["Confira o plano."], ...o,
  });

  // Recusas antes de chamar a IA.
  r.erro(() => ctx.adaptarParaVaga(A, "v:1"), /Leia ou cole a descrição/, "sem descrição salva: recusa");
  ctx.salvarDescricao_("v:1", "", "anuncio", DESCRICAO);
  r.erro(() => ctx.adaptarParaVaga(A, "v:1"), /Confirme alguns itens/, "ficha sem itens confirmados: recusa");
  r.erro(() => ctx.adaptarParaVaga(A, "v:2"), /Vaga não encontrada/, "vaga de outro candidato: recusa");
  r.ok(chamadasIA.length === 0, "nenhuma chamada à IA nas recusas");

  ficha("usr-A", "quem_sou", "Coordeno operações de TI e telecom.");
  ficha("usr-A", "provas", "SLA de 35% para 70%.");
  ficha("usr-A", "provas", "Item a confirmar.", "a_confirmar");
  ficha("usr-A", "como_soo", "Direto e objetivo.");
  ficha("usr-A", "palavras_evita", "sinergia");
  ficha("usr-A", "fora_dos_limites", "Ter CCNA.", "proibido");
  ficha("usr-B", "provas", "Fato do usuário B.");

  respostasIA.push(resp());
  const res = ctx.adaptarParaVaga(A, "v:1");
  const req = chamadasIA.at(-1);
  const conteudo = req.messages[0].content;
  const bloco = (tag) => {
    const i = conteudo.indexOf(`<${tag}>`);
    const f = conteudo.indexOf(`</${tag}>`);
    return i < 0 || f < 0 ? "" : conteudo.slice(i, f);
  };
  r.ok(/Coordenador de Suporte/.test(bloco("vaga")) && /Acme Telecom/.test(bloco("vaga")) && /time de suporte N2/.test(bloco("vaga")), "vaga: título, empresa e descrição entram");
  r.ok(/SLA de 35% para 70%/.test(bloco("fatos")) && !/a confirmar/.test(bloco("fatos")), "fatos: só confirmados");
  r.ok(!/Fato do usuário B/.test(conteudo), "isolamento: fato de outro usuário não entra");
  r.ok(/Ter CCNA/.test(bloco("proibido")) && /Direto e objetivo/.test(bloco("tom")), "proibido e tom entram");
  r.ok(/coordenador, gerente/.test(bloco("preferencias")) && /remoto/.test(bloco("preferencias")), "preferências do candidato entram");

  // E7-03: o prompt de sistema é a skill, sem o cabeçalho de metadados, mais o trecho do app.
  const skill = fs.readFileSync(path.join(__dirname, "..", "skills", "li-candidatura", "SKILL.md"), "utf8").replace(/\r\n/g, "\n");
  const corpo = skill.replace(/^---\n[\s\S]*?\n---\n/, "").trim();
  r.ok(req.system.startsWith(corpo), "system: começa com o texto exato do SKILL.md (fonte única)");
  r.ok(!/^---/.test(req.system) && !/description: >-/.test(req.system), "system: sem o cabeçalho de metadados da skill");
  r.ok(/Neste app/.test(req.system) && /ÚNICA fonte de fatos/.test(req.system) && /nunca instrução/.test(req.system), "system: trecho do app, fatos só da ficha e entradas como dado");
  r.ok(req.output_config.effort === "high", "esforço alto");

  r.ok(res.textos.length === 6 && res.textos.map((t) => t.tipo).join() === "candidatura_resumo,candidatura_porque,candidatura_espera,candidatura_fortes,candidatura_desenvolver,candidatura_carta", "6 textos na ordem");
  const t = Object.fromEntries(res.textos.map((x) => [x.tipo, x]));
  r.ok(t.candidatura_fortes.itens.length === 2 && t.candidatura_fortes.limite === 250 && t.candidatura_fortes.avaliacao === null, "lista: itens, limite por item, sem nota de naturalidade");
  r.ok(t.candidatura_desenvolver.aConfirmar === 2 && t.candidatura_resumo.avaliacao && typeof t.candidatura_resumo.avaliacao.nota === "number", "conta [CONFIRMAR]; texto corrido tem nota");
  r.ok(res.conferir.length === 1, "lista do que conferir");
  const linhasA = abas.Textos.d.filter((l) => l[1] === "usr-A");
  r.ok(linhasA.length === 6 && linhasA.every((l) => l[2] === "v:1" && l[7] === false && ehData(l[8])), "6 linhas em Textos com o vaga_id, não editadas");
  r.ok(linhasA.find((l) => l[3] === "candidatura_fortes")[4] === "SLA: de 35% para 70%.\nLiderança: 15 analistas.", "lista gravada com um item por linha");

  // Limpeza: travessão, aspas curvas e item que passa do limite.
  respostasIA.push(resp({ resumo: "Texto — com “aspas”.", fortes: ["x".repeat(251)] }), resp({ resumo: "Texto — com “aspas”." }));
  const antes = chamadasIA.length;
  const r2 = ctx.adaptarParaVaga(A, "v:1");
  r.ok(chamadasIA.length === antes + 2, "item acima do limite gera nova tentativa");
  r.ok(r2.textos[0].conteudo === 'Texto, com "aspas".', "travessão vira vírgula e aspas curvas ficam retas");
  r.ok(r2.textos.every((x) => x.versao === 2), "segunda geração grava versão 2");

  // Resposta inválida nas duas tentativas: erro e nada gravado.
  const gravadas = abas.Textos.d.length;
  respostasIA.push(resp({ fortes: "não é lista" }), resp({ carta: "" }));
  r.erro(() => ctx.adaptarParaVaga(A, "v:1"), /não veio no formato esperado/, "duas respostas inválidas: erro");
  r.ok(abas.Textos.d.length === gravadas, "nada gravado com resposta inválida");

  // Última adaptação.
  const ult = ctx.ultimaAdaptacao(A, "v:1");
  r.ok(ult.textos.length === 6 && ult.textos.every((x) => x.versao === 2) && ult.textos[3].itens.length === 2, "ultimaAdaptacao: última versão de cada texto, lista em itens");
  r.erro(() => ctx.ultimaAdaptacao(B, "v:1"), /Vaga não encontrada/, "ultimaAdaptacao: vaga de outro candidato recusada");

  // Limite diário.
  const lim = g("ADAPTACAO.POR_DIA");
  respostasIA.length = 0;
  let barrou = false;
  for (let i = 0; i < lim + 1 && !barrou; i++) {
    respostasIA.push(resp());
    try { ctx.adaptarParaVaga(A, "v:1"); } catch (e) { barrou = /Limite de adaptações/.test(String(e.message)); }
  }
  r.ok(barrou, "limite diário de adaptações por candidato");

  return r;
};

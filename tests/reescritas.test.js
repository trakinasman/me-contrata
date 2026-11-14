// Reescritas do perfil (E4-04): o que entra no prompt, limpeza, limites, versões e isolamento.
"use strict";
const { criarAmbiente, novoRelatorio, ehData } = require("./simulador");

module.exports = function () {
  const r = novoRelatorio("Reescritas do perfil (E4-04)");
  const { ctx, g, abas, chamadasIA, respostasIA, usuario, ficha } = criarAmbiente();
  const RUB = g("RUBRICA_PERFIL.ITENS");
  const resp = (titulo, sobre, cargo, conferir = []) => ({ titulo, sobre, cargo_atual: cargo, conferir });
  ctx.curriculoParaAnalise_ = (u) => (u === "usr-A" || u === "usr-B" ? { id: "cv-" + u, driveId: "x", textoId: "t", linha: 2 } : null);
  ctx.textoDoCurriculo_ = () => "Texto do perfil publicado. Lean Six Sigma Green Belt. ".repeat(10);
  const A = usuario("usr-A");
  const B = usuario("usr-B");

  r.erro(() => ctx.gerarReescritas(A), /Analise primeiro/, "sem análise: recusa");
  ctx.gravarAnalise_("usr-A", "cv-usr-A", RUB.map((i) => ({ item: i.item, nome: i.nome, pontos: i.pontos, nota: Math.min(5, i.pontos), motivo: "motivo " + i.item })));
  r.erro(() => ctx.gerarReescritas(A), /Confirme alguns itens/, "ficha sem itens confirmados: recusa");

  ficha("usr-A", "quem_sou", "Coordeno operações de TI e telecom.");
  ficha("usr-A", "provas", "SLA de 35% para 70%.");
  ficha("usr-A", "provas", "Item ainda a confirmar.", "a_confirmar");
  ficha("usr-A", "provas", "");
  ficha("usr-A", "como_soo", "Direto e objetivo.");
  ficha("usr-A", "palavras_evita", "sinergia, mindset");
  ficha("usr-A", "fora_dos_limites", "Ter CCNA.", "proibido");
  ficha("usr-A", "posicoes", "Posição recusada.", "proibido");
  ficha("usr-B", "provas", "Fato do usuário B.");

  const SOBRE = "Se a sua operação vive apagando incêndio — é aí que eu entro.\n\n\n\nCoordeno “operações”…​ com time.\n- SLA de 35% para 70%.";
  respostasIA.push(resp("Para provedores — SLA de 35% para 70%\nem escolas", SOBRE, "Escopo.\n- Resultado [CONFIRMAR: número].", ["Confira o número do cargo."]));
  let res = ctx.gerarReescritas(A);
  const req = chamadasIA.at(-1);
  const conteudo = req.messages[0].content;
  const bloco = (tag) => {
    const i = conteudo.indexOf(`<${tag}>`);
    const f = conteudo.indexOf(`</${tag}>`);
    return i < 0 || f < 0 ? "" : conteudo.slice(i, f);
  };
  r.ok(/SLA de 35% para 70%/.test(bloco("fatos")) && /Coordeno operações/.test(bloco("fatos")), "fatos: itens confirmados entram");
  r.ok(!/a confirmar/.test(bloco("fatos")) && !/Posição recusada/.test(bloco("fatos")), "fatos: a_confirmar e proibidos ficam de fora");
  r.ok(!/Fato do usuário B/.test(conteudo), "isolamento: fato de outro usuário não entra");
  r.ok(/Direto e objetivo/.test(bloco("tom")) && /sinergia/.test(bloco("tom")), "tom: Como escrevo e Palavras que evito");
  r.ok(/Ter CCNA/.test(bloco("proibido")) && /Posição recusada/.test(bloco("proibido")), "proibido: itens proibidos");
  r.ok(/ÚNICA fonte de fatos/.test(req.system) && /OpenToWork/.test(req.system) && req.output_config.effort === "high", "system: única fonte, sem sinal de busca de emprego, esforço alto");
  r.ok(/Não junte dois fatos/.test(req.system), "system: não juntar fatos nem acrescentar causa");
  const t = Object.fromEntries(res.textos.map((x) => [x.tipo, x]));
  r.ok(t.linkedin_titulo.conteudo === "Para provedores, SLA de 35% para 70% em escolas", "título: travessão vira vírgula, quebra de linha some");
  r.ok(!/[—“”…​ ]/.test(t.linkedin_sobre.conteudo), "Sobre: sem travessão, aspas curvas, reticências unicode, invisíveis ou nbsp");
  r.ok(t.linkedin_sobre.conteudo.includes("entro.\n\nCoordeno") && !/\n{3,}/.test(t.linkedin_sobre.conteudo), "Sobre: mantém parágrafos");
  r.ok(t.linkedin_cargo_atual.aConfirmar === 1, "conta [CONFIRMAR]");
  r.ok(res.textos.every((x) => x.avaliacao && typeof x.avaliacao.nota === "number" && Array.isArray(x.avaliacao.sinais)), "cada texto traz a avaliação de naturalidade (E4-05)");
  r.ok(ctx.ultimasReescritas(A).textos.every((x) => x.avaliacao && x.avaliacao.checagens.length === 5), "ultimasReescritas também avalia");
  r.ok(res.conferir.length === 1 && res.textos.every((x) => x.versao === 1), "devolve o que conferir; versão 1");
  const linhasA = abas.Textos.d.filter((l) => l[1] === "usr-A");
  r.ok(linhasA.length === 3 && linhasA.every((l) => l[2] === "" && l[7] === false && ehData(l[8])), "3 linhas em Textos, sem vaga, não editadas");

  // Limites: Sobre grande demais na 1ª tentativa, certo na 2ª.
  respostasIA.push(resp("Título", "x".repeat(1401), "Cargo"), resp("Título 2", "Sobre curto.", "Cargo 2"));
  res = ctx.gerarReescritas(A);
  r.ok(res.textos[0].conteudo === "Título 2" && res.textos.every((x) => x.versao === 2), "acima do limite: nova tentativa; versão 2");
  r.ok(abas.Log.d.some((l) => l[2] === "reescrita_invalida"), "Log registra a tentativa inválida");

  const antes = abas.Textos.d.length;
  respostasIA.push(resp("x".repeat(221), "Sobre", "Cargo"), resp("Título", "", "Cargo"));
  r.erro(() => ctx.gerarReescritas(A), /formato esperado/, "duas respostas inválidas: erro");
  r.ok(abas.Textos.d.length === antes, "nada gravado com resposta inválida");

  const u = ctx.ultimasReescritas(A);
  r.ok(u.textos.length === 3 && u.textos.every((x) => x.versao === 2) && u.textos[0].tipo === "linkedin_titulo", "ultimasReescritas: versão mais nova, na ordem da tela");
  r.ok(ctx.ultimasReescritas(B).textos.length === 0, "B não vê as reescritas de A");

  // Proibidos nunca são cortados por fatos grandes.
  for (let i = 0; i < 40; i++) ficha("usr-A", "provas", "Prova longa ".repeat(40) + i);
  ficha("usr-A", "fora_dos_limites", "Proibido no fim da aba.", "proibido");
  respostasIA.push(resp("T", "S", "C"));
  ctx.gerarReescritas(A);
  const c2 = chamadasIA.at(-1).messages[0].content;
  r.ok(/Proibido no fim da aba/.test(c2), "proibido no fim da aba entra com a ficha cheia");

  // Limite diário de 5 gerações (4 já passaram pelo contador).
  respostasIA.push(resp("T", "S", "C"));
  ctx.gerarReescritas(A);
  r.erro(() => ctx.gerarReescritas(A), /Limite de reescritas/, "6ª reescrita no dia: limite");

  return r;
};

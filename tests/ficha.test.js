// Ficha do candidato (E2-01): criar, editar, excluir, validar e isolar entre usuários.
"use strict";
const crypto = require("crypto");
const { criarAmbiente, novoRelatorio } = require("./simulador");

module.exports = function () {
  const r = novoRelatorio("Ficha (E2-01)");
  const { ctx, g, abas, usuario } = criarAmbiente();
  const A = usuario("usr-A");
  const B = usuario("usr-B");
  const semTermo = usuario("usr-C", { termo: "" });
  const itens = (f) => f.secoes.flatMap((s) => s.itens);

  let fa = ctx.listarFicha(A);
  r.ok(fa.secoes.length === g("SECOES_FICHA").length && itens(fa).length === 0, "ficha vazia com todas as seções");

  fa = ctx.salvarItemFicha(A, { secao: "provas", texto: "  Reduzi o fechamento em 30%.  ", status: "a_confirmar" });
  const it = itens(fa)[0];
  r.ok(it && it.texto === "Reduzi o fechamento em 30%." && it.status === "a_confirmar" && it.origem === "manual", "cria item (texto aparado, origem manual)");
  fa = ctx.salvarItemFicha(A, { id: it.id, secao: "provas", texto: it.texto, status: "confirmado" });
  r.ok(itens(fa)[0].status === "confirmado", "muda o status");
  fa = ctx.salvarItemFicha(A, { id: it.id, secao: "quem_sou", texto: "Texto novo", status: "proibido" });
  r.ok(itens(fa)[0].texto === "Texto novo" && itens(fa)[0].secao === "quem_sou" && itens(fa)[0].status === "proibido", "edita texto, seção e status");
  r.ok(abas.Fichas.d.length === 2, "edição não cria linha nova");

  // Isolamento.
  r.ok(itens(ctx.listarFicha(B)).length === 0, "B não vê os itens de A");
  r.erro(() => ctx.salvarItemFicha(B, { id: it.id, secao: "provas", texto: "invadido", status: "confirmado" }), /não encontrado/, "B não edita item de A");
  r.erro(() => ctx.excluirItemFicha(B, it.id), /não encontrado/, "B não exclui item de A");
  r.ok(itens(ctx.listarFicha(A))[0].texto === "Texto novo", "item de A continua intacto");

  // Sessão e termo.
  r.erro(() => ctx.listarFicha("x".repeat(64)), /SESSAO_INVALIDA/, "token inválido recusado");
  r.erro(() => ctx.listarFicha(semTermo), /TERMO_PENDENTE/, "sem aceite do termo recusado");

  // Validações.
  r.erro(() => ctx.salvarItemFicha(A, { secao: "xyz", texto: "a", status: "confirmado" }), /Seção inválida/, "seção inválida");
  r.erro(() => ctx.salvarItemFicha(A, { secao: "provas", texto: "a", status: "talvez" }), /Status inválido/, "status inválido");
  r.erro(() => ctx.salvarItemFicha(A, { secao: "provas", texto: "   ", status: "confirmado" }), /Escreva/, "texto vazio");
  r.erro(() => ctx.salvarItemFicha(A, { secao: "provas", texto: "x".repeat(2001), status: "confirmado" }), /2000/, "texto longo demais");
  r.erro(() => ctx.salvarItemFicha(A, null), /Seção inválida/, "dados nulos");
  r.erro(() => ctx.excluirItemFicha(A, "' OR 1=1"), /não encontrado/, "id malformado");

  // Texto que começa com = vira texto, não fórmula.
  fa = ctx.salvarItemFicha(A, { secao: "provas", texto: '=IMPORTXML("http://x","//a")', status: "confirmado" });
  r.ok(abas.Fichas.d.some((l) => String(l[3]).startsWith("=IMPORTXML")), "texto com = gravado como texto");
  const idF = itens(fa).find((i) => i.texto.startsWith("=")).id;
  ctx.salvarItemFicha(A, { id: idF, secao: "provas", texto: "+SOMA(1)", status: "confirmado" });
  r.ok(abas.Fichas.brutos.includes("'+SOMA(1)"), "edição também grava com apóstrofo");

  // Status desconhecido na planilha volta para revisão.
  abas.Fichas.d.push(["usr-A", "provas", crypto.randomUUID(), "à mão", "sim", "manual", ""]);
  r.ok(itens(ctx.listarFicha(A)).find((i) => i.texto === "à mão").status === "a_confirmar", "status estranho vira a_confirmar");

  // Exclusão.
  fa = ctx.excluirItemFicha(A, it.id);
  r.ok(!itens(fa).some((i) => i.id === it.id), "A exclui o próprio item");

  // Limite de itens.
  const D = usuario("usr-D");
  for (let i = 0; i < 300; i++) abas.Fichas.d.push(["usr-D", "provas", crypto.randomUUID(), "i" + i, "confirmado", "manual", ""]);
  r.erro(() => ctx.salvarItemFicha(D, { secao: "provas", texto: "um a mais", status: "confirmado" }), /máximo de 300/, "limite de 300 itens");

  return r;
};

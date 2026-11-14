// Histórico da nota (E4-06): ordem, diferença, o que mudou e isolamento entre usuários.
"use strict";
const { criarAmbiente, novoRelatorio } = require("./simulador");

module.exports = function () {
  const r = novoRelatorio("Histórico da nota (E4-06)");
  const { ctx, g, abas, usuario } = criarAmbiente();
  const RUB = g("RUBRICA_PERFIL.ITENS");
  const A = usuario("usr-A");
  const B = usuario("usr-B");

  r.ok(ctx.historicoNotas(A).entradas.length === 0, "sem análises: histórico vazio");

  /** Grava uma análise com as notas dadas (item -> [nota, origem]); o resto fica não avaliado. */
  const gravar = (id, notas) => ctx.gravarAnalise_(id, "cv-" + id, RUB.map((i) => {
    const [nota, origem] = notas[i.item] ?? [null, undefined];
    return { item: i.item, nome: i.nome, pontos: i.pontos, nota, motivo: "m", origem };
  }));

  // A sequência real do Roberto em 12 e 13/11/2026.
  const pdf = { headline: [9, "pdf"], about_open: [9, "pdf"], about_body: [6, "pdf"], current_role: [8, "pdf"], experience_depth: [6, "pdf"], skills: [3, "pdf"], recommendations: [0, "pdf"], contact: [5, "pdf"] };
  gravar("usr-A", pdf); // 46, parcial até 76
  const prints = { ...pdf, featured: [3, "print"], banner: [6, "print"], photo: [5, "print"], activity: [10, "print"] };
  gravar("usr-A", prints); // 70
  const respostas = { ...prints, banner: [4, "resposta"], photo: [4, "resposta"], activity: [7, "resposta"], recommendations: [6, "print"] };
  gravar("usr-A", respostas); // 70: recomendações +6, banner/foto/atividade -6
  const final = { ...respostas, banner: [6, "print"], photo: [5, "print"], activity: [10, "print"] };
  gravar("usr-A", final); // 76

  gravar("usr-B", { headline: [1, "pdf"] });

  const h = ctx.historicoNotas(A).entradas;
  r.ok(h.length === 4, "4 entradas");
  r.ok(h.map((e) => e.total).join(",") === "76,70,70,46", "mais recente primeiro: 76, 70, 70, 46");
  r.ok(h[3].delta === null && h[3].mudancas.length === 0 && h[3].parcial && h[3].maximo === 76, "primeira: sem diferença, parcial até 76");
  r.ok(h[2].delta === 24 && h[2].mudancas.length === 4 && h[2].mudancas.every((m) => m.de === null && m.origem === "print"), "prints: +24, quatro itens de não avaliado para nota");
  const m1 = Object.fromEntries(h[1].mudancas.map((m) => [m.item, m]));
  r.ok(h[1].delta === 0 && m1.recommendations.de === 0 && m1.recommendations.para === 6 && m1.banner.de === 6 && m1.banner.para === 4 && m1.banner.origem === "resposta",
    "respostas trocando prints: total igual, mas o histórico mostra o que subiu e o que caiu");
  r.ok(h[0].delta === 6 && h[0].mudancas.length === 3 && !h[0].parcial, "prints de novo: +6, três itens, nota completa");
  r.ok(h[0].mudancas.find((m) => m.item === "activity").nome === "Atividade", "mudança traz o nome do item");

  // Isolamento.
  const hb = ctx.historicoNotas(B).entradas;
  r.ok(hb.length === 1 && hb[0].total === 1, "B vê só a própria análise");
  r.erro(() => ctx.historicoNotas("x".repeat(64)), /SESSAO_INVALIDA/, "token inválido recusado");

  // Análise antiga sem origem (antes da E4-03) conta como PDF.
  const C = usuario("usr-C");
  abas.Analises.d.push([ctx.Utilities.getUuid(), "usr-C", "cv", "li-profile@1.0", 5, true,
    JSON.stringify([{ item: "headline", nota: 5, motivo: "m" }]), new Date(Date.now() - 1000)]);
  gravar("usr-C", { headline: [7, null] });
  const hc = ctx.historicoNotas(C).entradas;
  r.ok(hc[0].mudancas[0].origem === "pdf" && hc[0].mudancas[0].de === 5 && hc[0].mudancas[0].para === 7, "item sem origem conta como PDF");

  // Limite de 30 entradas.
  const D = usuario("usr-D");
  for (let i = 0; i < 35; i++) gravar("usr-D", { headline: [i % 12, "pdf"] });
  r.ok(ctx.historicoNotas(D).entradas.length === 30, "no máximo 30 entradas");

  return r;
};

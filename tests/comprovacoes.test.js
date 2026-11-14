// Completar a nota com prints ou respostas (E4-03), recomendações e endossos fora do PDF,
// e resposta que não substitui item avaliado por print.
"use strict";
const { criarAmbiente, novoRelatorio, IMAGENS, ehData } = require("./simulador");

module.exports = function () {
  const r = novoRelatorio("Completar a nota (E4-03)");
  const { ctx, g, abas, drive, chamadasIA, respostasIA, usuario } = criarAmbiente();
  const { JPEG, PNG, PDF } = IMAGENS;
  const RUB = g("RUBRICA_PERFIL.ITENS");
  const NV = g("RUBRICA_PERFIL.NAO_VISIVEIS");
  const it = (item, visivel, nota, motivo = "motivo " + item) => ({ item, visivel, nota, motivo });
  const porItem = (a) => Object.fromEntries(a.itens.map((i) => [i.item, i]));
  /** Análise base: itens visíveis no PDF com as notas dadas, os outros não avaliados. */
  const base = (id, notas) => ctx.gravarAnalise_(id, "cv-" + id, RUB.map((i) => ({
    item: i.item, nome: i.nome, pontos: i.pontos,
    nota: NV.includes(i.item) ? null : notas[i.item], motivo: "pdf", origem: NV.includes(i.item) ? undefined : "pdf",
  })));

  const A = usuario("usr-A");
  const B = usuario("usr-B");
  r.ok(NV.includes("recommendations"), "recomendações estão entre os itens que o PDF não mostra");
  r.erro(() => ctx.completarNotaPerfil(A, { respostas: { photo: "sim" } }), /Analise primeiro/, "sem análise do PDF: recusa");

  const notasPdf = { headline: 6, about_open: 5, about_body: 5, current_role: 8, experience_depth: 6, skills: 4, contact: 6 };
  base("usr-A", notasPdf);
  r.ok(ctx.ultimaAnalise(A).total === 40, "análise base: 40");

  // Recusas antes de gastar IA.
  r.erro(() => ctx.completarNotaPerfil(A, {}), /Envie um print ou responda/, "nada enviado");
  r.erro(() => ctx.completarNotaPerfil(A, { prints: [{ tipo: "topo", base64: PDF }] }), /JPG ou PNG/, "PDF disfarçado de imagem");
  r.erro(() => ctx.completarNotaPerfil(A, { prints: [{ tipo: "topo", base64: JPEG }, { tipo: "topo", base64: JPEG }] }), /Print inválido/, "tipo repetido");
  const seis = ["topo", "destaques", "atividade", "recomendacoes", "competencias", "topo"].map((t) => ({ tipo: t, base64: JPEG }));
  r.erro(() => ctx.completarNotaPerfil(A, { prints: seis }), /no máximo/, "6 prints");
  r.ok(chamadasIA.length === 0, "recusas não chamam a IA");

  // Print do topo (banner não visível) + respostas.
  respostasIA.push({ itens: [it("photo", true, 5), it("banner", false, 0)] });
  let a = ctx.completarNotaPerfil(A, { prints: [{ tipo: "topo", base64: PNG }], respostas: { banner: "em_parte", activity: "sim", featured: "talvez" } });
  let p = porItem(a);
  r.ok(p.photo.nota === 5 && p.photo.origem === "print", "foto pelo print: 5");
  r.ok(p.banner.nota === 2 && p.banner.origem === "resposta", "banner não visível cai na resposta 'em parte' (35% de 6)");
  r.ok(p.activity.nota === 7 && p.activity.origem === "resposta", "atividade declarada 'sim' (70% de 10)");
  r.ok(p.featured.nota === null, "resposta inválida ignorada");
  r.ok(a.total === 40 + 5 + 2 + 7 && a.parcial, `total ${a.total}, parcial`);
  const imgs = chamadasIA.at(-1).messages[0].content.filter((b) => b.type === "image");
  r.ok(imgs.length === 1 && imgs[0].source.media_type === "image/png", "IA recebe a imagem com o tipo lido dos bytes");
  r.ok(abas.Comprovacoes.d.length === 2 && drive.size === 1, "print guardado em Comprovacoes e no Drive");

  // Isolamento.
  r.erro(() => ctx.completarNotaPerfil(B, { respostas: { photo: "sim" } }), /Analise primeiro/, "B não usa a análise de A");
  r.ok(ctx.ultimaAnalise(B) === null, "B não vê a análise de A");

  // Nova análise do PDF mantém print e respostas; recomendações saem "não avaliado".
  ctx.curriculoParaAnalise_ = () => ({ id: "cv-2", driveId: "x", textoId: "t", linha: 2 });
  ctx.textoDoCurriculo_ = () => "texto do perfil ".repeat(50);
  respostasIA.push({ itens: RUB.map((i) => ({ item: i.item, avaliado: !NV.includes(i.item), nota: NV.includes(i.item) ? 0 : 3, motivo: "novo" })) });
  a = ctx.analisarPerfil(A);
  p = porItem(a);
  r.ok(p.photo.nota === 5 && p.photo.origem === "print" && p.banner.origem === "resposta" && p.activity.nota === 7, "nova análise do PDF mantém print e respostas");
  r.ok(p.headline.nota === 3 && p.headline.origem === "pdf" && p.recommendations.nota === null, "itens do PDF atualizados; recomendações não avaliadas");
  r.ok(/endossos/.test(chamadasIA.at(-1).system), "prompt do PDF não tira pontos por endosso invisível");

  // Prints de recomendações e de competências.
  respostasIA.push({ itens: [it("recommendations", true, 6), it("skills", true, 5)] });
  a = ctx.completarNotaPerfil(A, { prints: [{ tipo: "recomendacoes", base64: JPEG }, { tipo: "competencias", base64: PNG }] });
  p = porItem(a);
  r.ok(p.recommendations.nota === 6 && p.skills.nota === 5 && p.skills.origem === "print", "prints de recomendações e competências avaliados");
  r.ok(JSON.stringify(chamadasIA.at(-1).output_config.format.schema).includes('"enum":["recommendations","skills"]'), "IA avalia só os itens dos prints enviados");

  // Resposta nunca substitui item avaliado por print (caso real de 13/11).
  const E = usuario("usr-E");
  ctx.gravarAnalise_("usr-E", "cv-e", RUB.map((i) => {
    const print = { featured: 3, banner: 6, photo: 5, activity: 10 };
    if (i.item in print) return { item: i.item, nome: i.nome, pontos: i.pontos, nota: print[i.item], motivo: "print", origem: "print" };
    if (i.item === "recommendations") return { item: i.item, nome: i.nome, pontos: i.pontos, nota: 0, motivo: "pdf antigo" };
    const pdf = { headline: 9, about_open: 9, about_body: 6, current_role: 8, experience_depth: 6, skills: 3, contact: 5 };
    return { item: i.item, nome: i.nome, pontos: i.pontos, nota: pdf[i.item], motivo: "pdf", origem: "pdf" };
  }));
  r.ok(ctx.ultimaAnalise(E).total === 70, "base igual à do teste real: 70");
  respostasIA.push({ itens: [it("recommendations", true, 6), it("skills", true, 3)] });
  const e1 = ctx.completarNotaPerfil(E, {
    prints: [{ tipo: "recomendacoes", base64: JPEG }, { tipo: "competencias", base64: JPEG }],
    respostas: { banner: "sim", photo: "sim", activity: "sim", recommendations: "sim" },
  });
  const pe = porItem(e1);
  r.ok(pe.banner.nota === 6 && pe.photo.nota === 5 && pe.activity.nota === 10, "respostas não substituem itens avaliados por print");
  r.ok(e1.total === 76, `total certo: 76 (veio ${e1.total})`);

  // Limpeza de 30 dias.
  const cab = abas.Comprovacoes.d[0];
  const ci = (n) => cab.indexOf(n);
  const linha = abas.Comprovacoes.d[1];
  const id = linha[ci("drive_file_id")];
  linha[ci("criado_em")] = new Date(Date.now() - 31 * 24 * 3600e3);
  ctx.limparComprovacoesVencidas();
  r.ok(!drive.has(id) && linha[ci("drive_file_id")] === "" && ehData(linha[ci("apagado_em")]), "print de 31 dias apagado e marcado");
  r.ok(porItem(ctx.ultimaAnalise(A)).photo.nota === 5, "a nota fica depois da limpeza");
  ctx.__usuarioAtivo = "outro@teste.local";
  r.erro(() => ctx.limparComprovacoesVencidas(), /Acesso negado/, "limpeza recusada para quem não é o dono");
  ctx.__usuarioAtivo = undefined;

  return r;
};

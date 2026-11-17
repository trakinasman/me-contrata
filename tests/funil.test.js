// Funil (Etapa 6): mudar de etapa com data real, recusado/desisti guardam onde parou, mensagens ao recrutador e cobrança,
// alerta de parado, números do funil (com "poucos dados") e isolamento entre usuários.
"use strict";
const { criarAmbiente, novoRelatorio, ehData } = require("./simulador");

module.exports = function () {
  const r = novoRelatorio("Funil (Etapa 6)");
  const { ctx, g, abas, usuario } = criarAmbiente();
  const A = usuario("usr-A");
  const B = usuario("usr-B");
  const dia = 24 * 3600e3;
  const ha = (n) => new Date(Date.now() - n * dia);
  const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const iso = (n) => fmt(ha(n));
  const amanha = fmt(new Date(Date.now() + dia));

  const anuncio = (id, titulo, fonte = "Gupy") => abas.Vagas.d.push([id, fonte, id, "Empresa " + id, titulo, `https://x.gupy.io/${id}`, "SC", "remoto", "", ha(5), new Date()]);
  const estado = (u, id) => abas.VagasCandidato.d.push([u, id, 80, "", "", false, "", ha(9), new Date()]);
  const noFunil = (u, id, status = "inserida") => abas.Candidaturas.d.push([u, id, status, "", "", "", "", "", ha(9)]);
  const evento = (u, id, tipo, dias, detalhe = "") => abas.Eventos.d.push(["ev" + Math.random(), u, id, tipo, detalhe, ha(dias)]);
  const cand = (u, id) => abas.Candidaturas.d.find((l) => l[0] === u && l[1] === id);
  const eventos = (u, id) => abas.Eventos.d.filter((l) => l[1] === u && l[2] === id);

  anuncio("v1", "Líder de NOC"); anuncio("v2", "Coordenador"); anuncio("v3", "Gerente", "Catho"); anuncio("v4", "Vaga do B"); anuncio("v5", "Descartada");
  for (const id of ["v1", "v2", "v3", "v5"]) estado("usr-A", id);
  estado("usr-B", "v4");
  noFunil("usr-A", "v1"); noFunil("usr-A", "v2"); noFunil("usr-A", "v3"); noFunil("usr-A", "v5"); noFunil("usr-B", "v4");
  abas.VagasCandidato.d.find((l) => l[0] === "usr-A" && l[1] === "v5")[5] = true;
  for (const id of ["v1", "v2", "v3", "v5"]) evento("usr-A", id, "inserida", 9);
  evento("usr-B", "v4", "inserida", 9);

  // Estado inicial.
  let f = ctx.funilDoCandidato(A);
  r.ok(f.candidaturas.length === 3 && !f.candidaturas.some((c) => c.vagaId === "v5"), "lista só as vagas do funil, sem a descartada");
  r.ok(!f.candidaturas.some((c) => c.vagaId === "v4"), "isolamento: não mostra a vaga de B");
  r.ok(f.candidaturas.every((c) => c.status === "inserida" && c.diasParado === 9 && !c.alerta), "inserida há 9 dias não gera alerta (alerta só do currículo enviado em diante)");
  r.ok(f.etapas.length === 9 && f.diasAlerta === 7, "etapas e limite do alerta");

  // Mudança de etapa.
  r.erro(() => ctx.mudarEtapa(A, "v4", "curriculo_enviado", {}), /não está no seu funil/, "vaga de outro usuário: recusa");
  r.erro(() => ctx.mudarEtapa(A, "v1", "voando", {}), /Etapa inválida/, "etapa inválida");
  r.erro(() => ctx.mudarEtapa(A, "v1", "inserida", {}), /já está nesta etapa/, "mesma etapa");
  r.erro(() => ctx.mudarEtapa(A, "v1", "curriculo_enviado", { data: amanha }), /no futuro/, "data no futuro");
  r.erro(() => ctx.mudarEtapa(A, "v1", "curriculo_enviado", { data: "2026-02-31" }), /Data inválida/, "data inexistente");
  r.erro(() => ctx.mudarEtapa(A, "v1", "curriculo_enviado", { data: iso(1), canal: "Pombo" }), /Canal inválido/, "canal fora da lista");
  r.erro(() => ctx.mudarEtapa(A, "v1", "curriculo_enviado", { data: iso(1), cvUsado: "cv-de-outra-vaga" }), /Currículo não encontrado/, "currículo que não é da vaga");
  r.ok(cand("usr-A", "v1")[2] === "inserida" && eventos("usr-A", "v1").length === 1, "erros não gravam nada");

  abas.Curriculos.d.push(["cv1", "usr-A", "adaptado", "drive1", "v1", 2, ha(3), ""]);
  abas.Curriculos.d.push(["cv9", "usr-B", "adaptado", "drive9", "v1", 1, ha(3), ""]);
  f = ctx.mudarEtapa(A, "v1", "curriculo_enviado", { data: iso(8), canal: "Gupy", cvUsado: "cv1", detalhe: "  pelo   portal " });
  const l1 = cand("usr-A", "v1");
  r.ok(l1[2] === "curriculo_enviado" && l1[3] === "Gupy" && l1[4] === "cv1", "grava status, canal e currículo usado");
  r.ok(ehData(l1[5]) && Math.round((Date.now() - l1[5].getTime()) / dia) === 8, "enviado_em com a data informada");
  const e1 = eventos("usr-A", "v1").at(-1);
  r.ok(e1[3] === "curriculo_enviado" && e1[4] === "pelo portal" && Math.round((Date.now() - e1[5].getTime()) / dia) === 8, "evento com data real e detalhe limpo");
  const c1 = f.candidaturas.find((c) => c.vagaId === "v1");
  r.ok(c1.curriculos.length === 1 && c1.curriculos[0].id === "cv1", "só os currículos do próprio usuário para a vaga");
  r.ok(c1.alerta && /há 8 dias/.test(c1.motivoAlerta) && f.candidaturas[0].vagaId === "v1", "currículo enviado há 8 dias: alerta, no topo da lista");

  // Mensagens e cobrança.
  r.erro(() => ctx.registrarMensagemEnviada(A, "v1", "grito", ""), /Tipo de mensagem inválido/, "tipo de mensagem inválido");
  f = ctx.registrarMensagemEnviada(A, "v1", "primeira", iso(0));
  const prox = cand("usr-A", "v1")[6];
  r.ok(ehData(prox) && Math.round((prox.getTime() - Date.now()) / dia) === 4, "primeira mensagem: cobrança em 4 dias");
  r.ok(eventos("usr-A", "v1").at(-1)[3] === "mensagem_primeira", "mensagem vira evento");
  r.ok(!f.candidaturas.find((c) => c.vagaId === "v1").alerta, "mensagem de hoje zera o tempo parado: sem alerta");
  ctx.registrarMensagemEnviada(A, "v1", "cobranca1", iso(0));
  r.ok(Math.round((cand("usr-A", "v1")[6].getTime() - Date.now()) / dia) === 6, "primeira cobrança: próxima em 6 dias (10 depois da primeira)");
  ctx.registrarMensagemEnviada(A, "v1", "cobranca2", iso(0));
  r.ok(cand("usr-A", "v1")[6] === "", "depois da segunda cobrança não há próxima");
  r.erro(() => ctx.definirProximaCobranca(A, "v1", iso(3)), /passado/, "cobrança no passado");
  ctx.definirProximaCobranca(A, "v1", amanha);
  r.ok(ehData(cand("usr-A", "v1")[6]), "define a data da cobrança");
  ctx.definirProximaCobranca(A, "v1", "");
  r.ok(cand("usr-A", "v1")[6] === "", "limpa a data da cobrança");

  // Cobrança vencida gera alerta mesmo com pouco tempo parado.
  anuncio("v6", "Cobrar"); estado("usr-A", "v6"); noFunil("usr-A", "v6");
  ctx.mudarEtapa(A, "v6", "curriculo_enviado", { data: iso(1) });
  cand("usr-A", "v6")[6] = ha(0);
  f = ctx.funilDoCandidato(A);
  r.ok(/Cobrança prevista/.test(f.candidaturas.find((c) => c.vagaId === "v6").motivoAlerta), "cobrança prevista para hoje gera alerta");

  // Recusado e desisti guardam onde parou e limpam a cobrança.
  ctx.mudarEtapa(A, "v2", "curriculo_enviado", { data: iso(6) });
  ctx.mudarEtapa(A, "v2", "entrevista_rh", { data: iso(3) });
  f = ctx.mudarEtapa(A, "v2", "recusado", { data: iso(1), detalhe: "perfil sênior demais" });
  const er = eventos("usr-A", "v2").at(-1);
  r.ok(er[3] === "recusado" && er[4] === "parou_em=entrevista_rh | perfil sênior demais", "recusado guarda a etapa onde parou e o motivo");
  r.ok(cand("usr-A", "v2")[6] === "" && !f.candidaturas.find((c) => c.vagaId === "v2").alerta, "recusado: sem cobrança e sem alerta");
  ctx.mudarEtapa(A, "v3", "desisti", {});
  r.ok(eventos("usr-A", "v3").at(-1)[4] === "parou_em=inserida", "desisti na primeira etapa guarda a etapa inserida");
  r.ok(ctx.funilDoCandidato(A).candidaturas.some((c) => c.vagaId === "v2" && c.status === "recusado"), "recusada continua na lista, na etapa Recusado");

  // Números (função pura): poucos dados e contas.
  const vaga = (id, fonte, status, passos) => ({ vagaId: id, fonte, status, eventos: passos.map(([tipo, n, det]) => ({ tipo, detalhe: det || "", em: ha(n) })) });
  const vagas = [
    vaga("a", "Gupy", "entrevista_rh", [["inserida", 20], ["curriculo_enviado", 18], ["entrevista_rh", 8]]),
    vaga("b", "Gupy", "recusado", [["inserida", 20], ["curriculo_enviado", 16], ["recusado", 10, "parou_em=curriculo_enviado"]]),
    vaga("c", "Gupy", "curriculo_enviado", [["inserida", 20], ["curriculo_enviado", 14]]),
    vaga("d", "Catho", "desisti", [["inserida", 20], ["curriculo_enviado", 12], ["entrevista_ia", 6], ["desisti", 5, "parou_em=entrevista_ia"]]),
    vaga("e", "Catho", "inserida", [["inserida", 3]]),
  ];
  const n = ctx.numerosFunil_(vagas);
  const et = (id) => n.etapas.find((x) => x.etapa === id);
  r.ok(n.total === 5 && n.ativas === 3, "total e ativas (fora recusado e desisti)");
  r.ok(et("inserida").chegaram === 5 && et("curriculo_enviado").chegaram === 4 && et("curriculo_enviado").taxa === 80, "chegaram a cada etapa e taxa sobre a anterior (4 de 5 = 80%)");
  r.ok(et("entrevista_ia").chegaram === 2 && et("entrevista_ia").taxa === 50, "entrevista com IA: 2 de 4 enviados = 50%");
  r.ok(et("entrevista_rh").chegaram === 1 && et("entrevista_rh").taxa === 50 && et("entrevista_rh").poucosDados, "poucos dados quando a base da conta tem menos de 3 casos");
  r.ok(!et("curriculo_enviado").poucosDados, "base de 5 casos não é poucos dados");
  const tIn = n.tempos.find((x) => x.etapa === "inserida");
  r.ok(tIn && tIn.casos === 4 && tIn.dias === 5, "tempo da inserida ao envio: 2, 4, 6 e 8 dias, média 5 (o caso E não tem próxima etapa)");
  const tCv = n.tempos.find((x) => x.etapa === "curriculo_enviado");
  r.ok(tCv && tCv.casos === 2, "tempo do envio à etapa seguinte só com quem avançou (A e D)");
  r.ok(n.paradas.length === 2 && n.paradas.find((x) => x.etapa === "curriculo_enviado").recusadas === 1 && n.paradas.find((x) => x.etapa === "entrevista_ia").desistencias === 1, "onde recusas e desistências aconteceram");
  const gupy = n.origens.find((x) => x.fonte === "Gupy");
  const catho = n.origens.find((x) => x.fonte === "Catho");
  r.ok(gupy.enviadas === 3 && gupy.avancaram === 1 && !gupy.poucosDados && catho.enviadas === 1 && catho.avancaram === 1 && catho.poucosDados, "de onde vêm as vagas que avançam (Catho marcada como poucos dados)");
  const vazio = ctx.numerosFunil_([]);
  r.ok(vazio.total === 0 && vazio.etapas.every((x) => x.chegaram === 0 && x.taxa === null), "funil vazio: zeros, sem dividir por zero");

  // Correções dos testes no ar (17/11/2026).
  // 13: o convite não apaga a cobrança já calculada; a segunda cobrança apaga.
  anuncio("v7", "Convite"); estado("usr-A", "v7"); noFunil("usr-A", "v7");
  ctx.mudarEtapa(A, "v7", "curriculo_enviado", { data: iso(1) });
  ctx.registrarMensagemEnviada(A, "v7", "primeira", iso(1));
  const antes = cand("usr-A", "v7")[6];
  ctx.registrarMensagemEnviada(A, "v7", "convite", iso(1));
  r.ok(ehData(antes) && cand("usr-A", "v7")[6] === antes, "convite registrado depois da primeira não apaga a próxima cobrança");
  ctx.registrarMensagemEnviada(A, "v7", "cobranca2", iso(0));
  r.ok(cand("usr-A", "v7")[6] === "", "segunda cobrança continua encerrando a cobrança");

  // 14: o alerta mostra "hoje", "ontem" ou dd/mm/aaaa, nunca a data ISO.
  cand("usr-A", "v6")[6] = ha(0);
  f = ctx.funilDoCandidato(A);
  r.ok(f.candidaturas.find((c) => c.vagaId === "v6").motivoAlerta === "Cobrança prevista para hoje", "alerta de cobrança de hoje diz \"hoje\"");
  cand("usr-A", "v6")[6] = ha(1);
  r.ok(ctx.funilDoCandidato(A).candidaturas.find((c) => c.vagaId === "v6").motivoAlerta === "Cobrança prevista para ontem", "cobrança de ontem diz \"ontem\"");
  const d3 = ha(3);
  const esperado = `${String(d3.getDate()).padStart(2, "0")}/${String(d3.getMonth() + 1).padStart(2, "0")}/${d3.getFullYear()}`;
  cand("usr-A", "v6")[6] = d3;
  const motivo = ctx.funilDoCandidato(A).candidaturas.find((c) => c.vagaId === "v6").motivoAlerta;
  r.ok(motivo === "Cobrança prevista para " + esperado && !/T\d\d:/.test(motivo), "cobrança mais antiga: dd/mm/aaaa, sem formato ISO");
  cand("usr-A", "v6")[6] = "";

  // 16: entrar no funil depois de já ter enviado o currículo não zera o tempo parado.
  anuncio("v8", "Tardia"); estado("usr-A", "v8"); noFunil("usr-A", "v8");
  evento("usr-A", "v8", "inserida", 0);
  f = ctx.mudarEtapa(A, "v8", "curriculo_enviado", { data: iso(8) });
  const c8 = f.candidaturas.find((c) => c.vagaId === "v8");
  r.ok(c8.diasParado === 8 && c8.alerta && /há 8 dias/.test(c8.motivoAlerta), "currículo enviado há 8 dias e inserida hoje: alerta de 8 dias");

  // 11: tempo médio em dias de calendário (mesmo dia = 0, mesmo com horas diferentes).
  const madrugada = new Date(); madrugada.setHours(0, 43, 0, 0);
  const meioDia = new Date(); meioDia.setHours(12, 0, 0, 0);
  const nCal = ctx.numerosFunil_([{ vagaId: "x", fonte: "Gupy", status: "curriculo_enviado", eventos: [
    { tipo: "inserida", detalhe: "", em: madrugada }, { tipo: "curriculo_enviado", detalhe: "", em: meioDia }] }]);
  r.ok(nCal.tempos[0].dias === 0, "inserida 00:43 e envio 12:00 do mesmo dia: 0 dia, não 0,5");

  // Retorno do recrutador (caso real de 17/11/2026: "está com a gestão, te aviso").
  anuncio("v9", "Retorno"); estado("usr-A", "v9"); noFunil("usr-A", "v9");
  ctx.mudarEtapa(A, "v9", "entrevista_gestor", { data: iso(10) });
  r.ok(ctx.funilDoCandidato(A).candidaturas.find((c) => c.vagaId === "v9").alerta, "entrevista há 10 dias sem novidade: alerta");
  r.erro(() => ctx.registrarRetornoRecrutador(A, "v9", amanha, ""), /no futuro/, "retorno com data no futuro: recusa");
  r.erro(() => ctx.registrarRetornoRecrutador(B, "v9", iso(0), ""), /não está no seu funil/, "B não registra retorno na vaga de A");
  f = ctx.registrarRetornoRecrutador(A, "v9", iso(0), "  está com a   gestão, avisa quando tiver novidade ");
  const ev9 = eventos("usr-A", "v9").at(-1);
  r.ok(ev9[3] === "retorno_recrutador" && ev9[4] === "está com a gestão, avisa quando tiver novidade", "retorno vira evento, com o resumo limpo");
  const c9 = f.candidaturas.find((c) => c.vagaId === "v9");
  r.ok(c9.diasParado === 0 && !c9.alerta && c9.status === "entrevista_gestor", "retorno zera o tempo parado, tira o alerta e não muda a etapa");
  const p9 = cand("usr-A", "v9")[6];
  r.ok(ehData(p9) && Math.round((p9.getTime() - Date.now()) / dia) === 7, "próxima cobrança 7 dias depois do retorno");
  ctx.mudarEtapa(A, "v9", "recusado", {});
  r.erro(() => ctx.registrarRetornoRecrutador(A, "v9", iso(0), ""), /encerrada/, "vaga encerrada não recebe retorno");
  r.ok(g("LISTAS").tipo_evento.includes("retorno_recrutador"), "tipo de evento novo na lista (validação da planilha via setupAmbiente)");

  // Isolamento nas ações.
  r.erro(() => ctx.registrarMensagemEnviada(B, "v1", "primeira", ""), /não está no seu funil/, "B não registra mensagem na vaga de A");
  r.erro(() => ctx.definirProximaCobranca(B, "v1", amanha), /não está no seu funil/, "B não define cobrança na vaga de A");
  r.ok(cand("usr-B", "v4")[2] === "inserida" && ctx.funilDoCandidato(B).candidaturas.length === 1, "o funil de B só tem a vaga de B");
  return r;
};

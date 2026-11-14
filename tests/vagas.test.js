// Lista de vagas (E5-01): vigentes e antigas, filtros de UF, descarte com motivo, funil e isolamento.
"use strict";
const { criarAmbiente, novoRelatorio } = require("./simulador");

module.exports = function () {
  const r = novoRelatorio("Vagas (E5-01)");
  const { ctx, abas, usuario } = criarAmbiente();
  const A = usuario("usr-A");
  const B = usuario("usr-B");
  const dia = 24 * 3600e3;
  const ha = (dias) => new Date(Date.now() - dias * dia);

  r.ok(ctx.listarVagas(A).vagas.length === 0, "sem vagas: lista vazia");

  // Catálogo (anúncio) e estado de cada candidato, no formato que o agente grava.
  const anuncio = (id, titulo, local, modalidade, link = `https://x.gupy.io/job/${id}`) =>
    abas.Vagas.d.push([id, "Gupy", id.split(":")[1], "Empresa " + id, titulo, link, local, modalidade, "2026-11-01T10:00:00.000Z", ha(5), new Date()]);
  const estado = (u, id, nota, selecionada, criada, motivos = "nível de liderança; área: noc; remoto") =>
    abas.VagasCandidato.d.push([u, id, nota, motivos, "", false, "", criada, selecionada]);

  anuncio("gupy:1", "Líder de NOC", "Florianópolis/SC", "hibrido");
  anuncio("gupy:2", "Coordenador de Suporte", "Porto Alegre - RS", "presencial");
  anuncio("gupy:3", "Gerente de Operações", "BR", "remoto");
  anuncio("gupy:4", "Especialista de Redes", "SC", "remoto", "http://inseguro.com/vaga");
  anuncio("gupy:5", "Vaga de B", "", "remoto");
  estado("usr-A", "gupy:1", 90, new Date(), new Date());
  estado("usr-A", "gupy:2", 95, ha(10), ha(10));             // agente parou de trazer há 10 dias
  estado("usr-A", "gupy:3", 70, ha(2), ha(5));
  estado("usr-A", "gupy:4", 60, "", "11/11/2026");          // linha antiga, sem selecionada_em
  estado("usr-A", "gupy:9", 99, new Date(), new Date());    // sem anúncio no catálogo
  estado("usr-B", "gupy:5", 80, new Date(), new Date());

  let l = ctx.listarVagas(A);
  const por = (lista) => Object.fromEntries(lista.vagas.map((v) => [v.vagaId, v]));
  let v = por(l);
  r.ok(l.vagas.length === 4 && !v["gupy:9"], "4 vagas; a que não tem anúncio no catálogo fica de fora");
  r.ok(l.vagas.map((x) => x.vagaId).join(",") === "gupy:1,gupy:3,gupy:2,gupy:4", "vigentes primeiro, por nota; depois as antigas, por nota");
  r.ok(v["gupy:1"].vigente && v["gupy:3"].vigente && !v["gupy:2"].vigente && !v["gupy:4"].vigente, "vigente: selecionada nos últimos 7 dias");
  r.ok(v["gupy:1"].nova && !v["gupy:3"].nova, "nova: linha criada nos últimos 3 dias");
  r.ok(v["gupy:1"].uf === "SC" && v["gupy:2"].uf === "RS" && v["gupy:3"].uf === "" && v["gupy:4"].uf === "SC", "UF de \"Cidade/UF\", \"Cidade - UF\" e sigla; \"BR\" fica sem UF");
  r.ok(v["gupy:4"].link === "" && v["gupy:1"].link.startsWith("https://"), "link só https");
  r.ok(v["gupy:1"].motivos.length === 3 && v["gupy:1"].motivos[1] === "área: noc", "motivos separados");
  r.ok(v["gupy:1"].empresa === "Empresa gupy:1" && v["gupy:1"].titulo === "Líder de NOC", "dados do anúncio vêm do catálogo");
  r.ok(l.descartadas === 0 && l.diasVigente === 7, "metadados da lista");
  r.ok(l.motivosDescarte.join(" | ") === "Salário ou forma de contratação (CLT/PJ) | Local ou modalidade | Requisitos ou nível da vaga | Empresa | Outro", "4 motivos agrupados e Outro");

  // Isolamento.
  const lb = ctx.listarVagas(B);
  r.ok(lb.vagas.length === 1 && lb.vagas[0].vagaId === "gupy:5", "B vê só a vaga dele");
  r.erro(() => ctx.descartarVaga(A, "gupy:5", "Outro", "teste"), /não encontrada/, "A não descarta vaga de B");
  r.erro(() => ctx.moverParaFunil(A, "gupy:5"), /não encontrada/, "A não move vaga de B para o funil");
  r.erro(() => ctx.listarVagas("x".repeat(64)), /SESSAO_INVALIDA/, "token inválido recusado");

  // Descarte.
  r.erro(() => ctx.descartarVaga(A, "gupy:3", "", ""), /Escolha o motivo/, "descarte sem motivo");
  r.erro(() => ctx.descartarVaga(A, "gupy:3", "porque sim", ""), /Escolha o motivo/, "motivo fora da lista");
  r.erro(() => ctx.descartarVaga(A, "gupy:3", "Outro", "   "), /Escreva o motivo/, "Outro sem detalhe");
  l = ctx.descartarVaga(A, "gupy:3", "Outro", "=IMPORTXML(\"http://x\",\"//a\")");
  const linha = abas.VagasCandidato.d.find((x) => x[0] === "usr-A" && x[1] === "gupy:3");
  r.ok(linha[5] === true && linha[6] === "Outro: =IMPORTXML(\"http://x\",\"//a\")", "descartada com o motivo e o detalhe");
  r.ok(abas.VagasCandidato.brutos.includes("Outro: =IMPORTXML(\"http://x\",\"//a\")"), "o texto gravado começa por \"Outro:\", então nunca vira fórmula");
  r.ok(!por(l)["gupy:3"] && l.descartadas === 1, "descartada some da lista e entra na contagem");
  r.erro(() => ctx.descartarVaga(A, "gupy:3", "Outro", "de novo"), /já foi descartada/, "não descarta duas vezes");
  r.ok(abas.Log.d.some((x) => x[2] === "vaga_descartada" && /gupy:3: Outro/.test(x[3])), "Log registra o descarte");
  ctx.descartarVaga(A, "gupy:2", "Local ou modalidade", "");
  r.ok(abas.VagasCandidato.d.find((x) => x[1] === "gupy:2")[6] === "Local ou modalidade", "motivo sem detalhe");

  // Funil.
  r.erro(() => ctx.moverParaFunil(A, "gupy:3"), /descartada/, "vaga descartada não vai para o funil");
  ctx.moverParaFunil(A, "gupy:1");
  ctx.moverParaFunil(A, "gupy:1");
  const cand = abas.Candidaturas.d.filter((x) => x[0] === "usr-A");
  r.ok(cand.length === 1 && cand[0][1] === "gupy:1" && cand[0][2] === "nao_enviado", "mover cria uma candidatura não enviada, sem duplicar");
  r.ok(por(ctx.listarVagas(A))["gupy:1"].noFunil && !por(ctx.listarVagas(A))["gupy:4"].noFunil, "lista marca a vaga que está no funil");
  r.ok(!ctx.listarVagas(B).vagas[0].noFunil, "a candidatura de A não aparece para B");
  r.erro(() => ctx.moverParaFunil(A, ""), /não encontrada/, "vaga vazia recusada");

  return r;
};

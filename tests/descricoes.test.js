// Descrição da vaga (E5-02): leitura do anúncio (Gupy e JSON-LD), falhas que pedem para colar,
// texto colado, prioridade da colada, isolamento e limites. Páginas sintéticas no formato de cada fonte.
"use strict";
const { criarAmbiente, novoRelatorio } = require("./simulador");

const GUPY = (job) => `<html><head><script id="__NEXT_DATA__" type="application/json">${JSON.stringify({ props: { pageProps: { job } } })}</script></head><body><nav>Menu</nav></body></html>`;
const JSON_LD = (obj) => `<html><script type="application/ld+json">${JSON.stringify(obj)}</script><body>Página</body></html>`;
const LONGO = "Liderar o time de NOC com foco em disponibilidade, SLA e melhoria contínua dos processos de monitoração. ".repeat(3);

module.exports = function () {
  const r = novoRelatorio("Descrição da vaga (E5-02)");
  const { ctx, abas, paginas, buscas, usuario } = criarAmbiente();
  const A = usuario("usr-A");
  const B = usuario("usr-B");

  const anuncio = (id, link) => abas.Vagas.d.push([id, "Fonte", id, "Empresa", "Vaga " + id, link, "", "remoto", "", new Date(), new Date()]);
  const estado = (u, id) => abas.VagasCandidato.d.push([u, id, 80, "", "", false, "", new Date(), new Date()]);
  const url = (n) => `https://anuncio.exemplo/vaga/${n}`;
  for (const [id, n] of [["gupy:1", 1], ["ld:2", 2], ["ld:3", 3], ["catho:4", 4], ["inhire:5", 5], ["http:6", 6], ["gupy:7", 7]]) {
    anuncio(id, id === "http:6" ? "http://inseguro.exemplo/vaga" : url(n));
    estado("usr-A", id);
  }
  estado("usr-B", "gupy:1");
  anuncio("so-de-b:9", url(9));
  estado("usr-B", "so-de-b:9");

  paginas[url(1)] = { html: GUPY({
    description: "<p>Estamos em busca de um(a) <strong>Líder de NOC</strong>&nbsp;para o time.</p>",
    responsibilities: "<ul><li>Liderar o NOC</li><li>Garantir o SLA&nbsp;dos contratos</li></ul>",
    prerequisites: "<p>Experiência com ITIL &amp; Zabbix</p>" + `<p>${LONGO}</p>`,
    relevantExperiences: "",
  }) };
  paginas[url(2)] = { html: JSON_LD({ "@context": "https://schema.org", "@type": "JobPosting", title: "Coordenador", description: `<p>Gest&atilde;o de equipes de suporte&#46; Requisitos: ITIL&#x2F;COBIT.</p><p>${LONGO}</p>` }) };
  paginas[url(3)] = { html: JSON_LD({ "@context": "https://schema.org", "@graph": [{ "@type": "Organization", name: "X" }, { "@type": "JobPosting", description: LONGO }] }) };
  paginas[url(4)] = { codigo: 403, html: "Forbidden" };
  paginas[url(5)] = { html: "<html><body><div id=\"app\"></div><script src=\"/app.js\"></script></body></html>" };
  paginas[url(7)] = { html: GUPY({ description: "<p>Curta.</p>" }) };

  r.ok(ctx.descricaoVaga(A, "gupy:1") === null, "sem descrição salva: null");

  // Gupy: seções com título, lista com hífen, entidades decodificadas.
  let d = ctx.lerDescricaoDoAnuncio(A, "gupy:1");
  r.ok(d.origem === "anuncio" && /^Sobre a vaga\nEstamos em busca de um\(a\) Líder de NOC para o time\./.test(d.texto), "Gupy: abre com \"Sobre a vaga\", sem tags nem &nbsp;");
  r.ok(d.texto.includes("Responsabilidades\n- Liderar o NOC\n- Garantir o SLA dos contratos") && d.texto.includes("ITIL & Zabbix"), "Gupy: responsabilidades em lista e &amp; decodificado");
  r.ok(!d.texto.includes("Informações adicionais") && !d.texto.includes("Menu"), "seção vazia e o resto da página ficam de fora");
  r.ok(ctx.htmlParaTexto_("<p>linha um\ncontinua</p><ul><li>\nitem A</li><li>item\nB</li></ul>") === "linha um continua\n\n- item A\n- item B",
    "quebra de linha crua no HTML vale espaço (caso real da Gupy)");
  const linhaGupy = abas.Descricoes.d.filter((l) => l[0] === "gupy:1");
  r.ok(linhaGupy.length === 1 && linhaGupy[0][1] === "" && linhaGupy[0][2] === "anuncio", "lida do anúncio fica compartilhada (sem usuario_id)");

  // Outro candidato com a mesma vaga usa a descrição já lida, sem buscar de novo.
  const antes = buscas.length;
  const db = ctx.descricaoVaga(B, "gupy:1");
  r.ok(db && db.origem === "anuncio" && db.texto === d.texto && buscas.length === antes, "B reaproveita a descrição lida, sem baixar a página");

  // JSON-LD (Sólides, InfoJobs).
  d = ctx.lerDescricaoDoAnuncio(A, "ld:2");
  r.ok(d.texto.startsWith("Gestão de equipes de suporte. Requisitos: ITIL/COBIT."), "JSON-LD: entidades nomeadas, decimais e hexadecimais decodificadas");
  r.ok(ctx.lerDescricaoDoAnuncio(A, "ld:3").texto.startsWith("Liderar o time de NOC"), "JSON-LD dentro de @graph");

  // Sólides sem JSON-LD (caso real da Raro Labs em 14/11/2026): texto em pageProps.vacancy.
  const solides = (vacancy) => `<script id="__NEXT_DATA__" type="application/json">${JSON.stringify({ props: { pageProps: { company: { description: "Sobre a empresa ".repeat(30) }, vacancy } } })}</script>`;
  anuncio("so:8", url(8));
  estado("usr-A", "so:8");
  paginas[url(8)] = { html: solides({ description: `<p><strong>Responsabilidades:</strong></p><p>${LONGO}</p>`, benefits: [{ name: "Plano de saúde" }, { name: "Day off" }] }) };
  d = ctx.lerDescricaoDoAnuncio(A, "so:8");
  r.ok(d.texto.startsWith("Responsabilidades:\n\nLiderar o time") && d.texto.endsWith("Benefícios\n- Plano de saúde\n- Day off") && !d.texto.includes("Sobre a empresa"),
    "Sólides sem JSON-LD: descrição da vaga e benefícios, sem a descrição da empresa");
  r.ok(ctx.extrairDescricao_(solides({ description: `<p>${LONGO}</p>`, benefits: [] })).endsWith("processos de monitoração."), "Sólides sem benefícios: só a descrição");

  // Falhas: pedem para colar e não gravam nada.
  const linhas = abas.Descricoes.d.length;
  r.erro(() => ctx.lerDescricaoDoAnuncio(A, "catho:4"), /cole aqui/, "site que bloqueia (403): pede para colar");
  r.ok(abas.Log.d.some((l) => l[2] === "descricao_falhou" && /catho:4: HTTP 403/.test(l[3])), "Log registra o código da falha");
  r.erro(() => ctx.lerDescricaoDoAnuncio(A, "inhire:5"), /cole aqui/, "página montada no navegador (sem dados): pede para colar");
  r.erro(() => ctx.lerDescricaoDoAnuncio(A, "gupy:7"), /cole aqui/, "descrição curta demais: pede para colar");
  const buscasAntes = buscas.length;
  r.erro(() => ctx.lerDescricaoDoAnuncio(A, "http:6"), /cole aqui/, "link sem https: nem tenta baixar");
  r.ok(buscas.length === buscasAntes && abas.Descricoes.d.length === linhas, "nenhuma linha gravada nas falhas; link http não é baixado");

  // Colar.
  r.erro(() => ctx.colarDescricao(A, "catho:4", "curto demais"), /pelo menos 200/, "colada curta demais");
  r.erro(() => ctx.colarDescricao(A, "catho:4", "x".repeat(30001)), /30000/, "colada longa demais");
  d = ctx.colarDescricao(A, "catho:4", "=HYPERLINK(\"http://x\")— " + LONGO + "​");
  r.ok(d.origem === "colada" && d.texto.startsWith("=HYPERLINK(\"http://x\"), Liderar") && !d.texto.includes("​"), "colada: travessão e invisíveis limpos");
  r.ok(abas.Descricoes.d.find((l) => l[0] === "catho:4")[1] === "usr-A", "colada gravada com o usuario_id de quem colou");
  ctx.colarDescricao(A, "catho:4", "=Segunda versão. " + LONGO);
  r.ok(abas.Descricoes.d.filter((l) => l[0] === "catho:4").length === 1, "colar de novo substitui a anterior, sem linha nova");
  r.ok(abas.Descricoes.brutos.some((x) => typeof x === "string" && x.startsWith("'=Segunda versão.")), "texto colado que começa com = é gravado como texto, não fórmula");
  r.ok(ctx.descricaoVaga(A, "catho:4").texto.startsWith("=Segunda versão."), "descricaoVaga devolve a versão nova");

  // A colada vale mais que a lida do anúncio, e só para quem colou.
  ctx.colarDescricao(A, "gupy:1", "Minha versão. " + LONGO);
  r.ok(ctx.descricaoVaga(A, "gupy:1").origem === "colada" && ctx.descricaoVaga(B, "gupy:1").origem === "anuncio", "colada de A vale para A; B continua com a do anúncio");

  // Ler de novo substitui a compartilhada, sem duplicar.
  ctx.lerDescricaoDoAnuncio(B, "gupy:1");
  r.ok(abas.Descricoes.d.filter((l) => l[0] === "gupy:1" && l[2] === "anuncio").length === 1, "ler de novo não duplica a compartilhada");

  // Isolamento.
  r.erro(() => ctx.descricaoVaga(A, "so-de-b:9"), /não encontrada/, "A não lê descrição de vaga que não é dele");
  r.erro(() => ctx.lerDescricaoDoAnuncio(A, "so-de-b:9"), /não encontrada/, "A não manda ler anúncio de vaga que não é dele");
  r.erro(() => ctx.colarDescricao(A, "so-de-b:9", LONGO), /não encontrada/, "A não cola descrição em vaga que não é dele");
  r.erro(() => ctx.descricaoVaga("x".repeat(64), "gupy:1"), /SESSAO_INVALIDA/, "token inválido recusado");

  // Exclusão de dados: a colada sai, a compartilhada fica (é anúncio público).
  ctx.apagarLinhasDoUsuario_("Descricoes", "usr-A");
  r.ok(!abas.Descricoes.d.some((l) => l[1] === "usr-A") && abas.Descricoes.d.some((l) => l[0] === "gupy:1" && l[1] === ""), "exclusão de dados tira só as coladas do usuário");

  // Limite diário de leituras (30).
  for (let i = 0; i < 30; i++) { try { ctx.lerDescricaoDoAnuncio(B, "gupy:1"); } catch (_) { /* conta mesmo assim */ } }
  r.erro(() => ctx.lerDescricaoDoAnuncio(B, "gupy:1"), /Limite de leituras/, "limite diário de leituras de anúncio");

  return r;
};

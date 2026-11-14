// humanizarPT (E4-05): limpeza, sinais, palavras que o candidato evita e calibração da nota
// com textos reais (escritos à mão x gerados com cara de IA).
"use strict";
const { criarAmbiente, novoRelatorio } = require("./simulador");

// Textos de referência da conversa de 13/11/2026 (Destaque do estudo de ROI).
const ROI_A_MAO = "Instalar fibra para um cliente de R$ 49,90 me custava o mesmo que para um cliente de R$ 100,00.\n\nDescobri isso entre 2019 e 2021, quando eu era gerente de operações de um provedor de internet e a gente implantava o COBIT. Eu queria uma resposta prática: cada instalação nova se paga?\n\nColoquei na ponta do lápis o custo de cada instalação, somando equipe, deslocamento e material, e pus ao lado do valor dos três planos: R$ 49,90, R$ 59,90 e R$ 100,00. Custo igual. O que mudava era o prazo para reaver o investimento.\n\nCom os números na mesa, tiramos os dois planos mais baratos do catálogo. Eles levavam tempo demais para pagar a própria instalação, e o custo operacional com serviço de baixo retorno caiu.\n\nTocar operação no achômetro sai caro. Decisão sem indicador custa investimento e cliente.";
const ROI_IA = "“Instalar fibra para um cliente de R$ 49,90 me custava o mesmo que para um de R$ 100,00.”\n\nDescobri isso na prática entre 2019 e 2021, enquanto gerenciava a operação de um provedor de internet durante a implantação do COBIT. Eu não buscava um relatório complexo — só queria uma resposta simples e honesta: cada nova instalação realmente se paga?\n\nColoquei na ponta do lápis o custo operacional de ativação lado a lado com o valor de cada plano. O esforço da equipe em campo e o gasto de material eram idênticos nos três cenários — só o retorno financeiro mudava.\n\nA decisão: tiramos os dois planos mais baratos do catálogo. O resultado foi imediato: paramos de queimar caixa e esforço operacional com serviços de baixo retorno.\n\nNo fim das contas, o “achômetro” é o maior risco de qualquer projeto. Decisão sem indicador custa investimento, tempo e cliente.";
const CLICHE = "No cenário atual, é importante destacar que sou um profissional apaixonado por tecnologia e inovação. Não é só sobre ferramentas, é sobre pessoas. Busco alavancar resultados de forma eficiente e agregar valor ao ecossistema, com mindset de excelência e uma abordagem holística.\n\nO resultado?\n\nUma jornada de crescimento contínuo, sinergia entre times e soluções inovadoras e robustas.\n\nO que você acha?\n\n#Tecnologia #Inovação #Liderança #Carreira #Sucesso";

module.exports = function () {
  const r = novoRelatorio("Humanizar (E4-05)");
  const { ctx } = criarAmbiente();
  const limpar = (t, umaLinha = false) => ctx.limparTextoPT_(t, umaLinha);
  const avaliar = (t, evitar) => ctx.avaliarTextoPT_(t, evitar);

  // Limpeza.
  r.ok(limpar("a — b") === "a, b" && limpar("a—b") === "a, b", "travessão vira vírgula");
  r.ok(limpar("de 5–10 dias") === "de 5-10 dias" && limpar("isso – aquilo") === "isso, aquilo", "meia-risca: hífen entre números, vírgula entre palavras");
  r.ok(limpar("“x” e ‘y’…") === "\"x\" e 'y'...", "aspas curvas e reticências de um caractere");
  r.ok(limpar("a b​c⁠d﻿e­f") === "a bcdef", "espaço duro e caracteres invisíveis");
  r.ok(limpar("linha junta") === "linhajunta", "separador de linha U+2028 sai");
  r.ok(limpar("um\n\n\n\ndois\n• item") === "um\n\ndois\n- item", "linhas em branco repetidas e marcador de lista");
  r.ok(limpar("quebra\nde linha", true) === "quebra de linha", "título: vira uma linha só");
  r.ok(limpar("veja https://exemplo.com/a—b e mail@x.com.br") === "veja https://exemplo.com/a—b e mail@x.com.br", "URL e e-mail ficam intactos");
  r.ok(limpar("fim —.") === "fim.", "vírgula antes de pontuação some");

  // Calibração: à mão passa, com cara de IA não.
  const mao = avaliar(ROI_A_MAO, []);
  const ia = avaliar(ROI_IA, []);
  const cliche = avaliar(CLICHE, ["sinergia", "mindset", "jornada"]);
  r.ok(mao.veredito === "passa", `ROI escrito à mão passa (${mao.nota})`);
  r.ok(ia.veredito === "parece IA" && ia.nota < mao.nota - 20, `ROI com travessões e aspas curvas: parece IA (${ia.nota})`);
  r.ok(cliche.veredito === "parece IA", `texto clichê: parece IA (${cliche.nota})`);
  const nomes = cliche.sinais.map((s) => s.nome);
  r.ok(["alavancar", "mindset", "ecossistema", "agregar valor", "apaixonado por", "no cenário atual", "vale ressaltar"].every((n) => nomes.includes(n)), "vocabulário de IA apontado, inclusive expressões");
  r.ok(nomes.includes("\"Não é só X, é Y\"") && nomes.includes("Pergunta retórica sozinha na linha") && nomes.includes("Isca de engajamento") && nomes.includes("Muitas hashtags"), "estruturas típicas de IA apontadas");
  r.ok(cliche.sinais.some((s) => s.tipo === "evitar" && s.nome === "jornada"), "palavra que o candidato evita apontada");
  r.ok(avaliar("Alavancamos as vendas e alavancada a margem.", []).sinais.find((s) => s.nome === "alavancar").qtd === 2, "pega a palavra flexionada");
  r.ok(!avaliar("Uma jornadas e jornadas.", []).sinais.length, "não confunde jornadas com jornada");

  // Acento: \b do JavaScript não vê "é"; a fronteira de palavra do humanizador vê.
  r.ok(avaliar("Não é só ferramenta, é processo. ".repeat(3), []).sinais.some((s) => s.nome === "\"Não é só X, é Y\""), "estrutura com acento é reconhecida");
  const voz = avaliar("Você chegou aqui porque você quer resultado. Lidero o time e audito os atendimentos. Liderei 50 pessoas e cheguei a 70% de SLA em 2026 com o time da Quantum13.", []);
  r.ok(/[1-9]/.test(voz.checagens.find((c) => c.id === "voz").detalhe), "voz conta você, presente e pretérito em primeira pessoa");

  // Termos da seção Palavras que evito.
  const termos = ctx.termosEvitar_([
    "Termos: sinergia, disruptivo, mindset, jornada (no sentido coach), game changer, gratidão como hashtag.",
    "Aberturas como \"Estou muito feliz em anunciar\" e \"humildemente compartilho\".",
  ]);
  r.ok(["sinergia", "disruptivo", "mindset", "jornada", "game changer", "gratidão como hashtag"].every((t) => termos.includes(t)), "lista separada por vírgula, sem o parêntese");
  r.ok(termos.includes("estou muito feliz em anunciar") && termos.includes("humildemente compartilho"), "expressões entre aspas");

  // Texto curto não é julgado nas checagens que precisam de volume.
  const curto = avaliar("Título curto.", []);
  r.ok(curto.checagens.filter((c) => c.nota === 50).length >= 3, "texto curto: checagens de volume ficam neutras");

  return r;
};

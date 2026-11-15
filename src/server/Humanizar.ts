/**
 * humanizarPT (E4-05): porta do humanize.py/detect.py da skill li-human para português,
 * sem dependência.
 *
 * - limparTextoPT_: tira o que um teclado não produz (caracteres invisíveis, espaços
 *   especiais) e a tipografia de texto gerado (travessão, aspas curvas, reticências de um
 *   caractere). É automático porque não muda o sentido. Endereços (URL, e-mail) ficam intactos.
 * - avaliarTextoPT_: cinco checagens de 0 a 100 (quanto maior, mais natural), como o
 *   detect.py: ritmo (variação do tamanho das frases), concretude (números e nomes),
 *   vocabulário de IA, marcas tipográficas e voz. Mais a lista de sinais para o candidato
 *   revisar: vocabulário, estruturas típicas de IA e as palavras que ele evita (da ficha).
 * - Diferenças da ferramenta original: em português o vocabulário é só apontado, não trocado,
 *   porque verbo e adjetivo flexionam ("alavancamos", "robusta") e a troca automática
 *   quebraria a frase. A voz mede marcas de primeira e segunda pessoa do português
 *   (pronomes, "a gente", pretérito em -ei), porque o português costuma omitir o sujeito.
 * - São heurísticas locais. Não são GPTZero nem outro detector, e não prometem o veredito deles.
 */

/** Fronteira de palavra que entende acento: em JavaScript, \b não vê "é" nem "ê" como letra. */
const FRONTEIRA_PT = "(?:(?<![\\wÀ-ÿ])(?=[\\wÀ-ÿ])|(?<=[\\wÀ-ÿ])(?![\\wÀ-ÿ]))";

/** Troca cada \b da expressão pela fronteira que entende acento. */
function rePT_(re: RegExp): RegExp {
  return new RegExp(re.source.split("\\b").join(FRONTEIRA_PT), re.flags);
}

/** Vocabulário que soa como texto gerado em português, com o que fazer no lugar. */
const VOCABULARIO_IA: { re: RegExp; termo: string; dica: string }[] = [
  { re: rePT_(/\balavanc(?:ar|a|am|ou|amos|ando|ado|ada|ados|adas|aram)\b/gi), termo: "alavancar", dica: "diga o que aumentou ou melhorou" },
  { re: rePT_(/\bpotencializ\w*/gi), termo: "potencializar", dica: "diga o que aumentou e quanto" },
  { re: rePT_(/\brobust[oa]s?\b/gi), termo: "robusto", dica: "corte ou diga o que aguenta" },
  { re: rePT_(/\bsinergia\w*/gi), termo: "sinergia", dica: "diga quem trabalhou com quem" },
  { re: rePT_(/\bdisruptiv\w*/gi), termo: "disruptivo", dica: "diga o que mudou" },
  { re: rePT_(/\bmindset\b/gi), termo: "mindset", dica: "jeito de pensar, ou corte" },
  { re: rePT_(/\bgame[ -]changer\b/gi), termo: "game changer", dica: "diga o que mudou" },
  { re: rePT_(/\bjornada\b/gi), termo: "jornada", dica: "trajetória, ou corte" },
  { re: rePT_(/\becossistema\b/gi), termo: "ecossistema", dica: "diga quais empresas ou áreas" },
  { re: rePT_(/\bhol[ií]stic\w*/gi), termo: "holístico", dica: "corte" },
  { re: rePT_(/\bexcel[eê]ncia\b/gi), termo: "excelência", dica: "mostre o resultado" },
  { re: rePT_(/\bagregar valor\b/gi), termo: "agregar valor", dica: "diga qual valor" },
  { re: rePT_(/\bfazer a diferença\b/gi), termo: "fazer a diferença", dica: "diga o que muda" },
  { re: rePT_(/\bapaixonad[oa]s? (?:por|pela|pelo)\b/gi), termo: "apaixonado por", dica: "diga o que você faz" },
  { re: rePT_(/\bproativ[oa]s?\b|\bproatividade\b/gi), termo: "proativo", dica: "dê um exemplo" },
  { re: rePT_(/\bresili[eê]n(?:te|tes|cia)\b/gi), termo: "resiliente", dica: "dê um exemplo" },
  { re: rePT_(/\binovador(?:a|as|es)?\b/gi), termo: "inovador", dica: "diga o que é novo" },
  { re: rePT_(/\bfomentar\b/gi), termo: "fomentar", dica: "estimular, ou diga como" },
  { re: rePT_(/\bendere[cç]\w*/gi), termo: "endereçar", dica: "resolver ou tratar" },
  { re: rePT_(/\bperformar\b|\bperformou\b/gi), termo: "performar", dica: "ter desempenho, ou dê o número" },
  { re: rePT_(/\bno fim do dia\b/gi), termo: "no fim do dia", dica: "no fim das contas" },
  { re: rePT_(/\bno cen[aá]rio atual\b|\bnos dias de hoje\b|\bno mundo atual\b|\bem um mundo cada vez mais\b/gi), termo: "no cenário atual", dica: "hoje, ou corte" },
  { re: rePT_(/\b(?:vale|cabe) (?:ressaltar|destacar|lembrar)\b|\b[eé] importante (?:ressaltar|destacar)\b/gi), termo: "vale ressaltar", dica: "corte e diga direto" },
  { re: rePT_(/\bestou (?:muito )?feliz em (?:anunciar|compartilhar)\b/gi), termo: "estou feliz em anunciar", dica: "comece pelo fato" },
  { re: rePT_(/\bhumildemente\b/gi), termo: "humildemente", dica: "corte" },
  { re: rePT_(/\bde forma (?:eficiente|eficaz|estrat[eé]gica)\b/gi), termo: "de forma eficiente", dica: "dê o número" },
];

/** Estruturas que denunciam texto gerado. São apontadas, nunca reescritas. */
const ESTRUTURAS_IA: { re: RegExp; nome: string; dica: string }[] = [
  { re: rePT_(/\bn[aã]o (?:[eé]|s[aã]o|foi) (?:s[oó]|apenas|somente) [^.!?\n]{2,60}[,.] (?:[eé]|s[aã]o|foi)\b/gi), nome: "\"Não é só X, é Y\"", dica: "diga só o que importa" },
  { re: rePT_(/\bn[aã]o (?:s[oó]|apenas|somente)\b[^.!?\n]{2,80}\bmas tamb[eé]m\b/gi), nome: "\"Não só X, mas também Y\"", dica: "duas frases, ou corte a parte mais fraca" },
  { re: rePT_(/\bn[aã]o se trata de [^.!?\n]{2,60}[,.] (?:mas|e sim|trata-se)\b/gi), nome: "\"Não se trata de X, mas de Y\"", dica: "comece por Y" },
  { re: rePT_(/^\s*(?:o resultado|a melhor parte|o segredo|a verdade|o que mudou|a li[cç][aã]o)\?\s*$/gim), nome: "Pergunta retórica sozinha na linha", dica: "responda direto, sem suspense" },
  { re: rePT_(/\b(?:aqui est[aá]|veja) o que (?:eu )?aprendi\b|\bo que eu aprendi com isso\b/gi), nome: "\"Aqui está o que aprendi\"", dica: "diga a lição, sem anunciar" },
  { re: rePT_(/[\u{1F680}\u{1F525}\u{1F4A1}\u2728\u{1F3AF}]/gu), nome: "Emoji de foguete, fogo, lâmpada, brilho ou alvo", dica: "no máximo um emoji, e não destes" },
  { re: rePT_(/(?:#[\wÀ-ÿ]+[ \t]*){4,}/g), nome: "Muitas hashtags", dica: "no máximo 3, no fim" },
  { re: rePT_(/\bcomo (?:uma )?(?:ia|intelig[eê]ncia artificial|modelo de linguagem)\b/gi), nome: "Texto falando como IA", dica: "corte a frase" },
  { re: rePT_(/^\s*(?:em resumo|em suma|para concluir|concluindo)\b/gim), nome: "Abertura de conclusão de redação", dica: "post e perfil não precisam de conclusão" },
  { re: rePT_(/\b(?:concorda\?|o que voc[eê] acha\?|quem mais\b[^.!?\n]*\?|estou errad[oa]\?)\s*$/gim), nome: "Isca de engajamento", dica: "pergunte algo que só você perguntaria" },
];

interface ChecagemPT {
  id: string;
  nome: string;
  nota: number;
  detalhe: string;
  /** Texto curto demais para julgar: a nota 50 é neutra e fica fora da média e da checagem mais fraca. */
  neutra?: boolean;
}

interface SinalPT {
  tipo: "vocabulario" | "estrutura" | "evitar";
  nome: string;
  dica: string;
  qtd: number;
}

interface AvaliacaoPT {
  nota: number;
  veredito: "passa" | "revisar" | "parece IA";
  checagens: ChecagemPT[];
  sinais: SinalPT[];
}

// ---------- Limpeza ----------

/**
 * Tira caracteres invisíveis e a tipografia de texto gerado. Mantém as quebras de linha,
 * salvo em `umaLinha`. Endereços (URL e e-mail) não são alterados.
 */
function limparTextoPT_(v: string, umaLinha: boolean): string {
  const enderecos: string[] = [];
  // O endereço para em espaço, aspas, parênteses, colchetes e travessões: em `link")—` o travessão
  // fica fora e é limpo. E-mail no formato usual (nome@dominio.tld).
  let t = String(v ?? "").replace(/(?:https?:\/\/|www\.)[^\s"'<>()[\]{}–—]+|[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g, (m) => {
    enderecos.push(m);
    return `\u0000END${enderecos.length - 1}\u0000`;
  });
  t = t
    .replace(/[\u00A0\u202F\u2007\u2009\u200A]/g, " ")
    .replace(/[\u200B\u200C\u200E\u200F\u2028-\u202E\u2060-\u2064\u206A-\u206F\uFEFF\u00AD]/g, "")
    // U+200D junta emojis compostos (pessoa + formatura): fica s\u00F3 entre dois emojis.
    .replace(/(?<![\p{Extended_Pictographic}\p{Emoji_Modifier}\uFE0F])\u200D|\u200D(?!\p{Extended_Pictographic})/gu, "")
    .replace(/[\u{E0000}-\u{E007F}]/gu, "")
    .replace(/\s*\u2014\s*/g, ", ")
    .replace(/\s*\u2013\s*(?=\d)/g, "-")
    .replace(/\s+\u2013\s+/g, ", ")
    .replace(/\u2013/g, "-")
    .replace(/[\u201C\u201D\u201E\u00AB\u00BB]/g, "\"")
    .replace(/[\u2018\u2019\u201A]/g, "'")
    .replace(/\u2026/g, "...")
    .replace(/^[ \t]*\u2022[ \t]*/gm, "- ")
    .replace(/\r\n?/g, "\n")
    .replace(/,\s*([,.;:!?])/g, "$1")
    .replace(/,[ \t]*\n/g, "\n")
    .replace(/^,\s*/gm, "");
  t = umaLinha
    ? t.replace(/\s+/g, " ")
    : t.split("\n").map((l) => l.replace(/[ \t]+/g, " ").trim()).join("\n").replace(/\n{3,}/g, "\n\n");
  t = t.replace(/\u0000END(\d+)\u0000/g, (_m, i) => enderecos[Number(i)]);
  return t.trim();
}

// ---------- Avaliação ----------

function limitarPT_(n: number): number {
  return Math.max(0, Math.min(100, n));
}

/** Leva `valor` para 0-100, com `humano` em 100 e `maquina` em 0 (como o scale do detect.py). */
function escalaPT_(valor: number, humano: number, maquina: number): number {
  return humano === maquina ? 50 : limitarPT_(((valor - maquina) / (humano - maquina)) * 100);
}

function palavrasPT_(t: string): string[] {
  return t.match(/[A-Za-zÀ-ÖØ-öø-ÿ']+/g) || [];
}

function frasesPT_(t: string): string[] {
  return (t.match(/[^.!?\n]+[.!?]*/g) || []).map((s) => s.trim()).filter((s) => s.split(/\s+/).length > 2);
}

function desvioPadrao_(v: number[]): number {
  const m = v.reduce((a, b) => a + b, 0) / v.length;
  return Math.sqrt(v.reduce((a, b) => a + (b - m) * (b - m), 0) / v.length);
}

/**
 * Avalia o quanto o texto soa natural. `evitar` são termos que o candidato não quer nos
 * textos (seção Palavras que evito da ficha).
 */
function avaliarTextoPT_(texto: string, evitar: string[] = []): AvaliacaoPT {
  const t = String(texto ?? "");
  const pal = palavrasPT_(t);
  const por100 = pal.length ? 100 / pal.length : 0;
  const checagens: ChecagemPT[] = [];
  const sinais: SinalPT[] = [];

  // 1. Ritmo: gente varia muito o tamanho das frases; modelo escreve tudo igual.
  const tamanhos = frasesPT_(t).map((s) => s.split(/\s+/).length);
  // Menos de 6 frases é amostra pequena: com 4 ou 5, o "O que espera da empresa" tirava 9 a 14 em todas as gerações.
  if (tamanhos.length < 6) {
    checagens.push({ id: "ritmo", nome: "Ritmo", nota: 50, detalhe: "texto curto demais para julgar", neutra: true });
  } else {
    const media = tamanhos.reduce((a, b) => a + b, 0) / tamanhos.length;
    const cv = media ? desvioPadrao_(tamanhos) / media : 0;
    checagens.push({ id: "ritmo", nome: "Ritmo", nota: escalaPT_(cv, 0.7, 0.22), detalhe: `variação ${cv.toFixed(2)} em ${tamanhos.length} frases (bom a partir de 0,55)` });
  }

  // 2. Concretude: números e nomes próprios fora do começo da frase.
  if (pal.length < 25) {
    checagens.push({ id: "concretude", nome: "Concretude", nota: 50, detalhe: "texto curto demais para julgar", neutra: true });
  } else {
    const numeros = (t.match(/\b\d[\d.,]*%?|R\$\s?\d/g) || []).length;
    const nomes = new Set(t.match(rePT_(/(?<![.!?:]\s)(?<!^)(?<![-\u2022]\s)\b[A-ZÀ-Ý][a-zà-ÿ]{2,}\b/gm)) || []).size;
    const densidade = (numeros + nomes) * por100;
    checagens.push({ id: "concretude", nome: "Concretude", nota: escalaPT_(densidade, 6, 0.5), detalhe: `${numeros + nomes} números e nomes, ${densidade.toFixed(1)} a cada 100 palavras (bom a partir de 4)` });
  }

  // 3. Vocabulário de IA.
  let ocorrencias = 0;
  for (const v of VOCABULARIO_IA) {
    const n = (t.match(v.re) || []).length;
    if (!n) continue;
    ocorrencias += n;
    sinais.push({ tipo: "vocabulario", nome: v.termo, dica: v.dica, qtd: n });
  }
  checagens.push({
    id: "vocabulario", nome: "Vocabulário", nota: pal.length ? escalaPT_(ocorrencias * por100, 0, 4) : 50,
    detalhe: `${ocorrencias} termo(s) típico(s) de texto gerado`,
  });

  // 4. Marcas tipográficas que um teclado não produz.
  const invisiveis = (t.match(/[\u200B\u200C\u200E\u200F\u2028-\u202E\u2060-\u2064\uFEFF\u00AD]/g) || []).length
    + (t.match(/(?<![\p{Extended_Pictographic}\p{Emoji_Modifier}\uFE0F])\u200D|\u200D(?!\p{Extended_Pictographic})/gu) || []).length;
  const travessoes = (t.match(/\u2014/g) || []).length;
  const aspas = (t.match(/[\u2018\u2019\u201C\u201D]/g) || []).length;
  const reticencias = (t.match(/\u2026/g) || []).length;
  const espacos = (t.match(/[\u00A0\u202F\u2007]/g) || []).length;
  const marcas = invisiveis * 4 + travessoes * 2 + aspas + reticencias + espacos;
  checagens.push({
    id: "marcas", nome: "Marcas tipográficas", nota: escalaPT_((marcas * 1000) / Math.max(t.length, 1), 0, 12),
    detalhe: `${invisiveis} invisíveis, ${travessoes} travessões, ${aspas} aspas curvas, ${reticencias} reticências, ${espacos} espaços especiais`,
  });

  // 5. Voz: primeira e segunda pessoa, sem as estruturas típicas de IA.
  let estruturas = 0;
  for (const e of ESTRUTURAS_IA) {
    const n = (t.match(e.re) || []).length;
    if (!n) continue;
    estruturas += n;
    sinais.push({ tipo: "estrutura", nome: e.nome, dica: e.dica, qtd: n });
  }
  const topicos = (t.match(/^\s*[-*\u2022]\s+(.+)$/gm) || []).map((l) => palavrasPT_(l).length);
  const topicosIguais = topicos.length >= 3 && desvioPadrao_(topicos) < 1.6;
  if (topicosIguais) sinais.push({ tipo: "estrutura", nome: "Tópicos do mesmo tamanho", dica: "varie: um curto, um longo", qtd: topicos.length });
  if (pal.length < 25) {
    checagens.push({ id: "voz", nome: "Voz", nota: 50, detalhe: "texto curto demais para julgar", neutra: true });
  } else {
    const pessoa = ((t.match(rePT_(/\b(?:eu|me|mim|comigo|meu|meus|minha|minhas|n[oó]s|nosso|nossos|nossa|nossas|voc[eê]s?|seu|seus|sua|suas)\b/gi)) || []).length
      + (t.match(rePT_(/\ba gente\b/gi)) || []).length
      + (t.match(rePT_(/\b[a-zà-ÿ]{3,}ei\b/gi)) || []).length
      + verbosPrimeiraPessoa_(t)) * por100;
    let nota = escalaPT_(pessoa, 6, 0.5) * 0.6 + limitarPT_(100 - estruturas * 22) * 0.4;
    if (topicosIguais) nota -= 12;
    checagens.push({ id: "voz", nome: "Voz", nota: limitarPT_(nota), detalhe: `${pessoa.toFixed(1)} marcas de 1ª e 2ª pessoa a cada 100 palavras, ${estruturas} estrutura(s) típica(s) de IA` });
  }

  // Palavras que o candidato evita.
  for (const termo of evitar) {
    const re = new RegExp(`(?<![A-Za-zÀ-ÿ])${termo.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![A-Za-zÀ-ÿ])`, "gi");
    const n = (t.match(re) || []).length;
    if (n) sinais.push({ tipo: "evitar", nome: termo, dica: "está na sua lista de palavras que você evita", qtd: n });
  }

  // Como o detect.py: a checagem mais fraca pesa, porque um detector só precisa de um sinal.
  // As neutras (texto curto demais) não entram: um 50 inventado travaria todo texto curto em "revisar".
  const julgadas = checagens.filter((c) => !c.neutra);
  const notas = (julgadas.length ? julgadas : checagens).map((c) => c.nota);
  const media = notas.reduce((a, b) => a + b, 0) / notas.length;
  const menor = Math.min(...notas);
  const nota = Math.round((media * 0.6 + menor * 0.4) * 10) / 10;
  const veredito = nota >= 70 && menor >= 55 ? "passa" : nota >= 50 ? "revisar" : "parece IA";
  for (const c of checagens) c.nota = Math.round(c.nota * 10) / 10;
  return { nota, veredito, checagens, sinais };
}

/**
 * Verbo no presente em primeira pessoa no começo da frase ("Lidero suporte", "Audito os
 * atendimentos"): o português omite o "eu", e só os pronomes subestimariam a voz. Heurística:
 * palavra que termina em -o, no começo da frase, de um tópico ou depois de dois-pontos, seguida
 * de minúscula, fora de uma lista de substantivos e advérbios comuns que também terminam em -o.
 */
const NAO_VERBOS_PT = ["processo", "resultado", "contrato", "projeto", "como", "isso", "isto", "cargo", "exemplo",
  "trabalho", "grupo", "texto", "foco", "mercado", "custo", "prazo", "tempo", "objetivo", "desafio",
  "segundo", "primeiro", "terceiro", "novo", "todo", "cada", "mesmo", "outro", "nenhum", "fato", "caso", "acesso",
  "modelo", "atendimento", "suporte", "plano", "ano", "uso", "centro", "sucesso", "conteúdo", "estudo", "período"];

function verbosPrimeiraPessoa_(t: string): number {
  const re = /(?:^|[.!?:]\s+|\n\s*[-*]?\s*)([A-ZÀ-Ýa-zà-ÿ][a-zà-ÿ]{2,}o)\s+(?=[a-zà-ÿ])/g;
  let n = 0;
  for (const m of t.matchAll(re)) if (!NAO_VERBOS_PT.includes(m[1].toLowerCase())) n++;
  return n;
}

/**
 * Termos da seção Palavras que evito, para a avaliação apontar. Aceita listas separadas
 * por vírgula ("Termos: sinergia, mindset") e expressões entre aspas.
 */
/** Palavras de ligação que nunca são "termo a evitar", mesmo que apareçam soltas numa lista. */
const PALAVRAS_COMUNS_PT = ["como", "que", "para", "com", "sem", "por", "uma", "das", "dos", "nas", "nos", "mais", "muito", "também", "outros", "outras", "etc"];

function termosEvitar_(itens: string[]): string[] {
  const termos = new Set<string>();
  for (const item of itens) {
    // Item com termos entre aspas ('Anglicismos, como "deliverar" e "fazer o follow"'): valem s\u00F3
    // os termos entre aspas. O resto \u00E9 a frase que os apresenta ("como" virava termo: achado de 14/11/2026).
    const entreAspas = item.match(/["\u201C\u201D]([^"\u201C\u201D]{3,60})["\u201C\u201D]/g) || [];
    for (const a of entreAspas) termos.add(a.replace(/["\u201C\u201D]/g, "").trim().toLowerCase());
    if (entreAspas.length) continue;
    // Sen\u00E3o, lista separada por v\u00EDrgula depois do r\u00F3tulo ("Termos: sinergia, mindset").
    const semRotulo = item.replace(/^[^:]{0,40}:/, "");
    for (const parte of semRotulo.split(/,| e | ou /)) {
      const p = parte.replace(/\([^)]*\)/g, "").replace(/[.;]/g, "").trim().toLowerCase();
      if (p.length >= 3 && p.length <= 40 && p.split(/\s+/).length <= 3 && !PALAVRAS_COMUNS_PT.includes(p)) termos.add(p);
    }
  }
  return [...termos];
}

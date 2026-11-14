// Simula o Apps Script para testar o código compilado (dist/) no Node, sem rede e sem Google.
// Planilha, cache, lock, Drive, e-mail e a API do Claude são falsos e ficam na memória.
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const crypto = require("crypto");

const DIST = path.join(__dirname, "..", "dist");

/** Formata data como o Utilities.formatDate, só com os padrões que o código usa. */
function formatarData(d, padrao) {
  const z = (n, t = 2) => String(n).padStart(t, "0");
  return padrao
    .replace("yyyy", d.getFullYear()).replace("MM", z(d.getMonth() + 1)).replace("dd", z(d.getDate()))
    .replace("HH", z(d.getHours())).replace("mm", z(d.getMinutes())).replace("ss", z(d.getSeconds()));
}

/** O Sheets guarda "'texto" como "texto": o apóstrofo só marca que não é fórmula. */
const semApostrofo = (v) => (typeof v === "string" && v.startsWith("'") ? v.slice(1) : v);

function criarAba(cab) {
  const d = [cab.slice()];
  let maxRows = 1000;
  const aba = {
    d,
    brutos: [], // tudo o que foi gravado com setValue, antes de tirar o apóstrofo
    getDataRange: () => ({ getValues: () => d.map((l) => l.slice()) }),
    getLastColumn: () => d[0].length,
    getLastRow: () => d.length,
    getMaxRows: () => maxRows,
    insertRowAfter: () => { maxRows++; },
    deleteRow: (n) => { d.splice(n - 1, 1); maxRows--; },
    appendRow: (l) => { d.push(l.map(semApostrofo)); },
    getRange: (r, c, nr = 1, nc = 1) => ({
      getValues: () => d.slice(r - 1, r - 1 + nr).map((l) => l.slice(c - 1, c - 1 + nc)),
      setValue: (v) => {
        while (d.length < r) d.push(Array(d[0].length).fill(""));
        aba.brutos.push(v);
        d[r - 1][c - 1] = semApostrofo(v);
      },
      setValues: (vs) => vs.forEach((l, i) => { d[r - 1 + i] = l.map(semApostrofo); }),
    }),
  };
  return aba;
}

/**
 * Cria um ambiente novo com o código de dist/ carregado e as abas do ESQUEMA vazias.
 * `respostasIA` é uma fila: cada chamada à API consome a primeira (o JSON que a IA "devolve").
 */
function criarAmbiente({ dono = "dono@teste.local" } = {}) {
  const abas = {};
  const cache = new Map();
  const drive = new Map();
  const chamadasIA = [];
  const respostasIA = [];
  const emails = [];

  const ctx = {
    console: { log() {}, error() {}, warn() {} },
    Logger: { log() {} },
    Session: {
      getActiveUser: () => ({ getEmail: () => ctx.__usuarioAtivo ?? dono }),
      getEffectiveUser: () => ({ getEmail: () => dono }),
    },
    PropertiesService: { getScriptProperties: () => ({ getProperty: () => "segredo-de-teste" }) },
    SpreadsheetApp: { openById: () => ({ getSheetByName: (n) => abas[n] || null }) },
    CacheService: {
      getScriptCache: () => ({
        get: (k) => (cache.has(k) ? cache.get(k) : null),
        put: (k, v) => cache.set(k, v),
        remove: (k) => cache.delete(k),
        removeAll: (ks) => ks.forEach((k) => cache.delete(k)),
      }),
    },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    MailApp: { sendEmail: (o) => emails.push(o) },
    Drive: {
      Files: {
        create: (rec, blob) => {
          const id = "f" + crypto.randomBytes(5).toString("hex");
          drive.set(id, { ...rec, blob });
          return { id };
        },
        remove: (id) => {
          if (!drive.has(id)) throw new Error("File not found: " + id);
          drive.delete(id);
        },
      },
    },
    UrlFetchApp: {
      fetch: (url, opt) => {
        if (!/api\.anthropic\.com/.test(url)) throw new Error("URL inesperada no teste: " + url);
        chamadasIA.push(JSON.parse(opt.payload));
        if (!respostasIA.length) throw new Error("Teste sem resposta da IA na fila");
        const r = respostasIA.shift();
        return {
          getResponseCode: () => 200,
          getContentText: () => JSON.stringify({
            model: "modelo-de-teste", stop_reason: "end_turn",
            usage: { input_tokens: 100, output_tokens: 50 },
            content: [{ type: "text", text: JSON.stringify(r) }],
          }),
        };
      },
    },
    Utilities: {
      getUuid: () => crypto.randomUUID(),
      computeHmacSha256Signature: (t, k) =>
        [...crypto.createHmac("sha256", k).update(t).digest()].map((b) => (b > 127 ? b - 256 : b)),
      base64Decode: (s) => [...Buffer.from(s, "base64")].map((b) => (b > 127 ? b - 256 : b)),
      newBlob: (bytes, mime, nome) => ({ bytes, mime, nome }),
      formatDate: (d, _tz, padrao) => formatarData(d, padrao),
    },
  };

  vm.createContext(ctx);
  for (const f of fs.readdirSync(DIST).filter((f) => f.endsWith(".js")).sort()) {
    vm.runInContext(fs.readFileSync(path.join(DIST, f), "utf8"), ctx, { filename: f });
  }
  const g = (expr) => vm.runInContext(expr, ctx);
  for (const [nome, cab] of Object.entries(g("ESQUEMA"))) abas[nome] = criarAba(cab);
  ctx.garantirRubricas_();

  /** Cadastra um usuário ativo e devolve um token de sessão com o termo aceito. */
  function usuario(id, { termo = g("TERMO_VERSAO") } = {}) {
    abas.Usuarios.d.push([id, `${id}@teste.local`, "", "candidato", true, "", new Date(), termo, `pasta-${id}`]);
    const token = crypto.randomBytes(32).toString("hex");
    const sessao = { usuario_id: id, papel: "candidato", expira: Date.now() + 3600e3, termo };
    cache.set("ses:" + ctx.hmac_("sessao:" + token), JSON.stringify(sessao));
    return token;
  }

  /** Linha nova na ficha do usuário. */
  function ficha(id, secao, texto, status = "confirmado") {
    const item = crypto.randomUUID();
    abas.Fichas.d.push([id, secao, item, texto, status, "manual", new Date()]);
    return item;
  }

  return { ctx, g, abas, cache, drive, chamadasIA, respostasIA, emails, usuario, ficha };
}

/** Imagens mínimas com a assinatura certa, para os testes de prints. */
const IMAGENS = {
  JPEG: Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), crypto.randomBytes(200)]).toString("base64"),
  PNG: Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), crypto.randomBytes(200)]).toString("base64"),
  PDF: Buffer.from("%PDF-1.4 falso").toString("base64"),
};

/** Datas criadas dentro do vm não passam em `instanceof Date` do Node. */
const ehData = (v) => Object.prototype.toString.call(v) === "[object Date]";

/** Contador de casos: `ok(condição, nome)` e `erro(fn, /mensagem/, nome)`. */
function novoRelatorio(titulo) {
  const r = { titulo, total: 0, falhas: [] };
  r.ok = (cond, nome) => {
    r.total++;
    if (!cond) r.falhas.push(nome);
    console.log(`  ${cond ? "ok   " : "FALHA"} ${nome}`);
  };
  r.erro = (fn, re, nome) => {
    try {
      fn();
      r.ok(false, `${nome} (não lançou erro)`);
    } catch (e) {
      r.ok(re.test(String(e.message)), `${nome} -> ${e.message}`);
    }
  };
  return r;
}

module.exports = { criarAmbiente, novoRelatorio, IMAGENS, ehData };

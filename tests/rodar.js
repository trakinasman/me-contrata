// Roda todos os testes (tests/*.test.js) contra o código compilado em dist/.
// Uso: npm test (gera dist/ antes). Sai com código 1 se algum caso falhar.
"use strict";
const fs = require("fs");
const path = require("path");

const arquivos = fs.readdirSync(__dirname).filter((f) => f.endsWith(".test.js")).sort();
let total = 0;
const falhas = [];
for (const f of arquivos) {
  console.log(`\n${f}`);
  const r = require(path.join(__dirname, f))();
  total += r.total;
  for (const nome of r.falhas) falhas.push(`${r.titulo}: ${nome}`);
}
console.log(`\n${total - falhas.length} de ${total} casos passaram em ${arquivos.length} arquivos.`);
if (falhas.length) {
  console.log("\nFalhas:\n" + falhas.map((f) => "  - " + f).join("\n"));
  process.exit(1);
}

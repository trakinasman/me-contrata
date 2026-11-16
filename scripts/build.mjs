// Monta dist/ para o clasp: compila o TypeScript, embute as skills e copia o manifesto e o HTML.
import { execSync } from "node:child_process";
import { cpSync, rmSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";

rmSync("dist", { recursive: true, force: true });
mkdirSync("dist");
execSync("npx tsc -p tsconfig.json", { stdio: "inherit" });

// E7-03: o SKILL.md (sem o cabecalho de metadados) de cada skill do app vira uma constante global, o
// prompt de sistema da funcao que a usa. Uma unica fonte de regras para a pagina e para o Claude Code.
//   li-candidatura -> SKILL_CANDIDATURA (adaptarParaVaga)
//   li-recrutador  -> SKILL_RECRUTADOR (gerarMensagensRecrutador)
const SKILLS = [
  { pasta: "li-candidatura", constante: "SKILL_CANDIDATURA", arquivo: "SkillCandidatura.js" },
  { pasta: "li-recrutador", constante: "SKILL_RECRUTADOR", arquivo: "SkillRecrutador.js" },
];
const separadores = new RegExp("[" + String.fromCharCode(0x2028) + String.fromCharCode(0x2029) + "]", "g");
for (const sk of SKILLS) {
  const caminho = `skills/${sk.pasta}/SKILL.md`;
  const skill = readFileSync(caminho, "utf8").replace(/\r\n/g, "\n");
  const corpo = skill.replace(/^---\n[\s\S]*?\n---\n/, "").trim();
  if (!corpo) throw new Error(`${caminho} vazio ou sem corpo`);
  const literal = JSON.stringify(corpo).replace(separadores, (c) => String.fromCharCode(92) + "u" + c.charCodeAt(0).toString(16));
  writeFileSync(
    `dist/${sk.arquivo}`,
    `// Gerado por scripts/build.mjs a partir de ${caminho}. Nao editar.\nconst ${sk.constante} = ${literal};\n`,
  );
}

cpSync("src/appsscript.json", "dist/appsscript.json");
for (const f of readdirSync("src/client")) cpSync(`src/client/${f}`, `dist/${f}`);
console.log("dist/ pronto:", readdirSync("dist").join(", "));

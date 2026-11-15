// Monta dist/ para o clasp: compila o TypeScript, embute a skill li-candidatura e copia o manifesto e o HTML.
import { execSync } from "node:child_process";
import { cpSync, rmSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";

rmSync("dist", { recursive: true, force: true });
mkdirSync("dist");
execSync("npx tsc -p tsconfig.json", { stdio: "inherit" });

// E7-03: o SKILL.md (sem o cabecalho de metadados) vira a constante SKILL_CANDIDATURA, o prompt de
// sistema de adaptarParaVaga(). Uma unica fonte de regras para a pagina e para o Claude Code.
const skill = readFileSync("skills/li-candidatura/SKILL.md", "utf8").replace(/\r\n/g, "\n");
const corpo = skill.replace(/^---\n[\s\S]*?\n---\n/, "").trim();
if (!corpo) throw new Error("skills/li-candidatura/SKILL.md vazio ou sem corpo");
const separadores = new RegExp("[" + String.fromCharCode(0x2028) + String.fromCharCode(0x2029) + "]", "g");
const literal = JSON.stringify(corpo).replace(separadores, (c) => String.fromCharCode(92) + "u" + c.charCodeAt(0).toString(16));
writeFileSync(
  "dist/SkillCandidatura.js",
  `// Gerado por scripts/build.mjs a partir de skills/li-candidatura/SKILL.md. Nao editar.\nconst SKILL_CANDIDATURA = ${literal};\n`,
);

cpSync("src/appsscript.json", "dist/appsscript.json");
for (const f of readdirSync("src/client")) cpSync(`src/client/${f}`, `dist/${f}`);
console.log("dist/ pronto:", readdirSync("dist").join(", "));

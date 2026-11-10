// Monta dist/ para o clasp: compila o TypeScript e copia o manifesto e o HTML.
import { execSync } from "node:child_process";
import { cpSync, rmSync, mkdirSync, readdirSync } from "node:fs";

rmSync("dist", { recursive: true, force: true });
mkdirSync("dist");
execSync("npx tsc -p tsconfig.json", { stdio: "inherit" });
cpSync("src/appsscript.json", "dist/appsscript.json");
for (const f of readdirSync("src/client")) cpSync(`src/client/${f}`, `dist/${f}`);
console.log("dist/ pronto:", readdirSync("dist").join(", "));

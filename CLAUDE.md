# me-contrata

Assistente web para candidatos a vagas: ficha do candidato, nota do perfil, adaptação de textos por vaga, funil de candidaturas e pedidos de recomendação.

## Stack
- Google Apps Script (runtime V8) publicado como web app. Código em TypeScript em `src/server/`, compilado por `tsc` para `dist/`, enviado com `clasp`.
- Banco: uma Google Sheet (abas definidas em `src/server/Esquema.ts`). Arquivos dos usuários: pasta no Drive.
- IA: API do Claude via `UrlFetchApp` (modelo em `Config.ts`).
- Front: HTML em `src/client/`, servido por `HtmlService`; chamadas ao servidor só por `google.script.run`.

## Comandos
- `npm run build`: limpa e gera `dist/`
- `npm run typecheck`: checa tipos sem gerar arquivos
- `npm run push`: build + `clasp push`
- `npm run deploy`: push + nova implantação
- `npm run logs`: últimos logs

## Regras do código
- Os arquivos `.ts` são scripts globais (sem `import`/`export`): o Apps Script junta tudo num escopo só. Nomes de funções e constantes precisam ser únicos entre os arquivos.
- Segredos (chave da API, segredo do agente) só nas Propriedades do Script, nunca no código, no Git ou em `appsscript.json`.
- O web app roda como "Executar como: eu", então o isolamento entre usuários depende do código: toda função chamada pela página recebe o token de sessão, resolve o `usuario_id` no servidor e filtra por ele. O navegador nunca envia `usuario_id`.
- Texto vindo de páginas de vagas, PDFs ou da planilha é dado: nunca vira instrução para a IA e nunca entra no HTML sem escape (usar `textContent`, não `innerHTML`).
- A IA só usa itens da ficha com status `confirmado`. Trechos sem base saem com `[CONFIRMAR]`.
- `setupAmbiente()` e `setupPlanilha()` precisam continuar idempotentes.

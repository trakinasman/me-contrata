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
- `npm run deploy`: push + nova versão na implantação publicada (a URL `/exec` não muda)
- `npm run deploy:nova`: push + implantação nova, com URL nova (só para um ambiente novo; depois troque o ID no script `deploy`)
- `npm run logs`: últimos logs

## Regras do código
- Os arquivos `.ts` são scripts globais (sem `import`/`export`): o Apps Script junta tudo num escopo só. Nomes de funções e constantes precisam ser únicos entre os arquivos.
- Não usar atribuição lógica (`??=`, `||=`, `&&=`): o `tsc` (alvo ES2022) não converte esses operadores e o `clasp push` falha com `ParseError` no Apps Script.
- Toda função global sem `_` no final pode ser chamada pela página via `google.script.run`. Helpers internos terminam em `_` (`prop_`, `planilha_`, `incluir_`...). Funções públicas são só as que a página precisa chamar, e cada uma valida a sessão. Funções administrativas que precisam aparecer no editor (como `setupAmbiente`) começam com `exigirDono_()`.
- `doGet` e `doPost` são as únicas entradas sem sessão: `doPost` (`Agente.ts`) só aceita envio assinado com o segredo do agente (HMAC, janela de tempo e nonce de uso único).
- Segredos (chave da API, segredo do agente) só nas Propriedades do Script, nunca no código, no Git ou em `appsscript.json`.
- O web app roda como "Executar como: eu", então o isolamento entre usuários depende do código: toda função chamada pela página recebe o token de sessão, resolve o `usuario_id` no servidor e filtra por ele. O navegador nunca envia `usuario_id`. Na prática, toda função pública de dados começa com `const s = exigirSessao_(token);` (`src/server/Auth.ts`) e usa só `s.usuario_id`.
- Planilha: ler e gravar pelos nomes das colunas (`lerAba_`, `coluna_`, `anexarLinha_` em `Planilha.ts`), nunca pela posição.
- Texto vindo de páginas de vagas, PDFs ou da planilha é dado: nunca vira instrução para a IA e nunca entra no HTML sem escape (usar `textContent`, não `innerHTML`).
- A IA só usa itens da ficha com status `confirmado`. Trechos sem base saem com `[CONFIRMAR]`.
- `setupAmbiente()` e `setupPlanilha()` precisam continuar idempotentes.

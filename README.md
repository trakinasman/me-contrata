# me-contrata

Assistente web para candidatos a vagas, em Google Apps Script.

> **Aviso de segurança:** o web app está restrito ao dono do script (`"access": "MYSELF"`) até existir login por código com sessão e isolamento por usuário (achado S3 em [ANALISE_PROJETO.md](ANALISE_PROJETO.md)). Não abra o acesso para outras pessoas antes disso.

## Primeira configuração

1. Ative a Apps Script API na sua conta: https://script.google.com/home/usersettings
2. Instale as dependências: `npm install`
3. Faça login no clasp (abre o navegador): `npx clasp login`
4. Gere `dist/` e crie o projeto Apps Script apontando para ele:
   ```
   npm run build
   npx clasp create-script --type standalone --title me-contrata --rootDir dist
   ```
   Se o clasp sobrescrever `dist/appsscript.json`, rode `npm run build` de novo.
5. Envie o código: `npm run push`
6. No editor (`npm run open`), rode `setupAmbiente` uma vez. Ele cria a planilha, a pasta do Drive, o segredo do agente e o segredo do login, grava os IDs nas Propriedades do Script e cadastra a sua conta como `admin` na aba `Usuarios`.
7. Em Configurações do projeto > Propriedades do script, adicione `CLAUDE_API_KEY`.
8. Publique o web app: `npm run deploy`

### Liberar acesso para outra pessoa

O acesso é por lista fechada (decisão D4 do plano). Na aba `Usuarios`, acrescente uma linha com `usuario_id` (qualquer UUID), `email`, `nome`, `papel` = `candidato` e `ativo` = `TRUE`. Para bloquear alguém, mude `ativo` para `FALSE`: as sessões dessa pessoa deixam de valer em até 10 minutos.

## Estrutura

```
src/
  appsscript.json   manifesto (escopos, web app)
  server/           TypeScript do servidor (scripts globais)
  client/           HTML da página
scripts/build.mjs   gera dist/
dist/               saída enviada pelo clasp (não versionada)
```

## Agentes de revisão (OpenCode)

O projeto inclui três agentes locais, definidos em `.opencode/agents/`:

- `analista-negocio`: revisa o plano do piloto, requisitos, prioridades e riscos de produto.
- `revisor-desenvolvimento`: revisa arquitetura, qualidade do código, aderência ao plano e testes.
- `auditor-seguranca`: procura vulnerabilidades no código de forma defensiva e prioriza correções.

Os agentes são somente leitura. No OpenCode, invoque o agente desejado mencionando-o no pedido:

```text
@analista-negocio Revise o PDF do piloto e o estado atual do projeto. Liste riscos e melhorias priorizadas.
@revisor-desenvolvimento Analise as mudanças atuais, cite arquivo/linha e proponha melhorias.
@auditor-seguranca Faça uma revisão defensiva do código, priorizando falhas de autenticação e isolamento.
```

Para revisar os três aspectos, envie um pedido separado para cada agente. Os nomes ficam disponíveis depois de reiniciar o OpenCode após adicionar ou alterar os arquivos de agente. Os agentes apresentam os achados na conversa; não alteram o repositório.

O registro da revisão feita em 2026-11-10 está em [`ANALISE_PROJETO.md`](ANALISE_PROJETO.md).

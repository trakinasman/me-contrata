# me-contrata

Assistente web para candidatos a vagas, em Google Apps Script.

> **Andamento:** Etapa 1 do piloto concluída (login, sessão e LGPD). Etapa 2 em andamento: a ficha do candidato (E2-01) está implementada. Veja [PROXIMOS_PASSOS.md](PROXIMOS_PASSOS.md).

> **Acesso:** o web app abre para qualquer pessoa (`"access": "ANYONE_ANONYMOUS"`), mas só entra quem está ativo na aba `Usuarios` (login por código). O isolamento entre usuários foi testado com duas contas em 11/11/2026 (achado S3 em [ANALISE_PROJETO.md](ANALISE_PROJETO.md)). Toda função nova com dados precisa começar por `exigirSessao_`/`exigirAceite_`.

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

O acesso é por lista fechada (decisão D4 do plano). Na aba `Usuarios`, acrescente uma linha com `email` e marque a caixa `ativo` (`TRUE`) (e, se quiser, `nome`). O `usuario_id` e o `criado_em` são preenchidos sozinhos no primeiro login; `papel` vazio vale como `candidato`. Para bloquear alguém, mude `ativo` para `FALSE`: as sessões dessa pessoa deixam de valer em até 10 minutos.

Se alguém errar o código 5 vezes, o e-mail fica bloqueado por 1 hora. Para liberar antes, rode `desbloquearLogins` no editor: ela libera todos os e-mails da aba `Usuarios`.

### Se alguém não recebe o código

A página responde sempre a mesma mensagem, para não revelar quem está cadastrado. O motivo real fica na aba `Log`:

| `evento` | `detalhe` | O que fazer |
|---|---|---|
| `login_codigo_enviado` | | O e-mail saiu. Procure por "código de acesso" na caixa de entrada; para a conta dona, o remetente aparece como "eu" |
| `login_email_nao_cadastrado` | `nao_encontrado` | O e-mail não está na aba `Usuarios`. Para a conta dona, rode `setupAmbiente` |
| `login_email_nao_cadastrado` | `inativo` | A linha existe, mas a caixa `ativo` não está marcada |
| `login_limite_pedidos` | | Mais de 3 pedidos na última hora (conta mesmo para e-mail não cadastrado). Espere ou rode `desbloquearLogins` |
| `login_recusado` | `nao_encontrado` ou `inativo` | O código estava certo, mas o cadastro foi apagado ou desativado depois do envio |

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

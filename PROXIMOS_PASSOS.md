# Próximos passos

**Atualizado em:** 11/11/2026, com a E2-01 implementada (branch `etapa2/e2-01-ficha`).
**Fonte:** plano do piloto "Funil de Candidaturas — Skills e piloto da página" (doc no claude.ai) e [`ANALISE_PROJETO.md`](ANALISE_PROJETO.md).

A Etapa 1 (base, login, sessão e LGPD) está concluída e testada. A **Etapa 2 (ficha do candidato)** está em andamento: ela traz as primeiras funções com dados de verdade, que permitem o teste de isolamento com dois usuários. Só depois desse teste o web app pode ser aberto para outras pessoas.

## Onde estamos

| Etapa | Situação | Observação |
|---|---|---|
| 0 — Preparação | Parcial | P0-02 (projeto, planilha, pasta) e P0-03 (chave da API) feitos. Falta confirmar o teto de gasto mensal no Console da Anthropic. P0-01 (scripts `build_cv_*.js`) e P0-04 (revisar `voice.md`) ficam fora deste repositório |
| 1 — Base e login | Concluída | E1-03, E1-04, E1-05 testados. As validações de UF, `ativo` e Preferencias (achado D1) entraram com a E2-01. E1-02 só com a navegação provisória; as telas vêm nas próximas etapas |
| 2 — Ficha do candidato | **Em andamento** | E2-01 implementada e enviada ao Apps Script (`/dev`), falta testar a tela da ficha. Ver abaixo |
| 3 — Agente gravando na planilha | A fazer | Depende de decidir o modelo de vagas (D2) |
| 4 a 8 — Perfil, vagas, funil, skill, piloto | A fazer | Ordem do plano; a skill `li-candidatura` (etapa 7) precisa estar pronta antes da E5-03 |

## Etapa 2 — Ficha do candidato

| ID | Entrega | Critério de aceite | Observações para implementar |
|---|---|---|---|
| E2-01 | Tela da ficha nas seções do `voice.md`, com status por item (confirmado, a confirmar, proibido) | O candidato edita e muda o status de cada item | Primeira função com dados: toda função começa com `exigirAceite_(token)`. Base visual: aba Perfil > Ficha do `prototipo/index.html` |
| E2-02 | Rascunho da ficha a partir do PDF: a IA propõe itens, todos como "a confirmar" | Nenhum item gerado entra como confirmado sem clique do candidato | Depende do upload de PDF (E4-01). Extrair o texto uma vez e guardar (decisão A2) |
| E2-03 | Migrar a ficha do Roberto a partir do `voice.md` e da memória | Itens da lista "não afirmar" entram como proibidos | Precisa do `voice.md` revisado (P0-04) |

**E2-01 implementada (11/11/2026):** `src/server/Ficha.ts` (`listarFicha`, `salvarItemFicha`, `excluirItemFicha`) e a tela Perfil > Ficha em `Index.html`. A coluna `item` da aba Fichas guarda o ID do item. Testada localmente com Apps Script simulado (isolamento entre dois usuários, sessão, termo, validações, texto que começa com `=`). Já está no Apps Script (`npm run push`) e o login na URL `/dev` funciona; falta testar a tela da ficha no web app. Nomes das seções conferidos com o `voice.md` (`C:\Github\linkedin\memoria_claude\voice.md`): "Como escrevo" (tom dos textos; no `voice.md` é "Como soo", de soar) e "Minhas posições". A seção "Personalidade" do `voice.md` virou a seção `personalidade` da ficha, depois de "Como escrevo" (rodar `setupAmbiente()` para a validação da aba Fichas aceitar o ID novo).

**E2-03 migrada (11/11/2026):** 65 itens gravados na aba Fichas para a conta dona, com `origem = migracao_voice`, a partir do `voice.md` e da memória do projeto LinkedIn: 52 confirmados, 9 proibidos (o que não pode ser afirmado) e 4 a confirmar (3 posições marcadas [REVISAR] e a regra de não sinalizar busca de emprego em texto público). Ficam de fora: a lista de cargos e as preferências de trabalho (vão para a tela de Preferências), as notas das skills do LinkedIn e o post da Apronet com nomes de terceiros. Falta o Roberto revisar na tela, confirmar ou cortar os 4 itens a confirmar e apagar os itens de teste.

**Teste de isolamento (11/11/2026): passou.** Duas contas na `/dev`, 2 itens em cada: cada conta vê só os seus. Corrigida também a tela em branco ao clicar no menu (links `#` com `<base target="_top">` no iframe do Apps Script; a rota agora usa `google.script.history`). Com isso, o acesso do manifesto passou de `MYSELF` para `ANYONE_ANONYMOUS` e saiu a primeira versão publicada (`npm run deploy`). O login continua por lista fechada na aba `Usuarios`.

## Etapa 3 — Agente gravando na planilha

| ID | Entrega | Critério de aceite |
|---|---|---|
| E3-01 | `buscar_vagas.py` envia as vagas para um `doPost` do web app, com segredo compartilhado | Vagas chegam à aba Vagas; chamada sem o segredo é recusada |
| E3-02 | O agente lê a configuração de cada usuário da aba Preferencias | Uma execução por usuário ativo; `config.json` fica só com as listas gerais |
| E3-03 | Mapear UF e modalidade para o filtro de cada fonte | Teste com SC, RS e remoto devolve vagas em todas as fontes |
| E3-04 | Listas de nível, área e exclusão por usuário, geradas pela IA e revisadas | O Roberto mantém as listas atuais; um 2º usuário recebe listas próprias |
| E3-05 | Deduplicar por fonte+id e por título+empresa; vaga descartada nunca é recriada | Rodar duas vezes seguidas não duplica nada |

**Antes de começar:** decidir o modelo de vagas (D2: catálogo único de vagas + estado por candidato, ou uma linha por candidato). Na E3-01, aplicar os controles do achado S5: validar formato e tamanho do payload, limitar volume, não registrar o segredo em logs e evitar duplicação.

**Registro de 11/11/2026:**
- O primeiro `npm run push` falhou com `ParseError: Unexpected token =` porque o parser do Apps Script não aceita atribuição lógica (`??=`, `||=`, `&&=`), e o `tsc` com alvo ES2022 não converte esses operadores. A regra foi para o `CLAUDE.md`.
- O login parou de funcionar porque a aba `Usuarios` ficou vazia (o conteúdo foi apagado na planilha, não pelo app). `setupAmbiente()` recadastrou a conta dona. Para facilitar o próximo diagnóstico, o Log agora registra o motivo da recusa (`nao_encontrado` ou `inativo`); veja "Se alguém não recebe o código" no README.

## Pendências técnicas

| Item | Quando |
|---|---|
| ~~Gatilho diário para apagar sessões vencidas da aba `Sessoes`~~ | Feito: `limparSessoesVencidas`, gatilho criado por `setupAmbiente()` (pede autorização nova do escopo `script.scriptapp`) |
| ~~Completar validações da planilha: UFs, `ativo`, Preferencias (D1)~~ | Feito com a E2-01 (`VALIDACOES_ESPECIAIS`). Rodar `setupAmbiente()` para aplicar. A validação no servidor das Preferencias vem com a tela de Preferências |
| Modelo de recomendações com ID e textos gerados (D3) | Antes da Etapa 6 |
| Upload de PDF de até 5 MB testado ponta a ponta, inclusive no celular (D6) | Na E4-01 |
| Pastas por usuário no Drive, coluna `pasta_id` (A1) | No primeiro upload (E4-01) |
| Comprovação por imagem e limpeza dos prints após 30 dias (A3) | Na Etapa 4 |
| Levar a skill `li-candidatura` (E7-01) para antes da E5-03 (D7) | Ao planejar a Etapa 5 |

## Operacional

- Tirar `C:\Github\me-contrata` da replicação do Google Drive: ela já criou cópias "(1)" de arquivos antigos, inclusive dentro de `.git`. O GitHub faz o papel de backup.
- Definir o teto de gasto mensal no Console da Anthropic (P0-03).
- Projeto Apps Script antigo (`1FSBG-ld6…`, de 09/11, outro computador): apagar em script.google.com se não for mais usado.

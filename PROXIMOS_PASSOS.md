# Próximos passos

**Atualizado em:** 12/11/2026, com a E3-02 concluída e testada no ambiente real.
**Fonte:** plano do piloto "Funil de Candidaturas — Skills e piloto da página" (doc no claude.ai) e [`ANALISE_PROJETO.md`](ANALISE_PROJETO.md).

A Etapa 1 (base, login, sessão e LGPD) está concluída e testada. A **Etapa 2 (ficha do candidato)** está em andamento: ela traz as primeiras funções com dados de verdade, que permitem o teste de isolamento com dois usuários. Só depois desse teste o web app pode ser aberto para outras pessoas.

## Onde estamos

| Etapa | Situação | Observação |
|---|---|---|
| 0 — Preparação | Parcial | P0-02 (projeto, planilha, pasta) e P0-03 (chave da API) feitos. Falta confirmar o teto de gasto mensal no Console da Anthropic. P0-01 (scripts `build_cv_*.js`) e P0-04 (revisar `voice.md`) ficam fora deste repositório |
| 1 — Base e login | Concluída | E1-03, E1-04, E1-05 testados. As validações de UF, `ativo` e Preferencias (achado D1) entraram com a E2-01. E1-02 só com a navegação provisória; as telas vêm nas próximas etapas |
| 2 — Ficha do candidato | **Em andamento** | E2-01 implementada e enviada ao Apps Script (`/dev`), falta testar a tela da ficha. Ver abaixo |
| 3 — Agente gravando na planilha | **Em andamento** | D2 decidido (catálogo + estado por candidato). E3-01 e E3-02 concluídas e testadas no ambiente real (12/11/2026). Próxima: E3-03 |
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

**D2 decidido (11/11/2026): catálogo + estado por candidato.** A aba `Vagas` é o catálogo, uma linha por anúncio, com `vaga_id = "<fonte>:<id na fonte>"` (ex.: `gupy:12781855`) e sem `usuario_id`. Nota, motivos e descarte de cada candidato ficam em `VagasCandidato` (`usuario_id + vaga_id`). A página nunca lista o catálogo inteiro, só as vagas com linha do candidato. Na exclusão de dados (LGPD) saem as linhas de `VagasCandidato`; o catálogo é anúncio público e fica.

**E3-01 implementada (11/11/2026):** `src/server/Agente.ts` (`doPost`) e `agente_vagas/enviar_me_contrata.py` no projeto `linkedin`, chamado no fim do `buscar_vagas.py`. Controles do S5: o segredo não trafega (assinatura HMAC-SHA256 de `ts.nonce.dados`), janela de 5 min e nonce de uso único contra repetição, até 1 MB por envio, 300 vagas por envio e 60 envios por hora, validação e corte de cada campo, link só `https`, recusas com resposta genérica e motivo na aba `Log` sem o segredo. Vaga que o candidato já tem, inclusive descartada, não é recriada. Testada com Apps Script simulado (17 casos). Falta: rodar `setupAmbiente()` (cria `VagasCandidato` e refaz a aba `Vagas`, que estava vazia), `npm run deploy`, configurar o `me_contrata_local.json` do agente (README) e rodar o agente de verdade. A dedup por título+empresa entre portais fica para a E3-05.

**E3-01 concluída (12/11/2026):** `setupAmbiente()` rodado, versão @6 publicada (`npm run deploy`) e `me_contrata_local.json` configurado em `C:\Github\linkedin\agente_vagas\`. Resultado no ambiente real:
- 3 envios do agente: o 1º gravou 41 vagas; o 2º, com as mesmas vagas, não duplicou nada (`ja_tinha 41`); o 3º trouxe só as 16 novas. Catálogo com 57 vagas de Gupy, Catho, InHire, InfoJobs e Sólides, todas com linha em `VagasCandidato`.
- POST sem assinatura e com assinatura inventada: os dois recusados com `nao_autorizado`, motivo no `Log` (`formato`, `assinatura`) e nenhuma vaga gravada.

Observado para as próximas entregas:
- A mesma vaga em portais diferentes (ex.: Orsegups na Catho e no InfoJobs; RHESERVA na Catho e no InfoJobs; Auten Energy na Catho e na Sólides): E3-05.
- `local` sem padrão ("BR", "Todo Brasil", CEP, cidade fora de SC): E3-03.
- `publicada_em` mistura data com hora ISO (Gupy) e só data (demais portais): padronizar no `doPost`.
- Linha do `Log` de 11/11 15:45:36 com a URL da planilha na coluna `evento`: nenhum código grava isso (todas as chamadas de `registrarLog_` usam eventos fixos), então foi colada à mão na planilha. Pode ser apagada.
- Cópias do `me_contrata_local.json` (com o segredo) apareceram soltas neste repositório e foram apagadas; o `.gitignore` agora ignora `*_local.json`.

**E3-02 concluída (12/11/2026):** nova ação assinada `preferencias` no `doPost` (`src/server/Agente.ts`): devolve as preferências de cada usuário ativo que aceitou o termo e tem linha em `Preferencias` (só `usuario_id` e preferências; listas limpas, modalidade e UF só com valores válidos; nota mínima vazia = 50). O envio de vagas passou a recusar usuário sem o termo aceito. Versão @7 publicada.

No agente (`C:\Github\linkedin\agente_vagas\`, fora do Git): coleta uma vez; nota, seleção e envio uma vez por usuário (erro de um não para os outros). Saíram do `config.json` as cidades preferidas e a nota mínima; entrou `penalidade_pj` (30). O `usuario_id` do `me_contrata_local.json` passou a ser opcional e indica o dono do relatório HTML local; a última cópia das preferências do dono fica em `dados/preferencias_dono.json` para o relatório funcionar se o web app estiver fora. `python enviar_me_contrata.py` virou teste de conexão (lê as preferências, não grava).

| Preferência | Efeito na nota |
|---|---|
| `cidades` | +15 para vaga nessas cidades |
| `modalidades` | modalidade fora da lista: −35 (vazia = todas) |
| `idiomas` | quem fala inglês/espanhol não perde os 30 pontos de "exige idioma" |
| `aceita_pj` | desmarcado: vaga que menciona PJ perde 30 (inclui "CLT ou PJ") |
| `termos_excluir` | soma à lista geral de exclusão do título |
| `nota_minima` | substitui o 50 fixo (empresas-alvo seguem com 30) |
| `titulos`, `ufs` | ainda não usados: E3-03 e E3-04 |

Testes: com as preferências equivalentes às antigas, 216 combinações de vaga deram a mesma nota da versão anterior (só o texto dos motivos mudou: "cidade preferida" / "fora das cidades preferidas"). Execução real: 3.172 vagas analisadas, preferências de 1 usuário (o de teste, sem preferências, ficou de fora), 69 selecionadas para o Roberto, 17 novas e 52 já existentes. Das 17, 12 já tinham sido coletadas antes e só agora passaram da nota porque o Roberto marcou inglês (Radix, CARV Group, Atlas Governance).

Preferências do Roberto preenchidas na planilha: remoto, híbrido e presencial; SC; 7 cidades da Grande Florianópolis; aceita PJ; inglês; nota mínima 50.

Observado: 4 vagas presenciais fora de SC (São Paulo, Belo Horizonte, Brasília) entraram com nota exatamente 50, como já acontecia antes. A E3-03 (UF por vaga) deve resolver; até lá, subir a `nota_minima` para 55 corta esses casos.

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

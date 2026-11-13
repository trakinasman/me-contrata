# Próximos passos

**Atualizado em:** 13/11/2026, com a E4-03 (prints do perfil) implementada.
**Fonte:** plano do piloto "Funil de Candidaturas — Skills e piloto da página" (doc no claude.ai) e [`ANALISE_PROJETO.md`](ANALISE_PROJETO.md).

A Etapa 1 (base, login, sessão e LGPD) está concluída e testada. A **Etapa 2 (ficha do candidato)** está em andamento: ela traz as primeiras funções com dados de verdade, que permitem o teste de isolamento com dois usuários. Só depois desse teste o web app pode ser aberto para outras pessoas.

## Onde estamos

| Etapa | Situação | Observação |
|---|---|---|
| 0 — Preparação | Parcial | P0-02 (projeto, planilha, pasta) e P0-03 (chave da API) feitos. Falta confirmar o teto de gasto mensal no Console da Anthropic. P0-01 (scripts `build_cv_*.js`) e P0-04 (revisar `voice.md`) ficam fora deste repositório |
| 1 — Base e login | Concluída | E1-03, E1-04, E1-05 testados. As validações de UF, `ativo` e Preferencias (achado D1) entraram com a E2-01. E1-02 só com a navegação provisória; as telas vêm nas próximas etapas |
| 2 — Ficha do candidato | **Em andamento** | E2-01 implementada e enviada ao Apps Script (`/dev`), falta testar a tela da ficha. Ver abaixo |
| 3 — Agente gravando na planilha | Concluída | D2 decidido (catálogo + estado por candidato). E3-01 a E3-05 concluídas e testadas no ambiente real (12/11/2026) |
| 4 — Perfil | **Em andamento** | E4-01 e E4-02 concluídas (12/11/2026). E4-03 (prints) implementada em 13/11/2026, falta o teste real; as perguntas, alternativa aos prints, esperam decisão. E4-05 pode ser feita em paralelo |
| 5 a 8 — Vagas, funil, skill, piloto | A fazer | Ordem do plano; a skill `li-candidatura` (etapa 7) precisa estar pronta antes da E5-03 |

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
| E3-04 | Listas de nível, área e exclusão por usuário, geradas pela IA e revisadas. Inclui as empresas-alvo (decidido em 12/11/2026) | O Roberto mantém as listas atuais; um 2º usuário recebe listas próprias |
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

**E3-03 concluída (12/11/2026), só no agente (sem mudança no servidor):** a coleta deixou de ter SC fixo. As preferências são lidas antes da coleta, e a união das UFs de todos os usuários (mais o remoto, se alguém aceitar) define as buscas: Gupy `state=<estado>`, InfoJobs `empregos-em-<estado>.aspx`, Catho `/vagas/<termo>/<uf>/` (a UF da vaga vem da busca, porque o card da Catho não traz). Sólides, InHire, Michael Page e empresas-alvo não têm filtro de local: trazem o Brasil todo e a nota filtra. Saiu `buscas` do `config.json`; `termos_sc` virou `termos_uf`. Cada vaga ganha a UF (sigla ou nome do estado), e a coluna `local` das vagas novas chega como "Cidade/UF".

Nota: presencial ou híbrida em estado fora das preferências perde `penalidade_fora_do_estado` (60, antes 35); quem tem UFs e nenhuma cidade ganha +15 nas vagas do seu estado. Para o Roberto (só SC) só muda a vaga presencial/híbrida em outro estado; remoto, Grande Florianópolis, resto de SC e UF desconhecida ficam iguais.

Testes: coleta reduzida com SC, RS e remoto devolveu vagas em todas as fontes (Gupy 40/36/35, InfoJobs 81/103/108, Catho 56/59/42, Sólides 13/11/22, InHire 91/35/266, empresas-alvo 3/21/3; Michael Page sem filtro de local e hoje quase só com vagas em SP). Dois bugs achados e corrigidos no teste: variável `slug` escondendo a função no InfoJobs remoto; local "Santa Catarina" da Michael Page não virava UF. Execução real: 3.171 vagas, 62 selecionadas para o Roberto (eram 69), nenhuma nova; as 7 que saíram são presenciais/híbridas em outros estados.

Pendência: vaga que já foi enviada e depois cai abaixo da nota continua em `VagasCandidato` (o `doPost` só cria, nunca atualiza). Decidir na E3-05 se a nota é atualizada ou a vaga é marcada.

**Empresas-alvo entram na E3-04 (decidido em 12/11/2026).** Hoje `empresas_alvo_gupy` (páginas de carreira lidas inteiras) e `grupos_empresas` (EACE, SEDUC, FUST: +15 pontos e nota mínima 30) estão no `config.json` e valem para todos, mas são do Roberto. Na E3-04 passam a ser por usuário: a coleta lê as páginas de carreira de todas as empresas-alvo de todos os usuários (uma vez, como as UFs), e o bônus e a nota mínima menor valem só para quem marcou a empresa. As listas atuais vão para a conta do Roberto, sem mudar o resultado dele.

Observado: 4 vagas presenciais fora de SC (São Paulo, Belo Horizonte, Brasília) entraram com nota exatamente 50, como já acontecia antes. Resolvido na E3-03 (penalidade de 60 para outro estado).

**E3-04 concluída (12/11/2026).** Servidor (versão @9):
- Aba nova `ListasBusca` (`usuario_id, lista, termos, status, origem, atualizado_em`), uma linha por lista: `termos_busca`, `nivel`, `area`, `area_fraca`, `projetos_remoto`, `excluir`, `palavras_descricao`, `empresas_carreira` ("Nome|subdominio") e `grupo:<nome>`. O agente só recebe as `aprovada` (várias linhas aprovadas da mesma lista são somadas), junto com as preferências. Subdomínio de carreira só `[a-z0-9-]`. Entra na exclusão LGPD automaticamente (tem `usuario_id`).
- Primeira chamada à IA (`src/server/IA.ts`): HTTP direto via `UrlFetchApp` (o Apps Script não tem SDK), modelo de `Config.ts`, JSON validado por schema, `fallbacks: "default"` contra recusa, uso e custo estimado em `Uso_IA`, erros no `Log` sem a chave nem o conteúdo.
- `src/server/ListasBusca.ts`: `gerarListasBusca(token)` (para a futura tela) e `gerarListasPendentes()` (editor, `exigirDono_`, só para quem ainda não tem listas). Usa só itens confirmados das seções de carreira da ficha, tratados como dado; limite de 3 gerações por usuário por dia; tudo sai `a_revisar` e nunca sobrescreve listas aprovadas. Empresas-alvo não são geradas pela IA.
- Revisão das listas, por enquanto, na planilha (decidido em 12/11/2026): trocar `a_revisar` por `aprovada`. A tela vem com a de Preferências.

Agente (fora do Git): nota, grupos e nota mínima de empresa-alvo por usuário, com as listas dele; coleta com a união das páginas de carreira de todos, termos extras (`termos_busca` e `titulos` das Preferências) em todas as fontes e filtro da InHire pelo nível de qualquer usuário. Usuário sem listas aprovadas de nível e área fica de fora. O `config.json` ficou só com a configuração geral (termos de busca base, páginas, pausas, InHire, penalidades, nota mínima de empresa-alvo).

Migração: as listas do Roberto saíram do `config.json` para a `ListasBusca` como `aprovada`/`migracao` (10 linhas). Teste: 480 combinações de vaga com a mesma nota e os mesmos grupos de antes.

Teste com 2º usuário (conta de teste, perfil fictício de coordenação de marketing em Porto Alegre, `origem = teste_ficticio` na ficha): a IA gerou as listas (US$ 0,0096; 1.531 tokens de entrada e 658 de saída). Na revisão saíram `pleno` e `senior` de `excluir` e `digital` foi de `area` para `area_fraca`; o prompt foi ajustado para esses casos. Execução real: 4.115 vagas analisadas (RS, SC e remoto, 12 termos extras); Roberto com 54 vagas (eram 62: o inglês saiu das preferências dele porque a ficha diz que é limitado, e vagas que exigem inglês fluente voltaram a perder 30); conta de teste com 89 vagas, as ~19 melhores exatamente do perfil (e-commerce, marketing, growth, mídia paga em Porto Alegre e remoto). As outras ~70 eram de vendas com nota 50, por `comercial`/`vendas` em `area_fraca`: removidos da conta de teste, e o prompt agora só aceita em `area_fraca` áreas que o candidato aceitaria.

Para a E3-05 ou depois: "nível + área genérica + local bom" soma exatamente 50, a nota mínima padrão, e passa (acontece também com o Roberto). Resolvido na E3-05 (nota mínima 55). As 89 vagas da conta de teste ficam em `VagasCandidato` (o `doPost` não apaga).

**E3-05 concluída (12/11/2026).** Servidor (versão @10):
- fonte+id e "descartada nunca é recriada" já vinham da E3-01 (`vaga_id = fonte:id`; vaga que o candidato já tem nunca é recriada).
- Título+empresa: se o candidato já tem uma vaga com o mesmo título e a mesma empresa (sem acento, maiúscula, pontuação e espaços), o anúncio de outro portal entra só no catálogo, sem nova linha em `VagasCandidato` (conta como `duplicadas`). Vale também dentro do mesmo envio. Empresa vazia ou confidencial não gera chave. Limitação: nome de empresa diferente entre portais ("RHESERVA" e "RHESERVA CONSULTORIA") não junta.
- Vaga que o candidato já tem, não descartada: nota, motivos e `selecionada_em` (coluna nova) atualizados a cada envio. Vaga que deixa de vir (nota caiu ou anúncio fechou) fica com o `selecionada_em` antigo, sem ser apagada: decidido em 12/11/2026 que a página mostra como vigente só o que foi selecionado recentemente (definir a janela na Etapa 5).
- Nota mínima padrão 55 (decidido em 12/11/2026); a do Roberto também foi para 55.

Agente: o resumo do envio mostra as atualizadas e as repetidas de outro portal.

Teste real: com a mesma busca da execução das 19:38, os dois usuários tiveram `candidato +0` (Roberto 40 vagas, todas com nota atualizada; conta de teste 24). A queda (54 → 40 e 89 → 24) vem da nota mínima 55 e da retirada de `comercial`/`vendas` da conta de teste. Uma segunda execução seguida foi interrompida pelo Claude Code por falta de memória, antes de enviar. A dedup por título+empresa ainda não teve caso real (nenhuma vaga nova nessa execução): conferir no `Log` (`duplicadas`) quando aparecer uma vaga nova publicada em dois portais.

As linhas antigas de `VagasCandidato` (antes da E3-05) estão com `selecionada_em` vazio até o agente selecioná-las de novo.

## Etapa 4 — Perfil

Do plano do piloto: E4-01 upload do PDF; E4-02 `analisarPerfil()` (PDF + rubrica de 12 itens + ficha, resposta em JSON); E4-03 perguntas sobre o que o PDF não mostra; E4-04 reescritas (título, Sobre, experiência atual); E4-05 `humanizarPT()` (porta do `humanize.py`, sem dependência); E4-06 histórico da nota.

**E4-01 concluída (12/11/2026, versão @11).** Aba Perfil > Currículo: o candidato escolhe "Meu currículo" ou "PDF do perfil do LinkedIn" e envia um PDF de até 5 MB; embaixo, a lista dos arquivos enviados (data e páginas). `src/server/Curriculos.ts` (`enviarCurriculo`, `listarCurriculos`):
- O servidor confere de novo o que a página já conferiu: tamanho (até 5 MB), base64 válido e assinatura `%PDF-`. Limite de 10 envios por usuário por dia.
- Pasta do usuário criada no primeiro upload dentro da pasta raiz (achado A1): nome = `usuario_id`, nunca o e-mail; ID em `Usuarios.pasta_id`; se a pasta guardada sumir, cria outra uma vez. Nome do arquivo gerado no servidor (`<tipo>-<data-hora>.pdf`).
- Registro na aba `Curriculos` (páginas contadas no PDF quando possível) e no `Log`. A exclusão LGPD já apaga a pasta inteira.

Testes no ambiente real: currículo de 329 KB pelo computador (2 páginas, pasta criada, arquivo privado); arquivo falso renomeado para `.pdf` recusado pelo servidor sem gravar nada; PDF de mais de 5 MB recusado pela página antes de enviar; PDF do LinkedIn de 69 KB pelo celular (5 páginas, mesma pasta); PDF de 4,8 MB pelo computador (cerca de 7 s no servidor). Fecha a D6.

Limpeza pendente: apagar do Drive e da aba `Curriculos` (linha de 12/11 22:45:50) o PDF de teste de 4,8 MB.

**E4-02 concluída (12/11/2026, versão @13).** `src/server/Analise.ts` (`analisarPerfil`, `ultimaAnalise`) e o card "Nota do perfil" na aba Perfil > Currículo:
- Rubrica `li-profile` 1.0 (12 itens, 100 pontos), da skill do projeto LinkedIn (`memoria_claude/skills/li-profile/rubric.json`), traduzida sem mudar pontos nem critérios. Fica no código e o `setupAmbiente()` grava na aba `Rubricas` se a versão não estiver lá; a análise lê da aba e registra `li-profile@1.0` em `Analises`.
- Texto do PDF extraído uma vez (achado A2): o Drive converte o PDF em Google Doc temporário (OCR se preciso), exporta como texto e o Doc é apagado; o `.txt` fica na pasta do usuário e o ID vai para `Curriculos.texto_drive_id` (coluna nova). Sem custo de IA.
- A IA recebe o texto do perfil, a rubrica e os itens confirmados da ficha (sem os de tom), dentro de tags como dado. Destaques, banner, foto e atividade (30 pontos) saem "não avaliados" e a nota fica parcial, com o máximo possível. Resposta fora da rubrica (item faltando, nota fora do intervalo, motivo vazio) gera uma nova tentativa; se falhar de novo, erro, nunca nota inventada. Limite de 5 análises por usuário por dia.

Teste real com o PDF do LinkedIn do Roberto: **46 de 100, parcial (até 76)**; US$ 0,0275 (7.737 tokens de entrada, 1.199 de saída); `.txt` gravado; motivos usaram a ficha (4.100 escolas, MTTR, rotatividade). Dois ajustes depois do teste: (1) a página mostrava "undefined" nos itens não avaliados porque o `google.script.run` descarta campos `null` do objeto devolvido; (2) o prompt passou a não apontar inconsistência de data entre cargos da mesma empresa (a IA tinha acusado a Quantum13, de analista em nov/2025 a coordenador em mar/2026).

**E4-03, decidido em 12/11/2026: prints do perfil, com perguntas como alternativa.** Na mesma tela da nota, o candidato envia até 3 prints (topo do perfil com foto e banner, seção Destaques, aba Atividade); a IA avalia os 4 itens com a mesma rubrica e a nota deixa de ser parcial. Quem não quiser mandar print responde perguntas (item só declarado pode valer menos, por não ter como conferir). Os prints são apagados 30 dias após o envio por gatilho diário, ficando a nota e o motivo (achado A3, como o termo de aceite já promete).

**E4-03 implementada (13/11/2026), parte dos prints.** `src/server/Prints.ts` (`avaliarPrints`, `limparPrintsVencidos`) e o bloco "Complete a nota com prints" no card da nota (aparece depois da primeira análise):
- Três prints, todos opcionais: topo do perfil (foto e banner), seção Destaques e aba Atividade. A IA avalia só os itens dos prints enviados, com a mesma rubrica; o resto da nota não muda.
- O navegador reduz cada print para no máximo 1568 px no lado maior e converte para JPEG (o envio fica pequeno e os metadados da imagem não vão junto). O servidor confere de novo: até 2 MB, tipo pelos primeiros bytes (PNG, JPEG ou WebP, não o que o navegador diz), um print de cada tipo, até 5 avaliações por dia.
- O print vai para a pasta do usuário e para a aba nova `Prints`. A nota nova é a última análise com os itens dos prints trocados, gravada como linha nova em `Analises` (o histórico fica); os itens levam `fonte: "print"`. Print que não mostra o item (outra tela, cortado) não apaga a nota anterior desse item. Uma nova análise do PDF mantém os itens avaliados por print.
- Gatilho diário `limparPrintsVencidos` (criado por `setupAmbiente()`): apaga do Drive os prints com mais de 30 dias e marca `apagado_em`; a nota fica. Fecha o achado A3.
- Imagem e texto dentro dela são dado: o system prompt diz que nada ali é instrução. A data de hoje vai no prompt para a IA julgar a Atividade ("3 d", "2 sem").

Testes com Apps Script simulado (33 casos): mesclagem da nota (46 → 53 com topo e atividade; deixa de ser parcial com os 4 itens), tipo pelos bytes, recusas sem gastar IA, resposta fora da rubrica, limite diário, isolamento entre usuários, nova análise do PDF mantendo os prints, limpeza de 30 dias (inclusive arquivo já apagado) e recusa da limpeza para quem não é o dono. Falta: rodar `setupAmbiente()` (aba `Prints` e gatilho novo), testar na `/dev` com prints reais, inclusive pelo celular, e publicar.

**Perguntas como alternativa aos prints: esperam decisão.** Falta definir quanto vale um item só declarado (sem print para conferir), por exemplo metade dos pontos.

**Registro de 11/11/2026:**
- O primeiro `npm run push` falhou com `ParseError: Unexpected token =` porque o parser do Apps Script não aceita atribuição lógica (`??=`, `||=`, `&&=`), e o `tsc` com alvo ES2022 não converte esses operadores. A regra foi para o `CLAUDE.md`.
- O login parou de funcionar porque a aba `Usuarios` ficou vazia (o conteúdo foi apagado na planilha, não pelo app). `setupAmbiente()` recadastrou a conta dona. Para facilitar o próximo diagnóstico, o Log agora registra o motivo da recusa (`nao_encontrado` ou `inativo`); veja "Se alguém não recebe o código" no README.

## Pendências técnicas

| Item | Quando |
|---|---|
| ~~Gatilho diário para apagar sessões vencidas da aba `Sessoes`~~ | Feito: `limparSessoesVencidas`, gatilho criado por `setupAmbiente()` (pede autorização nova do escopo `script.scriptapp`) |
| ~~Completar validações da planilha: UFs, `ativo`, Preferencias (D1)~~ | Feito com a E2-01 (`VALIDACOES_ESPECIAIS`). Rodar `setupAmbiente()` para aplicar. A validação no servidor das Preferencias vem com a tela de Preferências |
| Modelo de recomendações com ID e textos gerados (D3) | Antes da Etapa 6 |
| ~~Upload de PDF de até 5 MB testado ponta a ponta, inclusive no celular (D6)~~ | Feito na E4-01 (12/11/2026): 4,8 MB pelo computador e PDF do LinkedIn pelo celular |
| ~~Pastas por usuário no Drive, coluna `pasta_id` (A1)~~ | Feito na E4-01: pasta criada no primeiro upload, nome = `usuario_id` |
| ~~Extrair o texto do PDF uma vez e guardar (A2)~~ | Feito na E4-02: o Drive converte o PDF em Doc e exporta texto; `.txt` na pasta do usuário |
| ~~Comprovação por imagem e limpeza dos prints após 30 dias (A3)~~ | Feito na E4-03 (13/11/2026): aba `Prints` e gatilho diário `limparPrintsVencidos` |
| Levar a skill `li-candidatura` (E7-01) para antes da E5-03 (D7) | Ao planejar a Etapa 5 |

## Operacional

- Tirar `C:\Github\me-contrata` da replicação do Google Drive: ela já criou cópias "(1)" de arquivos antigos, inclusive dentro de `.git`. O GitHub faz o papel de backup.
- Definir o teto de gasto mensal no Console da Anthropic (P0-03).
- Projeto Apps Script antigo (`1FSBG-ld6…`, de 09/11, outro computador): apagar em script.google.com se não for mais usado.

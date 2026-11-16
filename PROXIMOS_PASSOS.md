# Próximos passos

**Atualizado em:** 13/11/2026, com a E4-03 (completar a nota com prints ou respostas) publicada.
**Fonte:** plano do piloto "Funil de Candidaturas — Skills e piloto da página" (doc no claude.ai) e [`ANALISE_PROJETO.md`](ANALISE_PROJETO.md).

A Etapa 1 (base, login, sessão e LGPD) está concluída e testada. A **Etapa 2 (ficha do candidato)** está em andamento: ela traz as primeiras funções com dados de verdade, que permitem o teste de isolamento com dois usuários. Só depois desse teste o web app pode ser aberto para outras pessoas.

## Onde estamos

| Etapa | Situação | Observação |
|---|---|---|
| 0 — Preparação | Parcial | P0-02 (projeto, planilha, pasta) e P0-03 (chave da API) feitos. Falta confirmar o teto de gasto mensal no Console da Anthropic. P0-01 (scripts `build_cv_*.js`) e P0-04 (revisar `voice.md`) ficam fora deste repositório |
| 1 — Base e login | Concluída | E1-03, E1-04, E1-05 testados. As validações de UF, `ativo` e Preferencias (achado D1) entraram com a E2-01. E1-02 só com a navegação provisória; as telas vêm nas próximas etapas |
| 2 — Ficha do candidato | **Em andamento** | E2-01 implementada e enviada ao Apps Script (`/dev`), falta testar a tela da ficha. Ver abaixo |
| 3 — Agente gravando na planilha | Concluída | D2 decidido (catálogo + estado por candidato). E3-01 a E3-05 concluídas e testadas no ambiente real (12/11/2026) |
| 4 — Perfil | Concluída | E4-01 a E4-06 concluídas e publicadas (E4-06 na versão @21, 14/11/2026). Nota do Roberto: 46 parcial para 76, completa |
| 5 — Vagas | **Em andamento** | E5-01 publicada (@22 e @23). E5-02 (descrição) publicada (@24). E5-03 (adaptação por vaga) publicada, com ajustes depois do teste real (@27 a @34); E5-04 (editor) publicada em 15/11/2026 (@35); falta conferir na tela. E5-05 (currículo em PDF) implementada em 16/11/2026, falta publicar; próximo: E5-06 (mensagem ao recrutador) |
| 6 — Funil | A fazer | Etapas e aba Eventos já definidas (E5-01); falta a tela com a linha do tempo e os números |
| 7 — Skill `li-candidatura` | **Em andamento** | E7-01 aprovada pelo Roberto em 14/11/2026 (`skills/li-candidatura/SKILL.md`). E7-02 concluída em 15/11/2026 (Qive, Vetta e Unetvale): nenhum fato inventado. E7-03 (a skill embutida no build como prompt de `adaptarParaVaga()`) implementada em 15/11/2026, junto com a E5-03. Sobe para antes da E5-03 (achado D7) |
| 8 — Piloto | A fazer | |

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

**E4-03 publicada (13/11/2026, versão @14).** `src/server/Comprovacoes.ts` (`completarNotaPerfil`, `limparComprovacoesVencidas`) e o bloco "Completar a nota" na aba Perfil > Currículo, que aparece depois da primeira análise:
- Até 3 prints (topo do perfil, Destaques, Atividade) e/ou respostas a 4 perguntas, uma por item. A IA avalia os prints com a mesma rubrica; item que o print não mostra cai na resposta, se houver. Item só declarado vale até 70% dos pontos ("em parte", 35%; "não", 0).
- A página reduz o print a 1600 px e converte para JPEG. O servidor confere: até 2 MB, JPEG ou PNG pelos primeiros bytes, um print de cada tipo, até 5 envios por dia.
- A nota vira linha nova em `Analises` (o histórico fica, base para a E4-06); cada item guarda a origem (`pdf`, `print` ou `resposta`).
- Prints na pasta do usuário e na aba nova `Comprovacoes`. Gatilho diário `limparComprovacoesVencidas` (4h) apaga o arquivo depois de 30 dias e marca `apagado_em`; a nota fica. Fecha o achado A3.

Como chegou ao GitHub: a versão @14 foi feita e publicada por uma sessão em outro computador, sem commit. O TypeScript foi reconstruído a partir do JavaScript baixado do Apps Script (`clasp pull`), e o build ficou idêntico ao publicado nos 17 arquivos. Se aquele computador tiver mudanças nunca publicadas, elas não entraram.

Ajuste depois da @14: uma nova análise do PDF mantém os itens completados por print ou resposta. Antes eles voltavam a "não avaliado" (no teste simulado, a nota caía de 38 para 24). Testes com Apps Script simulado: 19 casos (recusas sem gastar IA, print + resposta, item não visível caindo na resposta, isolamento entre usuários, o ajuste e a limpeza de 30 dias).

Ajuste publicado na versão @15 (13/11/2026). O `.clasp.json` deste computador apontava para o projeto antigo `1FSBG-ld6…` (os `npm run push` daqui não chegavam ao app publicado); agora aponta para o real. Falta apagar o projeto antigo em script.google.com.

**Teste real (13/11/2026):** o Roberto mandou os 3 prints pela página. Nota de 46 (parcial, até 76) para **70 de 100**, completa: atividade 10/10, banner 6/6, foto 5/6, Destaques 3/8 (só um item). Prints na pasta dele e em `Comprovacoes`, `nota_completada` no Log, US$ 0,0087 na chamada. Falta o teste pelo celular.

**Recomendações e endossos (13/11/2026):** o PDF exportado do LinkedIn não traz a seção Recomendações (conferido no texto extraído do PDF do Roberto, que tem 3 recomendações de 05/11/2026), e a IA dava 0 de 8 dizendo que o perfil não tinha nenhuma. Também não traz os endossos, e a IA tirava pontos de Competências por isso. Correção: `recommendations` entrou nos itens que o PDF não mostra (sai "não avaliado"); o prompt manda avaliar a escolha das competências sem tirar pontos por endosso invisível; "Completar a nota" ganhou os prints de Recomendações e de Competências (com endossos) e a pergunta de recomendações. Os itens não visíveis no PDF somam agora 38 pontos. Testes com Apps Script simulado: 30 casos. Depois de publicar, rodar `setupAmbiente()`: a validação da coluna `tipo` de `Comprovacoes` precisa aceitar os dois tipos novos.

**Resposta declarada sobrescrevia print (13/11/2026, versão @17).** Um envio com os prints de recomendações e competências e 4 respostas trocou banner, foto e atividade (avaliados por print antes) pelas notas declaradas: o total ficou em 70 em vez de 76. Agora resposta nunca substitui item já avaliado por print, e a página desativa a pergunta desses itens. Depois de reenviar topo e atividade: **76 de 100, completa**, todos os 12 itens avaliados pela melhor fonte (PDF ou print).

**Aprendizados do teste real, requisitos para a E4-04 e a E4-05 (13/11/2026).** Antes de voltar ao código, o título, o Sobre e um Destaque do Roberto foram reescritos à mão nesta conversa. Viraram o gabarito do que o app deve produzir:
- Só fatos de itens **confirmados** da ficha. O texto atual do perfil serve de referência, não de fonte: o Sobre dele citava duas certificações que não estão na ficha. Trecho sem base sai com [CONFIRMAR].
- Na escrita à mão, apareceram fatos plausíveis e inventados (componentes do custo, "resultado imediato", "queimar caixa"). A IA vai fazer o mesmo: o prompt precisa proibir, e o candidato precisa revisar antes de publicar.
- Itens `proibido` entram no prompt como o que nunca afirmar; itens `a_confirmar` não entram. Texto público não sinaliza busca de emprego.
- Limites: título até 220 caracteres (usar quase tudo); Sobre até 1.400 (rubrica), com quebra de linha depois da abertura, antes do "ver mais"; cargo atual com uma linha de escopo e 2 ou 3 resultados com número.
- Tom da ficha (Como escrevo, Palavras que uso e evito): abrir com número ou cena, frases de tamanho variado, mérito dividido com o time, fecho curto. Sem travessão, sem aspas curvas.
- O `humanize.py`/`detect.py` da skill `li-human` mede pronomes e contrações só em inglês: a nota de "voz" não vale para português. A E4-05 (`humanizarPT`) precisa de pronomes e léxico em português.

**E4-04 implementada (13/11/2026).** `src/server/Reescritas.ts` (`gerarReescritas`, `ultimasReescritas`) e o card "Reescritas do perfil" na aba Perfil > Currículo:
- Gera título, Sobre e descrição do cargo atual a partir do texto do PDF (referência do que existe), da última nota (o motivo de cada item) e da ficha.
- Ficha separada em fatos (só itens confirmados de Quem sou, Provas, Personalidade e Minhas posições), tom (Como escrevo, Palavras que uso e evito) e proibidos (status proibido e Fora dos limites). Itens a confirmar e vazios ficam de fora. Os proibidos têm limite próprio e nunca são cortados para caber fatos.
- O prompt segue os aprendizados acima: fatos só da ficha, nada de detalhe plausível inventado, [CONFIRMAR: o que falta] no lugar, sem sinal de busca de emprego, limites e estrutura de cada texto, tom do candidato. A IA devolve também até 6 pontos para conferir antes de publicar.
- O servidor limpa travessão, aspas curvas, reticências de um caractere e caracteres invisíveis, mantendo as quebras de linha do Sobre, e confere os limites (título 220, Sobre 1.400, cargo 1.200). Fora do limite gera nova tentativa; se falhar de novo, erro. É o começo da E4-05, sem o léxico.
- Cada geração grava uma versão nova de cada texto na aba `Textos` (`linkedin_titulo`, `linkedin_sobre`, `linkedin_cargo_atual`, sem vaga). Limite de 5 por dia. A página mostra os textos com os [CONFIRMAR] destacados, a contagem de caracteres e um botão Copiar.
- Testes com Apps Script simulado: 24 casos (o que entra em cada bloco do prompt, isolamento, limpeza, limites com nova tentativa, versões, proibidos na ficha cheia, limite diário). Publicada na versão @18.

**E4-04 testada no ambiente real (13/11/2026).** Título com 197 caracteres, Sobre com 1.267 e cargo atual com 558, sem tentativa inválida; US$ 0,0527 (9.655 tokens de entrada, 3.336 de saída, esforço alto). Comparado com o gabarito escrito à mão: equivalente, com abertura do Sobre melhor (usou a posição confirmada sobre SLA).
- Funcionou: as certificações que estão no LinkedIn e não na ficha ficaram de fora; o e-mail de contato, que não estava na ficha, saiu como [CONFIRMAR]; não usou números internos da Quantum13 além do SLA (proibido); tom e posições do candidato; limites e quebra antes do "ver mais".
- Erro de precisão: juntou dois fatos ("a esteira e todos os dashboards" com Gemini, Claude e Codex; na ficha, os dashboards são só Gemini e Claude). O prompt ganhou a regra de não juntar fatos nem acrescentar causa ou efeito que o item não traz.
- Acréscimo vindo do perfil: "com a operação sustentando o crescimento", no item da base de clientes. Coberto pela mesma regra.
- Ficha do Roberto: item confirmado com o e-mail de contato (gmail), para o [CONFIRMAR] não voltar.
- Versão 2, depois do ajuste (@19): sem fatos misturados nem acréscimos vindos do perfil, o [CONFIRMAR] do e-mail sumiu, todos os fatos conferem com a ficha. Título 189, Sobre 1.394, cargo 563 caracteres; US$ 0,0623. Pronta para uso.

**Testes no repositório (14/11/2026).** Os testes simulados ficavam numa pasta temporária e se perderam quando a sessão reiniciou. Agora estão em `tests/`: `simulador.js` (Apps Script falso no Node: planilha, cache, lock, Drive, e-mail e API do Claude) e um arquivo por parte (ficha, completar a nota, reescritas, humanizar). `npm test` gera o `dist/` e roda tudo; 97 casos.

**E4-05 implementada (14/11/2026).** `src/server/Humanizar.ts`: porta do `humanize.py`/`detect.py` da skill `li-human` para português, sem dependência.
- `limparTextoPT_`: caracteres invisíveis (inclusive o separador de linha U+2028), espaços especiais, travessão, meia-risca, aspas curvas, reticências de um caractere, marcador de lista. URL e e-mail ficam intactos. Substitui a limpeza que a E4-04 tinha.
- `avaliarTextoPT_`: nota de 0 a 100 com as cinco checagens do `detect.py` (ritmo, concretude, vocabulário, marcas tipográficas, voz) e o mesmo veredito (passa a partir de 70 com nenhuma checagem abaixo de 55; revisar a partir de 50; abaixo, parece IA). Lista de sinais: 26 termos de vocabulário de IA, 10 estruturas típicas e as palavras da seção Palavras que evito da ficha.
- Diferenças da ferramenta original: em português o vocabulário é só apontado, não trocado (verbo e adjetivo flexionam); a voz conta pronomes de 1ª e 2ª pessoa, "a gente", pretérito em -ei e verbo no presente em primeira pessoa no começo da frase ("Lidero", "Audito"), porque o português omite o sujeito; fronteira de palavra que entende acento (o `\b` do JavaScript não vê "é" nem "ê" como letra, e "você" ou "não é só X, é Y" nunca casariam).
- Calibração com textos desta conversa: ROI escrito à mão 77 (passa); ROI de outra ferramenta, com travessões e aspas curvas, 41 (parece IA); texto clichê 35 (parece IA); Sobre da E4-04 versão 2, 65 (revisar: tópicos de tamanho parecido).
- Na página, cada reescrita mostra "Naturalidade N · veredito", os pontos para revisar e, recolhido, como a nota é calculada.
- Publicada na versão @20 (14/11/2026), com os testes no repositório (97 casos).

**E4-06 implementada (14/11/2026).** `src/server/Historico.ts` (`historicoNotas`) e o card "Histórico da nota" na aba Perfil > Currículo, entre "Completar a nota" e as reescritas:
- Lê as linhas do candidato em `Analises` (cada análise do PDF e cada nota completada por print ou resposta já gravava uma linha nova); sem coluna nova.
- Para cada entrada: data, nota (e o máximo, se parcial), diferença para a anterior e o que mudou item a item, com a origem da nota nova (PDF, print ou resposta). Item sem origem (análises antes da E4-03) conta como PDF. Mais recente primeiro, até 30 entradas.
- A página recarrega o histórico sempre que a nota é desenhada (carga da aba, nova análise, nota completada).
- Testes: `tests/historico.test.js` reproduz a sequência real do Roberto (46 parcial, 70, 70 com as respostas trocando os prints, 76) e confere diferença e mudanças em cada passo, isolamento e o limite de 30; 109 casos no total.
- Publicada na versão @21 (14/11/2026). **Etapa 4 concluída.**

## Etapa 5 — Vagas

Do plano do piloto (doc no claude.ai):

| ID | Entrega | Critério de aceite | Depende de |
|---|---|---|---|
| E5-01 | Lista de vagas com filtros (fonte, modalidade, UF), nota e os botões Adaptar, Mover para o funil e Descartar | Descartar pede um motivo e esconde a vaga para sempre | E3-01 |
| E5-02 | Descrição da vaga lida da página por `UrlFetchApp`, com campo para colar o texto quando falhar | Toda vaga adaptada tem a descrição salva | E5-01 |
| E5-03 | `adaptarParaVaga()`: resumo do currículo ajustado, por que contratar você, o que espera da empresa, 5 pontos fortes, 5 a desenvolver com o plano | Nenhum fato fora da ficha confirmada; trechos sem base com [CONFIRMAR] | E5-02, E7-01 |
| E5-04 | Editor: contador, limite, copiar e salvar versão | Cada edição vira versão na aba `Textos` | E5-03 |
| E5-05 | Currículo adaptado a partir de modelo, exportado em PDF (decisão de 16/11/2026: modelo em HTML e PDF direto, sem Google Doc) | PDF com 2 páginas; com 3, a página avisa e sugere o que cortar | E5-03 |
| E5-06 | Mensagem ao recrutador (li-dm): convite de até 200 caracteres, primeira mensagem e duas cobranças | Contagem visível; nenhum envio automático | E5-03 |
| E5-07 | Segunda nota por IA só para as vagas acima da nota mínima, comparando com o currículo | No máximo N vagas por dia por usuário (limite em Preferencias) | E5-02, E4-02 |

**E5-01 implementada (14/11/2026).** `src/server/Vagas.ts` (`listarVagas`, `descartarVaga`, `moverParaFunil`) e a página Vagas (antes "em breve"):
- As vagas do candidato são as linhas dele em `VagasCandidato`, com os dados do anúncio do catálogo `Vagas` (D2); vaga sem anúncio no catálogo não aparece.
- **Decidido nesta entrega (a confirmar):** vigente = selecionada pelo agente nos últimos **7 dias** (a janela que a E3-05 deixou para a Etapa 5); as outras ficam escondidas, com uma caixa para mostrar. Nova = linha criada nos últimos 3 dias (`vista_em` é a data de criação pelo agente, não "vista pelo candidato").
- Etiquetas que se explicam (pedido do Roberto em 14/11/2026): "chegou hoje / ontem / há N dias" nas vagas que chegaram nos últimos 3 dias, e "fora da busca há N dias" nas que o agente não traz há mais de 7 (o anúncio pode ter fechado). Antes eram "nova" e "antiga".
- Filtros de fonte, modalidade e UF. A UF sai do `local` ("Cidade/UF", "Cidade - UF" ou a sigla); muitos anúncios só trazem a cidade ou "BR", e esses ficam em "Sem UF no anúncio".
- Descartar pede um motivo de uma lista e esconde a vaga para sempre. Motivos, decididos pelo Roberto em 14/11/2026: salário ou forma de contratação (CLT/PJ), local ou modalidade, requisitos ou nível da vaga, empresa, e "Outro" com detalhe. Esconde para sempre: não há restaurar, como pede o critério; o agente já não recria nem atualiza vaga descartada. O motivo ainda não muda as notas seguintes (o protótipo sugeria isso; fica para depois).
- Mover para o funil cria a candidatura na etapa `inserida` na aba `Candidaturas`, sem duplicar; a tela do funil é a Etapa 6.
- O botão Adaptar abre o painel de adaptação da vaga (E5-03).
- Link do anúncio abre em outra aba e só se for https. Título, empresa e motivos entram por `textContent`.
- Testes: `tests/vagas.test.js` (vigência, ordem, UF, isolamento, descarte com motivo, funil sem duplicar, eventos); 142 no total.

**Etapas do funil e linha do tempo (decidido pelo Roberto em 14/11/2026; base nesta entrega, tela na Etapa 6).**
- Etapas, na ordem: **inserida → currículo enviado → entrevista com IA → entrevista com RH → entrevista com gestor → proposta → contratado**. **Recusado** (pela empresa) e **desisti** (pelo candidato) podem vir de qualquer etapa e guardam onde a vaga parou. Dá para pular etapas (nem todo processo tem entrevista com IA). Substituem os status antigos (`nao_enviado`, `enviado`, `aguardando`, `entrevista`, `recusado`, `descartado`); a aba `Candidaturas` estava vazia, nada a migrar.
- "Aguardando" não é etapa: é o tempo parado desde o último evento (alerta e cobrança, E5-06).
- Aba nova `Eventos` (`evento_id, usuario_id, vaga_id, tipo, detalhe, em`): uma linha por acontecimento, com a data. Já gravam: inserida no funil e descartada (com o motivo). A data de "selecionada pelo agente" vem de `VagasCandidato.vista_em`, sem mexer no agente. Entra na exclusão de dados (LGPD) por ter `usuario_id`.
- Etapa 6: mudar de etapa grava um evento; tela com a linha do tempo de cada vaga e os números do funil (tempo médio entre etapas, quantas passam de uma etapa para a outra, em que etapa as recusas acontecem, de onde vêm as vagas que avançam).
- Depois de publicar, rodar `setupAmbiente()`: cria a aba `Eventos` e atualiza a validação de `Candidaturas.status`.
- Publicada nas versões @22 (lista, motivos, etapas e eventos) e @23 (etiquetas).

**E5-02 implementada (14/11/2026).** `src/server/Descricoes.ts` (`descricaoVaga`, `lerDescricaoDoAnuncio`, `colarDescricao`) e o botão "Descrição" em cada vaga:
- Onde está o texto, conferido em páginas reais em 14/11/2026: **Gupy** nos dados da página (`__NEXT_DATA__`: `description`, `responsibilities`, `prerequisites`, `relevantExperiences`, montados com os títulos Sobre a vaga, Responsabilidades, Requisitos e Informações adicionais); **Sólides** e **InfoJobs** no formato padrão de vaga (JSON-LD `JobPosting`). **InHire** monta a página no navegador e a **Catho** recusa robôs (HTTP 403): nesses o candidato cola o texto. Resultado nas páginas reais: Gupy 7.104 e 3.708 caracteres, Sólides 2.385, InfoJobs 1.736.
- Aba nova `Descricoes` (`vaga_id, usuario_id, origem, texto, obtida_em`). A lida do anúncio é pública como o catálogo: uma linha por vaga, sem `usuario_id`, lida uma vez para todos os candidatos. A colada é de quem colou (com `usuario_id`, sai na exclusão de dados) e vale mais que a do anúncio.
- Na página: a primeira abertura tenta ler o anúncio; se não der, pede para colar, com link para abrir o anúncio. Depois: "Ler de novo do anúncio" e "Colar outro texto".
- Limites: só link https do catálogo; 30 leituras de anúncio por dia por candidato; texto de 200 a 30.000 caracteres. O HTML vira texto (lista com hífen, entidades decodificadas, quebra crua do HTML vale espaço) e passa pela `limparTextoPT_`. O texto do anúncio é dado: entra por `textContent` e, na E5-03, vai para a IA dentro de tags.
- Achado no caminho: a proteção de links da `limparTextoPT_` (E4-05) pegava como parte do link tudo até o próximo espaço (aspas, parênteses, travessão). Agora o link para nesses caracteres e o e-mail segue o formato usual.
- Testes: `tests/descricoes.test.js` com páginas sintéticas no formato de cada fonte (as reais não vão para o repositório); 174 casos no total.
- Depois de publicar, rodar `setupAmbiente()`: cria a aba `Descricoes`.
- Publicada na versão @24. **Teste real (14/11/2026):** Gupy lida do anúncio em duas vagas (7.104 e 2.585 caracteres, iguais ao teste local); InHire falhou como esperado e a descrição colada foi salva (10.869 caracteres). **Sólides falhou numa vaga** (Raro Labs): nem toda página da Sólides tem o JSON-LD, mas todas guardam a vaga em `__NEXT_DATA__` (`vacancy.description` e `benefits`); o extrator passou a ler esse formato (a vaga sai com 4.118 caracteres). A Catho ficou sem teste real (mesmo caminho da InHire: colar).
- Emojis compostos (ex.: pessoa + formatura nos benefícios da Stefanini) se desmontavam porque a limpeza tirava o junta-emoji U+200D; agora ele fica entre dois emojis e sai no resto.

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
| ~~Comprovação por imagem e limpeza dos prints após 30 dias (A3)~~ | Feito na E4-03 (13/11/2026): aba `Comprovacoes` e gatilho diário `limparComprovacoesVencidas` |
| Levar a skill `li-candidatura` (E7-01) para antes da E5-03 (D7) | Ao planejar a Etapa 5 |

## Operacional

- Tirar `C:\Github\me-contrata` da replicação do Google Drive: ela já criou cópias "(1)" de arquivos antigos, inclusive dentro de `.git`. O GitHub faz o papel de backup.
- Definir o teto de gasto mensal no Console da Anthropic (P0-03).
- Projeto Apps Script antigo (`1FSBG-ld6…`, de 09/11, outro computador): apagar em script.google.com se não for mais usado.

## Para o futuro: vagas remotas fora do Brasil

Registrado em 13/11/2026, sem etapa no plano ainda. A ideia é ampliar o agente de vagas, que hoje só coleta fontes brasileiras (Gupy, Catho, InHire, InfoJobs, Sólides, Michael Page e empresas-alvo), para sites de recrutamento remoto do exterior. Novos sites indicados entram na tabela.

| Site | Tipo | Indicado em | Situação |
|---|---|---|---|
| https://www.revolut.com/careers/ | Página de carreira de empresa (Revolut) | 13/11/2026 | Não avaliado |

Perguntas a responder antes de integrar:
- Formato: página de carreira de empresa (como as empresas-alvo em `empresas_carreira` da `ListasBusca`) ou agregador de vagas remotas.
- Como cada site entrega as vagas (API, JSON na página ou HTML) e se os termos de uso permitem coleta automática.
- Filtros que as Preferências ainda não têm: país ou fuso aceito, idioma da vaga, forma de contratação (contractor, EOR, PJ) e moeda.
- Nota: `ufs` e `cidades` só cobrem o Brasil, e quem não fala inglês perde 30 pontos em "exige idioma".

## Para o futuro: novas fontes de vagas e de avaliação de empresas (Brasil)

Registrado em 16/11/2026, sem etapa no plano ainda. Origem: a lista de 12 sites de emprego de um post do Instagram (`prototipo/imagens_apoio/`). O agente hoje cobre Gupy, InfoJobs, Catho, Sólides, InHire, Michael Page e as empresas-alvo. Decisão do Roberto: o **Glassdoor** entra com **dois papéis**, fonte de **vagas** e fonte de **avaliação de empresas** (cultura, salário, entrevista), esta podendo alimentar uma nota da empresa no cartão da vaga e a preparação para entrevista.

| Site | Papel | Situação | Observações (16/11/2026) |
|---|---|---|---|
| glassdoor.com.br | Vagas e avaliação de empresas | Indicado; primeira leitura feita | A página inicial recusa a leitura automática (403). O `robots.txt` bloqueia caminhos de vagas (`/job-listing`, `/jobview`, `/Vagas/*_P*`), `/api/`, `/search/` e a paginação de avaliações e salários, e restringe ClaudeBot e GPTBot a `/blog/`, `/About/` e `/empresas/`. Não se achou API pública oficial (fontes secundárias dizem que as parcerias acabaram) e guias dizem que os termos restringem o acesso automatizado; texto oficial dos termos não conferido |
| vagas.com.br | Vagas | Indicado, não lido | |
| indeed (br.indeed.com) | Vagas e dados de empresa | Indicado, não lido | Na sessão do Claude Code existe um conector do Indeed (busca de vagas, detalhes, dados da empresa), mas o app (Apps Script ou VPS) não o usa; para o app, a forma de acesso é a pesquisar |

Conclusões iniciais, a validar: coletar o Glassdoor automaticamente é de **alto risco** (termos, bloqueios e restrição a robôs de IA); não coletar nem contornar bloqueio. Caminhos legítimos a avaliar: (1) o candidato **cola** o texto da avaliação da empresa ou o resumo (como já se cola a descrição da vaga na E5-02), e a IA usa como dado; (2) pedir autorização por escrito ou parceria de dados; (3) usar uma fonte oficial com API, se houver. Conferir o texto atual dos termos de uso antes de qualquer decisão, e consultar advogado para uso comercial.

Perguntas em aberto: como cada site entrega vagas e dados de empresa (API, JSON na página, HTML ou só login); o que os termos permitem; se a nota da empresa entra na nota da vaga (E5-07) ou só como informação; se Vagas.com e Indeed valem o custo de integração.

## Para o futuro: aprender com a concorrência

Registrado em 16/11/2026, sem etapa no plano ainda. Estudar sites parecidos com o me-contrata para decidir o que entra, o que fica de fora e como se diferenciar. Estudo inicial feito só pelas páginas públicas (números são alegações dos próprios sites).

| Site | O que é | Preço divulgado | Observações |
|---|---|---|---|
| hire-international.com | Mentoria humana para carreira internacional (moeda forte) | Sem preço público; vendas por WhatsApp | Sem IA; mercado vizinho |
| linkelyzer.com.br | IA que analisa o LinkedIn (nota 0 a 100, 39 critérios), gera CV, teste ATS, buscador de vagas, organizador de candidaturas, agenda de posts | 1 análise grátis; R$ 29,90 por 3 créditos; R$ 67/mês; R$ 49/mês no anual | O mais parecido com o nosso |
| aiapply.co | Copiloto de candidatura: CV, carta por vaga, Auto Apply, preparação de entrevista | Plano grátis limitado, assinatura e créditos (valores não divulgados) | Compete por volume de candidaturas automáticas |
| jobstep.io | IA com nota do currículo e teste ATS, vagas sugeridas por dia com índice de compatibilidade, adaptação de currículo e carta a cada vaga colada, painel de candidaturas | Grátis (nota, criação com IA, modelos, rastreio); trimestral e mensal pagos (valores não divulgados) | Suíça, dados na Europa, GDPR, AES-256; promete não treinar IA com seus dados nos planos pagos. Alega 120 mil usuários e 4,7 no Trustpilot (16/11/2026)

Hipóteses para discutir (não são decisões):
- O diferencial do me-contrata é a verdade (só fatos confirmados, `[CONFIRMAR]`, aprovação do usuário, LGPD). Não copiar o Auto Apply.
- Eles têm e nós ainda não: teste ATS, preparação de entrevista, primeira análise grátis sem cartão.
- Preço de referência no Brasil: cerca de R$ 30 por 3 análises e R$ 49 a 67 por mês.

Etapa proposta, "como melhorar com a ajuda da concorrência": (1) páginas públicas (feito); (2) queixas reais de usuários (Reclame Aqui, Trustpilot, Reddit, lojas), com contagem e link de cada citação; (3) matriz de funcionalidades nossa e deles; (4) decisões para o plano. Onde encaixa: um olhar leve antes da E5-05 (teste ATS e modelos de CV) e da E5-07 (nota de aderência); o estudo principal antes da Etapa 8 (piloto: promessa da página, onboarding, preço); e a comparação com o feedback real depois do piloto.

Queixas de usuários (16/11/2026, Trustpilot, amostra de 20 avaliações de 1 e 2 estrelas por site): nos dois sites com volume (AIApply e JobStep) a maioria é sobre **cobrança, cancelamento e reembolso**, depois vagas irrelevantes, resultados abaixo do prometido, suporte e expectativa (vender como busca de vagas o que é só currículo). No Reclame Aqui (prints do Roberto), o JobStep tem 5 reclamações de 9 a 13/11/2026, todas sem resposta: cobrança diferente do anunciado, reembolso negado dentro dos 7 dias porque o cliente "baixou um currículo", cancelamento sem resposta e função principal limitada a links do LinkedIn. O AIApply, pela busca do Google (fontes secundárias), repete cobrança de créditos à parte e baixo retorno de entrevistas. Linkelyzer sem avaliações independentes. Hire International (a Hire Brazil é a mesma marca ou do mesmo grupo, segundo as próprias reclamações): 4 reclamações no Reclame Aqui (abril a setembro de 2026), sobre cancelamento e reembolso dentro dos 7 dias, acesso à plataforma e suporte, e conteúdo raso; todas respondidas pela empresa, e uma resolvida com nota 10. Lições para o piloto, se um dia houver cobrança: preço claro, cancelar em um clique, teste sem paywall escondido, comprovante de cada candidatura, prometer só o que entrega, privacidade como diferencial. Detalhe e fontes na planilha dos concorrentes.

Planilha dos concorrentes (16/11/2026): `me-contrata - concorrentes`, separada da planilha do app, aba `Concorrentes` (uma linha por site, com status indicado, lido ou revisado, queixas de usuários com link, o que aprender e o que evitar, decisão). Preenchida com os 4 sites acima e a RH+ Experts. Site novo: pesquisar (página pública e queixas) e registrar a linha; automatizar a leitura só se o volume justificar.

Material de apoio: imagens e prints levantados pelo Roberto ficam em `prototipo/imagens_apoio/` (fora do Git; o `README.md` da pasta é o índice, com data, origem e finalidade de cada imagem).

Perguntas em aberto: quais outros sites estudar; se teste ATS e preparação de entrevista entram no escopo; qual preço pretendido, ou se o uso é só próprio.

## Para o futuro: produção em VPS com containers

Registrado em 16/11/2026, sem etapa no plano ainda. A intenção do Roberto é que, em produção, o me-contrata rode numa **VPS, em containers**. O Apps Script e a planilha ficam como ambiente do piloto. Isso muda a pergunta sobre o banco: não é "planilha para Supabase", e sim "qual a arquitetura de produção". Migrar só os dados mantendo o Apps Script seria retrabalho, porque o servidor inteiro será portado.

**O que se aproveita:** o servidor é TypeScript e a lógica é quase toda pura (humanizador, extração de descrições, prompts, validações, adaptação por vaga). O que é do Google precisa de substituto, e o simulador de testes (`tests/simulador.js`) já lista essas fronteiras.

| Hoje (Apps Script) | Na VPS (a decidir) |
|---|---|
| Planilha | Postgres |
| `LockService` | Transações |
| `CacheService` (limites diários) | Tabela ou Redis |
| E-mail do código de login (`MailApp`) | Provedor SMTP ou transacional |
| Pasta no Drive | Volume ou armazenamento compatível com S3 |
| Gatilhos de tempo | `cron` em container |
| Propriedades do Script | Variáveis de ambiente e segredos do Docker |
| `doPost` do agente com HMAC | Endpoint HTTP (o HMAC fica) |
| Página servida pelo `HtmlService` | Arquivos estáticos do próprio app |

Opções para os dados (levantamento inicial, ainda sem pesquisa de mercado):
- **A. Supabase gerenciado:** sem operar o banco; Free comporta o piloto (500 MB; pausa após 1 semana sem atividade), Pro a partir de US$ 25/mês (8 GB, sem pausa); dependência de fornecedor e dados fora da VPS.
- **B. Supabase hospedado na própria VPS:** painel, Auth, RLS e Storage, mas uma pilha com muitos containers e toda a operação por conta do Roberto.
- **C. Postgres em container com API própria em TypeScript:** mais leve e com controle total; o RLS do Postgres funciona de verdade (a API conecta com papel limitado e informa o `usuario_id` por transação). Com o Supabase, a chave de servidor ignora o RLS e o isolamento continuaria dependendo do código.

**Ponto em aberto (decisão do Roberto, 16/11/2026): fazer uma análise e uma pesquisa de mercado sobre a melhor forma de migrar o ambiente**, no formato que o projeto vem seguindo (levantamento com fontes, comparação, decisão registrada aqui). A pesquisar:
- Provedores de VPS: preço, região no Brasil e latência, backup e suporte.
- Banco: Postgres gerenciado, em container ou Supabase (A, B e C acima), com backup, restauração e custo total por mês.
- Orquestração e publicação: Docker Compose ou uma plataforma de deploy autohospedada (Coolify, Dokploy e similares, a avaliar), proxy reverso e TLS.
- E-mail transacional (login por código), armazenamento de arquivos, cron, segredos, monitoramento e alertas.
- LGPD: onde ficam os dados, contrato com operador, exclusão e portabilidade.
- Plano de migração dos dados e do corte (como mover o piloto sem perder usuários e consentimentos) e esforço do porte.

Preparar agora, barato e útil em qualquer opção: concentrar o acesso a dados em funções de repositório (em vez de cada arquivo chamar `lerAba_`) e manter a lógica fora dos serviços do Google. A migração vem depois do piloto (Etapa 8), para não construir infraestrutura antes de validar o produto.

Decisões que dependem do Roberto: quanto quer operar o banco, se a migração vem antes ou depois do piloto, domínio, provedor de e-mail e orçamento da VPS.

## Etapa 7 — Skill li-candidatura

| ID | Entrega | Critério de aceite | Depende de |
|---|---|---|---|
| E7-01 | `SKILL.md` com as regras: versão de currículo por tipo de vaga, 2 páginas, contagem de caracteres, primeira pessoa, `[CONFIRMAR]`, número exato em vez de derivado, nada que sinalize busca de emprego | Revisada e aprovada pelo Roberto | P0-04 |
| E7-02 | Teste com 3 vagas já enviadas (Qive, Vetta, DOT Coordenação; a DOT saiu do ar e foi trocada pela Unetvale), comparando com o que foi feito à mão | Os revisores não acham fato inventado; diferenças anotadas | E7-01 |
| E7-03 | O mesmo texto da skill vira o prompt de sistema de `adaptarParaVaga()` | Uma única fonte de regras para a página e para o Claude Code | E7-01, E5-03 |

**E7-01 aprovada (14/11/2026).** `skills/li-candidatura/SKILL.md`, neste repositório (decisão do Roberto): o build vai embutir o texto no app (E7-03) e uma cópia fica em `~/.claude/skills/li-candidatura` para o Claude Code. Só regras, para qualquer candidato; os fatos vêm da ficha. Decisões do Roberto: o 6º texto é a carta de apresentação (o plano dizia "6 textos" e listava 5); na candidatura vale "não falar da saída do emprego atual" (nem motivo, nem falar mal de empregador; nada de disponibilidade, início imediato ou pretensão salarial salvo se pedido); requisito sem prova vira ponto a desenvolver ou `[CONFIRMAR]`; tamanhos padrão quando o formulário não tem limite (resumo 900, por que contratar 1.000, o que espera 600, ponto forte 250, ponto a desenvolver 300, carta 1.500 caracteres).

**E7-02 concluída (15/11/2026).** Skill rodada em 3 vagas já enviadas: Qive, Vetta (descrição do Indeed) e Unetvale (Sólides), esta no lugar da DOT Coordenação, finalizada pela DOT em 13/11/2026. Resultado: nenhum fato inventado; os requisitos da vaga que a ficha não confirma viraram pontos a desenvolver com `[CONFIRMAR]`. Diferenças com os currículos feitos à mão (percentuais derivados, certificações, ferramentas e frases copiadas da vaga que não estão na ficha) estão no relatório pessoal do Roberto, fora do repositório. Achados para a E5-03: (1) a nota de naturalidade das listas (pontos fortes e a desenvolver) fica baixa pelo formato paralelo e não deve ser critério; (2) o "O que espera da empresa" precisa das Preferências do app, que hoje não entram na adaptação; (3) defeito da E4-05 corrigido: item da lista "evitar" com termos entre aspas vale só pelos termos (o "como" deixava de ser apontado em todo texto).

**E5-03 e E7-03 implementadas (15/11/2026).** `src/server/Adaptacao.ts` (`adaptarParaVaga`, `ultimaAdaptacao`) e o painel "Adaptar" em cada vaga.
- **E7-03, fonte única:** `scripts/build.mjs` lê `skills/li-candidatura/SKILL.md`, tira o cabeçalho de metadados e gera `dist/SkillCandidatura.js` com a constante `SKILL_CANDIDATURA`. O prompt de sistema é esse texto mais um trecho curto "Neste app" (onde estão as entradas e o formato do JSON). Mudou uma regra: edite só o `SKILL.md`; o próximo build leva para o app. Um teste confere que o prompt começa com o texto exato do arquivo.
- **Entradas:** a descrição da vaga (E5-02; sem ela, recusa), os itens confirmados da ficha, o tom, os proibidos e as Preferências (título, modalidade, UF, termos a excluir), tudo entre tags como dado. Esforço alto.
- **Saída:** resumo, por que contratar, o que espera, até 5 pontos fortes, até 5 a desenvolver e a carta, nos limites padrão da skill (900, 1.000, 600, 250 e 300 por item, 1.500). Passou do limite ou veio fora do formato: nova tentativa; falhando de novo, erro e nada gravado. Limpeza com `limparTextoPT_` e nota de naturalidade só nos textos corridos (nas listas a nota não vale, achado da E7-02).
- **Gravação:** cada geração grava uma versão nova por texto na aba `Textos`, com o `vaga_id`; nas listas, um item por linha e `limite_caracteres` é o de cada item. Limite de 10 adaptações por dia por candidato. Isolamento: a vaga precisa ser do candidato.
- **Na página:** botão Adaptar abre o painel com a última versão (se houver), "Adaptar de novo", contagem de caracteres, `[CONFIRMAR]` em destaque, Copiar e a lista "Confira antes de enviar". O editor com salvar versão é a E5-04.
- Fora desta entrega: escolha da versão de currículo e limite de formulário (E5-05), mensagem ao recrutador (E5-06).
- **Ajustes depois do teste real (Líder de NOC, Teltec, 15/11/2026; PRs #30 a #33):** o modelo varia muito de uma geração para outra (Ritmo de 1 a 93 com os mesmos dados). A skill passou a exigir o ritmo de frases do tom da pessoa; o Ritmo só é julgado com 6 frases ou mais e a checagem neutra (texto curto) fica fora da média; a skill proíbe transformar o que é da vaga em desejo da pessoa no "O que espera"; e, se um texto corrido com 6 frases ou mais vier com Ritmo abaixo de 40, o servidor faz uma segunda chamada avisando qual texto variar e fica com a de melhor ritmo (não conta no limite diário; se a segunda for inválida ou pior, mantém a primeira).
- **E5-04 publicada (15/11/2026, @35):** `salvarTextoAdaptado` grava a edição do candidato como versão nova na aba `Textos` (`editado_pelo_usuario` = verdadeiro), com o limite do tipo (por item nas listas, até 5 itens), sem passar pelo limpador (o texto é dele); sem mudança não grava; a anterior fica. Na página, cada texto tem Editar (contador ao vivo, bloqueia acima do limite), Salvar versão e Cancelar, e a etiqueta "editado por você". "Adaptar de novo" pergunta antes quando há edição, porque a versão nova esconde as edições (ficam no histórico). Fora desta entrega: voltar a uma versão anterior e limite próprio de cada formulário. 200 edições por dia por candidato.
- **E5-05 implementada (16/11/2026):** `src/server/CurriculoAdaptado.ts` (`gerarCurriculoPdf`, `ultimoCurriculoPdf`) e o bloco "Currículo em PDF" no painel Adaptar. Decisões do Roberto: só PDF (sem Google Doc, que exigiria um escopo novo e seria descartado na migração para a VPS); o currículo base enviado serve só de referência; cabeçalho com nome, e-mail e cidade.
  - **Conteúdo:** a IA devolve um JSON (experiências, formação, cursos, competências) só com itens confirmados de quem sou e provas, e cita em cada trecho os itens da ficha (F1, F2...). O resumo é o da E5-03, a versão mais recente (inclusive a editada). O texto do anúncio, a ficha e o currículo base vão como dado.
  - **Conferência mecânica no servidor:** o item citado existe; todo número, percentual e data do trecho aparece nos itens citados (não passa "queda de 87%" derivada de "8 para 1"); nome, e-mail, empresa e competências aparecem na ficha; cargo e período precisam bater. O que não passa sai, com aviso. Limite dessa checagem: ela vê números e nomes, não o sentido; "não juntar dois fatos" continua sendo regra do prompt.
  - **Modelo à prova de ATS:** HTML de uma coluna, sem tabela, imagem ou cor, com texto selecionável; HTML escapado. PDF por `Blob.getAs`, sem escopo novo. O formato do papel é lido do PDF (A4 ou Carta) e a página avisa se vier em Carta.
  - **2 páginas:** com mais, o app avisa e sugere cortes na ordem (competências, cursos, tópicos dos cargos mais antigos, a 2 e depois a 1); o botão "Cortar automaticamente" aplica nessa ordem até caber. Se o PDF esconder a contagem de páginas, estima pelos caracteres e diz que é estimativa.
  - **Gravação e entrega:** cada geração grava uma versão em `Textos` (tipo `candidatura_curriculo`, o JSON) e o PDF na pasta do candidato no Drive, registrado em `Curriculos` (tipo `adaptado`, com o `vaga_id` e as páginas). O arquivo do Drive é do dono do app: o navegador recebe o PDF em base64 e baixa por um link de blob (não há link do Drive para o candidato). 15 por dia por candidato. Sem aba nem coluna nova: não precisa de `setupAmbiente()`.
  - **Testes:** `tests/curriculo.test.js` (45 casos; 293 no total). O simulador ganhou blob com `getAs`, `base64Encode`, `ScriptApp` e leitura de arquivos do Drive. **Não coberto por teste:** o PDF real do Google (páginas, formato, texto selecionável) e o botão de baixar dentro do iframe do Apps Script; conferir no ar.
  - Fora desta entrega: editar o currículo no app, escolher a versão por tipo de vaga e vincular o PDF enviado à candidatura no funil (Etapa 6).
- **Estado em 15/11/2026 (fim do dia):** publicado até a versão @35. Pendências do Roberto: (1) conferir o editor na tela; (2) a propriedade do script `ADAPTACOES_POR_DIA` = `sem_limite` está ligada para os ajustes: apagar para voltar às 10 por dia; (3) revisar as tabelas de diferenças do relatório da E7-02 e confirmar na ficha o que for verdade; (4) apagar o projeto antigo do Apps Script (1FSBG). Para retomar: E5-05 (modelo de currículo em Google Doc, exportado em PDF de 2 páginas), depois E5-06, E5-07 e a Etapa 6 (tela do funil). Usar `/model opusplan` e começar pelo modo de planejamento.
- Testes: `tests/adaptacao.test.js`; 222 casos passam no total. Sem aba nem coluna nova: não precisa de `setupAmbiente()`.

# Próximos passos

**Atualizado em:** 10/11/2026, após o merge da Etapa 1 (PR #1).
**Fonte:** plano do piloto "Funil de Candidaturas — Skills e piloto da página" (doc no claude.ai) e [`ANALISE_PROJETO.md`](ANALISE_PROJETO.md).

A Etapa 1 (base, login, sessão e LGPD) está concluída e testada. O próximo passo é a **Etapa 2 (ficha do candidato)**: ela traz as primeiras funções com dados de verdade, que permitem o teste de isolamento com dois usuários. Só depois desse teste o web app pode ser aberto para outras pessoas.

## Onde estamos

| Etapa | Situação | Observação |
|---|---|---|
| 0 — Preparação | Parcial | P0-02 (projeto, planilha, pasta) e P0-03 (chave da API) feitos. Falta confirmar o teto de gasto mensal no Console da Anthropic. P0-01 (scripts `build_cv_*.js`) e P0-04 (revisar `voice.md`) ficam fora deste repositório |
| 1 — Base e login | Concluída | E1-03, E1-04, E1-05 testados. E1-01 sem as validações de UF, `ativo` e Preferencias (achado D1). E1-02 só com a navegação provisória; as telas vêm nas próximas etapas |
| 2 — Ficha do candidato | **Próxima** | Ver abaixo |
| 3 — Agente gravando na planilha | A fazer | Depende de decidir o modelo de vagas (D2) |
| 4 a 8 — Perfil, vagas, funil, skill, piloto | A fazer | Ordem do plano; a skill `li-candidatura` (etapa 7) precisa estar pronta antes da E5-03 |

## Etapa 2 — Ficha do candidato

| ID | Entrega | Critério de aceite | Observações para implementar |
|---|---|---|---|
| E2-01 | Tela da ficha nas seções do `voice.md`, com status por item (confirmado, a confirmar, proibido) | O candidato edita e muda o status de cada item | Primeira função com dados: toda função começa com `exigirAceite_(token)`. Base visual: aba Perfil > Ficha do `prototipo/index.html` |
| E2-02 | Rascunho da ficha a partir do PDF: a IA propõe itens, todos como "a confirmar" | Nenhum item gerado entra como confirmado sem clique do candidato | Depende do upload de PDF (E4-01). Extrair o texto uma vez e guardar (decisão A2) |
| E2-03 | Migrar a ficha do Roberto a partir do `voice.md` e da memória | Itens da lista "não afirmar" entram como proibidos | Precisa do `voice.md` revisado (P0-04) |

**Ao terminar a E2-01:** fazer o teste de isolamento do plano com dois usuários (o token de um não lê nem altera a ficha do outro). Se passar, mudar o acesso do manifesto de `MYSELF` para permitir candidatos sem conta Google e publicar a primeira versão (`npm run deploy`).

## Etapa 3 — Agente gravando na planilha

| ID | Entrega | Critério de aceite |
|---|---|---|
| E3-01 | `buscar_vagas.py` envia as vagas para um `doPost` do web app, com segredo compartilhado | Vagas chegam à aba Vagas; chamada sem o segredo é recusada |
| E3-02 | O agente lê a configuração de cada usuário da aba Preferencias | Uma execução por usuário ativo; `config.json` fica só com as listas gerais |
| E3-03 | Mapear UF e modalidade para o filtro de cada fonte | Teste com SC, RS e remoto devolve vagas em todas as fontes |
| E3-04 | Listas de nível, área e exclusão por usuário, geradas pela IA e revisadas | O Roberto mantém as listas atuais; um 2º usuário recebe listas próprias |
| E3-05 | Deduplicar por fonte+id e por título+empresa; vaga descartada nunca é recriada | Rodar duas vezes seguidas não duplica nada |

**Antes de começar:** decidir o modelo de vagas (D2: catálogo único de vagas + estado por candidato, ou uma linha por candidato). Na E3-01, aplicar os controles do achado S5: validar formato e tamanho do payload, limitar volume, não registrar o segredo em logs e evitar duplicação.

## Pendências técnicas

| Item | Quando |
|---|---|
| Gatilho diário para apagar sessões vencidas da aba `Sessoes` | Antes de abrir para outros usuários |
| Completar validações da planilha: UFs, `ativo`, Preferencias (D1) | Junto com a E2-01 |
| Modelo de recomendações com ID e textos gerados (D3) | Antes da Etapa 6 |
| Upload de PDF de até 5 MB testado ponta a ponta, inclusive no celular (D6) | Na E4-01 |
| Pastas por usuário no Drive, coluna `pasta_id` (A1) | No primeiro upload (E4-01) |
| Comprovação por imagem e limpeza dos prints após 30 dias (A3) | Na Etapa 4 |
| Levar a skill `li-candidatura` (E7-01) para antes da E5-03 (D7) | Ao planejar a Etapa 5 |

## Operacional

- Tirar `C:\Github\me-contrata` da replicação do Google Drive: ela já criou cópias "(1)" de arquivos antigos, inclusive dentro de `.git`. O GitHub faz o papel de backup.
- Definir o teto de gasto mensal no Console da Anthropic (P0-03).
- Projeto Apps Script antigo (`1FSBG-ld6…`, de 09/11, outro computador): apagar em script.google.com se não for mais usado.

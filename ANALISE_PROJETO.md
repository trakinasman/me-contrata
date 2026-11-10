# Análise do projeto me-contrata

**Data:** 10/11/2026
**Escopo:** revisão manual do PDF “Funil de Candidaturas — Skills e piloto da página” (15 páginas) e dos arquivos presentes no repositório nesta data.
**Modo:** análise estática; nenhuma alteração de aplicação, implantação ou teste de penetração foi realizado.

## Resumo executivo

O PDF contém um plano amplo e critérios úteis para o piloto, especialmente sobre veracidade dos textos, isolamento de usuários, exclusão de dados e limites de custo. O código disponível é ainda um esqueleto: há estrutura Apps Script, preparação da planilha e uma página mínima com `ping()`, mas não há login, sessão, CRUD, funções de IA, agente de vagas ou testes.

Há um risco **crítico e condicional à publicação**: o manifesto permite acesso anônimo e execução como a conta implantadora; ao mesmo tempo, funções globais que retornam propriedades do Script e a URL da planilha estão expostas. Se essa versão estiver implantada, propriedades como chave de API e segredo do agente podem ser consultadas por chamadas RPC do cliente. Antes de publicar ou continuar usando uma implantação com essa configuração, fechar essa superfície e rotacionar credenciais que possam ter sido expostas.

## Achados de segurança

### S1 — Crítico: leitura anônima de propriedades do Script

- **Evidência:** `src/appsscript.json:5-8` configura `executeAs: USER_DEPLOYING` e `access: ANYONE_ANONYMOUS`. `src/server/Config.ts:11-13` declara `prop(chave)`, que devolve o valor da propriedade solicitada. Os nomes de propriedades sensíveis estão em `src/server/Config.ts:2-7`.
- **Condição:** implantação ativa com esse manifesto e função global acessível por `google.script.run`.
- **Impacto:** um visitante anônimo pode tentar chamar `prop` com nomes de propriedades como `CLAUDE_API_KEY` ou `AGENTE_SEGREDO`, potencialmente revelando credenciais e IDs internos.
- **Ação:** impedir chamadas públicas a helpers internos (por exemplo, não expô-los como funções RPC); proteger cada função pública com autenticação/autorização; não disponibilizar um getter genérico de propriedades. Se já houve implantação, revogar/rotacionar a chave Claude e o segredo do agente e revisar uso/logs.

### S2 — Alto: função de setup exposta ao cliente

- **Evidência:** `src/server/Setup.ts:6-29` define `setupAmbiente()` globalmente; a função cria recursos e retorna `ss.getUrl()`.
- **Condição:** função acessível ao navegador numa implantação anônima como a conta implantadora.
- **Impacto:** chamada não autorizada pode acionar criação/setup de recursos sob a conta do proprietário e retornar a URL da planilha. A idempotência não é uma barreira de autorização.
- **Ação:** reservar setup a execução administrativa controlada, remover a função da superfície RPC pública e nunca usar um endpoint anônimo para administração.

### S3 — Alto: ausência de autenticação e isolamento no código atual

- **Evidência:** `src/client/Index.html:20-25` chama `ping()` sem token; `src/server/Main.ts` contém apenas `doGet`, `incluir` e `ping`. Não há função de login, sessão ou autorização no código analisado.
- **Impacto:** os requisitos de login por código e resolução de usuário no servidor descritos nas páginas 6 e 12 do PDF não estão implementados. O esquema de dados, sozinho, não fornece isolamento.
- **Ação:** não armazenar ou servir dados pessoais até que toda operação pública exija sessão válida, derive `usuario_id` no servidor e aplique filtro por usuário. Testar com dois usuários e tokens expirados/inválidos antes de piloto.

### S4 — Médio: função de inclusão exposta e sem lista permitida

- **Evidência:** `src/server/Main.ts:10-12` declara `incluir(arquivo)` globalmente e usa o valor recebido em `HtmlService.createHtmlOutputFromFile`.
- **Impacto:** a função pode expor conteúdo de arquivos HTML do projeto que sejam acessíveis pelo serviço, inclusive parciais futuros. Não há evidência de segredo em `Estilo.html` atualmente.
- **Ação:** restringir inclusões a nomes fixos e ocultar helpers internos da superfície RPC.

### S5 — Médio: segredo compartilhado do agente requer controles adicionais

- **Evidência:** o PDF, página 7, propõe `doPost` autenticado por segredo compartilhado e escrita somente na aba `Vagas`; o código desse endpoint ainda não está presente.
- **Risco futuro:** um segredo bearer sozinho pode ser repetido ou abusado se vazar.
- **Ação:** além de segredo fora do código, validar estritamente o esquema e tamanho do payload, limitar operações e volume, evitar segredo em URL/logs, proteger contra repetição/duplicação e manter trilha de auditoria sem credenciais.

## Revisão técnica

### Estado e verificações

- `npm run typecheck` foi executado e passou (`tsc -p tsconfig.json --noEmit`). Isso não testa runtime Apps Script, permissões OAuth, implantação nem comportamento de segurança.
- Não foram encontrados testes automatizados no conjunto de arquivos analisado.
- `src/server/Main.ts` contém uma página mínima e um `ping`; as funcionalidades do piloto ainda não estão implementadas.
- `src/server/Setup.ts` cria/reutiliza planilha e pasta e chama `setupPlanilha`; a lógica é concebida como idempotente.

### D1 — Médio: validações da planilha não cobrem os campos previstos

- **Evidência:** listas e validações em `src/server/Esquema.ts:21-39` cobrem alguns status, seções, papel e modalidade. Não há validações para UFs, campos de Preferencias ou `ativo`, embora E1-01 do PDF peça listas para status, UFs e modalidades.
- **Ação:** completar as listas e validar também no servidor, pois validação de célula não é controle de segurança.

### D2 — Médio: modelagem de vagas mistura catálogo e estado por usuário

- **Evidência:** `src/server/Esquema.ts:11` coloca `usuario_id` junto aos dados da vaga; a página 4 do PDF define chave única `fonte+id`, mas também guarda `descartada`, `motivo_descarte` e `vista_em` na mesma linha.
- **Impacto:** se a vaga é globalmente única, o descarte de um usuário pode afetar outro; se a linha é por usuário, fonte+ID não será uma chave única simples.
- **Ação:** separar catálogo de vagas (chave fonte+ID) dos estados/interesses do candidato (chave usuario_id+vaga_id), ou documentar formalmente qual semântica será usada.

### D3 — Médio: modelo de recomendações ainda não representa todo o fluxo

- **Evidência:** `src/server/Esquema.ts:14` não inclui ID de recomendação nem campos para textos gerados, embora a página 4 do PDF descreva um mini-funil e a página 12 preveja texto de pedido e texto sugerido.
- **Ação:** decidir se os textos ficam em `Textos` ou na aba `Recomendacoes`, e adicionar identificador/relacionamento que permita histórico sem ambiguidades.

### D4 — Médio: CacheService não garante sessão de oito horas

- **Evidência:** página 6 do PDF propõe sessão de 8 h em CacheService. Cache é volátil e pode remover entradas antes do prazo; a expiração máxima do cache também é inferior a oito horas.
- **Impacto:** usuários podem perder a sessão antes do tempo anunciado; cache não deve ser a única fonte de uma garantia de duração de sessão.
- **Ação:** definir expiração absoluta e comportamento de renovação/relogin; usar armazenamento compatível com a duração declarada e tratar cache como acelerador, não persistência garantida.

### D5 — Médio: conferir escopo OAuth do Drive em execução

- **Evidência:** `src/appsscript.json:9-14` declara o escopo `drive.file`; `src/server/Setup.ts:18-20` chama `DriveApp.createFolder()`.
- **Ação:** validar a autorização real com a conta de implantação e conceder somente o escopo necessário. O compilador TypeScript não detecta escopo OAuth insuficiente.

### D6 — Médio: upload de 5 MB precisa de teste ponta a ponta

- **Evidência:** critério E4-01 na página 7 do PDF admite PDF até 5 MB, enviado pelo navegador a Apps Script e depois analisado por IA.
- **Risco:** codificação Base64 aumenta o payload e o transporte por `google.script.run` precisa ser validado em dispositivo real.
- **Ação:** provar o fluxo com limite de tamanho no servidor, arquivo PDF válido, erro de rede e celular antes de considerar E4-01 aceito.

### D7 — Baixo: cronograma precisa refletir dependência da skill

- **Evidência:** página 10 lista a Etapa 7 depois de etapas 5 e 6, mas informa que `li-candidatura` deve existir antes de E5-03; E5-03 depende de E7-01 na página 8.
- **Ação:** puxar E7-01 e sua revisão/teste para antes da implementação de E5-03, sem necessariamente mudar a numeração das etapas.

## Recomendações de produto e operação

1. Bloquear publicação anônima até corrigir a superfície RPC e concluir login/autorização.
2. Fazer os testes de isolamento e exclusão de dados serem critérios bloqueadores antes de adicionar uma segunda pessoa usuária.
3. Resolver a semântica de vaga global versus estado individual antes do agente Python e da deduplicação.
4. Definir retenção de PDFs, conteúdo enviado ao Claude, logs, backups e limites de custo por usuário; refletir isso no termo de consentimento.
5. Transformar os critérios de aceite já enumerados no PDF em testes repetíveis para setup idempotente, importação do funil, deduplicação, status e veracidade dos textos.
6. Rever limites de cota de e-mail e Apps Script com os limites vigentes da conta que hospedará o piloto; quotas podem variar por tipo de conta.

## Limites desta revisão

O PDF foi lido a partir de `C:\Users\rober_cupuuco\Downloads\Funil de Candidaturas — Skills e piloto da página.pdf`; ele não está sendo incluído no repositório. A análise não inspecionou uma implantação Apps Script, propriedades reais, planilha/Drive remotos, histórico Git anterior nem os arquivos de skills que o PDF cita. Os riscos de RPC são condicionais à publicação com as configurações listadas.

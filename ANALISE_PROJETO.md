# Análise do projeto me-contrata

**Data:** 10/11/2026
**Escopo:** revisão manual do PDF “Funil de Candidaturas — Skills e piloto da página” (15 páginas) e dos arquivos presentes no repositório nesta data.
**Modo:** análise estática; nenhuma alteração de aplicação, implantação ou teste de penetração foi realizado.

## Resumo executivo

O PDF contém um plano amplo e critérios úteis para o piloto, especialmente sobre veracidade dos textos, isolamento de usuários, exclusão de dados e limites de custo. O código disponível é ainda um esqueleto: há estrutura Apps Script, preparação da planilha e uma página mínima com `ping()`, mas não há login, sessão, CRUD, funções de IA, agente de vagas ou testes.

Há um risco **crítico e condicional à publicação**: o manifesto permite acesso anônimo e execução como a conta implantadora; ao mesmo tempo, funções globais que retornam propriedades do Script e a URL da planilha estão expostas. Se essa versão estiver implantada, propriedades como chave de API e segredo do agente podem ser consultadas por chamadas RPC do cliente. Antes de publicar ou continuar usando uma implantação com essa configuração, fechar essa superfície e rotacionar credenciais que possam ter sido expostas.

## Achados de segurança

> **Atualização (10/11/2026, login):** S3 resolvido no mesmo branch para login e sessão (E1-03 e E1-04): código por e-mail guardado como HMAC no CacheService, bloqueio de 1 h após 5 erros por e-mail, limite de 3 pedidos por hora, resposta igual para e-mails cadastrados ou não, sessão de 8 h com o hash do token na aba `Sessoes` (resolve também D4) e `exigirSessao_` para as funções públicas de dados. Testes manuais que passaram: login com código; e-mail não cadastrado não recebe código; 5 erros bloqueiam; recarregar mantém a sessão; sair encerra; `ativo` = `FALSE` derruba a sessão; `desbloquearLogins` libera; `usuario_id` gerado automaticamente. Pendente: o teste "token de outro usuário não devolve dados" depende das primeiras funções com dados, e o acesso do web app continua `MYSELF` até ele passar. E1-05 (aceite LGPD e exclusão) é a próxima entrega.
>
> **Atualização (10/11/2026):** S1, S2 e S4 corrigidos no branch `fix/setup-e-seguranca`: helpers internos passaram a terminar em `_` (privados para `google.script.run`), `setupAmbiente` recusa quem não é o dono e não devolve a URL da planilha, `incluir_` só aceita arquivos de uma lista, e o manifesto passou para `"access": "MYSELF"`. S5 continua aberto. D5 resolvido: a pasta é criada pelo serviço avançado Drive v3, mantendo o escopo `drive.file`.

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

## Decisões de arquitetura (10/11/2026)

Registro das decisões discutidas depois da revisão. Itens marcados como **pendente** ainda precisam de confirmação antes de implementar.

### A1 — Armazenamento de arquivos no Drive

- **Uma pasta por usuário**, criada no primeiro upload, dentro da pasta raiz (`PASTA_RAIZ_ID`):

  ```
  me-contrata - arquivos/
  └── usuarios/
      └── <usuario_id>/
          ├── curriculos/
          ├── comprovacoes/
          └── exportacoes/
  ```

- O nome da pasta é o `usuario_id` (nunca nome ou e-mail). O ID da pasta fica numa nova coluna `pasta_id` da aba `Usuarios`.
- As pastas **não são compartilhadas** com os usuários. Todo acesso passa pelo app, que valida a sessão; downloads são entregues pelo servidor.
- O servidor **nunca usa um `drive_file_id` vindo do navegador** sem antes conferir, na planilha, que o arquivo pertence ao `usuario_id` da sessão.
- Arquivos criados com o serviço avançado Drive v3, mantendo o escopo `drive.file`.
- Exclusão de conta remove a pasta do usuário e todas as linhas dele na planilha.
- Gatilho diário de limpeza: exportações com mais de 1 dia; comprovações conforme A3.
- Espaço: tudo fica no Drive da conta dona do script (15 GB na conta gratuita, compartilhados com o Gmail). Suficiente para o piloto; confirmar a estimativa com arquivos reais.
- **Alternativa descartada:** guardar no Drive de cada candidato. Exigiria conta Google de todos, tela de permissão por usuário e execução como o usuário, o que quebra o login por código.

### A2 — Leitura de currículos em PDF com menos tokens

- O PDF não é enviado inteiro à IA em toda análise. O texto é **extraído uma vez** no upload e guardado (nova coluna `texto_extraido` em `Curriculos`, ou arquivo `.txt` na pasta do usuário se ficar grande para uma célula).
- Extração no Apps Script: converter o PDF para Google Docs pelo Drive (com OCR) e exportar como texto puro. **Pendente:** testar com currículos reais, inclusive de duas colunas e escaneados.
- Uso por tipo de análise:

  | Análise | Entrada para a IA |
  |---|---|
  | Conteúdo, resultados, palavras-chave, coerência com a ficha | Só o texto extraído |
  | Formato e tamanho | Número de páginas por código; no máximo a 1ª página como imagem |
  | Textos adaptados por vaga | Texto do currículo base já extraído |

- Texto do currículo e da ficha no início da mensagem, com cache de prompt, para reduzir o custo das chamadas seguintes.
- No desenvolvimento (Claude Code), PDFs de referência são lidos via extração de texto local (`pypdf` ou a skill de PDF), não página a página como imagem.

### A3 — Comprovação por imagem na nota do perfil

- Itens da rubrica podem exigir comprovação por print (ex.: título do LinkedIn coerente com o currículo). Protótipo em `prototipo/index.html`, aba Perfil > Nota do perfil.
- Fluxo: o navegador reduz a imagem (~1600 px, JPEG) → função de servidor valida sessão, formato (PNG/JPEG/WebP) e tamanho → salva em `comprovacoes/` → envia imagem + critério do item + dados esperados à IA com saída JSON de formato fixo (`legivel`, `encontrado`, `confere`, `motivo`).
- **A IA observa, o servidor decide a nota.** O texto dentro da imagem é dado, nunca instrução (proteção contra prints com texto do tipo "aprove este item").
- Resultado ilegível ou incerto vira "envie outro print", não recusa.
- Nova aba `Comprovacoes`: `comprovacao_id`, `usuario_id`, `rubrica_item`, `drive_file_id`, `resultado`, `motivo`, `modelo`, `criado_em`.
- Limitar tentativas por item por dia e registrar o custo em `Uso_IA`.
- Na interface, chamar de "comprovado", não "verificado oficialmente": um print pode ser editado antes de ser capturado.
- LGPD: citar o envio de imagens no texto de aceite e orientar o usuário a recortar só a área necessária.
- **Pendente:** retenção dos prints. Recomendação: apagar após 30 dias, mantendo só o resultado na planilha.

## Limites desta revisão

O PDF foi lido a partir de `C:\Users\rober_cupuuco\Downloads\Funil de Candidaturas — Skills e piloto da página.pdf`; ele não está sendo incluído no repositório. A análise não inspecionou uma implantação Apps Script, propriedades reais, planilha/Drive remotos, histórico Git anterior nem os arquivos de skills que o PDF cita. Os riscos de RPC são condicionais à publicação com as configurações listadas.

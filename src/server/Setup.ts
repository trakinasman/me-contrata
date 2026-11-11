/**
 * Cria (ou completa) a planilha e a pasta do Drive e grava os IDs nas
 * Propriedades do Script. Idempotente: pode rodar de novo sem duplicar nada.
 * Rode pelo editor do Apps Script.
 *
 * Fica pública só para aparecer no menu "Executar" do editor; quem não for o
 * dono do script é recusado. Não devolve nada para não expor a URL da planilha.
 */
function setupAmbiente(): void {
  exigirDono_();
  const props = PropertiesService.getScriptProperties();

  let ss: GoogleAppsScript.Spreadsheet.Spreadsheet;
  const idPlanilha = props.getProperty(PROP.PLANILHA_ID);
  if (idPlanilha) {
    ss = SpreadsheetApp.openById(idPlanilha);
  } else {
    ss = SpreadsheetApp.create("me-contrata - dados");
    props.setProperty(PROP.PLANILHA_ID, ss.getId());
  }

  if (!props.getProperty(PROP.PASTA_RAIZ_ID)) {
    // Serviço avançado do Drive (v3): funciona com o escopo drive.file,
    // enquanto DriveApp.createFolder exigiria acesso total ao Drive.
    const pasta = Drive.Files.create({
      name: "me-contrata - arquivos",
      mimeType: "application/vnd.google-apps.folder",
    });
    props.setProperty(PROP.PASTA_RAIZ_ID, pasta.id);
  }

  if (!props.getProperty(PROP.AGENTE_SEGREDO)) {
    props.setProperty(PROP.AGENTE_SEGREDO, Utilities.getUuid() + Utilities.getUuid());
  }

  if (!props.getProperty(PROP.LOGIN_SEGREDO)) {
    props.setProperty(PROP.LOGIN_SEGREDO, Utilities.getUuid() + Utilities.getUuid());
  }

  setupPlanilha_(ss);
  cadastrarDonoComoAdmin_();
  Logger.log("Ambiente pronto. Planilha: " + ss.getUrl());
}

/**
 * Garante que a conta dona do script esteja na aba Usuarios como admin ativo,
 * para o primeiro login funcionar. O e-mail vem da própria conta, nunca do código.
 */
function cadastrarDonoComoAdmin_(): void {
  const dono = Session.getEffectiveUser().getEmail().trim().toLowerCase();
  if (!dono || buscarUsuarioPorEmail_(dono)) return;
  anexarLinha_("Usuarios", {
    usuario_id: Utilities.getUuid(),
    email: dono,
    nome: "",
    papel: "admin",
    ativo: true,
    criado_em: new Date(),
  });
  Logger.log("Conta dona cadastrada como admin na aba Usuarios.");
}

/**
 * Libera os logins bloqueados de todos os e-mails da aba Usuarios: apaga
 * bloqueio, contador de erros, limite de pedidos e código pendente.
 * Rode pelo editor quando um candidato se bloquear e não puder esperar 1 hora.
 * (O cache não permite listar quem está bloqueado; por isso libera todos.)
 */
function desbloquearLogins(): void {
  exigirDono_();
  const { cab, linhas } = lerAba_("Usuarios");
  const cEmail = coluna_(cab, "email");
  const chaves: string[] = [];
  let n = 0;
  for (const l of linhas) {
    const e = normalizarEmail_(l[cEmail]);
    if (!e) continue;
    const chave = hmac_("email:" + e);
    chaves.push("bloq:" + chave, "err:" + chave, "ped:" + chave, "cod:" + chave);
    n++;
  }
  if (chaves.length) CacheService.getScriptCache().removeAll(chaves);
  registrarLog_("", "admin_desbloqueio", `${n} e-mails`);
  Logger.log(`Logins liberados para ${n} e-mails da aba Usuarios.`);
}

/**
 * Recusa a execução se quem chama não for a conta dona do script.
 * Num web app "Executar como: eu", o usuário efetivo é o dono e o usuário
 * ativo é o visitante (vazio se anônimo ou de outro domínio).
 */
function exigirDono_(): void {
  const ativo = Session.getActiveUser().getEmail();
  const dono = Session.getEffectiveUser().getEmail();
  if (!ativo || ativo !== dono) {
    throw new Error("Acesso negado: função administrativa.");
  }
}

/** Garante as abas, os cabeçalhos e as validações do ESQUEMA. */
function setupPlanilha_(ss: GoogleAppsScript.Spreadsheet.Spreadsheet): void {
  for (const [nome, colunas] of Object.entries(ESQUEMA)) {
    const aba = ss.getSheetByName(nome) ?? ss.insertSheet(nome);
    const atual = aba.getLastColumn() > 0
      ? aba.getRange(1, 1, 1, aba.getLastColumn()).getValues()[0].map(String)
      : [];
    const faltando = colunas.filter((c) => !atual.includes(c));
    if (faltando.length) {
      aba.getRange(1, atual.length + 1, 1, faltando.length).setValues([faltando]);
    }
    aba.setFrozenRows(1);
    aba.getRange(1, 1, 1, aba.getLastColumn()).setFontWeight("bold");

    const cabecalho = aba.getRange(1, 1, 1, aba.getLastColumn()).getValues()[0].map(String);
    for (const [coluna, lista] of Object.entries(VALIDACOES[nome] ?? {})) {
      const idx = cabecalho.indexOf(coluna);
      if (idx < 0) continue;
      const regra = SpreadsheetApp.newDataValidation()
        .requireValueInList(LISTAS[lista], true)
        .setAllowInvalid(false)
        .build();
      aba.getRange(2, idx + 1, aba.getMaxRows() - 1, 1).setDataValidation(regra);
    }
  }
  // Remove a aba padrão criada com a planilha.
  for (const nome of ["Sheet1", "Página1", "Planilha1"]) {
    const padrao = ss.getSheetByName(nome);
    if (padrao && ss.getSheets().length > 1) ss.deleteSheet(padrao);
  }
}

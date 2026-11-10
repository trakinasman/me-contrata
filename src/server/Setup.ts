/**
 * Cria (ou completa) a planilha e a pasta do Drive e grava os IDs nas
 * Propriedades do Script. Idempotente: pode rodar de novo sem duplicar nada.
 * Rode pelo editor do Apps Script ou com `npm run setup`.
 */
function setupAmbiente(): string {
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
    const pasta = DriveApp.createFolder("me-contrata - arquivos");
    props.setProperty(PROP.PASTA_RAIZ_ID, pasta.getId());
  }

  if (!props.getProperty(PROP.AGENTE_SEGREDO)) {
    props.setProperty(PROP.AGENTE_SEGREDO, Utilities.getUuid() + Utilities.getUuid());
  }

  setupPlanilha(ss);
  return ss.getUrl();
}

/** Garante as abas, os cabeçalhos e as validações do ESQUEMA. */
function setupPlanilha(ss: GoogleAppsScript.Spreadsheet.Spreadsheet): void {
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

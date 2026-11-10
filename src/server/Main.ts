/** Entrada do web app. */
function doGet(): GoogleAppsScript.HTML.HtmlOutput {
  return HtmlService.createTemplateFromFile("Index")
    .evaluate()
    .setTitle("me-contrata")
    .addMetaTag("viewport", "width=device-width, initial-scale=1");
}

/** Permite <?!= incluir('Arquivo') ?> nos templates HTML. */
function incluir(arquivo: string): string {
  return HtmlService.createHtmlOutputFromFile(arquivo).getContent();
}

/** Verificação de saúde chamada pela página. Não expõe dado nenhum. */
function ping(): { ok: boolean; versao: string } {
  return { ok: true, versao: "0.1.0" };
}

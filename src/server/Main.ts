/** Entrada do web app. */
function doGet(): GoogleAppsScript.HTML.HtmlOutput {
  return HtmlService.createTemplateFromFile("Index")
    .evaluate()
    .setTitle("me-contrata")
    .addMetaTag("viewport", "width=device-width, initial-scale=1");
}

/** Arquivos HTML que os templates podem incluir. */
const INCLUSOES_PERMITIDAS = ["Estilo"];

/** Permite <?!= incluir_('Arquivo') ?> nos templates HTML. */
function incluir_(arquivo: string): string {
  if (!INCLUSOES_PERMITIDAS.includes(arquivo)) {
    throw new Error(`Inclusão não permitida: ${arquivo}`);
  }
  return HtmlService.createHtmlOutputFromFile(arquivo).getContent();
}

/** Verificação de saúde chamada pela página. Não expõe dado nenhum. */
function ping(): { ok: boolean; versao: string } {
  return { ok: true, versao: "0.1.0" };
}

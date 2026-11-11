/** Chaves das Propriedades do Script. Valores nunca ficam no código nem no Git. */
const PROP = {
  PLANILHA_ID: "PLANILHA_ID",
  PASTA_RAIZ_ID: "PASTA_RAIZ_ID",
  CLAUDE_API_KEY: "CLAUDE_API_KEY",
  AGENTE_SEGREDO: "AGENTE_SEGREDO",
} as const;

const MODELO_IA = "claude-sonnet-5-5";

// Funções terminadas em "_" são privadas no Apps Script: a página não
// consegue chamá-las por google.script.run. Todo helper interno segue isso.

function prop_(chave: string): string | null {
  return PropertiesService.getScriptProperties().getProperty(chave);
}

function propObrigatoria_(chave: string): string {
  const v = prop_(chave);
  if (!v) throw new Error(`Propriedade do Script ausente: ${chave}. Rode setupAmbiente().`);
  return v;
}

function planilha_(): GoogleAppsScript.Spreadsheet.Spreadsheet {
  return SpreadsheetApp.openById(propObrigatoria_(PROP.PLANILHA_ID));
}

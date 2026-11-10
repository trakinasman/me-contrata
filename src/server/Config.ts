/** Chaves das Propriedades do Script. Valores nunca ficam no código nem no Git. */
const PROP = {
  PLANILHA_ID: "PLANILHA_ID",
  PASTA_RAIZ_ID: "PASTA_RAIZ_ID",
  CLAUDE_API_KEY: "CLAUDE_API_KEY",
  AGENTE_SEGREDO: "AGENTE_SEGREDO",
} as const;

const MODELO_IA = "claude-sonnet-5-5";

function prop(chave: string): string | null {
  return PropertiesService.getScriptProperties().getProperty(chave);
}

function propObrigatoria(chave: string): string {
  const v = prop(chave);
  if (!v) throw new Error(`Propriedade do Script ausente: ${chave}. Rode setupAmbiente().`);
  return v;
}

function planilha(): GoogleAppsScript.Spreadsheet.Spreadsheet {
  return SpreadsheetApp.openById(propObrigatoria(PROP.PLANILHA_ID));
}

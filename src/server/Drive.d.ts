// Tipos mínimos do serviço avançado do Drive (v3), ativado em appsscript.json.
// O pacote @types/google-apps-script não inclui os serviços avançados.
declare namespace DriveV3 {
  interface Arquivo {
    id: string;
    name?: string;
    mimeType?: string;
    parents?: string[];
  }
}
declare const Drive: {
  Files: {
    create(recurso: Partial<DriveV3.Arquivo>, blob?: GoogleAppsScript.Base.Blob): DriveV3.Arquivo;
    /** Apaga de vez (sem passar pela lixeira). */
    remove(fileId: string): void;
  };
};

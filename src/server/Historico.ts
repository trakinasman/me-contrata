/**
 * Histórico da nota do perfil (E4-06).
 *
 * Cada análise do PDF e cada nota completada por print ou resposta grava uma linha nova em
 * Analises (E4-02, E4-03). O histórico lê essas linhas do candidato, da mais nova para a mais
 * antiga, e diz o que mudou em cada uma em relação à anterior: a nota de cada item e de onde
 * ela veio (PDF, print ou resposta). Não precisa de coluna nova.
 */

const HISTORICO = { MAX_ENTRADAS: 30 } as const;

interface MudancaNota {
  item: string;
  nome: string;
  de: number | null; // null = não avaliado
  para: number | null;
  origem: string; // "pdf", "print" ou "resposta"
}

interface EntradaHistorico {
  id: string;
  criadoEm: string;
  total: number;
  maximo: number;
  parcial: boolean;
  /** Diferença do total para a análise anterior (null na primeira). */
  delta: number | null;
  mudancas: MudancaNota[];
}

// ---------- Função chamada pela página ----------

function historicoNotas(token: string): { entradas: EntradaHistorico[] } {
  const s = exigirAceite_(token);
  const { cab, linhas } = lerAba_("Analises");
  const c = (n: string) => coluna_(cab, n);
  const porItem = new Map(RUBRICA_PERFIL.ITENS.map((i) => [i.item as string, i]));

  const minhas = linhas
    .filter((l) => String(l[c("usuario_id")]).trim() === s.usuario_id)
    .map((l) => {
      let salvos: { item: string; nota: number | null; origem?: string | null }[] = [];
      try { salvos = JSON.parse(String(l[c("itens_json")])); } catch (_) { salvos = []; }
      const notas = new Map<string, { nota: number | null; origem: string }>();
      for (const x of salvos) {
        if (!porItem.has(x.item)) continue;
        notas.set(x.item, { nota: typeof x.nota === "number" ? x.nota : null, origem: x.origem || "pdf" });
      }
      const criado = l[c("criado_em")];
      const total = Number(l[c("total")]) || 0;
      const naoAvaliados = [...notas.entries()].filter(([, v]) => v.nota === null)
        .reduce((n, [item]) => n + (porItem.get(item)?.pontos ?? 0), 0);
      return {
        id: String(l[c("analise_id")]),
        criadoEm: criado instanceof Date ? criado.toISOString() : String(criado),
        ordem: criado instanceof Date ? criado.getTime() : 0,
        total,
        maximo: total + naoAvaliados,
        parcial: verdadeiro_(l[c("parcial")]),
        notas,
      };
    });
  // A aba guarda na ordem de gravação; a data desempata se alguém reordenar à mão.
  minhas.sort((a, b) => a.ordem - b.ordem);

  const entradas: EntradaHistorico[] = minhas.map((a, i) => {
    const anterior = i > 0 ? minhas[i - 1] : null;
    const mudancas: MudancaNota[] = [];
    if (anterior) {
      for (const ref of RUBRICA_PERFIL.ITENS) {
        const antes = anterior.notas.get(ref.item);
        const agora = a.notas.get(ref.item);
        if (!agora) continue;
        const de = antes ? antes.nota : null;
        if (de === agora.nota) continue;
        mudancas.push({ item: ref.item, nome: ref.nome, de, para: agora.nota, origem: agora.origem });
      }
    }
    return {
      id: a.id, criadoEm: a.criadoEm, total: a.total, maximo: a.maximo, parcial: a.parcial,
      delta: anterior ? a.total - anterior.total : null, mudancas,
    };
  });
  return { entradas: entradas.reverse().slice(0, HISTORICO.MAX_ENTRADAS) };
}

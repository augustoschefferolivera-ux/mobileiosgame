// Armazenamento do meta (design/decisoes-F-007.md SV2, SV7): só `localStorage`, na chave `vdc.meta`, com try/catch em
// toda leitura e escrita (modo privado, cota, ITP) e queda para a memória da sessão. O IndexedDB não entra (D10 ST1,
// que cancela o adiamento da F-007). Migração (D10 MT2): antes de gravar o 1º meta migrado, o texto antigo vai para
// `vdc.meta.anterior` (uma geração); se `vdc.meta` não vale, o boot tenta o `anterior` e só depois os padrões.
import { examinarMeta, metaPadrao, serializarMeta, type Meta } from '../logica/save/meta';
import { armazenamentoLocal, type Armazenamento } from './sonda';

export const CHAVE_DO_META = 'vdc.meta';
export const CHAVE_DO_META_ANTERIOR = 'vdc.meta.anterior';

export class ArmazenamentoDoMeta {
  private memoria: string | null = null;
  /** O texto de uma versão antiga lido no boot, ainda por arquivar em `vdc.meta.anterior` na próxima gravação. */
  private porArquivar: string | null = null;

  constructor(private readonly armazenamento: Armazenamento | null = armazenamentoLocal()) {}

  private ler1(chave: string): string | null {
    try {
      return this.armazenamento?.getItem(chave) ?? null;
    } catch {
      return null;
    }
  }

  /**
   * O meta gravado, migrado se vier de uma versão antiga; se o texto não vale (leitura que falha, JSON quebrado, soma
   * errada, versão futura), o `vdc.meta.anterior`, e só então os padrões. Nunca lança.
   */
  ler(): Meta {
    // A memória é a última gravação desta sessão (vale mais que o disco se o `setItem` falhou).
    const texto = this.memoria ?? this.ler1(CHAVE_DO_META);
    const r = examinarMeta(texto);
    if (r.valido) {
      if (r.versaoLida < r.meta.versao && texto !== null) this.porArquivar = texto;
      return r.meta;
    }
    // `vdc.meta` ausente (1º boot) ou quebrado: a geração anterior, se valer.
    const anterior = examinarMeta(this.ler1(CHAVE_DO_META_ANTERIOR));
    return anterior.valido ? anterior.meta : metaPadrao();
  }

  /**
   * Grava (com a soma); se o `localStorage` falhar, o texto fica na memória da sessão. Nunca lança. Devolve `true` só se o
   * texto entrou no `localStorage`: quem remove o `vigilia` depois (FIM atômico, SV4) confere isso antes de remover.
   */
  gravar(meta: Meta): boolean {
    const texto = serializarMeta(meta);
    this.memoria = texto;
    try {
      if (this.armazenamento === null) return false;
      if (this.porArquivar !== null) {
        const antigo = this.porArquivar;
        this.porArquivar = null;
        try {
          this.armazenamento.setItem(CHAVE_DO_META_ANTERIOR, antigo);
        } catch {
          // Sem cota para a cópia: o meta novo segue (a cópia é uma rede de segurança, não um requisito).
        }
      }
      this.armazenamento.setItem(CHAVE_DO_META, texto);
      return true;
    } catch {
      // Cota cheia ou armazenamento bloqueado: a memória segura até a aba fechar.
      return false;
    }
  }
}

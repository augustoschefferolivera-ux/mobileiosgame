// Armazenamento do meta (design/decisoes-F-007.md SV2, SV7): só `localStorage`, na chave `vdc.meta`, com try/catch em
// toda leitura e escrita (modo privado, cota, ITP) e queda para a memória da sessão; a F-010 migra para o IndexedDB.
import { lerMeta, serializarMeta, type Meta } from '../logica/save/meta';
import { armazenamentoLocal, type Armazenamento } from './sonda';

export const CHAVE_DO_META = 'vdc.meta';

export class ArmazenamentoDoMeta {
  private memoria: string | null = null;

  constructor(private readonly armazenamento: Armazenamento | null = armazenamentoLocal()) {}

  /** O meta gravado, ou os padrões (leitura que falha, texto quebrado ou soma errada); nunca lança. */
  ler(): Meta {
    let texto: string | null;
    try {
      texto = this.armazenamento?.getItem(CHAVE_DO_META) ?? null;
    } catch {
      texto = null;
    }
    return lerMeta(texto ?? this.memoria);
  }

  /** Grava (com a soma); se o `localStorage` falhar, o texto fica na memória da sessão. Nunca lança. */
  gravar(meta: Meta): void {
    const texto = serializarMeta(meta);
    this.memoria = texto;
    try {
      this.armazenamento?.setItem(CHAVE_DO_META, texto);
    } catch {
      // Cota cheia ou armazenamento bloqueado: a memória segura até a aba fechar.
    }
  }
}

// Migração do `vigilia` do layout 8 para o 9 (design/decisoes-F-009.md §1; D8 SV7): o buffer ganha o bloco do chefe em
// zero com `chefeSlot` = 0xFFFF e a versão passa a 9; o resto não muda.
import { describe, expect, it } from 'vitest';
import { BYTES_DO_LAYOUT_8, BYTES_DO_LAYOUT_9, CAB, CHEFE_U16, SEM_CHEFE, VERSAO_LAYOUT, criarEstado, hashEstado } from '../../../src/logica/nucleo/estado';
import { avancar } from '../../../src/logica/nucleo/passo';
import { MIGRACOES_DO_LAYOUT, migrarLayout } from '../../../src/logica/save/migracoes';
import { restaurar, serializarVigilia, lerVigilia } from '../../../src/logica/save/vigilia';
import { DADOS_DA_CHARNECA as D, PARADO } from '../apoio';

describe('layout 8 → 9', () => {
  it('estende com o bloco do chefe em zero, o slot sem chefe e a versão 9; os bytes do v8 não mudam', () => {
    const e = criarEstado(1, D);
    avancar(e, D, PARADO, 200);
    const v8 = e.bytes.slice(0, BYTES_DO_LAYOUT_8);
    new Uint32Array(v8.buffer, 0, 16)[CAB.versao] = 8;
    const novo = migrarLayout(v8, 8, 9)!;
    // O elo 8 → 9 para no v9 (76.868 B); o 9 → 10 (F-010) acrescenta a Fundação depois.
    expect(novo.length).toBe(BYTES_DO_LAYOUT_9);
    expect(new Uint32Array(novo.buffer, 0, 16)[CAB.versao]).toBe(9);
    expect([...novo.subarray(4, BYTES_DO_LAYOUT_8)]).toEqual([...e.bytes.subarray(4, BYTES_DO_LAYOUT_8)]);
    expect([...novo.subarray(4)]).toEqual([...e.bytes.subarray(4, BYTES_DO_LAYOUT_9)]);
    expect(MIGRACOES_DO_LAYOUT[8]).toBeDefined();
  });

  it('um save do layout 8 restaura no 9 com o mesmo hash do estado que o gerou', () => {
    const e = criarEstado(1, D);
    avancar(e, D, PARADO, 300);
    const envelope = JSON.parse(serializarVigilia(e, 1)) as { bytes: string; layout: number };
    expect(envelope.layout).toBe(VERSAO_LAYOUT);
    const antigo = new Uint8Array(e.bytes.slice(0, BYTES_DO_LAYOUT_8));
    new Uint32Array(antigo.buffer, 0, 16)[CAB.versao] = 8;
    const texto = serializarVigilia(e, 1);
    const lido = lerVigilia(texto);
    if (!lido.ok) throw new Error(lido.motivo);
    const base64 = btoa(String.fromCharCode(...antigo));
    const alvo = criarEstado(9, D);
    expect(restaurar(alvo, D, { ...lido.envelope, layout: 8, bytes: base64 })).toBe('ok');
    expect(hashEstado(alvo)).toBe(hashEstado(e));
    expect(alvo.chefeU16[CHEFE_U16.slot]).toBe(SEM_CHEFE);
  });
});

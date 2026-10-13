// Migração do `vigilia` do layout 9 para o 10 (design/decisoes-F-010.md LY1; D8 SV7): o buffer ganha os 4 B da Fundação em
// zero e a versão passa a 10; o resto não muda.
import { describe, expect, it } from 'vitest';
import { BYTES_DO_LAYOUT_9, CAB, VERSAO_LAYOUT, criarEstado, hashEstado } from '../../../src/logica/nucleo/estado';
import { avancar } from '../../../src/logica/nucleo/passo';
import { MIGRACOES_DO_LAYOUT, migrarLayout } from '../../../src/logica/save/migracoes';
import { lerVigilia, restaurar, serializarVigilia } from '../../../src/logica/save/vigilia';
import { DADOS_DA_CHARNECA as D, PARADO } from '../apoio';

describe('layout 9 → 10', () => {
  it('estende com os 4 B da Fundação em zero e a versão 10; os bytes do v9 não mudam', () => {
    const e = criarEstado(1, D);
    avancar(e, D, PARADO, 200);
    const v9 = e.bytes.slice(0, BYTES_DO_LAYOUT_9);
    new Uint32Array(v9.buffer, 0, 16)[CAB.versao] = 9;
    const novo = migrarLayout(v9, 9, 10)!;
    expect(novo.length).toBe(e.bytes.length);
    expect(new Uint32Array(novo.buffer, 0, 16)[CAB.versao]).toBe(10);
    expect([...novo]).toEqual([...e.bytes]);
    expect(MIGRACOES_DO_LAYOUT[9]).toBeDefined();
  });

  it('a cadeia 8 → 9 → 10 chega ao tamanho do v10', () => {
    const e = criarEstado(1, D);
    const v8 = e.bytes.slice(0, 76_788);
    new Uint32Array(v8.buffer, 0, 16)[CAB.versao] = 8;
    expect(migrarLayout(v8, 8, VERSAO_LAYOUT)!.length).toBe(e.bytes.length);
  });

  it('um save do layout 9 restaura no 10 com o mesmo hash e os ranks em zero', () => {
    const e = criarEstado(1, D);
    avancar(e, D, PARADO, 300);
    const lido = lerVigilia(serializarVigilia(e, 1));
    if (!lido.ok) throw new Error(lido.motivo);
    const antigo = new Uint8Array(e.bytes.slice(0, BYTES_DO_LAYOUT_9));
    new Uint32Array(antigo.buffer, 0, 16)[CAB.versao] = 9;
    const alvo = criarEstado(9, D, {});
    expect(restaurar(alvo, D, { ...lido.envelope, layout: 9, bytes: btoa(String.fromCharCode(...antigo)) })).toBe('ok');
    expect(hashDosEstado(alvo)).toBe(hashDosEstado(e));
    expect([...alvo.fundacaoU8]).toEqual([0, 0, 0, 0]);
  });
});
const hashDosEstado = hashEstado;

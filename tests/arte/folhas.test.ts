// Folhas da arte (F-011.3, F-011.4): todas as molduras do catálogo em escala real do jogo, lado a lado, para o
// revisor de consistência. Com VDC_EVIDENCIAS=1 (o verify), a folha vai para production/evidencias/F-011/folhas.png.
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CATALOGO, ESCALA_DA_GRADE } from '../../src/arte/catalogo';
import { folhas } from '../../scripts/arte/folhas';
import { salvarPng } from '../../scripts/arte/png';

describe('folhas da arte', () => {
  it('cabem numa folha de 390 pt de largura (780 px, o canvas de 2×) com todas as molduras', () => {
    const img = folhas();
    expect(img.largura).toBe(780);
    const area = CATALOGO.reduce((s, e) => {
      const i = e.criar();
      const esc = ESCALA_DA_GRADE[e.grade] * 2;
      return s + i.largura * esc * i.altura * esc;
    }, 0);
    expect(img.largura * img.altura).toBeGreaterThan(area);
    if (process.env['VDC_EVIDENCIAS'] === '1') {
      const dir = join('production', 'evidencias', 'F-011');
      mkdirSync(dir, { recursive: true });
      salvarPng(join(dir, 'folhas.png'), img);
    }
  });
});

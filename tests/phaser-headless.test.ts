// @vitest-environment jsdom
// Prova de que o Phaser 4.2.1 roda em modo HEADLESS no Node (jsdom) para testes de lógica que
// dependem de objetos Phaser reais. Sem renderer, sem pixels: screenshot é do Playwright.
import { afterEach, describe, expect, it } from 'vitest';
import Phaser from 'phaser';

let game: Phaser.Game | null = null;

function bootHeadless(config: Partial<Phaser.Types.Core.GameConfig> = {}): Promise<Phaser.Scene> {
  return new Promise((resolve) => {
    const parent = document.createElement('div');
    parent.id = 'game-teste';
    document.body.appendChild(parent);
    game = new Phaser.Game({
      type: Phaser.HEADLESS,
      width: 390,
      height: 844,
      parent,
      banner: false,
      audio: { noAudio: true },
      scene: {
        key: 'teste',
        create(this: Phaser.Scene) {
          resolve(this);
        },
      },
      ...config,
    });
  });
}

afterEach(() => {
  game?.destroy(true);
  game = null;
  document.body.innerHTML = '';
});

describe('Phaser 4 HEADLESS no jsdom', () => {
  it('é a versão fixada no package.json', () => {
    expect(Phaser.VERSION).toBe('4.2.1');
  });

  it('boota um Game sem renderer e cria objetos reais na cena', async () => {
    const scene = await bootHeadless();
    const sprite = scene.add.sprite(100, 200, '__DEFAULT');
    expect(sprite.x).toBe(100);
    expect(sprite.type).toBe('Sprite');
    expect(scene.scale.width).toBe(390);
    expect(scene.scale.height).toBe(844);
  });

  it('Arcade Physics funciona sem navegador', async () => {
    const scene = await bootHeadless({ physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 } } } });
    const corpo = scene.physics.add.sprite(0, 0, '__DEFAULT');
    expect(corpo.body).toBeDefined();
    const antes = corpo.body.x; // body.x é o canto do corpo (origem 0.5 → começa em -16), não o x do sprite
    corpo.body.setVelocity(100, 0);
    scene.physics.world.step(1 / 60);
    expect(corpo.body.x).toBeGreaterThan(antes);
  });

  it('seed fixa torna Phaser.Math.RND determinístico (base do playtest reproduzível)', async () => {
    const scene = await bootHeadless({ seed: ['playtest-42'] });
    const a = scene.game.config.seed;
    expect(a).toEqual(['playtest-42']);
    const rngA = new Phaser.Math.RandomDataGenerator(['playtest-42']);
    const rngB = new Phaser.Math.RandomDataGenerator(['playtest-42']);
    expect([rngA.between(0, 1000), rngA.between(0, 1000)]).toEqual([rngB.between(0, 1000), rngB.between(0, 1000)]);
  });
});

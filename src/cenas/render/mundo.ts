// Render do mundo da Vigília (ADR-0002 §3 e §11; design/decisoes-F-002.md §5;
// design/decisoes-F-003.md §7; design/decisoes-F-004.md §6). Camadas, nesta
// ordem de desenho: chão (vazio no MVP), obstáculos, mortes, horda, status
// (Sal), armas (facas, aura, golpes e pulsos), jogador e dígitos dos números de
// dano. Os 54 obstáculos e o jogador são Image nos dois modos; a horda e as
// camadas das armas vão para os escritores injetados (SpriteGPULayer ou o pool
// de Image do plano B), que só escrevem o que as funções de preparo calculam.
// O anel de eventos é lido uma vez por quadro, antes de desenhar. Cada objeto é
// desenhado na cópia mais próxima da câmera; o jogador, na posição interpolada
// pelo delta toroidal, arredondada para o pixel do canvas como a câmera. Nada é
// alocado por frame.
import type Phaser from 'phaser';
import { JOGADOR, type Estado } from '../../logica/nucleo/estado';
import type { DadosDaVigilia } from '../../logica/mundo/dados';
import { ALTURA_DO_MAPA, LARGURA_DO_MAPA, copiaMaisProxima, interpolarNoToro } from '../../logica/mundo/toro';
import { COR } from '../estilo';
import { CHAVE_DO_ATLAS, escalaPara } from './atlas';
import { arredondarParaOPixel } from './camera';
import { MEMBROS_DAS_ARMAS, MEMBROS_DOS_DIGITOS, prepararArmas, prepararMortes, prepararNumeros, prepararStatus } from './armas';
import { criarSaidaDeSprites, type EscritorDeSprites, type SaidaDeSprites } from './camadas';
import { CAPACIDADE_DE_MORTES, EfeitosDaVigilia } from './efeitos';
import type { EscritorDaHorda } from './escritores';
import { criarSaidaDaHorda, prepararHorda, type DesenhoDoTipo } from './horda';
import { CAPACIDADE_DE_INIMIGOS } from '../../logica/nucleo/estado';

export interface RenderDoMundo {
  /** Desenha o estado interpolado por `alfa`, com a câmera centrada em (camX, camY), em px lógicos. */
  sincronizar(e: Estado, alfa: number, camX: number, camY: number): void;
  /** Libera o que o Phaser não libera sozinho (SHUTDOWN da cena). */
  liberar(): void;
}

/** A horda: o escritor (criado entre os obstáculos e o jogador) e a tabela de desenho por tipo. */
export interface HordaDoRender {
  criar(cena: Phaser.Scene): EscritorDaHorda;
  readonly tabela: readonly (DesenhoDoTipo | null)[];
}

/** As camadas das armas (F-004): o criador dos escritores e a opção de números de dano (lida a cada quadro). */
export interface ArmasDoRender {
  criar(cena: Phaser.Scene, capacidade: number): EscritorDeSprites;
  readonly opcoes: { readonly numerosDeDano: boolean };
}

interface Camada {
  readonly escritor: EscritorDeSprites;
  readonly saida: SaidaDeSprites;
}

/** Triângulo do jogador: base e altura de 48 px (design/decisoes-F-002.md §5). */
const BASE_DO_TRIANGULO = 48;
const ALTURA_DO_TRIANGULO = 48;
/** Incentro: r = área ÷ semiperímetro ≈ 14,83 px acima da base; é a posição (x, y) e o pivô da rotação (§3). */
const LADO_DO_TRIANGULO = Math.sqrt((BASE_DO_TRIANGULO / 2) ** 2 + ALTURA_DO_TRIANGULO ** 2);
const INRAIO = (BASE_DO_TRIANGULO * ALTURA_DO_TRIANGULO) / (BASE_DO_TRIANGULO + 2 * LADO_DO_TRIANGULO);
/** Origem do sprite com a ponta para cima: (0,5; ≈ 0,691). */
export const ORIGEM_Y_DO_JOGADOR = (ALTURA_DO_TRIANGULO - INRAIO) / ALTURA_DO_TRIANGULO;

/** Ângulo do triângulo para a direção (dirX, dirY): 0 aponta para cima. */
export function anguloDoJogador(dirX: number, dirY: number): number {
  return Math.atan2(dirY, dirX) + Math.PI / 2;
}

export class RenderDaVigilia implements RenderDoMundo {
  private readonly obstaculos: Phaser.GameObjects.Image[] = [];
  private readonly jogador: Phaser.GameObjects.Image;
  /** O escritor da horda (null nos testes do render de obstáculos e jogador). */
  readonly horda: EscritorDaHorda | null;
  private readonly tabela: readonly (DesenhoDoTipo | null)[];
  private readonly saida = criarSaidaDaHorda();
  /** Consumidor do anel e pools do render (null sem as camadas das armas). */
  readonly efeitos: EfeitosDaVigilia | null;
  private readonly mortes: Camada | null = null;
  private readonly status: Camada | null = null;
  private readonly armasCamada: Camada | null = null;
  private readonly digitos: Camada | null = null;

  constructor(
    cena: Phaser.Scene,
    private readonly dados: DadosDaVigilia,
    horda: HordaDoRender | null,
    private readonly armas: ArmasDoRender | null = null,
  ) {
    cena.add.layer(); // chão: vazio até a arte (§5, C1)
    const camadaDosObstaculos = cena.add.layer();
    const o = dados.obstaculos;
    for (let i = 0; i < o.n; i++) {
      const img = cena.add
        .image(o.x[i]!, o.y[i]!, CHAVE_DO_ATLAS, 'circulo')
        .setTint(COR.cinzaFrio)
        .setScale(escalaPara('circulo', o.r[i]! * 2));
      camadaDosObstaculos.add(img);
      this.obstaculos.push(img);
    }
    const camada = (capacidade: number): Camada => ({ escritor: armas!.criar(cena, capacidade), saida: criarSaidaDeSprites(capacidade) });
    this.efeitos = armas ? new EfeitosDaVigilia(dados.tipos) : null;
    if (armas) this.mortes = camada(CAPACIDADE_DE_MORTES);
    this.horda = horda ? horda.criar(cena) : null;
    this.tabela = horda ? horda.tabela : [];
    if (armas) {
      this.status = camada(CAPACIDADE_DE_INIMIGOS);
      this.armasCamada = camada(MEMBROS_DAS_ARMAS);
    }
    this.jogador = cena.add
      .image(dados.inicioX, dados.inicioY, CHAVE_DO_ATLAS, 'triangulo')
      .setTint(COR.brasa)
      .setOrigin(0.5, ORIGEM_Y_DO_JOGADOR)
      .setScale(escalaPara('triangulo', BASE_DO_TRIANGULO));
    cena.add.layer([this.jogador]);
    if (armas) this.digitos = camada(MEMBROS_DOS_DIGITOS);
  }

  sincronizar(e: Estado, alfa: number, camX: number, camY: number): void {
    const o = this.dados.obstaculos;
    for (let i = 0; i < o.n; i++) {
      this.obstaculos[i]!.setPosition(copiaMaisProxima(o.x[i]!, camX, LARGURA_DO_MAPA), copiaMaisProxima(o.y[i]!, camY, ALTURA_DO_MAPA));
    }
    const j = e.jogador;
    // Arredondado como a câmera (C2): o triângulo fica no mesmo pixel, sem tremor sub-pixel no centro da tela.
    const x = arredondarParaOPixel(interpolarNoToro(j[JOGADOR.xAnt]!, j[JOGADOR.x]!, alfa, LARGURA_DO_MAPA));
    const y = arredondarParaOPixel(interpolarNoToro(j[JOGADOR.yAnt]!, j[JOGADOR.y]!, alfa, ALTURA_DO_MAPA));
    const jx = copiaMaisProxima(x, camX, LARGURA_DO_MAPA);
    const jy = copiaMaisProxima(y, camY, ALTURA_DO_MAPA);
    if (this.efeitos && this.armas) this.efeitos.consumir(e, this.armas.opcoes.numerosDeDano);
    if (this.horda) {
      prepararHorda(e, alfa, camX, camY, this.saida);
      this.horda.escrever(this.saida, this.tabela);
    }
    const ef = this.efeitos;
    if (ef && this.mortes && this.status && this.armasCamada && this.digitos) {
      prepararMortes(ef, e, alfa, camX, camY, this.tabela, this.mortes.saida);
      this.mortes.escritor.escrever(this.mortes.saida);
      prepararStatus(e, this.saida, this.status.saida);
      this.status.escritor.escrever(this.status.saida);
      prepararArmas(e, this.dados, ef, alfa, camX, camY, jx, jy, this.armasCamada.saida);
      this.armasCamada.escritor.escrever(this.armasCamada.saida);
      prepararNumeros(ef, e, alfa, camX, camY, this.digitos.saida);
      this.digitos.escritor.escrever(this.digitos.saida);
    }
    this.jogador.setPosition(jx, jy);
    this.jogador.setRotation(anguloDoJogador(j[JOGADOR.dirX]!, j[JOGADOR.dirY]!));
  }

  liberar(): void {
    this.horda?.liberar();
    this.mortes?.escritor.liberar();
    this.status?.escritor.liberar();
    this.armasCamada?.escritor.liberar();
    this.digitos?.escritor.liberar();
  }
}

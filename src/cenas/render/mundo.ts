// Render do mundo da Vigília (ADR-0002 §3 e §11; design/decisoes-F-002.md §5;
// design/decisoes-F-003.md §7; design/decisoes-F-004.md §6). Camadas, nesta
// ordem de desenho: chão (vazio no MVP), mundo (54 obstáculos e 512 pickups,
// F-005 R1), mortes, horda (a massa), médios (F-006 RE8, acima da massa), status
// (Sal e atordoado), telegrafos (cunha e faixa no chão, RE5), armas (facas, aura,
// golpes, pulsos e ondas da União), projéteis inimigos (RE6), jogador e dígitos
// dos números de dano. O jogador é Image nos
// dois modos; a horda e as camadas vão para os escritores injetados
// (SpriteGPULayer ou o pool de Image do plano B), que só escrevem o que as
// funções de preparo calculam. Sem as camadas (testes do render de obstáculos e
// jogador), os obstáculos continuam Image.
// O anel de eventos é lido uma vez por quadro, antes de desenhar. Cada objeto é
// desenhado na cópia mais próxima da câmera; o jogador, na posição interpolada
// pelo delta toroidal, arredondada para o pixel do canvas como a câmera. Nada é
// alocado por frame.
import type Phaser from 'phaser';
import { CAB, CAPACIDADE_DE_INIMIGOS, emJogo, JOGADOR, JOGADOR3, JOGADOR3_U8, JOGADOR4_U8, type Estado } from '../../logica/nucleo/estado';
import type { DadosDaVigilia } from '../../logica/mundo/dados';
import { ALTURA_DA_TELA, ALTURA_DO_MAPA, LARGURA_DA_TELA, LARGURA_DO_MAPA, copiaMaisProxima, interpolarNoToro } from '../../logica/mundo/toro';
import { ESCALA_DA_GRADE } from '../../arte/catalogo';
import { aldricEspelhado, quadroDoAldric } from './aldric';
import { ORIGEM_X, ORIGEM_Y, direcao16 } from './arte';
import { COR } from '../paleta';
import { CHAVE_DO_ATLAS, CHAVE_DO_CHAO, NOMES_DAS_MOLDURAS, escalaPara, indiceDaMoldura } from './atlas';
import { arredondarParaOPixel } from './camera';
import { MEMBROS_DAS_ARMAS, MEMBROS_DAS_PARTICULAS, MEMBROS_DOS_DIGITOS, MEMBROS_DO_SAL, prepararArmas, prepararMortes, prepararNumeros, prepararParticulas, prepararSal, prepararStatus } from './armas';
import { MEMBROS_DOS_MEDIOS, MEMBROS_DOS_PROJETEIS_INIMIGOS, MEMBROS_DOS_TELEGRAFOS, prepararMedios, prepararProjeteisInimigos, prepararTelegrafos } from './ataques';
import { criarSaidaDeSprites, type EscritorDeSprites, type SaidaDeSprites } from './camadas';
import { CAPACIDADE_DE_MORTES, EfeitosDaVigilia } from './efeitos';
import type { EscritorDaHorda } from './escritores';
import { membrosDoMundo, molduraDaRocha, prepararMundo } from './pickups';
import { MEMBROS_DO_CHEFE, prepararChefe } from './chefe';
import { MEMBROS_DAS_ESTRUTURAS, prepararEstruturas, veuDaVigilia } from './estruturas';
import { criarSaidaDaHorda, prepararHorda, prepararQuadrosDaHorda, type DesenhoDoTipo } from './horda';
/** Molduras do marcador de direção nos 4 ângulos desenhados. */
const MARCADORES = [0, 1, 2, 3].map((k) => indiceDaMoldura(`marcador_${k}`));
const indiceDoMarcador = (base: number): number => MARCADORES[base]!;

/** Sem o consumidor do anel (testes do render só com a horda), ninguém foi acertado. */
const SEM_ACERTOS = new Float64Array(CAPACIDADE_DE_INIMIGOS).fill(-1e9);

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

/**
 * Escala da grade de arte (2 pt por px) e o tamanho do TileSprite do chão em px de textura: a tela e 1 px de folga em
 * cada lado (a câmera não treme nem dá zoom; cada pixel a mais de chão custa pintura no WebGL por software).
 */
const ESCALA = ESCALA_DA_GRADE.arte;
const MEIA_LARGURA_DO_CHAO = LARGURA_DA_TELA / ESCALA / 2 + 1;
const MEIA_ALTURA_DO_CHAO = ALTURA_DA_TELA / ESCALA / 2 + 1;
/** Phaser.BlendModes.ADD (o módulo importa o Phaser só como tipo): a luz da brasa é aditiva (doc 13 §1.4). */
const ADITIVO = 1;
/** Marcador de direção a 22 pt do centro do Aldric, nas 16 direções (style card E5). */
const DISTANCIA_DO_MARCADOR_PT = 22;
/** Rastros da esquiva: 2 cópias atrás, a 8 e 16 pt, com alfa 0,35 e 0,18, entre o 2º e o 18º passo. */
const RASTROS = [
  { atras: 8, alfa: 0.35 },
  { atras: 16, alfa: 0.18 },
] as const;
const RASTRO_DE = 2;
const RASTRO_ATE = 18;
/** Passos do APAGANDO (a luz da brasa se apaga junto). */
const PASSOS_DO_APAGAR = 30;

/** Ângulo da direção (dirX, dirY) na tela: 0 aponta para cima, positivo no sentido horário. */
export function anguloDoJogador(dirX: number, dirY: number): number {
  return Math.atan2(dirY, dirX) + Math.PI / 2;
}

export class RenderDaVigilia implements RenderDoMundo {
  private readonly obstaculos: Phaser.GameObjects.Image[] = [];
  private readonly mundo: Camada | null = null;
  /** A borda da arena e a Fogueira (F-008), logo acima do mundo. */
  private readonly estruturas: Camada | null = null;
  /** O véu preto do escurecimento (ES1), acima da horda e abaixo dos telegrafos. */
  private readonly veu: Phaser.GameObjects.Image | null = null;
  private alfaDoVeu = 0;
  private corDoVeu = 0;
  private alfaDaAurora = 0;
  /** A luz da aurora do Amanhecer (F-009 AN4): aditiva, na posição da câmera, acima do véu. */
  private readonly aurora: Phaser.GameObjects.Image | null = null;
  private readonly veuAtual = new Float64Array(3);
  private readonly chao: Phaser.GameObjects.TileSprite;
  private readonly jogador: Phaser.GameObjects.Image;
  private readonly brilho: Phaser.GameObjects.Image;
  private readonly marcador: Phaser.GameObjects.Image;
  private readonly rastros: Phaser.GameObjects.Image[];
  private quadroDesenhado = -1;
  private readonly direcao = { base: 0, rotacao: 0 };
  /** O escritor da horda (null nos testes do render de obstáculos e jogador). */
  readonly horda: EscritorDaHorda | null;
  private readonly tabela: readonly (DesenhoDoTipo | null)[];
  private readonly saida = criarSaidaDaHorda();
  /** Consumidor do anel e pools do render (null sem as camadas das armas). */
  readonly efeitos: EfeitosDaVigilia | null;
  private readonly mortes: Camada | null = null;
  private readonly medios: Camada | null = null;
  private readonly status: Camada | null = null;
  private readonly telegrafos: Camada | null = null;
  /** Os golpes e as zonas do Lanterneiro (F-009), acima dos telegrafos dos médios. */
  private readonly golpesDoChefe: Camada | null = null;
  private readonly projeteisInimigos: Camada | null = null;
  private readonly armasCamada: Camada | null = null;
  /** Os grãos do Círculo de Sal e dos pulsos (F-011), abaixo das facas e dos golpes. */
  private readonly sal: Camada | null = null;
  /** Faíscas, lascas, cinza e brasas (F-011), acima do Aldric. */
  private readonly particulas: Camada | null = null;
  private readonly digitos: Camada | null = null;

  constructor(
    cena: Phaser.Scene,
    private readonly dados: DadosDaVigilia,
    horda: HordaDoRender | null,
    private readonly armas: ArmasDoRender | null = null,
  ) {
    // Chão (F-011): o ladrilho de 64 × 64 px repetido, a 2 pt por px, que acompanha a câmera.
    this.chao = cena.add.tileSprite(dados.inicioX, dados.inicioY, 2 * MEIA_LARGURA_DO_CHAO, 2 * MEIA_ALTURA_DO_CHAO, CHAVE_DO_CHAO).setScale(ESCALA);
    // A luz da brasa (aditiva) logo acima do chão: esquenta o chão em volta do Aldric e deixa as rochas, os pickups e
    // os corpos nas cores da paleta (a cor de identidade dos inimigos não muda perto dele).
    this.brilho = cena.add.image(dados.inicioX, dados.inicioY, CHAVE_DO_ATLAS, 'brilho').setScale(ESCALA).setBlendMode(ADITIVO);
    cena.add.layer([this.chao, this.brilho]);
    const camada = (capacidade: number): Camada => ({ escritor: armas!.criar(cena, capacidade), saida: criarSaidaDeSprites(capacidade) });
    const o = dados.obstaculos;
    if (armas) {
      // Camada "mundo" (R1): obstáculos e pickups, abaixo de tudo o mais.
      this.mundo = camada(membrosDoMundo(o.n));
      this.estruturas = camada(MEMBROS_DAS_ESTRUTURAS);
    } else {
      const camadaDosObstaculos = cena.add.layer();
      for (let i = 0; i < o.n; i++) {
        const img = cena.add.image(o.x[i]!, o.y[i]!, CHAVE_DO_ATLAS, NOMES_DAS_MOLDURAS[molduraDaRocha(o.r[i]!, i)]!).setScale(ESCALA);
        camadaDosObstaculos.add(img);
        this.obstaculos.push(img);
      }
    }
    this.efeitos = armas ? new EfeitosDaVigilia(dados.tipos) : null;
    if (armas) this.mortes = camada(CAPACIDADE_DE_MORTES);
    this.horda = horda ? horda.criar(cena) : null;
    this.tabela = horda ? horda.tabela : [];
    if (armas) {
      this.medios = camada(MEMBROS_DOS_MEDIOS);
      this.status = camada(CAPACIDADE_DE_INIMIGOS);
      // O véu: um quadrado preto do tamanho da tela (390 × 844 pt e a folga), que segue a câmera (só render, fora do hash).
      this.veu = cena.add.image(dados.inicioX, dados.inicioY, CHAVE_DO_ATLAS, 'quadrado').setTint(0x000000).setAlpha(0).setVisible(false).setScale(escalaPara('quadrado', LARGURA_DA_TELA + 8), escalaPara('quadrado', ALTURA_DA_TELA + 8));
      this.aurora = cena.add.image(dados.inicioX, dados.inicioY, CHAVE_DO_ATLAS, 'quadrado').setTint(COR.brasaClara).setAlpha(0).setVisible(false).setBlendMode(ADITIVO).setScale(escalaPara('quadrado', LARGURA_DA_TELA + 8), escalaPara('quadrado', ALTURA_DA_TELA + 8));
      this.telegrafos = camada(MEMBROS_DOS_TELEGRAFOS);
      this.golpesDoChefe = camada(MEMBROS_DO_CHEFE);
      this.sal = camada(MEMBROS_DO_SAL);
      this.armasCamada = camada(MEMBROS_DAS_ARMAS);
      this.projeteisInimigos = camada(MEMBROS_DOS_PROJETEIS_INIMIGOS);
    }
    // O Aldric (F-011): o marcador de direção, os rastros da esquiva e o corpo.
    const x0 = dados.inicioX;
    const y0 = dados.inicioY;
    this.marcador = cena.add.image(x0, y0, CHAVE_DO_ATLAS, 'marcador_0').setAlpha(0.8);
    this.rastros = RASTROS.map((r) => cena.add.image(x0, y0, CHAVE_DO_ATLAS, 'aldric_rolando').setAlpha(r.alfa).setVisible(false));
    this.jogador = cena.add.image(x0, y0, CHAVE_DO_ATLAS, 'aldric_parado').setScale(ESCALA);
    cena.add.layer([this.marcador, ...this.rastros, this.jogador]);
    if (armas) this.particulas = camada(MEMBROS_DAS_PARTICULAS);
    if (armas) this.digitos = camada(MEMBROS_DOS_DIGITOS);
  }

  sincronizar(e: Estado, alfa: number, camX: number, camY: number): void {
    const o = this.dados.obstaculos;
    for (let i = 0; i < this.obstaculos.length; i++) {
      this.obstaculos[i]!.setPosition(copiaMaisProxima(o.x[i]!, camX, LARGURA_DO_MAPA), copiaMaisProxima(o.y[i]!, camY, ALTURA_DO_MAPA));
    }
    const j = e.jogador;
    // Arredondado como a câmera (C2): o triângulo fica no mesmo pixel, sem tremor sub-pixel no centro da tela.
    const x = arredondarParaOPixel(interpolarNoToro(j[JOGADOR.xAnt]!, j[JOGADOR.x]!, alfa, LARGURA_DO_MAPA));
    const y = arredondarParaOPixel(interpolarNoToro(j[JOGADOR.yAnt]!, j[JOGADOR.y]!, alfa, ALTURA_DO_MAPA));
    const jx = copiaMaisProxima(x, camX, LARGURA_DO_MAPA);
    const jy = copiaMaisProxima(y, camY, ALTURA_DO_MAPA);
    if (this.mundo) {
      prepararMundo(e, this.dados, alfa, camX, camY, this.mundo.saida);
      this.mundo.escritor.escrever(this.mundo.saida);
    }
    if (this.estruturas) {
      prepararEstruturas(e, this.dados, camX, camY, this.estruturas.saida);
      this.estruturas.escritor.escrever(this.estruturas.saida);
    }
    if (this.efeitos && this.armas) this.efeitos.consumir(e, this.armas.opcoes.numerosDeDano);
    if (this.horda) {
      prepararHorda(e, alfa, camX, camY, this.saida);
      prepararQuadrosDaHorda(e, this.tabela, this.efeitos ? this.efeitos.acertos : SEM_ACERTOS, this.saida);
      this.horda.escrever(this.saida, this.tabela);
    }
    const ef = this.efeitos;
    if (ef && this.mortes && this.medios && this.status && this.telegrafos && this.golpesDoChefe && this.sal && this.armasCamada && this.projeteisInimigos && this.particulas && this.digitos) {
      prepararMortes(ef, e, alfa, camX, camY, this.tabela, this.mortes.saida);
      this.mortes.escritor.escrever(this.mortes.saida);
      prepararMedios(e, this.saida, this.tabela, this.dados, alfa, this.medios.saida);
      this.medios.escritor.escrever(this.medios.saida);
      prepararStatus(e, this.saida, this.status.saida);
      this.status.escritor.escrever(this.status.saida);
      this.escurecer(e, camX, camY);
      ef.recusados.telegrafos = prepararTelegrafos(e, this.dados, this.saida, alfa, this.telegrafos.saida);
      this.telegrafos.escritor.escrever(this.telegrafos.saida);
      prepararChefe(e, this.dados, this.saida, alfa, camX, camY, this.golpesDoChefe.saida);
      this.golpesDoChefe.escritor.escrever(this.golpesDoChefe.saida);
      prepararSal(e, this.dados, ef, alfa, jx, jy, this.sal.saida);
      this.sal.escritor.escrever(this.sal.saida);
      prepararArmas(e, this.dados, ef, alfa, camX, camY, jx, jy, this.armasCamada.saida);
      this.armasCamada.escritor.escrever(this.armasCamada.saida);
      ef.recusados.projeteisInimigos = prepararProjeteisInimigos(e, this.dados, alfa, camX, camY, this.projeteisInimigos.saida);
      this.projeteisInimigos.escritor.escrever(this.projeteisInimigos.saida);
      prepararParticulas(ef, e, alfa, camX, camY, this.particulas.saida);
      this.particulas.escritor.escrever(this.particulas.saida);
      prepararNumeros(ef, e, alfa, camX, camY, this.digitos.saida);
      this.digitos.escritor.escrever(this.digitos.saida);
    }
    this.chao.setPosition(camX, camY).setTilePosition(camX / ESCALA - MEIA_LARGURA_DO_CHAO, camY / ESCALA - MEIA_ALTURA_DO_CHAO);
    this.desenharAldric(e, jx, jy);
  }

  /** O véu da Vigília (ES1; o vinho de A Fome e o céu do Amanhecer, F-009): alfa, cor e aurora pelo estado; só reescreve o que muda. */
  private escurecer(e: Estado, camX: number, camY: number): void {
    const veu = this.veu;
    if (veu === null) return;
    const v = this.veuAtual;
    veuDaVigilia(e, v);
    const a = v[0]!;
    if (a !== this.alfaDoVeu) {
      this.alfaDoVeu = a;
      veu.setAlpha(a).setVisible(a > 0);
    }
    if (v[1] !== this.corDoVeu) {
      this.corDoVeu = v[1]!;
      veu.setTint(this.corDoVeu);
    }
    if (a > 0) veu.setPosition(camX, camY);
    const aurora = this.aurora;
    if (aurora === null) return;
    if (v[2] !== this.alfaDaAurora) {
      this.alfaDaAurora = v[2]!;
      aurora.setAlpha(this.alfaDaAurora).setVisible(this.alfaDaAurora > 0);
    }
    if (this.alfaDaAurora > 0) aurora.setPosition(camX, camY);
  }

  /** O Aldric pelo estado (src/cenas/render/aldric.ts), a luz da brasa, o marcador de direção e os rastros da esquiva. */
  private desenharAldric(e: Estado, jx: number, jy: number): void {
    const j = e.jogador;
    const u3 = e.jogador3U8;
    const u4 = e.jogador4U8;
    const passo = e.cab[CAB.passo]!;
    const quadro = quadroDoAldric(e);
    const escalaX = aldricEspelhado(e) ? -ESCALA : ESCALA;
    if (quadro !== this.quadroDesenhado) {
      this.quadroDesenhado = quadro;
      this.jogador.setFrame(NOMES_DAS_MOLDURAS[quadro]!);
    }
    this.jogador.setPosition(jx, jy).setScale(escalaX, ESCALA);
    const viva = emJogo(u4[JOGADOR4_U8.fase]!);
    // A brasa respira devagar (±10% de alfa, 2 s); no Apagar, se apaga com o corpo.
    const apagando = viva ? 1 : Math.max(0, 1 - u4[JOGADOR4_U8.apagandoPassos]! / PASSOS_DO_APAGAR);
    this.brilho.setPosition(jx, jy).setAlpha(apagando * (0.9 + 0.1 * Math.cos((passo * Math.PI) / 60)));
    this.marcador.setVisible(viva);
    if (viva) {
      const dx = j[JOGADOR.dirX]!;
      const dy = j[JOGADOR.dirY]!;
      direcao16(anguloDoJogador(dx, dy), this.direcao);
      const m = indiceDoMarcador(this.direcao.base);
      this.marcador
        .setFrame(NOMES_DAS_MOLDURAS[m]!)
        .setOrigin(ORIGEM_X[m]!, ORIGEM_Y[m]!)
        .setRotation(this.direcao.rotacao)
        .setPosition(Math.round((jx + dx * DISTANCIA_DO_MARCADOR_PT) * 2) / 2, Math.round((jy + dy * DISTANCIA_DO_MARCADOR_PT) * 2) / 2);
    }
    const esquiva = u3[JOGADOR3_U8.esquivaPasso]!;
    const comRastro = viva && esquiva >= RASTRO_DE && esquiva <= RASTRO_ATE;
    for (let k = 0; k < RASTROS.length; k++) {
      const r = this.rastros[k]!;
      r.setVisible(comRastro);
      if (!comRastro) continue;
      const atras = RASTROS[k]!.atras;
      r.setFrame(NOMES_DAS_MOLDURAS[quadro]!)
        .setScale(escalaX, ESCALA)
        .setPosition(Math.round((jx - e.jogador3[JOGADOR3.esquivaDirX]! * atras) * 2) / 2, Math.round((jy - e.jogador3[JOGADOR3.esquivaDirY]! * atras) * 2) / 2);
    }
  }

  liberar(): void {
    this.mundo?.escritor.liberar();
    this.estruturas?.escritor.liberar();
    this.horda?.liberar();
    this.mortes?.escritor.liberar();
    this.medios?.escritor.liberar();
    this.status?.escritor.liberar();
    this.telegrafos?.escritor.liberar();
    this.golpesDoChefe?.escritor.liberar();
    this.sal?.escritor.liberar();
    this.particulas?.escritor.liberar();
    this.projeteisInimigos?.escritor.liberar();
    this.armasCamada?.escritor.liberar();
    this.digitos?.escritor.liberar();
  }
}

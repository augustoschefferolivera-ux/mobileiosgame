// Tela de pausa mínima (Q-25; ADR-0002 §11.1, a cena Modal; design/decisoes-F-004.md
// P5, P6 e P9; decisoes-F-005 §6): véu sobre a Vigília (a Hud some enquanto a pausa está aberta), título, a build
// (nome e nível de cada arma e de cada passiva, dois Text por linha, a União sem
// o nível), a opção de números de dano e Continuar. Os
// Text são criados uma vez, na raiz da cena (o __GAME_DEBUG__.textoAtivo os
// lê), e a cena fica invisível fora da pausa. Os toques vêm do tradutor, no
// modo pausa: esta cena só desenha. Som e Flashes (F-006 FB3 e RE11) ficam lado a
// lado acima de "números". F-007 (PE1, PE3, PE4): três estatísticas (Mortes, Dano
// recebido, Aparos; uma linha só se a altura não deixa três), o aviso do Abandonar
// (só armado) e o botão Abandonar, que arma no 1º toque e confirma no 2º.
import Phaser from 'phaser';
import { BLOCO_DO_ABANDONAR, CAIXA_DA_OPCAO, OPCAO_DUPLA, alvosDaTelaDePausa, blocoDaPausa, caixaDaOpcao, type Alvo } from '../entrada/alvos';
import { JOGADOR4, JOGADOR4_U32, MUNDO } from '../logica/nucleo/estado';
import { ALTURA_LOGICA, LARGURA_LOGICA } from '../plataforma/safeArea';
import type { ContextoDoJogo } from './contexto';
import { COR, cameraLogica, texto } from './estilo';
import { PARES_DA_PAUSA, linhasDaPausa, type LinhaDaPausa } from './linhasDaPausa';
import { t } from './textos';

/** Véu #0b0e14 a 60% (P6). */
const ALFA_DO_VEU = 0.6;
/** Transições ≤ 200 ms (doc 11 §1). */
const FADE_MS = 200;
/** 11 linhas de 15 pt cabem no terço de cima com o título (era 24 pt entre linhas com 5 armas). */
const ENTRE_LINHAS_DA_BUILD = 18;
const TITULO_ABAIXO_DO_TOPO = 24;
const PRIMEIRA_LINHA_ABAIXO_DO_TOPO = 56;
const ENTRE_NOME_E_NIVEL = 12;
/** Rótulo de Som e Flashes: o tamanho dos nomes da build (RE11). */
const TAMANHO_DO_ROTULO_DA_DUPLA = 15;
/** Os rótulos das três estatísticas (PE1), na ordem de baixo para cima do que o jogador lê: Mortes, Dano recebido, Aparos. */
const IDS_DAS_ESTATISTICAS = ['A6.PAUSA.MORTES', 'A6.PAUSA.DANO', 'A6.PAUSA.APAROS'] as const;
/** Largura de quebra do aviso do Abandonar: duas linhas (PE3). */
const LARGURA_DO_AVISO = 280;
const ENTRE_ROTULO_E_VALOR = 8;
/** Largura do painel opaco das estatísticas: o texto nunca cai sobre o mundo (A1 do crítico). */
const LARGURA_DO_PAINEL = 260;

export class Pausa extends Phaser.Scene {
  private veu: Phaser.GameObjects.Graphics | null = null;
  private botoes: Phaser.GameObjects.Graphics | null = null;
  private titulo: Phaser.GameObjects.Text | null = null;
  private readonly nomes: Phaser.GameObjects.Text[] = [];
  private readonly niveis: Phaser.GameObjects.Text[] = [];
  private rotuloDaOpcao: Phaser.GameObjects.Text | null = null;
  private rotuloDoSom: Phaser.GameObjects.Text | null = null;
  private rotuloDosFlashes: Phaser.GameObjects.Text | null = null;
  private continuar: Phaser.GameObjects.Text | null = null;
  private rotuloDoAbandonar: Phaser.GameObjects.Text | null = null;
  private avisoDoAbandonar: Phaser.GameObjects.Text | null = null;
  private readonly rotulosDasEstatisticas: Phaser.GameObjects.Text[] = [];
  private readonly valoresDasEstatisticas: Phaser.GameObjects.Text[] = [];
  private estatisticasEmUmaLinha: Phaser.GameObjects.Text | null = null;
  private readonly alvos: Alvo[] = [];
  /** O painel das estatísticas (x, y, largura, altura), desenhado junto dos botões. */
  private readonly painel = { x: 0, y: 0, largura: LARGURA_DO_PAINEL, altura: 0 };
  private readonly linhas: LinhaDaPausa[] = [];
  private aberta = false;
  /** As opções e o Abandonar armado como foram desenhados (números, som, flashes, armado), para redesenhar só quando mudam. */
  private desenhadas = -1;

  constructor(private readonly ctx: ContextoDoJogo) {
    super({ key: 'Pausa' });
  }

  create(): void {
    cameraLogica(this);
    this.veu = this.add.graphics();
    this.botoes = this.add.graphics();
    this.titulo = texto(this, 0, 0, 'A6.PAUSA.TITULO', 22, COR.osso).setOrigin(0.5);
    this.nomes.length = 0;
    this.niveis.length = 0;
    for (let v = 0; v < PARES_DA_PAUSA; v++) {
      this.nomes.push(texto(this, 0, 0, 'F1.ESPADA_LONGA_DO_JURAMENTO.NOME', 15, COR.osso).setOrigin(0, 0.5));
      this.niveis.push(texto(this, 0, 0, 'A6.PAUSA.NIVEL', 15, COR.sal, { nivel: 1 }).setOrigin(0, 0.5));
    }
    this.rotuloDaOpcao = texto(this, 0, 0, 'A6.PAUSA.NUMEROS', 18, COR.osso).setOrigin(0, 0.5);
    this.rotuloDoSom = texto(this, 0, 0, 'A6.PAUSA.SOM', TAMANHO_DO_ROTULO_DA_DUPLA, COR.osso).setOrigin(0, 0.5);
    this.rotuloDosFlashes = texto(this, 0, 0, 'A6.PAUSA.FLASHES', TAMANHO_DO_ROTULO_DA_DUPLA, COR.osso).setOrigin(0, 0.5);
    this.continuar = texto(this, 0, 0, 'A6.PAUSA.CONTINUAR', 18, COR.osso).setOrigin(0.5);
    this.rotuloDoAbandonar = texto(this, 0, 0, 'A6.PAUSA.ABANDONAR', 18, COR.osso).setOrigin(0.5);
    this.avisoDoAbandonar = texto(this, 0, 0, 'A6.PAUSA.ABANDONAR_AVISO', 14, COR.sal, undefined, LARGURA_DO_AVISO).setOrigin(0.5, 0);
    this.rotulosDasEstatisticas.length = this.valoresDasEstatisticas.length = 0;
    for (const id of IDS_DAS_ESTATISTICAS) {
      this.rotulosDasEstatisticas.push(texto(this, 0, 0, id, 14, COR.sal).setOrigin(1, 0));
      this.valoresDasEstatisticas.push(texto(this, 0, 0, 'A6.PAUSA.VALOR', 14, COR.osso, { valor: 0 }).setOrigin(0, 0));
    }
    this.estatisticasEmUmaLinha = texto(this, 0, 0, 'A6.PAUSA.ESTATISTICAS_LINHA', 14, COR.osso, { mortes: 0, dano: 0, aparos: 0 }).setOrigin(0.5, 0);
    this.aberta = false;
    this.desenhadas = -1;
    for (const obj of this.objetos()) obj.setAlpha(0);
    this.scene.setVisible(false);
    this.diagramar();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.diagramar, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, this.diagramar, this);
    });
  }

  private objetos(): (Phaser.GameObjects.Graphics | Phaser.GameObjects.Text)[] {
    return [
      this.veu!,
      this.botoes!,
      this.titulo!,
      ...this.nomes,
      ...this.niveis,
      this.rotuloDaOpcao!,
      this.rotuloDoSom!,
      this.rotuloDosFlashes!,
      this.continuar!,
      this.rotuloDoAbandonar!,
      this.avisoDoAbandonar!,
      ...this.rotulosDasEstatisticas,
      ...this.valoresDasEstatisticas,
      this.estatisticasEmUmaLinha!,
    ];
  }

  /** Mostra a tela com a build atual (fade de 200 ms que não bloqueia toque). */
  mostrar(): void {
    if (this.aberta) return;
    this.aberta = true;
    this.preencherBuild();
    this.preencherEstatisticas();
    this.desenhadas = -1;
    this.diagramar();
    this.scene.setVisible(true);
    this.tweens.killTweensOf(this.objetos());
    this.tweens.add({ targets: this.objetos(), alpha: 1, duration: FADE_MS });
  }

  esconder(): void {
    if (!this.aberta) return;
    this.aberta = false;
    this.tweens.killTweensOf(this.objetos());
    this.tweens.add({
      targets: this.objetos(),
      alpha: 0,
      duration: FADE_MS,
      onComplete: () => {
        if (!this.aberta) this.scene.setVisible(false);
      },
    });
  }

  /** Um par por item da build, armas e depois passivas: o nome (F1/F2/F3.*.NOME) e "Nível {nivel}" (A6.PAUSA.NIVEL); a União não mostra o nível; vagas vazias somem. */
  private preencherBuild(): void {
    const sim = this.ctx.simulacao;
    const e = sim?.estado;
    const linhas = e
      ? linhasDaPausa({ armas: e.build, passivas: e.passivas, uniao: sim.dados.armas.uniao, nivelMax: sim.dados.armas.nivelMax }, this.linhas)
      : this.linhas.splice(0);
    for (let v = 0; v < PARES_DA_PAUSA; v++) {
      const nome = this.nomes[v]!;
      const nivel = this.niveis[v]!;
      const l = linhas[v];
      if (l === undefined) {
        nome.setVisible(false);
        nivel.setVisible(false);
        continue;
      }
      if (nome.getData('idTexto') !== l.idDoNome) nome.setText(t(l.idDoNome)).setData('idTexto', l.idDoNome);
      nome.setVisible(true);
      if (l.nivel === null) nivel.setVisible(false);
      else nivel.setText(t('A6.PAUSA.NIVEL', { nivel: l.nivel })).setVisible(true);
    }
  }

  /** Mortes, dano recebido (ao mais próximo, PE2) e aparos, lidos do estado quando a pausa abre (a simulação para). */
  private preencherEstatisticas(): void {
    const e = this.ctx.simulacao?.estado;
    const mortes = e?.mundo[MUNDO.mortes] ?? 0;
    const dano = Math.round(e?.jogador4[JOGADOR4.danoRecebido] ?? 0);
    const aparos = e?.jogador4U32[JOGADOR4_U32.aparos] ?? 0;
    [mortes, dano, aparos].forEach((v, k) => this.valoresDasEstatisticas[k]!.setText(t('A6.PAUSA.VALOR', { valor: v })));
    this.estatisticasEmUmaLinha!.setText(t('A6.PAUSA.ESTATISTICAS_LINHA', { mortes, dano, aparos }));
  }

  private diagramar(): void {
    const ins = this.ctx.insets;
    alvosDaTelaDePausa(ins, this.alvos);
    const cx = ins.esquerda + (LARGURA_LOGICA - ins.esquerda - ins.direita) / 2;
    this.veu!.clear().fillStyle(COR.pedra, ALFA_DO_VEU).fillRect(0, 0, LARGURA_LOGICA, ALTURA_LOGICA);
    // Textos no terço de cima: o título e, logo abaixo, até 11 linhas da build.
    this.titulo!.setPosition(cx, ins.topo + TITULO_ABAIXO_DO_TOPO);
    // Cada linha centrada pelo conjunto "nome  Nível n" (só o nome, na União).
    let y = ins.topo + PRIMEIRA_LINHA_ABAIXO_DO_TOPO;
    for (let v = 0; v < PARES_DA_PAUSA; v++) {
      const nome = this.nomes[v]!;
      const nivel = this.niveis[v]!;
      const largura = nivel.visible ? nome.width + ENTRE_NOME_E_NIVEL + nivel.width : nome.width;
      const x0 = cx - largura / 2;
      nome.setPosition(x0, y);
      nivel.setPosition(x0 + nome.width + ENTRE_NOME_E_NIVEL, y);
      if (nome.visible) y += ENTRE_LINHAS_DA_BUILD;
    }
    const [opcao, cont, som, flashes, abandonar] = this.alvos;
    // Estatísticas e aviso acima do Abandonar (PE3): o fim da build desenhada decide entre três linhas e uma.
    const bloco = blocoDaPausa(abandonar!, y);
    const linha = BLOCO_DO_ABANDONAR.linha;
    const respiro = BLOCO_DO_ABANDONAR.respiroDoPainel;
    this.painel.x = cx - LARGURA_DO_PAINEL / 2;
    this.painel.y = bloco.yDasEstatisticas - respiro;
    this.painel.altura = bloco.linhasDasEstatisticas * linha + 2 * respiro;
    this.avisoDoAbandonar!.setPosition(cx, bloco.yDoAviso);
    this.estatisticasEmUmaLinha!.setPosition(cx, bloco.yDasEstatisticas).setVisible(bloco.linhasDasEstatisticas === 1);
    for (let k = 0; k < 3; k++) {
      const em3 = bloco.linhasDasEstatisticas === 3;
      this.rotulosDasEstatisticas[k]!.setPosition(cx - ENTRE_ROTULO_E_VALOR, bloco.yDasEstatisticas + k * linha).setVisible(em3);
      this.valoresDasEstatisticas[k]!.setPosition(cx + ENTRE_ROTULO_E_VALOR, bloco.yDasEstatisticas + k * linha).setVisible(em3);
    }
    this.rotuloDoAbandonar!.setPosition(abandonar!.x + abandonar!.largura / 2, abandonar!.y + abandonar!.altura / 2);
    this.rotuloDaOpcao!.setPosition(opcao!.x + CAIXA_DA_OPCAO.margem, opcao!.y + opcao!.altura / 2);
    this.rotuloDoSom!.setPosition(som!.x + OPCAO_DUPLA.margem, som!.y + som!.altura / 2);
    this.rotuloDosFlashes!.setPosition(flashes!.x + OPCAO_DUPLA.margem, flashes!.y + flashes!.altura / 2);
    this.continuar!.setPosition(cont!.x + cont!.largura / 2, cont!.y + cont!.altura / 2);
    this.desenharBotoes();
  }

  private assinaturaDasOpcoes(): number {
    const o = this.ctx.opcoes;
    return (o.numerosDeDano ? 1 : 0) | (o.som ? 2 : 0) | (o.flashes ? 4 : 0) | (this.ctx.simulacao?.pausa.abandonarArmado ? 8 : 0);
  }

  /** Os alvos no estilo do Acender e a caixa de cada opção: cheia (osso) quando ligada, vazia quando desligada (P9, RE11). */
  private desenharBotoes(): void {
    const o = this.ctx.opcoes;
    this.desenhadas = this.assinaturaDasOpcoes();
    const g = this.botoes!.clear();
    const p = this.painel;
    g.fillStyle(COR.cinzaFrio).fillRect(p.x, p.y, p.largura, p.altura);
    const armado = this.ctx.simulacao?.pausa.abandonarArmado === true;
    this.avisoDoAbandonar!.setVisible(armado);
    for (const a of this.alvos) {
      g.fillStyle(COR.cinzaFrio).fillRect(a.x, a.y, a.largura, a.altura);
      // O Abandonar armado ganha a borda de brasa, mais grossa (PE4); os demais, a borda de sempre.
      if (a.id === 'abandonar' && armado) g.lineStyle(4, COR.brasa).strokeRect(a.x, a.y, a.largura, a.altura);
      else g.lineStyle(2, COR.laranjaQueimado).strokeRect(a.x, a.y, a.largura, a.altura);
    }
    const { lado, borda } = CAIXA_DA_OPCAO;
    const caixa = (alvo: Alvo, margem: number, ligada: boolean): void => {
      const { x, y } = caixaDaOpcao(alvo, margem);
      if (ligada) g.fillStyle(COR.osso).fillRect(x, y, lado, lado);
      else g.fillStyle(COR.pedra, ALFA_DO_VEU).fillRect(x, y, lado, lado);
      g.lineStyle(borda, COR.osso).strokeRect(x + borda / 2, y + borda / 2, lado - borda, lado - borda);
    };
    caixa(this.alvos[0]!, CAIXA_DA_OPCAO.margem, o.numerosDeDano);
    caixa(this.alvos[2]!, OPCAO_DUPLA.margem, o.som);
    caixa(this.alvos[3]!, OPCAO_DUPLA.margem, o.flashes);
  }

  override update(): void {
    if (this.aberta && this.desenhadas !== this.assinaturaDasOpcoes()) this.desenharBotoes();
  }
}

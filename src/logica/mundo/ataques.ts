// Ataques dos inimigos (design/decisoes-F-006.md §5, ET4 fase 6, ET11): o golpe
// em arco do Oco Grande e o projétil de Sal da Noviça, guiados pelos dados
// (`dados.combate`: telegrafo, recuperação, intervalo, alcance, projétil), mais
// o Sal no jogador. Tudo na fase 6 do passo, depois das armas e dos pickups,
// com a posição final do passo; só roda com `CENARIO.ataques` (o passo confere).
// Ordem dentro da fase: os projéteis em voo primeiro (movem, testam o impacto e
// contam como ameaça aparável), depois os inimigos em slot crescente (relógios,
// gatilho, mira e evento, golpe ou lançamento). A resolução do acerto no jogador
// é a única de contato.ts. Regra do laço quente (ET11): delta toroidal,
// distâncias, mira e contagem de ameaças em linha; dano e posições por
// rascunhos (BRUTO, FLOATS_DO_EVENTO); nenhum double atravessa chamada.
import { liberarProjetil } from '../armas/projeteis';
import { limiteDeProjeteis, projeteisEEfeitos } from '../armas/ondas';
import {
  CAB,
  CAPACIDADE_DE_INIMIGOS,
  CAPACIDADE_DE_PROJETEIS,
  CENARIO,
  JOGADOR,
  JOGADOR3_U16,
  JOGADOR3_U8,
  MUNDO,
  TIPO_DE_PROJETIL,
  type Estado,
} from '../nucleo/estado';
import { EVENTO, FLOATS_DO_EVENTO, FORMA, SEM_ALVO, gravarEvento } from '../nucleo/eventos';
import { alocar, quantosAtivos } from '../nucleo/pool';
import { BRUTO, DESFECHO, ORIGEM_DO_DANO, resolverAcertoNoJogador } from './contato';
import type { DadosDaVigilia } from './dados';
import { RAIO_DO_JOGADOR } from './jogador';
import { aparar, cancelarAtaque, concluirAparos } from './aparo';
import { FASE_DO_ATAQUE, TIPO } from './tipos';
import { ALTURA_DO_MAPA, LARGURA_DO_MAPA, MEIA_ALTURA_DO_MAPA, MEIA_LARGURA_DO_MAPA } from './toro';

export { FASE_DO_ATAQUE };

/** Desfecho do evento `golpeInimigo`: os três de `DESFECHO` e o golpe que não pegou o jogador (ET10). */
export const DESFECHO_DO_GOLPE = { ...DESFECHO, errou: 4 } as const;

/** Cosseno de meio arco de 120° (OG3; ADR-0002 §5): a única abertura que os dados aceitam. */
const COSSENO_DO_ARCO = 0.5;

const NP = CAPACIDADE_DE_PROJETEIS;
const N = CAPACIDADE_DE_INIMIGOS;

/**
 * Fase 6 (ET4): ataques dos inimigos e projéteis tipo 2. Exportada para os
 * testes de fronteira chamarem direto, com o inimigo já na distância a provar.
 * Recalcula `ameacasAparaveis` do zero (OG11).
 */
export function rodarAtaques(e: Estado, dados: DadosDaVigilia): void {
  const c = dados.combate;
  const ini = e.inimigos;
  const j = e.jogador;
  const u8 = e.jogador3U8;
  const jx = j[JOGADOR.x]!;
  const jy = j[JOGADOR.y]!;
  const passoAtual = e.cab[CAB.passo]!;
  const invulneravel = (e.cab[CAB.cenario]! & CENARIO.jogadorInvulneravel) !== 0;
  const geracaoDoInimigo = e.pool.geracao;
  const posInimigo = e.pool.posicao;
  let ameacas = 0;
  // A janela do aparo (AP4) é lida uma vez, num local, antes do laço: todos os aparáveis do passo se resolvem contra ela.
  const janela = u8[JOGADOR3_U8.aparoJanela]!;
  const janelaAtiva = janela >= 1 && janela <= u8[JOGADOR3_U8.aparoLimite]!;
  let aparados = 0;

  // Projéteis de Sal em voo (NV4 a NV6): movem, testam o impacto e, se seguem, contam pela trajetória (AP5).
  if (quantosAtivos(e.poolDeProjeteis) > 0) {
    const pr = e.projeteis;
    const posP = e.poolDeProjeteis.posicao;
    const novica = TIPO.novica_de_sal;
    const limite = c.projetilRaio[novica]! + RAIO_DO_JOGADOR;
    const limite2 = limite * limite;
    const aparavel = c.ataqueAparavel[novica]!;
    // Impacto previsto em até 36 passos (o telegrafo branco mais longo): pr² ≤ (36·v + 24)²·vv.
    const alcancePrevisto = c.telegrafoPassos[TIPO.oco_grande]! * c.projetilPorPasso[novica]! + limite;
    const alcancePrevisto2 = alcancePrevisto * alcancePrevisto;
    for (let p = 0; p < NP; p++) {
      if (posP[p]! < 0 || pr.tipo[p] !== TIPO_DE_PROJETIL.sal) continue;
      const x0 = pr.x[p]!;
      const y0 = pr.y[p]!;
      pr.xAnt[p] = x0;
      pr.yAnt[p] = y0;
      const vx = pr.vx[p]!;
      const vy = pr.vy[p]!;
      let xf = Math.fround(x0 + vx);
      if (xf < 0) xf = Math.fround(xf + LARGURA_DO_MAPA);
      if (xf >= LARGURA_DO_MAPA) xf = Math.fround(xf - LARGURA_DO_MAPA);
      let yf = Math.fround(y0 + vy);
      if (yf < 0) yf = Math.fround(yf + ALTURA_DO_MAPA);
      if (yf >= ALTURA_DO_MAPA) yf = Math.fround(yf - ALTURA_DO_MAPA);
      pr.x[p] = xf;
      pr.y[p] = yf;
      let dx = jx - xf;
      if (dx > MEIA_LARGURA_DO_MAPA) dx -= LARGURA_DO_MAPA;
      if (dx < -MEIA_LARGURA_DO_MAPA) dx += LARGURA_DO_MAPA;
      let dy = jy - yf;
      if (dy > MEIA_ALTURA_DO_MAPA) dy -= ALTURA_DO_MAPA;
      if (dy < -MEIA_ALTURA_DO_MAPA) dy += ALTURA_DO_MAPA;
      if (dx * dx + dy * dy <= limite2) {
        // Toque na hitbox do jogador: some no próprio passo, qualquer que seja o desfecho (NV6).
        const dono = pr.donoSlot[p]!;
        const donoValido = posInimigo[dono]! >= 0 && geracaoDoInimigo[dono] === pr.donoGeracao[p];
        BRUTO[0] = pr.dano[p]!;
        let desfecho: number;
        if (janelaAtiva && aparavel === 1) {
          // Aparo (AP4, AP6): vem antes da esquiva e do dano; o aparado não aplica Sal e o projétil some abaixo.
          FLOATS_DO_EVENTO[0] = donoValido ? ini.x[dono]! : xf;
          FLOATS_DO_EVENTO[1] = donoValido ? ini.y[dono]! : yf;
          aparar(e, dados, aparados, donoValido ? dono : -1, novica);
          aparados++;
          desfecho = DESFECHO.aparado;
        } else {
          desfecho = resolverAcertoNoJogador(e, dados, ORIGEM_DO_DANO.projetil, donoValido ? dono : -1);
        }
        if (desfecho === DESFECHO.acertou && !invulneravel) {
          if (pr.salPct[p]! > u8[JOGADOR3_U8.salPct]!) u8[JOGADOR3_U8.salPct] = pr.salPct[p]!;
          if (pr.salPassos[p]! > u8[JOGADOR3_U8.salPassos]!) u8[JOGADOR3_U8.salPassos] = pr.salPassos[p]!;
        }
        FLOATS_DO_EVENTO[0] = xf;
        FLOATS_DO_EVENTO[1] = yf;
        FLOATS_DO_EVENTO[2] = desfecho === DESFECHO.acertou ? BRUTO[0]! : 0;
        FLOATS_DO_EVENTO[3] = desfecho;
        gravarEvento(e.eventos, passoAtual, EVENTO.golpeInimigo, 0, FORMA.projetilSal, donoValido ? dono : -1, donoValido ? geracaoDoInimigo[dono]! : 0, novica, 0, 0);
        liberarProjetil(e, p);
        continue;
      }
      const vida = pr.vida[p]! - 1;
      if (vida <= 0) {
        liberarProjetil(e, p);
        continue;
      }
      pr.vida[p] = vida;
      // Ameaça aparável: se aproxima, a linha pega o jogador e o impacto é em até 36 passos (AP5).
      if (aparavel === 1) {
        const vv = vx * vx + vy * vy;
        const pp = dx * vx + dy * vy;
        const cr = dx * vy - dy * vx;
        if (pp > 0 && cr * cr <= limite2 * vv && pp * pp <= alcancePrevisto2 * vv) ameacas++;
      }
    }
  }

  // Inimigos em slot crescente.
  for (let s = 0; s < N; s++) {
    if (posInimigo[s]! < 0) continue;
    const tipo = ini.tipo[s]!;
    const raioDoArco = c.alcanceDoArco[tipo]!;
    const intervalo = c.intervaloPassos[tipo]!;
    if (raioDoArco === 0 && intervalo === 0) continue;
    // Postura Quebrada (PQ3, OG10): o telegrafo é cancelado (sem golpe nem projétil) e a máquina volta ao início;
    // o atordoado também deixa de contar como ameaça. O projétil já lançado segue.
    if (ini.quebradaPassos[s]! > 0) {
      cancelarAtaque(e, dados, s, tipo);
      continue;
    }
    const x = ini.x[s]!;
    const y = ini.y[s]!;
    let dx = jx - x;
    if (dx > MEIA_LARGURA_DO_MAPA) dx -= LARGURA_DO_MAPA;
    if (dx < -MEIA_LARGURA_DO_MAPA) dx += LARGURA_DO_MAPA;
    let dy = jy - y;
    if (dy > MEIA_ALTURA_DO_MAPA) dy -= ALTURA_DO_MAPA;
    if (dy < -MEIA_ALTURA_DO_MAPA) dy += ALTURA_DO_MAPA;
    const d2 = dx * dx + dy * dy;
    let fase = ini.ataqueFase[s]!;
    let timer = ini.ataqueTimer[s]!;
    if (fase === FASE_DO_ATAQUE.telegrafo) {
      timer--;
      if (timer === 0) {
        if (raioDoArco > 0) {
          // Golpe em T+36 (OG5): o setor de 120° contra a hitbox do jogador, na posição deste passo.
          const alcance = raioDoArco + RAIO_DO_JOGADOR;
          const mx = ini.miraX[s]!;
          const my = ini.miraY[s]!;
          let desfecho: number = DESFECHO_DO_GOLPE.errou;
          if (d2 <= alcance * alcance && dx * mx + dy * my >= COSSENO_DO_ARCO * Math.sqrt(d2)) {
            BRUTO[0] = ini.dano[s]!;
            if (janelaAtiva && c.ataqueAparavel[tipo] === 1) {
              // Aparo antes dos i-frames (AP4). O golpe ignora `invulContato` e não o liga (OG7).
              FLOATS_DO_EVENTO[0] = x;
              FLOATS_DO_EVENTO[1] = y;
              aparar(e, dados, aparados, s, tipo);
              aparados++;
              desfecho = DESFECHO.aparado;
            } else {
              desfecho = resolverAcertoNoJogador(e, dados, ORIGEM_DO_DANO.golpe, s);
            }
          }
          FLOATS_DO_EVENTO[0] = x;
          FLOATS_DO_EVENTO[1] = y;
          FLOATS_DO_EVENTO[2] = desfecho === DESFECHO.acertou ? ini.dano[s]! : 0;
          FLOATS_DO_EVENTO[3] = desfecho;
          gravarEvento(e.eventos, passoAtual, EVENTO.golpeInimigo, 0, FORMA.arcoInimigo, s, geracaoDoInimigo[s]!, tipo, 0, 0);
          fase = FASE_DO_ATAQUE.recuperacao;
          timer = c.recuperacaoPassos[tipo]!;
        } else {
          // Lançamento em T+30 (NV1, NV4): nasce no centro da Noviça e só anda no passo seguinte.
          const mx = ini.miraX[s]!;
          const my = ini.miraY[s]!;
          const p = projeteisEEfeitos(e) >= limiteDeProjeteis(e) ? -1 : alocar(e.poolDeProjeteis);
          if (p < 0) {
            e.mundo[MUNDO.projeteisRecusados] = e.mundo[MUNDO.projeteisRecusados]! + 1;
          } else {
            const pr = e.projeteis;
            const v = c.projetilPorPasso[tipo]!;
            pr.x[p] = pr.xAnt[p] = x;
            pr.y[p] = pr.yAnt[p] = y;
            pr.vx[p] = mx * v;
            pr.vy[p] = my * v;
            pr.dano[p] = ini.dano[s]!;
            pr.ultimoAlvo[p] = SEM_ALVO;
            pr.vida[p] = c.projetilVida[tipo]!;
            pr.tipo[p] = TIPO_DE_PROJETIL.sal;
            pr.arma[p] = 0;
            pr.perfuracoes[p] = 0;
            pr.salPct[p] = c.salPct[tipo]!;
            pr.salPassos[p] = c.salPassos[tipo]!;
            pr.donoSlot[p] = s;
            pr.donoGeracao[p] = geracaoDoInimigo[s]!;
            FLOATS_DO_EVENTO[0] = x;
            FLOATS_DO_EVENTO[1] = y;
            FLOATS_DO_EVENTO[2] = mx;
            FLOATS_DO_EVENTO[3] = my;
            gravarEvento(e.eventos, passoAtual, EVENTO.projetilLancado, 0, FORMA.projetilSal, s, geracaoDoInimigo[s]!, tipo, 0, 0);
          }
          fase = FASE_DO_ATAQUE.recuperacao;
          // A espera completa o período: o lançamento é o 1º passo dela (180 = 30 + 150).
          timer = intervalo - c.telegrafoPassos[tipo]!;
        }
      }
    } else {
      if (fase === FASE_DO_ATAQUE.recuperacao) {
        timer--;
        if (timer === 0) fase = FASE_DO_ATAQUE.livre;
      }
      if (fase === FASE_DO_ATAQUE.livre) {
        // Gatilho (OG2, NV2): centro a centro, d ≤ alcance do arco + hitbox, ou d ≤ alcance de tiro; a Noviça
        // confere a capacidade do pool ao iniciar (NV5), para o telegrafo nunca mentir.
        const alcance = raioDoArco > 0 ? raioDoArco + RAIO_DO_JOGADOR : c.alcanceDeTiro[tipo]!;
        if (d2 <= alcance * alcance && (raioDoArco > 0 || projeteisEEfeitos(e) < limiteDeProjeteis(e))) {
          // Mira fixa em T (OG4, NV3): vetor unitário ao jogador; com d = 0, a mira do jogador.
          let mx: number;
          let my: number;
          if (d2 > 0) {
            const d = Math.sqrt(d2);
            mx = dx / d;
            my = dy / d;
          } else {
            mx = j[JOGADOR.dirX]!;
            my = j[JOGADOR.dirY]!;
          }
          ini.miraX[s] = mx;
          ini.miraY[s] = my;
          fase = FASE_DO_ATAQUE.telegrafo;
          timer = c.telegrafoPassos[tipo]!;
          FLOATS_DO_EVENTO[0] = x;
          FLOATS_DO_EVENTO[1] = y;
          FLOATS_DO_EVENTO[2] = timer;
          FLOATS_DO_EVENTO[3] = raioDoArco > 0 ? raioDoArco : c.alcanceDeTiro[tipo]!;
          gravarEvento(e.eventos, passoAtual, EVENTO.telegrafo, 0, raioDoArco > 0 ? FORMA.arcoInimigo : FORMA.projetilSal, s, geracaoDoInimigo[s]!, tipo, 0, 0);
        }
      }
    }
    ini.ataqueFase[s] = fase;
    ini.ataqueTimer[s] = timer;
    // Ameaça aparável (OG11): o Oco Grande em telegrafo com o jogador dentro do setor do golpe.
    if (fase === FASE_DO_ATAQUE.telegrafo && raioDoArco > 0 && c.ataqueAparavel[tipo] === 1) {
      const alcance = raioDoArco + RAIO_DO_JOGADOR;
      if (d2 <= alcance * alcance && dx * ini.miraX[s]! + dy * ini.miraY[s]! >= COSSENO_DO_ARCO * Math.sqrt(d2)) ameacas++;
    }
  }
  e.jogador3U16[JOGADOR3_U16.ameacasAparaveis] = ameacas;
  // Depois do laço (AP6): zera `aparoJanela`, arma o Contra-ataque e aplica a Postura Quebrada em área.
  if (aparados > 0) concluirAparos(e, dados);
}

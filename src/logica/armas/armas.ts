// Fase de armas do passo (design/decisoes-F-004.md §2 a §4), depois da física
// da horda e antes do contato:
//  7a. remonta a grade com as posições finais;
//  7b. projéteis em voo, em slot crescente: andam, testam acerto, gastam vida;
//  7c. vagas 0 a 4: Espada (direção do movimento), Facas (mais próximo) e
//      Círculo (aura), cada uma pela função do seu arquétipo;
//  7d. varredura de mortes, em slot crescente.
// Toda forma acerta ao tocar a hitbox do alvo (W3), com ≤ e sem ε; escolher
// alvo usa o centro. Um inimigo com hp ≤ 0 fica fora de todo acerto e escolha
// seguintes e só sai em 7d (M1). Nenhum RNG é consumido. Nos laços por inimigo
// e por projétil, nenhuma chamada recebe ou devolve double (no V8, cada uma
// alocaria um HeapNumber): o delta toroidal, as formas e a normalização vão em
// linha, e o dano e as posições passam por rascunhos. Nada é alocado por passo.
import { CAB, CAPACIDADE_DE_INIMIGOS, JOGADOR, VAGAS_DE_ARMA, type Estado } from '../nucleo/estado';
import { CAUSA, EVENTO, FLOATS_DO_EVENTO, FORMA, gravarEvento } from '../nucleo/eventos';
import type { DadosDaVigilia } from '../mundo/dados';
import { CONSULTA, consultarGradeDoRascunho, reconstruirGrade } from '../mundo/grade';
import { grade, listarVivos, vivos } from '../mundo/horda';
import { matarInimigo } from '../mundo/inimigos';
import { ALTURA_DO_MAPA, LARGURA_DO_MAPA, MEIA_ALTURA_DO_MAPA, MEIA_LARGURA_DO_MAPA } from '../mundo/toro';
import { ACERTO, ACHADOS, DANO, acertar, calcularDano } from './acerto';
import { moverProjeteis, rodarMaisProximo } from './projeteis';
import { ARQUETIPO, GOLPES_MAXIMOS, indiceDoNivel } from './tabela';

export { liberarProjetil, limiteDeProjeteis, MAX_CANDIDATOS } from './projeteis';

const N = CAPACIDADE_DE_INIMIGOS;
/** cos 60° e sen 60° literais (ADR-0002 §5): o setor de 120° sem trigonometria. */
const COS_60 = 0.5;
const SEN_60 = 0.8660254037844386;

export function rodarArmas(e: Estado, dados: DadosDaVigilia): void {
  // 7a. Grade e lista de vivos com as posições finais (os mortos do passo anterior já saíram).
  const n = listarVivos(e);
  reconstruirGrade(grade, e.inimigos.x, e.inimigos.y, vivos, n);
  // 7b. Projéteis em voo (os disparados em 7c só andam no passo seguinte).
  moverProjeteis(e, dados);
  // 7c. Vagas, em ordem (W17).
  const b = e.build;
  const arquetipo = dados.armas.arquetipo;
  for (let v = 0; v < VAGAS_DE_ARMA; v++) {
    const codigo = b.codigo[v]!;
    if (codigo === 0) continue;
    const a = arquetipo[codigo]!;
    if (a === ARQUETIPO.direcaoMovimento) rodarDirecaoMovimento(e, dados, v);
    else if (a === ARQUETIPO.maisProximo) rodarMaisProximo(e, dados, v);
    else if (a === ARQUETIPO.aura) rodarAura(e, dados, v);
  }
  // 7d. Mortes, em slot crescente: a pilha de livres recebe os slots em ordem.
  const pos = e.pool.posicao;
  const hp = e.inimigos.hp;
  for (let s = 0; s < N; s++) if (pos[s]! >= 0 && hp[s]! <= 0) matarInimigo(e, s, CAUSA.arma);
}

// ——— Direção do movimento (Espada) ———

/** Recarga e sequência de golpes (W5, W6, W16): a sequência anda antes da recarga, que só dispara com ela no fim. */
function rodarDirecaoMovimento(e: Estado, dados: DadosDaVigilia, v: number): void {
  const b = e.build;
  const t = dados.armas;
  const codigo = b.codigo[v]!;
  const golpe = b.golpe[v]!;
  if (golpe > 0) {
    const espera = b.esperaGolpe[v]! - 1;
    b.esperaGolpe[v] = espera;
    if (espera <= 0) {
      const i = indiceDoNivel(codigo, b.nivel[v]!);
      const total = t.golpes[i]!;
      if (golpe < total) golpear(e, dados, v, t.formaDoGolpe[i * GOLPES_MAXIMOS + golpe]!);
      if (golpe + 1 < total) {
        b.golpe[v] = golpe + 1;
        b.esperaGolpe[v] = t.intervaloGolpes[codigo]!;
      } else {
        b.golpe[v] = 0;
        b.esperaGolpe[v] = 0;
      }
    }
  }
  let r = b.recarga[v]!;
  if (r > 0) b.recarga[v] = --r;
  if (r !== 0) return;
  const i = indiceDoNivel(codigo, b.nivel[v]!);
  golpear(e, dados, v, t.formaDoGolpe[i * GOLPES_MAXIMOS]!);
  b.recarga[v] = t.periodo[codigo]!;
  if (t.golpes[i]! > 1) {
    b.golpe[v] = 1;
    b.esperaGolpe[v] = t.intervaloGolpes[codigo]!;
  } else {
    b.golpe[v] = 0;
    b.esperaGolpe[v] = 0;
  }
}

/**
 * Um golpe instantâneo (W2, W4, W7, W8): todo inimigo vivo cuja hitbox toca
 * o setor de 120° (ida e volta) ou o retângulo (estocada), com a mira lida
 * neste passo (W1). O evento `golpe` sai antes dos acertos.
 */
function golpear(e: Estado, dados: DadosDaVigilia, v: number, forma: number): void {
  const t = dados.armas;
  const codigo = e.build.codigo[v]!;
  const i = indiceDoNivel(codigo, e.build.nivel[v]!);
  calcularDano(dados, v, i);
  ACERTO[0] = DANO[v]!;
  const j = e.jogador;
  const jx = j[JOGADOR.x]!;
  const jy = j[JOGADOR.y]!;
  const ux = j[JOGADOR.dirX]!;
  const uy = j[JOGADOR.dirY]!;
  const estocada = forma === FORMA.estocada;
  const R = t.alcance[i]!;
  const L = t.estocadaL[i]!;
  const w = t.estocadaW[i]!;
  FLOATS_DO_EVENTO[0] = ux;
  FLOATS_DO_EVENTO[1] = uy;
  FLOATS_DO_EVENTO[2] = estocada ? L : R;
  FLOATS_DO_EVENTO[3] = estocada ? w : 0;
  gravarEvento(e.eventos, e.cab[CAB.passo]!, EVENTO.golpe, codigo, forma, -1, 0, 0, 0, 0);
  const rMax = dados.tipos.raioMaximo;
  CONSULTA[0] = jx;
  CONSULTA[1] = jy;
  CONSULTA[2] = (estocada ? Math.sqrt(L * L + w * w) : R) + rMax;
  const m = consultarGradeDoRascunho(grade, e.inimigos.x, e.inimigos.y, ACHADOS);
  // As bordas do setor: a mira girada ±60°, uma vez por golpe.
  const pX = ux * COS_60 - uy * SEN_60;
  const pY = ux * SEN_60 + uy * COS_60;
  const qX = ux * COS_60 + uy * SEN_60;
  const qY = -ux * SEN_60 + uy * COS_60;
  const ini = e.inimigos;
  const raio = dados.tipos.raio;
  for (let k = 0; k < m; k++) {
    const s = ACHADOS[k]!;
    if (ini.hp[s]! <= 0) continue;
    const r = raio[ini.tipo[s]!]!;
    let px = ini.x[s]! - jx;
    if (px > MEIA_LARGURA_DO_MAPA) px -= LARGURA_DO_MAPA;
    if (px < -MEIA_LARGURA_DO_MAPA) px += LARGURA_DO_MAPA;
    let py = ini.y[s]! - jy;
    if (py > MEIA_ALTURA_DO_MAPA) py -= ALTURA_DO_MAPA;
    if (py < -MEIA_ALTURA_DO_MAPA) py += ALTURA_DO_MAPA;
    let acerta: boolean;
    if (estocada) {
      // Círculo × retângulo exato, em coordenadas locais (W8).
      const a = px * ux + py * uy;
      const bb = px * -uy + py * ux;
      const ca = a < 0 ? 0 : a > L ? L : a;
      const cb = bb < -w ? -w : bb > w ? w : bb;
      const da = a - ca;
      const db = bb - cb;
      acerta = da * da + db * db <= r * r;
    } else {
      // Setor sem trigonometria (decisoes-F-004 §2): fora do raio + r não acerta; dentro do cone acerta;
      // fora do cone, acerta se a hitbox toca um dos segmentos-borda.
      const d = Math.sqrt(px * px + py * py);
      if (d > R + r) continue;
      if (d === 0 || px * ux + py * uy >= COS_60 * d) acerta = true;
      else {
        let u = px * pX + py * pY;
        if (u < 0) u = 0;
        else if (u > R) u = R;
        let ex = px - pX * u;
        let ey = py - pY * u;
        if (ex * ex + ey * ey <= r * r) acerta = true;
        else {
          u = px * qX + py * qY;
          if (u < 0) u = 0;
          else if (u > R) u = R;
          ex = px - qX * u;
          ey = py - qY * u;
          acerta = ex * ex + ey * ey <= r * r;
        }
      }
    }
    if (acerta) acertar(e, s, codigo, forma, 0, 0);
  }
}

// ——— Aura (Círculo) ———

/**
 * Tick global (W14): a cada período, todo inimigo vivo cuja hitbox toca a aura
 * (d ≤ R + r) leva o dano do tick e o Sal do nível; depois, no nv7, o pulso
 * (K1): quem toca a aura recebe passos de afastamento, sem dano nem Sal.
 */
function rodarAura(e: Estado, dados: DadosDaVigilia, v: number): void {
  const b = e.build;
  const t = dados.armas;
  const codigo = b.codigo[v]!;
  const i = indiceDoNivel(codigo, b.nivel[v]!);
  let r = b.recarga[v]!;
  if (r > 0) b.recarga[v] = --r;
  const tick = r === 0;
  let pulso = false;
  if (t.pulso[i] === 1) {
    let ep = b.esperaPulso[v]!;
    if (ep > 0) b.esperaPulso[v] = --ep;
    pulso = ep === 0;
  }
  if (!tick && !pulso) return;
  const j = e.jogador;
  const jx = j[JOGADOR.x]!;
  const jy = j[JOGADOR.y]!;
  const R = t.alcance[i]!;
  CONSULTA[0] = jx;
  CONSULTA[1] = jy;
  CONSULTA[2] = R + dados.tipos.raioMaximo;
  const m = consultarGradeDoRascunho(grade, e.inimigos.x, e.inimigos.y, ACHADOS);
  const ini = e.inimigos;
  const raio = dados.tipos.raio;
  if (tick) {
    calcularDano(dados, v, i);
    ACERTO[0] = DANO[v]!;
    const salPct = t.salPct[i]!;
    const salPassos = t.salPassos[i]!;
    for (let k = 0; k < m; k++) {
      const s = ACHADOS[k]!;
      if (ini.hp[s]! <= 0) continue;
      let dx = ini.x[s]! - jx;
      if (dx > MEIA_LARGURA_DO_MAPA) dx -= LARGURA_DO_MAPA;
      if (dx < -MEIA_LARGURA_DO_MAPA) dx += LARGURA_DO_MAPA;
      let dy = ini.y[s]! - jy;
      if (dy > MEIA_ALTURA_DO_MAPA) dy -= ALTURA_DO_MAPA;
      if (dy < -MEIA_ALTURA_DO_MAPA) dy += ALTURA_DO_MAPA;
      const lim = R + raio[ini.tipo[s]!]!;
      if (dx * dx + dy * dy <= lim * lim) acertar(e, s, codigo, FORMA.tick, salPct, salPassos);
    }
    b.recarga[v] = t.periodo[codigo]!;
  }
  if (pulso) {
    const passo = t.empurraoPorPasso;
    const maximo = t.empurraoMaxPassos;
    FLOATS_DO_EVENTO[0] = 0;
    FLOATS_DO_EVENTO[1] = 0;
    FLOATS_DO_EVENTO[2] = R;
    FLOATS_DO_EVENTO[3] = passo * maximo;
    gravarEvento(e.eventos, e.cab[CAB.passo]!, EVENTO.pulso, codigo, 0, -1, 0, 0, 0, 0);
    for (let k = 0; k < m; k++) {
      const s = ACHADOS[k]!;
      if (ini.hp[s]! <= 0) continue;
      let dx = ini.x[s]! - jx;
      if (dx > MEIA_LARGURA_DO_MAPA) dx -= LARGURA_DO_MAPA;
      if (dx < -MEIA_LARGURA_DO_MAPA) dx += LARGURA_DO_MAPA;
      let dy = ini.y[s]! - jy;
      if (dy > MEIA_ALTURA_DO_MAPA) dy -= ALTURA_DO_MAPA;
      if (dy < -MEIA_ALTURA_DO_MAPA) dy += ALTURA_DO_MAPA;
      const d2 = dx * dx + dy * dy;
      const lim = R + raio[ini.tipo[s]!]!;
      if (d2 > lim * lim) continue;
      // Até a borda: mín(12, ⌈(R + r − d)/8⌉) passos de 8 px; um pulso novo substitui o resto do anterior.
      const kb = Math.ceil((lim - Math.sqrt(d2)) / passo);
      ini.kbPassos[s] = kb < maximo ? kb : maximo;
    }
    b.esperaPulso[v] = t.periodoPulso[codigo]!;
  }
}

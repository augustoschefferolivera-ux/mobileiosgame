# Decisões da F-008 "Horas, marcos e Fogueira"

- Status: proposta, aguarda aprovação do usuário (Etapa 1; nenhum código escrito).
- Fontes: B §3.6, §3.10, §5.4, §5.7, §5.10 e §11.3 (F-008); ADR-0002 §3, §5, §8 a §10, §14 e §15; D2 a D7 (§9/§10/§13); ADR-0005 a ADR-0009; GDD 02 §3, 07 §4, 11 §3.6 e §3.8, 13 §1.2; `feature_list.json` (F-008); código lido por `grep` (estado v7, `ataques.ts`, `diretor.ts`, `inimigos.ts`, `pickups.ts`, `meta.ts`).
- Nomes: B = game-brief; D2 a D7 = `design/decisoes-F-002.md` a `-F-007.md`.

## 0. O que foi decidido (para vetar de relance)

### 0.A Decisões de design e divergências (para vetar)

Em negrito, o que diverge de documento aprovado. "Alternativa" é o que vale se você vetar. As oito que mais pedem seu olhar: CR3 (o Grito tem dano), CR4 (ciclo fixo, sem sorteio), AR2 (a borda da arena prende o jogador), AR4 (a arena mata também os médios), FG7 (quando `I` volta a 1,0), SV2 (save só em `localStorage`), SV3 (o save de 60 s grava só o `andamento`) e SV6 (disposição diferente vale como Recusar).

| # | Decisão | Valor |
|---|---|---|
| CR1 | Tamanho | **Quadrado de 64 px (raio 32) nos três marcos; diverge de B §5.7 (48 px) e do doc 13 §1.2 (Chefe Menor 96 a 128 px)**; vale o "elite" do doc 13. Alternativa: 48 px, ou 96 px só no Chefe Menor (campo de escala por instância) |
| CR2 | Patada | Cone de 120° (cos 0,5 literal), alcance 96 px do centro (3 corpos), telegrafo branco 36 passos, aparável, dano = dano do slot (25 × (1 + 0,05·min): 31,25 / 37,5 / 43,75), recuperação 90 passos (1,5 s, como o Oco Grande). Mira fixada no início do telegrafo. Alternativa: alcance 80 px |
| CR3 | Grito | Círculo de 96 px (3 corpos) em volta do centro, telegrafo vermelho 60 passos, não aparável, dano = 50% do dano do slot (B §11.3 deixa "se houver"; decido que há, senão o vermelho não ensina esquivar), empurrão de 64 px em 8 passos de 8 px, só no jogador (Q-16), recuperação 90. A esquiva (i-frames) evita dano e empurrão. Alternativa: Grito sem dano, só empurrão |
| CR4 | Cadência | Gatilho: jogador a ≤ 96 px + hitbox (16) do centro. Ciclo fixo por Coroado, `ataqueSeq` mod 3: Patada, Patada, Grito. Sem RNG. Intervalo mínimo entre ataques: 36 + 90 = 126 passos (Patada) ou 60 + 90 = 150 (Grito). Alternativa: sorteio no fluxo `ia` (1 sorteio por ataque) |
| CR5 | Movimento | `pararADistancia` a 80 px do centro (2,5 corpos, dentro da Patada); velocidade 0,65 do JSON (1,56 px/passo). Coroado e jogador seguem sólidos um para o outro (S4 inalterada) |
| CR6 | HP e dano | `hp = hp_base_do_marco × (1 + 0,12·min) × I` com `min` = minuto do relógio no passo do nascimento: 960 (5:00), 2.200 (10:00), 1.680 cada (15:00) com `I` = 1,0 (Q-12). `hp_base` vem da linha de marco da região (600 / 1.000 / 600), não do tipo |
| CR7 | Convocação | Cada Coroado convoca 10 Ocos das Lanternas a cada 600 passos (a 1ª, 600 passos após nascer), em anel de 80 px: direção `(desl + ⌊i·256/10⌋) & 255` na tabela literal, `desl = (convocacoes × 37) & 255`; ponto fora da arena é levado para dentro (≤ 224 − 16,5 do centro). Sem RNG. Regra do ADR-0002 §8.7 com `falta` = 10 (nunca converte; o que não cabe no TETO é descartado). Não nascem atordoados. Alternativa: anel de 128 px |
| CR8 | Imunidades | Imune ao pulso do Círculo e à Postura Quebrada (`postura_quebrada: false`, Q-02); leva Sal e todo dano de arma. Aparar a Patada devolve stamina e arma o Contra-ataque, **mas não atordoa; diverge do doc 02 §5.4 (o aparo atordoa "no atacante")**. Alternativa: `postura_quebrada: true` (o aparo atordoa, doc 02 §5.4) |
| CR9 | Morte | Por arma: Cinza de 25, Alma de 30 (`inimigos.json`), `mortes` + 1 e `soltarBau` no ponto da morte (dourado se for o marco 2). Pela arena ou por marco vencido (`CAUSA.arena`, `CAUSA.cinza`): nada disso, nem `mortes`. Dois Coroados dão dois baús |
| CR10 | Corpos grandes | Tipo com raio > 24 px entra numa lista própria (≤ 4, fora da grade da massa). Separação: partilha igual (D3 S3), a grade é consultada com `r_grande + 24` e o par é processado dos dois lados. R_MAX de armas e separação continua 24; o da lista de obstáculos por célula passa a 32. Alternativa: R_MAX 32 para todos (+78% de área por consulta) |
| CR11 | Telegrafo | Cunha de 120° e raio 96 (Patada) e círculo vermelho de 96 (Grito); brilho no quadrado de 64 px (branco, alfa crescente, V6). Seta na borda da tela (a de MC9, generalizada) quando o atacante com telegrafo ativo (Coroado ou Noviça) está fora da vista |
| AR1 | Etapas | `etapa` u8: HORA 0, MARCO 1, FOGUEIRA 2, CHEFE 3, A_FOME 4. `marcosIniciados` u8 (0 a 3). Marco `k` começa no fim do passo em que `relogio ≥ {18.000, 36.000, 54.000}[k]` (5:00, 10:00, 15:00): Guardião I (1 Coroado, baú comum), Chefe Menor (1, dourado), Guardião II (2, comum). Com `linhaFixa` de cenário a máquina fica presa em HORA |
| AR2 | Arena | Centro = posição do jogador no passo; raio 224 px. A borda é colisão circular: prende o jogador (ADR-0002 §15 item 14) e os inimigos que nasceram dentro; os de fora não entram. O lado vem da posição anterior (`xAnt`, `yAnt`). Coroados nascem a 128 px do centro, nas direções 0 e 128 da tabela. Alternativa: a borda só barra quem está fora |
| AR3 | Obstáculos | Todo obstáculo cujo disco toca o da arena (`d ≤ 224 + r_o`) vira `ativo = 0` e fica assim até o fim da Vigília (só vai de 1 para 0). Fogueira e baús nunca colidem |
| AR4 | Massa dentro | **Todo Oco das Lanternas, Oco Grande e Noviça com centro a < 224 px morre ao formar a arena (`CAUSA.arena`) e os projéteis de Sal inimigos dentro somem. B §5.8 diz só "massa"; estendo aos médios.** Alternativa: só a massa; médios dentro são empurrados para fora |
| AR5 | Diretor | Com `etapa ≠ HORA` ou marco devido, não spawna e `espera` = 0 (R2). Na linha de marco, depois da arena: mínimo da linha, roster e intervalo da linha anterior (ADR-0002 §8.5; `sortearTipo` com roster vazio lê a linha errada hoje) |
| AR6 | Fim do marco | `coroadosVivos` = 0 no fim do passo: etapa HORA, arena desfeita (obstáculos seguem inativos), Fogueira acesa (FG1), `I` volta a 1,0 (FG7). Convocados vivos continuam como inimigos comuns |
| AR7 | Marco vencido | Em MARCO com `relogio ≥` o limiar seguinte: Coroados vivos viram cinza (`CAUSA.cinza`: sem baú, Cinza, Alma ou `mortes`), arena desfeita, Fogueira desse marco não acende e o marco seguinte começa no mesmo passo, com centro novo (ADR-0002 §15 item 7) |
| AR8 | 20:00 e 23:00 | Gancho da F-009: 72.000 (20:00) → Coroados viram cinza, qualquer Fogueira acesa se apaga, `etapa` = CHEFE (sem Lanterneiro nem arena; o diretor segue a linha 20). 82.800 (23:00) em CHEFE → `etapa` = A_FOME e `encerrarVigilia(aFome)` no mesmo passo (Resultado de A Fome, mancha de 30%). O dano de fome e o Lanterneiro são da F-009 |
| AR9 | Mancha na arena | Sem regra nova (MC7): dentro do disco da arena ela é alcançável (obstáculos somem); fora dele, espera o fim do marco |
| FG1 | Posição | No fim do marco: a 96 px do jogador, na 1ª das 8 direções literais (índices 0, 32… 224 da tabela), a partir da mira, em ordem k, k+1, k−1, k+2… cujo disco de 64 px não toque obstáculo ativo; nenhuma livre: a da mira |
| FG2 | Raio | 64 px (centro a centro, no toro), `d² ≤ 4.096`. Entrar abre (etapa FOGUEIRA); sair (`d² > 4.096`) equivale a Partir; sem histerese. Só abre se a Fogueira estiver acesa |
| FG3 | O que para | Em FOGUEIRA param: relógio, horda (movimento, separação, Sal, Postura), ataques (telegrafos cancelados, projéteis de Sal removidos), contato (não fere), diretor e armas (um só teste, `armasAtivas(e)`: sem dano nem knockback; todos os timers, ondas, facas em voo e Poder congelados). Correm: jogador, stamina, congelamento, Frasco, Sal no jogador e pickups (um level up abre o modal antes das ações). Esquiva e aparo ignorados sem custo. Inimigos em cinza |
| FG4 | Descansar | `hp = hpMax`, cargas = `frascos.cargas` (3), `I10` = 11; zera a cura em curso (sem evento, sem devolver carga). Uma vez por Fogueira |
| FG5 | Forjar União | `uniaoForjavel` = `uniaoDisponivel` sem o gate de relógio (a Forja não espera baú). Custo `forja_custo_almas_por_hora[hora da Fogueira]` = 150 / 250 / 400; Almas < custo: negado (`acaoNegada`). Débito, `aplicarUniao`, sem modal. Uma vez por Fogueira |
| FG6 | Partir e ignorar | Partir (bit) ou sair do raio: Fogueira apagada, etapa HORA. Fogueira ignorada fica acesa até o início do marco seguinte; a da Hora III se apaga às 20:00 (AR8). Só uma Fogueira existe por vez |
| FG7 | `I` | Descansar põe 11; `I` volta a 10 quando a próxima Fogueira acende (entrando nela ou não). Marco vencido não acende Fogueira e não reseta. Alternativa: resetar ao começar o marco seguinte |
| FG8 | Menu | Overlay com a simulação rodando: Descansar, Forjar União (custo), Partir, build resumida. Ação usada ou sem condição fica desabilitada. Textos `I1.FOGUEIRA.*` existentes mais 3 ids novos. "Vigília guardada" só aparece se a gravação deu certo |
| SV1 | O que se grava | O buffer inteiro (v8) em base64 mais um envelope; ficam fora o anel de eventos, os derivados e tudo da cena. A carga valida, copia os bytes, chama `sincronizarDerivados` (refaz `hpMax` e as duas tabelas de dano vivo) e, com modal aberto, reabre-o antes de qualquer passo |
| SV2 | Onde | **`localStorage`: `vdc.vigilia` e `vdc.andamento` (com `vdc.meta`); IndexedDB e `persist()` ficam na F-010. Diverge de ADR-0002 §10 no prazo** (mesma divergência da D7 SV2). Alternativa: IndexedDB já. **(revisão: a D10 ST1 propõe que o IndexedDB nem entre na F-010; vale a decisão final de ST1)** |
| SV3 | Quando grava | `vigilia`: passo 0, ao abrir a Fogueira, depois de Descansar e Forjar, e ao Partir ou sair (cópia-sombra, FG9). `andamento` (pequeno): a cada 3.600 passos e em `visibilitychange`/`pagehide`; o save de 60 s não grava o buffer (ADR-0002 §10; Q-03). Cenários não gravam, salvo `fogueira_hora1` |
| SV4 | FIM atômico | Ordem: `meta` com `ultimaEncerrada = idVigilia` e Almas creditadas; só então remove `vdc.vigilia` e `vdc.andamento`. A leitura descarta um `vigilia` com `idVigilia = ultimaEncerrada`. `idVigilia` = `meta.proximaIdVigilia`, incrementada e gravada antes do `vigilia` do passo 0 |
| SV5 | Retomada | Acender com `vigilia` válido mostra `A1.ACENDER.RETOMAR` ({hora}) ou `RETOMAR_INICIO` (save do passo 0), um resumo (nível, Almas, Frascos) e `RECUSAR`. Continuar restaura e abre a Vigília na pausa (um toque a mais; o hash confere antes de qualquer passo). Recusar pede 2 toques (PE4) e usa `encerrarVigilia(abandonar)` no estado carregado, com Almas = o maior entre o `vigilia` e o `andamento` do mesmo `idVigilia` (Q-03). Alternativa: sem pausa |
| SV6 | Save incompatível | `layout` maior que o atual, soma errada ou NaN: ignorado, sem crédito. **Disposição de obstáculos diferente (`CAB.disposicao`): descartado e tratado como Recusar sem oferta (Almas × 0,5 pelo envelope); diverge de ADR-0002 §12 ("migrar"), porque as posições mudam.** Alternativa: descartar sem crédito |
| SV7 | Migrações | `src/logica/save/migracoes.ts`: lista de funções puras `vN → vN+1` sobre o envelope (`versao`, hoje 1); o buffer vai no campo `layout` e cada feature que o aumentar acrescenta uma migração que o estende com padrões. **Não existe save de layout < 8 (nada gravava `vigilia`): as migrações v5 → v6 etc. da D6 §10 não se escrevem; diverge da D6 §10 (que pedia a migração v5 → v6)**; a regra "stamina 100, contadores 0" vale como molde. Alternativa: escrevê-las mesmo assim, com um save sintético por versão |
| SV8 | Mancha | `meta.mancha` só muda no FIM (MC7). A recuperação mora no buffer (`manchaAtiva` 0); um `vigilia` anterior à recuperação a traz de volta (Q-03). Nenhum campo novo no meta |
| HU1 | Relógio no HUD | `Text` `A5.HUD.RELOGIO` "m:ss", reescrito 1 vez por segundo de relógio; Hora em romanos por `A5.HUD.HORA`. **Diverge da recomendação da D5 §9 (glifos da N4 e ":"); segue o precedente da D7 (HP e Almas em `Text`)**. Alternativa: glifos da N4 e ":" (D5 §9) |
| ES1 | Escurecimento | Só render (fora do hash): véu preto de alfa `0,10 × (relogio − 54.000)/3.600` de 15:00 a 19:00, estacionado em 0,40 até 20:00; abaixo de telegrafos, projéteis inimigos, jogador e HUD. A soma com os 40% da fase 2 é da F-009 |
| CE1 | Cenários | `fogueira_hora1` (relógio 5:00, etapa FOGUEIRA da Hora I, dentro do raio, Espada nv8 + Elmo, 400 Almas, 1 Frasco, HP 50%) e `marco_coroado` (relógio 4:59,5 = 17.970 em HORA: a arena forma no passo 30; para as capturas). Ambos com `ataques` ligado |

### 0.B Decisões técnicas (informativo)

| # | Decisão | Valor |
|---|---|---|
| LY1 | Layout v8 | Bloco único no fim, depois dos 74.680 B (§1). Hash muda uma vez; regressão v7 com máscara |
| LY2 | Eventos, formas, causas | `EVENTO` 29 a 38, `FORMA` 9 e 10, `CAUSA` 2 e 3, `ACAO` 32/64/128; só no fim |
| LY3 | Laço quente | Sem double nem u32 ≥ 2³⁰ entre chamadas; rascunhos `Float64Array` (borda, empurrão, Fogueira); E4: `passoVivo` não ganha linha, as etapas vivem em `passo`/`avancar` e numa função própria `passoFogueira` |
| LY4 | RNG | Nenhum fluxo novo e nenhum sorteio novo: anel da convocação, ciclo de ataques e posições são tabelas |
| SV9 | Módulos | `src/logica/save/vigilia.ts` (envelope, base64 próprio, FNV de metades de 16 bits do `meta.ts`), `migracoes.ts`; I/O em `armazenamento.ts`; `__GAME_DEBUG__.save` = `{ seq, hash }` do último `vigilia` gravado (FNV do buffer gravado) |
| FG9 | Cópia-sombra | Em FOGUEIRA o driver roda 1 passo por vez e, se a etapa continua FOGUEIRA, copia o buffer para um `Uint8Array` fixo do tamanho do buffer vigente (76.788 B no v8; cresce com o layout; sem alocação, ≈ 10 µs). O save do Partir e da saída é a sombra (ADR-0002 §10: último passo dentro do raio) |

## 1. Layout v8 e determinismo (LY1, LY2, LY4)

Depois dos 74.680 B (ADR-0009 §1), alinhado a 4 bytes; total previsto **76.788 B** (a confirmar):
- Float32 ×4: `fogueiraX`, `fogueiraY`, `arenaX`, `arenaY`; Float32 ×2: `empurraoX`, `empurraoY` do jogador (passo do Grito).
- Uint32 ×2: `idVigilia`, `convocacoes` (< 2³⁰).
- Uint8 ×12: `etapa`, `marcosIniciados`, `arenaAtiva`, `coroadosVivos`, `fogueiraAcesa`, `fogueiraHora` (1 a 3), `fogueiraAcoes` (bit 1 descansou, bit 2 forjou), `empurraoPassos`, 4 de folga em zero.
- `obstaculoAtivo` ×64 (54 usados; n > 64 é erro no boot), nasce em 1.
- Por inimigo (500): `ataqueId` u8, `ataqueSeq` u8, `convocaEspera` u16.
- Seção nova `fogueira` em `hashPorSecao`; `vigilia` termina em 74.680.

**Regressão v7:** gravar, com o código de antes da F-008, os bytes [0, 74.680) aos passos 1.000 e 1.800 (seeds 1 e 424242, `horda_com_ataques`); igualdade com máscara só da palavra `CAB.versao` (nada novo age antes de 5:00). Literais de hash regravados uma vez; referências que cruzam 5:00 com linha livre (`sim20`) mudam por semântica.

Eventos: 29 `marcoIniciado`, 30 `marcoVencido`, 31 `marcoConcluido`, 32 `fogueiraAcesa`, 33 `fogueiraAberta`, 34 `descansou`, 35 `forjou` (custo), 36 `fogueiraPartiu` (forma 1 botão, 2 saiu), 37 `fogueiraApagada`, 38 `convocacao` (x, y, quantos entraram). `FORMA.coneInimigo` = 9 (Patada), `FORMA.gritoInimigo` = 10; `golpeInimigo` e `telegrafo` as usam. `CAUSA.arena` = 2, `CAUSA.cinza` = 3 (só `arma` solta Cinza, Alma, `mortes` e baú).

## 2. Coroado (CR1 a CR11)

- **Dados:** `inimigos.json`: `tamanho_px` 64, Patada (`alcance_corpos` 3, `angulo_graus` 120, `recuperacao_s` 1,5), Grito (`raio_corpos` 3, `dano_pct` 50, `empurrao` 2 corpos em 8 passos, `recuperacao_s` 1,5), `aproximar_e_atacar` com `para_a_corpos` 2,5; saem os `pendentes`; `criarTiposDeInimigo` deixa de pular o Coroado.
- **Nascimento:** `NASCIMENTO` ganha o 3º slot `hpBase` (0 = o do tipo); HP e dano pela escala existente; `convocaEspera` = 600; `coroadosVivos` += 1.
- **Ataque:** `ataqueFase`/`ataqueTimer` como hoje, mais `ataqueId` (0 Patada, 1 Grito): no gatilho, `ataqueSeq mod 3 == 2 ? Grito : Patada`; `ataqueSeq` += 1 ao fim do telegrafo. Patada: cone como o do Oco Grande (cos 0,5, alcance 96 + 16). Grito: `d² ≤ 112²`, por `resolverAcertoNoJogador` (origem golpe) sem ramo de aparo; se `acertou`, `empurraoPassos` = 8 e `empurrao = fround(u × 8)` (`u` = unitário do Coroado ao jogador; d = 0: a mira).
- **Empurrão:** soma ao deslocamento em `moverJogador`, depois obstáculos ativos, borda da arena e solidez dos inimigos (S4 inalterada): ≤ 8 px por passo (invariante de 32).
- **Convocação:** `convocaEspera` cai 1 por passo em que o Coroado vive e a simulação roda. Em 0: `convocacoes` += 1, 10 pontos (CR7), `livres = TETO − slots`, entram `min(10, livres)`, evento 38, `convocaEspera` = 600. Ponto sobre obstáculo ativo é descartado e conta em `semPontoLivre`.
- **Armas:** grandes montados em `listarVivos`; toda consulta testa a grade (R = alcance + 24) e depois os grandes com o raio da forma (setor, segmento, tick por distância, retângulo da onda). Pulso ignora o Coroado.
- **Morte:** `matarInimigo` solta o baú (`soltarBau(x, y, marco == 2)`) se tipo Coroado e causa arma; `coroadosVivos` -= 1 em qualquer causa. Morte no passo em que o relógio vence o marco: vale a morte.

## 3. Arena e marcos (AR1 a AR9)

Ordem do fim de passo em `rodarEtapa` (só na fase VIVA, depois da mancha e da morte):
1. 20:00 e 23:00 (AR8), se a etapa permite.
2. Marco vencido (AR7) e início de marco (AR1): `arenaX/Y` = posição do jogador; `arenaAtiva` = 1; para cada obstáculo com `d² ≤ (224 + r_o)²`, `ativo` = 0; varredura dos 500 slots: tipo de massa ou médio com `d² < 224²` → `matarInimigo(CAUSA.arena)`; projéteis de Sal inimigos dentro liberados; Fogueira acesa se apaga (evento 37); nascem os Coroados (dados da linha de marco, HP de CR6); `marcosIniciados` += 1; evento 29.
3. Fim do marco (AR6) e acender da Fogueira (FG1, FG7).
4. Fogueira (FG2): HORA + acesa + `d² ≤ 4.096` → FOGUEIRA (evento 33); FOGUEIRA + `d² > 4.096` → HORA (evento 36, forma 2, Fogueira apagada).

**Borda (Float32, no toro):** `dx, dy` = delta toroidal da posição ao centro; `d² = dx² + dy²` em double. Dentro: se `d² > (224 − r)²`, `k = fround((224 − r)/√d²)`, `x = norm(fround(cx + fround(dx·k)))` (idem y). Fora: se `d² < (224 + r + 0,01)²`, mesma conta com `224 + r + 0,01`. Jogador: `r` = 16. O lado do inimigo é o de `(xAnt, yAnt)`. Aplicada depois dos obstáculos em `moverJogador` e `moverHorda`; o knockback e a esquiva passam por ela.

`obstaculoAtivo` é lido pelas colisões e pelo ponto livre do diretor; a mancha (MC4) continua contando todos os obstáculos do JSON (D2 §9). A lista por célula não muda; o laço pula os inativos. O teste de equivalência (lista por célula × inteira) é refeito com inativos e com o Coroado (`2·32 + 1,56 = 65,56 < 67,4`, ok na Charneca; folga de 64 px exigiria outro teste).

**Diretor:** `rodarDiretor` sai cedo se `etapa ≠ HORA` ou se `relogio ≥ limiar[marcosIniciados]` (marco devido). Os garantidos já entregues não voltam.

## 4. Fogueira (FG1 a FG8)

**`passoFogueira`** (etapa FOGUEIRA; `passo` despacha por etapa): congelamento da fase 0 como no passo vivo; bits 32/64/128 só valem aqui e com o modal fechado (nos outros casos são zerados sem efeito); ordem Descansar, Forjar, Partir; o passo do Partir só muda a etapa (`passo` + 1). Depois: `passo` + 1 (o `relogio` **não** anda); `moverJogador` (esquiva e aparo zerados); `rodarFrasco`; `rodarPickups`; stamina e Sal do jogador como hoje; `rodarEtapa`. Não rodam: `moverHorda`, `rodarArmas`, Poder, `rodarAtaques`, `aplicarContato`, `decrementarPostura`, `aplicarRotacao`, `rodarDiretor`.
- **Ao entrar:** telegrafos em curso cancelados (`ataqueFase` = 0), projéteis de Sal liberados; as facas e ondas das armas ficam congeladas no lugar.
- **Descansar:** `hp = hpMax`; `frascoCargas` = cargas do Vigilante; `frascoPasso`, `frascoRestante`, `frascoPorPasso` = 0; `MUNDO.intensidade10` = 11; bit 1 de `fogueiraAcoes`; evento 34. **Forjar:** `u = uniaoForjavel`; `u < 0` ou Almas < custo → `acaoNegada`; senão `almas -= custo`, `aplicarUniao`, bit 2, evento 35 (custo). Custos de `unioes.json` por `fogueiraHora`.
- **`I`:** o diretor usa `intensidade10` como hoje: alvo `⌈min × I⌉` e intervalo `round(base × 10/I10)`.
- **Menu (cena):** com `etapa == FOGUEIRA` e sem modal; botões de 44 pt; os toques viram os bits 32/64/128 (modo `fogueira` do tradutor; o joystick segue vivo e sair do raio é Partir).

## 5. Save, retomada e FIM (SV1 a SV9)

**Envelope `vigilia`:** `{ versao: 1, layout: 8, idVigilia, seq, hora, nivel, almas, frascos, bytes: base64, soma }`; `soma` = FNV-1a de 32 bits em duas metades de 16 bits sobre o JSON do corpo (string hex de 8). `seq` cresce a cada gravação. `andamento`: `{ idVigilia, seqDoVigilia, hora, almas, x, y, relogio, passo }`. Schema em `src/dados/schemas/`, validado com o ajv dos outros schemas.

**Carga (`restaurar`):** valida `layout`, `CAB.disposicao` (SV6) e NaN (`nan.ts`); copia os bytes; `sincronizarDerivados`; modal aberto reabre antes do 1º passo. Layout menor: SV7.

**Sequência:**
1. Acender: `meta.proximaIdVigilia` += 1 (gravado), `vigilia` do passo 0.
2. Fogueira: eventos 33, 34 e 35 gravam o `vigilia` do estado do passo; evento 36 grava a sombra (FG9).
3. `andamento` quando `passo % 3.600 == 0`, `visibilitychange` e `pagehide`.
4. FIM (qualquer causa): `meta` (Almas, `ultimaEncerrada = idVigilia`, mancha pela regra de MC3), depois remove `vdc.vigilia` e `vdc.andamento`. Uma falha entre os dois passos é coberta pela regra de leitura de SV4.
5. Boot: `idVigilia == ultimaEncerrada` → descarta e remove; senão oferta (SV5). Falha de escrita (cota, modo privado): memória da sessão e sem "Vigília guardada".

**Debug:** `__GAME_DEBUG__.save` = `{ seq, hash }` (nulo antes da 1ª gravação). Telemetria: `fogueira` ao Partir (`hora`, `descansou`, `forjou`); `erro_recuperacao.retomou_da_fogueira` ao Continuar.

## Pendências resolvidas

Numeração = ordem de `pendencias_antes_de_comecar`. 1: CR1 a CR4, ES1. 2: CR7. 3 (D2 §9): AR3; FG1 e AR3; SV6; CR3 e §2. 4 (D3 §9): AR5; FG3; CR7; CR10; AR3 e §3; CR3; CE1 (receitas seguem receitas, presas em HORA por `linhaFixa`); SV1 (inclui pilha de livres e gerações); ES1. 5: FG3 (armas congeladas; o Sal dos inimigos congela com o comportamento, o do jogador corre). 6: SV1. 7: CR8, CR10. 8: AR4, AR7, CR9. 9: CR9, FG5. 10: FG3, AR2, AR6 (o baú cai dentro do disco). 11 e 13: SV1, SV7 (nenhuma migração v5 → v6 se escreve: não há save < 8). 12: §6 (U7), HU1. 14: FG3, §4. 15: CR2 a CR4, CR7, CR8, CR11. 16: FG4. 17: CR11. 18: SV1, SV4, SV8. 19: SV5. 20: SV1. 21: AR9. 22: CR9. Nenhuma pendência foi empurrada para outra feature; do que não cabe aqui (Lanterneiro, dano de fome, IndexedDB), só o gancho entra.

## Critérios (o "como" para o `feature_list.json`)

- **F-008.1:** vitest. Salvar no passo 500 de `horda_com_ataques` (3 armas nv ≥ 3, Frasco em curso, `I10` = 11) → `serializarVigilia` → `lerVigilia` → `restaurar`: `hash` e buffer iguais ao gravado; campo a campo: as 5 vagas (`codigo`, `nivel`, `recarga`, `golpe`, `esperaGolpe`, `esperaPulso`), nível, XP, Almas, `frascoCargas`, `intensidade10`, `hp`, `hpMax` e as tabelas de dano vivo. Com modal aberto: `modalAberto` verdadeiro e `avancar` devolve 0.
- **F-008.2:** como no registro: v1 → v2 do teste renomeia `frascos` para `cargas` no envelope; save v1 sintético migrado, conferido campo a campo e validado no schema v2; `lerVigilia` recusa `versao` maior e `soma` errada.
- **F-008.3:** Playwright, 390 × 844, debug: `?cenario=fogueira_hora1&seed=1`; Acender; Partir (toque); `avancar(120)`; fechar a página; reabrir sem `cenario`: `textoAtivo` contém `A1.ACENDER.RETOMAR`; tocar Continuar (abre na pausa): `hash()` = `save.hash` e `relogio` = 18.000.
- **F-008.4a:** com `I10` = 10, o Coroado nascido pelo marco tem HP 960 (5:00), 2.200 (10:00) e 1.680 (15:00, cada) e dano 31,25 / 37,5 / 43,75; com `I10` = 11 o HP é `hpNoSpawn(base, min, 11)`.
- **F-008.4b:** `teto` 300 com 295 vivos: a convocação aos 600 passos põe 5, descarta 5, `slots ≤ 300`, nenhum convertido; com 0 vivos põe 10 a 80 ± 0,01 px do Coroado e a ≤ 207,5 px do centro; a 2ª sai 600 passos depois; Coroado morto antes não convoca.
- **F-008.4c:** marco 1 a partir de `inicio_jogador` (585, 1266): `obstaculoAtivo` = 0 exatamente nos obstáculos com `d ≤ 224 + r_o` (contagem independente no teste) e nunca volta a 1; 0 massa e médios com `d < 224`; `mortes`, Cinzas, Almas e baús inalterados; `spawns` constante por 600 passos; inimigo de fora a 230 px não entra; jogador empurrando a borda por 120 passos fica a ≤ 208 px do centro.
- **F-008.4d:** último Coroado morto: `bausSoltos` + 1 (marcos 1 e 2; dourado só no 2) ou + 2 (marco 3); `fogueiraAcesa` = 1 a 96,0 ± 0,01 px do jogador; `etapa` = HORA; `arenaAtiva` = 0; `intensidade10` = 10.
- **F-008.4e:** a < 64 px, em 120 passos: `relogio`, posições e HP dos inimigos, timers das armas (`recarga`, `golpe`, `esperaPulso`, `caSeq`, `caEspera`) e HP do jogador (com um inimigo sobre ele) não mudam e não há evento `acerto`. Descansar: HP = `hpMax`, cargas = 3, `intensidade10` = 11, 2ª vez negada. Forjar (Espada nv8 + Elmo, relógio < 10:00): 149 Almas negado; 150 na Hora I debita 150 e a vaga vira a União nv1; 250 (Hora II) e 400 (Hora III) idem.
- **F-008.4f:** a 65 px: `etapa` = HORA, `fogueiraAcesa` = 0, evento 36 (forma 2), e a sombra tem o hash do estado anterior ao passo; Fogueira ignorada: acesa até `relogio` 36.000 e apagada no início do marco 2; a da Hora III: apagada e `etapa` = CHEFE em 72.000.
- **F-008.4g:** Guardião I vivo em 36.000: `marcosIniciados` = 2, arena nova com centro novo, 0 baús, Cinzas, Almas e `mortes` dos Coroados cinza; Guardião II vivo em 72.000: `etapa` = CHEFE; 82.800 em CHEFE: `etapa` = A_FOME, `fase` = FIM, `causaDoFim` = aFome.
- **F-008.5:** armazenamento simulado: Acender grava `meta` e depois `vigilia`; o passo 3.600 grava `andamento`; FIM grava `meta` antes de remover os dois; falha injetada entre o `meta` e as remoções: a leitura descarta o `vigilia`, sem oferta, Almas creditadas uma vez; FIM repetido é no-op; cota estourada cai na memória sem lançar.
- **F-008.6:** salvar no passo 500, restaurar e continuar até 1.000 dá o mesmo hash que sem salvar (`horda_com_ataques`, com Frasco e Sal ativos); idem em `marco_coroado` (relógio 17.970, salvar no passo 100, já dentro da arena, continuar 500 passos).
- **F-008.7 (novo, Patada e Grito):** Patada a 112 px no cone acerta, a 112,1 não, fora do cone não; o aparo absorve a Patada e não o Grito; o Grito a 111 px acerta e empurra 64 px em 8 passos (≤ 8 por passo); a esquiva evita os dois; ciclo Patada, Patada, Grito.
- **F-008.8 (novo, alocação e regressão):** E7 (≤ 16 B por passo) com Coroado, convocação e arena, e com a Fogueira aberta; regressão v7 do §1.

## Evidências (`production/evidencias/F-008/`, capturas 390 × 844)

`retomada.webm` e `save.json` (da feature); `fogueira-390x844.png` (menu aberto); `coroado-arena-390x844.png` (`marco_coroado`: borda, telegrafo da Patada e do Grito); `acender-retomada-390x844.png` (oferta); `u7.log` (§6). Pendente de aparelho: gravação em Safari real (cota do `localStorage`), retomada depois de jetsam de verdade, toque de 44 pt nos botões da Fogueira e véu do escurecimento no OLED.

## 6. U7 e simulação de 20 minutos

O `sim20` ganha o Coroado e um bot que entra na Fogueira, descansa e forja quando tem Almas. Registra em `u7.log` o minuto da 1ª União (baú de 10:00 ou Forja) e as Almas por Vigília contra Q-21. É medida, sem gate nem decisão.

## Recomendações para as features seguintes (não decididas aqui)

- **F-009:** a arena do Lanterneiro reusa a borda (AR2) e os corpos grandes (CR10, caixa); `CHEFE` e `A_FOME` já são etapas (AR8): trocar o FIM imediato pelo dano de fome (`danoAoJogador`, `faseSemArmas`); escurecimento + fase 2 (ES1).
- **F-010:** IndexedDB e `persist()` com migração de `vdc.vigilia` e `vdc.andamento`; pausa automática ao retomar; calibrar no iPhone o menu da Fogueira, a borda que prende e o véu.
- **F-011:** arte do Coroado (64 px), da Fogueira, da cunha e do cinza dos inimigos.
- **Balanceamento (depois da F-010):** cadência (CR4), dano do Grito (CR3), 1ª convocação (CR7).

## O que muda em dados e documentos

- `inimigos.json` e `inimigo.schema.json` (CR1 a CR3, CR5, CR7); `combate.json` (`arena.raio_px` 224, `fogueira.raio_px` 64, `fogueira.distancia_px` 96, `autosave_passos` 3.600) e schema; `regioes/charneca_das_lanternas.json` sem mudança (a linha de marco já tem `hp_base`).
- `pt-BR.json`: `A5.HUD.RELOGIO`, `A1.ACENDER.RESUMO`, `I1.FOGUEIRA.USADA`, `I1.FOGUEIRA.SEM_ALMAS`, `I1.FOGUEIRA.SEM_UNIAO`; passam pelo glossário do lint.
- Receitas `fogueira_hora1.json` e `marco_coroado.json`, schema do cenário (campos `etapa_inicial`, `fogueira`, `almas_iniciais`, `frascos`, `hp_pct`).
- Código: `estado.ts` (v8), `passo.ts` (`passoFogueira`, `rodarEtapa`), `diretor.ts` (portão), `ataques.ts`, `horda.ts`, `armas`, `obstaculos.ts`, `bau.ts` (`uniaoForjavel`), `src/logica/save/{vigilia,migracoes}.ts`, `armazenamento.ts`, cenas Acender, Hud, Fogueira (nova) e Pausa.
- Documentos: `feature_list.json` (os "como" acima, F-008.7 e F-008.8, evidências, pendências resolvidas), `docs/decisoes/ADR-0010-implementacao-da-f008.md` (divergências e medidas), `progress.md`.

## Revisão

- R8-1 (coerência, SV7): a dispensa das migrações da D6 §10 era divergência sem marca; ficou em negrito, com "diverge da D6 §10" e Alternativa.
- R8-2 (marcação, CR8): `postura_quebrada: false` contra o doc 02 §5.4 não estava em negrito; ficou, com Alternativa já existente.
- R8-3 (marcação, HU1): divergência da D5 §9 sem "Alternativa"; acrescentada.
- R8-4 (conta, CE1 e F-008.6): 4:59,5 são 17.970 passos, não 17.700; a arena forma no passo 30. Corrigido nas duas linhas.
- R8-5 (FG9): "76 KB" não cabia no buffer (76.788 B) nem no v9/v10; passou a "tamanho do buffer vigente".
- R8-6 (coerência, SV2): a D10 ST1 cancela o IndexedDB na F-010; nota "(revisão: ...)" no Valor. Decisão do usuário (aprovar D8 SV2 e D10 ST1 juntos).
- R8-7 (informativo): AR8 e F-008.4g (FIM imediato às 23:00) são ganchos que a D9 FM1 substitui pelo dreno de fome; já constava nas Recomendações, sem mudança.

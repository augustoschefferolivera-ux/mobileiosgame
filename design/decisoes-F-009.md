# Decisões da F-009 "O Lanterneiro, Amanhecer e A Fome"

- Status: aprovada pelo usuário sem veto em 2026-10-12 ("Aprovo tudo"), inclusive as divergências em negrito e as correções da Revisão. Etapa 2 (implementação) em curso. Depende da D8 (`design/decisoes-F-008.md`, aprovada e implementada): o layout v9 cresce depois do v8, e eventos e formas novos vêm depois dos da D8.
- Fontes: B §3.11, §4, §5.8, §5.11, §5.13 e §11.3 (F-009); ADR-0002 §3, §9, §14 e §15; D2 a D8 (§9/§10/§13); GDD 02 §3 e §5.4, 06 §1 e §2.2, 10 §2.3 e §6, 11 §3.12; Q-02, Q-05, Q-10, Q-15, Q-21, Q-28, Q-35; `chefes.json`; código lido por `grep` (`vigilia.ts`, `contato.ts`, `aparo.ts`, `acerto.ts`, `passo.ts`, `meta.ts`, `mancha.ts`).
- Nomes: B = game-brief; D2 a D8 = `design/decisoes-F-002.md` a `-F-008.md`. Cada ID tem o prefixo da área (LN chefe, AB arena, PO Postura, FS fases e IA, AT ataques, FU Fúria, AN Amanhecer, FM fome, HD HUD, RE Resultado, CN cenário, L9 layout).

## 0. O que foi decidido (para vetar de relance)

### 0.A Decisões de design e divergências (para vetar)

Em negrito, o que diverge de documento aprovado. "Alternativa" é o que vale se você vetar. As oito que mais pedem seu olhar: PO3 (o que é "regenera 20/s por 5 s"), PO4 (o aparo não atordoa o chefe), PO1 (o que Facas e Círculo rendem), AT2 e AT3 (dano sem escala por minuto; a Luz Cega sem dano de acerto), AB4 (o véu soma 0,64), AN2 (Almas no chão creditadas) e FM2 (A Fome como dreno de HP).

| # | Decisão | Valor |
|---|---|---|
| LN1 | Corpo | Caixa alinhada aos eixos de 96 × 128 px (3 × 4 corpos; doc 06 §2.2 pede 4 corpos de altura, doc 13 §1.2 pede 128 a 192): meia-largura 48, meia-altura 64, circunraio 80. Alternativa: 160 × 192 (o teto do doc 13) |
| LN2 | HP | `hpMax = 6.500 × (100 + 4·nível)/100`, numerador inteiro (14.040 no nível 29; 6.760 no 1). O nível é o do estado no passo em que a arena se forma, com os pendentes (D5 §9; Q-10); fica fixo. Sem Maldição nem Ciclo (×1). O chefe cai no TETO como 1 vivo (Q-08 a) |
| LN3 | Movimento e solidez | `perseguir_reto` a 0,45 (1,08 px/passo), para a 96 px centro a centro; parado em Quebra, transição, Convocar e recuperação. O centro fica a ≤ 144 px do centro da arena (224 − circunraio 80): a borda contém o chefe (D2 §9). Para o jogador vale a S4 sem mudança, com a distância jogador–caixa no lugar da distância entre centros (não mexe na colisão jogador × inimigo); convocados são empurrados para fora da caixa e o chefe nunca é empurrado. Contato não fere (dano por ataque). Entra na lista de corpos grandes da D8 CR10 (consulta com 80 + 24). Alternativa: velocidade 0,55 |
| LN4 | Imunidades | Imune ao pulso do Círculo, ao Sal e à Postura Quebrada (`postura_quebrada: false` fica; D6 PQ5). Leva todo dano de arma. Alternativa: leva Sal (−50% de velocidade seria forte demais num chefe único) |
| LN5 | Morte | `CAUSA.lanterneiro` = 4: `mortes` + 1; as 200 Almas (Q-35) são creditadas direto, sem pickup, sem Cinza, sem baú (B §5.8 não dá baú). Dispara o Amanhecer (AN1) |
| AB1 | Arena do chefe | Forma-se em `relogio` = 72.000 (gancho AR8 da D8) com a regra de AR1, AR3 e AR4 (centro = jogador; 7 corpos × 32 px = 224 px, em pixels e não em células de 64 px; obstáculos tocados viram `ativo` 0; massa e médios com centro a < 224 morrem por `CAUSA.arena`); sem Coroados; a Fogueira da Hora III já se apagou. Sem RNG. Fica ativa até a morte do chefe |
| AB2 | Borda e nascimento | A borda é a de AR2 (prende o jogador, ADR-0002 §15 item 14) com `r` = 80 para o chefe. Ele nasce a 144 px do centro na direção 0 da tabela, com 120 passos de recuperação (2 s sem atacar) e `fase` 1. A névoa é só o anel visual da borda (alfa 0,5) |
| AB3 | Diretor | Sem spawn desde 20:00 (R2, AR5 da D8); só o chefe e os convocados dele povoam a arena |
| AB4 | Véu | O véu da D8 ES1 (alfa 0,40, de 19:00 a 20:00) soma com os 40% da fase 2 em produto: alfa total 1 − 0,6 × 0,6 = 0,64, subindo na transição da fase 2. Segue abaixo de telegrafos, projéteis, jogador e HUD. Só render. Alternativa: não soma (fica 0,40 e só a música muda) |
| AB5 | Luz | Luz do jogador (5 corpos) e dos convocados (3 corpos) não entram no MVP: o Q-28 já adia luz e névoa da Charneca para depois da F-010. `ilumina_raio_corpos` fica em `chefes.json` sem efeito. Alternativa: halo âmbar fixo de 96 px nos convocados |
| PO1 | Ganhos de Postura | `postura` Float32 de 0 a 100. Aparo de ataque do chefe +25; esquiva perfeita de golpe do chefe +10 (origem golpe e atacante do tipo 5; Q-15); acerto de arma com dano > 0: Espada (ida, volta, estocada) +2, onda e golpe da Lâmina +2, Faca +0,5 por faca que acerta, Círculo (tick e pulso) 0; pesada +5 (nenhuma no MVP). Soma no ponto único do acerto (D4), sem ler o anel de eventos. Alternativa: Faca +1 e Círculo +0,5 |
| PO2 | Quebra | Postura ≥ 100: `quebraPassos` = 180 (3 s). Ela fica em 100 até o fim e então zera (B). Na Quebra o chefe é atordoado (ataque cancelado, sem mover nem agir; esperas de Convocar e Explosão param), nenhum ganho soma, evento 41 e o 3º som (D6). Terminada, ele volta livre com 30 passos de espera |
| PO3 | "Regenera 20/s por 5 s" | Leitura: a Postura cai. Sem ganho nem acerto de arma por 60 passos, ela cai `fround(20/60)` por passo até 0 (no máximo 5 s) e para no primeiro ganho ou acerto. "Atingida" = qualquer acerto de arma com dano > 0, inclusive o tick (D4 §9). Alternativa: espera de 120 passos |
| PO4 | Aparo comum | +25, devolve stamina e arma o Contra-ataque (D6 AP6), mas **não atordoa; diverge do doc 02 §5.4 ("no atacante")** (B §11.3 deixa em aberto). O ataque aparado segue para a recuperação. Alternativa: atordoa 2 s (Postura Quebrada do Oco) |
| PO5 | Agarrar aparado | Quebra imediata (Postura vai a 100, PO2), sem os +25 |
| PO6 | Dano no chefe | `dano = comum × fator` em Float64, `hp = fround(hp − dano)`: fator 2 dentro da Quebra (com `FLAG.critico`) e 60/100 fora (Postura Firme −40%); exclusivos, em produto com o Contra-ataque ×2 da D6 (fora da Quebra o Contra rende ×1,2). O +50% do nv4 da Espada não vale na Quebra do chefe (estado diferente da Postura Quebrada do Oco). Estados do chefe entram por acerto, fora da tabela por (arma, nível). Alternativa: o nv4 vale (×3) |
| PO7 | Cruzar a fase | Um acerto que levaria o HP abaixo do limiar da fase seguinte o deixa exatamente nele (excedente descartado): nunca se pula uma fase; na fase 3 o limiar é 0 |
| FS1 | Fases e transição | Limiares `fround(hpMax × {60, 25}/100)` (8.424 e 3.510 no nível 29), `≤` dispara. Transição de 90 passos: o `relogio` não anda, o chefe não leva dano e não age (ataque cancelado, Quebra cancelada, Postura 0), o resto corre (jogador, convocados, zonas e cegueira em curso). Armas rodam; o acerto no chefe é consumido sem dano nem Postura (a faca some). Textos `E3.LANTERNEIRO.FASE2` e `FASE3`. Fase 2 começa com Convocar em 180 passos; a 3, com Explosão em 360 |
| FS2 | IA e herança | Sem RNG: ciclo fixo por fase em `chefeAtaqueSeq` (V Vara, B Bater, L Luz Cega, A Lanterna, G Agarrar): fase 1 `V B V L`; fase 2 `V A B A V L`; fase 3 `V G B A V L G B`. Cada fase herda os ataques das anteriores. O da vez só começa com o jogador dentro do gatilho (centro a centro: V 144, B 208, L 208, A 320, G 128); fora dele o chefe anda. Com 3 zonas de Lanterna ativas, A é pulada. Prioridade: Explosão > Convocar > ciclo. Alternativa: sorteio no fluxo `ia` |
| FS3 | Convocar | Fase ≥ 2: a cada 600 passos (10 s, como o Coroado), cast parado de 60 passos e recuperação de 60. Anel de 112 px em volta do centro do chefe: direção `(desl + ⌊i·256/10⌋) & 255` na tabela literal, `desl = (convocacoes × 37) & 255` (CR7); ponto fora da arena vai para dentro (≤ 207,5 do centro). `falta` = 10 e TETO como a CR7; evento 38. Alternativa: 900 passos |
| FS4 | Explosão | Fase 3, a cada 720 passos (12 s, B) depois do primeiro em 360 |
| AT1 | Máquina | Reusa `ataqueFase`/`ataqueTimer`/`ataqueId` da D8 e a camada de silhuetas: branco 100% com alfa crescente (D4 V6), vermelho `#ff2a2a` (AP10). Mira fixada no início do telegrafo. Eventos `telegrafo` e `golpeInimigo` com FORMA 11 a 16. Alcances medidos do centro do chefe até o centro do jogador, mais 16 de hitbox (como a CR2) |
| AT2 | Tabela de ataques | Ver §3. Dano bruto absoluto, sem escala por minuto (B §3.11 só escala o HP): Vara 55, Bater 70, Explosão 75, Agarrar 20% de `hpMax`, ticks de 1,3333 e 1,0. Sobre `hpMax` 214 (nível 29): 26%, 33% e 35% (o Oco Grande do minuto 19 dá 39). Alternativa: escala de 5% por minuto como os elites |
| AT3 | Luz Cega | Vermelha, sem dano de acerto: o cone que pega põe `cegoPassos` = 120, e a cada 10 passos um tick de 8/6 = 1,3333 (12 ticks, 16 no total). Efeito de tela: cores invertidas. Com "Flashes" desligado não inverte; fica a vinheta. Alternativa: 30 de dano de acerto além dos ticks |
| AT4 | Ticks | Cegueira e zona de Lanterna passam por `resolverAcertoNoJogador` com `ORIGEM_DO_DANO.efeito` = 4: os i-frames da esquiva evitam o tick, mas **não geram esquiva perfeita (estende D6 EP2, que vale para golpe e projétil)**, para ninguém ganhar Poder e faca em cima do fogo. Alternativa: o tick conta como esquiva perfeita (EP2 sem mudança) |
| AT5 | Lanterna e Explosão | Lanterna: zona de 64 px no ponto do jogador no início do telegrafo, ativa por 360 passos depois dele, tick de 1,0 a cada 10 (36 no total), no máximo 3 zonas. Explosão: anel de 32 a 192 px em 60 passos, uma só chance de acerto por anel (se os i-frames cobrem o primeiro contato o acerto é consumido como esquivado) |
| AT6 | Agarrar | Pegou: dano de 20% de `hpMax` por `danoAoJogador`, então a armadura e a Brasa Firme valem (DM6) (alternativa: líquido literal de 20%); `presoPassos` = 60: sem mover e sem esquivar; aparo e Frasco valem. Recuperação 90 deixa 30 passos livres |
| FU1 | Fúria | `n = ⌊(relogio − 90.000)/600⌋ + 1` para `relogio ≥ 90.000` (5 min de luta, que começa em 72.000; o relógio parado na transição não conta): todo dano bruto do chefe × `(100 + 5n)/100`, aditivo (B). Sem estado; evento 44 ao mudar `n`. `CENARIO.semFome` = 16 desliga A Fome nos testes. No jogo real o relógio com o chefe vivo nunca passa de 82.800: inalcançável (Q-05) |
| AN1 | Gatilho | Chefe com HP ≤ 0: `etapa` AMANHECER (5) e `fase` 4 (`FASE.amanhecer`); `faseSemArmas` já cobre as duas fases novas. Arena desfeita no passo da morte (obstáculos seguem inativos). Se o HP do jogador zera no mesmo passo, vale o Apagar (as 200 já entraram em N) |
| AN2 | Almas | As 200 do chefe entram antes do ×1,5 (Q-35). As Almas no chão são creditadas no passo da morte (nada se perde, como a AM2 da D7); Cinzas de XP, níveis pendentes e baús por fechar são descartados (como AG1). Na hora do FIM: Santuário = `⌊(3N + 1)/2⌋` (×1,5, meio para cima), no ramo `amanhecer` de `almasAoSantuario`. Alternativa: Almas no chão perdidas (como no Apagar) |
| AN3 | Brasa | Sempre 1 (B). Campo novo `brasas` no meta (versão 2, migração 1 → 2 com 0) e no Resultado; só contabilizada. A mancha antiga do meta fica (D7 MC3) |
| AN4 | 10 s de céu | `amanhecerPassos` 0 a 600, FIM(amanhecer) exatamente no passo 600. Sem armas, ataques, diretor e pickups; no 1º passo todo inimigo vivo é removido por `CAUSA.cinza` (sem Cinza, Alma ou `mortes`), projéteis e zonas somem. O jogador anda. Render: o véu cai a 0 em 600 passos, HUD escondido; o texto `A4.AMANHECER.01` fica 120 passos na cena depois do FIM e só então abre o Resultado |
| FM1 | A Fome (gatilho) | `relogio ≥ 82.800`, chefe vivo, `etapa` CHEFE e fora de transição: `etapa` A_FOME, `fase` 3 (`FASE.aFome`), `fomePassos` 0, evento 47. Frasco zerado sem evento e recusado; telegrafos, projéteis, zonas, cegueira e preso zerados; inimigos parados e em cinza, sem ferir. Morte do chefe no mesmo passo vale (Amanhecer). Jogador morto no mesmo passo: Apagar |
| FM2 | Dano de fome | **A Fome é um dreno, não uma entidade** (B §5.11: "é um Apagar"; **diverge do doc 02 §3**, que a descreve como ser aparável; Alternativa: a entidade aparável, fora do MVP, §7): a cada 10 passos, tick `k` = 0, 1, …, bruto `hpMax × (18 + k)/1800` (6%/s crescendo 2%/s por segundo), por `danoAoJogador` com `ORIGEM_DO_DANO.fome` = 5. Armadura e Brasa Firme valem; esquiva e aparo não (não passa por `resolver`). Sempre termina (cresce). Sem armadura e com Brasa Firme: morre no 52º tick (passo 520, 8,7 s). Alternativa: taxa constante de 10%/s |
| FM3 | Fim | `hp ≤ 0` → `encerrarVigilia(aFome)` no mesmo passo, sem APAGANDO (a tela é "A Fome desce.", `A4.A_FOME.01`). Mancha de 30% com a Hora "A Fome" (já existe). **`primeiroApagarFeito` liga também na causa a_fome (muda `aplicarFimDeVigilia` da D7 RS8)**, porque B §5.11 chama A Fome de Apagar. Alternativa: só no Apagar (a fome não garante as 300 Almas). A mancha pode ser recuperada durante a fome |
| HD1 | HUD 20:00 a 23:00 | O relógio m:ss segue; o rótulo da Hora some; a partir de 22:30 o relógio pisca em brasa (alfa 1 ↔ 0,5 a cada 30 passos; com "Flashes" desligado fica estático). Barras do chefe abaixo do HUD (B §5.12): HP e Postura, com `E1.LANTERNEIRO.NOME`; Postura em `#7aa2c9`, contorno brasa na Quebra; nunca branco nem `#ff2a2a`; cores medidas (ΔE ≥ 20) contra o fundo e entre si. O HUD só lê `chefe` |
| RE1 | Resultado | Ganha "Chefe mais longe" (`A7.RESULTADO.CHEFE`: nome e "Fase N", ou "Derrotado", ou "—" se a arena não chegou a formar; 3 ids novos) e "Brasas" (`A7.RESULTADO.BRASAS`: as ganhas nesta Vigília, 0 ou 1). O título vem do `causaDoFim`. Almas: líquidas no Apagar e na fome, ×1,5 no Amanhecer. Alternativa: Brasas em total |
| RE2 | Telemetria | Evento `chefe` ao fim (doc 10 §6): fase alcançada, duração (`relogio − 72.000`), quebras, resultado. `dano_recebido` com fontes `efeito` e `fome`, agregadas como o contato (TL1) |
| CN1 | Cenário `lanterneiro` | `?cenario=lanterneiro&seed=N`: `relogio_inicial_s` 1199,5 (a arena forma no passo 30), `nivel_inicial` 29 (campo novo do schema, XP 0), Espada, Facas e Círculo nv8, Elmo e Luvas nv5 (armadura 20), 3 Frascos, jogador mortal, diretor desligado, tutoriais vistos, ataques ligados, sem linha fixa (a máquina da D8 roda; é a exceção à regra de receitas presas em HORA). **O ADR-0002 §14 pede uma build de ≈ 2.000 de DPS; diverge: aqui vale a build acima e o DPS é só medido (§6).** Alternativa: calibrar a build ao DPS de 2.000 |

### 0.B Decisões técnicas (informativo)

| # | Decisão | Valor |
|---|---|---|
| L9 | Layout v9 | Bloco único depois do v8 (§1); hash muda uma vez, com regressão v8 |
| EV | Códigos | `EVENTO` 39 `chefeSurgiu`, 40 `chefeFase` (forma 1 início, 2 fim da transição), 41 `quebraDoChefe` (forma 1 acúmulo, 2 Agarrar), 42 `quebraAcabou`, 43 `efeitoNoJogador` (forma 1 cego, 2 preso, 3 queimando), 44 `furia`, 45 `chefeMorreu`, 46 `amanhecerIniciado`, 47 `fomeDesceu`. `FORMA` 11 `varaArco`, 12 `varaLinha`, 13 `luzCega`, 14 `lanternaZona`, 15 `explosaoAnel`, 16 `agarrar`. `CAUSA.lanterneiro` 4. `ORIGEM_DO_DANO` efeito 4, fome 5. `FASE` aFome 3, amanhecer 4. `etapa` AMANHECER 5. `CAUSA.aFome` não existe: nada morre de fome (a causa do FIM já é `CAUSA_DO_FIM.aFome`) |
| TC | Laço quente | Nenhum double nem u32 ≥ 2³⁰ entre chamadas: ticks e dano do chefe por `BRUTO[0]`; geometria em rascunho `Float64Array`; `fomePassos` < 2³⁰ |
| RNG | RNG | Nenhum fluxo novo: ciclos, anel e posições são tabelas |
| OP | Ordem do passo | Insere na da D7/D8: `moverJogador` (preso zera a intenção) → `moverHorda` (chefe) → armas (`acertar` aplica o fator, a Postura e o clamp) → `rodarAtaques` chama `rodarChefe` (esperas, máquina, zonas, cegueira, anel, preso, ticks por `resolverAcerto`, antes da regeneração) → contato → `verificarMorte` → fim de passo: início de transição, morte do chefe (AN1), 23:00 (FM1), nesta ordem. O `relogio` só anda com `transicaoPassos` = 0 (condição no início de `passoVivo`). `passoFora` ganha `rodarFome` e `rodarAmanhecer` (jogador anda, mancha roda) |
| GE | Acerto na caixa | Toda forma testa a caixa por 6 pontos (o mais próximo da origem, o centro e os 4 cantos): setor, retângulo e segmento pedem algum ponto dentro; círculo e tick pedem distância à caixa ≤ raio. A Faca, o setor da Espada, o retângulo da onda e o tick usam a mesma função |
| DB | Debug | `__GAME_DEBUG__.chefe` = `{ tipo, hp, hpMax, fase, postura, posturaMax, quebradaPassos, transicaoPassos, furia, ataque, x, y }` ou `null`; `etapa` e `fomePassos`/`amanhecerPassos` no objeto de estado |
| MD | Módulos | `src/logica/mundo/chefe.ts` (máquina, Postura, fases), `fome.ts`, `amanhecer.ts`; `chefes.json` ganha os números; sem arte (F-011) |

## 1. Layout v9 e determinismo (L9, RNG)

Depois do v8 (76.788 B a confirmar), alinhado a 4 bytes; **+80 B previstos** (a confirmar):
- Float32 ×10: `chefeHpMax`, `postura`, `miraX`, `miraY`, `zonaX[3]`, `zonaY[3]`. Uint32 ×2: `chefeAtaqueSeq`, `fomePassos`.
- Uint16 ×11: `chefeSlot` (0xFFFF = nenhum), `quebraPassos`, `posturaOciosa`, `transicaoPassos`, `convocaEsperaChefe`, `explosaoEspera`, `cegoPassos`, `amanhecerPassos`, `zonaTimer[3]`.
- Uint8 ×8: `chefeFase` (0 a 3), `chefeFaseMax`, `chefeMorto`, `presoPassos`, `explosaoAcertou`, `quebrasDoChefe`, 2 de folga. Seção `chefe` em `hashPorSecao`.
- `inimigos.ataqueId` ganha 1 a 6 para o tipo 5.

Migração do `vigilia`: layout 8 → 9 estende o buffer com o bloco novo em zero e `chefeSlot` = 0xFFFF (molde da D8 SV7); um teste.

**Regressão v8:** gravar, com o código de antes da F-009, os bytes [0, 76.788) aos passos 1.000 e 1.800 (seeds 1 e 424242, `horda_com_ataques`) e comparar com máscara só em `CAB.versao`: nada novo age antes de 20:00. Literais de hash regravados uma vez; referências que cruzam 20:00 com linha livre (`sim20`) mudam por semântica.

## 2. Chefe, Postura e fases (LN, PO, FS, FU)

- **Nascimento (AB1, AB2):** no passo em que a máquina da D8 põe `etapa` CHEFE: arena; slot tipo 5; `hpMax` pela LN2 (inteiro, depois `fround`); `chefeFase` = `chefeFaseMax` = 1; `ataqueFase` recuperação com `ataqueTimer` 120; `convocacoes` e `chefeAtaqueSeq` seguem; evento 39.
- **Acerto (PO1, PO6, PO7), em `acertar`:** sem `chefeSlot` o código não muda. Com transição: consome e sai. Senão: `dano` = `ACERTO[0]` × fator (200 na Quebra com `FLAG.critico`, senão 60; o `pqFator` do Oco não entra); `hp = max(fround(hp − dano), limiar da próxima fase)`; Postura soma o ganho da arma (fora da Quebra), `posturaOciosa` = 0; se `postura ≥ 100`, Quebra. `hp ≤ 0` marca `chefeMorto` e chama `matarInimigo(CAUSA.lanterneiro)`.
- **Aparo e esquiva (PO1, PO4, PO5):** `aparar` e a esquiva perfeita já recebem o slot e o tipo: com tipo 5 somam 25 e 10 (esquiva só com origem golpe); o Agarrar aparado vai direto à Quebra. `ameacasAparaveis` conta os telegrafos brancos do chefe (V, B, G).
- **Relógios do chefe (a cada passo de luta, nesta ordem):** `transicaoPassos` (ao zerar, evento 40 forma 2 e fase seguinte); `quebraPassos` (ao zerar, Postura 0, evento 42); `posturaOciosa` (satura em 60; ≥ 60 e `postura > 0`: `postura = fround(max(0, postura − fround(20/60)))`); `convocaEsperaChefe` e `explosaoEspera` (param na Quebra, na transição e no recuo); `cegoPassos`, `presoPassos`, `zonaTimer`.
- **Fase (FS1):** depois dos relógios, se `chefeFase < 3` e `hp ≤ limiar[chefeFase]`: `transicaoPassos` = 90, Postura e Quebra a 0, ataque cancelado (`ataqueFase` 0), `chefeFase` += 1, `chefeFaseMax` = o mesmo, evento 40 forma 1. Em cada fase as esperas iniciam como na FS1.
- **Máquina (FS2, AT1):** livre → escolhe pela prioridade (Explosão, Convocar, ciclo) → telegrafo → golpe → recuperação. `chefeAtaqueSeq` sobe ao fim do telegrafo do ciclo (periódicos não sobem).
- **Fúria (FU1):** `fatorFuria = (100 + 5n)/100` em Float32, aplicado a `BRUTO[0]` antes de `danoAoJogador` em todo dano do chefe.

## 3. Ataques (AT1 a AT6)

| Ataque | Cor e telegrafo | Forma (do centro do chefe) | Efeito | Recuperação |
|---|---|---|---|---|
| Vara Horizontal | branco, 42 | semicírculo (`dot(mira, v) ≥ 0`), alcance 128 + 16 | 55 | 72 |
| Bater a Vara | branco, 36 | retângulo de 192 de comprimento na mira, meia-largura 24 + 16 | 70 | 90 |
| Luz Cega | vermelho, 60 | cone de 60° (cos 0,866), alcance 192 + 16 | `cegoPassos` 120; tick 1,3333 por 10 passos | 90 |
| Lanterna Arremessada | vermelho, 60 | círculo de 64 no ponto do jogador no início; ativo 360 passos depois | tick 1,0 por 10 passos | 72 |
| Explosão de Luz | vermelho, 60 | anel de 32 a 192 em 60 passos, meia-espessura 12 + 16 | 75, uma vez por anel | 90 |
| Agarrar | branco, 48 | distância jogador–caixa ≤ 64 + 16 | 20% de `hpMax` (AT6), preso 60 | 90 |
| Convocar | sem telegrafo, cast 60 | anel de 112 px (FS3) | 10 Ocos | 60 |

Resolução do golpe: no fim do telegrafo, `resolverAcertoNoJogador` (origem golpe, aparo > esquiva > dano); a Luz Cega, a Explosão e o Agarrar testam o desfecho uma vez. Ticks por AT4. Todo dano multiplicado pela Fúria.

## 4. Amanhecer e A Fome (AN, FM)

- **Amanhecer (`rodarAmanhecer`):** `amanhecerPassos` += 1; no passo 1 remove inimigos (`CAUSA.cinza`), projéteis e zonas, credita as Almas do chão e descarta pendentes; no passo 600 chama `encerrarVigilia(amanhecer)`. `almasAoSantuario(amanhecer, N)` = `⌊(3N + 1)/2⌋`; `brasas` = 1 no `ResultadoDaVigilia`; `aplicarFimDeVigilia` soma ao `meta.brasas`.
- **A Fome (`rodarFome`):** `fomePassos` += 1; se `fomePassos % 10 == 0`: `k = fomePassos/10 − 1`, `BRUTO[0] = hpMax × (18 + k)/1800`, `danoAoJogador(origem fome)`; `hp ≤ 0` → `encerrarVigilia(aFome)`. Sem Poder, regeneração de stamina e Frasco (recusado). O jogador anda; `rodarMancha` roda.
- **Save:** `fase` 3 e 4 entram no `vigilia` normalmente (SV1 da D8); nenhuma Fogueira existe depois de 20:00, então não há retomada nelas, e uma retomada de `fase` ≠ 0 é recusada como corrompida.

## Pendências resolvidas

Numeração = ordem de `pendencias_antes_de_comecar`. 1: LN1 a LN5, AT1 a AT6, FS2, FS3, PO3, PO1 (Postura das outras armas). 2: AB5, FS3, HD1. 3 (D2 §9): LN1, LN3, AB2. 4 (D3 §9): LN3 (lista de grandes), LN1 (camada acima da horda e cor `#5a4a6b`, sem `#ff2a2a` nem brasa; teste de cores estendido). 5: LN4, GE. 6: PO1, GE. 7 e 8: PO6. 9: FS1, AN4. 10: LN2, PO1 (onda). 11: PO1. 12: PO4, PO5. 13: PO6. 14: AT1, AT5. 15: PO2 (som). 16: FM2, FM3. 17: FM1, AN4 (mesma `faseSemArmas`). 18: RE1, FM3. 19: §6 (`u9.log`). Nada foi empurrado para outra feature, salvo o que a §7 diz.

## Critérios (o "como" para o `feature_list.json`)

- **F-009.1:** vitest. Chefe na fase 1; 4 aparos de Vara (branca): `postura` 25, 50, 75, 100; no 4º, `quebraPassos` = 180, evento 41, o chefe não age por 180 passos e a `postura` fica 100; no passo 181 vale 0. O aparo não atordoa (sem `quebraPassos` antes do 4º). Sem ganho por 60 passos, `postura` 40 → 0 em 120 passos (± 0,01 por passo).
- **F-009.2:** vitest. Acerto de 100 (rascunho) fora da Quebra tira 60; na Quebra, 200 com `FLAG.critico`; Contra-ataque fora da Quebra tira 120; o nv4 da Espada não muda a Quebra; em transição, 0.
- **F-009.3:** vitest. `hpMax` 14.040. Acerto de 7.000 na fase 1: HP exatamente 8.424, `transicaoPassos` 90; por 90 passos o `relogio` não muda, o `passo` anda 90, o HP não muda com acertos e o chefe não ataca; no passo 91 `chefeFase` 2. Acerto de 5.000: HP 3.510 e fase 3. Na fase 3 o acerto letal chega a 0.
- **F-009.4:** vitest. `relogio` 82.799 e chefe vivo: no passo seguinte `etapa` A_FOME, `fase` 3, `faseSemArmas` verdadeiro, armas paradas e facas removidas, `mortes` e Almas inalteradas, inimigos parados. Sem armadura, com Brasa Firme: o 1º tick no passo 10 é `hpMax × 18/1800 × 0,8`; o HP zera no 52º tick (passo 520) e `fase` FIM, `causaDoFim` a_fome, mancha = ⌊(3N + 5)/10⌋, Hora "A Fome". Com A = 60 também termina (< 1.500 passos).
- **F-009.5:** Playwright 390 × 844 (§5).
- **F-009.6:** vitest com `CENARIO.semFome`. `relogio` 89.999: dano da Vara 55; 90.000: 57,75 (n = 1); 90.599: 57,75; 90.600: 60,5; 91.200: 63,25. Evento 44 em cada mudança. Sem a flag, o relógio com o chefe vivo para em 82.800 (A_FOME).
- **F-009.7:** vitest. N = 1.000 antes; chefe morre: N = 1.200 (+200 e Alma de 3 no chão: 1.203); em `amanhecerPassos` 600 o FIM, Santuário = 1.805 (⌊3.610/2⌋); N ímpar 1.201 dá 1.802; `brasas` 1 no Resultado e meta 0 → 1; inimigos removidos sem Cinza, Alma ou `mortes`; armas e pickups parados; mancha antiga do meta intacta; relógio parado.
- **F-009.8:** vitest. Nível 29 → 14.040; nível 1 → 6.760; nível 29 com 1 pendente → 14.300; muda depois do surgimento: não muda o `hpMax`.
- **F-009.9:** vitest. No cenário, passo 30: obstáculos com `ativo` = 0 exatamente os de `d ≤ 224 + r_o` (contagem independente), massa e médios a < 224 mortos por `CAUSA.arena` sem `mortes`, `spawns` constante por 600 passos, centro da arena = posição do jogador, chefe a 144,0 ± 0,01 px na direção 0, `chefeSlot` válido, Fogueira apagada.
- **F-009.10:** vitest. Jogador empurrando a borda por 120 passos em 8 direções fica a ≤ 208 px do centro; os 4 cantos da caixa ficam a ≤ 224 px com o chefe perseguindo; inimigo a 230 px não entra.
- **F-009.11:** vitest. Esquiva perfeita contra a Vara: `postura` + 10; contra o contato ou o golpe de um Oco convocado: + 0; contra o tick da Lanterna: nenhum Poder, nenhuma faca e + 0 (AT4).
- **F-009.12 (novo, ataques):** vitest, um caso por linha da §3: Vara acerta a 144 px de frente e não a 144,1 nem de costas; Bater a 192 + 16 de comprimento e a ± 40 de largura; Luz Cega a 30° e não a 31°; Lanterna: 12 ticks de 1,0 em 120 passos dentro, 0 fora; Explosão: o anel acerta uma só vez e a esquiva consome; Agarrar: 20% de `hpMax`, `presoPassos` 60 sem mover e sem esquivar, aparado → Quebra; Convocar: 10 Ocos a 112 ± 0,01 px do centro, 5 com 295 vivos (TETO 300).
- **F-009.13 (novo, ganhos):** vitest. Por acerto: Espada + 2 (ida, volta e estocada), onda + 2, Faca + 0,5, Círculo + 0 que zera `posturaOciosa`; ciclo de 1.000 passos reproduzível pelo hash.
- **F-009.14 (novo, regressão e alocação):** regressão v8 (§1); E7 (≤ 16 B por passo) na luta, na transição, no Amanhecer e na fome; replay do cenário reproduz o hash.
- **F-009.15 (novo, Resultado):** vitest e DOM. Resultado com "Chefe mais longe" = nome + "Fase 2" (morto na fase 2), "Derrotado" (Amanhecer) ou "—" (Apagar antes de 20:00); "Brasas" 0 ou 1; títulos `A4.A_FOME.01` e `A4.AMANHECER.01`; `brasas` do meta sobe uma vez só (`fimCreditado`); meta v1 migra com `brasas` 0.

## 5. Critério Playwright (F-009.5) e cenário

`?cenario=lanterneiro&seed=424242&debug=1&tutorial=0`, 390 × 844, build de debug. Script em `tests/e2e/f009-lanterneiro.spec.ts`, com a mesma API de `entrada.injetar` e `avancar` das F-006/F-007:
1. `avancar(60)`: `chefe` ≠ `null`, `chefe.fase` 1, `chefe.hpMax` 14.040, `etapa` = CHEFE.
2. Por 3.600 passos (60 s), em blocos de 300: joystick para a direita nos 300 primeiros; depois toque de aparo a cada 150 passos e esquiva em passos fixos (passos 900, 1.800, 2.700). Lê `chefe.postura`, `chefe.hp`, `chefe.fase` e `hash()` ao fim de cada bloco.
3. Asserts: `postura` entre 0 e 100 e com ≥ 3 valores distintos nas 12 leituras; `hp` menor que o inicial; `quebradaPassos` > 0 em ao menos uma leitura ou `postura` > 0 em ≥ 6; `etapa` ≠ A_FOME (o minuto é 20:00 a 21:00); nenhuma exceção no console.
4. Determinismo: a mesma seed e o mesmo script dão o mesmo `hash()` em todas as leituras (2 rodadas).
5. Evidências com o mesmo script: `luta.webm` dos 30 s do meio; `chefe-390x844.png` com as barras visíveis.
Pendente de aparelho: nada bloqueia aqui.

## 6. Medida do DPS e Q-21

O `sim` ganha o chefe e um bot de 20:00 a 23:00 (anda, apara a cada telegrafo branco e esquiva do vermelho). `u9.log` registra, sem gate nem decisão: tempo até a morte do chefe (alvo do doc 06: 2 a 3 min, mas a janela é de 3 min), quebras por luta, Almas por Vigília contra Q-21 (≈ 400 / 1.100 / 1.600, com as 200 e o ×1,5) e a taxa de derrota por fome. Se o DPS da build não matar o chefe em 180 s, é balanceamento (§7), não bloqueio.

## 7. Recomendações para as features seguintes (não decididas aqui)

- **F-010:** Brasas na barra do Santuário (`meta.brasas`) e IndexedDB com migração dos campos novos; calibrar no iPhone o véu de 0,64, a cegueira (inversão e vinheta) e a leitura do vermelho sobre o fundo; o texto "Amanhecer." e o som; luz e névoa da Charneca (Q-28); o balão do primeiro Apagar também vale para A Fome (FM3).
- **F-011:** arte do Lanterneiro (caixa de 96 × 128), das 7 lanternas, do anel da névoa e do cinza; fim dos gráficos provisórios dos telegrafos.
- **Balanceamento (depois da F-010):** ganhos da Postura (PO1, PO3), dano dos ataques (AT2), duração da luta contra os 180 s, taxa da fome (FM2) e a build do cenário.
- **Fora do MVP:** A Fome como entidade aparável (doc 02 §3) e a União secreta; a Fúria é testada e inalcançável (Q-05).

## O que muda em dados e documentos

- `chefes.json` e `chefe.schema.json`: `largura_px` 96, `altura_px` 128, `velocidade` 0,45, danos, alcances, telegrafos, `convoca.intervalo_s` 10, `anel_px` 112, `postura.regen_espera_passos` 60, `postura.ganho_faca` 0,5; saem os `pendentes` e as `pendencias`; `combate.json` e schema: blocos `chefe` (recuperações, gatilhos), `fome` (`tick_passos` 10, `base` 18, `divisor` 1800), `amanhecer.duracao_passos` 600, `furia.inicio_relogio` 90.000.
- `cenario.schema.json`: `nivel_inicial`; novo `src/dados/cenarios/lanterneiro.json`; `CENARIO.semFome` = 16.
- `pt-BR.json`: `A7.RESULTADO.CHEFE_FASE`, `A7.RESULTADO.CHEFE_DERROTADO`, `A7.RESULTADO.CHEFE_NENHUM`; os demais ids já existem.
- `meta.ts`: `brasas` e versão 2 com migração; `mancha.ts`: ramo amanhecer; `estado.ts`: v9, `FASE`, `etapa`, `CAUSA`, `ORIGEM_DO_DANO`.
- Documentos: ADR-0002 §9 (A_FOME dura até o HP zerar; AMANHECER 600 passos) e §14 (cenário `lanterneiro` com a build de CN1); brief §11.3 F-009 (números fechados); `progress.md`.
- Divergências a registrar: do doc 02 §3 (FM2), de D6 EP2 (AT4) e de D7 RS8 (FM3); nenhuma divergência da D8.

## Revisão

- R9-1 (marcação, ~14 linhas): negrito usado como ênfase em LN1, LN3, AB1, AB4, AB5, PO3, PO6, FS1, FS2, FS3, AT2, AT6, AN2 e AN3; retirado. Ficam em negrito só PO4, AT4, FM2, FM3 e CN1.
- R9-2 (marcação, PO4): ganhou "diverge do doc 02 §5.4" explícito; AT4, FM2 e FM3 ganharam "Alternativa".
- R9-3 (divergência não marcada, CN1): dispensar a build de ≈ 2.000 de DPS do ADR-0002 §14 estava em texto corrido; ficou em negrito, com Alternativa.
- R9-4 (referência quebrada): "CN3" não existe em 0.A; trocado por "§6" (título da §6 também).
- R9-5 (layout): faltava a migração do `vigilia` 8 → 9 exigida pela D8 SV7; linha acrescentada na §1.
- R9-6 (contas) conferidas e certas: +80 B (76.868 no v9), 14.040/6.760/14.300, limiares 8.424/3.510, 52º tick (passo 520), Fúria 57,75/60,5/63,25, véu 0,64, 1.805/1.802.
- R9-7 (coerência com a D8): AR8 e F-008.4g (FIM imediato às 23:00) valem só até a F-009; F-009.4 os substitui. Não é divergência nova (a D8 já recomenda a troca).

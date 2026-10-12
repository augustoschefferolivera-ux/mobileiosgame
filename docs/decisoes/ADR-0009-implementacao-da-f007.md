# ADR-0009 — Decisões de implementação da F-007 (HP, Frascos, armadura, Apagar e Cinzas Perdidas)

- **Status:** registrado na Sessão 7 (2026-10-12). São as decisões técnicas tomadas ao implementar `design/decisoes-F-007.md` (aqui, **D7**), aprovada pelo usuário sem vetos. Este ADR também registra as divergências da D7, do ADR-0002 e dos documentos que a F-007 cria (§9), as medidas e calibrações dos testes (§8) e o espaço do crítico independente (§10).
- **Fontes:** B §3.3, §3.12 e §4 (F-007); D7; D3 a D6; ADR-0002 §3, §9 e §14; ADR-0005 §2; ADR-0006 §2; ADR-0007 §8; ADR-0008.

## 1. Estado v7 e determinismo

- **Layout (`VERSAO_LAYOUT` 7, 74.680 bytes):** um bloco de 44 bytes depois dos 74.636 do v6 (`BYTES_DO_LAYOUT_6`), que ficam no mesmo lugar:
  - 5 Float32: `frascoPorPasso`, `frascoRestante`, `danoRecebido`, `manchaX`, `manchaY`;
  - 4 Uint32: `aparos`, `esquivasPerfeitas`, `frascosUsados`, `manchaAlmas`;
  - 6 Uint8, com 2 de folga: `fase`, `causaDoFim`, `apagandoPassos`, `frascoCargas`, `frascoPasso`, `manchaAtiva`.
  - Seção nova `vigilia` em `hashPorSecao`; `combate` agora termina em `BYTES_DO_LAYOUT_6`. Sem `almasDescartadas` (AM2 creditou direto) e sem `apagandoPasso` do B1.
- **Hashes de referência** (passo 1.000, sem ataques):

| Referência | F-006 (v6) | F-007 |
|---|---|---|
| `determinismo.test.ts`, seed 1 | `c052c6c9` | `a5721bcc` |
| `determinismo.test.ts`, seed 424242 | `6ddd6d39` | `88a3a4f0` |

  A seed 1 passou por três valores (`2175475d` com o layout v7 sozinho; `a5721bcc` com o dano líquido da 3b; igual na 3c, porque ela ainda não soltou Alma até o passo 1.000). A seed 424242 foi `de4a60fd` → `8b2c35ab` (3b) → `88a3a4f0` (3c, as Almas soltas movem o fluxo `drops`). Os fatos da F-003 no determinismo usam dados sem Brasa Firme (HP 138/135/102 intactos). Nada mudou na 3d: os dois literais ficaram como estavam.
- **Regressão v6** (`tests/logica/combate/regressao-v6.test.ts`): gravada **antes** de qualquer mudança de código (commit `531c656`, com o código de `e0d0f68`, a F-006). Roda com `semCinzas | jogadorInvulneravel` (sem Cinza nem Alma, sem dano), mascara só o HP e `mortes` e usa esquiva e aparo por roteiro. Sem isso a Alma (fluxo `drops`) e a armadura/Brasa Firme quebrariam a igualdade com o v6 depois da 3c. As regressões v3, v4 e v5 passaram a mascarar a palavra do HP (literais regravados com o código de `56304b2`, o último com HP bruto, sobre os mesmos trechos do buffer); v4 e v5 rodam com `semAlmas(D)` (valor de Alma 0).
- **Ordem do passo v7** (estende a v6 do ADR-0008 §1): **0 a 9** como na v6 e, em volta delas, `passo.ts` ganhou um despachante. `passoVivo` é o corpo antigo, intocado; `passo` despacha por fase (VIVA, APAGANDO, FIM), trata o Abandonar (bit 16), a mancha e a morte; `avancar` repete as mesmas linhas em linha. Dentro do passo vivo entram: `comandosDoFrasco` (em `rodarTimersEComandos`, depois da esquiva e antes da regeneração), `rodarFrasco` (cura, logo depois de `moverJogador` e antes de `moverHorda`) e o dano líquido (§2). A mancha (`rodarMancha`) e a morte (`hp ≤ 0`) rodam **depois** do passo vivo (§9, divergência 4).
- **RNG:** nenhum fluxo novo. O drop de Alma usa o fluxo `drops` existente.
- **Regra do laço quente:** vale para tudo o que é novo: nenhum double nem u32 ≥ 2³⁰ atravessa chamada fora de linha, também em funções frias; `Float64Array` de rascunho (`BRUTO`, `LIQUIDO`, `REDUCAO`; `PONTO_LIVRE` com x, y e a margem de `pontoLivreMaisProximo`, que na Etapa 3 recebia doubles e escrevia num objeto `{x, y}`, ajustado pelo crítico) e contas em linha. Os saldos de Almas (`almas`, `manchaAlmas`, `valor` do pickup) ficam < 2³⁰ (AM7), limitados em `creditarAlmas`.

## 2. Dano, armadura, Brasa Firme e Frasco

- **Dados:** `combate.json` ganhou `frasco.cancelar_segurando_passos`, `apagar`, `mancha` e `telemetria`; `criarTabelaDeCombate` recebe o Vigilante inteiro (antes só `staminaMax`) e compila, junto com o Frasco e a Brasa Firme de `vigilantes.json`, tudo em `TabelaDeCombate`. As pendências F-007 do Aldric saíram de `vigilantes.json`. `brasaFirmeFator` (1 − 20/100) e `brasaFirmeLimiar` (`staminaMax` × 50/100) são tabelados na carga.
- **Dano líquido:** `danoAoJogador(e, dados, origem)` ganhou `dados`. O bruto fica em `BRUTO[0]` (o evento `golpeInimigo` do projétil lê `BRUTO[0]` depois do resolver e o F-003.5 mede o bruto); o líquido vai a `LIQUIDO[0]` e ao evento `danoAoJogador`. `reducaoDeArmadura(a)` é `void`: escreve `REDUCAO[0]` (redução, teto 0,75) e `REDUCAO[1]` (multiplicador 20/(A+20), piso 0,25) e lança em A negativa ou NaN; roda no caminho quente. A conta é `fround(bruto × mult)` e depois `fround(d × 0,8)` (DM1, multiplicativo).
- **Brasa Firme:** `stamina > limiar`, estrito. A regeneração de stamina continua no fim dos comandos do jogador (início do passo), não depois do dano: a Brasa Firme lê a stamina já regenerada do passo (a D7 DM2 dizia "antes da regeneração"). Mudar a ordem mudaria a regeneração de todos os replays, e a diferença só aparece no limiar exato de 50 (§9, divergência 2).
- **Frasco** (`mundo/frasco.ts`): bit 4 inicia e bit 8 cancela. Bloqueios: `esquivaPasso > 0` ou `aparoJanela > 0` (aparo e esquiva no mesmo passo vencem, porque já gravaram o estado); aparo negado por stamina não bloqueia. Bit 8 sem cura em curso é ignorado e descarta o 4 do mesmo passo. A espera de regeneração de 120 é decrementada no próprio passo do toque (no passo k vale 120 − k): sem gasto a regeneração volta no passo 121 (FR5); com um gasto no passo 100 volta no 131, e não no 130 que a D7 contava (o passo do gasto não decrementa a espera, ST2).
- **Interrupção:** em `danoAoJogador`, limiar `fround(hpMax × 15/100)` sobre o dano **líquido**, `>` estrito, com o `hpMax` do momento; os eventos `frascoInterrompido` e `frascoCancelado` levam em `floats[3]` e `[2]` os passos de cura já aplicados (`frascoPasso − 1`).
- **Eventos novos (22 a 28),** floats definidos em `eventos.ts` (implementação, não D7): `frascoIniciado` (x, y, hp antes, hpMax), `frascoInterrompido` (x, y, dano líquido, passo da cura), `frascoCancelado` (x, y, passo da cura), `apagou` (x, y, Almas), `fimDaVigilia` (x, y, Almas na mancha, Almas ao Santuário; a causa vai na forma), `manchaRecuperada` (x, y, Almas), `danoAoJogador` (x, y, dano líquido, hp depois). Códigos só crescem no fim; `ACOES_PERMITIDAS` ganhou 4, 8 e 16.

## 3. Apagar, Almas, mancha e Abandonar

- **Morte:** `hp ≤ 0`, checada em linha no `avancar`. APAGANDO: `CAB.passo` anda (os eventos precisam dele) e `relogio` não; só `moverHorda` roda; os projéteis são liberados no 1º passo; FIM no passo `apagar.duracao_passos` (30). `faseSemArmas(fase)` é `fase ≠ VIVA` e a A Fome da F-009 a reaproveita. A fila de modais e a oferta pendente são descartadas no passo da morte; quem chama `passoVivo` direto não morre.
- **`encerrarVigilia(e, dados, causa)`:** o Apagar e A Fome dividem 30% (`⌊(30N + 50)/100⌋`, o mesmo MC1); o Abandonar leva `⌊N/2⌋` e não cria mancha; o Amanhecer leva tudo (o "ganho normal" da F-009 pode mudar isso). Em FIM é no-op (crédito uma vez).
- **`resultadoDaVigilia(e, dados)`** é pura do estado em FIM (Almas, relógio e posição ficam congelados). A mancha nova usa a posição final do jogador no ponto livre; "recuperou a mancha do meta" é `manchaAtiva = 0` e `manchaAlmas > 0`, sem campo novo. `danoRecebido` é arredondado ao mais próximo.
- **Ponto livre (MC4):** empurra radialmente para `r + 16 + 0,5 px` e repete até 8 passadas (uma zona pode empurrar para a vizinha). Não é o ponto livre ótimo, é o mais próximo pela normal. Teste em grade de 141 × 141 pontos do mapa (19.881, no lugar dos 20.000 sorteados): nenhum resultado numa zona.
- **Almas:** `TiposDeInimigo.almasValor` e `almasChance` vêm de `inimigos.json`; chance ≥ 1 não sorteia; senão 1 sorteio do fluxo `drops`. O convertido faz 10 sorteios, com o valor e a chance do Oco, e solta um pickup com a soma. Pool cheio: junta na Alma mais próxima; sem Alma, credita direto em `almas`. O baú cede a Cinza mais próxima e, sem Cinza, a Alma mais próxima (junta na vizinha ou credita). Coleta no mesmo laço da Cinza (Ímã 48, voo 8, coleta ≤ 16).
- **Contadores (PE2):** `aparos` (só aparo bem-sucedido) e `esquivasPerfeitas` (1 por esquiva). `mortes` soma `MASSA_POR_CONVERTIDO` (10) para o convertido (RS4; o teste M3 da F-004 virou 10).
- **Abandonar:** bit 16 da ação; a confirmação são 2 toques no mesmo botão (`sim.pausa.abandonarArmado`, desarmado por Continuar, outro botão ou fechar). A pausa é inerte fora da fase VIVA.
- **Meta (SV1 a SV9):** `src/logica/save/meta.ts` (puro) e `src/plataforma/armazenamento.ts`. Soma = FNV-1a em duas metades de 16 bits sobre o JSON do corpo (cada unidade UTF-16 entra como 2 bytes), em string hex de 8 caracteres; a leitura nunca lança (versão 0 ou desconhecida, soma errada ou campo fora do tipo viram os padrões). `seq` cresce em todo `proximo` (fim de Vigília, opção, tutorial novo; tutorial repetido não muda o meta). `vigiliasConcluidas` conta toda Vigília encerrada, o Abandonar também (a D7 não diz). Amanhecer e Abandonar mantêm a mancha antiga a menos que `recuperouMancha`. O teste "0xFFFFFFFF ida e volta" ficou como "a soma sempre sai com 8 caracteres hex e o FNV de duas metades bate com o de 32 bits" (não dá para forçar um meta com soma `ffffffff`).
- **Boot (SV5):** `ctx.meta = { armazenamento, atual }`, lido uma vez em `jogo.ts`; as opções começam do meta; a Vigília usa `meta.tutoriais` só sem `?cenario`; `?tutorial=0` e `?visto=` vencem e não gravam (tampouco `?cenario`); a mancha do meta vai em `ParametrosDaVigilia.mancha`; `?almas=N` vira `almasIniciais` (fora do meta).

## 4. Telemetria

- Leitor em `TelemetriaDeCombate` (cena). `dano_recebido` fica com os 3 campos do doc 10 §6 (`fonte`, `minuto`, `hp_restante`), então o contato agregado não leva a soma (a soma está em `danoRecebido`). Teto de 128 por fonte no `RegistroDeTelemetria` (`TETO_POR_FONTE`; sai a linha mais antiga da mesma fonte) para `dano_recebido` por fonte, `esquiva`, `aparo` e `frasco`. A janela de 300 passos do contato abre no 1º contato e fecha no quadro em que `passoAtual − início ≥ 300` ou quando o HP zera. As constantes duplicam `combate.json` e um teste as confere.
- No fim, `Vigilia.verificarFase` registra a telemetria `apagar` (causa `apagar` ou `abandonar`). `cinzas_perdidas` fica para a F-010: falta o contador de Vigílias.

## 5. Apresentação: HUD, pausa, Resultado e mundo

- **Barra e número do HP:** número em `Text` (id `A5.HUD.HP`, "{hp}", 12 pt logo sob a barra, `numeroAbaixo` 0), reescrito só quando `ceil(hp)` muda, no lugar dos glifos da N4 (os dígitos da N4 moram no atlas do mundo, não no Hud). Retardo medido em passos da simulação (`CAB.passo`, `RetardoDeHp`, exato em passos, para junto com a pausa). Cor do retardo `#9e3a52` (CIE76 ΔE 22,2 contra `#c8324b`, 53,1 contra `#1a1f2b`; razão com o osso 4,86); cura em `#ffd699`. `#c8324b` sozinha não passa (ΔE 0 contra si). Vinheta: bordas em 6 degraus de alfa na cor do retardo, 0,35 por 6 quadros, no mesmo limite de 3 por segundo do flash (`ControladorDeFlash` ganhou duração e alfa por construtor), criada preguiçosamente.
- **HUD de Almas (AM5, 3d):** `Text` (id `A5.HUD.ALMAS`, "{almas} Almas") à esquerda, `topo + 116` e 14 pt; reescrito só quando o saldo muda; `formatarAlmas` põe "." de milhar (0, 9, 999, "1.000", "1.240", "12.345"); fica **escondido** na pausa e fora da fase VIVA (AM5: "as Almas não aparecem na pausa"). A D7 mostrava só "1.240"; o texto já existia no `pt-BR.json` com a palavra (divergência 9).
- **Botão do Frasco:** 72 pt, 16 pt acima do Aparo, centrado nele; anel de 64 pt, rótulo `A5.HUD.FRASCO` (Text criado uma vez) e uma marca de brasa por carga em `Graphics`; redesenho só quando muda o estado ou as cargas. Segurar: 18 passos = 300 ms do relógio do `TouchEvent` (`18 × 1000/60`), medido no `traduzir` (não depende do passo); `tradutor.frascoEmCura` é escrito pela cena antes de traduzir.
- **Pausa:** o Abandonar é o 5º alvo de `alvosDaTelaDePausa` (16 pt acima de Som e Flashes: y 458 em 844). O aviso (2 linhas) fica a 18 pt do botão (y 404) e as estatísticas em 322 (3 linhas) ou uma linha rotulada ("12 mortes · 340 dano · 3 aparos") quando o fim da build desenhada não deixa 3 (a D7 dizia ≈ 318). Pelo crítico (A1): a Hud some enquanto a pausa está aberta (`Vigilia.abrirPausa`/`fecharPausa` chamam `sys.setVisible` da cena Hud; antes a build caía sobre a barra de HP e os slots sob o véu de 60%), as estatísticas ficam num painel opaco `cinzaFrio` (260 pt, respiro de 8 pt, desenhado com os botões) e o rótulo é "Mortes causadas" (o mesmo do Resultado).
- **Risco "667 pt com build cheia" (conferido na 3d):** o canvas é fixo em 390 × 844 pt com FIT, então "667 pt" é só uma área segura (insets), não uma altura lógica menor. Com 11 linhas, a build acaba em `topo + 56 + 11 × 18` (274 com topo 20; 313 com topo 59) e as estatísticas começam em 356 (baixo 0) ou 322 (baixo 34), sempre abaixo. A conferência da 3d, que dizia "não há sobreposição", só media texto contra texto: o crítico abriu `pausa-390x844.png` e viu a build sobre o HUD e as estatísticas sobre o jogador e o anel (A1, corrigido como acima; `pausa-390x844.png` regerada e conferida). Um teste novo (`alvos.test.ts`) cobre cinco áreas seguras (844, 812, 736, 667 e 59/34) com a build cheia: estatísticas abaixo da build, aviso abaixo das estatísticas e botão abaixo do aviso. O que a medida não alcança (nome longo quebrando linha, fonte do aparelho) fica no item 21 do roteiro do iPhone.
- **Resultado:** `Resultado.ts` (cena), `linhasDoResultado.ts` e a linha da mancha (lilás). Em APAGANDO lança só o véu e o título (fade 200 ms); em FIM calcula `resultadoDaVigilia`, credita o meta uma vez (`fimCreditado`) e passa o tradutor ao modo `resultado`. Voltar leva à cena Acender; Repetir faz `ctx.seed = sortearSeed()` e `scene.restart()`. O prompt do tutorial (`promptEmTela`) devolve −1 fora da fase VIVA (3d), para não aparecer sob o véu.
- **Mundo:** a mancha é um anel de brasa pulsando (pelo passo) e uma seta no limite da vista, em `render/mancha.ts` (puro) e `Graphics` criado preguiçosamente em `Vigilia.desenharMancha` (MC9). A Alma no chão é um círculo lilás `COR.alma` de 12 pt. A câmera lenta do Apagar é `escalarDeltaDoApagar` (puro) no driver; `dispararCameraLenta` ganhou duração e fator.
- **Textos novos:** `A6.PAUSA.MORTES`, `A6.PAUSA.DANO`, `A6.PAUSA.APAROS`, `A7.RESULTADO.DANO`, `A5.HUD.FRASCO`, `A6.PAUSA.VALOR`, `A6.PAUSA.ESTATISTICAS_LINHA` ("{mortes} mortes · {dano} dano · {aparos} aparos"; "Mortes" virou "Mortes causadas" no crítico) e `A7.RESULTADO.VALOR`; os rótulos do Resultado e o aviso do Abandonar já existiam.

## 6. Debug e Playwright

- **`__GAME_DEBUG__`:** `estado` continua `'VIGILIA'` na fase VIVA (os testes das F-001 a F-006 comparam com isso) e passa a `'APAGANDO'` e `'FIM(apagar|abandonar)'`; novos `tela` (`'resultado'` do APAGANDO em diante), `vigilia` (fase, causa, `apagandoPassos`, Frasco, mancha, contadores e resultado) e `meta`. Gancho novo no build de debug: `definirHp(hp)` (0 < hp ≤ hpMax), para a captura do HUD com HP 71.
- **Spec `e2e/f007.spec.ts`** (5 testes, build de debug): F-007.4 com `?inicio=19:00&almas=1000` (estados `VIGILIA` → `APAGANDO` → `FIM(apagar)` registrados por rAF, `apagandoPassos` = 30, `A4.APAGAR.01` em APAGANDO e no Resultado, `tela` = `resultado`, sem Reviver, `localStorage` limpo antes); Frasco por toque real e "segurar" por CDP (cura de 60 → 120 HP, 3 → 2 cargas, `frascoCancelado`, carga que não volta); HUD com HP 71 e 1.240 Almas; pausa e Abandonar em dois toques (281 Almas → 140, sem mancha) com a build do `tres_armas`; mancha (roteiro correndo para a direita até morrer, Repetir com seed nova, seta e depois anel).
- **Evidências** (`production/evidencias/F-007/`, as seis olhadas uma a uma): `resultado.png` (cinco linhas, "300 Almas ficaram na Hora IV" em lilás e o minimapa da mancha; o HUD some sob o véu, sem prompt), `mancha.png` (seta lilás na borda direita), `mancha-anel-390x844.png` (anel de brasa e a Alma lilás), `hud-hp71-390x844.png`, `frasco-curando-390x844.png` (HP 78, trecho claro da cura, botão aceso com 2 cargas) e `pausa-390x844.png` (3 armas, estatísticas, aviso e Abandonar com a borda de brasa). As quatro últimas entraram no `feature_list.json`, além das duas de B.
- **O que a conferência visual achou e a 3d corrigiu:** (a) o número do HP encostava na linha das vagas (`numeroAbaixo` 2 → 0); (b) o prompt "Toque em ⟲…" aparecia por baixo do véu do Resultado; (c) o HUD de Almas aparecia na pausa e no Resultado (AM5); (d) com `?almas` e morte parada, a mancha nasce no ponto de partida e é recolhida no 1º passo da Vigília seguinte, então a captura corre antes de morrer.
- **Os testes esperam pelo `estado`, não por tempo fixo (AG8).** No contêiner a Playwright demora segundos para cada arrasto de CDP (o jogo roda a ≈ 20 a 60 passos por segundo), então o movimento da captura da mancha vem do roteiro (`entrada.roteiro`) e `avancar`, não de arrasto.

## 7. Referências para a Playwright

Nenhuma referência nova gravada pelo Vitest para a F-007: os testes Node × Chromium dela não comparam hash (o estado e o texto bastam). As de `.verify/referencia-f00x.json` das features antigas seguem as do ADR-0008 §1 e §7, regravadas pelo Vitest do verify.

## 8. Testes, medidas e calibrações

- **Vitest:** 1.530 testes em 84 arquivos (eram 1.312 em 69 no ADR-0008; 1.522 ao fim da 3c). `tests/logica/combate/` ganhou `estado-v7`, `dano-liquido`, `frasco`, `regressao-v6`; `tests/logica/vigilia/` (Apagar, Almas, mancha, meta); `tests/cenas/` (`hp`, `hud-vinheta`, `telemetria-dano`, `apagar-e-resultado`, `vigilia-fim`) e, na 3d, o HUD de Almas em `hud.test.ts`, a pausa com a build cheia em `alvos.test.ts` (e, depois do crítico, o painel das estatísticas acima do jogador, com o respiro) e o `sim20.test.ts` com a morte e os pickups. O `hp.test.ts` passou a seguir `BARRA_DE_HP.numeroAbaixo`.
- **Alocação** (`tests/cenas/alocacao.test.ts`, HeapProfiler a 64 B, ≤ 16 B por passo, sem lista branca; `VDC_MEDIDAS=1` imprime cada medida): ver a tabela em §8.1.
- **Simulação de 20 min** (`scripts/sim20.ts`, com ataques; só medida, sem gate; 51 s com `tsx`). A 3d acrescentou Almas em cada marco, o pico de pickups e uma contagem aproximada dos créditos diretos. Níveis aos 5/10/15/20 min e Almas na mão (jogador invulnerável, seeds 1 a 3):
  - parado: nível 9/10/10/10, 9/12/12/12 e 9/11/11/11; Almas ao fim 260, 441 e 341;
  - em círculo: 2/6/18/27, 1/12/18/27 e 1/12/17/27; Almas 3.612, 3.767 e 3.687;
  - caçando: 14/25/32/36, 13/21/29/35 e 13/24/31/36; Almas 8.177, 7.459 e 7.743.
  - **Recomendação para a F-010 (AM6):** uma Vigília de 20 min vale ≈ 300 a 450 Almas parado, ≈ 3.700 em círculo e ≈ 7.500 a 8.200 caçando; uma morte aos 4 a 5 minutos de jogo ativo vale algumas centenas. O preço da árvore do Santuário deve nascer dessa faixa, e as 300 Almas garantidas do 1º Apagar (Q-20, RS8) seguem na F-010.
  - **Crédito direto (AM2):** o pool de pickups chega a 512/512 em todas as rodadas (menos em uma, 502), então o crédito direto de Alma acontece: por passo, 0 a 5 vezes parado, 14 a 26 em círculo e 27 a 45 caçando em 20 min (contagem de passos em que as Almas subiram sem coleta; aproximada, não por Alma). É raro e nada se perde; o descarte da D5 §9 não é necessário.
  - **Tempo até a morte (AG8),** jogador parado em `?inicio=19:00`, seeds 1 a 8: com a Brasa Firme 232 a 246 passos (3,9 a 4,1 s), sem ela 230 a 243. A Brasa Firme só adia a morte em 0 a 9 passos, não os ≈ 25% (≈ 5 s) que a D7 estimava: o tempo é dominado pela chegada da horda, e o HP cai em dezenas de passos depois do cerco. A Playwright de F-007.4 espera pelo `estado`, e o item 10 do roteiro do iPhone diz "≈ 4 a 5 s".
- **Playwright:** `e2e/f007.spec.ts` (5 testes) e 57 no total. O verify da 3d apontou dois specs antigos, ajustados (a D7 §12 já previa "a lista exata sai do diff"): `f004.spec.ts` (a) esperava que a pausa **não** tivesse o Abandonar (agora exige o Abandonar e as três estatísticas, e que o aviso só apareça armado) e `f002-evidencias.spec.ts` lia o deslize com `x < 260`; mediu 277,8 (o contato com o obstáculo começa em 286 e o valor lido depende do tempo da captura no contêiner, como já dizia o ADR-0008 §8), e o limite foi para 290. Nenhuma simulação mudou nessa medida. O crítico achou o 290 frágil (B2) e a asserção passou a pausar a simulação ao ler (`pausar` e `retomar`) e a conferir também `y`.
- **Desempenho:** nenhum gate de tempo novo; nada otimizado pelo contêiner.
- **verify.sh, seed 1:** `scripts/verify.sh --feature F-007` verde (typecheck, lint, 1.530 testes, builds, 57 testes da Playwright e as seis evidências). Como uma execução já roda a suíte inteira e regrava as evidências de todas as features, F-001 a F-006 foram conferidas com o mesmo trecho de evidências do script (`.verify` desta execução) em vez de seis execuções completas: todas verdes (aviso conhecido do F-003: fps não conferido com WebGL por software). As evidências de F-001 a F-006 que o verify regrava foram restauradas ao que estava no commit `d5cfc93`.

### 8.1 Alocação por passo

Medidas na 3d (contêiner, Node 22, 6.000 passos medidos, depois do aquecimento de cada teste):

| Teste | B por passo | Limite |
|---|---|---|
| E4, `horda` | 15,3 | 16 |
| E6, 3 armas no nv8 | 13,7 | 16 |
| render dos ataques, 30 telegrafos e 19 projéteis | 2,8 | 16 |
| render do mundo, 512 pickups e 20 ondas | 2,8 | 16 |
| E6 da F-005, Cinzas, level up e União | 9,0 | 16 |
| E7a, horda com ataques, vulnerável e parado | 0,0 | 16 |
| **E7c (F-007):** Frasco a cada 400 passos, dano forte a cada 500, HP refeito a cada 400, morte e renascimento | 2,5 (`verificarMorte` 0,9 e `encerrarVigilia` 0,7) | 16 |
| E7b, esquiva, esquiva perfeita, aparo e Contra-ataque | 0,0 | 16 |
| E7b, variante com prompts visíveis | 4,8 (render) | 16 |
| 1.000 Contra-ataques, depois de aquecer | 0 B no total | 64 |

O E7c exige no anel de eventos `frascoIniciado`, `frascoInterrompido`, `danoAoJogador`, `golpeInimigo`, `apagou` e `fimDaVigilia` (cobertura afirmada, `perdidos` = 0). Os mesmos 10 testes passam com o aquecimento de 63.000 passos do ADR-0008 §8; a medida é determinística no contêiner, mas qualquer mudança em função quente pode pedir novo aquecimento.

O E4 da `horda` (15,3) tem só 0,7 B de folga, quase tudo em `toro.ts` e `escala.ts`; o ADR-0008 media 14,9. O corpo do passo vivo foi mantido intocado exatamente por isso (§1): um byte a mais fazia o V8 deixar de inlinar as contas de `toro.ts` (+9 B por passo).

## 9. Divergências

Da D7 (decisões de implementação):

1. **DM8, o líquido em `LIQUIDO[0]`:** a D7 dizia que o dano líquido escreve em `BRUTO[0]`; ele vai a `LIQUIDO[0]` e ao evento, e o bruto fica intacto para os eventos e para o F-003.5 (§2).
2. **DM2, Brasa Firme "antes da regeneração":** lê a stamina já regenerada do passo; mudar a ordem mudaria a regeneração de todos os replays (§2).
3. **FR5, a cura "volta no passo 130" após um gasto no 100:** volta no 131 (o passo do gasto não decrementa a espera, ST2); sem gasto volta no 121 como a D7.
4. **LY2, `verificarMorte` antes do relógio:** a mancha e a morte rodam **depois** do passo vivo (um byte a mais no corpo do passo fazia o V8 deixar de inlinar `toro.ts`, +9 B por passo no E4). O diretor, a rotação e a Postura do passo da morte ainda rodam; a fila de modais, a oferta e o Frasco são descartados no mesmo passo.
5. **MC4, ponto livre:** não é o ótimo, é o mais próximo pela normal radial (até 8 passadas), conferido em grade de 141 × 141 pontos no lugar dos 20.000 pontos sorteados.
6. **PE3, estatísticas em y ≈ 318:** 322 (o aviso a 18 pt do botão).
7. **AG4, `estado` = `VIVA`:** o debug mantém `'VIGILIA'` na fase VIVA, para os testes das F-001 a F-006.
8. **HB1 e FR8, glifos da N4:** o número do HP e o rótulo do Frasco são `Text` (a N4 mora no atlas do mundo, não no Hud).
9. **AM5, "1.240":** o HUD mostra "1.240 Almas" (o texto `A5.HUD.ALMAS` já existia com a palavra) e some na pausa e no Resultado.
10. **SV (vigiliasConcluidas):** o Abandonar conta como Vigília concluída.
11. **TL1:** o contato agregado não leva a soma do dano (os 3 campos do doc 10 §6); a soma está em `danoRecebido`.
12. **AG8, "~25% mais tarde":** a Brasa Firme adia a morte do jogador parado em +1 a +9 passos, ≈ +25% **da fase de dano** (1º dano até a morte, 8 a 28 passos), não do tempo total (≈ 4 s, dominado pela chegada da horda); a D7 aplicava os 25% ao total (corrigida no crítico, §10).
13. **A regressão v5 e v4:** rodam com `semAlmas(D)` e a v6 com `semCinzas | jogadorInvulneravel`, mascarando o HP; sem isso a Alma e a armadura quebrariam a igualdade com o código antigo.
14. **Telemetria `cinzas_perdidas`:** adiada para a F-010 (falta o contador de Vigílias).
15. **Evidências a mais:** `mancha-anel`, `hud-hp71`, `frasco-curando` e `pausa` além de `resultado.png` e `mancha.png`; a captura de `mancha.png` mostra a seta (a mancha está fora da vista) e o anel vem em `mancha-anel-390x844.png`.

Dos documentos e do `feature_list.json`:

16. **`feature_list.json`:** os 8 critérios F-007.1 a F-007.8 com o "como" da D7 (Etapa 1, `235de48`); as quatro evidências extras (item 15).
17. **Gancho `definirHp`** só no build de debug.

Do processo:

18. **Trailer de outro nome de modelo na Etapa 3b:** os quatro commits da 3b (`6225a21`, `1600a10`, `c5c2d18`, `30ec6fa`) saíram com `Co-Authored-By: Claude Sonnet 5.5`, e não o trailer do brief (`Claude Opus 5.5`). Já estavam enviados e reescrevê-los exigiria reescrever o histórico de uma branch publicada; ficam registrados aqui e não foram reescritos. Os demais commits da Etapa 2 (2a a 2c, 3a, 3c e 3d) seguem o brief.
19. **Commits acima de ~300 linhas** (inserções + remoções, `git show --numstat`, de `235de48` a `db27124`): `8738baf` 1.043 (Apagar, Almas, mancha e contadores), `6225a21` 793 (dano líquido e Frasco), `f52ce89` 505 e `d5cfc93` 494 (pausa, Resultado e integração), `c5c2d18` 450 (barra de HP), `caa0242` 446 (botão do Frasco), `56304b2` 425 (layout v7 e hashes) e `36a8554` 399 (meta). Em todos a maior parte é teste ou dado; os da 3d ficaram em 12, 61 e 239 (o `db27124` leva o spec da Playwright de 190 linhas, o `feature_list.json` e o gancho).
20. **Desvio de formato:** o ADR-0009 não repete as tabelas de `design/decisoes-F-007.md` §0.A; os identificadores (DM, FR, HB, TL, AG, AM, RS, MC, SV, PE, LY, VB) remetem a ela.

## 10. Crítico independente

Nota **8,0**, sem achado bloqueante nem alto (na F-006 foi 8,0; na F-005, 7). Foram 88 mutações no código da simulação, das cenas e do tradutor (a F-006 teve 81), cada uma aplicada em worktree próprio, com os testes afetados rodados e desfeita em seguida; `tests/cenas/alocacao.test.ts` (10 testes) e o Playwright da F-007.4 e da `f002-evidencias` rodados à parte, verdes. Reprovadas pelos testes que já existiam: 77. Sobreviventes: 11, das quais 4 equivalentes e 7 lacunas reais. Achados, todos aplicados abaixo: **médios** A1 (a pausa ficava ilegível em parte: a build caía sobre o HUD, as estatísticas sobre o jogador e o anel, "Mortes" era ambíguo e a linha única não tinha rótulo), A2 (o critério F-007.6 dizia "antes da regeneração", o código lê depois, §9 item 2) e A3 (as 7 lacunas de teste); **baixos** B1 (AG8: o 25% é da fase de dano, não do tempo total), B2 (o `x < 290` do `f002-evidencias` dependia do atraso por parede), B3 (o Abandonar não passa pelo fluxo de comandos), B4 (o ADR dizia "também em funções frias" e `pontoLivreMaisProximo` recebia doubles), B5 (o E7c não cobria `rodarMancha`) e B6 (desenho, sem código).

- **A1, a pausa:** a cena Hud some enquanto a pausa está aberta (`Vigilia.abrirPausa` e `fecharPausa`; teste em `vigilia-fim.test.ts`, e o Playwright confere que nenhum `A5.HUD.*` fica visível); as estatísticas ficam num painel opaco `cinzaFrio` de 260 pt com 8 pt de respiro (`BLOCO_DO_ABANDONAR.respiroDoPainel`, que também entra na conta das 3 linhas ou 1); o rótulo é "Mortes causadas"; a linha única é "12 mortes · 340 dano · 3 aparos". Teste novo em `alvos.test.ts`: o painel (com o respiro) não encosta na build cheia e, em 844, fica acima do jogador (`ALTURA/2 − 2 × RAIO_DO_JOGADOR`). `pausa-390x844.png` regerada e aberta com o `Read` antes do commit: sem texto sobre o HUD; o painel termina 6 pt acima da ponta do triângulo e cobre só o alto do anel. O §5 foi corrigido.
- **A2:** o "como" do F-007.6 agora diz "depois do gasto e da regeneração do passo" (ADR §9 item 2), e dois testes novos em `dano-liquido.test.ts` fixam a borda: 49,75 + regeneração de 0,5 = 50,25 no mesmo passo dá × 0,8 e, com a espera de regeneração ativa (stamina fica 49,75), × 1,0; 49,5 + 0,5 = 50 não é > 50.
- **A3, as 7 lacunas viraram teste** (cada um reprova com a mutação aplicada e passa sem ela, conferido aplicando e desfazendo):
  - **M35** (`rodarApagando` sem `CAB.passo++`): o passo anda 1 por passo em APAGANDO e o `fimDaVigilia` leva o passo da morte + 30 (`apagar.test.ts`);
  - **M72 e M73** (outro botão da pausa e reabrir a pausa não desarmam o Abandonar): **não era bug**, só faltava o teste. O trecho do `aoStep` virou `desarmarAbandonar(toque)`; `vigilia-fim.test.ts` cobre Continuar, Som, Flashes e Números, o próprio Abandonar e o fora da pausa, o 2º toque depois de Som que só arma de novo, e `abrirPausa` e `fecharPausa`;
  - **M77** (janela do contato com `>` em vez de `>=`): a janela fecha com exatamente 300 passos, pela leitura e pelo contato seguinte (aqui a mutação só aparecia no HP da linha, que é o do 1º contato) (`telemetria-dano.test.ts`);
  - **M51** (`segundos = relógio / 30`): 19:04 e 30 passos = 1.144 s, 59 passos = 0 s, 60 passos = 1 s (`apagar.test.ts`);
  - **M67** (Hora 1 a 9 aceita no meta): o teste "recusa" que existia usava uma soma errada e era recusado pela soma, sem exercer a Hora; o novo grava com a soma certa e confere Hora 0, 6, 9 e 1,5, x e y fora do mapa, Almas 0 e o limite, e o rótulo (`meta.test.ts`);
  - **M45** (ponto livre com 1 passada): três obstáculos encadeados (achados por busca) em que uma passada deixa o ponto numa zona e as 8 o deixam livre (`mancha.test.ts`).
- **B1:** `design/decisoes-F-007.md` (AG8) e o F-007.4 corrigidos: a fase de dano (8 a 28 passos, menos de meio segundo) é a que fica ≈ 25% mais longa; o tempo total (≈ 4 s) é dominado pela chegada da horda. O código estava certo (M05 e M06 morrem). Efeito colateral registrado: o cenário 19:00 não serve para tarar equilíbrio.
- **B2:** o `f002-evidencias` pausa a simulação ao ler (`pausar`, lê, `retomar`) e confere `y` (a condição de espera) além de `x < 290`; o valor não depende mais do atraso do contêiner.
- **B3, não aplicado:** `tocarAbandonar` chama `passo` direto com um comando avulso. Passá-lo pelo bit 16 de `avancar` perderia o toque se houver congelamento (a fonte nem é consultada) e exigiria consumir a borda da fonte ao vivo; não é simples e, sem gravação ao vivo, é inofensivo. Fica anotado para a F-008 e a retomada.
- **B4:** `pontoLivreMaisProximo(o, io)` recebe e devolve tudo num `Float64Array` de 3 posições (x, y, margem); nenhum double cruza a chamada, como o §1 diz.
- **B5:** o E7c ganhou a mancha: `rodarMancha` roda por passo e a mancha é recuperada a cada 400 passos (crédito de Almas e evento `manchaRecuperada` exigido). Um teste E7d separado falhou (salvaDeFacas 43 B por passo) porque a Vigília morria sem o HP refeito e as armas não aqueciam no JIT, então a mancha foi para dentro do E7c, que já refaz o HP; as 10 medidas passam em ≤ 16 B. A folga do E4 `horda` (0,7 B) continua frágil a linhas novas em `passoVivo`.
- **B6** (Apagar com N < 2 apaga a mancha antiga sem criar a nova, MC3): é desenho aprovado; o risco fica registrado para a revisão do usuário.
- **Equivalentes** (nenhum teste pode distinguir): **M07** (Brasa Firme antes da armadura: a multiplicação comuta); **M24** (Frasco iniciado fora da fase VIVA: APAGANDO e FIM nunca chegam aos comandos, é defesa); **M44** (teto 5 no lugar de 4 na Hora: `minutos < 20` já limita a 4); **M49** (`recuperouMancha` com `>= 0`: sem mancha ativa o meta não muda).
- **Item 2d (determinismo e alocação):** nenhuma violação nas partes novas; os hashes de referência (`a5721bcc`, `88a3a4f0`) protegem (M34 e M53 morrem em `determinismo.test.ts`).
- **Vitest ao final:** 1.541 testes em 84 arquivos (eram 1.530; +11: 3 em `vigilia-fim.test.ts`, 2 em `dano-liquido.test.ts` e 1 em cada um de `alvos`, `telemetria-dano`, `meta`, `mancha`, mais 2 em `apagar.test.ts`; o E7c ganhou a mancha). Os commits do crítico ficaram em até ~300 linhas.


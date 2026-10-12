# Decisões da F-006 "Stamina, esquiva e aparo"

- **Status:** proposta para aprovação (Etapa 1 da Sessão 6), depois da revisão adversarial (§12). Nada foi implementado. As decisões técnicas da implementação e as divergências vão para o ADR-0008.
- **Como foi feito:**
  - levantamento: um workflow com 4 pesquisadores, cada um seguido de um verificador cético, e um crítico de completude. Áreas: stamina, esquiva, gestos e feedback; aparo, Postura Quebrada e Contra-ataque; Oco Grande, Noviça, telegrafos, Sal no jogador e tutoriais; estado v6, ordem do passo, comandos, áudio, debug, testes e evidências. Todos os agentes rodaram em Sonnet com esforço médio;
  - saíram 99 perguntas dos pesquisadores e 49 dos verificadores. 16 delas os documentos já respondem, no todo ou em parte (§1). Os verificadores revisaram as 99 propostas: confirmaram 60, corrigiram 39 e não refutaram nenhuma. Conferiram as citações, procuraram a resposta em todas as fontes e refizeram as contas e os protótipos;
  - o crítico achou 17 conflitos entre as áreas, 13 contradições entre fontes, 12 lacunas e 18 divergências de documentos aprovados. Por exemplo, as quatro áreas numeravam os eventos de jeitos diferentes, e três contavam a regeneração de três jeitos. Cada conflito está resolvido no lugar da decisão, com o motivo; quatro redatores escreveram as seções a partir das resoluções;
  - as medidas vêm de protótipos fora do repositório: o código de `src/` rodado no Node 22 deste contêiner. Nada foi medido em iPhone.
- **Fontes, em ordem de autoridade:**
  - B = `design/gdd/18-briefing-tecnico.md` (prevalece no MVP);
  - o brief aprovado (`design/game-brief.md`), com as decisões Q-xx e a §11.3;
  - o GDD (`design/gdd/*.md`);
  - o ADR-0002 (aceito) e os ADR-0003 a ADR-0007;
  - D2 a D5 = `design/decisoes-F-00{2,3,4,5}.md`;
  - o `feature_list.json`, `src/dados/*.json`, os schemas e o código em `src/`.
- **Convenção** (a mesma da D5):
  - **[delegada]** marca decisão de design ou número que nenhum documento dá; vale até você dizer o contrário;
  - **(técnica)** marca o que é só implementação;
  - o resto vem de documento, citado;
  - o que pertence às F-007 a F-010 não é decidido aqui: vira recomendação na §10.
- **IDs** (dois caracteres, para não colidir com os das D2 a D5 nem com os testes E1 a E7): ST stamina, ES esquiva, GE gestos, EP esquiva perfeita, FB feedback, AP aparo, PQ Postura Quebrada, CA Contra-ataque, OG Oco Grande, NV Noviça e Sal no jogador, TU tutoriais, ET estado e passo, RE render, VT verificação (cenários, debug, critérios, evidências e testes).
- **Contagem dos passos:** o passo que lê o comando é o passo 1 da ação. "T" é esse passo na esquiva; no aparo, "c" é o passo do toque, "G" o do gasto (o mesmo) e "h" o do golpe aparado; "P0 = c+12" é o 1º passo depois da janela.
- **Pendências da F-006 no `feature_list.json`:**

| # | Pendência | Onde |
|---|---|---|
| 1 | brief §11.3: alcance do Oco Grande, projétil da Noviça, recuperação da esquiva, toque duplo, janela do swipe, câmera lenta do tutorial, centro da Postura Quebrada, aparo falho, aparo de vermelho, stamina insuficiente, o que "vulnerável" bloqueia | OG3; NV4; ES1; GE2; GE1; FB5; PQ1; AP5 e AP7; AP10; ST3 e AP9; AP8 |
| 2 | build de teste em iPhone depois da F-006 (Q-29) | VT10 |
| 3 | como a aura do Círculo participa do Contra-ataque | CA4 |
| 4 | D2 §9: esquiva com obstáculos e até 32 px por passo; aparo só no 1º passo do quadro; swipe por `timeStamp` | ES3; AP2 e ET6; GE1 |
| 5 | D3 §9: solidez e contato nos i-frames; prompt pelo telegrafo; `?inicio` e garantidos; atordoado separado; médios acima da massa; telegrafo por tint; o que conferir no iPhone | ES7 e EP1; TU1; TU7; PQ3; RE8; RE4; VT10 |
| 6 | empilhamento do multStatus (DN3), `quebradaPassos` por inimigo, críticos amarelos | PQ6; PQ2; PQ8 |
| 7 | multiplicador por alvo | PQ7 |
| 8 | Contra-ataque arma por arma, Postura pela regra da hitbox, +1 faca | CA2 a CA4; PQ1; EP4 |
| 9 | projétil da Noviça como tipo 2, dono, nenhuma arma o acerta, faca × projétil | NV5; NV6; RE6 |
| 10 | Sal no jogador (regra S1) | NV7 |
| 11 | Sal e pulso não mexem nos timers; silhueta acompanha o corpo; morte cancela; projétil lançado continua | OG9; RE5 |
| 12 | telegrafo como silhueta preenchida | RE5 |
| 13 | pausa com Som e Flashes, `setMute`/`pauseAll`, flash de acerto no inimigo | FB3; RE11; FB2 |
| 14 | `TouchEvent.timeStamp` do Safari | VT10 |
| 15 | modal: aparo, swipe e toque duplo não existem nele; congelamento depois do modal | AP2; GE3; FB1 |
| 16 | Poder temporário e o recálculo do dano | EP3 |
| 17 | Contra-ataque da União; códigos de EVENTO e FORMA só no fim | CA2; ET10 |

## 0. O que foi decidido (para vetar de relance)

### 0.A Decisões de design e divergências (para vetar)

Em negrito, o que diverge de um documento aprovado ou muda uma leitura anterior. "Alternativa" é o que vale se você vetar.

| # | Decisão | Valor |
|---|---|---|
| ST1, ST3 | Teto e falta de stamina | Teto 100, também na devolução do aparo. Com stamina abaixo do custo, a ação é negada: nada muda, sem custo parcial. **O "antes − 15 + 30" do F-006.6 e do F-006.10 vira `min(100, antes − 15 + 30)`** (B só diz "Stamina 100"). Alternativas: sem teto (até 115); usar o que tem |
| ES1, AP3 | Contagem dos passos | O passo do comando é o 1. Esquiva: i-frames nos passos 2 a 13 e recuperação de 19 a 21, dentro dos 21. Aparo: protege de c+1 a c+11 (o passo do toque não protege). Alternativa no aparo: c a c+10 |
| ES2 | Perfil da esquiva | 80 px em 21 passos, constante (3,81 px por passo); obstáculo corta a esquiva (18,6% delas), sem dano. Alternativa, para o iPhone: 80 px em 18 passos e parado nos 3 de recuperação |
| ES6 | Sem buffer | Esquiva e aparo pedidos durante outra ação são descartados sem custo; os dois no mesmo passo: vale o aparo. Alternativa: buffer de 3 passos (só se o iPhone pedir) |
| ES7 | Atravessar a horda | O jogador passa por dentro dos inimigos só nos i-frames (passos 2 a 13). Os 45,7 px de i-frames não atravessam um Oco (64 px): quem rola através dele leva o contato do passo 14. Alternativa: atravessar nos 21 passos |
| GE1 | Swipe | Só o dedo do joystick; > 400 pt/s medidos em até 100 ms, com Δt ≥ 16 ms e ≥ 24 pt. **Risco: a regra literal de B também dispara em 83 a 95% das inversões rápidas do joystick (traços sintéticos); só se calibra no iPhone** |
| GE2 | Toque duplo | Toque de até 200 ms e 10 pt; o 2º começa até 250 ms depois e a até 40 pt do 1º; dispara no 2º toque, na última direção do jogador |
| EP2 | Uma esquiva perfeita por esquiva | Só o 1º acerto evitado conta. **Restringe Q-15 e B §3.4 ("ao pé da letra"):** sem o limite, rolar pela horda daria até 12 perfeitas, 12 congelamentos (1 s parado) e 12 facas por esquiva. Alternativa: sem o limite |
| EP3 | Poder +15% | Renova (volta a 120 passos), não acumula, soma com as Luvas. **Diverge da D5 §9 (recalcular o dano na entrada e na saída): duas tabelas de dano, sem e com o +15%, refeitas juntas nos mesmos eventos.** Alternativa: recalcular, com o risco medido de passar de 16 B por passo |
| FB1 | Congelamento | 5 passos com `passo` e relógio parados (só anda o contador); os testes comparam o `passo`, nunca "início + n". Alternativa: só o relógio parado |
| FB2, FB4 | Flash e som | Flash branco de tela inteira, alfa 0,35, 2 quadros de render, até 3 por segundo; som agudo sintetizado (o do aparo metálico; o da esquiva perfeita mais curto). **Diverge do doc 11 §5 e §1 (rastro de brasas, 4 quadros e "sopro" na esquiva perfeita; "branco só para aparo"), do doc 13 §2.2 ("sopro"), do doc 02 §5.4 ("inspirar" no telegrafo) e do doc 11 §5 com a D2 §9 (aperto de câmera de 2%): fica só o que B pede** |
| FB3 | Som e Flashes na pausa | Lado a lado, numa linha acima de "números" (2 alvos de 136 × 72 pt); Flashes desliga só o clarão. **Diverge da D4 P5/P6 e do `e2e/f004.spec.ts`, que diz que os dois não aparecem.** A margem sobre a zona de controles é de 3 pt |
| FB5 | Câmera lenta do tutorial | Metade da velocidade por 500 ms de tempo real (15 passos de jogo), uma vez. **Diverge do ADR-0002 §3 no método** ("1 passo a cada k quadros" daria 0,25 a 30 fps) |
| AP5 | O que é aparo falho | Falho = tocar cedo: a janela acaba sem aparar e havia um ataque aparável a até 36 passos do impacto. Sem isso, é "vazio" e só custa os 15. Alternativa: sem prazo (quase todo toque errado vira falho) |
| AP7, ST2 | Punição do falho | Os 24 passos sem regenerar se sobrepõem ao atraso normal: a stamina volta em G+37, contra G+31 do vazio (3 pontos). A punição real é a trava de 35 passos sem esquiva nem aparo. **B §3.4 e o doc 02 §5.2 chamam o falho de "punição do erro"; o efeito na stamina é pequeno.** Alternativa: somar (volta em ≈ G+67, ≈ 15 pontos) |
| AP10 | Ataque vermelho (regra geral) | Nunca é aparado; o toque contra ele vira vazio (ou falho, se houver outro ataque branco chegando). Vale para o Coroado e o Lanterneiro sem código novo |
| AP12, TU9 | O texto do tutorial do aparo | O texto aprovado manda tocar "no momento do brilho", mas o brilho da Noviça acaba 65 a 105 passos antes do contato, e quem o segue falha sempre. Proposta: o anel do projétil (e a cunha do Oco Grande) fica branco sólido nos últimos 11 passos (17 no tutorial), só no desenho. Alternativas: manter e aceitar; trocar o texto (fora da F-006) |
| PQ1 | Área da Postura Quebrada | Centro no jogador, 64 px até a borda do alvo (80 px no Oco, 88 nos médios), e o atacante sempre. **Muda o "como" do F-006.10 (64 px do centro).** Alternativa: centro no atacante |
| PQ3, PQ4 | O atordoado | Não persegue nem ataca (cancela o telegrafo); continua sendo empurrado. **O Oco das Lanternas atordoado não fere por contato: diverge de B §3.6 ("5/s contato") lido sem exceção.** Alternativa: o contato continua |
| PQ6 | Empilhamento | Produto: Postura ×2, Contra-ataque ×2 e o nv4 da Espada ×1,5 → ×4 no aparado, ×6 com o nv4. Alternativas: soma (×3; ×3,5), mista (×5) |
| PQ7 | A Lâmina e o nv4 | A Lâmina herda o +50% do nv4 contra atordoados (×3 da Postura) |
| CA1 | Contra-ataque | Uma salva extra ×2 por arma, a partir do 1º passo depois do congelamento, sem mexer nas recargas; um novo aparo reinicia. **O doc 03 §3 ("por 1,5 s") não é adotado como buff; vale B e o ADR-0002 §7** |
| CA2 a CA4 | Contra-ataque por arma | Espada e Lâmina: a sequência inteira, mirada no aparado (cada golpe da Lâmina com a sua onda ×2); Facas: todas no aparado; Círculo: um tick extra ×2, sem pulso |
| OG1, OG2 | Ataque do Oco Grande | Telegrafa quando o jogador está a até 80 px (o alcance do golpe), fica parado do telegrafo ao fim da recuperação (126 passos) e golpeia em T+36. **Diverge de B §3.6 lido ao pé da letra ("para a 1,5 corpo" e só então telegrafa) e da D3 §9 (o movimento provisório também durante os ataques): na horda só 4 a 21% dos Grandes chegam a 48 px.** Alternativa: gatilho literal a 48 px (um terço a metade dos ataques) |
| OG3, OG4 | Arco do Oco Grande | Setor de 120° de 64 px (como a Espada nv1 a nv4), até a borda do jogador; mira fixada no início do telegrafo. Alternativa: mira no fim |
| NV1, NV2 | Ataque da Noviça | A cada 180 passos, com o jogador a até 192 px: telegrafo de 30 passos, parada; o projétil sai em T+30 com a mira do início |
| NV4, NV6 | Projétil da Noviça | Raio 8 px, 1,6 px por passo, 150 passos de vida; some no 1º toque no jogador, qualquer que seja o desfecho; nenhuma arma o acerta. Alternativa: atravessar o jogador nos i-frames |
| NV7 | Sal no jogador | −50% por 180 passos, só na caminhada; a esquiva não é afetada |
| RE1 | Barra de stamina | 119 × 10 pt na banda do topo, à direita, abaixo da barra de XP; osso, laranja abaixo de 25 (não dá para esquivar); uma marca a cada 25 |
| RE5 | Silhueta do ataque | Cunha (Oco Grande) e faixa (Noviça) brancas preenchidas, alfa de 0,10 a 0,40; o corpo do inimigo vai a branco puro. **Diverge do doc 13 §1.3 ("ataques brancos são brancos puros") só na alfa final da silhueta: a 0,40 ela dá um cinza (#767980) que contrasta com o fundo e com os inimigos.** Alternativa: alfa ≥ 0,6 (perde contraste com a aura e com o corpo) |
| RE9 | Marcador do atordoado | Estrela amarela (#ffd166) de 12 pt sobre o inimigo, no lugar do losango do Sal |
| TU1, TU2 | Gatilho dos prompts | O de esquiva aparece no 1º telegrafo de um Oco Grande (≈ 4 a 6 s depois de 1:00); o de aparo, no 1º de uma Noviça; ficam até o jogador cumprir. **Diverge do doc 11 §4 ("1:00", "3:00") e do "como" do F-006.8 ("a partir de 1:00")** |
| TU3 | Falhas e "repete" | Depois de 2 falhas com o prompt de aparo na tela, a janela vai a 17 passos enquanto ele estiver visível. **Simplifica o doc 11 §4: o prompt não some e volta** |
| TU5 | Persistência | Nada vai ao meta na F-006 (o meta é das F-007 e F-010); recarregar mostra os prompts de novo. **Diverge da Q-26 ("marcado no save meta") no prazo** |
| ET4 | Ordem do passo | Congelamento no início; ataques dos inimigos depois das armas e dos pickups (quem morre no passo não golpeia). **Diverge da D4 §4, do ADR-0006 §1 e do ADR-0007 §1.** Alternativa: ataques antes das armas |
| ET1, ET3 | Estado v6 e hashes | Campos novos depois dos 67.488 B do v5; todas as referências de hash mudam (versão e stamina), e uma regressão v5 confere os campos antigos. **Diverge do ADR-0002 §4 só nos nomes** |
| VT1 | Cenários antigos sem ataques | Bit `semAtaques` nas 7 receitas antigas, para as regressões longas continuarem valendo; receitas novas `oco_grande_sozinho`, `novica_sozinha` e `horda_com_ataques`. **Diverge do ADR-0002 §14** |
| TU7, VT2 | `?inicio=MM:SS` e `?visto=` | Só no debug; o `?inicio` começa no minuto pedido, com a linha livre. **Diverge da D5 §7 na forma (a receita continua exigindo linha fixa)** |
| VT8 | Os 12 critérios | O "como" de F-006.1 a F-006.12 é reescrito (§9); a descrição e o critério de B ficam. **Diverge do `feature_list.json`** |
| VT9 | Evidências | As duas de B (vídeo de 10 s e `janelas.log`) e mais 4 capturas de revisão (telegrafos, esquiva perfeita e os dois tutoriais), todas olhadas antes do pronto |
| VT10 | Build do iPhone | `docs/roteiro-iphone.md` e, no último commit, um workflow do GitHub Pages só manual (você liga o Pages e o roda). Publica um build de debug em URL pública; repositório privado exige plano pago. Alternativa: só o roteiro |
| — | Fora da F-006 | HP 0 continua sem consequência (a morte é da F-007); sem contadores de estatística no estado; sem barra de Poder no HUD; sem aperto de câmera, flash de acerto no inimigo nem seta de telegrafo na borda da tela |

### 0.B Decisões técnicas (informativo)

| # | Decisão | Valor |
|---|---|---|
| ST2 | Regeneração | 0,5 por passo; o passo que grava a espera (gasto ou falho) não regenera nem decrementa; 1ª regeneração em G+31 |
| ES3 a ES5 | Esquiva | Colisão da caminhada; direção contínua, (0,0) = última direção; durante a esquiva o joystick só muda a mira das armas |
| GE3, ET5, ET6 | Comandos | `acoes` (bits: esquiva 1, aparo 2, Frasco 4 reservado) e `mira` nos `ComandosDoPasso`; a borda é consumida no 1º passo vivo; no roteiro, uma lista de ações com passo exato |
| EP1 | Ponto único de acerto | `resolverAcertoNoJogador`: aparo > i-frames > dano; `danoAoJogador` continua o único caminho do HP |
| EP4 | +1 faca | Só com Facas na build, não acumula, consumida pela próxima salva que sai |
| AP1, RE2 | Botão Aparo | 80 pt, a 24 pt dos cantos, dispara no toque, sem texto, 3 estados |
| AP4, AP6 | Resolução do aparo | Vale no contato; o sucesso dá +30, congelamento, Postura e Contra-ataque, uma vez por passo |
| AP11 | Janela do tutorial | 17 passos (grava 18); o falho passa a c+18 |
| PQ2, PQ5, PQ8 | Postura | 120 passos, renova; imunes por dado; crítico amarelo só com a Postura |
| CA5 | Bordas do Contra-ataque | Aparado morto: alvo normal ×2; vários aparados: o de menor slot |
| OG5 a OG11 | Oco Grande | Instante do golpe; dano fixado no spawn; ignora a invulnerabilidade de contato; o convertido ataca; Sal e pulso não mexem nos timers |
| NV3, NV5 | Noviça | Mira fixa; projétil tipo 2 no pool das facas, com `donoSlot` e `donoGeracao` |
| TU4, TU6, TU8, TU10 | Tutoriais | Um texto por vez; `?visto=`; câmera lenta no prompt de esquiva; só o `contexto` dos textos muda |
| ET2 | Constantes | `TUTORIAL` 1, 2, 4; `TODOS_OS_TUTORIAIS` 7; `CENARIO.semAtaques` 8; `ACAO`; `TIPO_DE_PROJETIL.sal` 2 |
| ET7, ET8, ET9 | Congelamento, RNG e dados | `passo()` abre com o congelamento; nenhum fluxo de RNG novo; `combate.json` só com o que nenhum JSON tem |
| ET10 | Eventos | EVENTO 11 a 21, FORMA 7 e 8, `FLAG.contra` 8; o desfecho do golpe vai no evento |
| ET11, VT6 | Laço quente e alocação | Contas em linha e rascunhos `Float64Array`; E4 e E6 inalterados; E7a e E7b novos, ≤ 16 B por passo |
| RE3, RE4, RE6 a RE8, RE10 a RE13 | Render | Flash na cena Hud; brilho por `tintBlend`; projétil e faca; indício da janela; camada de médios acima da massa; críticos; pausa; 3 sons sintetizados no boot; nenhum texto novo |
| FB6, CA6, VT4 | Telemetria | `esquiva` e `aparo`, só local |
| VT3, VT5, VT7, VT11 | Debug, testes antigos, Node × Chromium, mutações | Campos novos no `__GAME_DEBUG__`; a lista dos testes que mudam; `referencia-f006.json`; 19 mutações com o teste que as reprova |

## 1. O que os documentos já respondem

- **Stamina e esquiva:** stamina 100; regeneração de 30/s depois de 0,5 s sem gastar; esquiva custa 25, dura 21 passos, i-frames de 12 (passos 2 a 13), recuperação de 3, distância de 2,5 corpos = 80 px; 100 de stamina = 4 esquivas seguidas; corrida fora do MVP (B §3.3 e §3.4; doc 02 §5.2; ADR-0002 §3).
- **Gestos:** esquiva por swipe a mais de 400 pt/s com o dedo do joystick ou por toque duplo no joystick, na direção do swipe; medida pelo `timeStamp` (B §3.5; doc 02 §4; D2 §9; ADR-0002 §12). As bordas de ação entram travadas: um toque curto entre dois quadros gera exatamente 1 passo de aparo, e o aparo vai só no 1º passo do quadro (ADR-0002 §12; D2 §9). Aparo, swipe e toque duplo não existem no modo modal, e a ação pendente não atravessa o modal (D5 §9).
- **Esquiva perfeita:** um acerto teria ocorrido nos i-frames; +15% de Poder por 2 s = 120 passos; +1 faca na próxima salva (B §3.4; doc 02 §5.3; doc 04 §3; Q-15). O contato nos i-frames não tira HP e só conta com o timer de contato em 0 (D3 §9; Q-14). Rolar através da horda é permitido (doc 02 §5.3). O Poder temporário é um campo do registro do jogador; facas e ondas no ar mantêm o dano fixado (D5 §9).
- **Obstáculos:** a esquiva respeita os obstáculos, e nenhum passo passa de 32 px (D2 §2 e §9). Nenhum projétil nem área é bloqueado por obstáculo (D2 O6).
- **Feedback:** flash branco de 2 frames, congelamento de 80 ms e um som placeholder por evento crítico (aparo, esquiva perfeita, quebra), sem vibração (B §2 e §4; doc 02 §4; brief §5.6). O congelamento vale 5 passos e congela também o relógio (ADR-0002 §3 e §15 item 2, aprovado); com um modal no mesmo passo, ele roda depois que o modal fecha (D5 §9). Os 3 sons são sintetizados no boot por funções puras testáveis por hash; na pausa, `setMute`, nunca `ctx.suspend()` (ADR-0002 §12; D4 §9). `A6.PAUSA.SOM` e `A6.PAUSA.FLASHES` já existem em `pt-BR.json`.
- **Aparo:** botão de 80 pt no canto inferior direito, acima da barra do iPhone, com o Frasco de 72 pt acima dele (B §3.5); custa 15, janela de 11 passos, devolve 30 no sucesso e anula o dano; o sucesso aplica Postura Quebrada em raio de 2 corpos por 2 s (120 passos), com dano ×2, e dispara o Contra-ataque, uma salva extra ×2 por arma dentro de 1,5 s (B §3.4; doc 02 §5.4; ADR-0002 §7; doc 04 §10). O aparo falho dura 24 passos sem regeneração e "vulnerável"; aparar sem ataque chegando só custa a stamina (B §3.4; doc 02 §5.4; brief §5.6). Ataque vermelho não pode ser aparado (doc 02 §5.4; B §3.4).
- **Postura Quebrada e Contra-ataque:** o atordoado não persegue, mas continua separado (D3 §9); a Postura do aparo segue a regra da hitbox e o multiplicador por alvo é lido do inimigo no acerto (D4 §9); a Espada com a sequência inteira e a mira no aparado, as Facas todas no aparado e o Círculo com um tick extra (D4 §9); a salva da União é a sequência de 4 golpes, cada um com sua onda e o ×2 fixado na criação (D5 §9).
- **Oco Grande:** para a 1,5 corpo, telegrafo branco de 0,6 s (36 passos), arco de 120°, 1,5 s (90 passos) de recuperação, 20 de dano por ataque com a escala (1 + 0,05·min) (B §3.6; ADR-0002 §3). O minuto da escala é inteiro e o dano é fixado no spawn (Q-10); o convertido causa o dano normal de Oco Grande (Q-08; ADR-0002 §8.7). A invulnerabilidade de contato bloqueia só contato (Q-14). Sem empurrão no jogador no MVP (D3 K3; Q-16).
- **Noviça:** mantém 4 corpos; a cada 3 s, um projétil lento (3 corpos/s) telegrafado de branco por 0,5 s, aparável, com dano 18 e Sal de −50% por 3 s (B §3.4 e §3.6). O projétil é o tipo 2 do pool de projéteis, no limite somado de 200/400; as referências usam handle de índice e geração (ADR-0002 §4; D4 §9). Nenhuma arma acerta o projétil inimigo; o projétil lançado continua depois da morte do dono; Sal e pulso não mexem nos relógios de ataque; a morte cancela o telegrafo e o golpe (D4 §9).
- **Sal no jogador:** multiplica a velocidade do joystick (D2 §6); regra S1 da D4 (o maior fator e a maior duração, campo a campo).
- **Telegrafo:** silhueta preenchida a 100% de branco com alfa crescente, nunca só um anel de traço (D4 V6 e §9); telegrafo vermelho de 0,8 a 1,2 s, só esquiva, só no Coroado e no Lanterneiro (B §3.4).
- **Tutoriais:** os prompts de esquiva e de aparo existem (A2.TUTORIAL.02 e .03); aparecem até a ação ser feita uma vez; a janela de aparo ganha 0,1 s (6 passos) só com o prompt de aparo ativo; os bits de tutoriais vistos entram como parâmetro da Vigília, no hash e no replay; o Vitest começa com tudo visto e a Playwright usa `?tutorial=0` (doc 11 §4; Q-26; ADR-0002 §3). `?inicio=MM:SS` começa a Vigília no minuto pedido, e os garantidos de linhas passadas não são entregues (ADR-0002 §14; D3 §9).
- **Estado e testes:** o layout cresce no fim do buffer; os hashes de referência só mudam se o layout mudar, e então mantém-se uma regressão contra o layout anterior (ADR-0007 §1). A regra do laço quente vale também para funções frias, com ≤ 16 B por passo no E4 e no E6, sem lista branca (ADR-0005 §2, ADR-0006 §2, ADR-0007 §8). Os códigos de EVENTO e FORMA só crescem no fim (D5 §9).
- **Telemetria:** `esquiva` (minuto, perfeita, peso) e `aparo` (minuto, sucesso, alvo), só locais (doc 10 §6; Q-30). No MVP nenhuma arma é pesada (B §3.4).
- **Evidências e iPhone:** vídeo de 10 s com esquiva perfeita e aparo e log dos testes de janela (B §4). Build de teste no iPhone logo depois da F-006, pelo GitHub Pages; eu preparo o build, a URL e o roteiro, e a execução no aparelho é sua (brief §9; Q-29).
- **O que nenhum documento dá** (o brief §11.3 lista vários): a ação com stamina abaixo do custo, o perfil e a posição da recuperação da esquiva, a janela do swipe, os números do toque duplo, o centro da Postura Quebrada, a definição do aparo falho, o alcance do Oco Grande, o projétil da Noviça, a ordem do passo, os campos do layout, as constantes de render e a seed do vídeo. São as decisões delegadas deste documento.

## 2. Stamina, esquiva e gestos

Convenção de contagem: o passo em que a simulação lê o comando é o **passo 1** da ação. Ele já conta, é vulnerável e já desloca. "T" é esse passo; "G" é o passo em que a stamina é gasta (o mesmo T).

### Stamina

- **Representação e teto da stamina (ST1). [delegada; veto]**
  - `stamina` é Float32 no registro do jogador, sempre em múltiplos de 0,5. Os custos (25, 15), a devolução (30) e a regeneração (0,5 por passo) são exatos em Float32, então a soma, o teto e a comparação não têm arredondamento a decidir.
  - Teto 100, aplicado com `min(100, …)` em toda soma, inclusive na devolução do aparo. Piso 0. O valor 100 vem de `vigilantes.json` (`stamina`), não de literal no código: o doc 03 prevê "+stamina máxima" por Vigor (fora do MVP).
  - B §3.3 dá `Stamina | 100` sem dizer "máximo". O teto é inferência; sem ele a devolução do aparo levaria a stamina a 115. Por isso o `antes − 15 + 30` do F-006.6 e do F-006.10 só vale com `antes ≤ 85`; no geral é `min(100, antes − 15 + 30)`. **Diverge:** `feature_list.json`, o "como" do F-006.6 e do F-006.10.
  - O cenário pode trazer `staminaInicial` (para provar o teto sem esperar a regeneração).
  - Medida: 5.000.000 passos com gastos 25 e 15, devolução 30 e regeneração 0,5: erro máximo de "múltiplo de 0,5" = 0, faixa [0, 100].
  - Teste: regeneração de 0 a 100 em 200 passos com `stamina * 2` inteiro em todos; devolução com 85 → 100 e 70 → 100 (cortada); gasto exato 25 → 0. Reprova: teto ausente (115), arredondamento, valor 100 escrito no código.
  - Veto: sem teto (a stamina passa de 100).

- **Regeneração e atraso (ST2). [documento, com a contagem delegada]**
  - Documento: 30/s (0,5 por passo) depois de 0,5 s (30 passos) sem gastar; aparo falho de 24 passos sem regeneração (B §3.4; doc 02 §5.2). A contagem exata é delegada.
  - Regra: no passo do gasto, os comandos rodam antes da regeneração, e o passo em que houve gasto **não regenera nem decrementa**. Gasto de 25 (esquiva) ou 15 (aparo): `esperaRegen = max(esperaRegen, 30)`. Os passos G+1 a G+30 não regeneram; a 1ª regeneração é em G+31.
  - Só gasto mexe no relógio da regeneração. Dano tomado, devolução do aparo e ação negada não mexem.
  - Aparo falho (a definição é da §4, AP5 e AP7): decidido no começo da fase do jogador de P0 = c+12 = G+12. Aí `esperaRegen = max(esperaRegen, 24)` e a trava `aparoFalho = 24` (sem esquiva nem aparo de P0 a P0+23). A stamina fica constante de P0 a P0+24 e a 1ª regeneração é em P0+25 = G+37. O controle (aparo vazio) volta em G+31.
  - O que foi resolvido: a área de esquiva contava "gasta e fecha o passo"; a de aparo contava 24 bloqueados de P0 a P0+23; a de estado regenerava depois do gasto no mesmo passo. Fica a contagem da área de esquiva, porque é a única que cumpre as duas frases do F-006.3 ("constante de P0 a P0+24" e "G+30 é o fim do atraso normal", lidos como último passo bloqueado). A ordem "regenera e depois gasta" dá −24,5 em vez de −25 quando a regeneração está ativa; "gasta e depois regenera" dá G+30 ou G+29, conforme o código.
  - Medida: o aparo falho atrasa a stamina só 6 passos (100 ms) em relação ao controle: diferença de 3 pontos. A punição real do erro é a trava de 35 passos sem esquiva nem aparo (c+1 a c+35: janela de 11 e falho de 24), não a stamina.
  - **Diverge:** `feature_list.json`, o "como" do F-006.3 passa a "constante de P0 a P0+24; 1ª regeneração em P0+25 = G+37; controle em G+31" e o do F-006.9 ganha "G+31". Quanto ao "G+30" da letra, não é divergência de documento aprovado, é precisão.
  - Teste: de 100 e de 50 com regeneração ativa, a queda é exata (−25 na esquiva, −15 no aparo) e a 1ª regeneração é em G+31; `max` não encurta um atraso maior (o Frasco da F-007 usa `max(…, 120)`); falho: constante de P0 a P0+24, 1ª regeneração em P0+25, controle em G+31; dano e devolução não mexem no relógio. Reprova: ordem "regenera e depois gasta", `esperaRegen += 24`, `esperaRegen = 24` sem `max`.
  - Veto: somar (`esperaRegen += 24`), com a 1ª regeneração em cerca de G+67. Dá ao falho o peso que o texto de B sugere ("punição do erro"), mas inventa um número que B não dá.

- **Ação negada por falta de stamina (ST3). [delegada]**
  - Com `stamina < custo`, a ação é negada: nada muda (stamina e `esperaRegen` intactos), o comando é consumido e sai o evento `acaoNegada` (forma 1 esquiva, 2 aparo). Sem som, sem flash. Com `stamina == custo` a ação paga (25 → 0).
  - O brief §11.3 pergunta e nenhum documento responde. Porque "100 de stamina = 4 esquivas seguidas" (doc 02 §5.2) só vale se cada uma custa 25 inteiros; "com o que tem" deixaria 1 ponto pagar uma esquiva.
  - Conta: 4 esquivas deixam 0; a 5ª só com 25, depois de 30 + 50 = 80 passos (1,33 s).
  - Teste: 24,5 → esquiva negada com stamina, `esperaRegen` e HP intactos e 1 evento; 25 → paga e fica 0; 14,5 → aparo negado. Reprova: stamina negativa, custo parcial, negação que zera o relógio da regeneração.

### Esquiva

- **Numeração da esquiva (ES1). [documento, com a posição da recuperação delegada]**
  - Duração 21 passos, i-frames 12, recuperação 3, distância 2,5 corpos (B §3.4). Fica: passo 1 = comando (vulnerável, desloca); **passos 2 a 13 = i-frames**; 14 a 18 deslocam, vulneráveis; **19 a 21 = recuperação, dentro dos 21**, sem i-frames e sem aceitar ação. T+21 é o 1º passo livre. 1 + 12 + 5 + 3 = 21.
  - Por que a recuperação fica dentro: as folgas do doc 02 §5.3 (duração − i-frames − recuperação) são 0,10 / 0,08 / 0,08 s nas três linhas, pequenas e parecidas; a de 0,10 s da linha Leve é exatamente passo 1 mais passos 14 a 18 (6 passos). "Depois" daria 24 passos de travamento e contradiria "duração 0,35 s = 21 passos".
  - `esquivaPasso` sobe no começo da fase do jogador e volta a 0 em T+21; o contato do passo T enxerga 1.
  - **Diverge:** `feature_list.json`, o "como" do F-006.1. O Oco é posto para encostar **exatamente** no passo-alvo (posição gravada em K−1, `invulContato = 0`, jogador parado), porque um acerto no passo 1 liga o timer de contato (18) e protege os passos 2 a 18, e esconderia o dano do passo 14. Tabela dos passos 1 a 22: 1 e 14 a 21 causam o dano de contato e ligam `invulContato`; 2 a 13 não causam, não ligam e dão 1 esquiva perfeita (só a primeira); K = 22 é o controle.
  - Teste: tabela de 24 linhas (T a T+23) com `esquivaPasso`, i-frames (só 2 a 13) e se aceita ação (só de T+21 em diante). Reprova: i-frames em 1 a 12 ou 3 a 14, recuperação fora dos 21.

- **Perfil e distância (ES2). [delegada]**
  - 80 px em 21 passos, constante: 80/21 = 3,8095 px por passo (228,6 px/s, 1,59 vez a caminhada de 2,4). Sem rampa; a recuperação só trava ações. Mantém o "80 px em 21 passos" do F-006.9 ao pé da letra.
  - Medida (20.000 posições e ângulos sobre os 54 obstáculos reais, e 200.000 trajetórias no campo livre): no campo livre o total fica em [79,997; 80,003] px (a deriva do Float32 é ±0,003) e o maior passo é 3,81 px.
  - **Diverge:** `feature_list.json`, o "como" do F-006.9 ganha a tolerância "80 ± 0,005 px no campo livre, maior passo ≤ 4 px". O pesquisador propôs ± 0,02; o verificador mostrou que o intervalo largo misturava a deriva com cortes tangentes de obstáculo.
  - Alternativa registrada para o iPhone (Q-29), sem veto agora: 80/18 = 4,444 px por passo nos passos 1 a 18 e parado nos 19 a 21 (mesma distância; maior passo 4,449 px), se o perfil constante parecer "escorregadio".
  - Teste: 80 ± 0,005 px nas 8 direções cardeais e diagonais e em 3 ângulos oblíquos; maior passo ≤ 4 px; costura em x e em y. Reprova: distância fora da tolerância, rampa.

- **Obstáculos e invariante de 32 px (ES3). [documento]**
  - O deslocamento passa pela mesma colisão da caminhada (`colidirComTodos`, com `wrap` e deslize): obstáculo corta a esquiva (a distância fica menor), sem dano (D2 §2 e §9). Nenhum passo passa de 32 px (D2 §2); aqui o maior é 3,81 px.
  - Medida: 18,62% das esquivas são cortadas (média de 62,9 px). Obstáculo corta com frequência, então o teste fixa o caso livre e o cortado em separado.
  - Teste: livre (ES2); contra um obstáculo, distância menor, sem atravessar e sem dano; 1.000 esquivas aleatórias contra a força bruta; asserção de 32 px por passo no toro.

- **Direção da esquiva (ES4). [delegada, swipe por documento]**
  - Contínua (doc 02 §4: "em qualquer direção"), sem quantizar em 8. O tradutor normaliza com `sqrt` em Float64 e grava em Float32 na mira; a simulação normaliza de novo (sem `hypot` nem `atan2`, ADR-0002 §5) para o replay não depender do tradutor. Mira nula ou não finita (inclusive o toque duplo, mira (0,0)) usa a **última direção não nula** do jogador (`dirX/dirY`; no início da Vigília é "para cima", (0, −1)). A direção fica gravada nos 21 passos e o joystick não a muda.
  - Teste: mira (3, 4) → deslocamento por passo (0,6; 0,8) × 3,8095; mira (0,0), NaN e Infinity usam `dirX/dirY`; 360 ângulos de 1° com módulo 3,8095 ± 1e-4; toque duplo no 1º passo da Vigília esquiva para cima.

- **Joystick durante a esquiva (ES5). [delegada]**
  - Nos 21 passos o deslocamento da esquiva substitui o da caminhada. A intenção do joystick continua atualizando `dirX/dirY` (a mira das armas) e o prompt de mover, mas não desloca. Depois do passo 21 o jogador volta a andar a 2,4 px por passo na intenção do momento.
  - O joystick fica como está: a base não se move, o pino segue o dedo e continua visível no congelamento (D2 §9). Se o dedo ficou longe da base, o vetor satura e o jogador anda para lá ao fim da esquiva até o polegar voltar.
  - Teste: com intenção (1, 0) e mira (0, −1) o deslocamento é o da mira e `dirX/dirY` acompanha a intenção; depois do passo 21 anda na intenção; no tradutor, `joystick.ativo` continua `true` e a origem não muda depois do swipe.

- **Travas, buffer e precedência (ES6). [delegada]**
  - Esquiva e aparo só são aceitos fora da esquiva (21 passos), fora da janela do aparo (11) e fora do aparo falho (24). **Sem buffer.** Comando ignorado é consumido sem custo e sem evento; o negado por stamina gera `acaoNegada` (ST3).
  - Esquiva e aparo nunca coexistem (invariante testado: `esquivaPasso > 0` e `aparoJanela > 0` nunca ao mesmo tempo). Com os dois bits no mesmo passo, o aparo vence (a ordem do passo trata o aparo antes da esquiva) e a esquiva é ignorada e consumida, sem custo.
  - Na resolução do acerto no jogador a precedência é aparo (janela 1 a 11) > i-frames > dano. A área de aparo propunha i-frames primeiro; as de ataques e de estado, aparo primeiro. Como os dois estados nunca coexistem, a ordem não muda o resultado; fica a das duas, com o invariante provando a exclusão.
  - Por que sem buffer: nenhum documento fala dele e o número seria inventado. Um buffer curto (os 3 passos da recuperação) fica para depois do build de iPhone, se o "gostoso" pedir (§10, F-010).
  - Teste: 2 comandos de esquiva no mesmo quadro de 3 passos dão 1 esquiva; comando com `esquivaPasso = 10` não faz nada e não custa; os dois bits no mesmo passo dão aparo e nenhuma esquiva; invariante em 10.000 passos aleatórios. Reprova: buffer, esquiva que vence o aparo, comando ignorado que cobra stamina.

- **Solidez com inimigos e contato (ES7). [delegada]**
  - A D3 §9 deixou a escolha. Fica: o jogador ignora os inimigos **só nos i-frames (2 a 13)**, ou seja, o `bloquearPelosInimigos` é pulado. Nos passos 1 e 14 a 21 vale a regra simétrica da D3 (S4): a sobreposição herdada não é expulsa nem cresce, e o jogador nunca é empurrado. Obstáculos continuam duros. O Sal não afeta a esquiva (NV7).
  - Contato nos i-frames não tira HP, não liga `invulContato` e não liga o Sal; do passo 14 em diante é dano normal (coerente com "no passo 14 causa", B §4).
  - Medida: atravessar um Oco de ponta a ponta pede 64 px (raios 16 + 16, duas vezes); os 12 passos de i-frames cobrem 12 × 3,8095 = 45,7 px. Uma esquiva que atravessa um Oco termina o passo 13 ainda sobreposta (≈ 18,3 px) e leva o contato do passo 14. Se os i-frames acabam antes de o centro passar do Oco, o jogador fica travado contra ele (sair é permitido, aumentar não).
  - Efeito de jogo: quem rola dentro de uma horda leva um contato a cada 18 passos fora dos i-frames. É o Q-15 aprovado.
  - Teste: um Oco no caminho: nos passos 2 a 13 a sobreposição pode crescer; no 14 volta a regra (nunca cresce); caso do travamento (esquiva cujos i-frames acabam antes de o centro passar do Oco); obstáculo no mesmo caminho continua duro.

- **Eventos e depuração da esquiva (ES8). (técnica)**
  - Eventos (ET10): 13 `esquiva` (início: x, y do jogador e direção em floats), 14 `esquivaPerfeita`, 19 `acaoNegada`. O teste trava os códigos literais.
  - `__GAME_DEBUG__.jogador` ganha `stamina`, `esperaRegen`, `esquivaPasso`, `poderPassos`, `congelamento` e `facaExtra`. Os nomes finais dos campos do estado estão na §7 (ET1).
  - As constantes (custo, duração, i-frames, distância, regeneração, congelamento, Poder, swipe, toque duplo) moram em `src/dados/combate.json` e o teste lê o JSON, não números soltos.

### Gestos

- **Swipe (GE1). [delegada, o limiar é documento]**
  - Documento: swipe a mais de 400 pt/s com o dedo do joystick (B §3.5; ADR-0002 §12; D2 §9, medido por `timeStamp`).
  - Fica: só o dedo dono do joystick, só no modo vigília (nem pausa nem modal, D5 §9). Anel de **16 amostras** por dedo, em `Float64Array`; janela de 100 ms; Δt ≥ 16 ms; distância ≥ 24 pt (0,4 do raio do joystick); velocidade **estritamente** maior que 400 pt/s. A direção é a da amostra mais antiga da janela até a atual. Re-arme quando a velocidade cai a ≤ 400 pt/s (ou com outro dedo); o joystick não muda. Constantes em `combate.json`.
  - Os 16 do anel vêm do verificador: 8 amostras cobrem só ≈ 67 ms a 120 Hz (ProMotion), menos que a janela. O Δt mínimo barra eventos em lote com o mesmo `timeStamp`. O swipe é avaliado por evento, dentro do laço de `traduzir`, com o `t` de cada um, depois da defesa dos 60 s (D4 P3); é isso que deixa o `injetar('move', …, t0 + 80)` funcionar numa só chamada. Por isso o F-006.5 usa `t0 = performance.now()` e `t0 + 80`; com marcas arbitrárias o tradutor troca tudo por "agora" e o Δt é 0.
  - **Risco para o iPhone (o maior da feature):** a regra literal de B não distingue um swipe de uma inversão rápida do joystick. Nos traços sintéticos (hipóteses, só comparam parâmetros): flick 100%, **inversão 94%** (83% com janela de 50 ms), arrasto comum 9,7 a 11,1%, círculo 30%, tremor 0%. Cada esquiva custa 25 de stamina; a calibração é o build de iPhone (Q-29). Não bloqueia a F-006.
  - **Specs antigos:** `tests/entrada/tradutor.test.ts:190` (60 pt em 16 ms = 3.750 pt/s com Δt = 16) passa a disparar swipe; os arrastos de 70 pt de `e2e/f002.spec.ts` e `e2e/f005.spec.ts` podem passar de 16 ms por CDP num contêiner lento. Os três são revistos no mesmo commit do tradutor (arrastos em passos lentos ou tempo fixo), e a F-001 a F-005 rodam antes de seguir.
  - **Diverge:** `feature_list.json`, o "como" do F-006.5 ganha as marcas `t0` e `t0 + 80`, deslocamento ≥ 24 pt e "stamina 100 → 75, `esquivaPasso` sai de 0, `ultimosEventos` traz `esquiva`".
  - Medida: 50 pt em 80 ms = 625 pt/s dispara; 50 pt em 125 ms = 400 pt/s não.
  - Teste (tradutor): 50 pt em 80 ms dispara; 50 pt em 125 ms não (estrito); 23 pt em 40 ms não (distância); 70 pt no mesmo `timeStamp` não; 60 pt em 15 ms não (Δt); só o dono; pausa e modal não; um 2º swipe no mesmo gesto sem a velocidade cair não dispara. Reprova: anel de 8, `≥ 400`, sem Δt mínimo, sem re-arme.

- **Toque duplo (GE2). [delegada]**
  - Toque = dedo que começa na área do joystick, dura ≤ 200 ms (12 passos) e fica a ≤ 10 pt do início (o "parado" da D4 P3). Toque duplo = 2º `touchstart` na área do joystick ≤ 250 ms (15 passos) depois do fim do 1º e a ≤ 40 pt dele. Dispara **no `touchstart`** do 2º toque, sem esperar o soltar; o 2º dedo segue como dono do joystick. Mira (0,0): vale a última direção (ES4). Só na vigília. O par é consumido: um 3º toque não encadeia. Constantes em `combate.json`.
  - Nenhum documento dá os números (o brief §11.3 pergunta intervalo, distância e direção); não há dado de usuário, calibra no iPhone.
  - Risco (doc 12 §2.6): o Safari documenta supressão de `touchmove` depois de um toque duplo rápido, e o 2º toque é o que vira dono do joystick. O jogador esquivaria e não andaria até soltar e tocar de novo. O retrato de `e.touches` cobre um `touchend` perdido, não um `touchmove` suprimido. Mitigação disponível: `touch-action: none` e listeners não passivos (`bloqueioDeGestos.ts` já bloqueia `dblclick` e `gesturestart`). Item no roteiro do iPhone: "toque duplo seguido de arrasto: o joystick responde?". Sem número novo.
  - Teste: 2 toques de 100 ms com 249 ms e 39 pt disparam no início do 2º; 250 ms e 40 pt disparam, 251 ms e 41 pt não; toque de 201 ms ou de 10,1 pt não conta; fora da área, no botão de pausa e no modo pausa não conta; com o dono do joystick ocupado, o 2º dedo é "outro" e não conta.

- **Do gesto ao comando (GE3). (técnica)**
  - A interface completa de `ComandosDoPasso` está na §7. Aqui só as regras de borda (ET5, ET6): `acoes` (ESQUIVA 1, APARO 2, FRASCO 4 reservado à F-007) e `mira` (Float32 de 2; (0,0) = última direção).
  - Ao vivo: o tradutor trava a borda (`acoes |= bit`) e a fonte a consome no **1º passo vivo** do quadro (D2 §9). Um quadro de 0 passos não a perde; pausa e modal a descartam (`mudarModo` zera, D5 §9); o congelamento não a consome (FB1).
  - No roteiro: lista paralela de ações com passo exato, estritamente crescente e validada; a ação vale **só no passo exato**. Um `TrechoDeRoteiro` hoje vale "do passo em diante" para a intenção; se `acoes` seguisse a mesma regra, a esquiva seria pedida em todos os passos do trecho e dispararia de novo em T+21.
  - Teclado de debug (só no build de debug): Espaço = esquiva na direção do teclado (ou na última).
  - Teste: roteiro com `acoes` em p = 100 e trecho até 400 produz exatamente 1 esquiva; trecho único e trechos repetidos dão o mesmo hash; replay com 1 passo por quadro e com 5 por quadro dá o mesmo hash; `traduzir` com swipe escreve `acoes` e `mira` (módulo 1 ± 1e-7); nada aloca por quadro. Reprova: ação persistente no trecho, quadro de 0 passos que perde a ação.

## 3. Esquiva perfeita e feedback

### Esquiva perfeita

- **Definição e ponto único de acerto (EP1). [documento, com o ponto único (técnica) e os instantes delegados]**
  - Documento: esquiva perfeita = "um acerto teria ocorrido durante os i-frames" (B §3.4; doc 02 §5.3). Contato só conta com `invulContato = 0` (Q-14; D3 §9); golpe de elite e projétil ignoram o timer de contato (Q-14: ele bloqueia só contato).
  - Todo acerto no jogador passa por **um** ponto, `resolverAcertoNoJogador` (contato, golpe do Oco Grande, projétil da Noviça). Ordem: aparo (janela 1 a 11) > i-frames > dano (ES6). Nos passos 2 a 13 ele não tira HP, não liga timers (nem `invulContato`, nem o Sal) e devolve "evitado". `danoAoJogador` continua sendo o único caminho que mexe no HP; a armadura e a Brasa Firme da F-007 ficam depois do teste de i-frames.
  - Instantes: contato, no passo em que a distância fecha; golpe do Oco Grande, no passo em que ele resolve com o jogador no setor (T+36, §5); projétil da Noviça, no passo em que a hitbox dele toca a do jogador.
  - **O que foi resolvido:** a área de esquiva propôs que o projétil evitado não fosse consumido e seguisse; a de ataques mediu que ele some no 1º toque. Fica a de ataques (NV6): o projétil da Noviça some no 1º toque na hitbox do jogador, **qualquer que seja o desfecho** (dano, esquiva perfeita, aparo), e também some no fim da vida (150 passos). Continua depois da morte do dono.
  - O evento `esquivaPerfeita` leva a origem (1 contato, 2 golpe, 3 projétil) e o handle do atacante; a F-009 usa a origem para o +10 de Postura só quando o golpe evitado é do Lanterneiro (Q-15). `CENARIO.jogadorInvulneravel` zera só o HP; o evento e o Poder valem.
  - **Diverge:** `feature_list.json`, o "como" do F-006.12 ganha `invulContato = 0` (contato), uma por esquiva (EP2) e o +1 faca só com Facas na build (EP4).
  - Medida: o timer de contato do código, rodado de verdade: um acerto no passo 1 protege os passos 2 a 18 e o próximo acerto só é possível no 19.
  - Teste: contato nos passos 2 e 13 deixa o HP intacto, `invulContato` em 0 e 1 evento; passo 14 tira 1,5 e liga `invulContato` em 18, sem evento; com `invulContato = 5` no instante, um contato no passo 5 não é perfeito; golpe e projétil nos i-frames são perfeitos mesmo com `invulContato > 0`; esquiva negada não gera nada. Reprova: dano nos i-frames, timer ligado nos i-frames, perfeita com `invulContato > 0` no contato.

- **Uma por esquiva (EP2). [delegada; veto]**
  - Um bit `perfeitaNestaEsquiva` (zera no passo 1) deixa só o **1º acerto evitado** valer. As seguintes não geram evento, congelamento, Poder nem faca.
  - **Diverge:** Q-15 ("seguir B ao pé da letra") e B §3.4: o "um acerto teria ocorrido" ao pé da letra renovaria o efeito a cada acerto.
  - Por quê: o timer de contato não liga nos i-frames, então cada um dos 12 passos com um Oco encostado seria uma esquiva perfeita: até 12 eventos, 12 congelamentos de 5 passos (60 passos, 1 s de simulação parada por esquiva) e 12 facas.
  - Alternativa de veto: sem o limite (ao pé da letra), com esse custo.
  - Teste: 10 Ocos nos i-frames dão 1 evento; duas esquivas encadeadas dão 2 perfeitas; o bit zera no passo 1. Reprova: um evento por acerto.

- **Poder temporário de +15% (EP3). [documento, com a renovação delegada; veto no método]**
  - Documento: +15% de Poder por 2 s (B §3.4; ADR-0002 §3: 2 s = 120). Delegada: **renova** (volta a 120) e **não acumula**; a alternativa era somar 15% por esquiva perfeita.
  - A esquiva perfeita no passo N grava `poderPassos = 120`. O Poder vale nas fases de armas de **N+1 a N+120** (120 fases). Aditivo com as Luvas de Fole (a fórmula é `Base × (100 + poderPct)`; Luvas nv1 8% → 23%). Facas e ondas no ar mantêm o dano fixado na criação (W13); as Espadas e o Círculo leem o dano no golpe ou no tick.
  - O decremento do Poder roda **logo depois das armas** e antes do contato (ordem do passo, ET4). Se rodasse depois do contato, o passo do disparo já tiraria 1 e as armas veriam só 119 passos (medido). O congelamento não gasta o contador.
  - **Duas tabelas de dano vivo**, uma sem e outra com +15 (idem a da onda), refeitas juntas nos mesmos eventos raros do `recalcularDano` (início, nível, carta, baú, União, cópia do buffer e `sincronizarDerivados`). O disparo escolhe a tabela por `poderPassos > 0`. Entrar e sair do Poder só troca o índice: nenhum recálculo.
  - **O que foi resolvido:** a área de esquiva propunha recalcular na entrada e na saída (D5 §9) e estimou 5 B por passo. O verificador refez a medida: a função fria aloca ≈ 3.900 B por chamada nas ≈ 80 primeiras e ≈ 0 depois de ≈ 400; o aquecimento do E6 (27.000 passos) com uma perfeita a cada ≈ 126 passos faz ≤ 430 chamadas, exatamente na fronteira. 10,7 a 11,5 B por passo já medidos + 5,3 = 16,0 a 16,8 B, na beira ou acima de 16. Por isso as duas tabelas, que dão o mesmo valor sem a chamada.
  - **Diverge:** D5 §9 ("dispara o recálculo na entrada e na saída"). Alternativa B no veto: recalcular na entrada e na saída, com o risco medido acima; só passa se o E6 medido couber em 16 B por passo.
  - Teste: cada entrada das duas tabelas é igual ao recálculo por força bruta (com `poderPct` + 15 pela fórmula única, sem número literal); o Poder cobre 120 fases de armas; renovação no meio volta a 120 sem refazer tabela; faca disparada antes da entrada mantém o dano, depois usa o novo; onda idem. Reprova: 119 fases, acúmulo, decremento depois do contato, tabela desatualizada depois de uma carta.

- **+1 faca na próxima salva (EP4). [documento, com a regra do consumo delegada]**
  - Doc 04 §3: "2 facas por salva; esquiva perfeita adiciona 1"; Q-15. Flag `facaExtra` (0 ou 1), ligado pela esquiva perfeita **só com Facas de Sal na build** naquele passo; não acumula (o código reserva exatamente 1 candidato a mais: `MAX_CANDIDATOS = 6`, 5 do nv8 + 1).
  - É consumido pela **próxima salva que dispara de fato** (M > 0): `nf + 1` facas, no nv8 6. Salva sem alvo ou recusada pelo limite 200/400 não consome. Não expira por tempo. A faca extra sai mesmo com 1 alvo (o código distribui por `k % M`).
  - Teste: Facas nv1 com o flag disparam 3 (2 + 1) e o flag zera; duas perfeitas seguidas dão 1 extra; sem alvo o flag persiste até a salva; nv8 dispara 6; sem Facas na build o flag não liga.

### Feedback

- **Congelamento de 80 ms (FB1). [documento, com o `passo` parado delegado; veto]**
  - ADR-0002 §15 item 2 (aprovado): 80 ms valem **5 passos** (4,8 arredondado) e congelam também o relógio. O `passo` parado é a leitura literal de §3 ("só anda o contador de congelamento").
  - Regra (fase 0 da ordem do passo, ET4): `congelamento` é **gravado `= 5`**, não somado; disparado por esquiva perfeita e por aparo bem-sucedido. Com `congelamento > 0` o passo decrementa e retorna: `CAB.passo` e `CAB.relogio` ficam parados, só anda o contador. `avancar` não consulta a fonte nem consome comandos em passo congelado; `avancar(n)` conta os passos congelados entre os n que roda, e cada um consome um passo do acumulador. Posição, RNG, timers e Poder não andam.
  - O render e a entrada não congelam: o render usa `alfa = 1` enquanto `congelamento > 0` (senão `xAnt` e `x` interpolariam vai-e-volta); o tradutor continua lendo e as ações novas ficam pendentes até o 1º passo vivo; o joystick segue visível e o HUD e o áudio continuam. O modal tem prioridade (D5 §9): com modal aberto nada roda e o congelamento pendente roda depois que ele fecha.
  - **O que foi resolvido:** a área de esquiva deixava `passo` e `relogio` parados; a de estado deixava `passo` andar. Fica a da área de esquiva: nenhuma ação de roteiro marcada num passo congelado se perde, e o "t0+1, t0+13, t0+25, t0+37" do F-006.4 continua em passos absolutos exatos. O custo: `__GAME_DEBUG__.passo` deixa de contar os passos de `avancar`, e todo teste e spec da F-006 compara `CAB.passo` e `CAB.relogio`, nunca `inicio + n`.
  - Medida: 80 / 16,667 = 4,8 → 5 passos = 83,3 ms.
  - Teste: depois do disparo, 5 passos com `passo`, `relogio`, posições, RNG, timers e hash inalterados, exceto o byte do contador; o 6º anda; `avancar(5)` devolve 5 passos rodados e `passo`/`relogio` não mudam; esquiva perfeita e abertura de modal no mesmo passo: `avancar` para no modal e os 5 passos rodam depois de fechar; comando pendente roda no 6º. Reprova: `passo` andando, `+= 5`, comando consumido em passo congelado.
  - Veto: só o relógio parado (o `passo` anda e fica à frente do relógio).

- **Flash branco (FB2). [delegada, a contagem é documento]**
  - Doc 02 §4 e B §4: flash branco de 2 frames. Fica: **2 quadros de render** (33 ms a 60 fps, 67 ms a 30), branco `#ffffff`, tela inteira, alfa **0,35**, num `Graphics` da cena Hud acima do mundo e do HUD. Disparado pelo evento (esquiva perfeita e aparo bem-sucedido) lido no render. No máximo **3 flashes por segundo**, somando os dois, controlado no consumidor do anel, fora do estado e do hash.
  - O que foi resolvido: alfa 0,35 (área de esquiva) contra 0,5 (área de aparo); a cadência de 1 por 20 passos (aparo) contra só calcular a esquiva perfeita (esquiva). Fica 0,35 e o limite de 3 por segundo. A esquiva perfeita sozinha chega a 2,86 por segundo (21 passos mínimos entre esquivas), abaixo de 3; com o aparo pode passar, e o limite e a opção "Flashes" cobrem.
  - **Diverge:** doc 11 §5, que dá à esquiva perfeita rastro de brasas, som de sopro e 4 quadros de contorno branco, e doc 11 §1 ("branco só para aparo"). Vale o flash de 2 quadros + congelamento + som agudo de B e doc 02 §4 (Q-00: B prevalece no MVP); o flash branco passa a valer também na esquiva perfeita. O rastro, o sopro e o contorno ficam para depois (§10).
  - **Diverge:** doc 11 §5 e D2 §9 sobre o aperto de câmera de 2% no aparo: **não entra** (B não o pede; D2 §9 deixava a decisão para antes da F-006). Tampouco há flash de acerto no inimigo (D4 V7; o `tintBlend` fica só para o telegrafo).
  - Teste: função pura do flash (alfa por quadro 0,35, 0,35, 0; opção desligada → 0; 4 pedidos em 1 s → 3 flashes); o contador não entra no estado nem no hash; Playwright com o contador de quadros exposto (`__GAME_DEBUG__.flash`) e captura com a simulação pausada (`esquiva-perfeita-390x844.png`, olhada). Reprova: flash contado em passos, flash que some com a opção desligada mas leva o congelamento junto.

- **Opção "Flashes" e a tela de pausa (FB3). [delegada]**
  - "Flashes" (id `A6.PAUSA.FLASHES`, já em `pt-BR.json`) vem ligado por padrão, em `ctx.opcoes.flashes` (memória; o meta da F-007/F-010 grava). Desligado, some só o overlay; o congelamento (que é da simulação) e o som ficam.
  - Pausa: Som e Flashes **lado a lado numa só linha**, logo acima de "números": dois alvos de 136 × 72 pt, vão de 16 pt, e vão vertical de 8 pt até "números". Os alvos novos entram depois do Continuar na lista (o baú usa o índice 1).
  - O que foi resolvido: empilhar Flashes acima de "números" o põe em y = 538 com os insets do iPhone (47/34), abaixo do corte de 543 da zona de controles (65% da altura útil, doc 11 §1; `tests/entrada/alvos.test.ts:76`); Som cairia em 450. Lado a lado, com 8 pt de vão: y = 626 − 8 − 72 = 546 ≥ 543 com insets 47/34, e 580 ≥ 548,6 sem insets. A margem é de 3 pt. Se a medida real cair abaixo do corte, o plano é Som e Flashes em duas colunas na mesma linha de "números" (3 alvos de ≈ 85 pt).
  - **Diverge:** D4 P5/P6 (que mandavam Som e Flashes para a F-006 sem dizer onde) e `e2e/f004.spec.ts:210`, que hoje afirma que `A6.PAUSA.SOM` e `A6.PAUSA.FLASHES` **não** aparecem; passa a esperar os dois.
  - Teste: `alvos.test.ts` com 4 casos de insets (0/0, 47/34, 20/0 e o do baú): sem sobreposição, cada alvo ≥ 72 pt, y ≥ corte; o spec do F-004 revisto.

- **Som placeholder (FB4). [delegada]**
  - B §2 e ADR-0002 §12: 3 buffers sintetizados no boot por funções TS puras, testadas por hash, com limite de vozes e intervalo mínimo por som. **Tocam 2 na F-006:** aparo (metálico agudo) e esquiva perfeita (agudo e curto, distinto do aparo para o jogador separar os dois). O 3º buffer (quebra) é sintetizado e não toca.
  - Tocam pelo evento, no render, nunca pela simulação; respeitam "Som" da pausa, `setMute` e `pauseAll`. Esquiva comum e ação negada não têm som. A Postura Quebrada não tem som próprio; o telegrafo não tem "inspirar" (doc 02 §5.4). Frequências e durações são delegadas.
  - **Diverge:** doc 13 §2.2 e doc 11 §5 pedem "sopro" para a esquiva perfeita; doc 02 §4 pede "som agudo". Vale doc 02 §4 + B (um placeholder por evento, sem timbre definido). O sopro e o rastro de brasas ficam para o áudio e a arte finais.
  - Teste: cada `AudioBuffer` por hash; 1 disparo por evento, com o intervalo mínimo.

- **Câmera lenta leve do tutorial (FB5). [delegada, método diverge]**
  - Doc 11 §4: câmera lenta leve de 0,5 s com o prompt de esquiva. Fica: fator 0,5 durante 500 ms de **tempo real**, aplicado ao `deltaMs` no driver (`rodarFrame`, antes de `avancarAcumulador`), a partir do evento que mostra o prompt de esquiva (o gatilho é da §6). Uma vez só, e só se o tutorial da esquiva não foi visto. Fora do estado, do hash e do replay; o teto de 5 passos e `passosPerdidos` não mudam.
  - Conta: 0,5 s de tempo real × 0,5 = 0,25 s de jogo = 15 passos.
  - **Diverge:** ADR-0002 §3, que dizia "o driver roda 1 passo a cada k frames". Com k = 2 a 30 fps o fator seria 0,25; escalar o `deltaMs` dá 0,5 nas duas taxas.
  - Teste: 500 ms de tempo real rodam 15 passos em vez de 30 e a escala volta a 1 depois; nada entra no hash. Reprova: escala que persiste, que repete a cada prompt.

- **Telemetria "esquiva" (FB6). [documento]**
  - Doc 10 §6: `esquiva` com `minuto`, `perfeita` e `peso`. Só local (Q-30). Uma linha por esquiva realizada (a negada não registra), com `minuto = ⌊relogio / 3600⌋` do início, `perfeita` e `peso = 'leve'` (no MVP nenhuma arma é pesada, B §3.4). `registrar` aceita só esses 3 campos.
  - Gravada no primeiro destes: (a) o evento `esquivaPerfeita`; (b) o quadro em que `esquivaPasso ≥ 14` (a decisão de `perfeita` fecha no passo 14) ou `== 0`; (c) a chegada de um novo evento `esquiva`. Gravar só quando `esquivaPasso` volta a 0 perderia esquivas encadeadas (uma termina e outra começa em T+21).
  - Teste: 3 esquivas (comum, perfeita, negada) dão 2 linhas; duas esquivas encadeadas no mesmo quadro dão 2 linhas, uma perfeita e uma não.

## 4. Aparo, Postura Quebrada e Contra-ataque

Numeração dos passos (a mesma da esquiva, ES1): `c` é o passo em que a simulação lê o comando; `G = c` é o passo do gasto; `h` é o passo em que o golpe é resolvido no jogador. O aparo protege de `c+1` a `c+11`; o passo `c` não protege, como o passo 1 da esquiva.

### 4.1 Aparo

- **Botão Aparo (AP1). [documento, com as margens e o visual delegados]**
  - 80 × 80 pt no canto inferior direito (B §3.5): `x = 390 − insetDireita − 24 − 80`, `y = 844 − insetBaixo − 24 − 80`. Sem insets: x 286 a 366, y 740 a 820. Com a barra do iPhone (baixo 34): y 706 a 786. A margem de 24 pt é a do Continuar da pausa e das cartas.
  - Fica 52 pt à direita da área do joystick (que termina em 234 pt) e entra em `alvosDaVigilia` e em `ALVOS_POR_TELA`, então os testes de "72 pt no mínimo" e "fora dos insets" (F-001.13, F-002.7) o cobrem. A caixa do Frasco (72 pt, 16 pt acima, x 290 a 362) fica reservada para a F-007; a F-006 só prova que ela cabe fora dos insets, da área do joystick e do HUD.
  - Dispara na borda de descida (`touchstart`), não na soltura: a janela é de 11 passos e esperar a soltura custaria até 100 ms. Segurar não repete; cada toque novo é um comando. O dedo que começa no botão tem o papel `botao` até soltar: não cria joystick, não conta para o gesto de pausa (Q-25), e um dedo do joystick que passa por cima do botão não o aciona.
  - Desenhado em `Graphics`, sem texto (anel osso/branco de 3 pt com a seta ⟲ em arco; o branco é do aparo, doc 11 §1). Três estados, lidos do estado da simulação: normal, pressionado (preenchido por 4 quadros de render) e indisponível (anel a 35%: stamina < 15, em esquiva, em janela ou em aparo falho). "Janela ativa" como 4º estado fica para o iPhone.
  - Técnico: o `TradutorDeGestos` tem um único `botao` (a pausa); passa a uma lista de botões, com o papel guardando qual. A ação alternativa de aparo por segundo dedo (doc 02 §4) não existe: sem tela de Opções.
  - Teste: caixa de 80 × 80 fora dos insets (nulos e de iPhone), sem cruzar o joystick nem o botão da pausa, com a caixa do Frasco cabendo acima; no tradutor, o dedo que nasce no botão gera aparo e não cria joystick, e o que passa por cima dele não gera.
- **Quando o toque vale (AP2). [documento, com a mecânica (técnica)]**
  - O comando de aparo é o bit `APARO` (2) de `acoes` (ET5). Ao vivo, a borda é travada no tradutor e consumida pela simulação no primeiro passo vivo do quadro; um quadro com 0 passos não a perde; um toque entre dois quadros gera exatamente um aparo, também com quadros de 2 e de 5 passos.
  - Com modal ou pausa aberta o botão não existe; a pausa e o modal descartam a borda pendente (`mudarModo` zera). O congelamento não consome a borda: ela vale no primeiro passo vivo depois dele. Se o congelamento e a abertura de um modal caem no mesmo passo, o congelamento roda depois que o modal fecha (D5 §9).
  - Por que o consumo e não "o driver zera nos passos seguintes do quadro" (a proposta da área): se o primeiro passo do quadro fosse de congelamento, o zeramento perderia o toque. A mutação "repetir `aparo` em todos os passos do quadro" da área era equivalente (a trava da janela ignora o comando repetido, sem custo), então não provava nada; o teste que a mata está na fonte.
  - Teste: `aparo` = 1 só no passo 0 do quadro (tradutor, quadros de 2 e 5 passos); com `congelamento` > 0 a borda sobrevive e vale no primeiro passo vivo; caso sem trava, com stamina 14,5 no 1º passo do quadro (recusa) e 15,5 no 2º (aceitaria), que reprova "repetir em todos os passos"; roteiro com `acoes` fora de ordem é recusado pela validação.
- **Janela de 11 passos (AP3). [documento no número; a contagem é delegada, com veto]**
  - `aparoJanela` = 12 gravado na fase do jogador do passo `c` e decrementado no começo da fase do jogador de cada passo; a resolução do golpe protege com o contador entre 1 e 11, isto é, de `c+1` a `c+11`. O contador volta a 0 em `c+12`, que é o `P0` do aparo falho (AP7). Sem campo `aparoNovo`.
  - Por quê: B §3.4 diz "11 passos **após** o toque" e "no passo 11 após o toque funciona, no 12 não"; a leitura `c+1..c+11` casa com a convenção da esquiva (o comando é o passo 1 e não protege). Gravar 11 protegeria só 10 passos (medido em protótipo: `h − c` de 1 a 10); gravar 12 protege 11.
  - **Veto:** a leitura `c..c+10` (o passo do toque protege) também cumpre o F-006.2 literal, se o "passo 1 após o toque" for o próprio passo do comando. Escolhemos `c+1..c+11` pela convenção da esquiva. Sem divergência de documento.
  - Medida: com o golpe em `h = 100`, apara quem tocou em `c` de 89 a 99; `c` de 86 a 88 falha (a janela fechou antes); `c = 100` leva o dano.
  - Teste: matriz com `c` de `h − 13` a `h` (só `h−11..h−1` aparam); quadros de 1 e de 5 passos dão o mesmo resultado. Mutações reprovadas: "grava 11" (protege 10), "grava 13", "o comando protege", janela de 10 ou de 12.
  - **Diverge:** feature_list F-006.2 (o "como"): a matriz de `c` × `h` substitui o texto vigente.
- **O que é um "ataque chegando" e onde o aparo se resolve (AP4). [documento no que é aparável; o ponto de resolução é delegado]**
  - Aparável é o ataque com `aparavel: true` em `inimigos.json`: o golpe do Oco Grande e o projétil da Noviça. O contato do Oco das Lanternas não é aparável (doc 02 §5.4: a massa não telegrafa); aparar durante um contato não consome a janela nem anula o dano.
  - O aparo se resolve no contato (passo `h`), não no toque. O toque só arma a janela: tocar durante o telegrafo, com o golpe 1 a 11 passos adiante, é o caso normal.
  - Precedência na resolução única do acerto no jogador (ES6): aparo > i-frames > dano. Esquiva e aparo nunca coexistem (AP8), então a ordem só importa para a prova do invariante.
  - Vários golpes aparáveis resolvidos no mesmo passo `h`: todos são anulados (a janela é consumida no fim do passo). O que cai depois, dentro da mesma janela, não é aparado.
  - Golpe que em `h` não alcança o jogador (ele saiu do arco; o projétil passou ao lado): não há contato, logo nem aparo nem dano; a janela não é consumida e termina conforme o resto (AP7).
  - O aparo é resolvido antes de `danoAoJogador`; o bit `jogadorInvulneravel` do cenário só impede a mudança de HP, então os testes do aparo usam um cenário sem ele.
  - Técnico: o aparo mora na função de resolução do acerto no jogador, que roda antes de `danoAoJogador` (que continua o único caminho do HP). **Diverge:** D3 §3 (redação: "i-frames e aparo são etapas de `danoAoJogador`"); registrado no ADR-0008.
  - Teste: contato do Oco encostado durante a janela dá o dano normal e não consome a janela; golpe aparável em `h` com janela: sem dano, evento `aparo`; dois aparáveis no mesmo passo, ambos anulados; segundo golpe 3 passos depois do primeiro, dano; jogador fora do arco em `h`, sem evento `aparo` e sem dano.
- **Ameaça aparável: `ameacasAparaveis` (AP5). [delegada]**
  - Contador no estado (Uint16), zerado e recontado em todo passo na fase 6 (ataques): +1 por Oco Grande em telegrafo, +1 por Noviça em telegrafo, +1 por projétil tipo 2 com impacto previsto em até 36 passos, isto é, `d² ≤ (36 × 1,6 + 8 + 16)²` = 81,6² px², calculado em linha no laço que já move o projétil. Fica no estado porque é lido no passo seguinte (o falho é decidido no começo da fase do jogador de `c+12`, com o valor do passo anterior).
  - Por quê o prazo de 36: sem ele, a ameaça ficaria "armada" por 95 a 137 passos contra a Noviça (telegrafo de 30 mais o voo de 65 a 107), e quase todo toque errado viraria falho (zona de 84 a 126 passos, com a trava de AP7). Com o prazo a zona do Oco Grande é de 25 passos (36 − 11) e a da Noviça de ≈ 25 a 55. 36 é o telegrafo branco mais longo (0,6 s); os telegrafos de 30 e de 36 contam inteiros.
  - Vermelho (`aparavel: false`) não conta (AP10). Um atacante atordoado ou morto deixa de contar no recontado seguinte.
  - Medida (protótipo): contato a 128 px, raio do projétil 8, 1,6 px/passo: 65 passos de voo, ameaça armada por 95, zona de falho de 84 sem prazo; na distância média da horda (194 px): 107 de voo, 137 armada, zona de 126.
  - Teste: toque a 30 passos do impacto = falho, a 60 = vazio; matriz com Oco Grande e Noviça; mutação "sem prazo" reprova; contador igual ao recontado por força bruta.
- **Sucesso do aparo e a ordem do que ele faz (AP6). [documento no conjunto; a ordem, o teto e o destino do projétil são delegados]**
  - Na fase 6, no passo `h`, para cada ataque aparável resolvido com a janela ativa, em slot crescente do atacante: (1) anula o dano e os efeitos de acerto (o Sal da Noviça não entra no jogador); (2) só na 1ª ocorrência do passo: stamina `min(100, stamina + 30)`, grava `alvoAparado` (slot e geração do atacante; no projétil, do dono), grava o evento `aparo` (15; payload x e y do atacante e a stamina depois), zera `aparoJanela`, pede o congelamento de 5 passos (FB1); (3) 1ª ocorrência: Postura Quebrada em área (PQ1); (4) 1ª ocorrência: arma o Contra-ataque (CA1).
  - O projétil aparado some (slot liberado). Refletir o projétil exigiria um tipo novo e fica para o polimento. O sucesso não é gasto: não reinicia o atraso de regeneração.
  - O 2º atacante do mesmo passo não gera 2º `+30`, 2º Contra-ataque nem 2º `alvoAparado`; todos recebem a Postura Quebrada.
  - Medida: com stamina `v` antes do toque, `v − 15` no toque e `min(100, v − 15 + 30)` no sucesso; entre `c` e `h` não há regeneração.
  - Teste: stamina 60 → 45 → 75; 95 → 80 → 100 (teto); o slot do projétil aparado é liberado e o jogador não recebe Sal; os 3 efeitos de 1ª ocorrência com 2 atacantes no mesmo passo.
  - **Diverge:** feature_list F-006.6 e F-006.10 (o "como"): `min(100, antes − 15 + 30)`. O teto de 100 é a inferência delegada da ST1 (veto na tabela 0.A).
- **Aparo falho, aparo vazio e a punição (AP7). [documento nos números; a definição e a contagem são delegadas, com veto]**
  - Três desfechos para um toque em `c = G`: **sucesso** (AP6); **falho**: a janela termina (fim do passo `c+11`) sem aparar e o contador de ameaças lido do passo anterior é maior que 0 (AP5); **vazio**: a janela termina sem aparar e o contador é 0. O vazio é "aparar sem nenhum ataque chegando" (doc 02 §5.4): só custa os 15 e inclui o toque tarde demais (o golpe já caiu) e o atacante que morreu ou foi atordoado durante a janela.
  - O falho é decidido no começo da fase do jogador de `P0 = c+12 = G+12`, quando o contador chega a 0. Em `P0`: `esperaRegen = max(esperaRegen, 24)`, grava o evento `aparoFalho` (16) e `aparoFalho = 24` (trava de ações, AP8). Os dois contadores são separados: a trava de ações (24) e o atraso da regeneração (`max`) são coisas diferentes, e o Frasco da F-007 usa só o segundo. O vazio grava `aparoVazio` (21), sem trava nem atraso extra.
  - Regeneração (ST2): comandos antes da regeneração; no passo do gasto não há regeneração nem decremento; gasto de 15: `esperaRegen = max(esperaRegen, 30)`. Controle (vazio): 1ª regeneração em G+31. Falho: stamina constante de P0 a P0+24, 1ª regeneração em `P0+25 = G+37`.
  - Por que contar do fim da janela e não do toque: contado do toque, `G+24 < G+30` e o falho ficaria invisível na stamina.
  - Medida: o falho custa 6 passos = 100 ms = **3 pontos** de stamina a mais que o vazio. A punição real é a trava de ações (AP8).
  - **Veto:** os 24 passos sobrepõem o atraso normal (regenera em G+37, proposta). Alternativa: somar (`esperaRegen += 24`, regeneração em ≈ G+67, ≈ 15 pontos a menos de stamina que na proposta). B e o doc 02 §5.2 chamam o falho de "punição do erro"; o número da sobreposição é quase nulo.
  - Teste: stamina constante de P0 a P0+24 e a subida em P0+25 (falho) contra a subida em G+31 (vazio), com a diferença de exatamente 6 passos; toque cedo com telegrafo em curso = falho, sem ataque = vazio, golpe já caído = vazio. Mutações reprovadas: `P0 = c`, `<` por `<=` na regeneração, regeneração antes do gasto, "sem prazo" (AP5), falho com `=` em vez de `max`.
  - **Diverge:** feature_list F-006.3 (o "como"): "constante de P0 a P0+24; 1ª regeneração em P0+25 = G+37; controle em G+31" substitui "P0 a P0+24" com G+30 do texto vigente, que a contagem da área de aparo (P0 a P0+23) violaria. A condição do critério para levar ao usuário (`P0+24 ≤ G+30`) não ocorre.
- **"Vulnerável" e as travas de ação (AP8). [delegada]**
  - "Vulnerável" é "em recuperação" (doc 02 §5.2): durante os 24 passos do falho (`aparoFalho`, de P0 a P0+23), esquiva e aparo são ignorados, sem custo e sem fila. O movimento fica livre. Não há dano extra: o ×1,3 do doc 02 §5.3 é da categoria Pesado, que não existe no MVP.
  - Regra geral das travas (ES6): esquiva e aparo só são aceitos fora da esquiva (21 passos), da janela (11) e do aparo falho (24); sem buffer; o comando ignorado é consumido sem custo nem evento. Total de um toque cedo demais: de `c+1` a `c+35` sem esquiva nem aparo (35 passos; 36 com o passo do toque), aceitos de novo em `c+36 = P0+24`.
  - Esquiva e aparo no mesmo passo (dois dedos, ES6): o aparo vence; a esquiva é ignorada e consumida, sem custo. Invariante testado: `esquivaPasso > 0` e `aparoJanela > 0` nunca coexistem.
  - O Frasco (F-007) não é bloqueado pelo vulnerável.
  - Risco para o iPhone (Q-29): um toque cedo demais deixa ≈ 0,6 s sem esquiva. Se for frustrante, o alívio é deixar a esquiva cancelar a janela, sem falho.
  - Teste: esquiva em P0+10 ignorada (stamina e i-frames intactos), em P0+24 aceita; aparo em `c+5` ignorado sem custo; os dois bits no mesmo passo: aparo aceito e esquiva ignorada; invariante por 10.000 passos de roteiro aleatório. Mutação reprovada: aparo aceito dentro da janela.
- **Aparo com stamina insuficiente (AP9). [delegada]**
  - Tudo ou nada (ST3): com stamina < 15 o comando é negado: nada muda (sem janela, sem stamina negativa, sem falho), o comando é consumido e sai o evento `acaoNegada` (19, forma 2). Com 15 exatos, o aparo é aceito e a stamina vai a 0.
  - A stamina é Float32 em múltiplos de 0,5, com teto 100 e piso 0; o teto vale também na devolução do aparo (AP6).
  - Teste: stamina 14,5 = negado, sem mudança de estado e com o evento; 15 = aceito, fica 0; `acaoNegada` aparece só no negado por stamina (o ignorado por trava não gera evento).
- **Ataque vermelho: regra geral (AP10). [delegada na consequência; o fato é documento]**
  - Vermelho não pode ser aparado (doc 02 §5.4). A regra é dirigida por dado: um ataque com `aparavel: false` nunca é aparado, não consome a janela e o dano entra normal. Não conta em `ameacasAparaveis`, então o toque contra um vermelho vira vazio (ou falho, se houver outra ameaça branca no prazo): custa os 15 e não ganha uma segunda punição além do dano.
  - Um ataque branco que caia na mesma janela depois de um vermelho que já causou dano é aparado normalmente.
  - Nenhum vermelho existe ainda; a regra vale para o Coroado e o Lanterneiro (F-008, F-009) sem mudança de código.
  - Teste: ataque sintético de dado com `aparavel: false` em `h` com janela: HP cai, sem evento `aparo`, janela não consumida, desfecho vazio. Mutação reprovada: aparar o vermelho.
- **Janela de +0,1 s e contador de falhas do tutorial (AP11). [documento no 17 e no contador; a definição de falha é delegada]**
  - A janela do aparo vale 11 + 6 = **17 passos** enquanto o prompt de aparo está na tela e `falhasDeAparo` ≥ 2 (doc 11 §4, ADR-0002 §3). Grava-se `aparoJanela` = 18 no lugar de 12; o `P0` do falho passa a `c+18`. Sem o prompt: 11 e 12. O prompt em si (texto, gatilho, vida) é da §6; aqui só a janela e o contador.
  - `falhasDeAparo` (Uint8) soma 1 quando, com o prompt de aparo visível, ocorre (a) um aparo falho ou (b) um projétil ou golpe que causa dano. Sem (b), quem nunca toca nunca ganharia a janela maior. O vazio não conta. O prompt de aparo some com um aparo bem-sucedido; "repete" (doc 11 §4) passa a significar que a janela maior vale com o prompt ainda na tela.
  - Teste: com o prompt ativo e 2 falhas, o golpe a 17 passos é aparado e a 18 não; sem o prompt, a 11 sim e a 12 não; o contador conta (a) e (b) e não conta o vazio; o contador não conta sem o prompt visível.
- **Indício de "janela de aparo" no render (AP12). [delegada; veto]**
  - O texto aprovado do tutorial manda tocar "no momento do brilho" (`A2.TUTORIAL.03`), mas o aparo se mede no contato e o brilho do telegrafo da Noviça termina 65 a 105 passos antes dele: quem segue o texto toca cedo e falha. A janela de 17 passos também não alcança. Decisão: um indício só de render, sem número novo na simulação. O anel do projétil (e a cunha do Oco Grande) fica branco sólido quando o impacto previsto está a até 11 passos (até 17 com a janela estendida de AP11), para que "o momento do brilho" seja literalmente verdade.
  - **Veto, alternativas:** (a) manter o texto e aceitar o ensino errado; (c) trocar o texto (fora da F-006, é o doc 17). Acrescenta ao render do doc 13 §1.3, sem mudar o texto.
  - Teste: o anel muda para o sólido exatamente quando o impacto previsto cruza 11 (17) passos; o spec do F-006.8 toca o botão com o projétil dentro da janela e confere que `A2.TUTORIAL.03` deixa de estar em `textoAtivo` (o ciclo completo do prompt). O glifo ⟲ do texto é conferido na captura `tutorial-aparo-390x844.png`, olhada.
- **Feedback do aparo (AP13). [documento no conjunto; alfa, cadência e omissões delegados]**
  - Congelamento de 5 passos pedido pelo sucesso (FB1): `congelamento` = 5 (Uint8), sem somar; `CAB.passo` e `CAB.relogio` parados; roda depois do passo `h` inteiro.
  - Flash branco de tela inteira, alfa 0,35, 2 quadros de render, no máximo 3 por segundo somando aparo e esquiva perfeita, limitado no consumidor do anel (fora do estado). O toggle "Flashes" da pausa desliga só o overlay: o congelamento e o som ficam.
  - Som: um dos 2 buffers que tocam na F-006 (3 sintetizados no boot, ADR-0002 §12): metálico agudo curto. A Postura Quebrada não tem som próprio e acompanha o do aparo; o "sopro" e o rastro de brasas ficam para o áudio e a arte finais; o telegrafo não tem som ("inspirar" fora).
  - **Diverge (por omissão):** doc 11 §5 (câmera aperta 2%, D2 §9) não entra; B §3.4 não a lista, e o canvas de tamanho fixo não tem a 2ª transformação de render para isso. Recomendação para o build do iPhone. Também fora, pelo mesmo motivo: a seta de telegrafo na borda da tela (doc 11 §3.6). Flash de acerto no inimigo não vem.
  - Teste: depois de um aparo com sucesso, 5 passos não mudam `CAB.passo`, `CAB.relogio` nem posição, e o hash difere só no contador; dois sucessos a 7 passos geram um flash; com "Flashes" desligado o overlay some e o congelamento fica; o hash do buffer de áudio sintetizado como os outros.
- **Estado, eventos e flag do aparo (AP14). (técnica)**
  - Campos (ET1; depois dos 67.488 B do v5, nada nos 2 bytes reservados): no jogador, `aparoJanela`, `aparoFalho`, `congelamento`, `falhasDeAparo`, `esperaRegen` (Uint8), `alvoAparadoSlot` e `alvoAparadoGeracao`, `ameacasAparaveis` (Uint16); por inimigo, `quebradaPassos` (Uint8); por vaga, `caSeq` e `caEspera` (Uint8); por projétil, `donoSlot` e `donoGeracao` (Uint16). O `dono` fica porque o atacante sempre recebe a Postura Quebrada, o `alvoAparado` e o Contra-ataque contra projétil.
  - Eventos (ET10): `aparo` 15, `aparoFalho` 16, `posturaQuebrada` 17 (x, y, passos; alvo = o inimigo), `contraAtaque` 18 (x, y, slot do alvo, vagas disparadas), `acaoNegada` 19, `aparoVazio` 21; `FLAG.contra` = 8, ligada nos eventos `golpe` e `acerto` da salva extra. O teste trava os códigos literais.
  - Ordem (ET4): o aparo bem-sucedido é gravado na fase 6, depois das armas do mesmo passo; por isso a Postura Quebrada marcada em `h` vale para os acertos de `h+1` em diante, que é o que o Contra-ataque precisa.
  - Teste: `estado.test.ts` trava cada deslocamento; `verificarNaN` e `hashPorSecao` (chave `combate`) cobrem os campos; regressão v5 em cenário `semAtaques`.
- **Laço quente e alocação das funções do aparo (AP15). (técnica)**
  - Tudo em linha: delta toroidal, distância, `(64 + r)²` e a mira do Contra-ataque; números por `Float64Array` de rascunho (`ACERTO`, `MIRA`, `CONSULTA`); handles ≥ 2³⁰ montados em linha; o desfecho do falho e do vazio usa só o contador inteiro, sem ler Float32.
  - Medida (protótipo, horda no passo 1.800, 300 vivos): a varredura de 500 slots custa 24.800 B na 1ª rodada, 20 B na 2ª e 2 B depois de 200 chamadas; pela grade seria 4.000 a 7.000 B por chamada, sempre. A área contou "≈ 0,35 B por passo" dividindo por 72.000 passos, o que não vale para a janela do E6: um aparo frio de 24,8 KB numa janela de 6.000 passos dá ≈ 4,1 B por passo, e 5 aparos ainda frios chegam a ≈ 20,7. Por isso o aquecimento com aparos (≥ 30 antes da janela, partindo de 9.000 passos) é obrigatório nos testes E7a e E7b (VT6), sem lista branca.
  - Teste: E7b com roteiro de esquiva, esquiva perfeita, aparo e Contra-ataque, ≤ 16 B por passo; a mutação `new Float32Array(2)` no Contra-ataque reprova.

### 4.2 Postura Quebrada

- **Centro, raio e hitbox (PQ1). [delegada no centro; a regra da hitbox é documento]**
  - Centro no jogador, na posição do passo do sucesso. Raio de 64 px (2 corpos) mais o raio `r` do alvo (D4 W3): `d² ≤ (64 + r)²`, com `r` = 16 (Oco das Lanternas) ou 24 (médios) — 80 e 88 px —, delta toroidal, `≤` e sem ε. Além disso, o atacante sempre recebe a Postura Quebrada, mesmo fora do raio.
  - Por quê o jogador: o doc 02 §5.4 diz "no atacante **e** em todos num raio de 2 corpos" (a frase não é de B, que só diz "em raio de 2 corpos"); com o centro no atacante, "no atacante" seria redundante. O doc 03 §3 diz "na área" e o Sino é uma área em volta do jogador; D4 W2 chama os "2 corpos" de raio de corpo a corpo, como a aura. Centrar na Noviça não aliviaria o cerco: ela fica em média a 194 a 203 px do jogador, e os vizinhos dela não são os do jogador.
  - Varredura dos 500 slots, uma vez por aparo, em linha (AP15); pula slots vazios.
  - Medida (horda, 300 vivos, 6 seeds, jogador parado): no passo 3.600, a regra da hitbox atinge 32,3 inimigos contra 16,8 pelo centro, e 21,6 em volta de uma Noviça.
  - Teste: Oco a 80 px recebe, a 80 + 1/16 não; médio a 88 recebe, a 88 + 1/16 não (coordenadas Float32 exatas); pelo toro (jogador em x = 5, alvo em x = 1.095); atacante a 128 px recebe. Mutações reprovadas: "pelo centro (≤ 64)", "centro no atacante".
  - **Diverge:** feature_list F-006.10 (o "como" dizia 64 px do centro; passa a `64 + r`). Cumpre a D4 §9 (regra da hitbox).
- **Duração e renovação (PQ2). [documento nos 120 passos; a renovação é delegada]**
  - 2 s = 120 passos, gravados em `quebradaPassos` (Uint8) no passo do sucesso. Renova, não acumula: um novo aparo regrava 120. Decrementa 1 por passo na fase da horda, para todo `quebradaPassos > 0`. Um evento `posturaQuebrada` por inimigo atordoado.
  - Sal e Postura Quebrada coexistem (campos independentes).
  - Teste: `quebradaPassos` = 120 no passo do sucesso e 0 depois de 120; dois aparos 60 passos distantes: volta a 120, não 180.
- **O que o atordoado deixa de fazer (PQ3). [documento no que não persegue; o resto é delegado]**
  - Com `quebradaPassos > 0`: não persegue nem recua; não ataca; o telegrafo e o golpe pendentes são cancelados e a máquina do inimigo volta ao início (ao fim, o próximo ataque começa do zero; o intervalo de 180 da Noviça reinicia). O projétil já lançado continua (D4 §9). Continua separado, bloqueado pelo jogador e pelos obstáculos e empurrado pelo pulso do Círculo (D3 §9). O marcador visual do atordoado é o RE9 (§8).
  - Teste: o Oco das Lanternas que perseguia fica parado por 120 passos e volta no 121º; é separado de outro que o empurra; o pulso o desloca; um Oco Grande com 20 passos de telegrafo restantes não golpeia; o projétil da Noviça em voo continua e acerta ou é aparado.
- **Contato do atordoado (PQ4). [delegada; veto]**
  - O Oco das Lanternas em Postura Quebrada não fere por contato: sai da escolha de `aplicarContato` (uma linha, `quebradaPassos[s] > 0 → continue`). Só ele tem contato; o Oco Grande causa "20 por ataque" e a Noviça "18 por projétil". Dá ao aparo valor defensivo contra o cerco e torna "atordoado" literal; efeito aproximado de ≈ 10 de HP evitados por aparo em cerco.
  - **Diverge:** B §3.6 ("contato 5/s do Oco das Lanternas"), lido sem exceção. **Veto, alternativa:** o contato continua (um Oco imobilizado, colado ao jogador, continua a ferir; não toca em `aplicarContato`).
  - Teste: o Oco encostado atordoado não tira HP e o contato volta no passo 121; o convertido segue as mesmas regras.
- **Tipos imunes (PQ5). [delegada, por dado]**
  - Campo novo `postura_quebrada` por tipo em `inimigos.json` e no schema (a F-006 só preenche os tipos que existem). O Coroado e o Lanterneiro são imunes por dado (`false`); a decisão deles e a do aparo no chefe (+25 de Postura, ou atordoar) são das F-008 e F-009. O atacante "sempre recebe" (PQ1) vale só para quem não é imune.
  - Teste: dado sintético `postura_quebrada: false` ignora a área e o atacante.
- **Empilhamento dos multiplicadores (PQ6). [delegada; veto]**
  - Produto: Postura Quebrada ×2 × nv4 da Espada ×1,5 (só contra atordoado, com o marco) × Contra-ataque ×2. Resulta em ×4 sem o nv4 e ×6 com ele no alvo aparado; contra um atordoado que não é o aparado, ×2 (×3 com o nv4); o Contra-ataque sozinho, ×2.
  - Por quê: o doc 10 §2.2 multiplica fatores independentes e a D4 DN2 lê "×" como produto; o "+50%" do nv4 é um incremento sobre o dano contra atordoado, então entra como ×1,5 desse dano, e não somado aos +100% da Postura. A conta é exata em inteiros (200 × 150 × 200 / 10⁴ = 600). Fecha a DN3 na parte da F-006 (Quebra e Postura Firme ficam para a F-009, também em produto).
  - **Veto, alternativas:** soma (×3; ×3,5 com o nv4); mista (Postura e Contra-ataque em produto, nv4 somado ao fator da Postura: 2,5 × 2 = ×5); nv4 somado à base pela DN2 (muda o valor da tabela por nível).
  - Medida (FOR 6, Poder 0; por acerto): Espada nv4 8,1 → 32,4 (×4) → 48,6 (×6); Espada nv8 9,45 → 37,8 → 56,7; Lâmina 17,325 → 69,3 → 103,95; Facas nv8 2,16 → 8,64; Círculo nv8 1,05 → 4,2. O Contra-ataque da Espada nv8 (4 golpes ×6) dá 226,8 contra o aparado; as 3 armas somam ≈ 274 em produto e ≈ 168 em soma. O Oco Grande tem 220 de HP no minuto 10 com `I` = 1,0: o produto o mata; com a Fogueira (`I` = 1,1, 242 de HP) 226,8 não mata. Pior caso de dígitos (Lâmina, FOR 20, Poder 55%): 434,5 em ×6, 869,1 com a Quebra ×2 da F-009, abaixo de 9.999.
  - Teste: tabela literal dos valores acima; a mutação "soma" reprova (Espada nv4 daria 28,35 e não 48,6); o dígito máximo cabe em 4 casas.
- **Fator por alvo e a Lâmina (PQ7). [delegada na herança da Lâmina; o resto é implementação a partir da D4 §9]**
  - `multStatusPct` da tabela fica em 100. O fator por acerto é lido do inimigo no momento do acerto: se `quebradaPassos[s] > 0`, multiplica o dano por `ACERTO[1]`, um `Float64Array` de rascunho que o chamador preenche com `pqFator` (200 sem o nv4, 300 com) lido de uma coluna nova da tabela por (arma, nível). O marco `dano_pct_vs_postura_quebrada` (hoje lido e ignorado em `tabela.ts:286`) vira essa coluna, acumulando do nv4 em diante: Espada 200 do nv1 ao 3 e 300 do nv4 ao 8; Facas e Círculo 200 sempre.
  - O ×2 do Contra-ataque depende do passo do disparo, não do alvo: é fixado no disparo ou na criação (golpe, tick, faca grava `dano × 2`, onda grava `danoOnda × 2`). O fator de Postura é lido no acerto: a faca em voo que atordoa o alvo depois do disparo já leva ×2.
  - A Lâmina herda o ×3 (`pqFator` 300): a União é a evolução do nv8 e não perde um marco do nv4 (B §3.8: Espada nv8 ×1,5; D4 W18); a onda da Lâmina usa o mesmo fator.
  - Teste: um Oco com `quebradaPassos` = 1 leva o dobro, com 0 não; Espada nv4 leva o triplo; Lâmina 17,325 × 3 = 51,975; faca atordoando o alvo depois do disparo leva o fator (mutação "ler só no disparo" reprova).
- **Crítico amarelo (PQ8). [documento na cor; o critério é delegado]**
  - `FLAG.critico` liga só quando o fator de Postura foi aplicado (alvo atordoado). O Contra-ataque sozinho não é crítico. Cor `#ffd166` e escala ×1,5 (Q-27, D4 N3), já tratadas pelo render; a Quebra (F-009) ligará a mesma flag.
  - Teste: o evento `acerto` leva `FLAG.critico` só com Postura; o Contra-ataque contra um não atordoado, sem a flag.

### 4.3 Contra-ataque

- **Quando começa, estado por vaga e cooldowns (CA1). [documento no "salva extra ×2 em 1,5 s"; o agendamento é delegado]**
  - Imediato: cada arma começa a salva extra no 1º passo vivo depois do sucesso (depois do congelamento, FB1). Os 90 passos (1,5 s) são o teto de teste: a maior salva, a sequência da Espada e da Lâmina no nv8 (4 golpes, 12 passos entre eles), termina em 36. Não há estado de 1,5 s imposto pelo código.
  - Por vaga, `caSeq` (0 = inativo; k+1 = o próximo golpe é o k) e `caEspera` (passos até o próximo). O aparo bem-sucedido põe `caSeq` = 1 e `caEspera` = 0 em toda vaga ocupada. Uma máscara de armas não bastaria: não guarda o progresso de cada sequência.
  - Não mexe nos cooldowns: `recarga`, `golpe`, `esperaGolpe` e `esperaPulso` não são tocados; é uma salva adicional. Os dois podem cair no mesmo passo, a natural primeiro. Um novo aparo reinicia o Contra-ataque (`caSeq` = 1) com o novo aparado; os golpes já dados ficam. Ordem entre vagas: a de W17.
  - **Diverge:** doc 03 §3 ("contra-ataque automático com todas as armas equipadas **por 1,5 s** com dano ×2") não é adotado como buff de 1,5 s; vale B e o ADR-0002 §7 ("uma salva extra"), que o doc 04 §10 ("uma vez de graça") confirma.
  - Teste: recarga, golpe e `esperaPulso` bit a bit iguais a uma execução sem Contra-ataque, a menos dos golpes extras; dois aparos com 20 passos de diferença reiniciam a sequência (4 golpes a partir do 2º); tudo em ≤ 90 passos do aparo. Mutação reprovada: "o Contra-ataque zera a recarga".
  - **Diverge:** feature_list F-006.4 (o "como"): passos absolutos `t0+1`, `+13`, `+25`, `+37`, já que o `passo` fica parado no congelamento (FB1), e asserção nova para o Círculo.
- **Espada e Lâmina (CA2). [delegada, a partir da D4 §9 e da D5 §9]**
  - A sequência inteira do nível (nv8: ida, volta, estocada, ida; a Lâmina herda os 4 golpes). A mira de cada golpe é o vetor unitário do jogador ao aparado, num rascunho `MIRA` (`Float64Array(2)`) que o `golpear` preenche; não sobrescreve `dirX` e `dirY` do jogador, que seguem o movimento. Se `d = 0` ou o aparado é inválido, usa `dirX` e `dirY`. O setor e a estocada acertam o que tocarem, não só o aparado. O ×2 multiplica o dano do golpe.
  - Cada golpe da Lâmina cria a sua onda, na origem e na mira do Contra-ataque, com `danoOnda × 2` fixado na criação. `criarOnda` passa a ler a mira de `MIRA`.
  - Alcance: contra uma Noviça a ≈ 128 px só a estocada (115,2 + r) alcança o aparado; o arco não. Não é defeito: a mira vai para ela.
  - Teste: aparado a 48 px e outro Oco a 40 px do outro lado: o setor mirado no aparado o acerta e não o outro; cada golpe da Espada nv8 com dano 9,45 × 2 × 3 para o aparado; Lâmina com 4 golpes e 4 ondas de dano 13,2 (2 × 6,6) sem o pool de 64 recusar. Mutações reprovadas: mira em `dirX/dirY`; `dirX/dirY` sobrescrito.
- **Facas (CA3). [delegada]**
  - Todas as `nf` facas (2 a 5) saem no mesmo passo, todas no aparado (lista de candidatos = [aparado]), em paralelo e deslocadas (W11), com `dano × 2` gravado no disparo (W13). Saem mesmo sem outro alvo no alcance e mesmo com o aparado além de 192 px; a vida é a normal (30 ou 25 passos). No Contra-ataque a mira é o aparado, sem exigir que esteja no alcance de busca.
  - A faca em linha reta alcança um aparado atordoado, que não se move. Limitação anotada: um aparado a mais de 192 + r px não é alcançado dentro da vida da faca; o alcance de tiro da Noviça é de 192 px (NV2), então o caso não ocorre com o projétil dela.
  - A flag `facaExtra` da esquiva perfeita (§3, EP4) é consumida pela próxima salva que dispara de fato; se for a do Contra-ataque, a faca extra sai nela.
  - Teste: `nf` facas no mesmo passo, todas com `vx, vy` na direção do aparado e `dano` = 2 × o normal; sem outro inimigo no alcance, ainda saem.
- **Círculo de Sal (CA4). [delegada]**
  - Um tick extra no 1º passo do Contra-ataque, com `dano × 2` e o Sal do nível, em todo inimigo que toca a aura. Sem o pulso do nv7 e sem mexer na `recarga` (o tick normal segue no seu relógio). A aura não tem direção: não há redirecionamento.
  - **Diverge:** nenhuma; fecha a pendência do `armas.json` ("F-006: como a aura participa do Contra-ataque"), que sai do arquivo.
  - Teste: 1 tick extra no 1º passo, `dano × 2`, `recarga` e `esperaPulso` intactos; asserção própria no F-006.4.
- **Casos de borda do Contra-ataque (CA5). [delegada, exceto o modal, que é documento]**
  - Aparado morto ou inválido antes de a arma disparar (a Espada da vaga 0 o mata antes das Facas da vaga 1): a arma usa o alvo normal dela (mira no movimento, o mais próximo, a aura) com o ×2 mantido; sem alvo normal, as Facas não saem e a salva é gasta (`caSeq` zera).
  - Vários aparados no mesmo passo: o alvo único do Contra-ataque é o de menor slot; todos recebem a Postura Quebrada.
  - Projétil cujo dono já morreu: a Postura Quebrada em volta do jogador, o `+30` e o Contra-ataque valem, sem `alvoAparado`; as armas usam o alvo normal. O handle reaproveitado (mesmo slot, geração nova) não é tomado como o aparado antigo; a comparação monta o handle em linha.
  - Modal aberto: nenhum passo roda, `caSeq` e `caEspera` ficam parados e o congelamento pendente roda depois (D5 §9).
  - Teste: o aparado morto pela Espada no mesmo passo: as Facas saem para o normal, sem alvo não saem; dois atacantes no mesmo passo: ambos atordoados, `alvoAparado` é o de menor slot; dono morto: aparo ainda dá +30, Postura em volta do jogador e Contra-ataque sem redirecionar; handle reaproveitado ignorado.
- **Telemetria local "aparo" (CA6). [documento nos campos; o que vira linha é delegado]**
  - `CAMPOS_DOS_EVENTOS.aparo = ['minuto', 'sucesso', 'alvo']` (doc 10 §6), exposto em `__GAME_DEBUG__` (Q-30), um registro por desfecho, lido do anel de eventos pela Vigília: sucesso `{ minuto, sucesso: true, alvo: id do tipo do atacante }` (`null` sem atacante válido); falho `{ minuto, sucesso: false, alvo: null }`; vazio `{ minuto, sucesso: false, alvo: null }`. `minuto = ⌊relógio / 3.600⌋`; `alvo` usa o id do JSON (`oco_grande`, `novica_de_sal`).
  - O doc 10 §6 pede só `aparo`; o vazio é linha nova. "Aparos bem-sucedidos por Vigília" (doc 10 §3.1, 10 a 25) conta só `sucesso = true`. A política de agregação junto de `dano_recebido` (1.024 eventos) é da F-007.
  - Teste: um aparo de sucesso grava `{ sucesso: true, alvo: 'oco_grande' }` em `__GAME_DEBUG__.eventos`; falho e vazio gravam as linhas acima; o registro rejeita campos errados.

## 5. Oco Grande, Noviça e Sal no jogador

Aqui fica só a regra de simulação. O desenho (telegrafo no corpo, cunha, faixa, projétil, camada dos médios) está na §8. Contagem: o passo que lê o comando ou decide o ataque é o passo T (ES1); todos os ataques dos inimigos rodam na fase 6 do passo (ET4), depois das armas e dos pickups, com a posição final do passo, e a resolução do acerto no jogador é a única (§3, EP1; precedência aparo > i-frames > dano, ES6).

### Oco Grande

- **Ciclo e período (OG1). [documento nas durações, com o período e a imobilidade delegados]**
  - Telegrafo de 36 passos (0,6 s; T a T+35); golpe no passo T+36; recuperação de 90 passos (1,5 s). Durações de B §3.6 e ADR-0002 §3 (0,6 s = 36; 1,5 s = 90).
  - O passo do golpe é o 1º da recuperação: a recuperação vai de T+36 a T+125 e o próximo telegrafo é T+126. Período 126 passos (2,1 s). O verificador apontou que "90 depois do golpe" daria 127; fica 126, e os testes usam esse número.
  - Nenhum passo cancela o ciclo: se o jogador sai do arco durante o telegrafo, o golpe sai em T+36 com desfecho "errou" e a recuperação é cheia. É o que torna a silhueta verdadeira.
  - Por quê: nenhum documento diz quando o telegrafo começa nem se o corpo anda na recuperação; a imobilidade é inferência de "1,5 s de recuperação". (A frase "ensina punição pós-ataque" é do doc 05 §5, sobre o Autômato de Orun, e não da D4 §9.)
  - Medida: 126 passos; 20 de dano a cada 2,1 s = 9,5 de dano por segundo por Grande no minuto 0 e 18,6 no minuto 19 (dano 39).
  - Teste: telegrafo em T, golpe em T+36 (não T+35 nem T+37), próximo telegrafo em T+126 com o jogador parado; jogador a 79 px em T e a 200 px em T+36: evento de golpe "errou" e próximo telegrafo em T+126. Reprova 35, 37, 89, 91 e 127.

- **Gatilho e enraizamento (OG2). [delegada; veto]**
  - O Oco Grande começa o telegrafo no passo em que o centro do jogador está a d ≤ 80 px (alcance 64 + hitbox 16 do jogador, OG3). Fica enraizado do passo T ao T+125: a posição não muda pelo comportamento. O Sal e o afastamento do pulso continuam valendo (OG9), e a separação, o bloqueio S4 e os obstáculos também.
  - **Diverge:** B §3.6 lido ao pé da letra ("Para a 1,5 corpo; telegrafo branco 0,6 s" = anda até 48 px, para e só então telegrafa), e **a D3 §9, que mantinha o movimento provisório da S6 durante os ataques: a S6 continua valendo fora do telegrafo, mas o telegrafo e o golpe enraízam o corpo**.
  - Por quê: na horda real só 4% a 21% dos Grandes chegam a 48,5 px (a multidão os segura longe). Com o gatilho em 80 px atacam de 1,3 a 2 vezes mais. Com o gatilho literal, um terço a metade dos ataques some.
  - Alternativa de veto: gatilho literal (parar a 48 px e só então telegrafar), com esse custo. Registrar também que um Oco parado a 79 px tem 1 px de margem: um passo de 2,4 px do jogador já sai do arco, e o jogador tem 36 passos para isso.
  - Medida (jogador parado, seeds 1 a 8, só o garantido e os sorteados do minuto 1): o 1º Grande chega a 80 px entre os passos 230 e 329 depois das 1:00 (3,8 a 5,5 s); 2 a 5 Grandes já nascem no passo 1, então o garantido não é necessariamente o primeiro. Fração dos Grandes vivos a ≤ 80 px: 38,7% (Espada nv1, linha 6), 17,8% (linha 19), 29,1% e 7,0% (3 armas nv8).
  - (técnica) Gatilho, mira, relógios e evento só na fase 6 (com a posição final e `dx, dy, d` recalculados por médio vivo, ≤ ≈ 200 por passo); `moverHorda` só lê `ataqueFase` e zera o deslocamento de comportamento quando a fase não é "livre". O Oco que decide telegrafar no passo T anda ainda no T (a horda roda antes) e a posição do passo T vale até T+125.
  - Teste: Oco a 79,9 px telegrafa e a 80,1 px não; posição constante de T a T+125 (jogador parado, sem empurrão); Oco que morre no passo em que iria telegrafar não emite evento.

- **Alcance e geometria do arco (OG3). [delegada]**
  - Setor de 120° com vértice no centro do Oco, raio 64 px (`alcance_corpos` = 2, preenche o pendente do brief §11.3 e de `inimigos.json`), contra a hitbox circular do jogador (raio 16): o jogador é atingido com o centro a até 80 px. É a regra W3 da D4 (acerto ao tocar a hitbox, `≤`, sem ε), agora do inimigo contra o jogador. Cosseno literal 0,5 (120°; ADR-0002 §5); outro ângulo no dado falha na carga.
  - Por quê: igual à Espada nv1 a nv4 (64) e menor que a nv5 em diante (76,8), como a D4 §9 pede para ler a esquiva. A Espada alcança o Oco Grande a 88 px (64 + 24) e ele alcança o jogador a 80: 8 px de vantagem do jogador. O Oco para a 48 px, então o jogador parado está 32 px dentro do arco; sair a pé leva 14 passos, dentro dos 36.
  - Teste: jogador à frente a 80 px exatos acerta e a 80 + 1/16 não (ambos exatos em Float32); a 60° do eixo e a 48 px acerta; a 90° não; atrás (180°) a 48 px não; vale na costura do toro. Reprova raio medido ao centro do jogador (79,9 acertaria, 80 não).

- **Mira fixa no início (OG4). [delegada; representação (técnica)]**
  - A direção é o vetor unitário do centro do Oco ao centro do jogador no passo T (delta toroidal; com d = 0, a mira do jogador), guardada em `miraX` e `miraY` (Float32) e congelada até o golpe. O vértice do setor é o centro atual do Oco: se o pulso o empurrar, o arco acompanha o corpo com a direção fixa.
  - Por quê: a silhueta no chão é a verdade (D4 V6); uma direção que gira até o último passo a tornaria ilegível. Um índice de 256 direções exigiria buscar numa tabela em função fria: ler 256 valores no interpretador aloca da ordem de milhares de bytes por chamada (cada leitura de `Float32Array` vira um HeapNumber, ADR-0007 §8); o vetor Float32 sai de graça do laço.
  - Teste: jogador a 90° do eixo em T e a 0° em T+36: o golpe não acerta; pulso em T+12 desloca o corpo e o golpe sai com o vértice novo e a mesma direção. Reprova mira lida no golpe.

- **Golpe: instante e ordem (OG5). [delegada; a ordem do passo é a ET4]**
  - O golpe é instantâneo no passo T+36 (D4 W2), na fase 6, depois de a fase do jogador (esquiva, aparo, movimento) ter atualizado o passo. O setor é testado contra a hitbox do jogador **na posição daquele passo**. Desfecho no evento `golpeInimigo` (12): 1 acertou, 2 esquivado, 3 aparado, 4 errou (ET10), pela resolução única (aparo > i-frames > dano).
  - Quem morreu no passo (varredura das armas) não golpeia: o evento e o dano não saem (D4 §9). Por isso a fase dos ataques vem depois das armas e dos pickups.
  - A esquiva perfeita usa a posição real do passo do golpe, não uma projeção. Consequência de design: rolar para dentro do arco ou de lado (a ≤ 80 px, dentro dos 120°) dá a perfeita; rolar para longe (80 px em 21 passos) tira o jogador do alcance e não dá o bônus. Contas: um Oco a 48 px, com o jogador rolando para trás, fica a ≈ 98 px no passo 13 (fora); rolando de lado, a ≈ 69 px e ≈ 46° do eixo (dentro). Depende do perfil de deslocamento da §2 (ES2).
  - **Diverge:** D4 §4 e ADR-0006 §1 (a lista de fases do passo ganha a fase 6, "ataques dos inimigos"); registrar no ADR-0008. A área de ataques propôs "depois das mortes" e as de aparo propuseram "antes das armas"; ficou depois, porque a morte antes do golpe é documento (D4 §9) e a Postura Quebrada marcada em `h` vale para os acertos de `h+1` em diante, que é o que o Contra-ataque precisa.
  - Teste: três golpes idênticos com o jogador (a) parado (dano), (b) na esquiva com o passo 13 coincidindo com T+36 (esquivado, perfeita) e (c) com o passo 14 (dano); golpe no mesmo passo em que o jogador começa a esquiva (passo 1, sem i-frames: dano; passo 2: esquivado); Oco morto pela Espada em T+36 não golpeia; modal aberto no passo do golpe: ataques e contato do passo ainda rodam.

- **Dano e escala (OG6). [documento, com o caminho técnico]**
  - Dano = campo `dano` do inimigo, fixado no spawn pela escala do minuto inteiro decorrido (Q-10; B §3.6: 20 por ataque × (1 + 0,05·min)): 20, 21, 23, 39 nos minutos 0, 1, 3, 19 (Float32 exato). Um Grande nascido no minuto 1 golpeia com 21 no minuto 5.
  - Entra por `danoAoJogador`, único caminho do HP, com uma origem nova `golpe`; sem armadura e sem Brasa Firme (F-007). Dois golpes no mesmo passo somam. Sem empurrão no jogador (D3 K3; Q-16: só o Grito empurra). O dano passa por um rascunho `Float64Array`, não por argumento double (regra do laço quente, ADR-0005 §2).
  - Teste: HP cai 21 num golpe do Grande nascido no minuto 1; sem empurrão (posição igual antes e depois, parado); escala fixada no spawn. Reprova dano lido no golpe com o minuto atual.

- **Invulnerabilidade de contato (OG7). [documento]**
  - O golpe ignora `invulContato` e não o liga (Q-14: o timer "bloqueia só dano de contato, para um encostão não 'comprar' imunidade a um telegrafo").
  - Teste: com `invulContato` em 18, o golpe tira HP e o timer continua em 18. Reprova golpe bloqueado pelo timer.

- **Oco Grande convertido (OG8). [documento]**
  - O convertido (excedente do diretor, HP agregado) ataca como qualquer Oco Grande: telegrafo, golpe, recuperação, dano normal. A máquina de ataque é função do tipo; o campo `convertido` só muda HP, XP e Almas. Q-08: "causa o dano normal de Oco Grande"; ADR-0002 §8.7 diz o mesmo.
  - Teste: convertido a 80 px telegrafa e golpeia com dano de Oco Grande; o HP agregado não altera o ciclo.

- **Sal, pulso e morte no ataque (OG9). [documento]**
  - Transcrição da D4 §9: o Sal do inimigo reduz só a velocidade de aproximação e não mexe em nenhum relógio de ataque; o afastamento do pulso empurra o corpo, não cancela nem adia o telegrafo, e a silhueta acompanha o corpo; a morte cancela o telegrafo e o golpe pendente; o projétil já lançado continua.
  - (técnica) A morte zera os campos de ataque em `removerInimigo`, para o slot reaproveitado pelo diretor no mesmo passo nascer em repouso.
  - Teste: Grande com Sal 50% telegrafa e golpeia nos mesmos T e T+36; pulso em T+10 desloca o corpo e o golpe sai em T+36; morte em T+36 não deixa evento; slot reutilizado nasce em repouso.

- **Postura Quebrada sobre o ataque (OG10). [delegada]**
  - Enquanto `quebradaPassos > 0` o inimigo não persegue nem recua, não ataca e continua separado, empurrado e bloqueado (D3 §9; duração e raio são da §4, PQ1 e PQ2). O telegrafo em curso é cancelado (sem golpe, sem projétil) e a máquina fica em repouso. Quando acaba, o Oco Grande volta a "livre" (pode telegrafar no mesmo passo se o jogador estiver no gatilho) e a Noviça volta com a espera cheia de 180. O projétil já lançado continua.
  - Efeito de design a registrar: depois de um aparo, a Noviça aparada some do jogo por 300 passos (120 + 180, 5 s) e o Oco Grande por 120 (menos de 126 do ciclo, mas mais que os 90 da recuperação).
  - O Oco das Lanternas atordoado não fere por contato (veto) está na §4 (PQ4); aqui só vale que o atordoado não ataca. Coroado e Lanterneiro são imunes por dado (PQ5); como eles reagem é das F-008 e F-009.
  - Teste: Grande atingido em T+20 não golpeia em T+36 e telegrafa de novo só depois do fim; Noviça em T+10 não lança em T+30 e o 1º telegrafo seguinte vem 180 passos depois do fim. Reprova cancelar só o golpe.

- **Ameaças aparáveis e vermelho (OG11). [documento no vermelho, com a contagem delegada]**
  - A fase 6 zera e recalcula `ameacasAparaveis` em todo passo (a regra do falho é da §4, AP5): +1 por Oco Grande em telegrafo, +1 por Noviça em telegrafo, +1 por projétil tipo 2 com impacto previsto em ≤ 36 passos. O telegrafo vermelho (`aparavel: false`, B §3.4: só esquiva) não conta e não é aparável.
  - Vermelho não é implementado nem testado na F-006. A máquina de ataque é guiada por dados (`telegrafo.duracao_s`, `cor`, `aparavel` em arrays por tipo, em passos) e o desfecho do golpe consulta o bit antes do aparo; o dado `aparavel = true` dos dois ataques é conferido. Coroado e Lanterneiro reusam isso (F-008, F-009).
  - Teste: arrays por tipo batem com `inimigos.json` (36, 30, 90, 180, aparável 1 para os dois).

### Noviça

- **Ciclo (NV1). [documento nas durações, com o período delegado]**
  - Telegrafo de 30 passos (0,5 s; T a T+29); o projétil nasce no passo T+30; a espera seguinte é de 150 passos; o próximo telegrafo começa em T+180 (3 s, `intervalo_s` e B §3.6). Espera inicial 0: nasce pronta e telegrafa assim que entra no alcance de tiro (D4 W16).
  - Enraizada no telegrafo (T a T+29); fora dele volta a manter 4 corpos (D3 S6/S7: aproxima ou recua até 128 px). É emenda à D3 §9, igual à do Oco Grande.
  - Se o jogador sai do alcance durante o telegrafo, ela lança mesmo assim, com a mira congelada. Se a espera acaba com o jogador fora de 192 px, ela espera pronta (o período de 180 só vale em alcance).
  - Teste: evento em T, projétil em T+30 (não T+29 nem T+31), segundo telegrafo em T+180, 3 lançamentos em 540 passos sem Noviça nova; Noviça morta em T+15 não lança; enraizada de T a T+29; jogador a 190 px em T e a 400 px em T+30: lança.

- **Alcance de tiro (NV2). [delegada]**
  - 192 px (6 corpos) de centro a centro: a Noviça telegrafa a d ≤ 192 e não a 192 + 1/16. Menor que a meia-largura da tela (195 pt), então ela só atira de dentro da vista (o anel de spawn vai de 468 a 624 px) e nenhum telegrafo da F-006 acontece fora de vista. É o alcance de busca das Facas (D4 W9).
  - Medida: a 1ª Noviça chega a 192 px entre os passos 141 e 187 depois do relógio 3:00 (2,4 a 3,1 s). Fração das Noviças a ≤ 192 px com o jogador parado: 94,9% (Espada nv1, linha 6), 50,2% (linha 19), 89,0% e 43,7% (3 armas): na linha 19 metade não atira.
  - Teste: 191,9 px telegrafa e 192,1 não. Reprova alcance de 128.

- **Mira fixa no início (NV3). [delegada]**
  - Mesma regra do Oco Grande (OG4): vetor unitário do centro da Noviça ao jogador no passo T, congelado; a faixa no chão mostra a trajetória real. Sem perseguição.
  - Medida (projétil a 1,6 px/passo, jogador em linha reta): parado, 100%; andando a 2,4 px/passo, 5,3% (Noviça a 192 px) a 7,5% (a 128); com Sal (1,2 px/passo), 7,5% a 10,3%. Mirar no fim do telegrafo daria só 2 a 3 pontos a mais.
  - Risco de design a manter: um jogador que não para quase nunca é atingido; a Noviça é pressão por Sal e por obrigar a se mexer, e o aparo só se ensina com quem fica parado (TU3). Se o tutorial precisar de mais acertos, a saída é vida/velocidade ou mira à frente, nunca mudar B nesta feature.
  - Teste: o jogador muda de posição depois de T e a trajetória não desvia (velocidade do projétil = vetor de T × 1,6). Reprova mira no fim.

- **Projétil: tamanho, vida, velocidade, nascimento (NV4). [delegada]**
  - Velocidade 3 corpos/s = 1,6 px por passo. Hitbox de raio 8 px (0,25 corpo, o da faca). Vida 150 passos (2,5 s; 240 px): cobre o tiro de 192 px com 48 px de sobra e é menor que o período (180), logo no máximo 1 projétil vivo por Noviça. Dados: `raio_corpos` 0,25 e `vida_s` 2,5 saem dos pendentes de `inimigos.json`.
  - Nasce no centro da Noviça no passo T+30 com `xAnt = x` e só anda e testa acerto a partir do passo seguinte (D4 W9). Cada passo move (`Math.fround(x + vx)`) e testa d² ≤ (8 + 16)² contra o centro do jogador, pelo delta toroidal.
  - Dano copiado do campo `dano` da Noviça no lançamento (fixado, D4 W13): 18 × (1 + 0,05·min do spawn). Valor do Sal que ele leva: NV7.
  - Tempo de voo até a Noviça a 128 px: 65 passos; a 192 px: 105.
  - O desenho (disco branco de 16 pt, anel, faixa) é da §8.
  - Teste: lançado em L, está em `x0 + vx` em L+1; contato a 24 px acerta e a 24 + 1/16 não; some em L+150 e nunca vive mais; o dano é o do lançamento mesmo que a Noviça morra.

- **Pool, dono e capacidade (NV5). [técnica, com a verificação de capacidade delegada]**
  - Tipo 2 no pool de projéteis das facas (`TIPO_DE_PROJETIL.sal`), contando no limite somado de 200 ou 400 com os efeitos de chão (ADR-0002 §4; D4 §9): `limiteDeProjeteis` não muda. `moverProjeteis` pula o tipo 2; a fase 6 o move e o testa contra o jogador, no mesmo laço que recalcula as ameaças (OG11).
  - Dono em dois campos, `donoSlot` e `donoGeracao` (Uint16), checados em linha (`pool.geracao[slot] === donoGeracao`); o handle só é montado dentro de `gravarEvento`. O handle `geração × 65.536 + slot` em Uint32 passaria de 2^30 com a geração ≥ 16.384 e viraria HeapNumber (ADR-0005 §2; D4 §10). Custo de layout igual (400 × 4 B).
  - A Noviça confere a capacidade ao **iniciar** o telegrafo (pool no limite: não inicia, tenta no passo seguinte), para o telegrafo nunca mentir. Se mesmo assim estiver cheio no lançamento, recusa e soma em `projeteisRecusados` (já existe). Como o máximo medido é 35 projéteis de 200 (jogador parado, linha 19; 20 na horda), a versão mínima (só recusar no lançamento) bastaria; fica a conferência no início pelo custo de um teste a mais.
  - Teste: com o pool no limite a Noviça não inicia o telegrafo; limite atingido entre T e T+30: lançamento recusado e `projeteisRecusados` + 1; dono com geração 20.000 forçada lido sem alocação; dono inválido depois que o slot é reaproveitado.

- **O que o projétil acerta e quando some (NV6). [documento no que atravessa, com o desfecho delegado]**
  - Documento: nenhuma arma acerta o projétil inimigo (D4 §9: o tutorial do aparo depende disso); obstáculos não o bloqueiam (D2 O6); o projétil já lançado continua depois da morte do dono (D4 §9); i-frames valem contra projéteis (doc 02 §5.3).
  - Some no 1º toque na hitbox do jogador, qualquer que seja o desfecho (dano, esquiva perfeita, aparo), no próprio passo; e no fim da vida (150). Com `jogadorInvulneravel` ainda é consumido e gera o evento, sem HP e sem Sal. O toque usa o evento `golpeInimigo` (12) com forma `projetilSal` (8) e o desfecho 1 a 3.
  - **O que foi resolvido:** a área de esquiva propôs que o projétil evitado seguisse (e pudesse acertar depois dos i-frames); a de ataques mediu que consumi-lo é determinístico e dá no máximo uma esquiva perfeita por projétil sem um conjunto de "já tocou". Fica consumir.
  - Teste: faca e Espada com o projétil no meio do alcance: ele segue com a mesma `vida`; atravessa obstáculo; sobre o jogador em esquiva (passos 2 a 13): some, sem dano, esquiva perfeita; em aparo: some, anulado; em dano: some, HP cai 18, Sal ligado; dono morto em T+40: o lançado em T+30 continua e acerta em T+95. Reprova projétil que sobrevive ao toque.

### Sal no jogador

- **Sal e o deslocamento do jogador (NV7). [documento no efeito, com as exceções delegadas]**
  - Documento: Sal = −50% de velocidade por 3 s (B §3.6; doc 04 §8); o Sal multiplica a velocidade do joystick (D2 §6: "O Sal (F-006) multiplica esse valor"); regra de reaplicação da S1 da D4: fica o maior fator e a maior duração, campo a campo.
  - Campos `salPct` e `salPassos` (Uint8) no registro do jogador, fora dos 2 bytes reservados de `JOGADOR_U8` e depois dos 67.488 B do v5 (ET1). O acerto do projétil que tira HP faz `salPct ← máx(salPct, 50)` e `salPassos ← máx(salPassos, 180)`. O timer cai uma vez por passo, também durante a esquiva; acaba no passo 180 depois do acerto.
  - O fator vale só na caminhada: `v × (100 − salPct) / 100`, em linha, de 2,4 para 1,2 px por passo; em 180 passos o jogador anda 216 px em vez de 432. **Não afeta a esquiva** (perfil constante 80 px em 21 passos, ES2), nem empurrões, nem o bloqueio S4. Por quê: B fixa a esquiva em 21 passos e 2,5 corpos sem modificador, e a 50% ela duraria 42 e quebraria as janelas.
  - O projétil que a esquiva perfeita ou o aparo consome não aplica Sal. `jogadorInvulneravel` bloqueia o Sal.
  - Teste: acerto liga 50/180; segundo acerto renova (máx); 1,2 px por passo com Sal e 2,4 sem; a esquiva sob Sal desloca os mesmos 80 px em 21 passos; Sal acaba no passo 180 (e em 179 não). Reprova Sal aplicado no aparo ou na esquiva perfeita, e esquiva a 50%.

## 6. Tutoriais

Os textos já existem em `src/dados/textos/pt-BR.json`: A2.TUTORIAL.02 "Deslize rápido para esquivar" e A2.TUTORIAL.03 "Toque em ⟲ no momento do brilho para aparar" (IDs do doc 17; limite de 12 palavras). Não nasce texto novo. O estado vivo de cada prompt (`promptEsquiva`, `promptAparo`: aguardando, visível, cumprido; e `falhasDeAparo`) fica no registro do jogador (3 bytes depois dos 67.488 B do v5, ET1), no estado e no hash, como o de mover (ADR-0002 §3).

- **Prompt de esquiva (TU1). [delegada no gatilho; doc 11 §4 na intenção]**
  - Gatilho: o 1º evento `telegrafo` (11) de **qualquer** Oco Grande com o bit de esquiva ainda não visto. Fica visível (A2.TUTORIAL.02) até a esquiva ser **aceita** (a negada por stamina não cumpre; o prompt de mover é D2 §7). Sem prazo: continua na tela mesmo depois de o Oco Grande errar o golpe ou morrer.
  - **Diverge:** doc 11 §4 ("1:00 | Oco Grande telegrafando": o instante de 1:00) e o "como" do F-006.8 ("a partir de 1:00"). A intenção do doc 11 (o prompt aparece quando o Oco Grande telegrafa) é a que se cumpre; o evento chega ≈ 3,8 a 5,5 s depois das 1:00 com o jogador parado (D3 §9 já avisava), e o relógio ≥ 3.600 na condição é redundante, porque os Grandes só nascem a partir da linha 1.
  - Por quê "qualquer": o garantido nasce junto de 1 a 4 Grandes sorteados (2 a 5 no passo 1) e não há como distingui-lo sem um campo novo por inimigo.
  - Risco, para o balanceamento: o Oco Grande (0,7) é mais lento que o jogador (1,0). Quem anda em círculo de ≈ 480 px de raio só vê o prompt depois de 1.061 passos (seed 7) ou nunca em 1.500 (seed 6).
  - Teste: antes do 1º telegrafo, `promptEsquiva` é "aguardando" mesmo com o relógio em 3.700; no passo T vira "visível"; segue visível depois do golpe e da morte do Oco; uma esquiva aceita o cumpre; uma negada não; com o bit pré-visto nunca aparece. Reprova gatilho por relógio.

- **Prompt de aparo (TU2). [delegada]**
  - Gatilho: o 1º evento `telegrafo` de **Noviça** com o bit de aparo não visto. Como a Noviça só entra na linha 3, a 1ª é a garantida; se ela morrer antes de atirar, o prompt espera a próxima. Fica visível (A2.TUTORIAL.03) até um **aparo bem-sucedido** (de qualquer ataque aparável); um toque sem ataque, o aparo vazio e o aparo falho não cumprem.
  - Também sem prazo: continua na tela depois de o projétil sumir.
  - Teste: aparo bem-sucedido cumpre; toque sem ataque não; com `?tutorial=0`, o F-006.2 roda sem prompt (janela de 11).

- **Falhas e janela de 17 passos (TU3). [delegada; "repete" interpretado]**
  - Conta uma falha em `falhasDeAparo` (Uint8) quando, com o prompt de aparo visível, (a) o aparo é falho (§4, AP5) ou (b) um ataque aparável (golpe ou projétil) causa dano. O aparo vazio não conta. Sem (b), quem nunca toca nunca ganharia a janela maior.
  - Com `promptAparo` visível e `falhasDeAparo ≥ 2`, a janela do aparo passa de 11 para 17 passos (11 + 6; 0,1 s = 6 passos, ADR-0002 §3 e doc 11 §4): o aparo protege os passos c+1 a c+17. Vale também para o golpe do Oco Grande enquanto o prompt está na tela. Quando o prompt cumpre, a janela volta a 11. Em passos: 17 × 1,6 = 27,2 px de voo do projétil contra 17,6 px.
  - **Diverge:** doc 11 §4 ("1 vez; se falhar 2 vezes, repete com janela +0,1 s") na forma: o prompt não some e volta; "repete" passa a significar "a janela de 17 começa a valer com o prompt ainda na tela". Alternativa descartada: o prompt some no fim de cada ataque e volta no seguinte (mais fiel a "repete", mais estado).
  - Teste: duas falhas ligam a janela de 17; aparo no passo c+17 funciona e no c+18 não, só com o prompt visível; com o prompt cumprido ou `?tutorial=0`, o passo c+12 não funciona; o aparo vazio não conta. Reprova janela estendida sem as duas falhas ou depois de cumprido.

- **Dois prompts na tela (TU4). [delegada]**
  - Se os dois estão "visíveis", mostra-se um só texto: o de índice maior (aparo, o mais recente). O de esquiva volta quando o de aparo cumpre; nenhum se perde.
  - Teste: os dois visíveis mostram A2.TUTORIAL.03; cumprido o de aparo, volta A2.TUTORIAL.02.

- **Bits e persistência (TU5). [documento nos bits, com o prazo delegado]**
  - `TUTORIAL = { mover: 1, esquiva: 2, aparo: 4 }` e `TODOS_OS_TUTORIAIS = 7`. `CAB.tutoriaisVistos` continua parâmetro da Vigília (ADR-0002 §3: entra no estado, no replay e no hash). O Vitest da F-006 começa com todos vistos.
  - **Diverge:** Q-26 ("marcado no save meta") no prazo: nada é gravado no meta na F-006, porque o save meta só existe na F-010 (B §4), e a D2 §9 já manda a F-007 gravar o de mover. Uma função `tutoriaisCumpridos(e)` deriva os bits dos prompts cumpridos para a F-007/F-010 gravarem. Na F-006, recarregar a página volta a mostrar os prompts.
  - Teste: `TODOS_OS_TUTORIAIS` = 7; `tutoriaisCumpridos` reflete os prompts; nada é escrito em armazenamento persistente.

- **`?tutorial=0` e `?visto=` (TU6). [documento no primeiro, delegada no segundo]**
  - `?tutorial=0` marca todos como vistos (ADR-0002 §3; já existe). `?visto=mover,esquiva,aparo` marca só os listados (nomes do objeto `TUTORIAL`), somente no build de debug; valor desconhecido é ignorado; o build de produção ignora o parâmetro. Sem ele não há como isolar o prompt de aparo sem acender o de esquiva.
  - O F-006.8 de 3:00 usa `?visto=mover,esquiva`, porque aos 3:00 já há Ocos Grandes e Noviças vivos e o Grande telegrafaria antes.
  - Teste: `lerParametros('?visto=mover,esquiva', true)` devolve 3; `?visto=xyz` devolve 0; produção devolve 0.

- **`?inicio=MM:SS` e os garantidos (TU7). [documento na semântica, com a trava delegada]**
  - Só no build de debug, formato `MM:SS` de 00:00 a 22:59: `relogioInicial = (60·MM + SS) × 60` passos, com a linha **livre** (a escala é o minuto inteiro do relógio, Q-10, sem salto). Aldric começa no estado de início do ADR-0002 §14 (nível 1, só a Espada, `I` = 1,0, HP cheio); a progressão do minuto pedido não é simulada.
  - **Diverge:** D5 §7 e `cenario.schema.json` (`relogio_inicial_s` > 0 exige `linha_fixa`), só na forma. A trava de `reiniciarEstado` passa a depender de um parâmetro explícito `inicioLivre` da Vigília, ligado só por `?inicio` no debug. A receita de cenário continua exigindo linha fixa; um teste para cada lado (a receita ainda lança, o `?inicio` não).
  - Garantidos: o da linha do minuto pedido nasce no 1º passo (`?inicio=01:00` entrega o Oco Grande; `?inicio=03:00`, a Noviça). Os de linhas já passadas **não são entregues**, e isso já vale sem código novo: `rodarDiretor` só entrega os garantidos da `linhaCorrente` e o relógio só cresce. Não se ligam os bits de `garantidosEntregues` das linhas anteriores (a pesquisa propôs; o verificador mostrou que é desnecessário).
  - O 1º passo repõe de uma vez o mínimo da linha (Q-07): 25 inimigos no anel, contra ≈ 15 vivos de uma Vigília real às 1:00; nenhum teste usa passo exato logo depois do 1º passo. Medida: aos 3:00 há 4 Ocos Grandes e 7 a 10 Noviças no passo 1.
  - Teste: `relogioInicial = 3.600` com `inicioLivre` não lança e a receita com `relogio_inicial_s` > 0 sem `linha_fixa` ainda lança; o Oco Grande garantido nasce no passo 1 e nunca de novo; com `?inicio=03:00` o garantido da linha 1 não nasce; escala do minuto 1. Playwright: `?inicio=01:00` mostra `relogio` em 3.600 antes do 1º passo.

- **Câmera lenta leve (TU8). [delegada; a regra de apresentação é a FB5 da §3]**
  - A câmera lenta é do driver e dispara uma vez, no evento que mostra o prompt de esquiva (TU1), só se o bit de esquiva não foi visto; `?tutorial=0` a desliga. Fator 0,5 sobre o `deltaMs` por 500 ms de tempo real: 15 dos 36 passos do telegrafo saem em câmera lenta e os 21 restantes (350 ms) em tempo normal, para a decisão. Detalhes, divergência do ADR-0002 §3 e teste na §3 (FB5).
  - Teste (aqui só o gatilho): a escala dispara no quadro em que o prompt de esquiva fica visível e não dispara de novo no de aparo, nem com o bit pré-visto.

- **Texto do aparo e indício da janela (TU9). [delegada; veto]**
  - O texto aprovado manda tocar "no momento do brilho". O brilho do telegrafo da Noviça termina 65 a 105 passos antes de o projétil chegar, e o aparo é medido no contato, com janela de 11 (17 com o prompt estendido). Quem segue o texto ao pé da letra toca durante o brilho do corpo e falha sempre; a janela de 17 também não alcança.
  - Decisão: indício só de **render**, sem número novo na simulação. O anel do projétil (e a cunha do Oco Grande) fica branco sólido quando o impacto previsto está a ≤ 11 passos (≤ 17 com a janela estendida, enquanto o prompt está na tela). Assim "o momento do brilho" passa a ser verdade, e o texto de doc 11 §4 não muda. É o acréscimo de render descrito na §8 e a linha AP12 do 0.A.
  - Alternativas de veto: (a) manter o texto e o render como estão e aceitar que o prompt ensina errado; (c) trocar o texto (decisão do doc 17, fora da F-006).
  - Teste: com `?inicio=03:00&visto=mover,esquiva`, o prompt aparece depois do 1º telegrafo de Noviça e não antes; tocar o botão com o projétil dentro da janela cumpre e `textoAtivo` deixa de conter A2.TUTORIAL.03. Pixel: o anel está sólido nos últimos 11 passos e não antes.

- **Contexto dos textos (TU10). [documento, mudança só de dado]**
  - O campo `contexto` (não o `texto`) de A2.TUTORIAL.02 e .03 em `pt-BR.json` diz hoje "Prompt aos 1:00, com o Oco Grande telegrafando" e "Prompt aos 3:00, com a Noviça de Sal". Passa a dizer "No 1º telegrafo de um Oco Grande (a partir das 1:00)" e "No 1º telegrafo de uma Noviça (a partir das 3:00)", sem mudar o texto visível.
  - Teste: o teste de textos continua verde (IDs, limite de 12 palavras); o `contexto` novo não aparece em tela.

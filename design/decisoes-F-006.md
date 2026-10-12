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

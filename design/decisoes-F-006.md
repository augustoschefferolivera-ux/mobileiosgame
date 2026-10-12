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

# Decisões da F-007 "HP, Frascos, armadura, Apagar e Cinzas Perdidas"

- **Status:** proposta para aprovação. Nada foi implementado; as decisões valem depois do seu "aprovo" (ou do que você vetar na §0.A). As decisões técnicas e as divergências vão para o ADR-0009 ao implementar.
- **Como foi feito:**
  - levantamento: duas áreas de pesquisa (B1: dano, armadura, Brasa Firme, Frasco, barra de HP e telemetria; B2: Apagar, Resultado, mancha, save meta, Almas, pausa e Abandonar), cada uma seguida de um verificador cético, e um crítico de completude (Sonnet, esforço médio). Os verificadores conferiram as citações, refizeram as contas e corrigiram erros de fato (por exemplo, o exemplo aditivo de B1-01, o tipo de `FLOATS_DO_EVENTO` e a aritmética da cura × regeneração);
  - o crítico achou 10 conflitos entre as áreas (por exemplo, o bit 8 usado duas vezes e dois layouts v7 com nomes diferentes), 10 contradições entre fontes, 12 lacunas e 13 divergências de documentos aprovados. Cada conflito está resolvido no lugar da decisão;
  - as medidas vêm de protótipos fora do repositório (código de `src/` no Vitest, Node 22 deste contêiner). Nada foi medido em iPhone. Medidas que dependem do código (tempo até a morte com Brasa Firme, `almasDescartadas` no `sim20`, contraste das cores do HP, layout da pausa a 667 pt) ficam marcadas "a medir" e são refeitas na implementação.
- **Fontes, em ordem de autoridade:**
  - B = `design/gdd/18-briefing-tecnico.md` (prevalece no MVP): §3.3, §3.12, §3.14, §4 F-007;
  - o brief (`design/game-brief.md`), §11.3 F-007 e as decisões Q-xx;
  - o GDD: doc 02 §5.5, §5.6, §8; doc 08; doc 11;
  - o ADR-0002 (§3, §9, §10) e o ADR-0008;
  - D2 a D6 = `design/decisoes-F-00{2..6}.md` (D6 §10 é o que a F-006 deixou para esta feature);
  - o `feature_list.json`, `src/dados/*.json` e o código em `src/`.
- **Convenção** (a mesma da D6):
  - **[delegada]**: decisão de design ou número que nenhum documento dá; vale até você dizer o contrário;
  - **(técnica)**: só implementação;
  - **[delegada, a partir da Dn §9]**: recomendação de uma das D2 a D6 que esta adota;
  - **negrito**: o que diverge de um documento aprovado ou muda uma leitura anterior;
  - o resto vem de documento, citado;
  - o que pertence à F-008 a F-010 não é decidido aqui: vira recomendação na §13.
- **IDs** (dois caracteres, sem colidir com as D2 a D6 nem com os testes E1 a E7; a D6 usa AP CA EP ES ET FB GE NV OG PQ RE ST TU VT): DM dano, armadura e Brasa Firme; FR Frasco; HB barra de HP e sinal de acerto; TL telemetria; AG Apagar; AM Almas e pickup; RS Resultado; MC mancha; SV save meta; PE pausa (estatísticas e Abandonar); LY layout v7, ordem do passo e comandos; VB verificação (critérios, evidências, testes).
- **Contagem dos passos:** como na D6: o passo que lê o comando é o passo 1 da ação. O Frasco cura nos passos 1 a 120; APAGANDO dura os passos 1 a 30.
- **Pendências da F-007 no `feature_list.json`:**

| # | Pendência | Onde |
|---|---|---|
| 1 | brief §11.3: câmera lenta do Apagar, carga do Frasco interrompido, "segurar" cancela, ações durante o Frasco, ordem armadura × Brasa Firme, 15% antes ou depois | AG2; FR3; FR6; FR4; DM1; DM3 |
| 2 | arredondamento de 0,3 × N Almas | MC1 |
| 3 | D2 §9: mancha no ponto livre mais próximo; tutorial de mover no meta (Q-26) | MC4; SV4 |
| 4 | D3 §9: barra de HP e sinal do acerto; F-003.5; arredondamento do HP; `dano_recebido` do contato | HB1 a HB3; DM7; DM4; TL1 |
| 5 | o que "mortes causadas" conta (D4 §9) | RS4 |
| 6 | estatísticas e Abandonar na pausa; como o Abandonar chega a FIM (D4 §9) | PE1 a PE5 |
| 7 | gravar `opcoes.numerosDeDano` (D4 §9) | SV6 |
| 8 | APAGANDO e A_FOME: nenhuma arma, facas somem, nenhuma morte soma (D4 §9) | AG3; DM6 |
| 9 | Elmo (4 por nível) e ordem com a Brasa Firme; `hpMax` da F-005 como base (D5 §9) | DM1; DM2; DM5 |
| 10 | Almas dos inimigos, pickup de Alma, junção por tipo, baú nunca descartado, HUD de Almas (D5 §9) | AM1 a AM5 |
| 11 | APAGANDO sem Cinza nem XP; morte × modal; Resultado com o nível do estado (D5 §9) | AG1; AG3; RS3 |
| 12 | armadura e Brasa Firme em `danoAoJogador`; 39 interrompe; Brasa Firme "≥ 50,5" (D6 §10) | DM1 a DM3 |
| 13 | F-003.5 mede o dano bruto (D6 §10) | DM7 |
| 14 | `ACAO.frasco` durante esquiva e aparo (D6 §10) | FR1; LY3 |
| 15 | `esperaRegen = max(…, 120)`; "vulnerável" não bloqueia o Frasco (D6 §10) | FR5; FR1 |
| 16 | em APAGANDO zerar `congelamento`, `esquivaPasso`, `aparoJanela`, `aparoFalho` e bordas (D6 §10) | AG3 |
| 17 | custos de passivas em múltiplo de 0,5; "+stamina máxima" por Vigor lê `vigilantes.json` (D6 §10) | §13 (F-010); DM2 |
| 18 | gravar tutoriais, Som, Flashes e `numerosDeDano` no meta (D6 §10) | SV4 a SV6 |
| 19 | câmera lenta do Apagar reaproveita a escala do `deltaMs` (D6 §10) | AG2 |
| 20 | contadores de aparos e esquivas perfeitas; agregação da telemetria `aparo` (D6 §10) | PE2; TL1 |
| 21 | sinal de acerto sem branco nem `#ff2a2a`, respeitando "Flashes" (D6 §10) | HB2 |
| 22 | caixa do Frasco (72 pt, 16 pt acima do Aparo) reservada (D6 §10) | FR8 |

## 0. O que foi decidido (para vetar de relance)

### 0.A Decisões de design e divergências (para vetar)

Em negrito, o que diverge de um documento aprovado. "Alternativa" é o que vale se você vetar. As oito que mais pedem seu olhar: DM1 e DM3 (armadura × Brasa Firme e os 15%), FR3 (carga gasta no início), FR4 e FR6 (esquivar durante a cura e "segurar"), RS4 (`mortes` com convertido 10), AM2 (Alma com pool cheio), SV2 (save só em `localStorage`), RS1 e RS6 (Resultado sem chefe e Brasas; Voltar leva ao Acender) e HB1 (cor do HP).

| # | Decisão | Valor |
|---|---|---|
| DM1 | Armadura × Brasa Firme | Multiplicativo: `dano = bruto × 20/(A+20) × (Brasa Firme ? 0,8 : 1)`; o teto de 75% é só da curva da armadura; máximo combinado 80%. A = 0, 4, 20, 60, 100 dão redução 0; 16,667%; 50%; 75% exato; 75% (cortado de 83,3%). Alternativa: aditivo `1 − (R + 0,2)` com teto de 75% no total (A = 20 daria 0,30 em vez de 0,40; A = 60 daria 0,25 em vez de 0,20) |
| DM2 | Brasa Firme | `stamina > staminaMax/2` estrito, lida no instante do acerto, depois do gasto do passo e antes da regeneração. Só o teto 100 é testado (51 → ×0,8; 50 → ×1,0; 50,2 → ×0,8). **Diverge da D6 §10 ("≥ 50,5") para stamina entre 50 e 50,5**: a regeneração é de 0,5 por passo e o gasto é inteiro, mas valores como 50,2 existem. Alternativa: `≥ 50,5` |
| DM3 | Os 15% do Frasco | **Medidos no dano líquido (depois da armadura e da Brasa Firme), estrito `>`, limiar `hpMax × 15/100` com o `hpMax` do momento. Diverge do doc 02 §5.5 e da D6 §10, que leem o bruto ("39 de 150").** O 39 continua interrompendo (31,2 > 22,5). Alternativa: medir o bruto (o Frasco ignoraria a armadura) |
| DM4 | Arredondamento | O dano não é arredondado (Float32). O HUD mostra `ceil(hp)`: HP > 0 nunca mostra 0. O Apagar dispara com `hp ≤ 0`, não com o número exibido. Alternativa: arredondar o dano ao meio para cima (muda o contato de 1,5 para 2, +33%) |
| FR1 | Iniciar o Frasco | Só com cargas > 0, HP < `hpMax`, sem cura em curso e fase VIVA, fora de pausa e modal. Durante a esquiva e a janela do aparo o bit é ignorado, sem custo e sem buffer; no aparo falho pode começar (D6 §10). Mesmo passo: aparo > esquiva > Frasco. Negado (HP cheio, 0 cargas): sem custo e sem gastar a espera de 120. Alternativa: buffer de 3 passos (só se o iPhone pedir) |
| FR3 | Carga e interrupção | A carga sai no início; interrompido, a carga **não** volta e a cura já aplicada fica. Alternativa: devolver a carga ("jogo de cancelar") |
| FR4 | Ações durante a cura | Mover livre; esquiva e aparo permitidos e **não** cancelam. O custo é a stamina: a regeneração fica parada por 120 passos. Alternativa: esquiva e aparo cancelam a cura |
| FR6 | "Segurar cancela" | Novo toque no botão, mantido por ≥ 18 passos (0,3 s), cancela; o dedo que iniciou o Frasco não conta. Cancelado: carga gasta, cura feita fica, a espera de regeneração segue. 18 passos é a calibrar no iPhone (F-010). Alternativa: o mesmo dedo cancela |
| FR7 | Congelamento, pausa e modal | A cura segue o relógio do passo: se o `passo` não roda (congelamento, pausa, modal), a cura para. Frasco recusado em pausa e modal |
| HB1 | Barra de HP | HP à esquerda da linha, stamina à direita (doc 11 §3.1). Barra cheia em `brasa #ffb347`; trecho da cura em brasa clara; "retardo" da perda em tom próprio medido (ΔE ≥ 20 contra a Cinza vermelha `#c8324b` e contra o fundo `#1a1f2b`). Se `#c8324b` não passar na medida, token novo na paleta; nunca branco nem `#ff2a2a`. O `laranjaQueimado` fica de fora: já é o tint de "stamina insuficiente". Alternativa: `laranjaQueimado` (confunde com a stamina) |
| HB2 | Sinal de acerto | Só quando o desfecho é "acertou" e o dano líquido > 0. Retardo de 12 passos na barra; vinheta de bordas (alfa 0,35, 6 passos, a medir) na cor do retardo, no máximo 3 por segundo em rajada. Com "Flashes" desligado a vinheta não é criada; fica o retardo estático. Alternativa: só o retardo |
| TL1 | Telemetria `dano_recebido` | Contato agregado em **uma** linha a cada 5 s (`fonte: "contato"`, soma de todos os tipos: 240 linhas em 20 min); golpe e projétil uma linha cada, teto de 128 por fonte (anel por fonte); a linha que zera o HP é sempre registrada. **O doc 10 §6 pede um evento por dano.** Alternativa: contato fora da telemetria (só no total do Resultado) |
| AG1 | Morte | `verificarMorte` no fim do passo, depois de todo o dano; `hp ≤ 0` → APAGANDO. Descarta `niveisPendentes`, `bausPorFechar` e a oferta em curso; zera o Frasco sem evento; o modal do mesmo passo não abre |
| AG2 | Câmera lenta do Apagar | APAGANDO dura 30 passos e o driver escala o `deltaMs` por 0,5: 1 s de tempo real. A escala vale enquanto a fase for APAGANDO e não consome `restanteMs`; o FIM é exatamente no passo 30. **Diverge do ADR-0002 §3 ("1 passo a cada k quadros") e segue a D6 FB5.** Alternativa: fator 0,25 e 15 passos |
| AG3 | O que roda em APAGANDO | Os inimigos andam; HP fica em 0, contato não fere, nenhum `dano_recebido` novo; comandos, armas e ataques não rodam; projéteis somem no passo 1; regeneração e Poder param; sem spawn; Cinzas e Almas no chão ficam; o relógio da Vigília para no passo da morte; pausa inerte. Alternativa: tudo congelado |
| AM2 | Alma com pool cheio | Sem Alma viva para juntar, o valor é **creditado direto em `almas`** (nada se perde). **Diverge da D5 §9 (descartar e contar)**; elimina o campo `almasDescartadas`. Medir com o `sim20`. Alternativa: descartar e contar |
| RS1 | Conteúdo do Resultado | Tempo, Nível, Mortes causadas, **Dano recebido** (doc 02 §8), Almas líquidas (N − mancha), a linha da mancha e os botões. **Sem "Chefe mais longe" e "Brasas" até a F-009 (brief §5.13; doc 11 §3.12).** Sem Reviver. Alternativa: mostrar "—" |
| RS4 | "Mortes causadas" | Abates pela arma, **convertido vale 10** (o mesmo 10 de XP e Almas); 0 para a massa que morre ao formar a arena e para o Coroado que vira cinza. **`mortes` muda de semântica (por slot na F-004)**; os testes de slot são reescritos. Alternativa: contador separado (`mortesDeMassa`) mantendo `mortes` por slot |
| RS6 | Botões do Resultado | **Voltar ao Santuário leva à cena Acender** (o Santuário é da F-010); Repetir Vigília abre uma Vigília nova (seed nova, mancha lida do meta) |
| RS8 | Primeiro Apagar | Grava `primeiroApagarFeito`; **sem o balão `A2.TUTORIAL.05` e sem as 300 Almas garantidas (Q-20, doc 11 §4): são da F-010** |
| MC1 | Divisão das Almas | `mancha = ⌊(3N + 5)/10⌋` (0,3 N ao mais próximo, meio para cima, em inteiro); Santuário = `N − mancha`. N = 0 não cria mancha. Alternativas: piso (favorece o jogador), teto |
| MC3 | Mancha antiga | Todo Apagar substitui a mancha do meta (nova se ≥ 1, senão `null`). Abandonar e Amanhecer não mexem nela. Abandonar nunca devolve a mancha (vetada a alternativa gentil: o jogador "reservaria" a mancha e abandonaria de graça) |
| MC4 | Posição da mancha | **Grava o ponto livre mais próximo (zona proibida: raio do obstáculo + 16 px, contando os 54 do JSON), não a posição bruta; muda o "posição no mapa" de B §3.12** (recomendação da D2 §9) |
| MC7 | Encostar | A ≤ 32 px (toro), sem Ímã; devolve uma vez. O meta só muda no FIM |
| MC9 | Seta da mancha | Anel de brasa no mapa e **seta no limite da tela quando a mancha está fora da vista**, no código que a Fogueira da F-008 reaproveita. Adianta um escopo (brief §5.12, doc 11 §3.6) porque sem ela `mancha.png` é inviável em um mapa de 3 × 3 telas. Alternativa: sem seta (diverge do brief §5.12) |
| SV2 | Armazenamento do meta | **Só `localStorage` (`vdc.meta`) na F-007; o IndexedDB e `persist()` entram na F-010. Diverge do ADR-0002 §10 no prazo** (a atomicidade `ultimaEncerrada`/`vigilia` só existe com a F-008). Alternativa: os dois já |
| PE1 | Estatísticas da pausa | Três linhas (doc 11 §3.9): Mortes, Dano recebido, Aparos. **"Esquivas perfeitas" ficam só no contador e na telemetria (alimentam Feitos, F-011): diverge da leitura literal da pendência de D6 §10** |
| PE4 | Confirmar o Abandonar | Dois toques no mesmo botão: o 1º arma (borda de brasa e `A6.PAUSA.ABANDONAR_AVISO`), o 2º confirma. Fica armado até Continuar, outro botão ou fechar a pausa; sem timer. Alternativa: caixa Sim/Não (2 ids de texto) |
| PE5 | Abandonar na máquina | **`ACAO.abandonar` = 16**, bit emitido só pela pausa: o driver roda um `passo` com ele e o replay o reproduz. O ADR-0002 §9 só fala da transição; D4 §9 admitia comando fora do passo |
| PE6 | Almas do Abandonar | Santuário ← `⌊N/2⌋`, sem mancha nova |
| LY1 | Estado | Um só bloco v7 no fim do buffer (LY1); os hashes mudam uma vez, com regressão v6 |

### 0.B Decisões técnicas (informativo)

| # | Decisão | Valor |
|---|---|---|
| DM8, LY6 | Laço quente | `BRUTO` segue `Float64Array` de rascunho; armadura e Brasa Firme escrevem em `BRUTO[0]` e não retornam número; limiares são locais; telemetria passa por `FLOATS_DO_EVENTO` (Float64Array de 4), nunca por argumento. O FNV-1a do meta (u32 ≥ 2^30) é calculado em duas metades de 16 bits ou num `Uint32Array` de rascunho |
| DM5 | Contador `danoRecebido` | HP efetivamente perdido, limitado ao HP restante; a telemetria registra o líquido do golpe |
| FR2 | Cura | `frascoPorPasso = 0,4 × hpMax/120` e `frascoAlvo` gravados no toque (usa o `hpMax` do início); no passo 120 fixa `min(hpMax atual, alvo)` |
| FR5 | Regeneração | `esperaRegen = max(esperaRegen, 120)` uma vez, no passo do início; sem `esperaFrasco` |
| LY2 | Ordem do passo | comandos → congelamento (ET4) → cura do Frasco → pickups e modal → armas → ataques, contato, projéteis (`danoAoJogador`) → `verificarMorte` → relógio |
| LY3 | Bits de `ACAO` | `esquiva` 1, `aparo` 2, `frasco` 4, `frascoCancelar` 8, `abandonar` 16; só no fim da enum |
| LY4 | Eventos | `frascoInterrompido`, `apagou`, `fimDaVigilia`, mancha recuperada; `TIPO_DE_PICKUP.alma` = 4; códigos só no fim |
| AG4 | Fase | `fase` u8 (0 VIVA, 1 APAGANDO, 2 FIM), `causaDoFim` u8; em FIM o `passo` é no-op (hash congelado) |
| AG6 | `encerrarVigilia(estado, causa)` | Único, já aceita as 4 causas (apagar, abandonar, a_fome, amanhecer); a F-009 liga as duas últimas |
| MC6 | Mancha no estado | Campos próprios no v7, sem slot no pool de 512, sem RNG; entra pelo `ParametrosDaVigilia.mancha` |
| SV1, SV7 | Módulo do meta | `src/logica/save/meta.ts` (puro) e `src/plataforma/armazenamento.ts`; `fimCreditado` garante crédito uma vez |
| MC12 | Debug `?almas=N` | Só no build de debug; `ParametrosDaVigilia.almasIniciais`; entra no hash como parâmetro e não grava no meta |

## 1. O que os documentos já respondem

### Respondido por documento aprovado

- **Dano e armadura:** redução `A/(A+20)` com teto de 75% (doc 02 §5.6; doc 10); Brasa Firme "recebe 20% menos dano enquanto stamina > 50%" (B §3.3); Armadura vem do Elmo, 4 por nível (D5). A ordem entre os dois e o momento da leitura não vêm de documento.
- **Frasco:** 3 cargas, cura 40% em 2 s, dano acima de 15% do HP máximo em um golpe interrompe, 2 s sem regeneração de stamina, recarga na Fogueira (doc 02 §4 e §5.5; B §3.3; `vigilantes.json`: `cargas 3`, `cura_pct 40`, `duracao_s 2`, `interrompe_acima_pct_hp 15`, `sem_regen_stamina_s 2`). Botão de 72 pt, 16 pt acima do Aparo (B §3.5). "Toque; segurar = cancela" (doc 02 §4).
- **Apagar:** `qualquer estado ──HP 0──► APAGANDO (câmera lenta de 1 s) ──► FIM(apagar)`; `PAUSA ──Abandonar confirmado──► FIM(abandonar)`; "Você se apaga." (`A4.APAGAR.01`); Reviver, anúncio, Eco e "Dobrar" fora do MVP (ADR-0002 §9; doc 02 §8; doc 11 §3.10; brief §5.11).
- **Almas e mancha:** 30% das Almas da Vigília ficam na mancha (posição e Hora), o resto vai ao Santuário; a mancha aparece desde o início da próxima Vigília, encostar devolve uma vez, as recuperadas entram na Vigília; Apagar antes de recuperar perde a antiga; entre 20:00 e 23:00 a Hora vira "A Fome" (B §3.12; brief §5.11; Q-04, Q-21). A recuperação só se confirma no `meta` com o `vigilia` seguinte ou com o FIM (ADR-0002 §10; Q-03).
- **Abandonar:** Almas ×0,5, sem mancha, botão na pausa com confirmação e aviso (doc 02 §3.2; doc 11 §3.9; Q-25).
- **Resultado e pausa:** tempo, nível, mortes, Almas; mapa pequeno com a mancha; Voltar ao Santuário e Repetir (brief §5.13; doc 11 §3.12). Pausa com build, estatísticas (mortes causadas, dano recebido, aparos), opções e Abandonar (doc 11 §3.9).
- **Meta:** registro com `versao`, `seq`, `soma` (FNV-1a), Almas, mancha `{x, y, hora, rotulo, almas}`, tutoriais, "1º Apagar feito", opções, `vigiliasConcluidas`, `proximaIdVigilia`, `ultimaEncerrada` (ADR-0002 §10).
- **Almas dos inimigos:** `inimigos.json` (Oco 1 a 50%, Grande 3, Noviça 3, Coroado 30); convertido = 10 sorteios de 50% no fluxo `drops` (ADR-0002 §15 item 9 e §8.7).
- **Regras permanentes:** layout cresce no fim do buffer e os hashes só mudam com o layout, com regressão do anterior (ADR-0007 §1); laço quente sem double nem u32 ≥ 2^30 cruzando chamada fora de linha, também em funções frias; ≤ 16 B por passo (ADR-0005 §2, ADR-0006 §2, ADR-0007 §8).

### Recomendado nas D2 a D6 e adotado aqui

- **D2 §9:** mancha no ponto livre mais próximo; gravar no meta o tutorial de mover (MC4, SV4).
- **D3 §9:** barra de HP e sinal de acerto; `dano_recebido` do contato agregado; arredondamento do HP (HB1 a HB3, TL1, DM4).
- **D4 §9:** em APAGANDO nenhuma arma, facas somem e nenhuma morte soma; `numerosDeDano` no meta; Abandonar por comando gravado (AG3, SV6, PE5).
- **D5 §9:** a morte vale primeiro e a fila de modais é descartada; junção de Almas por tipo (AG1, AM2; o descarte é a divergência de AM2).
- **D6 §10:** armadura e Brasa Firme em `danoAoJogador`; `max(esperaRegen, 120)`; zerar os campos em APAGANDO; contadores no v7; a câmera lenta reaproveita a escala do `deltaMs` (DM1, FR5, AG3, PE2, AG2).

### O que nenhum documento dá

A ordem armadura × Brasa Firme, o momento da leitura da stamina, os 15% bruto ou líquido, a carga do Frasco interrompido, o que "segurar" mede, as ações durante a cura, o arredondamento de 0,3 × N, o conteúdo do Resultado e dos botões, a política de pool cheio, a agregação da telemetria, o layout da pausa e o contador de "mortes causadas". São as decisões delegadas deste documento.

## 2. Dano, armadura e Brasa Firme (DM)

**DM1. Ordem e fórmula. [delegada]**
- `danoAoJogador` fica o único caminho do HP e roda depois do aparo e dos i-frames de `resolverAcertoNoJogador` (D6 §10). Ordem de cálculo: bruto → `× 20/(A+20)` (a redução é `min(0,75, A/(A+20))`) → `× 0,8` se Brasa Firme, cada passo com `Math.fround`.
- Tabela de dano para bruto 20 (sem Brasa Firme / com): A = 0: 20 / 16; A = 4: 16,667 / 13,333; A = 20: 10 / 8; A = 60: 5 / 4; A = 100: 5 / 4. 60/80 = 0,75 é exato em Float32; A = 100 (83,3%) vira 75%.
- A é inteiro (Elmo 4 por nível; A = 20 no nível 5; A = 60 só por teste da função). A negativo ou NaN é recusado na função fria, sem double cruzando linha.
- Teste: `reducaoDeArmadura` com A = 0, 4, 20, 60, 100 (mais 59 e 61); tabela A × Brasa Firme de 6 casos que prova a escolha (aditivo e multiplicativo divergem).

**DM2. Brasa Firme. [delegada]**
- Condição `stamina > staminaMax/2`, estrita. Com o teto 100 coincide com o F-007.6. O teto vem do dado (`combate.staminaMax`); Vigor muda o teto só na F-010, que liga o teste de `staminaMax/2` ao dado (§13).
- Leitura no instante do acerto: depois do gasto do passo (a esquiva põe 25 e a Brasa Firme já cai) e antes da regeneração do passo.
- **Diverge da D6 §10 ("≥ 50,5") para 50 a 50,5.** Teste: 51 → ×0,8; 50 → ×1,0; 50,2 → ×0,8.

**DM3. Os 15% do Frasco. [delegada]**
- **Líquido, estrito, limiar `hpMax × 15/100` com o `hpMax` do momento.** Com 150: 22,5 (exato em Float32). Sem Brasa Firme o líquido 22 não interrompe e o 23 interrompe. Com Brasa Firme, bruto 28 → 22,4 não; 29 → 23,2 sim; 39 → 31,2 sim.
- "15% + 1" do F-007.2 é +1 ponto de dano líquido (23,5), mais o vizinho Float32 acima de 22,5. O F-007.2 roda com A = 0 e Brasa Firme desligada (stamina ≤ 50), para o bruto ser o líquido; a segunda asserção liga a Brasa Firme.
- Vale para todo dano que passa por `danoAoJogador` (contato, golpe, projétil). O contato nunca interrompe: o maior contato é `maiorDano × 0,3` = 1,5, abaixo de 19,5 (15% de 130). O teste lê `inimigos.json`, não confia no texto.

**DM4. Arredondamento. (técnica + delegada)** O HP é Float32 e o dano não é arredondado (20 × 0,8 = 16; 39 × 0,8 = 31,2). O HUD usa `ceil`. 100 acertos de contato de 1,5 com HP 150 somam exatamente 150: o 100º zera. A herança da F-005 (`hpMaximo` = `⌊(base × (100 + Σ%) + 50)/100⌋`) responde a pergunta da D3 §9.

**DM5. `hpMax` como base. (técnica)** Aldric 130 com +15% = 150 é `hpMaximo(130, 15)`, não campo novo. O Frasco cura `0,4 × hpMax`; o limiar usa `hpMax × 15/100`.

**DM6. Dano que não é de combate. [delegada]** `danoAoJogador` é o único caminho: a fome e o ambiente da F-009 herdam armadura e Brasa Firme sem código novo. Em APAGANDO o dano é 0 (AG3).

**DM7. F-003.5. (técnica)** Continua medindo o bruto (`BRUTO[0]` antes de `danoAoJogador`) e fica sem edição (a stamina inicial de 100 aplicaria ×0,8). Teste novo mede o líquido.

**DM8. Laço quente. (técnica)** Ver §0.B. Medida a fazer: E7 com Frasco e golpes por 600 passos, 0 B por passo.

## 3. Frasco (FR)

**FR1. Iniciar. [delegada]** Ver §0.A. Teste: bit com `esquivaPasso` em 1, 13 e 21 → sem efeito e carga intacta; no aparo falho (24 passos) → inicia; HP cheio e 0 cargas → negado sem mudar estado nem `esperaRegen`; aparo e Frasco no mesmo passo → vale o aparo.

**FR2. Cura. [delegada + técnica]**
- Carga gasta no toque; cura de `0,4 × hpMax/120` por passo nos passos 1 a 120, `hp = min(hpMax atual, hp + c)`. Com 150, `c = 0,5` exato; para 100 a 600 o erro de Float32 após 120 somas é ≤ 4e-4, sem acumulador inteiro. No passo 120 o `hp` fixa `min(hpMax atual, frascoAlvo)`.
- **O Frasco usa o `hpMax` do início**: uma carta +HP% escolhida no meio da cura (o modal abre durante a cura) muda o `hpMax` mas não `frascoPorPasso` nem `frascoAlvo`. Teste explícito.
- HP 30/150 → 90 em 120 passos; 140 → 150.

**FR3. Interrupção. [delegada]**
- Dano líquido > limiar (DM3) → `frascoPasso = 0`, evento `frascoInterrompido`, carga não volta, cura feita fica, `esperaRegen` restante segue, sem congelamento. Um golpe de 29 bruto no passo 60 perde 60 × 0,5 = 30 HP de cura.
- Teste: duas interrupções não somam; o evento e a carga.

**FR4. Ações durante a cura. [delegada]** Mover livre (velocidade 1,0). Esquiva e aparo não cancelam; o aparo bem-sucedido devolve os 30 de stamina e a regeneração segue parada. Teste: Frasco + esquiva no passo 40 → a cura segue até 120.

**FR5. Regeneração. (técnica)** `esperaRegen = max(esperaRegen, 120)` no início; nada mais zera. Gasto no passo 100 põe 30 e `max(20, 30)` = 30: a regeneração volta no 130, depois do fim da cura (a verificação refutou a alternativa `esperaFrasco`). Teste: sem gasto, regeneração parada nos passos 1 a 120 e volta no 121.

**FR6. Segurar. [delegada]** O tradutor de gestos mede o toque e emite o bit 8 (`frascoCancelar`) quando um **novo** toque no botão dura ≥ 18 passos com a cura em curso; o dedo que iniciou não cancela; toque curto na cura é ignorado; 8 sem cura em curso é ignorado; 8 vence o 4 no mesmo passo. Teste no `tradutorDeGestos`: 12 passos não cancela, 18 cancela; replay com o bit reproduz a cura e o hash.

**FR7. Relógio, pausa e modal. (técnica)** A cura anda só quando o `passo` roda. Confirmar em `passo.ts` o que o congelamento do aparo faz com o bit 4 (proposta: o bit é lido no passo seguinte, sem buffer) e testar. Descansar (F-008) exige cura parada.

**FR8. Botão. [delegada]** 72 pt, 16 pt acima do Aparo (caixa já reservada pela F-006). O contador de cargas (0 a 3) fica **no botão**, por glifos da N4, sem `Text` por quadro; o HUD de Almas (topo + 116) mostra só Almas. Botão esmaecido com 0 cargas ou HP cheio. Cargas iniciais de `vigilantes.json` (3); recarga na Fogueira é da F-008.

**FR9. Morte e Abandonar.** Zeram o Frasco sem evento. Frasco no mesmo passo em que o HP chega a 0 não vale (APAGANDO recusa). Teste: HP 0,3 com cura de 0,5 no passo e golpe 1 → APAGANDO (a cura roda antes do dano, a checagem é única no fim).

## 4. Barra de HP, sinal de acerto e telemetria (HB, TL)

**HB1. Barra. [delegada]** Posição e cores em §0.A. A caixa vem de `layoutDoHud.ts` (função pura, sem alocar). O número usa os glifos da N4 e `ceil(hp)`. Medir o contraste do número sobre o fundo e sobre o retardo (razão ≥ 4,5) e o ΔE do retardo; em 390 × 844 a barra cabe sem tocar a safe area.

**HB2. Sinal. [delegada]** Ver §0.A. Esquivado, aparado, i-frames, `jogadorInvulneravel` e dano < 0,0001 não acendem. Respeita D6 FB2 e FB4 (até 3 por segundo). Teste: `Flashes` desligado não cria o objeto da vinheta (E7 de alocação); Playwright com screenshot do HUD com HP 71.

**HB3. Contraste e medida. (a medir)** ΔE e razão de contraste das cores na implementação; resultado entra na ADR-0009.

**TL1. Política. [delegada]** Ver §0.A. `frasco: [minuto, hp_antes]` uma linha por uso; `aparo` e `esquiva` uma linha por desfecho (política da D6, repetida aqui porque a pendência a exige). O contador do estado registra o HP perdido; a telemetria, o líquido. Teste: horda de 3.600 passos com HP infinito não expulsa `frasco` nem `apagar` do registro de 1.024 entradas.

## 5. Apagar (AG)

**AG1. Morte. [delegada, a partir da D5 §9]** Ver §0.A e LY2. O `hp` só chega a 0 por `Math.max(0, …)`; 0,4 HP é vida. Teste: HP 1 + golpe no mesmo passo de um nível → sem carta, fase APAGANDO, fila vazia, hash igual em duas execuções.

**AG2. Câmera lenta. [delegada]**
- 30 passos × 16,67 ms = 500 ms de jogo; ÷ 0,5 = 1.000 ms reais, a 60 ou a 30 fps. A duração em passos é do estado (determinística, sem gate de tempo); o tempo real é só apresentação.
- `dispararCameraLenta` ganha duração e fator por parâmetro; a do Apagar passa por cima da do tutorial e não consome `restanteMs` nem a flag `usada`. **Diverge do ADR-0002 §3 e segue a D6 FB5.**
- Teste: função pura (a soma do `deltaMs` real = 1.000 ms para 30 passos); sem driver, o `passo` chega a FIM em 30; Playwright: `estado` passa por APAGANDO e chega a FIM.

**AG3. O que roda. [delegada, D4/D5/D6]** Ver §0.A. Zera `congelamento`, `esquivaPasso`, `aparoJanela`, `aparoFalho` e as bordas travadas; esquiva e aparo ignorados sem custo. Pausa inerte (evita FIM duplo). Teste: em APAGANDO, zero mortes, XP e Almas novas, nenhum projétil vivo, `relogio` constante, `hp` = 0; mutação: deixar as armas rodarem reprova.

**AG4. Estado. (técnica)** `fase`, `causaDoFim` (0 nenhuma, 1 apagar, 2 abandonar; 3 a_fome e 4 amanhecer reservados) e `apagandoPassos` no v7. Debug: `estado` = `VIVA | APAGANDO | FIM(apagar|abandonar)`, `tela` = `resultado`, `textoAtivo` com `A4.APAGAR.01` já em APAGANDO.

**AG5. Texto. [delegada]** `A4.APAGAR.01` entra com fade ≤ 200 ms e véu a 60% (como a pausa) e continua como título do Resultado. O Resultado abre quando `fase` = FIM, sem espera de leitura.

**AG6. Outras causas. (técnica)** `encerrarVigilia` aceita as 4 causas; A Fome e Amanhecer são testados por causa unitária, sem cenário.

**AG7. Aba escondida.** Sem save de `vigilia` antes da F-008, o app não persiste APAGANDO; `visibilitychange` é da F-010. Sem decisão.

**AG8. Medida do tempo até a morte.** Jogador parado em `?inicio=19:00`, seeds 1 a 8, sem Brasa Firme: HP 0 em 230 a 243 passos (3,8 a 4,0 s), 0 Almas e 0 mortes. Com a Brasa Firme (×0,8) o jogador parado morre cerca de 25% mais tarde (~5 s). **Refazer a medida depois do código;** o Playwright espera pelo `estado`, nunca por um tempo fixo.

## 6. Almas e pickup de Alma (AM)

**AM1. Quando solta. [delegada]** Só com `causa = arma` (como a Cinza), nunca em APAGANDO; o cenário `semCinzas` também corta as Almas. `chance ≥ 1`: valor fixo, sem sorteio; `chance < 1`: um sorteio do fluxo `drops`. Convertido: 10 sorteios de 50% (soma 0 a 10) e **um** pickup com a soma. Teste: seed fixa → mesma sequência; `chance 1` não move o `drops`.

**AM2. Pool. [delegada, D5 §9, com divergência]** `TIPO_DE_PICKUP.alma` = 4, `valor` u32. Pool cheio: junta na Alma viva mais próxima; sem Alma viva, **credita o valor direto em `almas`** (diverge da D5 §9). O baú nunca é descartado (cede a Cinza ou a Alma mais próxima, Cinza primeiro). Medir no `sim20`: quantas vezes o crédito direto ocorre em 20 min.

**AM3. Coleta. [delegada]** Mesmo laço 7e da Cinza: Ímã a 48 px, voo de 8 px por passo, coleta a ≤ 16 px; soma em u32 inline (um double local nunca cruza chamada).

**AM4. Aparência. (técnica)** Cor própria em `paleta.ts`, menor prioridade que o baú, sem texto.

**AM5. HUD de Almas. [delegada, D5 R4/P10]** "1.240" com "." de milhar, glifos da N4, topo + 116 pt, à esquerda; atualiza só quando o valor muda. Teste `hud.test.ts`: 0, 9, 999, 1.000, 1.240, 12.345, sem alocação nova por quadro. As Almas não aparecem na pausa.

**AM6. Alvos (Q-21). Não calibrados.** Medir o total por Vigília de produção (`sim20`) e registrar como recomendação para a F-010 (preço da árvore).

**AM7. Limite. (técnica)** `almas`, `manchaAlmas` e o `valor` do pickup ficam < 2^30; o saldo do Santuário é limitado em `aplicarFimDeVigilia`. Teste de limite.

## 7. Resultado (RS)

**RS1. Conteúdo.** Ver §0.A. Sem botão Reviver (teste); o "Dano recebido" reusa o contador de PE2.

**RS2. Tempo.** `relogio / 3600` em `m:ss`, truncado; o relógio para na pausa, no modal, no congelamento e em APAGANDO, então vale o instante do HP 0.

**RS3. Nível.** O do estado no passo da morte; o nível pendente descartado não conta (D5 §9). Teste: morrer com um nível pendente mostra o anterior.

**RS4. Mortes causadas. [delegada]** Ver §0.A. `matarInimigo` soma 1 ou `MASSA_POR_CONVERTIDO` em `mortes`. Os testes da F-004 por slot são reescritos de forma explícita (não "seguem verdes") e entra um teste que fixa a regra: convertido por arma soma 10; `causa` ≠ arma soma 0; em APAGANDO, 0. Registrar no ADR-0009.

**RS5. Almas.** Mostra as que vão ao Santuário (`N − mancha`) e, na linha da mancha, as que ficaram. A contagem animada (≤ 1 s) é só visual; o valor final está no `textoAtivo` desde o 1º quadro do Resultado.

**RS6. Botões.** `A7.RESULTADO.VOLTAR` e `.REPETIR`, 288 × 72 pt. Ambos dependem do crédito do meta feito **uma vez** (SV7).

**RS7. Mapa pequeno. [delegada]** Um `Graphics` de ≈ 120 × 120 pt proporcional ao mapa, com um ponto na posição da mancha; sem texto novo. Alternativa: só o texto, e o mapa na F-010.

**RS8. Título do Abandonar.** `A6.PAUSA.ABANDONAR` (sem texto novo).

## 8. Mancha das Cinzas Perdidas (MC)

**MC1. Conta.** N = 0, 1, 2, 3, 4, 5, 15, 280, 1.100 dão mancha 0, 0, 1, 1, 1, 2, 5, 84, 330 (o `round` da linguagem daria 4 para N = 15; por isso inteiro explícito). Soma sempre fecha: `mancha + santuário = N`.

**MC2. Quais Almas.** Todas as do contador no passo da morte, inclusive as recuperadas da mancha anterior e as Bolsas; as do chão se perdem.

**MC3. Antiga.** Ver §0.A. Teste: Apagar com 0 Almas apaga a antiga; Abandonar mantém.

**MC4. Posição. (delegada, D2 §9)** `(x, y)` do jogador no passo da morte; se estiver a menos de `raio + 16 px` de qualquer um dos 54 obstáculos do JSON (ativos ou não), vai ao ponto livre mais próximo, normalizado no toro. Função pura em `src/logica/mundo`. Com obstáculos ativos o caso é raro (colisão); importa quando a arena da F-008/F-009 desligar obstáculos. Medir: dentre 20.000 mortes em posições aleatórias pela colisão real, quantas têm a posição bruta na zona (esperado 0%).

**MC5. Hora. [delegada]** `hora = min(4, ⌊minutos/5⌋ + 1)` para `relogio < 20:00`; a partir de 20:00, "A Fome" (código 5, `A7.RESULTADO.MANCHA_A_FOME`). `horaDoRelogio(passos)` é pura; a F-008 a troca pelo estado HORA(n). `rotulo` = `null` (sem capela no MVP). Teste: 0:00, 4:59, 5:00, 9:59, 10:00, 15:00, 19:59 (IV), 20:00, 22:59 (A Fome).

**MC6. Estado.** `manchaAtiva`, `manchaX`, `manchaY`, `manchaAlmas` no v7, preenchidos por `ParametrosDaVigilia.mancha`. A mancha não consome RNG: o estado do RNG após N passos é igual com e sem mancha.

**MC7. Encostar.** Distância toroidal ≤ 32 px (o baú usa o mesmo; o jogador tem raio 16): `almas += manchaAlmas`, `manchaAtiva = 0`, evento. Se a aba morrer antes do FIM, a mancha segue no meta. Teste: 33 px não pega, 32 pega, uma vez.

**MC8. Tabela de FIM (4 linhas × meta antes e depois):**

| Caso | Mancha do meta depois |
|---|---|
| recuperou e Apagou | nova = 30% de tudo (inclui as recuperadas) |
| recuperou e Abandonou | consumida; Almas ×0,5 já contam as recuperadas |
| não recuperou e Abandonou | a antiga se mantém |
| recuperou e Amanheceu (F-009) | consumida; ganho normal |

**MC9. Render e seta.** Marcador (anel de brasa, cor da Alma, pulsa devagar) e seta no limite da tela com a mancha fora da vista. Teste: ângulo pelo delta toroidal, mancha dentro e fora da vista.

**MC10. Seed.** A posição não depende da seed (obstáculos fixos por mapa, Q-04). F-007.3 usa duas seeds.

**MC11. Passo 0.** A mancha nasce no passo 0; pode cair a ≤ 32 px do ponto de nascimento (pega no passo 1). Registrado.

**MC12. Obter Almas no Playwright. (técnica)** O jogador parado morre com 0 Almas e sem mancha; para `mancha.png`, `?almas=N` (só debug) → `almasIniciais`, no hash, não grava no meta: `?inicio=19:00&seed=N&almas=1000` → morrer → "300 Almas ficaram na Hora IV" → Repetir (seed nova) → mancha em `__GAME_DEBUG__` e no screenshot.

## 9. Save meta mínimo (SV)

**SV1. Escopo. [delegada]** `meta.ts`: tipo `Meta` v1, `serializarMeta`, `lerMeta` (`versao`, `seq`, `soma` FNV-1a), migração `v0 → v1` = defaults, `aplicarFimDeVigilia(meta, resultado)`. Os campos que a F-007 não usa (`ultimaEncerrada`, `proximaIdVigilia`, `vigiliasConcluidas`) nascem com valor neutro. Brasas, ranks, `conviteRecusadoEm` e a árvore são da F-010.

**SV2. Armazenamento.** Ver §0.A. `try/catch` em toda leitura e escrita (modo privado, cota, ITP), com queda para memória; a F-010 migra `vdc.meta` para o IndexedDB.

**SV3. Campos do `meta` v1.** `versao`, `seq`, `soma`, `almas` (saldo do Santuário), `mancha` (`{x, y, hora, rotulo, almas}` ou `null`; `hora` 1 a 5), `tutoriais` (máscara 1, 2, 4), `primeiroApagarFeito`, `opcoes` (`som`, `flashes`, `numerosDeDano`), `vigiliasConcluidas`, `proximaIdVigilia`, `ultimaEncerrada`.

**SV4. Quando grava.** No FIM (Almas, mancha, `primeiroApagarFeito`, `vigiliasConcluidas`); na opção alterada, na hora do toque; no tutorial cumprido (o driver compara `tutoriaisCumpridos(estado)` com a máscara a cada quadro: no máximo 3 gravações por perfil). Nunca no laço quente.

**SV5. Leitura no boot.** Preenche `tutoriaisVistos` (parâmetro da Vigília, no hash), `ctx.opcoes` e a mancha. `?tutorial=0` e `?visto=` ganham do meta e **não gravam**. Teste: meta corrompido ou `localStorage` com falha não derruba o boot.

**SV6. Opções.** `numerosDeDano`, `som` e `flashes` passam a ser lidas e gravadas; com meta vazio o padrão não muda (tudo `true`).

**SV7. Crédito uma vez.** O FIM monta `ResultadoDaVigilia` (função pura) e chama `aplicarFimDeVigilia` uma vez, guardado por `fimCreditado`; Voltar e Repetir leem o meta já gravado (no Playwright o `localStorage` persiste entre páginas). Teste: chamar duas vezes não credita duas.

**SV8. Hash. (técnica)** O meta não entra no hash; só os parâmetros que ele alimenta (`tutoriaisVistos`, `mancha`, `almasIniciais`). Teste: Vigília com meta vazio = Vigília com os padrões.

**SV9. Funções frias. (técnica)** O FNV-1a (u32 ≥ 2^30) não é devolvido como número: calcula-se em duas metades de 16 bits, ou escreve-se num `Uint32Array` de rascunho. Teste: `soma` inválida → defaults; versão desconhecida → defaults, sem lançar; `seq` monotônico.

## 10. Pausa: estatísticas e Abandonar (PE)

**PE1. Linhas.** Três: Mortes, Dano recebido, Aparos. Textos novos: ver §14 (placeholders, fora do roteiro).

**PE2. Contadores. [delegada, D6 §10]** No v7: `danoRecebido` f32, `aparos` e `esquivasPerfeitas` u32 (pequenos, nunca perto de 2^30), `frascosUsados`, e o `mortes` existente. O anel de 1.024 eventos não serve (gira em ~17 s de combate). Definições: dano recebido = HP efetivamente perdido, depois da armadura e da Brasa Firme, limitado ao HP restante (golpe 30 com HP 5 soma 5); aparos = só os bem-sucedidos; esquivas perfeitas = 1 por esquiva. O Float32 não é exato em 1/16 (A = 4 dá 20/24): o erro é ≪ 1 HP; a exibição arredonda **ao mais próximo**, não ao piso. Teste: golpe de 30 com A = 20 e Brasa Firme soma 12.

**PE3. Layout. (técnica)** Em 390 × 844 pt (insets 47 e 34) sobram ≈ 246 pt entre a build (acaba perto de y ≈ 300) e Som/Flashes (y = 546 a 618): estatísticas em 3 linhas de 18 pt (y ≈ 318 a 372), aviso em 2 linhas (y ≈ 400 a 440), Abandonar 288 × 72 pt (y ≈ 458 a 530), o mais longe do Continuar (y = 714). Em 667 pt a folga cai a ≈ 69 pt: as estatísticas viram uma linha ("12 · 340 · 3"). Teste de `alvosDaTelaDePausa` para 844, 812, 736 e 667: sem sobreposição, alvos ≥ 72 pt, dentro da área segura. Reverificar com o código.

**PE4. Confirmação.** Ver §0.A.

**PE5. Abandonar na máquina.** Ver §0.A e LY3. O `passo` consome o bit 16 antes de qualquer outra coisa: `fase` = FIM, `causaDoFim` = 2, evento, sem simular. Em APAGANDO ou FIM o bit é ignorado.

**PE6. Conta.** N = 0, 1, 2, 3, 280, 281 → Santuário 0, 0, 1, 1, 140, 140.

**PE7. Outros momentos.** Abandonar não existe no modal nem em APAGANDO e FIM. O Recusar da retomada (F-008) usa `encerrarVigilia`.

## 11. Layout v7, ordem do passo e comandos (LY)

**LY1. Bloco v7. (técnica)** Um só bloco no fim do buffer, um dono por campo:

| Campo | Tipo | Dono |
|---|---|---|
| `fase`, `causaDoFim`, `apagandoPassos` | u8 | AG |
| `frascoCargas`, `frascoPasso` | u8 | FR |
| `frascoPorPasso`, `frascoAlvo` | f32 | FR |
| `manchaAtiva` | u8 | MC |
| `manchaX`, `manchaY` | f32 | MC |
| `manchaAlmas` | u32 | MC |
| `danoRecebido` | f32 | DM, PE |
| `aparos`, `esquivasPerfeitas`, `frascosUsados` | u32 | PE |

Sem `almasDescartadas` (AM2) e sem `estado/apagandoPasso` (descartado do B1). Os hashes mudam uma única vez; a regressão v6 fixa os literais antigos (mascarando só os campos novos). A soma dos bytes e os hashes novos são medidos na implementação.

**LY2. Ordem do passo.** Ver §0.B. Morte descarta a fila; a cura roda antes do dano, então o dano do passo vê o HP já curado e a checagem `hp ≤ 0` é única. Remover o parágrafo contraditório do B1-17.

**LY3. Comandos.** A validação aceita 4, 8 e 16 (16 só com `fase` VIVA) e recusa o resto. Cancelar vence o 4; abandonar vence tudo. O replay v6, que não usa 8 e 16, segue válido (regressão). Teste de replay com os bits.

**LY4. Eventos e orçamento.** Os 4 eventos novos somam ao orçamento: teste E7 de ≤ 16 B por passo e 0 B alocado, com Frasco, golpes e morte. Códigos de EVENTO, FORMA, `TIPO_DE_PICKUP.alma` e `ACAO` só no fim.

**LY5. Parâmetros novos.** `ParametrosDaVigilia.mancha` e `.almasIniciais` entram no hash e no replay.

**LY6. Regras permanentes, checklist.** (a) FNV-1a em duas metades (SV9); (b) saldo < 2^30 (AM7); (c) `almas`, `manchaAlmas`, `valor` < 2^30 por teste de limite; (d) eventos novos no E7; (e) códigos só no fim; (f) Float32 e RNG com seed: a mancha e o Frasco não consomem RNG; (g) sem gate de tempo: o FIM e o Resultado dependem do estado, não de tempo.

## 12. Critérios, evidências e testes (VB)

### Critérios da F-007 (o "como" pronto para copiar no feature_list)

**F-007.1** (vitest). Descrição: "Redução de armadura em 5 casos." **Como:** "`reducaoDeArmadura(A)` = `min(0,75, A/(A+20))` em Float32: A = 0 → 0; A = 4 → 0,16667; A = 20 → 0,5; A = 60 → 0,75 exato (fronteira do teto); A = 100 → 0,75 (cortado de 0,833). Casos extras A = 59 e 61; A negativo ou NaN recusado. Tabela com bruto 20: sem Brasa Firme 20; 16,667; 10; 5; 5 e com Brasa Firme 16; 13,333; 8; 4; 4 (multiplicativo, DM1)." (origem: B §4; D7 DM1)

**F-007.2** (vitest). Descrição: "Frasco interrompe com golpe > 15% HP." **Como:** "hpMax 150, A = 0, Brasa Firme desligada (stamina ≤ 50), Frasco em curso: dano líquido 22,5 não interrompe; 23,5 (15% + 1) e o vizinho Float32 acima de 22,5 interrompem (`frascoPasso` = 0, evento, carga não volta, cura feita fica). Contato de 1,5 não interrompe. Segunda asserção com Brasa Firme (stamina 100): bruto 28 não interrompe (22,4) e 29 interrompe (23,2); bruto 39 interrompe. O limiar é líquido, estrito, com o hpMax do momento (DM3)." (origem: B §4; D7 DM3, FR3)

**F-007.3** (vitest). Descrição: "Mancha salva e restaurada entre duas Vigílias com seeds diferentes." **Como:** "Apagar com seed A e 200 Almas: `aplicarFimDeVigilia` grava no meta `mancha = {x, y, hora, rotulo: null, almas: 60}` (x, y no ponto livre mais próximo, hora pela função pura) e Santuário 140. Vigília com seed B e `ParametrosDaVigilia.mancha` do meta a recria na mesma (x, y) com as mesmas Almas no passo 0, sem consumir RNG (mesmo estado de RNG com e sem mancha). Encostar a 33 px não pega; a 32 px devolve 60 uma vez e o hash do passo seguinte inclui as Almas; o meta só muda no FIM. Apagar com 0 Almas apaga a mancha antiga; Abandonar a mantém (Q-04)." (origem: B §4; D7 MC)

**F-007.4** (playwright). Descrição: "Morrer de propósito e ver a tela de resultado (Playwright)." **Como:** "`?inicio=19:00&seed=N` sem nenhum toque até o HP chegar a 0 (≈ 4 a 5 s, a medir com a Brasa Firme; o teste espera pelo `estado`, não por tempo fixo): `__GAME_DEBUG__.estado` passa por APAGANDO e chega a FIM(apagar) no passo 30 de APAGANDO; `textoAtivo` contém `A4.APAGAR.01` em APAGANDO e no Resultado; a tela é `resultado`, com Tempo, Nível, Mortes, Dano recebido, Almas e sem botão Reviver; `localStorage` limpo e `?tutorial=0` não grava." (origem: B §4; D7 AG)

**F-007.5** (vitest). Descrição: "Abandonar Vigília: Almas ×0,5, sem mancha." **Como:** "`passo` com `ACAO.abandonar` (16) leva a FIM(abandonar) no mesmo passo, e o bit é ignorado em APAGANDO e FIM; Santuário = `⌊N/2⌋` para N = 0, 1, 2, 3, 280, 281; nenhuma mancha nova e a antiga mantida; título `A6.PAUSA.ABANDONAR`; o replay repete o Abandonar; o crédito do meta é feito uma vez (ADR-0002 §9; Q-25)." (origem: Q-25; ADR-0002 §9; D7 PE)

**F-007.6** (vitest). Descrição: "Brasa Firme." **Como:** "hpMax inicial de Aldric = 150 (`hpMaximo(130, 15)` em `reiniciarEstado`, B §3.3); com A = 0, o golpe de 20 sai × 0,8 (16) com stamina 51, × 1,0 (20) com 50 e × 0,8 com 50,2 ('enquanto stamina > 50%', estrito, lida depois do gasto do passo e antes da regeneração); armadura depois Brasa Firme (A = 4: 13,333)." (origem: B §3.3 (escopo da F-007); D7 DM2)

**F-007.7** (vitest). Descrição: "Frasco." **Como:** "um Frasco não interrompido cura 40% do HP máximo ao longo de 120 passos (HP 30/150 → 90 exato no passo 120; 140 → 150, sem passar do máximo) e `esperaRegen` ≥ 120 no 1º passo: sem gasto, a regeneração fica parada nos passos 1 a 120 e volta no 121 (doc 02 §5.2). Também: 3 → 0 cargas e o 4º toque negado; HP cheio negado sem custo; bit ignorado com `esquivaPasso` em 1, 13 e 21; esquiva e aparo durante a cura não cancelam; o hpMax muda no meio e a cura usa o do início; bit 8 cancela (novo toque ≥ 18 passos no tradutor); replay reproduz cura e hash." (origem: B §3.3 e §4 (escopo); D7 FR)

**F-007.8** (vitest). Descrição: "Divisão das Almas no Apagar." **Como:** "mancha = `⌊(3N + 5)/10⌋` para N = 0, 1, 2, 3, 4, 5, 15, 280, 1.100, 123.456 (0, 0, 1, 1, 1, 2, 5, 84, 330, 37.037); Santuário = N − mancha; N = 0 não cria mancha; posição e Hora gravadas (Hora pela função pura: 0:00 a 4:59 → I … 15:00 a 19:59 → IV; 20:00 e 22:59 → A Fome)." (origem: B §3.12 (escopo); D7 MC1, MC5)

### Evidências

- `production/evidencias/F-007/resultado.png`: screenshot do Resultado do F-007.4 (390 × 844).
- `production/evidencias/F-007/mancha.png`: `?inicio=19:00&seed=N&almas=1000` → morrer → Repetir Vigília (seed nova) → mancha visível, com a seta se fora da vista.

### Testes adicionais e mutações

- **Vitest:** ordem cura × dano (HP 0,3 + cura 0,5 + golpe 1 → APAGANDO); APAGANDO (AG3); tabela de FIM da mancha (MC8); meta (ida e volta, soma, versão, defaults, opções e tutoriais gravados, `?visto` não grava, falha de `localStorage`); Almas (drop por seed, junção, coleta, crédito direto); `alvosDaTelaDePausa` em 4 alturas; HUD de Almas; regressão v6 e referências v7; E7 de alocação e de ≤ 16 B por passo.
- **Mutações a reprovar:** `⌊(3N+5)/10⌋` → `⌊0,3N⌋`; `<` por `≤` no raio 32; manter a mancha antiga no Apagar com 0; armas rodando em APAGANDO; creditar o meta duas vezes; contar o convertido como 1; Brasa Firme `≥` em vez de `>`; 15% sobre o bruto; devolver a carga na interrupção; aditivo no lugar de multiplicativo.
- **Playwright:** o de F-004 e F-006 que dependem de `mortes`, do número de eventos e dos hashes são ajustados; a lista exata sai do diff.

## 13. Recomendações para as features seguintes (não decididas aqui)

- **F-008 (Fogueira, Descansar, retomada):** recarrega os Frascos (Descansar exige cura parada e a zera); reaproveita a seta da mancha; os campos v7 (`fase`, Frasco, mancha, contadores) entram no `vigilia`; a mancha recuperada só se confirma com o `vigilia` seguinte (Q-03); `idVigilia` e `ultimaEncerrada` passam a ser ativos; Recusar da retomada usa `encerrarVigilia(abandonar)`; `sincronizarDerivados` refaz hpMax e as tabelas de dano; mancha dentro de uma arena (sem decisão); Coroado que vira cinza não solta Cinza nem Alma e não soma `mortes`.
- **F-009 (Arena, chefe, fome, Amanhecer):** o dano de fome passa por `danoAoJogador`; liga as causas a_fome e amanhecer de `encerrarVigilia`; Resultado ganha "Chefe mais longe" e "Brasas"; A Fome na Hora da mancha; medir o total de Almas por Vigília contra Q-21.
- **F-010 (Santuário, meta completa, iPhone):** IndexedDB e `navigator.storage.persist()` com migração de `vdc.meta`; as 300 Almas do primeiro Apagar e o balão `A2.TUTORIAL.05`; custos de passivas em múltiplo de 0,5 (Passo Leve −30% = 17,5) e "+stamina máxima" por Vigor lendo `vigilantes.json`, com o teste de `staminaMax/2` ligado ao dado; teto de cargas do Frasco (até 6); calibrar no iPhone o "segurar" (18 passos), o swipe e a cor/vinheta do HP; `visibilitychange` em APAGANDO; preço da árvore pela medida de Almas.
- **F-011 (Feitos):** `esquivasPerfeitas` já tem contador.

## 14. O que muda em dados e documentos

**No commit que registra este documento (`feature_list.json`):**

- F-007: `pendencias_antes_de_comecar` vira "Resolvidas em design/decisoes-F-007.md"; o "como" dos F-007.1 a F-007.8 passa ao texto da §12 (descrição, verificação e `criterio_b` ficam); evidências: as duas da §12.
- F-008 a F-010: as recomendações da §13 entram nas pendências de cada uma.

**A F-007 aplica ao implementar:**

- **Dados e schemas:** constantes novas (cancelar em 18 passos, câmera lenta 30 passos e fator 0,5, mancha 30%, raio 32 px, agregação de 5 s, teto de 128 por fonte) em `combate.json` e seu schema, o que já existir em `vigilantes.json` (cargas 3, cura 40%, duração 2 s, limiar 15%, espera 2 s) é lido dali; sem mudança em `inimigos.json`. `ParametrosDaVigilia` ganha `mancha` e `almasIniciais`; `Parametros` ganha `?almas`.
- **Textos (`pt-BR.json`), placeholders fora do roteiro, por `t(id)`:** `A6.PAUSA.MORTES`, `A6.PAUSA.DANO`, `A6.PAUSA.APAROS`, `A7.RESULTADO.DANO` e o rótulo do botão do Frasco (id a conferir na convenção do arquivo). Reusados: `A4.APAGAR.01`, `A6.PAUSA.ABANDONAR` e `_AVISO`, `A7.RESULTADO.{TEMPO,NIVEL,MORTES,ALMAS,MANCHA,MANCHA_A_FOME,VOLTAR,REPETIR}`. Não usados: `A7.RESULTADO.CHEFE`, `.BRASAS`, `A2.TUTORIAL.05`.
- **Código (checklist por área, o diff manda):** simulação (`estado.ts`, `passo.ts`, `comandos.ts`, `eventos.ts`, `contato.ts`, `ataques.ts`, `progressao/dano.ts`, pickups e `matarInimigo`, `logica/save/meta.ts`, `logica/mundo` para o ponto livre e a Hora), plataforma (`armazenamento.ts`, `parametros.ts`, `telemetria*.ts`), entrada (`tradutorDeGestos.ts`), cenas (`Hud.ts`, `layoutDoHud.ts`, `Pausa.ts`, `alvos.ts`, `Resultado` na cena Modal, `cameraLenta.ts`, `debug.ts`, render da mancha e da seta).
- **Testes:** os novos de F-007.1 a F-007.8 e da §12; os de `mortes` por slot da F-004 reescritos; literais de hash v6 viram regressão e os v7 são novos; `e2e/f007.spec.ts`; `alocacao.test.ts`.
- **Documentos e scripts:** `docs/roteiro-iphone.md` (Frasco, "segurar", sinal de acerto); `scripts/sim20.ts` rodado de novo (Almas por Vigília e creditadas direto); `progress.md`.
- **ADR-0009**, com as decisões técnicas e as divergências:
  - do ADR-0002 §3: a câmera lenta do Apagar acoplada à fase; do §10: meta só em `localStorage`; do §9: `ACAO.abandonar`;
  - do doc 02 §5.5 e da D6 §10: os 15% no líquido e a Brasa Firme estrita;
  - da D5 §9: Alma com pool cheio creditada direto;
  - da D4 M3 / F-004: a semântica de `mortes`;
  - de B §3.12: a mancha no ponto livre; de brief §5.12 / doc 11 §3.6: a seta da mancha na F-007;
  - de brief §5.13 e doc 11 §3.12: Resultado sem chefe e Brasas; de doc 10 §6: `dano_recebido` agregado;
  - de D6 §10: esquivas perfeitas fora da tela; Voltar ao Santuário leva ao Acender (Santuário na F-010).

## 15. Revisão adversarial

*A preencher depois da revisão (lentes: fidelidade às fontes, técnica e completude; cada uma seguida de um verificador cético). Registrar aqui: método, resultado, conflitos resolvidos pelo coordenador, o que mudou no documento e as medidas novas.*

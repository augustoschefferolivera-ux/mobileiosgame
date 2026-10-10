<!--
Template: game-brief.md — o brief de UMA página.
Adaptado de Claude-Code-Game-Studios (Donchitos, MIT), arquivo .claude/docs/templates/game-brief.md
https://github.com/Donchitos/Claude-Code-Game-Studios — acrescidos os campos de mobile/iOS,
monetização, classificação etária e a checagem de escopo compatível com IA.

Regra: cabe em uma tela. Se um campo pede um segundo parágrafo, você está escrevendo um GDD, não um brief.
No modo de rigor `minimal` (padrão deste banco de skills) este é o ÚNICO documento de design.
Engine e alvo NÃO entram aqui: ficam no ADR em docs/decisoes/ (ver /escolher-engine-e-alvo).
Preenchido por /brief-do-jogo; salvo em design/game-brief.md (caminho que CLAUDE.md, os hooks e o subagente critico leem).
-->
# Brief: [Título provisório]

**Pitch em uma frase:** [Descreva o jogo em uma frase. Se precisar de duas, corte até sobrar uma.]

## Loop central
<!-- O ciclo que o jogador repete: o que faz → o que ganha → por que repete. 2–4 bullets. -->
-

## Objetivo do jogador e estado de falha — o que "funcionando" significa
<!-- Como se vence/pontua e como uma partida termina ou falha. É daqui que saem os critérios de aceite
     verificáveis de feature_list.json. Uma ou duas linhas. -->
-

## Pilares (máximo 3)
<!-- Adjetivos que decidem empates de design. Ex.: "legível com uma mão", "uma decisão por segundo", "sem punição". -->
1.

## MVP — o que precisa existir para ser o jogo
<!-- Lista curta e implacável (≤ 7 itens). Cada item vira uma feature em feature_list.json com critério verificável. -->
- [ ] F-001 —
- [ ] F-002 —

## Fora de escopo — não vamos construir
<!-- A lista que salva o projeto. Seja específico: "sem multiplayer", "sem save na nuvem", "um modo só". -->
-

## Ordem de construção
<!-- O mais arriscado / o núcleo da diversão primeiro. Prove que é divertido antes de polir. -->
1.

## Público, dispositivo e sessão
| Campo | Valor |
|---|---|
| Público-alvo (uma linha: quem e o que sente) | |
| Dispositivo mínimo (define orçamento de performance) | ex.: iPhone 12 / iOS 17 |
| Orientação | retrato / paisagem / ambas |
| Sessão média | ex.: 3–5 min |
| Entrada | toque com um dedo / dois dedos / controle |
| Funciona offline? | sim / não |

## Monetização e classificação etária (afetam o design desde o início)
| Campo | Valor |
|---|---|
| Modelo | premium / anúncios / IAP leve / grátis |
| Loot boxes ou gacha? | Não — no Brasil a tabela da Apple classifica loot boxes como A18 |
| Apostas simuladas? | Não — A12 (infrequente) ou A18 (frequente) no Brasil |
| Chat ou IA generativa visível ao jogador? | sim / não — conta na classificação etária e exige 5.1.2(i), 1.2 e 4.7.1 |
| Faixa etária pretendida | 4+ / 9+ / 13+ / 16+ / 18+ |

## Compatibilidade com IA (checagem de escopo — todas devem ser verdadeiras ou justificadas)
- [ ] 2D, ou 3D leve, com regras definíveis em texto/código
- [ ] Sem multiplayer em tempo real
- [ ] Engine cujo ciclo construir → rodar → ver → ler log o agente fecha sozinho
- [ ] Nenhum formato binário opaco no caminho crítico (.uasset, prefabs/cenas binárias em escala)
- [ ] Assets planejados com licença de saída comercial global (sem exclusão UE/UK/Coreia)

---
<!-- RECOMENDADOS — uma linha cada. -->
**Direção de arte e áudio:** [ex.: "pixel art 32 px, paleta de 16 cores, chiptune lo-fi"]

**Jogo de referência (e os ~10% que o MVP mantém):** [ex.: "Threes — só a mecânica de juntar números em um tabuleiro 4×4; sem meta-progressão"]

# 19 · Prompt Técnico Inicial (sessão 1 de programação)

> Prompt pronto para abrir o chat de desenvolvimento. Versão corrigida: caminhos alinhados ao repositório, briefing técnico existente (doc 18), lista de leitura completa, monetização excluída explicitamente, glossário completo e guardas para arquivos do playbook que possam não existir.

---

```
## Antes de tudo

O plano do jogo está no repositório augustoschefferolivera-ux/mobileiosgame, branch
claude/ecstatic-sagan-g9k3x6, pasta docs/. Neste projeto ele deve estar copiado em design/gdd/
(mesmos nomes de arquivo: 00-visao-geral.md ... 19-prompt-tecnico-inicial.md, mais a pasta
pesquisa/). Se design/gdd/18-briefing-tecnico.md não existir, PARE e me peça os arquivos antes
de qualquer outra coisa.

Leia, nesta ordem:
1. CLAUDE.md e playbook/00-leia-primeiro.md e playbook/08-praticas-de-producao-web-phaser.md,
   SE existirem. Se não existirem, me avise em uma linha e siga sem eles.
2. design/gdd/18-briefing-tecnico.md (o briefing técnico: MVP, números e features F-001 a F-010).
   Dentro do recorte do MVP, ele prevalece sobre o GDD.
3. design/gdd/00, 02, 03, 04, 05, 06, 07, 08, 10, 11, 12 e 13 (seção 1.2), nesta ordem.
   O 10 tem as fórmulas da simulação; o 12 tem as restrições do Safari/iOS; o 13 §1.2 tem a
   resolução lógica e os tamanhos de corpo e tile.
4. design/gdd/01 e 14 só para nomes e glossário; 17 §4 para o esquema de IDs de texto.
5. NÃO leia o 09 (monetização) nem o 15 (roadmap) nem o 16 nesta fase. Ignore toda menção a
   anúncios nos docs 02 §8 e 11 §3.12: o MVP não tem monetização nenhuma.
Depois rode /checkpoint-e-retomada, se o comando existir.

## O jogo

Vigília das Cinzas (Ashen Vigil): survivor-like com combate soulslike para iPhone em retrato, uma
mão. Vigílias de 20 minutos em 4 Horas de 5 minutos, com Fogueiras (checkpoints diegéticos com
autosave) após cada marco, Apagar (derrota) e Amanhecer (vitória ao derrotar o Chefe da Região),
hub Santuário das Brasas. Conteúdo completo do GDD: 12 Vigilantes, 38 armas, 18 passivas,
34 Uniões, 20 Relíquias, 32 inimigos, 13 chefes, 6 regiões, árvore de 112 nós, Ciclos e Pactos.
Classificação alvo 12+. Monetização: nenhuma no primeiro lançamento (PWA instalável; App Store
depois, se a retenção justificar).

Glossário obrigatório em código, dados e tela: Vigília, Vigilante, Hora, Amanhecer, Apagar,
Fogueira, Santuário, Oco, Guardião, Chefe Menor, Chefe da Região, Brasa, Alma, Cinzas (de XP e
Cinzas Perdidas), Frasco, Postura, Postura Quebrada, Relíquia, Maldição, Memória, Eco, Ciclo,
Pacto, União, Pesquisa, A Fome. Palavras que nunca aparecem em código, dados ou tela: run,
checkpoint, zumbi, roguelike, game over, upgrade, gema, menu principal, fusão, mutator, NG+.

## Como trabalhar (vale para toda sessão)

- Stack decidido: Phaser 4.2.1 + TypeScript 5.9 + Vite 8 (ADR-0001). Não discuta engine. O
  doc 12 recomenda PixiJS e aceita Phaser 4; o ADR-0001 prevalece. O doc 12 sugere simulação em
  Web Worker com postMessage de TypedArrays (sem SharedArrayBuffer); decida no ADR-0002.
- Antes de escrever código de qualquer subsistema do Phaser, procure a skill oficial em
  node_modules/phaser/skills/<assunto>/SKILL.md. Se a pasta não existir, use a documentação
  oficial do Phaser 4 e registre isso em progress.md. Não reinvente o que a documentação cobre.
- Arquitetura obrigatória: simulação pura em src/logica/ (sem Phaser, passo fixo 60 Hz com
  acumulador e teto de 5 passos por frame, RNG com seed separado para diretor e level up,
  entidades em arrays tipados SoA com pools pré-alocados, grade espacial própria para hordas) e
  cenas finas em src/cenas/. Conteúdo (armas, inimigos, chefes, regiões/timelines, nós da
  árvore, textos) só em src/dados/*.json com JSON Schema e teste de integridade referencial.
  Nenhuma string visível no código: tudo em src/dados/textos/pt-BR.json por id no formato
  BLOCO.SUBBLOCO.NÚMERO (design/gdd/17 §4), verificado por lint.
- Números da simulação: use exatamente os do briefing (design/gdd/18 §3): 390×844 pontos a 2×,
  corpo = 32 px, 60 Hz, esquiva com 12 passos de i-frames e 3 de recuperação, aparo com janela
  de 11 passos e falha de 24, stamina 100 (esquiva 25, aparo 15, devolve 30), XP(n) = 10 + 8(n−1)
  + 0,6(n−1)², armadura A/(A+20), HP de inimigo × (1 + 0,12·min), dano × (1 + 0,05·min), chefe
  HP × (1 + 0,04·nível), Postura 100. Qualquer número que não esteja no briefing nem no GDD:
  pare e pergunte.
- Orçamento: 60 fps em iPhone 12 com 300 inimigos + 200 projéteis; ≤ 150 draw calls; atlases
  ≤ 2048² @2×; memória total < 150 MB; canvas de tamanho fixo após o boot; resolução nunca
  acima de 2×; zero alocação por frame no caminho quente; degradação graciosa (partículas →
  luz → conversão de massa excedente em Ocos Grandes) quando o frame passar de 16 ms por 2 s.
  window.__GAME_DEBUG__ expõe fps, passo, entidades vivas por tipo, passos perdidos e memória
  estimada.
- Plataforma iOS (design/gdd/12, lista obrigatória): tela "Toque para acender a Chama" desbloqueia
  o áudio em touchend; viewport-fit=cover e safe-area-inset; 100dvh; touch-action: none e
  preventDefault em touchmove não passivo; sem Fullscreen, sem Vibration, sem orientation lock
  (overlay em paisagem); pausa automática em visibilitychange e em interrupção de áudio;
  autosave na Fogueira e a cada 60 s com retomada após a aba morrer; IndexedDB com snapshot em
  localStorage e versão de schema.
- Controles (design/gdd/02 §4 e 11 §1): joystick flutuante na metade inferior (zona morta 0,15,
  raio 60 pt, reposiciona a cada toque); esquiva por swipe > 400 pt/s ou toque duplo; botão de
  Aparo de 80 pt e botão de Frasco de 72 pt no canto inferior direito acima da safe-area; nenhum
  alvo de toque menor que 72 pt; level up com confirmação por segundo toque.
- Uma feature por sessão, em feature_list.json. "Pronto" = scripts/verify.sh --feature F-xxx
  verde (build, Vitest, Playwright com --taps-game e --seed), evidência em
  production/evidencias/F-xxx/ conforme a coluna "Evidência exigida" do briefing,
  /critico-independente ≥ 7 (se o comando existir), commit descritivo. O Stop hook, se
  configurado, não deixa encerrar sem isso.
- Diff pequeno (≤ ~300 linhas), módulo pequeno, scripts/novo-modulo.sh para criar lógica + teste
  + cena (se o script não existir, crie-o na F-001).
- Decisão de design que não está no GDD nem no briefing: pare e pergunte. Registre decisões
  técnicas em docs/decisoes/ADR-000N-*.md e em progress.md.
- Ao final de cada sessão: commit e /checkpoint-e-retomada (ou um resumo em progress.md se o
  comando não existir).

## Sessão 1 (esta): brief, arquitetura e lista de features. PARE para eu aprovar em cada etapa.

1. /brief-do-jogo (ou escreva manualmente) a partir do GDD, com o MVP fixado como a fatia
   vertical "Primeira Vigília" do briefing técnico (design/gdd/18 §1 e §2): Aldric; Charneca das
   Lanternas; Oco das Lanternas, Oco Grande e Noviça de Sal; placeholder Oco Grande Coroado nos
   marcos 5/10/15; O Lanterneiro; Espada Longa, Facas de Sal e Círculo de Sal; Elmo Sem Rosto e
   Luvas de Fole; União Lâmina do Juramento Eterno; Fogueira (Descansar, Forjar, Partir) com
   autosave e retomada; Apagar com Cinzas Perdidas (mancha, sem Eco); Amanhecer; A Fome aos 23:00
   como derrota; Santuário mínimo com Iselda e os 8 nós de estatística da árvore de Fundação;
   nenhuma monetização; formas geométricas e paleta provisória (#1a1f2b e #ffb347). Escreva
   design/game-brief.md e PARE.
2. docs/decisoes/ADR-0002-arquitetura-da-simulacao.md: passo fixo com acumulador, SoA e pools,
   grade espacial, arquétipos de alvo de arma (direção do movimento, mais próximo, aura), diretor
   por timeline (JSON derivado da tabela do briefing §3.7), máquina de estados da Vigília (Acender
   → Hora I..IV → Marco → Fogueira → ... → Chefe → Amanhecer | Apagar | A Fome), save versionado
   com retomada, decisão sobre Worker, estratégia de detecção do teto de entidades (300/500). Use
   os números do briefing §3. PARE.
3. feature_list.json com F-001 a F-010 exatamente como a tabela do briefing técnico (§4), cada
   uma com critério de aceite verificável (teste, screenshot ou __GAME_DEBUG__) e a evidência
   exigida. Crie src/dados/schemas/ com os JSON Schemas de arma, passiva, união, inimigo, chefe,
   região/timeline, nó da árvore e texto, e o teste de integridade em tests/dados.test.ts
   (toda referência por id entre arquivos deve resolver; toda string de tela deve ter id em
   pt-BR.json; nenhuma palavra proibida do glossário em ids, nomes ou textos). PARE.
4. Só então comece F-001 com /ciclo-de-feature (ou manualmente, seguindo a definição de "Pronto"
   acima). Não comece F-002 nesta sessão.

## Sessões seguintes

/checkpoint-e-retomada (ou leia progress.md).
/ciclo-de-feature na próxima feature de feature_list.json, na ordem F-002 → F-010.
Leia a skill ou a documentação oficial do Phaser do assunto antes de codar. Só feche com verify
verde, evidência e crítico ≥ 7. Decisão fora do GDD/briefing: pare e pergunte. Ao final: commit e
/checkpoint-e-retomada.

F-010 inclui teste em iPhone real (11 ou 12, e 14 ou mais novo) com vídeo e captura de memória
do Safari Web Inspector; sem isso a fatia vertical não está pronta.

Arte, áudio e textos finais só depois de F-010, começando por /direcao-de-arte-e-style-card e
/direcao-de-audio-e-sound-bible (design/gdd/13 é a base), com aprovação minha antes de gerar
qualquer asset. Até lá: formas geométricas, paleta provisória, um som placeholder por evento
crítico (aparo, esquiva perfeita, Quebra de Postura) e textos placeholder com ids definitivos.
Depois de F-010 a ordem sugerida está no briefing §5.
```

# P2 · Pesquisa: o que define um soulslike e como fundi-lo com survivor-like / roguelite top-down no mobile

> Relatório de pesquisa (outubro de 2026). Fontes no documento 16. Números de fóruns estão sinalizados.

## 1. Pilares centrais do soulslike

**Definição.** Subgênero de action-RPG marcado por dificuldade alta, narrativa ambiental e dark fantasy, derivado de Demon's Souls e Dark Souls. Ensaios convergem em quatro conceitos: dificuldade, morte repetida como motor de aprendizado, escassez de pontos de salvamento e informação indireta. O gênero é definido menos por uma lista de mecânicas e mais pelo arco emocional tensão → derrota → compreensão → domínio.

**Stamina e comprometimento.** Toda ação consome stamina; animações não cancelam. O inimigo telegrafa com wind-ups longos. Loop: ler → esperar → punir.

**Dodge roll com i-frames.** Em Dark Souls 1 todos os rolamentos (fast, mid, fat) têm 11 frames de invencibilidade; a diferença está na duração e nos frames de recuperação (em que o jogador recebe 1,4× de dano). Fast roll exige ≤ 25% de equip load. Lição: a janela de invencibilidade é fixa e previsível; a recuperação pune o peso. Pascal's Wager foi criticado justamente por "não ter os i-frames previsíveis que fazem o combate Souls funcionar".

**Parry/riposte e poise.** Parry = janela estreita que abre um crítico. Poise governa hyper armor. Sekiro substitui stamina por postura: deflects enchem a barra do inimigo até um golpe mortal; feedback audiovisual do deflect perfeito (faíscas, "clink") é parte da legibilidade.

**Checkpoints e cura limitada.** Fogueira restaura HP e Estus, mas respawna inimigos. DS3 começa com 3 Estus + 1 Ashen; cada Estus Shard adiciona 1 carga (até 15). Cura é orçamento por trecho; progressão de cura vem de exploração.

**Souls perdidos (bloodstain).** Toda a moeda cai no local da morte; morrer de novo perde tudo. Copiada por Hollow Knight (Shade), Blasphemous (Guilt Fragment), Salt and Sanctuary.

**Stats, scaling e builds.** Armas com graus S/A/B/C/D/E em STR/DEX/INT/FTH. Titanita em tiers (Shard → Large → Chunk → Slab, com Slab raríssimo). Infusões e Ashes of War trocam afinidade e scaling. Armaduras: peso vs. poise vs. resistências.

**Status effects (Elden Ring).** Bleed: ~15 a 25% do HP máx. ao encher; Frostbite: ~10 a 25% + 20% mais dano recebido; Sleep; Madness; Scarlet Rot; Death Blight. Padrão "barra de acúmulo → gatilho binário com efeito pesado".

**Great Runes.** Buff de corrida consumível (Rune Arc), até a morte. Padrão direto para roguelite.

**Covenants, hollowing, NG+.** Covenants são facções trocáveis com ranks por itens entregues. Hollowing: em DS2 cada morte reduz 5% do HP máx. até 50%. NG+ em DS3: ~40% no primeiro ciclo e ~8% por ciclo depois (fóruns).

**Mundo e narrativa ambiental.** Firelink como hub conectado com atalhos; narrativa via flavor text e cenário (GDC 2017); Miyazaki quer que o jogador preencha lacunas.

## 2. Soulslikes top-down/2D: o que se traduz bem

- **Salt and Sanctuary:** creeds (facções) que determinam quais santuários funcionam.
- **Blasphemous:** Guilt (fragmentos no mundo, máx. 7; reduz Fervour); Rosary beads (52, slots limitados); Penitences (modificadores de run: Unwavering Faith, Bleeding Heart, True Guilt). Melhor catálogo pronto de "pactos" com sabor souls.
- **Hollow Knight:** 45 charms, 1 a 4 notches, 3 → 11 notches; overcharm dobra o dano recebido. SOUL: 11 por golpe; Focus custa 33 e cura lentamente (interruptível). Shade leva Geo e 1/3 da barra.
- **Nine Sols:** deflect estilo Sekiro que acumula Qi gasto em Talismans; parry imperfeito custa HP.
- **Eldest Souls:** boss rush de 10 chefes; stamina limitada; cura por ataques carregados acertados (não por pickups).
- **Death's Door / Hyper Light Drifter / Tunic:** melee recarrega recurso ranged; HP fixo e só frascos aumentam; Tunic usa manual in-game fora de ordem como lore e tutorial.
- **Hades:** Pact of Punishment (Heat) após a primeira vitória; Mirror of Night com Darkness; Weapon Aspects com Titan Blood; Keepsakes por relação com NPCs; 22.000+ linhas dubladas; "cada morte é a próxima página" (GDC 2021). Hades II: Arcana em grade com Grasp.
- **Loop Hero / Noita:** balanceie o pool; mortes ilegíveis destroem sessões curtas.

## 3. Híbridos existentes e soulslikes mobile

- **Elden Ring Nightreign (2025):** expedições de 3 dias (~15 min cada), círculo fechando, Nightlord no 3º dia; sem distribuição de stats; relíquias como meta. Recepção 6 a 9/10: "fusão quase perfeita" vs. "runbacks longos"; solo mal balanceado.
- **Death Must Die:** "Hades + Vampire Survivors + Diablo"; o dodge roll é citado como o que "muda fundamentalmente o gênero".
- **Soulstone Survivors:** dodge dedicado; chefes por contagem de kills, não timer; crítica: grind.
- **Halls of Torment:** clique para atacar; sistema de poços.
- **Keeper's Toll:** "horde survival + ARPG com toque soulslike"; combate elogiado, poucos chefes.
- **Curse of the Dead Gods:** dodge e parry perfeitos; Corruption acumulada que aplica Curses aleatórias; "Hades no hard mode".
- **Megabonk:** survivor 3D com movimento, sem dodge formal.
- **Mobile:** Pascal's Wager (touch insuficiente, dodge sem i-frames previsíveis; mitigou com inimigos lentos e botões redimensionáveis); Grimvalor (dash perfeito dá slow-mo); Dead Cells (stick flutuante, swipe para esquivar, Auto-Hit opcional); Hades iOS (botões próximos demais); Hyper Light Drifter iOS (swipe à esquerda, botões à direita: "excelente touch"); Soul Knight (top-down roguelite com 120+ armas); Archero (parado = atira: ancestral mobile do attack commitment). "Bloodborne Mobile" é golpe.

**Padrões de touch para dodge/parry:** stick flutuante na metade esquerda; botões grandes à direita com hitboxes generosas; swipe como dodge direcional; auto-attack remove o botão de ataque e libera o polegar direito só para dodge/parry; janelas ampliadas; feedback forte (slow-mo, faíscas); HUD fora das zonas de polegar.

## 4. Padrões que valem roubar

1. **Stamina coexistindo com auto-attack:** auto-attack livre; stamina paga dodge, parry, ataque pesado e sprint.
2. **Dodge roll com i-frames fixos (~200 ms)** e recuperação variável por peso; i-frames contra corpos e projéteis.
3. **Parry com janela 150 a 250 ms que gera recurso** (Nine Sols/Lies of P) e papel ofensivo em hordas; ataques "Fury" (vermelhos, só esquiva) ensinam a diferença.
4. **Arenas de chefe mid-run** com fog gate, 2 fases, cues claros; chefes que "lembram" que você perdeu.
5. **Fogueira dentro da run:** recarrega frascos, permite trocar charms e gastar souls, mas aumenta a intensidade (DS2).
6. **Souls perdidos em roguelite:** a moeda meta fica num bloodstain guardado por um Shade (cópia sua com a build anterior).
7. **Hollowing como risco/recompensa.**
8. **Upgrade de arma via titanita** em tiers com Slab raro.
9. **Facções tipo covenant** com oferendas e ranks.
10. **Lore por descrição de item**, 2 a 3 linhas.
11. **Modificadores de dificuldade** (Heat/Penitences) gateando recompensas raras.
12. **Cura ativa** (ataques carregados, Focus lento) em vez de pickups passivos.

## 5. Worldbuilding dark fantasy

**Temas:** ciclos de Fogo e Escuridão; sacrifício para prolongar uma era cansada; divindades mortas ou loucas; maldição; conhecimento perigoso (Insight/Frenzy em Bloodborne); religião opressora e culpa (Blasphemous); influência de Berserk.

**Nomes:** função + condição ("Soul of Cinder", "Lord of Hollows", "Nightlord"); títulos clericais; latinismos ibérico-católicos; relíquia + proveniência ("Titanite Slab", "Human Dregs").

**Bestiário:** hollows; cavaleiros caídos; dragões primordiais; o Abismo; sangue e bestas; praga/podridão; insetos e colmeias; gigantes; igreja gótica/inquisição; horror cósmico.

**Arquétipos de chefe:** gatekeeper (ensina as regras); herói caído (aliado corrompido); dupla (ágil/pesado; o sobrevivente absorve o outro); besta gigante; deus/semideus com fase 2 que muda a regra; espelho/self (Shade, Soul of Cinder); mestre de postura (só parry resolve); chefe com "ataque que muda tudo".

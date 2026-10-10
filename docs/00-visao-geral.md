# 00 · Visão Geral — *Vigília das Cinzas*

> Documento-mestre do jogo. Resume o conceito, os pilares, o público, a plataforma e aponta para os documentos detalhados. Se alguém da equipe ler um único arquivo, é este.

---

## 1. Ficha

| Campo | Valor |
|---|---|
| **Título** | Vigília das Cinzas *(título internacional: Ashen Vigil)* |
| **Gênero** | Survivor-like (bullet heaven) com combate soulslike · roguelite com árvores de pesquisa |
| **Plataforma** | Web (HTML5/PWA) para **iPhone em retrato**, instalável na Tela de Início; mesma build para Android, desktop e portais (Poki, CrazyGames, Telegram, Discord). App Store via empacotamento em fase 2. |
| **Duração de uma partida (Vigília)** | ≈ 20 minutos (4 Horas de 5 min, com checkpoints) |
| **Modelo de negócio** | Gratuito com anúncios recompensados opcionais; compra única remove anúncios; DLCs de região baratos; cosméticos; passe de temporada não expirável. Zero pay-to-win. |
| **Idiomas** | Português (BR) e inglês no lançamento |
| **Classificação alvo** | 12+ |
| **Equipe** | 4 a 6 pessoas (ver documento 15) |
| **Tempo até o lançamento** | 12 a 14 meses a partir da pré-produção |

## 2. Pitch

**Em uma linha:** *Vampire Survivors* com a alma de *Dark Souls*: as armas atacam sozinhas, as hordas crescem a cada minuto, mas você só sobrevive se ler os ataques, gastar stamina em esquivas com janela de invulnerabilidade, aparar no momento certo e derrotar chefes que não morrem só de encostar.

**Em um parágrafo:** Em Thelune, a Primeira Chama virou brasa e a morte parou de funcionar. Você é um Vigilante, alguém que ainda carrega uma centelha própria e que, por isso, não pode morrer de verdade. A cada noite você desce para alimentar a Chama com as almas da horda. Cada partida é uma Vigília de 20 minutos contra centenas de Ocos, Sepultadoras, Ferreiros Cegos, Páginas Vivas e Caçadores, encerrada por um chefe com fases, Postura e ataques telegrafados. Morrer o devolve ao Santuário das Brasas, onde as Almas recolhidas compram memórias esquecidas (a árvore de pesquisa), personagens são despertados por feitos, e NPCs lembram de você. Quanto mais você joga, mais o mundo lembra quem foi.

## 3. Por que este jogo, por que agora

1. **O gênero survivor-like é enorme e ainda cresce.** Vampire Survivors mobile passou de 3 milhões de downloads em semanas sendo gratuito e com anúncios só opcionais; Megabonk vendeu 1 milhão em duas semanas em 2025; Survivor.io fatura milhões por mês. Há audiência e há apetite por variações.
2. **A fusão com soulslike está quase vazia.** Death Must Die provou que um rolamento com invulnerabilidade "muda fundamentalmente o gênero" (crítica); Soulstone Survivors e Halls of Torment adicionaram ARPG mas não a leitura de ataques, o aparo e a Postura. Nightreign (FromSoftware) validou "Souls + roguelite", mas é um jogo de console de 60 dólares. Ninguém fez isso **para uma mão, em 20 minutos, no celular**.
3. **A web no iPhone amadureceu.** iOS 26 abre qualquer página da Tela de Início como app; WebGPU chegou ao Safari; o armazenamento deixou de ser limitado; Apple Pay funciona na web sem comissão da loja; portais como Poki e CrazyGames pagam por tráfego. Um estúdio pequeno pode lançar sem passar pela App Store e sem perder 30%.
4. **Brasil como mercado-base.** 55 milhões de brasileiros jogam no celular; Pix domina pagamentos; o público de roguelite é fiel e barulhento. Escrever em português primeiro e traduzir para inglês é uma vantagem, não um custo.

## 4. Pilares de design (toda decisão é testada contra eles)

| # | Pilar | O que significa | O que proíbe |
|---|---|---|---|
| 1 | **Ler, não reagir** | Todo ataque perigoso é telegrafado; o jogador vence por leitura, não por reflexo puro. | Dano súbito sem aviso; mortes inexplicáveis. |
| 2 | **O polegar decide duas coisas** | Mover e… esquivar ou aparar. As armas cuidam do resto. | Botões de ataque; combos; menus na luta. |
| 3 | **Toda morte paga** | Almas, Memórias, progresso de feitos e Cinzas Perdidas recuperáveis. | Vigília "zerada". Grind sem retorno. |
| 4 | **A meta amplia, não substitui** | Árvore dá variedade e teto; habilidade vence. | Nós que tornam a Charneca trivial; stat +50%. |
| 5 | **O mundo lembra** | NPCs, chefes-espelho e Ecos refletem o que o jogador fez. | Hub estático; texto de lore genérico. |
| 6 | **20 minutos, uma mão, sem culpa** | Checkpoints, pausa, autosave, sessões curtas. | Timers de energia; punição por fechar o app. |
| 7 | **Justo no bolso** | Tudo que afeta o jogo vem jogando. | Gacha, loot box, anúncio forçado, P2W. |

## 5. O que torna o jogo diferente (resumo das mecânicas-chave)

| Mecânica | Documento | Resumo |
|---|---|---|
| **Stamina só para ações deliberadas** | 02 | Auto-ataque é livre; esquiva, aparo, corrida e Frasco gastam stamina. |
| **Esquiva com i-frames fixos e peso** | 02 | 0,20 s de invulnerabilidade sempre; o peso das armas muda recuperação e distância, como em Souls. |
| **Aparo que redireciona todas as armas** | 02, 04 | Aparar um ataque branco atordoa em área e faz todas as armas dispararem com dano ×2 por 1,5 s. |
| **Ataques brancos vs. vermelhos** | 02, 06 | Brancos se aparam; vermelhos só se esquivam. Dois gestos, dois significados. |
| **Fogueiras dentro da Vigília** | 02 | Checkpoint após cada Hora: recarregar Frascos (e aumentar a intensidade) ou não; forjar Uniões; autosave. |
| **Chefes com Postura e fases** | 06 | Dano reduzido fora de janela; Postura cheia abre 3 s críticos. |
| **Cinzas Perdidas + Eco** | 02, 05 | 30% das Almas ficam onde você morreu, guardadas por uma cópia sua da última Vigília. |
| **Uniões** | 04 | Arma nível 8 + passiva específica = arma nova, em baú ou na Forja da Fogueira. 34 Uniões. |
| **Quatro atributos, quatro deuses** | 03, 04, 08 | Força/Destreza/Inteligência/Fé escalam armas com graus E a S; as árvores seguem os mesmos deuses. |
| **Árvore em grade que revela vizinhos** | 08 | 112 nós, pares exclusivos, nós-chave com troca, reembolso gratuito. |
| **Pactos (Maldição 0 a 10)** | 02, 10 | Dificuldade comprada por recompensa; Brasa garantida na primeira vitória de cada nível. |
| **12 Vigilantes com maldição própria** | 03 | Cada personagem tem uma troca mecânica que muda o modo de jogar. |
| **Chefe final que lê seu perfil** | 06 | A Fome usa suas armas mais usadas e suas Uniões. |

## 6. Conteúdo no lançamento

| Categoria | Quantidade |
|---|---|
| Personagens jogáveis | 12 (+6 no primeiro ano) |
| Armas | 38 (7 por deus + 3 da Fome) |
| Uniões | 34 |
| Passivas | 18 |
| Relíquias | 20 |
| Inimigos | 32 + 2 especiais |
| Chefes | 13 (6 de Região, 6 Menores, 1 secreto) |
| Regiões (mapas) | 6 |
| Modos de mapa | 3 |
| Nós de pesquisa | 112 |
| Pactos | 6 |
| Memórias (textos de lore) | ≈ 150 |
| Feitos | ≈ 300 |
| Músicas | 17 faixas em camadas |
| Horas até o fim do Ciclo I | 25 a 35 |
| Horas até 100% | 60 a 80 |

## 7. Público

- **Primário:** jogadores de 18 a 35 anos que jogaram Vampire Survivors, Brotato, Hades ou Dead Cells no celular e acham o gênero "fácil demais depois de 10 horas". Querem desafio, mas em sessões de ônibus.
- **Secundário:** fãs de Souls que não jogam no celular porque "não dá para jogar Souls no touch". O pitch para eles é: dois gestos, janelas previsíveis, chefes de verdade.
- **Terciário:** público de portais web (Poki, CrazyGames) que descobre o jogo sem saber o que é um soulslike. O tutorial de 3 minutos existe para eles.

## 8. Referências por sistema (o que estudamos)

| Sistema | Referências principais |
|---|---|
| Core survivor | Vampire Survivors, Brotato, 20 Minutes Till Dawn, Halls of Torment, Megabonk |
| Combate souls | Dark Souls 1 a 3, Elden Ring, Sekiro, Bloodborne, Lies of P, Nine Sols, Eldest Souls |
| Híbridos | Death Must Die, Soulstone Survivors, Curse of the Dead Gods, Elden Ring Nightreign, Keeper's Toll |
| Meta e narrativa | Hades 1 e 2, Rogue Legacy 2, Dead Cells, Hollow Knight, Blasphemous, Slay the Spire |
| Mobile e touch | Dead Cells mobile, Hades iOS, Hyper Light Drifter iOS, Grimvalor, Soul Knight, Archero, VS mobile |
| Plataforma web/iOS | WebKit (Safari 26), PixiJS 8, Phaser 4, Poki SDK, CrazyGames SDK, Apple Pay JS |

Bibliografia completa: documento 16. Relatórios de pesquisa na íntegra: pasta `pesquisa/`.

## 9. Riscos principais

| Risco | Mitigação |
|---|---|
| Aparo no touch não "sentir" bem | Janela de 0,18 s, telegrafo de 0,5 s, feedback de congelamento; teste com 50 jogadores antes de qualquer mudança; Modo Brasa Gentil |
| Performance no iPhone antigo (jetsam) | Orçamento de 300 inimigos / 150 MB; degradação graciosa; autosave em Fogueira |
| Conteúdo insuficiente para 60 h | 112 nós, Têmpera, Ciclos, Pactos, Feitos e temporadas de 6 semanas |
| Monetização fraca no Brasil | Brasa Eterna barata via Pix; receita de anúncios tratada como secundária; portais e mercados em inglês |
| Rejeição da App Store (fase 2) | Opcional; só com features nativas reais |

## 10. Mapa dos documentos

| # | Documento | Conteúdo |
|---|---|---|
| 00 | Visão Geral | este arquivo |
| 01 | Mundo e Narrativa | cosmologia, Santuário, NPCs, regiões (lore), glossário, Ciclos |
| 02 | Core Loop e Combate | estrutura da Vigília, Fogueiras, controles, stamina, esquiva, aparo, level up, morte, Pactos |
| 03 | Personagens | 12 Vigilantes + 6 futuros, atributos, maldições, desbloqueios |
| 04 | Armas, Passivas e Uniões | 38 armas, 18 passivas, 34 Uniões, status, Relíquias |
| 05 | Bestiário | 32 inimigos por facção, camadas, eventos |
| 06 | Chefes | 13 chefes com fases e movesets |
| 07 | Mapas e Diretor de Spawn | 6 regiões, tabela minuto a minuto, segredos |
| 08 | Árvore de Pesquisa e Meta | 112 nós, custos, Têmpera, Ciclos, Codex |
| 09 | Economia, Monetização e Mercado | preços, anúncios, projeção, distribuição |
| 10 | Dificuldade, Balanceamento e Telemetria | fórmulas, alvos, eventos de telemetria |
| 11 | UI, UX e Telas | todas as telas, onboarding, acessibilidade |
| 12 | Tecnologia e Plataforma iOS Web | restrições do Safari, engine, orçamentos |
| 13 | Arte e Áudio | direção visual, paleta, música em camadas |
| 14 | Live-Ops, Retenção e Comunidade | diário, semanal, temporadas, Feitos |
| 15 | Roadmap de Produção | equipe, fases, marcos, custos |
| 16 | Referências | bibliografia completa |
| pesquisa/ | Relatórios de pesquisa | 4 relatórios na íntegra |

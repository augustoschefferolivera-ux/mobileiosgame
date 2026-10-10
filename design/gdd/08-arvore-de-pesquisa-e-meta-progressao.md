# 08 · Árvore de Pesquisa e Meta-Progressão

> O sistema que o jogador alimenta com as Almas de cada Vigília. Quatro árvores (uma por deus) mais uma quinta oculta (A Fome), em grade que revela vizinhos, com nós de estatística, desbloqueio, modificador e nós-chave com troca. Baseado em: loja de PowerUps de Vampire Survivors (encarecimento global + reembolso), Espelho da Noite de Hades (pares alternativos), Arcana de Hades II (grade 5×5 que revela vizinhos), Blessings de Halls of Torment, árvore passiva de Path of Exile (keystones) e curvas de custo de jogos idle.

---

## 1. Princípios

1. **Pesquisa é memória recuperada.** Cada nó tem nome de frase ("O peso do martelo do seu pai") e o número no tooltip. A Guardiã Iselda é a interface.
2. **Meta amplia variedade e teto, não substitui habilidade.** Metas: um jogador com a árvore 100% completa e sem habilidade não vence a Cisterna; um jogador habilidoso com 20% da árvore vence a Charneca. Nós de stat são deliberadamente modestos (+3% a +5% por rank).
3. **Reembolso gratuito por árvore**, fora da Vigília (regra de VS e Hades). Mobile precisa de perdão.
4. **Cadência:** 1 nó pequeno por Vigília; 1 nó grande a cada 4 a 6 Vigílias. Verificado por telemetria (documento 10).
5. **Gating em camadas:** Almas (livre) → Brasas (nós-chave e Ciclos) → feitos cumulativos (personagens, documento 03).
6. **A árvore muda o Santuário visualmente** (documento 01).

## 2. Estrutura

| Árvore | Deus | Tema | Nós | Cor |
|---|---|---|---|---|
| **Fundação** | Orun | HP, Armadura, Poise, armas pesadas, Reviver | 24 | bronze |
| **Caçada** | Sélide | Velocidade, stamina, esquiva, projéteis, Sorte | 24 | verde-cinza |
| **Memória** | Vharos | Recarga, área, duração, Reroll/Pular/Banir, XP, Codex | 24 | azul-tinta |
| **Votos** | Ama-Nhu | Frascos, cura, aparo, Almas/Ganância, Cinzas Perdidas, maldições | 24 | branco-osso |
| **Fome** (oculta, abre no Ciclo II) | A Fome | Maldição, Pactos, armas da Fome, multiplicadores de Brasa | 16 | preto-vermelho |
| **Total** | | | **112** no lançamento (96 visíveis) | |

### 2.1 Forma
Cada árvore é uma **grade 5×5** (Fome: 4×4) com o nó central já aberto. Comprar um nó **revela** os vizinhos ortogonais. Os 4 cantos são **nós-chave** (keystones) e exigem Brasas. Em cada linha há um **par exclusivo** (dois nós adjacentes marcados com um laço: comprar um bloqueia o outro; trocar custa 1 Brasa, estilo Espelho da Noite).

```
  ┌───┬───┬───┬───┬───┐
  │ K │ s │ u │ s │ K │     K = nó-chave (Brasas)
  ├───┼───┼───┼───┼───┤     s = estatística (ranks)
  │ s │ m │ s │ m │ s │     u = desbloqueio
  ├───┼───┼───┼───┼───┤     m = modificador
  │ u │ s │ ● │ s │ u │     ● = centro, aberto
  ├───┼───┼───┼───┼───┤     ═ = par exclusivo (um ou outro)
  │ s │ m═══m │ s │ s │
  ├───┼───┼───┼───┼───┤
  │ K │ s │ u │ s │ K │
  └───┴───┴───┴───┴───┘
```

### 2.2 Tipos de nó
| Tipo | Proporção | Ranks | Exemplo |
|---|---|---|---|
| **Estatística** | 55% | 3 a 5 | +4% HP máximo por rank |
| **Desbloqueio** | 20% | 1 | Arma entra no sorteio da Vigília; Relíquia; modo de mapa |
| **Modificador** | 15% | 1 | "Frascos também recuperam 30 de stamina" |
| **Par exclusivo** | 5% | 1 | "Esquiva mais longa" ou "Esquiva mais curta, i-frames +2" |
| **Nó-chave** | 5% | 1 | Troca forte: "Sem Frascos; +40% HP e Fogueiras curam tudo" |

## 3. Curva de custo

Fórmula (síntese de VS + idle games, ajustada para 3 a 6 Vigílias por nó grande):

```
custo(nó, rank) = base(nó) × 1,12^(rank−1) × (1 + 0,015 × ranks_globais_comprados)
```

| Tipo | Base (Almas) | Ex.: 1º rank com 0 globais | Ex.: 3º rank com 40 globais |
|---|---|---|---|
| Estatística comum | 300 | 300 | 602 |
| Estatística forte (Reviver, Frasco) | 1.200 | 1.200 | 2.410 |
| Desbloqueio de arma | 800 | 800 | — |
| Modificador | 1.500 | 1.500 | — |
| Par exclusivo | 2.000 | 2.000 | — |
| Nó-chave | 5.000 Almas **+ 3 Brasas** | — | — |

Ganho médio de Almas por Vigília (Ciclo I, sem bônus): Apagar na Hora II ≈ 400; Apagar na Hora IV ≈ 1.100; Amanhecer ≈ 1.600 (×1,5). Nós de Ganância (Votos) sobem isso em até +60%, mantendo a cadência quando os preços crescem. Custo total da árvore visível ≈ **210.000 Almas** + 48 Brasas, planejado para ~120 a 150 Vigílias (40 a 50 horas), igual à vida útil típica de VS antes dos DLCs.

**Reembolso:** gratuito, por árvore, zera também o fator global daquela árvore.

## 4. Conteúdo das árvores (completo)

### 4.1 Fundação (Orun) — "o peso do mundo"
| Pos | Nome | Tipo | Efeito |
|---|---|---|---|
| Centro | *Primeira brasa* | — | Aberto. +5 HP. |
| s | *O peso do martelo do seu pai* | Stat ×5 | +4% Poder de armas pesadas |
| s | *Pele que esqueceu de sangrar* | Stat ×5 | +2 Armadura |
| s | *Fôlego de forja* | Stat ×5 | +5% HP máximo |
| s | *Pés plantados* | Stat ×3 | +10% Poise |
| s | *Casco* | Stat ×3 | Invulnerabilidade pós-acerto +0,05 s |
| s | *Bigorna no peito* | Stat ×3 | +3% redução de dano de contato |
| s | *Ferro frio* | Stat ×3 | −5% custo de stamina da esquiva pesada |
| s | *Mãos de aprendiz* | Stat ×3 | Armas de Orun começam no nível 2 |
| u | *Lança de Fundição* | Desbloqueio | Arma entra no sorteio |
| u | *Escudo Rachado* | Desbloqueio | Arma |
| u | *Correntes de Prisioneiro* | Desbloqueio | Arma |
| u | *Relíquia: Elmo Sem Rosto* | Desbloqueio | Relíquia |
| m | *Levantar de novo* | Modificador | +1 Reviver por Vigília (50% HP) |
| m | *Terra firme* | Modificador | Ficar parado 2 s = +10 Armadura até se mover |
| m | *Golpe de misericórdia* | Modificador | Armas pesadas causam ×3 em inimigos com Postura Quebrada |
| ═ | *Marcha* / *Fortaleza* | Par | +8% velocidade com armas pesadas / +15% HP, −5% velocidade |
| K | *Juramento do Ferro* | Chave | Esquiva vira bloqueio (como Grôm) para qualquer personagem; +30% Armadura |
| K | *Coração de Bigorna* | Chave | Sem Frascos; +40% HP; Fogueiras curam 100% |
| K | *Último Suspiro* | Chave | Ao Apagar, explosão que mata tudo na tela e revive com 10% HP (1×) |
| K | *Mestre Forjador* | Chave | Uniões exigem nível 7 em vez de 8 |

### 4.2 Caçada (Sélide) — "o vento não para"
| Pos | Nome | Tipo | Efeito |
|---|---|---|---|
| s | *Pernas de corça* | Stat ×5 | +3% velocidade de movimento |
| s | *Fôlego longo* | Stat ×5 | +5% stamina máxima |
| s | *Segunda respiração* | Stat ×5 | +6% regeneração de stamina |
| s | *Olho de falcão* | Stat ×5 | +5% velocidade de projétil |
| s | *Sorte de caçador* | Stat ×3 | +5% Sorte |
| s | *Passo silencioso* | Stat ×3 | −5% custo da esquiva |
| s | *Flechas a mais* | Stat ×2 | +1 Quantidade para armas de Sélide (nível 2) |
| s | *Instinto* | Stat ×3 | Telegrafo de ataque 0,05 s mais longo |
| u | *Lâminas Gêmeas* | Desbloqueio | Arma |
| u | *Boleadeira* | Desbloqueio | Arma |
| u | *Sopro do Vento* | Desbloqueio | Arma |
| u | *Relíquia: Pena do Corvo* | Desbloqueio | Relíquia |
| m | *Rastro* | Modificador | Esquiva perfeita deixa rastro que causa lentidão |
| m | *Fuga* | Modificador | Correr não custa stamina nos primeiros 2 s |
| m | *Caçar o caçador* | Modificador | +20% dano em inimigos que fogem ou mantêm distância |
| ═ | *Rolamento longo* / *Rolamento curto* | Par | +30% distância de esquiva / −30% distância, +2 i-frames |
| K | *Sem Raízes* | Chave | Maldição de Nhara para qualquer personagem; +1 faca em esquiva perfeita |
| K | *Vento Constante* | Chave | Stamina infinita; esquiva não tem i-frames (só distância) |
| K | *Olhos da Deusa* | Chave | Todos os ataques vermelhos viram brancos (aparáveis) mas o aparo custa 40 stamina |
| K | *Matilha* | Chave | Um lobo acompanha qualquer personagem |

### 4.3 Memória (Vharos) — "o que foi lido não se perde"
| Pos | Nome | Tipo | Efeito |
|---|---|---|---|
| s | *Página rápida* | Stat ×5 | −3% Recarga |
| s | *Margem larga* | Stat ×5 | +4% Área |
| s | *Tinta que não seca* | Stat ×5 | +5% Duração |
| s | *Leitura veloz* | Stat ×5 | +4% XP recebido |
| s | *Rodapé* | Stat ×3 | +1 Reroll por Vigília |
| s | *Capítulo pulado* | Stat ×2 | +1 Pular por Vigília |
| s | *Censura* | Stat ×2 | +1 Banir por Vigília |
| s | *Ímã de cinzas* | Stat ×3 | +10% raio de Ímã |
| u | *Tinta Viva* | Desbloqueio | Arma |
| u | *Relâmpago de Estudo* | Desbloqueio | Arma |
| u | *Grimório Flutuante* | Desbloqueio | Arma |
| u | *Relíquia: Relógio de Areia Trincado* | Desbloqueio | Relíquia |
| m | *Quarta opção* | Modificador | Level up oferece 4 cartas |
| m | *Índice* | Modificador | A carta que completa uma União pendente aparece com 50% (em vez de 35%) após o min 12 |
| m | *Bestiário vivo* | Modificador | Registrar inimigo (10 mortes) dá 20 Almas na hora |
| ═ | *Estudo* / *Prática* | Par | Começa a Vigília no nível 3 / primeiros 5 níveis vêm 2× mais rápido |
| K | *Memória Eidética* | Chave | Passiva de Ulvar para todos; −10% HP |
| K | *Biblioteca Portátil* | Chave | 7 vagas de passiva; 5 de arma |
| K | *Eclipse* | Chave | Maldição de Véspera para todos (eclipse a cada 90 s) |
| K | *Arquivista* | Chave | Codex 100% de uma facção = +10% dano permanente contra ela (em vez de +2% por inimigo) |

### 4.4 Votos (Ama-Nhu) — "o que se promete à morte"
| Pos | Nome | Tipo | Efeito |
|---|---|---|---|
| s | *Frasco cheio* | Stat ×3 | +1 Frasco (máx. 6) — base 1.200 |
| s | *Gole longo* | Stat ×5 | +4% cura dos Frascos |
| s | *Mão firme* | Stat ×3 | Janela de aparo +0,01 s |
| s | *Eco do aparo* | Stat ×3 | Contra-ataque dura +0,2 s |
| s | *Dízimo* | Stat ×5 | +6% Almas coletadas |
| s | *Cinzas fiéis* | Stat ×3 | Cinzas Perdidas guardam +10% (30% → 60%) |
| s | *Oferenda barata* | Stat ×3 | −10% custo de Oferenda na Fogueira |
| s | *Sal grosso* | Stat ×3 | +5% efeito de Sal/lentidão |
| u | *Vela Funerária* | Desbloqueio | Arma |
| u | *Sino de Vigília* | Desbloqueio | Arma |
| u | *Totem de Ossos* | Desbloqueio | Arma |
| u | *Rook aparece* | Desbloqueio | O Vendedor surge na Fogueira da Hora II |
| m | *Sangue devolvido* | Modificador | Aparo cura 3% HP |
| m | *Descanso sem culpa* | Modificador | Descansar na Fogueira não aumenta a intensidade |
| m | *Mancha funda* | Modificador | O Eco que guarda suas Cinzas Perdidas tem −30% HP |
| ═ | *Cura lenta* / *Cura rápida* | Par | Frasco cura 60% em 4 s / 30% instantâneo |
| K | *Sangue pelo Sangue* | Chave | Maldição de Caël para todos; +1 Frasco |
| K | *Voto de Silêncio* | Chave | Sem aparo; esquiva perfeita aplica Postura Quebrada em área |
| K | *Culpa* | Chave | Mecânica de Dom Severo para todos |
| K | *Último Voto* | Chave | Ao Apagar, 100% das Almas ficam como Cinzas Perdidas (nada é levado), mas o Eco dropa ×2 |

### 4.5 Fome (oculta, Ciclo II) — "o que sobra"
16 nós: +1 Maldição máxima por nó (até 10 → 20 no Ciclo III), *Pactos permanentes* (ativar um Pacto de graça), armas da Fome no sorteio (Boca no Chão, Eco de Vigilante), +% Brasas por Amanhecer, e o nó-chave **"Devorar"**: reseta uma árvore inteira em troca de +3% permanente em todas as estatísticas (prestígio; repetível 5×).

## 5. Outros sistemas meta

### 5.1 Desbloqueio de personagens
Por feitos cumulativos mostrados com barra de progresso (documento 03). Não custam Almas. **Exceção:** o jogador pode "pagar com Brasas" para pular o feito (5 Brasas), para quem travou em um desafio específico.

### 5.2 Relíquias (equipamento do Santuário)
1 vaga; 2ª vaga por nó de Memória; 3ª vaga no Ciclo III. 20 Relíquias no lançamento (documento 04).

### 5.3 Forja de Brann (upgrade permanente de arma — "titanita")
Cada arma pode receber até **+3 níveis permanentes de Têmpera**, pagos em Almas e **Escória** (material que cai de elites: 1 a 3 por Vigília). Têmpera +1 = arma começa com +10% dano; +2 = marco de nível 4 vem no nível 3; +3 = a arma tem 30% a mais de chance de aparecer. 38 armas × 3 = 114 upgrades, sink de longo prazo. Escória segue a lógica de titanita: comum (Charneca/Abadia), Grande (Forja/Biblioteca), Fragmento (Bosque/Cisterna); cada Têmpera exige o tier correspondente, forçando visitar todos os mapas.

### 5.4 Ciclos (NG+)
Vencer a Cisterna abre o Ciclo II para todos os mapas: inimigos +40% HP/+25% dano, chefes com fase extra ("Lembrados"), árvore da Fome. Ciclo III: +8% por Ciclo adicional (curva de DS3), finais A/B/C. Ciclos IV+: só números e ranking.

### 5.5 Codex (Maestre Oto)
Bestiário (40 entradas), Armas (38), Uniões (34), Relíquias (20), Memórias (≈ 150 textos), Chefes (13). Porcentagem de completude visível. 100% de uma categoria = título cosmético e uma skin.

## 6. Economia das três moedas (resumo; detalhes no documento 09)

| Moeda | Faucet por Vigília típica | Sinks | Estoque alvo |
|---|---|---|---|
| Almas | 400 a 1.600 | Árvore, Têmpera, Oferenda/Forja em Fogueira | gasto em 1 a 2 Vigílias |
| Brasas | 0 a 1 (garantida em primeira vitória por mapa/Ciclo/Maldição; 35% depois) | Nós-chave (3), trocar par exclusivo (1), pular feito (5), Ciclo (10) | 0 a 3 guardadas |
| Memórias | 1 a 4 | Codex (automático), skins (Nhemi: 10 a 20), diálogos | consumidas ao ler |
| Escória | 1 a 3 | Têmpera | 0 a 5 |

Regra de piedade: 3 Vigílias seguidas sem Brasa → a próxima vitória contra Chefe Menor dropa uma. (Padrão "garantia por tempo".)

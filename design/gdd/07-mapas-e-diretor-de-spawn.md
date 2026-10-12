# 07 · Mapas, Eventos e Diretor de Spawn

> Define as seis regiões jogáveis do Ciclo I, suas mecânicas de terreno, segredos, e o **Diretor de Spawn**: o sistema que decide o que aparece, quando, e quanto, minuto a minuto. Baseado no modelo de waves por minuto de Vampire Survivors (lista de inimigos + mínimo na tela + intervalo), com cotas reduzidas para o orçamento do iPhone.

---

## 1. Anatomia de um mapa

| Propriedade | Valor padrão |
|---|---|
| Tamanho | 3×3 telas (≈ 1.200 × 2.400 px internos em retrato), com wrap visual contínuo (o jogador nunca encontra borda) |
| Tiles | 16×16 px, um tileset por mapa, 3 camadas (chão, decoração, obstáculos) |
| Obstáculos | 4 a 8 por tela (árvores, pilares, túmulos). Inimigos contornam; projéteis do jogador passam ou não dependendo da arma (projéteis de Vharos atravessam) |
| Pontos fixos | 1 Fogueira (surge após Guardião/Chefe perto do jogador), 2 a 4 "objetos regionais" (lanternas, sinos etc.), 1 local de Cinzas Perdidas (se houver) |
| Bônus de mapa | Cada mapa dá um bônus passivo ao Vigilante (regra de VS) |
| Desbloqueio | Pela primeira vitória (Amanhecer) no mapa anterior, ou por conquista alternativa (ver tabela) |
| Iluminação | Ciclo de luz: 100% → 55% ao longo dos 20 min; a Hora IV usa vinheta escura |

## 2. As seis regiões

| # | Região | Deus | Bônus de mapa | Mecânica regional | Objeto regional | Desbloqueio |
|---|---|---|---|---|---|---|
| 1 | **Charneca das Lanternas** | — | +10% velocidade de movimento | Névoa: raio de visão 85%; lanternas iluminam | 7 lanternas (apagar antes do min 10 = Noiva) | início |
| 2 | **Abadia Ruída** | Ama-Nhu | +1 Frasco | Círculos de sal permanentes (lentidão) em 6 pontos; vitrais que caem (dano em área telegrafado) ao matar 200 inimigos | 3 confessionários: entrar = trocar 50 Almas por Frasco | Amanhecer na Charneca ou nível 25 em qualquer Vigília |
| 3 | **Forja Afundada** | Orun | +10% Poder | Poças de ferro fundido: +25% dano enquanto dentro, −5 stamina/s | 4 bigornas: ficar 3 s ao lado = +1 nível na arma de menor nível | Amanhecer na Abadia |
| 4 | **Biblioteca Invertida** | Vharos | +1 Reroll | "Capítulos": a cada 90 s, zona de 1 tela com regra alterada por 60 s (gravidade de projéteis invertida, inimigos 2× rápidos e 0,5× HP, armas disparam 2×) | 5 livros: ler (2 s) = Memória | Amanhecer na Forja ou registrar 25 inimigos |
| 5 | **Bosque de Sélide** | Sélide | +15% velocidade de projétil | Armadilhas de corda no chão (prendem o jogador ou inimigos); único mapa com inimigos que fogem | Corça Branca (aleatória) | Amanhecer na Biblioteca ou 300 esquivas perfeitas |
| 6 | **A Cisterna** | A Fome | nenhum (Maldição +1 forçada) | Inimigos de todas as regiões, misturados e "errados"; sem névoa, sem horizonte; o chão reflete o jogador com 1 s de atraso (o reflexo não faz nada: é só desconforto) | nenhum | Amanhecer em 4 regiões |

### 2.1 Mapas pós-lançamento (um por temporada)
Observatório Caído (Vharos), Mar de Cera (Ama-Nhu), Carnaval dos Ocos (evento), Cidadela de Orun (Orun), Clareira Sem Lua (Sélide).

### 2.2 Modos de mapa (desbloqueáveis por mapa, estilo Hyper/Inverse de VS)
| Modo | Desbloqueio | Efeito |
|---|---|---|
| **Noite Rápida** | Amanhecer no mapa | Inimigos 1,3× mais rápidos, 1,5× mais Almas, Vigília de 15 min (Horas de 3:45) |
| **Noite Invertida** | Amanhecer em Noite Rápida | Mapa espelhado, inimigos começam com stats do minuto 10, 2× Almas |
| **Noite Infinita** | Amanhecer no mapa | Continuar após o Amanhecer para ranking |

## 3. Diretor de Spawn

### 3.1 Modelo
Tabela por **minuto** (20 linhas por mapa) com:
- `roster[]`: inimigos que podem aparecer (com peso).
- `min_na_tela`: cota mínima de inimigos vivos. Se abaixo, spawna até preencher.
- `intervalo`: segundos entre spawns de reposição.
- `evento`: enxame/cerco/elite/chefe scriptado neste minuto, se houver.
- `elite_chance`: chance por minuto de um elite aleatório surgir.

Fórmulas:
- `intervalo_efetivo = intervalo / (1 + 0,10 × Maldição)`
- `min_efetivo = min(min_na_tela × (1 + 0,10 × Maldição) × Intensidade_Fogueira, TETO)`
- `TETO` = 300 (iPhone 11/12) ou 500 (iPhone 14+), detectado em runtime.
- **Conversão de excedente:** quando `min_efetivo > TETO`, para cada 10 inimigos "massa" que não cabem, o diretor spawna 1 "Oco Grande" (ou equivalente médio da facção) com HP agregado. A pressão continua subindo sem estourar o orçamento.
- `Intensidade_Fogueira` = 1,0 ou 1,1 (se o jogador descansou na última Fogueira).

### 3.2 Tabela base — Charneca das Lanternas (Ciclo I, Maldição 0)

| Min | Roster (peso) | Mín. na tela | Intervalo (s) | Evento |
|---|---|---|---|---|
| 0 | Oco das Lanternas (10) | 15 | 2,0 | — |
| 1 | Oco Lanternas (10), Oco Grande (1) | 25 | 1,6 | Tutorial esquiva (1 Oco Grande garantido) |
| 2 | + Oco Rastejante (4) | 35 | 1,4 | — |
| 3 | + Noviça de Sal (2) | 45 | 1,2 | Tutorial aparo (1 Noviça garantida) |
| 4 | idem | 55 | 1,0 | Portador de Vela (1) |
| **5** | idem | 40 (arena) | — | **Guardião I: Oco Coroado** → Fogueira |
| 6 | Oco Lanternas (8), Rastejante (5), Noviça (3), Carpideira (3) | 70 | 0,9 | — |
| 7 | idem | 80 | 0,8 | **Revoada de Páginas** (80, cruzando) |
| 8 | + Irmã do Círculo (2), Oco Grande (3) | 90 | 0,8 | elite_chance 15% |
| 9 | idem | 100 | 0,7 | Procissão (60 Carpideiras) |
| **10** | idem | 60 (arena) | — | **Chefe Menor: Oco Coroado Maior** (ou Noiva) → Fogueira + baú dourado |
| 11 | Lanternas (6), Rastejante (6), Grande (4), Noviça (3), Círculo (3), Sino Ambulante (1) | 120 | 0,6 | — |
| 12 | idem | 140 | 0,6 | **Cerco** (anel de 120 Ocos; Vela no centro) |
| 13 | + Aprendiz Cego (2) | 160 | 0,5 | elite_chance 25% |
| 14 | idem | 180 | 0,5 | Oco Suplicante (1, Memória) |
| **15** | idem | 80 (arena) | — | **Guardião II: 2 Aprendizes Cegos + Costureira** → Fogueira |
| 16 | + Boca Rastejante (3), Quimera (1) | 200 | 0,45 | Tela escurece 10% |
| 17 | idem | 230 | 0,4 | **Revoada** + elite_chance 30% |
| 18 | + A Mão (1) | 260 | 0,4 | Cerco duplo |
| 19 | idem | 300 (teto) | 0,35 | Não-Vigilante (elite) 40% |
| **20** | — | arena | — | **Chefe da Região: O Lanterneiro** |
| 20–23 | Crias da Fome (todas) | 300 | 0,3 | Se chefe vivo em 23:00: **A Fome** |

Observações: a curva de `min_na_tela` de 15 → 300 em 20 min é mais íngreme que VS no início (sensação de poder cedo) e bate no teto no minuto 19, quando o jogador já tem a build pronta. Cada mapa seguinte começa a curva 10% mais alta e troca o roster pela facção local.

### 3.3 Eventos: regras gerais
- Enxames (Revoada, Procissão, Matilha) **não contam** no `min_na_tela` e vivem no máximo 25 s.
- Cercos geram 120 inimigos de uma vez; o diretor suspende reposição durante 20 s para caber no teto.
- Elites aleatórios: no máximo 2 vivos simultaneamente; sempre dropam baú.
- Nenhum evento ocorre nos 30 s anteriores a um chefe (respiro).

### 3.4 Posicionamento de spawn
Inimigos surgem fora da tela em um anel de 1,2 a 1,6 telas de raio, com viés de 60% para o lado **oposto** ao movimento do jogador (ele anda em direção à horda nova: mais tensão, menos "kiting" infinito). Enxames surgem de uma borda e atravessam.

## 4. Fogueiras e arenas
- Após o Guardião/Chefe, uma Fogueira surge a 3 corpos do jogador. Enquanto ele está em seu raio (2 corpos), o relógio para e os inimigos restantes no mapa param e viram cinza (ninguém ataca). Sair do raio retoma.
- Arenas de chefe: círculo de névoa, raio 7 corpos, centrado onde o jogador estava. Obstáculos dentro da arena somem (chefe precisa de espaço legível).

## 5. Segredos por mapa (para a comunidade descobrir)

| Mapa | Segredo | Recompensa |
|---|---|---|
| Charneca | Apagar as 7 lanternas antes do min 10 | Noiva da Turfa; Memória |
| Charneca | Ficar 30 s parado ao lado do Oco Suplicante em vez de 5 | Relíquia *Lanterna de Bolso* |
| Abadia | Entrar nos 3 confessionários na ordem certa (indicada pelos vitrais) | Arma rara *Sangue do Pacto* na Vigília |
| Forja | Tocar as 4 bigornas em menos de 60 s | Arma rara *Bigorna Arremessada* |
| Biblioteca | Ler os 5 livros na ordem dos títulos | Relíquia *Monóculo Rachado* |
| Bosque | Alcançar a Corça Branca | Memória + skin do lobo de Ysolde |
| Cisterna | Morrer de propósito para A Fome com Maldição 10 | Personagem Criança da Cisterna (Ciclo V) |
| Qualquer | Digitar uma frase no Codex do Maestre Oto (frases escondidas nas Memórias) | Skins e personagens secretos (padrão "spells" de VS) |

## 6. Orçamento de produção por mapa

| Item | Quantidade |
|---|---|
| Tileset | 1 (≈ 120 tiles) |
| Objetos/obstáculos | 12 sprites |
| Inimigos exclusivos | 5 (+ variações de cor para massa) |
| Chefes | 2 (Menor + Região) |
| Música | 1 tema de exploração (3 camadas por Hora) + 1 tema de chefe (2 camadas) |
| Eventos scriptados exclusivos | 2 |
| Memórias (textos) | 12 a 15 |
| Tempo estimado (equipe de 4) | 6 a 8 semanas por mapa |

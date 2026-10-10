# 10 · Dificuldade, Balanceamento e Telemetria

> As fórmulas que ligam todos os documentos anteriores, os alvos numéricos de cada sistema e a lista de métricas que a equipe acompanha desde o primeiro protótipo. Referência metodológica: Mega Crit (Slay the Spire) montou servidor de métricas desde o início e publica ajustes semanais; Supergiant ajustou dificuldade com o Modo Deus em vez de nerfar inimigos.

---

## 1. Filosofia

1. **Soulslike = justo, não cruel.** Toda morte precisa ser explicável em uma frase pelo jogador ("não esquivei do vermelho", "fiquei sem stamina"). Mortes por acúmulo invisível de dano de contato são falha de design.
2. **Survivor-like = poder crescente.** O jogador precisa sentir que fica mais forte a cada minuto. A dificuldade sobe mais rápido que o poder só na Hora IV.
3. **Meta não substitui skill.** Testes de controle: jogador novo com árvore 100% não vence a Cisterna; jogador veterano com 20% vence a Charneca.
4. **Mobile = sessões curtas e perdão.** Autosave em Fogueira, pausa sempre disponível, reembolso de árvore.

## 2. Fórmulas centrais (consolidadas)

### 2.1 Inimigos
```
HP_inimigo(min)   = HP_base × (1 + 0,12·min) × M × C × I
Dano_inimigo(min) = Dano_base × (1 + 0,05·min) × M × C
HP_chefe          = HP_base_chefe × (1 + 0,04·nível_jogador) × M × C
Intervalo_spawn   = intervalo_base(min) / (1 + 0,10·Maldição)
Mínimo_na_tela    = min(min_base(min) × (1 + 0,10·Maldição) × I, TETO)
```
Onde: `M` = multiplicador de Maldição = `(1 + 0,10·Maldição)` para HP e `(1 + 0,08·Maldição)` para dano; `C` = Ciclo (I: 1,0; II: 1,4 HP / 1,25 dano; III+: +8% por Ciclo); `I` = Intensidade de Fogueira (1,0 ou 1,1); `TETO` = 300 ou 500 por aparelho.

### 2.2 Jogador
```
Dano_arma = Base_arma(nível) × (1 + Poder) × Escala(atributo, grau) × Mult_status × Mult_stamina
Escala(attr, grau): E 0,25 · D 0,50 · C 0,75 · B 1,00 · A 1,25 · S 1,50  (× attr/10)
Redução_armadura = Armadura / (Armadura + 20)        (cap 75%)
XP(n) = 10 + 8·(n−1) + 0,6·(n−1)²
Stamina_regen = 30/s após 0,5 s de pausa
```

### 2.3 Economia
```
Almas_Vigília = Σ Almas_inimigos × (1 + Ganância) × (1 + 0,12·Maldição) × (1,5 se Amanhecer)
custo_nó = base × 1,12^(rank−1) × (1 + 0,015·ranks_globais)
```

## 3. Alvos numéricos

### 3.1 Dentro da Vigília (Ciclo I, Maldição 0, jogador mediano após 10 h)
| Métrica | Alvo |
|---|---|
| Nível ao fim da Hora I / II / III / IV | 9 / 16 / 23 / 29 |
| Armas / passivas ao fim da Hora II | 5 / 4 |
| Primeira União | minuto 12 a 15 |
| Dano por segundo do jogador (min 5 / 10 / 15 / 20) | 60 / 250 / 800 / 2.000 |
| HP total da horda na tela (min 5 / 10 / 15 / 20) | 1.200 / 7.000 / 30.000 / 90.000 |
| Esquivas por minuto (Hora II+) | 4 a 8 |
| Aparos bem-sucedidos por Vigília | 10 a 25 |
| Frascos usados por Hora | 1 a 2 |
| Duração do Chefe Menor / Região | 60 a 90 s / 2 a 3 min |
| Causa de morte (distribuição alvo) | 45% ataque vermelho de chefe/elite · 30% cerco/contato · 15% sem stamina em horda · 10% outro |

### 3.2 Taxa de vitória (Amanhecer) por horas jogadas, Charneca, Maldição 0
| Horas | Alvo |
|---|---|
| 0 a 2 h | 5% |
| 2 a 5 h | 20% |
| 5 a 10 h | 40% |
| 10 a 20 h | 60% |
| 20 h+ (árvore ≥ 50%) | 75% |

Por mapa, o alvo cai ~12 pontos por região (Cisterna: 20% com 20 h+). Por personagem: ver tabela do documento 03 (Aldric 35% médio, Oco Nº 9 10%).

### 3.3 Meta
| Métrica | Alvo |
|---|---|
| Vigílias entre compras de nó pequeno | 1 a 2 |
| Vigílias entre compras de nó grande | 4 a 6 |
| Horas para 50% da árvore visível | 20 a 25 h |
| Horas para 100% da árvore + Têmpera | 60 a 80 h |
| Horas para desbloquear os 12 personagens | 30 a 40 h |
| Horas para o Final do Ciclo I | 25 a 35 h |
| Brasas por 10 Vigílias (jogador mediano) | 3 a 5 |

## 4. Escada de dificuldade (resumo de todas as alavancas)

| Alavanca | Quem controla | Faixa |
|---|---|---|
| Minuto | Diretor | automático |
| Região | Jogador (desbloqueio) | +10% por região na curva de spawn |
| Maldição (Pactos) | Jogador | 0 a 10 (20 no Ciclo III); +10% HP / +8% dano / +12% Almas por ponto |
| Ciclo | Jogador (após Cisterna) | I, II (+40%/+25%), III+ (+8%/Ciclo) |
| Modo de mapa | Jogador | Noite Rápida / Invertida / Infinita |
| Intensidade de Fogueira | Jogador (descansar ou não) | ×1,0 / ×1,1 |
| Personagem | Jogador | dificuldade 1 a 5 |
| **Modo Brasa Gentil** (acessibilidade) | Jogador | −15% dano recebido; janela de aparo +0,06 s; nunca desligado por punição, não afeta ranking |

Regra Hades: recompensas de Maldição só na primeira vitória em cada nível por personagem e mapa.

## 5. Processo de balanceamento

### 5.1 Fases
1. **Protótipo (planilha viva):** todas as fórmulas em planilha com simulação de 20 min (DPS do jogador vs HP agregado da horda). Antes de qualquer arte.
2. **Alpha fechado (200 testadores):** telemetria por evento; sessões gravadas; 2 ajustes por semana.
3. **Beta (5.000):** curvas de vitória por horas; heatmap de mortes por minuto e posição; pick/win rate por arma e nó.
4. **Live:** ajuste semanal; patch notes públicos em português e inglês; "O que mudou e por quê".

### 5.2 Regras de ajuste
- Nenhuma arma com pick rate < 3% ou win rate condicional > 1,5× a mediana fica mais de 2 semanas sem ajuste.
- Nenhum personagem com win rate > 2× a mediana ou < 0,5× a mediana.
- Buff antes de nerf quando possível (Supergiant). Nerfs de inimigo são preferíveis a nerfs de arma amada.
- Mudanças em telegrafo ou janelas (aparo, i-frames) exigem teste com 50 jogadores antes de ir ao ar: são a parte "Souls" e a mais sensível.

## 6. Telemetria (eventos obrigatórios desde o protótipo)

| Evento | Campos | Para quê |
|---|---|---|
| `vigilia_inicio` | personagem, mapa, ciclo, maldição, relíquias, árvore% | segmentação |
| `level_up` | minuto, nível, cartas oferecidas, carta escolhida, reroll usado | pick rate |
| `arma_uniao` | minuto, arma, passiva | tempo de build |
| `esquiva` | minuto, perfeita?, peso | uso da mecânica |
| `aparo` | minuto, sucesso?, alvo | uso e dificuldade |
| `frasco` | minuto, HP antes | economia de cura |
| `fogueira` | hora, descansou?, forjou?, oferenda? | decisões |
| `dano_recebido` | fonte (inimigo/ataque), minuto, HP restante | causa de morte |
| `chefe` | nome, fase alcançada, duração, quebras de postura, resultado | dificuldade de chefe |
| `apagar` / `amanhecer` | minuto, nível, almas, causa, posição | win rate, heatmap |
| `cinzas_perdidas` | recuperou?, vigílias até recuperar | mecânica de bloodstain |
| `pesquisa_compra` | nó, rank, custo, almas restantes, vigílias desde última compra | cadência |
| `anuncio` | tipo, aceitou?, momento | monetização |
| `compra` | item, preço, moeda, primeiro? | conversão |
| `sessao` | duração, vigílias, saiu em fogueira?, plataforma, aparelho, fps médio, memória pico | performance |
| `erro_recuperacao` | aba morreu?, retomou da fogueira? | risco iOS (documento 12) |

## 7. Painéis (dashboards) semanais

1. **Funil da Vigília:** % que chega à Hora II, III, IV, Amanhecer, por mapa e personagem.
2. **Heatmap de morte:** minuto × causa; posição no mapa.
3. **Pick/win por carta:** armas, passivas, Uniões; destaque para < 3% e > 1,5×.
4. **Cadência de meta:** Vigílias entre compras; estoque mediano de Almas (inflação = estoque crescendo 3 Vigílias sem compra).
5. **Mecânicas Souls:** esquivas/min, aparos/Vigília, % de esquivas perfeitas, uso de Frasco. Se aparos/Vigília < 5 na mediana, o aparo não está sendo ensinado: corrigir tutorial, não a janela.
6. **Saúde técnica:** fps médio por aparelho, picos de memória, % de sessões com retomada de Fogueira (meta: < 2%).
7. **Negócio:** D1/D7/D30, conversão, opt-in de anúncios, participação no diário.

## 8. Testes de controle (antes do lançamento)

| Teste | Critério de aprovação |
|---|---|
| Jogador novo, 1ª Vigília, Aldric | chega à Hora II em ≥ 80% dos casos; entende esquiva e aparo (usa ambos ≥ 3×) |
| Jogador novo, 10 Vigílias | 1 Amanhecer na Charneca em ≥ 50% dos testadores |
| Veterano de VS/Brotato, 1ª Vigília | relata "é diferente" (aparo/esquiva) em entrevista |
| Veterano de Souls, 1ª Vigília | não relata "esquiva imprevisível"; i-frames percebidos como consistentes |
| Árvore 100%, jogador novo | não vence a Cisterna |
| Árvore 20%, veterano | vence a Charneca |
| iPhone 11, Hora IV, 300 inimigos | ≥ 55 fps médio, memória < 150 MB, sem jetsam em 10 sessões |
| Sessão interrompida (fechar app na Hora III) | retoma da Fogueira da Hora II com build correta |

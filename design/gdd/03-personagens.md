# 03 · Personagens — Os Vigilantes

> Elenco jogável. Cada Vigilante é definido por: perfil de atributos, arma inicial, passiva única, **mecânica de maldição** (o jeito dele de lidar com a imortalidade), condição de desbloqueio e uma missão pessoal em três etapas (a *Memória Final*).

---

## 1. Princípios de design do elenco

1. **Cada personagem muda o modo de jogar, não só os números.** Regra inspirada em Brotato e Hades: se dois personagens jogam parecido, um deles está errado.
2. **Quatro atributos, quatro deuses.** Força (FOR), Destreza (DES), Inteligência (INT), Fé (FÉ). Cada arma escala com um ou dois atributos (documento 04). Personagens têm um perfil fixo de atributos iniciais e ganham pontos por nível para distribuir, como em Souls.
3. **Toda maldição é uma troca.** A mecânica única de cada Vigilante sempre tem um custo visível.
4. **Desbloqueio por feito, não por sorte.** Nenhum personagem vem de gacha. Todos saem de conquistas claras, mostradas no Santuário com progresso.
5. **12 no lançamento, 6 no primeiro ano.** Número alinhado com Vampire Survivors base (cerca de 20) e com a capacidade de produção de uma equipe pequena.

## 2. Atributos e estatísticas (referência rápida)

### 2.1 Atributos primários (distribuídos ao subir de nível na Vigília)
| Atributo | Deus | Efeito direto |
|---|---|---|
| **Força** | Orun | +dano de armas pesadas, +poise (resistência a empurrão), +HP máximo leve |
| **Destreza** | Sélide | +dano de armas leves, +velocidade de ataque, +i-frames da esquiva (até um teto) |
| **Inteligência** | Vharos | +dano de feitiços, +área, +duração |
| **Fé** | Ama-Nhu | +dano de milagres, +cura dos Frascos, +efeito de maldições e invocações |
| **Vigor** | — | +HP máximo, +stamina máxima |

### 2.2 Estatísticas secundárias (as que a árvore de pesquisa e os itens mexem)
HP · Stamina · Regeneração de Stamina · Velocidade de Movimento · Poder (multiplicador geral de dano) · Armadura (redução plana) · Recuperação (HP/s) · Recarga (cooldown) · Área · Velocidade de Projétil · Duração · Quantidade (projéteis extras) · Ímã (raio de coleta) · Sorte · Frascos (cargas de cura) · Ganância (almas extras) · Maldição (dificuldade voluntária) · Reviver (vidas extras).

### 2.3 Mecânicas soulslike compartilhadas por todos
- **Esquiva (rolamento):** custa stamina, 0,35 s de duração, janela de invulnerabilidade de 0,20 s por padrão. Controle: deslizar rápido (swipe) em qualquer direção ou botão dedicado.
- **Aparo (parry):** toque no botão de aparo; janela de 0,18 s. Aparo bem-sucedido contra ataque **telegrafado** (brilho branco) gera **Postura Quebrada** na área e um contra-ataque automático com todas as armas equipadas por 1,5 s com dano ×2.
- **Frascos de Brasa (estus):** 3 cargas padrão. Cura 40% HP ao longo de 2 s (interrompível por dano forte). Recarregam na **Fogueira** (ver documento 02).
- **Cinzas Perdidas:** ao Apagar, 30% das Almas coletadas na Vigília ficam no local da morte, no mapa. Na próxima Vigília no mesmo mapa, há uma mancha de sangue no mesmo ponto; chegar até ela devolve as Almas (uma vez). Morrer antes de pegar perde para sempre.

## 3. Elenco de lançamento (12)

Formato: **Nome, Epíteto** · Deus · Perfil FOR/DES/INT/FÉ/VIG (de 1 a 10) · Arma inicial · Passiva · Maldição · Desbloqueio · Memória Final.

---

### 3.1 Aldric, o Portador da Brasa
*O cavaleiro quebrado. Rosto de marketing. O "fácil".*
- **Deus:** Orun · **Perfil:** FOR 6 / DES 3 / INT 1 / FÉ 3 / VIG 7
- **Arma inicial:** *Espada Longa do Juramento* (arco horizontal na direção do movimento; escala FOR/DES).
- **Passiva — Brasa Firme:** +15% HP máximo; recebe 20% menos dano enquanto a stamina estiver acima de 50%.
- **Maldição — Juramento Pesado:** não pode ter mais de 5 armas (padrão é 6). Em troca, a 6ª vaga vira uma **Relíquia** passiva extra.
- **Desbloqueio:** disponível desde o início.
- **Memória Final:** (1) Sobreviver 20 min na Charneca; (2) matar O Lanterneiro sem usar Frasco; (3) alcançar o Amanhecer na Abadia. Recompensa: skin *Armadura do Primeiro Voto* e a Relíquia *Elmo Sem Rosto*.
- **Voz / tom:** fala pouco, em frases curtas e formais. "Ainda não."

### 3.2 Nhara, a Ladra de Sal
*Rápida, frágil, punitiva. A "destreza pura".*
- **Deus:** Sélide · **Perfil:** FOR 2 / DES 8 / INT 2 / FÉ 2 / VIG 4
- **Arma inicial:** *Facas de Sal* (lançadas para o inimigo mais próximo, 2 por salva; escala DES).
- **Passiva — Passo Leve:** +20% velocidade de movimento; esquiva custa 30% menos stamina.
- **Maldição — Sem Raízes:** não pode ficar parada: após 1,5 s imóvel, começa a perder 2% HP/s. Em troca, cada esquiva perfeita (i-frame usado) solta uma faca extra.
- **Desbloqueio:** esquivar 200 ataques telegrafados (acumulado entre Vigílias).
- **Memória Final:** (1) terminar uma Vigília sem receber dano nos primeiros 5 min; (2) roubar o baú do Lanterneiro (abrir baú de chefe em menos de 3 s); (3) completar o Bosque de Sélide. Recompensa: skin *Véu da Caçadora*.

### 3.3 Mestre Ulvar, o Arquivista Cego
*Mago de área. Lento, letal, precisa de proteção.*
- **Deus:** Vharos · **Perfil:** FOR 1 / DES 2 / INT 9 / FÉ 3 / VIG 3
- **Arma inicial:** *Página Ardente* (projétil lento que explode em área; escala INT).
- **Passiva — Memória Eidética:** +1 opção extra em cada level up (4 em vez de 3).
- **Maldição — Cegueira:** o raio de visão em volta do personagem é 20% menor (névoa nas bordas). Em troca, inimigos que entram na névoa recebem 10% mais dano ("ele ouve melhor").
- **Desbloqueio:** registrar 40 inimigos distintos no Bestiário.
- **Memória Final:** (1) subir ao nível 30 em uma Vigília; (2) ter 3 Uniões simultâneas; (3) derrotar O Índice. Recompensa: skin *Vestes do Último Leitor*, Relíquia *Monóculo Rachado* (+1 reroll de level up).

### 3.4 Irmã Caël, a Sepultadora Renegada
*Suporte/cura em jogo single-player: vida como recurso.*
- **Deus:** Ama-Nhu · **Perfil:** FOR 3 / DES 2 / INT 3 / FÉ 8 / VIG 5
- **Arma inicial:** *Círculo de Sal* (aura ao redor que causa dano e lentidão; escala FÉ).
- **Passiva — Votos:** Frascos curam 60% em vez de 40%; +1 Frasco.
- **Maldição — Sangue pelo Sangue:** não ganha HP ao subir de nível. Em troca, cada 100 inimigos mortos devolve 1 carga de Frasco.
- **Desbloqueio:** usar 50 Frascos no total.
- **Memória Final:** (1) terminar uma Vigília com todos os Frascos cheios; (2) matar 1.000 inimigos em uma Vigília; (3) derrotar Madre Suturada. Recompensa: skin *Hábito Branco*.

### 3.5 Grôm, o Ferreiro Cego de Orun
*Tanque. Joga parado, aguenta tudo.*
- **Deus:** Orun · **Perfil:** FOR 9 / DES 1 / INT 1 / FÉ 2 / VIG 8
- **Arma inicial:** *Martelo de Fole* (golpe circular lento com knockback forte; escala FOR).
- **Passiva — Pele de Ferro:** +8 Armadura; imune a empurrão (poise infinito).
- **Maldição — Pés de Chumbo:** −25% velocidade de movimento; **não pode rolar** (a esquiva vira um *bloqueio* que reduz 80% do dano por 0,5 s e custa stamina). Em troca, bloquear um ataque telegrafado funciona como aparo.
- **Desbloqueio:** receber 50.000 de dano acumulado sem Apagar (soma entre Vigílias).
- **Memória Final:** (1) bloquear 100 ataques telegrafados; (2) terminar uma Vigília sem andar por 5 minutos seguidos; (3) derrotar O Martelo Sem Braço. Recompensa: skin *Forja Viva*.

### 3.6 Ysolde, a Caçadora de Lobos
*Posicionamento e ataque à distância. Armadilhas.*
- **Deus:** Sélide · **Perfil:** FOR 4 / DES 7 / INT 2 / FÉ 2 / VIG 4
- **Arma inicial:** *Arco Curto* (flecha no inimigo mais distante no raio; escala DES).
- **Passiva — Olho de Falcão:** projéteis atravessam 1 inimigo extra; +15% velocidade de projétil.
- **Maldição — Matilha:** sempre acompanhada de **um lobo** aliado (IA simples) que morde inimigos próximos. Se o lobo morrer, Ysolde perde 25% do dano até a próxima Fogueira.
- **Desbloqueio:** matar 500 inimigos com projéteis que atravessaram pelo menos um alvo.
- **Memória Final:** (1) sobreviver 15 min sem o lobo morrer; (2) matar um elite só com flechas; (3) derrotar A Matilha de Três Gargantas. Recompensa: lobo branco (skin do companheiro).

### 3.7 O Oco Número Nove
*Personagem-piada mecanicamente profundo. Começa fraco, escala absurdamente.*
- **Deus:** nenhum · **Perfil:** FOR 1 / DES 1 / INT 1 / FÉ 1 / VIG 1 (sim)
- **Arma inicial:** *Galho* (ataque curto e fraco; escala com **o atributo mais alto**).
- **Passiva — Nada a Perder:** ganha +1 ponto de atributo extra a cada nível (2 em vez de 1).
- **Maldição — Já Morto:** sem Frascos. Não pode usar Fogueiras para curar. Em troca, Cinzas Perdidas devolvem 100% (não 30%) e ele começa a Vigília com 3 níveis a mais a cada 5 Vigílias Apagadas.
- **Desbloqueio:** Apagar 25 vezes.
- **Memória Final:** (1) alcançar nível 50; (2) chegar ao Amanhecer; (3) derrotar A Fome Vestida de Vigilante. Recompensa: ele ganha um nome (o jogador escolhe) e uma Relíquia única, *Coroa de Papelão*.

### 3.8 Dom Severo, o Inquisidor
*Risco/recompensa: ataca a si mesmo para ficar mais forte.*
- **Deus:** Ama-Nhu · **Perfil:** FOR 5 / DES 4 / INT 2 / FÉ 7 / VIG 5
- **Arma inicial:** *Chicote de Penitência* (ataque em linha longa, perfura; escala FÉ/DES).
- **Passiva — Flagelo:** cada 10% de HP perdido = +5% Poder (até +45%).
- **Maldição — Culpa:** Frascos causam 10% de dano a si mesmo antes de curar (líquido 30%). Em troca, aparar com sucesso cura 10% do HP.
- **Desbloqueio:** terminar uma Vigília com menos de 20% de HP.
- **Memória Final:** (1) matar um chefe com menos de 10% de HP; (2) 20 aparos em uma Vigília; (3) completar a Abadia no Ciclo II. Recompensa: skin *Capuz Vermelho*.

### 3.9 Pia, a Lanterneira
*Controle de espaço com luz. Personagem de "zona segura".*
- **Deus:** Vharos · **Perfil:** FOR 2 / DES 4 / INT 6 / FÉ 5 / VIG 4
- **Arma inicial:** *Lanterna de Turfa* (cone de luz na direção do movimento; inimigos no cone recebem dano contínuo e se movem 30% mais devagar).
- **Passiva — Luz que Guia:** itens e Almas no cone são atraídos (ímã direcional ×3).
- **Maldição — Óleo Escasso:** a Lanterna gasta "óleo" (barra própria) ao atingir inimigos; recarrega ao coletar Almas. Sem óleo, o cone vira apenas luz (lentidão, sem dano). Em troca, quando o óleo está acima de 80%, o cone cega ataques telegrafados (eles falham).
- **Desbloqueio:** coletar 10.000 Almas.
- **Memória Final:** (1) encontrar as sete lanternas da Charneca; (2) derrotar A Noiva da Turfa; (3) chegar ao Amanhecer com óleo cheio. Recompensa: skin *Lanterna Azul*.

### 3.10 Tharn, o Devorador de Brasas
*Berserker. Stamina como recurso ofensivo.*
- **Deus:** Orun/A Fome · **Perfil:** FOR 8 / DES 4 / INT 1 / FÉ 1 / VIG 6
- **Arma inicial:** *Machado Duplo* (dois cortes alternados; escala FOR).
- **Passiva — Fome:** matar 50 inimigos em 10 s ativa **Frenesi** (+40% velocidade de ataque, 8 s).
- **Maldição — Sem Fundo:** sua stamina não regenera sozinha: regenera **ao causar dano**. Parar de bater = ficar sem esquiva.
- **Desbloqueio:** matar 300 inimigos em um único minuto de Vigília.
- **Memória Final:** (1) manter Frenesi por 60 s seguidos; (2) matar um chefe durante Frenesi; (3) sobreviver à Cisterna até o minuto 15. Recompensa: skin *Mandíbula de Ferro*.

### 3.11 Véspera, a Última Astrônoma
*Invocadora. Joga via orbitais e constelações.*
- **Deus:** Vharos · **Perfil:** FOR 1 / DES 3 / INT 8 / FÉ 4 / VIG 3
- **Arma inicial:** *Astros Órfãos* (3 orbes que orbitam o personagem; escala INT).
- **Passiva — Mapa Celeste:** +1 Quantidade (projétil extra) em todas as armas orbitais.
- **Maldição — Eclipse:** a cada 90 s, perde todas as armas por 5 s ("eclipse") e fica invulnerável; ao voltar, as armas disparam uma salva dupla. Força o jogador a planejar fugas.
- **Desbloqueio:** ter 6 armas orbitais/aura simultâneas em uma Vigília.
- **Memória Final:** (1) sobreviver 10 eclipses em uma Vigília; (2) matar 200 inimigos em uma salva pós-eclipse; (3) encontrar o Observatório (evento secreto). Recompensa: skin *Manto de Estrelas Mortas*.

### 3.12 O Corvo de Ferro (jogável)
*Autômato. Personagem "mecânico" de construir engenhocas; desbloqueio tardio.*
- **Deus:** Orun · **Perfil:** FOR 5 / DES 5 / INT 5 / FÉ 0 / VIG 5
- **Arma inicial:** *Engrenagem Serrilhada* (bumerangue que volta; escala FOR/INT).
- **Passiva — Sem Alma:** não coleta Almas (!) — em vez disso, Almas viram **Parafusos**, moeda interna da Vigília para comprar armas na Fogueira a preço reduzido (ver 02).
- **Maldição — Corrosão:** não cura com Frascos; Frascos "reparam" 25% HP instantaneamente mas aumentam a Maldição em +5% a cada uso na Vigília.
- **Desbloqueio:** completar 15 desafios diários.
- **Memória Final:** (1) comprar 10 itens em Fogueiras em uma Vigília; (2) Amanhecer com Maldição ≥ 50%; (3) derrotar qualquer chefe no Ciclo III. Recompensa: skin *Corvo Dourado*.

---

## 4. Elenco pós-lançamento (6, ao longo do primeiro ano)

| Nome | Conceito mecânico | Deus | Desbloqueio |
|---|---|---|---|
| **A Noiva da Turfa** | Chefe secreto jogável. Puxa inimigos com véu; dano aumenta conforme a quantidade de inimigos presos. | Ama-Nhu | Derrotá-la 3 vezes. |
| **Brann, o Forjador** (jovem) | Pode **forjar Uniões mais cedo** (nível de arma 6 em vez de 8), mas só pode ter 4 armas. | Orun | Completar 10 Uniões distintas. |
| **Iselda, a Guardiã** (passado) | Começa com todos os Frascos e Fogueiras extras no mapa; não sobe de nível (todo XP vira Almas). Personagem de "fazenda". | — | Final C. |
| **Os Gêmeos Sem Nome** | Dois corpos controlados ao mesmo tempo (o segundo espelha o movimento). Alto risco. | Sélide | Evento sazonal. |
| **Maestre Oto** | Ganha uma arma aleatória do Bestiário a cada chefe registrado; personagem de colecionador. | Vharos | Bestiário 100%. |
| **A Criança da Cisterna** | Começa com Maldição 100% e ganha Pactos grátis; recompensa máxima de Almas. | A Fome | Ciclo V. |

## 5. Interações entre personagens (Santuário)

- Após cada Vigília, **o personagem usado tem uma fala curta para outro NPC ou Vigilante**, baseada no evento mais marcante (chefe morto, morte cedo, recorde). Banco inicial: 12 personagens × ~25 falas = 300 linhas. Todas com uma linha.
- **Afinidades:** usar dois personagens em Vigílias consecutivas desbloqueia diálogos cruzados (Aldric ↔ Iselda, Nhara ↔ Ysolde, Grôm ↔ Brann, Oto ↔ Ulvar). Recompensa: Memórias.

## 6. Tabela resumo (para balanceamento)

| # | Vigilante | Arquétipo | Dificuldade (1–5) | HP base | Stamina | Vel. | Frascos | Arma inicial |
|---|---|---|---|---|---|---|---|---|
| 1 | Aldric | Cavaleiro | 1 | 130 | 100 | 1.00 | 3 | Espada Longa |
| 2 | Nhara | Assassina | 3 | 85 | 120 | 1.20 | 3 | Facas de Sal |
| 3 | Ulvar | Mago AoE | 3 | 80 | 90 | 0.95 | 3 | Página Ardente |
| 4 | Caël | Sustain | 2 | 110 | 100 | 1.00 | 4 | Círculo de Sal |
| 5 | Grôm | Tanque | 2 | 160 | 110 | 0.75 | 3 | Martelo de Fole |
| 6 | Ysolde | Ranger + pet | 3 | 95 | 100 | 1.05 | 3 | Arco Curto |
| 7 | Oco Nº 9 | Escalador | 5 | 60 | 80 | 1.00 | 0 | Galho |
| 8 | Dom Severo | Risco/recompensa | 4 | 105 | 100 | 1.00 | 3 | Chicote |
| 9 | Pia | Controle | 2 | 95 | 100 | 1.00 | 3 | Lanterna |
| 10 | Tharn | Berserker | 4 | 120 | 100 (sem regen) | 1.05 | 3 | Machado Duplo |
| 11 | Véspera | Invocadora | 3 | 85 | 95 | 1.00 | 3 | Astros Órfãos |
| 12 | Corvo de Ferro | Economia | 4 | 100 | 100 | 1.00 | 3 (reparos) | Engrenagem |

Meta de taxa de vitória por personagem após 20 h de jogo (ver documento 10): Aldric 35%, Caël/Grôm/Pia 30%, Nhara/Ulvar/Ysolde/Véspera 25%, Severo/Tharn/Corvo 20%, Oco Nº 9 10%.

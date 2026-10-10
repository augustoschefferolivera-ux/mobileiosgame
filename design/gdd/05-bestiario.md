# 05 · Bestiário — Inimigos

> Catálogo de inimigos por facção e região. Cada entrada tem papel tático, comportamento, números base (Ciclo I, Maldição 0) e a linha de Codex que o jogador desbloqueia ao registrar (matar 10 / 100 / 500 unidades).

---

## 1. Princípios

1. **Quatro camadas de inimigo:** *Massa* (encosta, não telegrafa, morre fácil), *Médio* (um ataque telegrafado), *Elite* (nome próprio, barra de vida, 2 ataques, dropa baú), *Chefe* (documento 06).
2. **Silhueta antes de tudo.** Cada facção tem uma forma (Ocos: curvados; Sepultadoras: altas e finas; Ferreiros: largos; Páginas: planas; Caçadores: quadrúpedes/arqueados; Crias: assimétricas). Legível a 32 px.
3. **Cada inimigo tem um "porquê" de design.** Massa pressiona espaço, Médios ensinam a esquiva e o aparo, Elites testam a build.
4. **HP escala pelo tempo, não pelo nível do jogador** (exceto chefes): `HP = HP_base × (1 + 0,12 × minuto) × Maldição × Ciclo`. Dano: `Dano_base × (1 + 0,05 × minuto) × Maldição × Ciclo`.
5. **Orçamento de entidades:** máximo 300 simultâneos em iPhone 11/12 (documento 12). O diretor de spawn (documento 07) converte excedente em inimigos maiores, não em mais inimigos.
6. **Codex:** registrar 10 unidades libera o nome e a silhueta; 100, a descrição; 500, a Memória (lore) e +2% dano contra aquele inimigo permanente.

## 2. Tabela de referência de camadas (Ciclo I, minuto 0)

| Camada | HP | Dano de contato/s | Velocidade (jogador = 1,0) | XP | Almas | Knockback que causa |
|---|---|---|---|---|---|---|
| Massa | 8 a 20 | 4 a 8 | 0,45 a 0,7 | 1 | 0 a 1 | baixo |
| Massa rápida | 5 a 10 | 3 | 1,1 a 1,3 | 1 | 0 | nenhum |
| Médio | 60 a 150 | ataque 15 a 30 | 0,6 a 0,9 | 5 | 2 a 5 | médio |
| Elite | 600 a 1.500 | ataque 40 a 60 | 0,7 a 1,0 | 25 | 20 a 40 + baú | alto |

---

## 3. Ocos (sem deus) — presentes em todos os mapas

| Nome | Camada | Comportamento | Design | Codex (500) |
|---|---|---|---|---|
| **Oco das Lanternas** | Massa | Anda em linha reta até o jogador. | A "carne" das waves. Primeiro inimigo do jogo. | *"Eles pendiam lanternas para afastar os mortos. Agora são os mortos, e ainda carregam as lanternas."* |
| **Oco Rastejante** | Massa rápida | Rápido, zigue-zague leve, morre com um golpe. | Obriga movimento constante; pressiona Nhara (que não pode parar). | *"Perderam as pernas primeiro. Não perderam a fome."* |
| **Oco Grande** | Médio | Lento; ataque telegrafado: braço descendo em arco (0,6 s de aviso). | **Tutorial da esquiva** (minuto 1). | *"Era o ferreiro da vila. O martelo ficou. O resto foi."* |
| **Oco Suplicante** | Especial | Ajoelhado, não ataca. Ficar 5 s ao lado = Memória + ele se desfaz. | Micro-história de 15 s. | *"Ele ainda lembra de um nome. Não é o dele."* |
| **Oco Coroado** | Elite | Convoca 20 Ocos a cada 10 s; ataque telegrafado: grito (empurrão em área). | Elite de "pressão". | *"Alguém colocou uma coroa nele por piedade. Ou por piada."* |
| **Eco de Vigilante** | Elite especial | Aparece onde o jogador morreu na última Vigília, com a build daquela Vigília (até 3 armas simuladas). Guarda as Cinzas Perdidas. | Mecânica de bloodstain + boss espelho. | *"Você. Ontem."* |
| **Portador de Vela** | Médio | Carrega uma Vela Apagada; ao morrer, dropa. Foge do jogador. | Dá ritmo: perseguir ou ignorar. | — |

## 4. Sepultadoras (Ama-Nhu) — Abadia; aparecem na Charneca a partir da Hora II

| Nome | Camada | Comportamento | Design | Codex (500) |
|---|---|---|---|---|
| **Noviça de Sal** | Médio | Mantém 4 corpos de distância; a cada 3 s lança um projétil lento de sal (telegrafado). | **Tutorial do aparo** (minuto 3). O projétil é lento e brilha. | *"Fez voto de silêncio. Cumpre até hoje."* |
| **Irmã do Círculo** | Médio | Desenha um círculo de sal no chão (área de lentidão 50% por 6 s) onde o jogador está. | Pune ficar parado; combina com Ocos. | *"Sepultavam em círculos para que os mortos não soubessem para onde ir."* |
| **Carpideira** | Massa | Lenta, anda em grupos de 7, chora (sem efeito). Explode em sal ao morrer (dano leve em área, inclusive em outros inimigos). | Massa com punição por matar perto. | *"Pagas para chorar. Nunca pararam."* |
| **Costureira de Mortalhas** | Elite | Lança agulhas em leque (telegrafado, aparável); costura dois inimigos próximos num só (soma HP). | Elite de "fusão". | *"Costurou as irmãs para que nenhuma se perdesse."* |
| **Sino Ambulante** | Médio | Carrega um sino; a cada 8 s, badalada (telegrafada) que acorda Ocos mortos recentes (ressuscita até 10 cadáveres). | Força matar rápido. | — |

## 5. Ferreiros Cegos (Orun) — Forja Afundada; em Charneca/Abadia como elites raros

| Nome | Camada | Comportamento | Design | Codex (500) |
|---|---|---|---|---|
| **Aprendiz Cego** | Médio | Anda devagar; ataque telegrafado em cone frontal (martelo). HP alto. | Tanque básico. Testa dano single-target. | *"Trabalhavam no escuro. A Chama era a única luz, e eles a venderam."* |
| **Fole Vivo** | Massa | Lento, grande, inflável; quando morre solta uma rajada que **empurra o jogador** (sem dano). | Massa que desposiciona. | — |
| **Escória Andante** | Massa rápida | Poça de ferro que corre; deixa rastro quente (dano contínuo 3 s). | Pune andar sem olhar o chão. | — |
| **Mestre da Bigorna** | Elite | Bate no chão: 3 ondas concêntricas telegrafadas (esquivar pulando entre elas); ataque vermelho: queda da bigorna (não aparável). | Primeiro inimigo com ataque vermelho (Hora III). | *"Forjou o Martelo Sem Braço. Nunca soube para quem."* |
| **Autômato de Orun** | Elite | Quadrúpede de ferro, investida telegrafada longa; para por 2 s depois (janela). | Ensina punição pós-ataque. | *"Orun fez corvos de ferro para contar os mortos. Este perdeu a conta."* |

## 6. Páginas Vivas (Vharos) — Biblioteca Invertida; enxames scriptados em todos os mapas

| Nome | Camada | Comportamento | Design | Codex (500) |
|---|---|---|---|---|
| **Página Solta** | Massa rápida | Enxame de 40 a 80 atravessando a tela em linha (evento). Morre com qualquer dano. | O "enxame de morcegos" de VS. | *"Cada uma tem uma palavra. Juntas, nenhuma frase."* |
| **Marcador** | Médio | Segue o jogador à distância; a cada 5 s "marca" o chão onde ele está: 1,5 s depois, cai um tomo (telegrafado). | Ataque de área atrasado: ensina a não parar após esquivar. | — |
| **Tinteiro** | Massa | Lento; ao morrer deixa poça de tinta (lentidão 30%). | Massa que suja o terreno. | — |
| **Capítulo Errante** | Elite | Livro gigante; abre e dispara 8 projéteis em círculo (telegrafado); ataque vermelho: "reescreve" invertendo os controles do jogador por 1,5 s (a esquiva cancela). | Elite "regra". Controverso: testar bem. | *"É o capítulo que o Arquivista arrancou. Ele não gostou."* |
| **Índice Menor** | Médio | Teleporta a cada 6 s para perto do jogador; ataque telegrafado: corte de papel em X. | Pune jogadores que só fogem. | — |

## 7. Caçadores de Sélide — Bosque; raros em outros mapas

| Nome | Camada | Comportamento | Design | Codex (500) |
|---|---|---|---|---|
| **Lobo da Matilha** | Massa rápida | Em grupos de 5; circunda antes de atacar (1,5 s); mordida telegrafada curta. | Massa inteligente. | *"Sélide treinou caçadores. Os caçadores treinaram lobos. Só os lobos sobraram."* |
| **Arqueiro Devoto** | Médio | Mantém 6 corpos; flecha telegrafada (aparável); **recua** quando o jogador aproxima. | O único que foge. Testa armas de longo alcance. | — |
| **Armador** | Médio | Planta armadilhas de corda (visíveis); pisar = preso 1,5 s. Inimigos também ficam presos. | Terreno dinâmico; o jogador pode usar as armadilhas. | — |
| **Mestre de Caça** | Elite | Montado em lobo; investida telegrafada + lança 3 flechas em leque; ao chegar a 30% HP, apita: 10 lobos. | Elite de duas fases. | *"Jurou não voltar sem a presa. A presa é você."* |
| **Corça Branca** | Especial | Não ataca. Foge. Se o jogador a alcançar (raro), dropa Memória + Ímã de Osso. | Recompensa por curiosidade. | *"Sélide gostava dela. Por isso ainda existe."* |

## 8. Crias da Fome — qualquer mapa após o minuto 15; Cisterna inteira

| Nome | Camada | Comportamento | Design | Codex (500) |
|---|---|---|---|---|
| **Boca Rastejante** | Massa | Boca com pernas; morde (contato alto). Aparece onde um inimigo morreu (10% de chance após min 15). | A horda "errada". | *"Onde a Chama não chega, a Fome nasce."* |
| **Oco Invertido** | Médio | Oco das Lanternas de cabeça para baixo, andando no teto da tela (projeção): cai telegrafadamente sobre o jogador. | Variante que reaproveita sprite. | — |
| **Quimera de Facção** | Elite | Mistura aleatória de duas facções (ex.: Noviça + Lobo = atira sal e circunda). Gerada proceduralmente a partir de 2 comportamentos. | Variedade barata de produzir. | *"A Fome não cria. Só mistura."* |
| **Não-Vigilante** | Elite | Cópia do personagem do jogador com atributos invertidos (o que ele tem de mais alto vira mais baixo). | Espelho invertido. | *"Você, se tivesse escolhido diferente."* |
| **A Mão** | Médio raro | Uma mão gigante desce do topo da tela e tenta agarrar (telegrafo longo, 1,2 s). Se pegar: 20% HP e 1 s preso. | Pune desatenção. | — |

## 9. Enxames e eventos scriptados (não são inimigos, são diretor)

| Evento | Quando | O que é |
|---|---|---|
| **Procissão** | Hora II | 60 Carpideiras atravessam em fila; passar por dentro é seguro se não matar |
| **Cerco** | Hora III | Anel de 120 Ocos fecha ao redor do jogador em 20 s; uma Vela aparece no centro |
| **Revoada de Páginas** | qualquer Hora | 80 Páginas Soltas cruzam a tela em diagonal |
| **Matilha** | Bosque, Hora II+ | 25 Lobos surgem simultaneamente das bordas |
| **Chuva de Bigornas** | Forja, Hora III | 10 bigornas caem em pontos telegrafados por 15 s |
| **Eclipse Pequeno** | Biblioteca | 5 s de tela escura; apenas olhos visíveis |

## 10. Contagens

| Facção | Massa | Médio | Elite | Especial | Total |
|---|---|---|---|---|---|
| Ocos | 2 | 2 | 2 | 1 | 7 |
| Sepultadoras | 1 | 3 | 1 | 0 | 5 |
| Ferreiros | 2 | 1 | 2 | 0 | 5 |
| Páginas | 2 | 2 | 1 | 0 | 5 |
| Caçadores | 1 | 2 | 1 | 1 | 5 |
| Crias | 1 | 2 | 2 | 0 | 5 |
| **Total lançamento** | 9 | 12 | 9 | 2 | **32** + 13 chefes |

Meta pós-lançamento: +5 por região nova. Ulvar (personagem) desbloqueia ao registrar 40 inimigos distintos: 32 inimigos + 13 chefes = 45 entradas, então o jogador precisa de quase todo o Bestiário, mas não dos chefes secretos ou da Cisterna. Intencional.

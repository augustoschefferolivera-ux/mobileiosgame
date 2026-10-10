# 14 · Live-Ops, Retenção e Comunidade

> O que acontece depois do lançamento: desafios diários e semanais, temporadas, eventos, ranking, conquistas, e o calendário do primeiro ano. Referências: desafio diário de Spelunky/Dead Cells (seed fixa, uma tentativa), Pacto de Punição de Hades (recompensas por nível novo), listas de missões de Halls of Torment (~500 quests como motor de desbloqueio), passes de temporada não expiráveis (estudo Google Play: +29% D90).

---

## 1. Loops de retenção

| Horizonte | Loop | Mecanismo |
|---|---|---|
| Minuto | sobreviver, subir de nível | core loop |
| Vigília (20 min) | fechar build, matar chefe | Uniões, Postura |
| Dia | desafio diário, Bênção do dia, Rook | Corvo de Ferro, anúncio opcional |
| Semana | desafio semanal, ranking de liga | 3 modificadores, 50 jogadores por liga |
| Mês/temporada (6 semanas) | passe, personagem novo, evento | conteúdo |
| Longo prazo | Ciclos, Codex 100%, Têmpera, Memórias Finais | 60 a 80 h |

## 2. Desafio diário (Corvo de Ferro)

- **Seed fixa** para todos: mesmo mapa, mesma sequência de spawns e cartas de level up.
- **Personagem e Relíquia fixos** (rotação).
- **1 modificador** do dia (ex.: "Frascos curam o dobro, mas a esquiva custa 40").
- **1 tentativa**; 2ª via anúncio recompensado ou grátis para quem comprou qualquer item.
- Pontuação = Almas × (1 + minutos sobrevividos/10) × (2 se Amanhecer).
- Recompensa por participar: 50 Almas + 1 Memória. Top 10% da liga: 1 Brasa. Top 1: skin de moldura.
- Replay dos 3 primeiros da liga disponível (replay por seed + inputs, server-authoritative).

## 3. Desafio semanal

- Mapa e personagem livres, **3 modificadores** acumulados (um deles sempre absurdo e divertido: "Todos os inimigos são Ocos Coroados", "Gravidade dupla nos projéteis").
- Ranking global e por liga. Recompensa: 2 Brasas (top 25%), Escória rara (todos que completarem).

## 4. Temporadas (6 semanas)

Cada temporada traz: **1 personagem novo** (desbloqueável por feito; a skin alternativa vem no passe), **1 mapa ou evento**, **3 armas/Uniões**, **5 inimigos**, 1 chefe, Memórias novas, e um **passe não expirável** (40 níveis, trilha grátis com 30% das recompensas: Almas, Escória, Memórias, 1 skin; trilha paga: skins, molduras, "vozes" alternativas de NPC, Brasas limitadas). O passe é completado por **XP de temporada** ganho em qualquer Vigília (≈ 25 Vigílias para completar). Passes antigos continuam compráveis e completáveis.

### 4.1 Calendário do primeiro ano

| Temporada | Semanas | Tema | Personagem | Conteúdo |
|---|---|---|---|---|
| **0 — Lançamento** | 0 a 6 | Ciclo I completo | 12 base | 6 mapas, 13 chefes |
| **1 — A Caçada** | 7 a 12 | Sélide | A Noiva da Turfa | Clareira Sem Lua (mapa), desafios de esquiva |
| **2 — O Forjador** | 13 a 18 | Orun | Brann jovem | Cidadela de Orun; Têmpera +4 |
| **3 — Carnaval dos Ocos** | 19 a 24 | Evento de humor negro | Os Gêmeos Sem Nome | Mapa de evento temporário, máscaras (skins) |
| **4 — O Observatório** | 25 a 30 | Vharos | Maestre Oto | Observatório Caído; Ciclo III e finais A/B/C |
| **5 — Mar de Cera** | 31 a 36 | Ama-Nhu | Iselda (passado) | Mar de Cera; Final C |
| **6 — A Fome** | 37 a 42 | A Fome | A Criança da Cisterna | Ciclo V, Maldição 20, ranking infinito |
| 7+ | 43 a 52 | Pedidos da comunidade | — | Modo cooperativo assíncrono (ver 7) |

## 5. Conquistas e Feitos

- **~300 Feitos** no lançamento (Halls of Torment usa ~500 como motor de desbloqueio), organizados em: Vigilantes (12 × 3 etapas de Memória Final + 12 desbloqueios), Combate (esquivas, aparos, Quebras), Bestiário (10/100/500 por inimigo), Armas (nível 8 em cada; cada União), Chefes (derrotar; sem Frasco; sem dano; em menos de 60 s), Regiões (Amanhecer; Noite Rápida; Invertida; segredos), Meta (nós, Têmperas, Ciclos), Social (compartilhar replay, completar diário 7 dias seguidos).
- Cada Feito dá Almas (50 a 500) ou Memória; os de personagem desbloqueiam o personagem; os de Codex, títulos.
- Progresso sempre visível em barra. Nada aleatório.

## 6. Comunidade

- **Discord oficial** com canal de segredos, canal de builds, canal de bugs com template; cargos por Feitos (integração via conta).
- **Patch notes narrativos:** cada ajuste tem uma linha de lore ("Iselda notou que o Martelo estava pesado demais") e a linha técnica.
- **Programa de criadores:** códigos de criador no Codex (frase secreta) que desbloqueiam uma moldura; 10% das compras feitas com o código vão ao criador (modelo Fortnite/Epic, viável com Stripe).
- **Votação de temporada:** a partir da Temporada 7, a comunidade escolhe entre 2 mapas candidatos.
- **Wiki oficial** mínima (regras, fórmulas públicas) para evitar que a comunidade descubra tudo via datamining; segredos ficam fora.

## 7. Funcionalidades sociais planejadas (pós-lançamento)

| Recurso | Quando | Descrição |
|---|---|---|
| Compartilhar replay 10 s | lançamento | GIF/MP4 gerado no cliente |
| Ranking diário/semanal | lançamento | ligas de 50 |
| **Ecos de amigos** | Temporada 2 | O Eco que guarda suas Cinzas Perdidas pode ser o de um amigo (código de amizade); derrotá-lo dá Almas a ambos |
| **Vigília assíncrona** | Temporada 7 | Dois jogadores jogam a mesma seed; o fantasma do outro aparece como aliado passivo; ranking em dupla |
| Clãs ("Covenants") | ano 2 | Facção escolhida no Santuário; ranking por facção; recompensas por contribuição (modelo covenant de Souls) |

Nenhum multiplayer em tempo real está planejado: custo de servidor e complexidade incompatíveis com uma equipe pequena e com a plataforma web em iPhone.

## 8. Notificações (web push, só para instalados)

Máximo **1 por dia**, só se o jogador optou:
- "O desafio de hoje usa Nhara na Biblioteca." (manhã)
- "Suas Cinzas ainda estão na Charneca." (se houver Cinzas Perdidas há 3+ dias)
- "Nova temporada: A Caçada." (1 por temporada)

## 9. Metas de live-ops

| Métrica | Alvo |
|---|---|
| Participação no diário | > 25% do DAU |
| Participação no semanal | > 10% do DAU |
| Conclusão do passe (compradores) | 50 a 60% |
| Compradores de passe que compram o seguinte | > 50% |
| Feitos médios desbloqueados em 30 dias | 60 de 300 |
| Reclamações de "grind" em reviews | < 5% |

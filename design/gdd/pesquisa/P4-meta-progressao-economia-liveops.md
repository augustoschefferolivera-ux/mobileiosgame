# P4 · Pesquisa: meta-progressão, árvores de pesquisa, economia e live-ops em roguelites de ação (foco mobile)

> Relatório de pesquisa (outubro de 2026). Fontes no documento 16. Itens marcados (*) vêm de conhecimento consolidado e devem ser verificados antes de virar especificação.

## 1. Árvores de pesquisa em roguelites e incrementais

**Rogue Legacy 1 e 2.** RL1: ouro como única moeda; cada compra eleva o preço de todas as outras; Charon confisca o ouro ao iniciar a run. RL2: 73 melhorias no castelo, muitas desbloqueando classes; patch 1.0.1 reduziu custos-base. Formato: grade física (o castelo), hub-and-spoke por ala, nós de stat, desbloqueio e qualidade de vida; herdeiros com traços; Soul Shop com moeda secundária.

**Hades (Espelho + Contractor).** 12 pares de talentos (24), alternativas mutuamente exclusivas por slot. Custos em Darkness (Prima): Shadow/Fiery Presence 10/15/20/25/30; Chthonic Vitality 10/20/40; Death Defiance 30/500/1000; Stubborn Defiance 600; Deep Pockets 10 ranks de 30 → 75. Total: 35.365 Darkness. Alternativa desbloqueada com 1 Chthonic Key; respec gratuito (*). Observação: talentos "chatos" baratos e lineares; o mais forte usa salto 30 → 500 → 1000, controlando poder, não progresso. Moedas: Darkness (Espelho), Keys (armas e alternativas), Nectar (keepsakes), Ambrosia (companions), Titan Blood (aspects), Gemstones e Diamonds (Contractor); conversão no Wretched Broker evita moedas mortas.

**Dead Cells.** Células depositadas no Collector no fim de cada bioma; morrer antes perde-as. Compram blueprints e melhorias (Forja Lendária como sink enorme). Boss Stem Cells: cada um aumenta tier/densidade de inimigos, remove cura, dobra células e abre conteúdo exclusivo.

**Risk of Rain 2.** Sem stat meta: tudo entra no pool via challenges. A "árvore" é uma lista de desafios que funciona como tutorial.

**Slay the Spire.** Ascension 1 a 20 cumulativas por personagem; cada tier muda um eixo (elites, dano, cura, HP, ouro, chefe duplo no A20).

**Enter the Gungeon.** Hegemony Credits com faucet baixo e previsível; 682 créditos para tudo.

**Vampire Survivors.** PowerUps: preço depende do rank e do total global (+10% por rank); reembolso gratuito. Curse começa em 1.666 ouro. Personagens: preço base 10, +10% por personagem comprado, casos extremos de 42.000 e 50.000.

**Brotato.** Desbloqueio por achievement: marcos de kills (300/2.000/5.000/10.000/20.000, escada ×~2,5), materiais, condições de stat, 1 personagem por vitória em cada Danger.

**Hollow Knight.** 45 charms, 3 → 11 notches, overcharm dobra o dano recebido: build por slots com custo.

**Darkest Dungeon.** 4 heirlooms regionais; moedas regionais forçam visitar todos os biomas.

**Against the Storm.** Citadel com recursos meta por run; recompensa escala com dificuldade; Prestige 1 a 20 após o Citadel completo.

**Cult of the Lamb, Loop Hero, Wizard of Legend, Nuclear Throne.** Devoção → prédios; receitas multi-recurso com pré-requisitos; Chaos Gems persistentes; zero stat meta em Nuclear Throne.

**Incrementais e árvores grandes.** PoE: 1.325 nós, 5 tipos, keystones com downside. Hades II: grade 5×5 de Arcana que revela vizinhos; Grasp 10 → 30; soma total 56 (não dá para equipar tudo). Idle: `custo_n = base × growth^n`, growth 1,07 a 1,15, com ajuste manual porque "exponenciais fogem do controle". Civ VI: Eurekas (descontos de 40 a 50% por ações) (*).

### Padrões extraídos
| Dimensão | Observado | Recomendação |
|---|---|---|
| Forma | Linear por categoria, grade física, grade que revela vizinhos, constelação, lista de desafios | 4 a 6 árvores temáticas de 15 a 25 nós (90 a 130 no launch), grade "revela vizinhos" |
| Tipos de nó | stat %, unlock, modificador, keystone com trade-off | 60% stat, 20% unlock, 15% modificador, 5% keystones exclusivos |
| Custo | Linear por rank, geométrica global (+10%), exponencial (idle), saltos pontuais | `custo = base × 1,12^rank × (1 + 0,02 × ranks_globais)`; nós-chave com salto manual |
| Respec | Gratuito (Hades, VS), pago (PoE), inexistente (RL) | Gratuito por árvore |
| Gating | Boss morto, estágio limpo, achievement cumulativo, moeda regional | Ouro livre + materiais de chefe + feitos cumulativos |

## 2. Economias multi-moeda

Arquitetura típica em 3 a 5 moedas: soft (ouro), hard (gemas), tokens de desbloqueio (faucet baixo e previsível), materiais de chefe, moeda social/narrativa. Hades é o caso-escola: cada moeda com sink único e conversão tardia.

Sinks anti-inflação: compras na árvore, respec pago, morte como sink (Dead Cells, RL1), sinks aspiracionais (item de 50.000, cosméticos caros). Quando o jogador maxa a árvore, abrir novo sink em vez de inflar preços.

Catch-up/pity: God Mode de Hades (+2% por morte até 80%); blueprints persistem em Dead Cells; marcos cumulativos de Brotato garantem desbloqueio. Em roguelite: "a cada 3 runs sem material de chefe, o próximo dropa garantido".

Cadência: runs por upgrade = custo médio / ganho médio. Com `C_n = 300 × 1,12^n` e G = 400, upgrades a cada run até n≈3, a cada 2 runs em n≈10, ~4 runs em n≈18. G deve crescer com nós de Greed. Alvo: 1 compra pequena por run, 1 grande a cada 4 a 6. Archero usa energia (20 máx, 5 por run); não recomendado para um survivor-soulslike premium-fair.

Prestige: Prestige 1 a 20 (AtS), Ascension/Heat por personagem, reset com multiplicador (idle).

## 3. Escalonamento de dificuldade na meta

- **Hades Heat:** Hard Labor +20% dano/rank até +100%; Calisthenics +15% HP/rank até +30%; Lasting Consequences −25% cura/rank; Jury Summons; Convenience Fee; Extreme Measures. Máximo 63; bounties a cada novo heat até 20 por arma. Recompensa só no primeiro clear de cada heat.
- **Brotato Danger:** D3 +12%, D4 +26%, D5 +40%; curva suave compatível com mobile.
- **Dead Cells BSC:** tier de inimigo + remoção de cura + ×2 células.
- **VS Curse:** 5 ranks de +10%, "dificuldade comprada" que acelera XP/ouro.
- **RoR2 (*):** coeficiente = (jogadores + tempo × dificuldade) × 1,15^estágios; HP +30%/nível, dano +20%/nível.
- **Recomendação:** tiers 0 a 10 com +10% HP / +8% dano por tier, +1 elite-mod a cada 2 tiers, chefe duplo no tier 8; +12% ouro por tier; material de chefe garantido só em tiers novos.

## 4. Elenco

Brotato 1.0 ≈ 44; VS ~20 a 25 padrão + secretos; Hades 6 armas × 4 aspects; Soul Knight 20+ heróis. Diferenciação: arma inicial única, passivo quebra-regra, perfil de stats, mecânica exclusiva, quest própria. Para um survivor + soulslike mobile: 8 a 12 no launch, +2 por temporada; skins 2 a 3 por personagem.

## 5. Live-ops e retenção

Daily: Spelunky (seed, 1 tentativa, leaderboard), Dead Cells (daily retentável), StS (modificadores). Recomendação: daily com seed fixa e 2 tentativas (2ª via anúncio), weekly com 3 modificadores, ligas de 50, recompensas em material de chefe.

Battle pass: mediana US$ 9,99; piso mobile US$ 4,99 a 6,99; conversão 8 a 20% dos ativos; temporadas 4 a 8 semanas; só 38,5% dos pagantes terminam 100 tiers; passes não expiráveis elevaram D90 em 29% (estudo Google Play). Brasil: R$ 19,90 a 29,90, 6 semanas, 40 a 50 tiers.

Coleção/codex: Fated List (Hades), VS Collection/Unlocks/Secrets, ~500 missões de Halls of Torment que também aumentam XP.

Retenção (GameAnalytics 2025/26): D1 top 25% ≈ 26 a 28%, top 10% ≈ 40%, top 1% 64 a 68%; D7 mediana < 4%, top 10% 11 a 12%; D30 mediana 0,7 a 0,8%, top 1% 13 a 15%. Survivor.io: D1 44% / D7 15% / D30 4%. Metas realistas para mid-core: D1 35 a 40%, D7 12 a 15%, D30 5 a 7%.

## 6. Monetização justa (mobile/web, Brasil)

Modelos: premium sem anúncios (Dead Cells mobile US$ 8,99 → 5,99; StS ~US$ 9,99); DLC barato de alto volume (VS base US$ 4,99, DLCs US$ 1,99 a 2,49 com 8 a 9 personagens, 13 a 15 armas, 1 estágio, 6 a 7 músicas cada); F2P com IAP + ads (Survivor.io US$ 75 M em 2 meses, > US$ 500 M lifetime, ~US$ 5 a 6 M/mês em 2024).

Rewarded eCPM: iOS US ~US$ 13 a 20; Android ~12 a 16; Europa US$ 5,77/2,95; Brasil muito abaixo (Android ~US$ 1 a 3). Placements justos: revive 1×/run, 2× ouro, reroll extra, 2ª tentativa no daily. Cap 3 a 5/dia; nunca forçados.

"No pay-to-win": vender só cosméticos, personagens alternativos com equivalente gratuito, DLC de estágio, remover anúncios (US$ 2,99 a 4,99), battle pass. Gemas compram tempo, nunca nós da árvore.

Brasil: mobile = 51,7% do mercado; ~90 M gamers, US$ 2,47 bi (2024); 55 M+ em smartphone; Google Play lidera; aparelhos intermediários; apenas 38% dos publishers BR usam IAP e 73% usam ads; Pix no Google Play desde março/2024 só para compras avulsas (não assinaturas); Pix > 1/3 das compras online. Preços sugeridos: premium R$ 14,90 a 24,90; DLC R$ 9,90; skins R$ 4,90 a 9,90; iOS suporta +30 a 50%.

## 7. Analytics e balanceamento

Mega Crit (GDC 2019): servidor de métricas desde o início, updates semanais, cuidado com viés de seleção (cartas com win rate alto e pick rate 0,8%). Supergiant ajustou com God Mode em vez de nerfar inimigos.

KPIs: win rate por personagem × tier (alvo 15 a 25% em tier 0 para jogadores com 10+ runs; < 5% na 1ª run; nenhum personagem > 2× a mediana); duração média de run (8 a 15 min mobile; 2 a 4 min por chefe); pick/win rate de nós/armas (flag se pick < 3% ou win > 1,5× média); runs entre compras (1 a 6); % do ouro gasto por árvore; estoque mediano (inflação = estoque crescendo > 3 runs sem compra); funil de meta (1º nó D0 > 90%); participação em daily (> 25% DAU); conclusão do pass (40 a 60%); opt-in de rewarded (> 30% DAU); D1/D7/D30; correlação entre runs no D0 (alvo 3+) e D7.

## Síntese para o jogo

1. 5 árvores × ~20 nós (≈ 100), grade que revela vizinhos, pares exclusivos, 1 keystone com trade-off por árvore.
2. Três moedas: ouro (árvores), essência de chefe (gating por tier), fragmentos (personagens por feitos). Gemas só por IAP/pass para tempo e cosmético.
3. Curva `custo = base × 1,12^rank × (1 + 0,02 × globais)`, respec gratuito por árvore, nós de economia mantêm 3 a 6 runs por upgrade grande.
4. Maldição 0 a 10 (+10% HP / +8% dano, recompensa só em tier novo) + prestige por personagem.
5. 8 a 12 personagens com arma única + passivo quebra-regra + quest; +2 por temporada de 6 semanas.
6. Daily seedado (2 tentativas), weekly com modificadores, pass R$ 19,90 a 29,90 avulso (Pix), codex com % de completude.
7. F2P com rewarded opcionais + remover anúncios + cosméticos + DLC de estágio; zero P2W.
8. Telemetria desde o 1º protótipo.

# 09 · Economia, Monetização e Mercado

> Como o jogo ganha dinheiro sem trair o público do gênero. Modelo escolhido: **gratuito com anúncios recompensados opcionais + compra única "Brasa Eterna" que remove anúncios + DLCs baratos de conteúdo + cosméticos**. Zero pay-to-win. Referências: Vampire Survivors mobile (grátis, anúncios só opcionais, DLC desliga anúncios; 3 milhões de downloads nas primeiras semanas), Brotato (premium e depois versão grátis), Dead Cells mobile, Survivor.io (o extremo F2P a evitar). Mercado-alvo inicial: Brasil (Pix, sensibilidade a preço) e mercados de língua inglesa.

---

## 1. Posicionamento

| Dimensão | Decisão |
|---|---|
| Modelo | Free-to-play "justo": tudo que afeta jogabilidade é obtido jogando. |
| Compra principal | **Brasa Eterna** (compra única): remove anúncios, +1 vaga de Relíquia cosmética, skin exclusiva de Aldric. |
| Conteúdo pago | **DLCs de região** no modelo VS: 1 mapa + 2 chefes + 5 inimigos + 2 personagens + 6 armas + 3 músicas por pacote. |
| Cosméticos | Skins de personagem e de Santuário. Nunca stats. |
| Anúncios | Só **recompensados e opcionais**, nunca interstitial forçado. |
| Temporada | Passe de temporada opcional **sem expiração** (pesquisa: passes não expiráveis elevaram retenção D90 em 29% em estudo citado pelo Google Play) vendido como compra avulsa (compatível com Pix). |
| Energia / timers | **Não existem.** Jogar é ilimitado. |
| Gacha | **Não existe.** |

## 2. Preços (lançamento)

| Item | Brasil (Pix/Apple Pay web) | EUA | Observação |
|---|---|---|---|
| Brasa Eterna (remove anúncios + extras) | R$ 19,90 | US$ 4,99 | Equivale ao preço base do VS no Steam |
| DLC de região | R$ 9,90 | US$ 2,49 | Modelo VS (US$ 1,99 a 2,49) |
| Pacote de 3 skins | R$ 9,90 | US$ 2,99 | |
| Skin única | R$ 4,90 | US$ 1,49 | |
| Passe de temporada (6 semanas, 40 níveis, não expira) | R$ 19,90 | US$ 5,99 | Mediana de mercado US$ 9,99; ficamos abaixo |
| Brasas (moeda rara) **em pacote** | R$ 9,90 por 10 | US$ 2,99 | **Só compra tempo:** pular feito de personagem, trocar par exclusivo. Tudo que Brasas compram também vem jogando. Limite: 30 Brasas compradas por mês por conta (anti-baleia, protege o design). |

Pesquisa de mercado: 55 milhões de brasileiros jogam em smartphone; Google Play domina, mas iOS concentra usuários de maior gasto; Pix é mais de um terço das compras online e só funciona para compras avulsas (não assinaturas). Por isso, nenhum item do jogo é assinatura.

## 3. Anúncios recompensados (versão gratuita)

| Momento | Oferta | Limite | Por quê |
|---|---|---|---|
| Ao Apagar | **Reviver** com 50% HP | 1 por Vigília | O mais valioso emocionalmente; VS validou |
| Tela de resultado | **Dobrar Almas** | 1 por Vigília | Acelera a árvore sem quebrar (dobra uma Vigília, não o estoque) |
| Level up | **+1 Reroll** | 2 por Vigília | Pequeno, frequente |
| Desafio diário | **2ª tentativa** | 1 por dia | Daily com seed fixa tem 1 tentativa por padrão |
| Santuário | **Bênção do dia** (+25% Almas nas próximas 3 Vigílias) | 1 por dia | Cria hábito de abrir o jogo |

Cap total: **5 anúncios por dia por jogador**. Pesquisa: cadência inicial da indústria para mid-core é 2 a 3 recompensados por dia, escalando para 3 a 4 se a retenção aguentar; nosso cap é um teto, não uma meta. eCPM de recompensado em iOS fica em torno de US$ 13 a 20 nos EUA e muito abaixo no Brasil (US$ 1 a 3 em Android), então a receita de anúncios no Brasil é secundária: o Brasil converte via Brasa Eterna + Pix.

Ao comprar qualquer item pago, **os anúncios somem** (regra de VS: comprar qualquer DLC remove os anúncios). O jogador que paga R$ 9,90 por uma skin nunca mais vê anúncio, e as ofertas de Reviver/Dobrar viram gratuitas 1× por Vigília.

## 4. Projeção simplificada (cenário conservador, 12 meses)

| Métrica | Valor | Base |
|---|---|---|
| Downloads/instalações web (12 meses) | 400.000 | Portais (Poki/CrazyGames) + orgânico + Telegram |
| D1 / D7 / D30 | 35% / 12% / 5% | Metas mid-core (benchmark GameAnalytics top 10%: D1 40%, D7 11%, D30 ~5%; Survivor.io: 44/15/4) |
| Conversão a pagante | 4% | Premium-fair fica entre F2P (1 a 2%) e premium |
| ARPPU (receita média por pagante) | R$ 32 | Brasa Eterna + 1 DLC em média |
| Receita IAP | R$ 512.000 | 400k × 4% × R$ 32 |
| Receita de anúncios | R$ 90.000 | DAU médio 12k × 1,2 ads/dia × eCPM ponderado US$ 4 |
| Taxa de plataforma | 0% web direto (Stripe ~4%); 50% em tráfego de portal | |
| **Receita líquida estimada** | **R$ 450.000 a 550.000** | Cenário conservador |

Cenário de sucesso (1 hit em TikTok/Poki, 2 milhões de instalações): receita multiplica por 5 a 6. Cenário ruim (100k instalações): R$ 120.000. O custo de produção (documento 15) precisa caber no cenário ruim para a equipe sobreviver e no conservador para dar lucro.

## 5. Distribuição

| Fase | Canal | Objetivo |
|---|---|---|
| Alpha fechado | itch.io (link privado) + Discord | 200 testadores, telemetria |
| Beta aberto | PWA próprio + itch.io público | 5.000 jogadores, retenção |
| Lançamento | PWA próprio, **Poki**, **CrazyGames**, Telegram Mini App, Newgrounds | Alcance |
| +3 meses | Discord Activities, YouTube Playables (formulário) | Alcance adicional |
| +6 a 9 meses | App Store via Capacitor (se a web provar retenção) com Game Center, haptics nativos e StoreKit | Audiência premium; risco de rejeição 4.2 mitigado |
| +12 meses | Steam (versão desktop da mesma build, com controle) | Audiência do gênero (VS, Brotato, Megabonk nasceram ali) |

## 6. Marketing de guerrilha (orçamento baixo)

1. **Segredos sussurrados** (regra de VS): frases do Codex que desbloqueiam personagens, lanternas secretas, Corça Branca. A comunidade faz o marketing.
2. **Clipes de aparo:** o aparo com congelamento de 80 ms e contra-ataque de todas as armas é "clipável". Botão de **compartilhar replay de 10 s** na tela de resultado (gera GIF/MP4 no cliente).
3. **TikTok/Reels:** 3 vídeos por semana de 15 s (Survivor.io cresceu assim; Megabonk vendeu 1 milhão em 2 semanas por streamers).
4. **Streamers brasileiros de roguelite** com build de acesso antecipado e um personagem cosmético "do canal".
5. **Desafio diário com ranking público** incorporável em Discord.

## 7. Regras éticas (não negociáveis)

- Nenhum anúncio não solicitado. Nenhum timer de espera. Nenhuma loot box.
- Preço visível em moeda local antes de qualquer toque.
- Compras de Brasas limitadas por mês.
- Modo "sem compras" para crianças (toggle no perfil): esconde a loja inteira.
- Classificação indicativa alvo: 12+ (violência fantasiosa, sem sangue realista).

## 8. KPIs de negócio (acompanhar semanalmente)

| KPI | Alvo | Alarme |
|---|---|---|
| D1 / D7 / D30 | 35 / 12 / 5% | D1 < 28% |
| Vigílias por jogador no D0 | ≥ 3 | < 2 |
| Opt-in de anúncio recompensado | > 30% do DAU | < 15% |
| Conversão a pagante (60 dias) | 4% | < 2% |
| Compradores de Brasa Eterna que compram DLC | 35% | < 20% |
| Participação no desafio diário | > 25% do DAU | < 10% |
| Reclamações de "pay-to-win" em reviews | 0 | qualquer |

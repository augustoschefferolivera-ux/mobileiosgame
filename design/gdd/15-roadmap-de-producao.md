# 15 · Roadmap de Produção

> Equipe, fases, marcos, entregas e orçamento estimado para levar *Vigília das Cinzas* da pré-produção ao lançamento e ao primeiro ano de live-ops. Premissa: estúdio pequeno, remoto, Brasil, 12 a 14 meses até o lançamento.

---

## 1. Equipe

| Papel | Dedicação | Responsabilidades |
|---|---|---|
| **Diretor de jogo / designer** (redator deste documento) | integral | Visão, balanceamento, narrativa, textos, telemetria |
| **Programador principal (TypeScript/PixiJS)** | integral | Engine de simulação, renderização, performance iOS, pipeline |
| **Programador de gameplay/UI** | integral a partir do mês 3 | Armas, inimigos, chefes, telas, SDKs de portal, anúncios |
| **Artista de pixel art (personagens/inimigos/chefes)** | integral | 12 personagens, 32 inimigos, 13 chefes |
| **Artista de ambientes/UI** | integral a partir do mês 2 | Tilesets, Santuário, ícones, telas |
| **Compositor + sound designer** | freelance, 4 blocos | 17 faixas, 260 efeitos |
| **QA / comunidade** | meio período a partir do mês 6 | Testes em aparelhos, Discord, feedback |
| **Backend (Supabase/Stripe)** | freelance, 2 blocos | Conta, save em nuvem, pagamentos, ranking |

Total: 4 pessoas integrais no núcleo, chegando a 6 com freelancers e QA.

## 2. Fases e marcos

### Fase 0 — Pré-produção (meses 1 a 2)
- Planilha viva de balanceamento (todas as fórmulas do documento 10).
- **Protótipo de combate** em PixiJS: 1 personagem, 2 armas, 1 inimigo massa, 1 médio com telegrafo, esquiva, aparo, stamina. Sem arte final.
- **Teste de performance no iPhone 11 e 14:** 300 e 500 sprites com simulação em Worker. Decisão final de engine (PixiJS 8 vs Phaser 4).
- Teste de controles com 10 pessoas: o aparo "sente" bem? Ajustar janela/telegrafo.
- Pipeline de assets (atlases 2048, Opus/AAC), CI de build para PWA.
- **Marco M0:** "o aparo é gostoso no iPhone." Se não for, não seguimos.

### Fase 1 — Vertical slice (meses 3 a 5)
- Charneca completa: 20 min, diretor de spawn, 7 inimigos, Oco Coroado Maior, O Lanterneiro, Fogueira, level up, 4 personagens (Aldric, Nhara, Ulvar, Caël), 12 armas, 6 passivas, 6 Uniões.
- Santuário mínimo: Iselda (árvore de Fundação completa, 24 nós), resultado, Cinzas Perdidas com Eco.
- Arte final para tudo acima. Música da Charneca em 3 camadas + chefe.
- Save local + retomada de Fogueira. Telemetria básica.
- **Alpha fechado** com 50 pessoas (Discord).
- **Marco M1:** retenção D7 do alpha > 20%; taxa de Amanhecer entre 2 e 5 h de jogo ≈ 20%.

### Fase 2 — Produção (meses 6 a 10)
- Mais 5 regiões, 25 inimigos, 11 chefes, 8 personagens, 26 armas, 12 passivas, 28 Uniões, 3 árvores + Fome, Relíquias, Têmpera, Codex, Feitos.
- Pactos, Ciclos II e III, modos de mapa, A Fome (equivalente da Morte).
- NPCs completos com falas (≈ 300 linhas de personagem + 150 Memórias).
- Conta (Sign in with Apple), save em nuvem, Stripe + Apple Pay web, loja, anúncios (H5 Games Ads / Poki / CrazyGames SDK), desafio diário, ranking.
- Localização para inglês.
- **Alpha fechado 2** (200 pessoas) no mês 8; **beta aberto** (itch.io + PWA) no mês 10 com 5.000 jogadores.
- **Marco M2:** beta com D1 ≥ 30%, D7 ≥ 10%; fps ≥ 55 no iPhone 11 na Hora IV; zero jetsam em 100 sessões de teste.

### Fase 3 — Polimento e lançamento (meses 11 a 13)
- Balanceamento com dados do beta (2 ajustes por semana).
- Acessibilidade completa, onboarding final, replays compartilháveis.
- Submissão a Poki e CrazyGames (exigências de SDK), Telegram Mini App, Newgrounds, itch.io.
- Trailer de 60 s, 15 clipes de 15 s, kit de imprensa, contato com 30 criadores brasileiros e 30 internacionais.
- **Lançamento** (mês 13): PWA + portais. Temporada 0.
- **Marco M3:** 100 mil instalações no primeiro mês; D1 ≥ 35%.

### Fase 4 — Primeiro ano de live-ops (meses 14 a 25)
- Temporadas 1 a 6 (documento 14): 1 personagem + 1 mapa/evento + passe a cada 6 semanas.
- Mês 16 a 19: empacotamento para App Store via Capacitor com Game Center, haptics nativos, StoreKit (se a retenção web justificar).
- Mês 22 a 25: versão Steam (mesma build, controle, paisagem).
- Sistemas sociais: Ecos de amigos (T2), Vigília assíncrona (T7).

## 3. Cronograma resumido

| Mês | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14+ |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Pré-produção | ■ | ■ | | | | | | | | | | | | |
| Vertical slice | | | ■ | ■ | ■ | | | | | | | | | |
| Produção | | | | | | ■ | ■ | ■ | ■ | ■ | | | | |
| Polimento | | | | | | | | | | | ■ | ■ | | |
| Lançamento | | | | | | | | | | | | | ★ | |
| Live-ops | | | | | | | | | | | | | | ■■■ |
| Alpha 1 / Alpha 2 / Beta | | | | | ▲ | | | ▲ | | ▲ | | | | |

## 4. Orçamento estimado (13 meses até o lançamento)

Valores em reais, estimativa para equipe brasileira remota, impostos simplificados.

| Item | Mensal | Meses | Total |
|---|---|---|---|
| Diretor/designer | R$ 12.000 | 13 | R$ 156.000 |
| Programador principal | R$ 14.000 | 13 | R$ 182.000 |
| Programador gameplay/UI | R$ 11.000 | 11 | R$ 121.000 |
| Artista personagens | R$ 9.000 | 13 | R$ 117.000 |
| Artista ambientes/UI | R$ 9.000 | 12 | R$ 108.000 |
| Áudio (freelance) | — | — | R$ 60.000 |
| Backend (freelance) | — | — | R$ 25.000 |
| QA/comunidade (meio período) | R$ 3.500 | 8 | R$ 28.000 |
| Localização EN (150 Memórias + 300 falas + UI) | — | — | R$ 12.000 |
| Infra (Supabase, CDN, domínio, Stripe), aparelhos de teste (3 iPhones) | — | — | R$ 30.000 |
| Marketing (trailer, criadores, anúncios de teste) | — | — | R$ 40.000 |
| Jurídico/contábil/classificação | — | — | R$ 15.000 |
| **Total** | | | **≈ R$ 895.000** |
| Reserva de 15% | | | R$ 135.000 |
| **Total com reserva** | | | **≈ R$ 1.030.000** |

Comparado com a projeção do documento 09 (cenário conservador R$ 450 a 550 mil no primeiro ano; cenário de sucesso ×5), o projeto **não se paga no cenário conservador sem financiamento** (editais, publisher de web games, Lei Paulo Gustavo/Rouanet, investimento-anjo) e **se paga com folga em um cenário de hit**. Alternativas para reduzir risco: equipe de 3 com prazo de 18 meses (≈ R$ 650 mil), ou publisher de portal com adiantamento (Poki e CrazyGames têm programas de financiamento de desenvolvimento).

## 5. Critérios de "pronto" por sistema

| Sistema | Pronto quando |
|---|---|
| Combate | 50 testadores: ≥ 80% dizem que a esquiva é "previsível" e o aparo é "satisfatório" |
| Diretor de spawn | Curva de HP agregado da horda vs DPS do jogador dentro de ±15% do alvo em 5 Vigílias simuladas |
| Chefe | Vencido em 2 a 3 min por testador mediano após 3 tentativas; 100% das mortes explicáveis |
| Árvore | Cadência medida de 1 a 2 Vigílias por nó pequeno e 4 a 6 por grande nos primeiros 20 h |
| Performance | iPhone 11: ≥ 55 fps médio na Hora IV, < 150 MB, retomada de Fogueira funcional |
| Monetização | 0 reclamações de P2W no beta; opt-in de anúncio > 30% |
| Narrativa | Toda Memória ≤ 60 palavras; todo diálogo ≤ 3 balões; revisão de PT e EN |

## 6. Dependências externas e prazos

| Dependência | Prazo de antecedência |
|---|---|
| Aprovação em Poki / CrazyGames | 6 a 8 semanas antes do lançamento |
| Google H5 Games Ads (aplicação) | 3 meses antes |
| Sign in with Apple (Services ID, domínio) | 2 meses antes |
| Stripe + Apple Pay (verificação de domínio) | 2 meses antes |
| Classificação indicativa (ClassInd / IARC) | 2 meses antes |
| Marcas e domínio | pré-produção |

## 7. O que fica fora do lançamento (explicitamente)

- Multiplayer em tempo real.
- Dublagem completa.
- Versão nativa na App Store (fase 4, condicional).
- Mapas além dos 6 do Ciclo I.
- Editor de desafios pela comunidade.
- Tradução para espanhol (Temporada 1).

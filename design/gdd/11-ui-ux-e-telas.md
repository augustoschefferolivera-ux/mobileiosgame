# 11 · UI, UX e Fluxo de Telas

> Todas as telas do jogo, o que cada uma mostra, e as regras de interface para iPhone em retrato, uma mão. Princípio: **o HUD nunca compete com o polegar**; tudo que o jogador lê fica no terço superior; tudo que ele toca fica no terço inferior.

---

## 1. Regras gerais de interface

| Regra | Valor |
|---|---|
| Orientação | Retrato (paisagem só com controle físico ou em desktop) |
| Alvo mínimo de toque | 72 pt (botões de combate 80 pt) |
| Zonas | Superior (0 a 25% da altura): informação. Centro (25 a 65%): jogo. Inferior (65 a 100%): controles. |
| Safe areas | Respeitar `safe-area-inset` em todos os lados; HUD nunca sob a Dynamic Island |
| Tipografia | Fonte pixel para números e HUD (legível a 11 px); fonte serifada de leitura para lore e menus (≥ 15 pt) |
| Texto | Nenhum texto de UI com mais de 2 linhas na Vigília; nenhum parágrafo de lore com mais de 60 palavras |
| Cor | Interface em osso/bronze sobre fundo escuro; vermelho só para "ataque vermelho" e perigo; branco só para aparo |
| Animação | Transições ≤ 200 ms; nenhuma animação bloqueia input |
| Acessibilidade | Modo daltônico (azul/laranja no lugar de verde/vermelho), desligar flashes, ocultar números de dano, aumentar botões, Modo Brasa Gentil, texto maior, legendas de áudio importantes ("inspirar" do telegrafo vira ícone) |
| Idioma | PT-BR e EN no lançamento; ES na primeira temporada |
| Som de UI | Cada toque tem som curto; o jogador sabe que tocou mesmo sem vibração |

## 2. Mapa de telas

```
[Tela de Acender] → [Santuário] ─┬─ [Vigilantes] → [Detalhe do Vigilante] → [Relíquias]
                                 ├─ [Regiões] → [Ciclo e Pactos] → ACENDER → [Vigília]
                                 ├─ [Árvore de Pesquisa] (Iselda)
                                 ├─ [Forja] (Brann)
                                 ├─ [Codex] (Oto)
                                 ├─ [Costureira] (Nhemi)
                                 ├─ [Corvo de Ferro] (diário, ranking)
                                 ├─ [Vendedor] (Rook, loja)
                                 ├─ [Criança] (Ciclos, Pactos)
                                 └─ [Opções] / [Perfil e conta]
[Vigília] ─ [HUD] ─ [Level up] ─ [Fogueira] ─ [Pausa] ─ [Apagar] / [Amanhecer] → [Resultado] → [Santuário]
```

## 3. Telas, uma a uma

### 3.1 Tela de Acender
- Logotipo. Botão único "Toque para acender a Chama". Esse toque desbloqueia o áudio (exigência do iOS) e toca a primeira nota do tema.
- Abaixo, discreto: idioma, "Adicionar à Tela de Início" (se não instalado), aviso de áudio ("Se não ouvir nada, verifique a chave de silêncio").
- Carregamento mostra uma Memória aleatória do Codex (lore enquanto carrega).

### 3.2 Santuário (hub)
- Cena 2D lateral com a fogueira central e os NPCs em posições fixas. Rolagem horizontal leve. Tocar em um NPC abre seu painel. Cada NPC tem um indicador discreto quando há novidade (fala nova, item novo, pesquisa possível).
- Barra superior: Almas, Brasas, Memórias, Escória.
- Botão grande inferior: **"Vigília"** (vai direto para a seleção de Vigilante). O caminho do toque em "Acender" até começar a jogar deve ter **no máximo 3 toques** (Vigilante, Região, Acender) com os últimos usados pré-selecionados.

### 3.3 Vigilantes
- Carrossel horizontal de retratos. Bloqueados aparecem em silhueta com barra de progresso do feito ("Esquive 200 ataques: 143/200").
- Detalhe: perfil de atributos (pentágono), arma inicial, passiva, maldição (destaque), Memória Final (3 etapas), skin equipada, estatísticas pessoais (Vigílias, Amanheceres, melhor tempo).

### 3.4 Regiões
- Mapa vertical do mundo: o Santuário no meio, as regiões em camadas acima e abaixo. Regiões bloqueadas mostram condição.
- Por região: bônus de mapa, chefes conhecidos (retratos ou silhuetas), modos desbloqueados, melhor resultado, Cinzas Perdidas presentes ("Há Cinzas suas aqui: 420 Almas").

### 3.5 Ciclo e Pactos
- Lista de Pactos com toggles; Maldição total e multiplicador de Almas em destaque. Indicação de "primeira vitória nesta Maldição = Brasa garantida".
- Botão "Acender" grande, com resumo: Vigilante · Relíquia · Região · Maldição.

### 3.6 HUD da Vigília
```
┌─────────────────────────────────────┐
│ ⏸ 12:34          ●●●● Hora III      │ relógio e Hora
│ ▓▓▓▓▓▓▓▓▓▓░░░░░░ Nv 19             │ XP
│ ♥ ▓▓▓▓▓▓▓░░ 71   ⚡ ▓▓▓▓▓▓▓▓▓▓    │ HP (número) e stamina
│ [⚔][⚔][⚔][⚔][⚔][ ] [◆][◆][◆][◆][ ][ ]│ 6 armas, 6 passivas (ícones 28 pt)
│ ✦ 1.240 Almas    ⚗ 2              │ Almas e Frascos
└─────────────────────────────────────┘
```
- Barra de Postura do chefe aparece sob a barra de HP do chefe (topo, abaixo do HUD) só durante chefes.
- Números de dano: pequenos, brancos; críticos (Postura Quebrada) amarelos e maiores. Podem ser desligados.
- Indicador de telegrafo: além do brilho no inimigo, uma **seta curta na borda da tela** quando o atacante está fora de vista (padrão de shooters).
- Indicador de Cinzas Perdidas / Fogueira: setinha no limite da tela.

### 3.7 Level up
- Modal escuro com 3 cartas (4 quando aplicável) em coluna (retrato). Cada carta: ícone 64 pt, nome, linha funcional em negrito ("+1 golpe"), linha de lore em itálico.
- Cartas que **completam uma União** têm borda dourada e um texto "Completa: Lâmina do Juramento Eterno".
- Botões inferiores: Reroll (x), Pular (x), Banir (x) com contadores.
- Confirmação por **segundo toque** na carta (configurável para toque único).
- O jogo fica pausado; o modal pode ser fechado com swipe para baixo só depois de escolher.

### 3.8 Fogueira
- Tela de pausa diegética: a fogueira ao centro, o Vigilante sentado. Ações em lista (Descansar, Forjar, Oferenda, Rook, Pacto Momentâneo, Partir), cada uma com custo e consequência em uma linha ("Descansar: Frascos cheios. A noite fica 10% mais densa.").
- Mostra a build completa com níveis e Uniões possíveis.
- Autosave visível ("Vigília guardada") ao Partir.

### 3.9 Pausa
- Build, estatísticas da Vigília (mortes causadas, dano recebido, aparos), opções rápidas (som, flashes, números), "Abandonar Vigília" com confirmação e aviso de Almas ×0,5.

### 3.10 Apagar
- Câmera lenta 1 s, tela escurece, texto "Você se apaga." Depois: opção **Reviver** (se houver Reviver próprio ou anúncio disponível) com contagem de 5 s; se recusar, Resultado.

### 3.11 Amanhecer
- 10 s de céu clareando sem UI. Depois, texto "Amanhecer." e a Memória do chefe. Depois Resultado.

### 3.12 Resultado
- Tempo, nível, mortes causadas, chefe mais longe, Almas (com animação de contagem), Brasas, Memórias, Escória.
- Cinzas Perdidas: mapa pequeno com a mancha e o texto "420 Almas ficaram na Hora III".
- Botões: **Dobrar Almas (anúncio)** (versão grátis), **Compartilhar replay (10 s)**, **Voltar ao Santuário**, **Repetir Vigília** (mesma config).
- Progresso de feitos avançados nesta Vigília ("Esquivas perfeitas: 143 → 171 / 200").

### 3.13 Árvore de Pesquisa (Iselda)
- Quatro abas (deuses) + quinta oculta. Grade 5×5 com nós revelados/ocultos. Toque = tooltip (nome de memória, efeito numérico, custo, rank). Segundo toque = comprar. Botão "Reembolsar árvore" com confirmação.
- Mostra, no topo, "Próxima pesquisa possível: X Almas" e quantas Vigílias faltam na média do jogador.
- A fala de Iselda muda com a árvore comprada (1 linha).

### 3.14 Forja (Brann)
- Lista de armas com Têmpera (+0 a +3), custo em Almas e Escória por tier; preview do efeito. Lista de Uniões conhecidas (receita visível após a primeira vez; antes, "?").

### 3.15 Codex (Oto)
- Abas: Bestiário, Armas, Uniões, Relíquias, Chefes, Memórias. Porcentagem por aba e geral. Campo de texto discreto no fim ("Sussurrar a Oto") para frases secretas.

### 3.16 Costureira (Nhemi)
- Skins por personagem com preview animado; preço em Memórias ou dinheiro real (etiquetado claramente).

### 3.17 Corvo de Ferro (diário e ranking)
- Desafio diário (seed, personagem fixo, modificador, 1 tentativa + 1 por anúncio), ranking por liga de 50, histórico pessoal. Semanal com 3 modificadores.

### 3.18 Vendedor (Rook)
- 3 ofertas rotativas por dia em Brasas (Relíquias raras, Escória, Têmpera com desconto).

### 3.19 Criança (Ciclos)
- Seleção de Ciclo e visualização dos Pactos permanentes da árvore da Fome.

### 3.20 Opções e Perfil
- Áudio (música, efeitos, voz), controles (joystick fixo/flutuante, tamanho, posição dos botões com editor de arrastar, toque único no level up, esquiva por botão), acessibilidade (lista acima), idioma, conta (Sign in with Apple / e-mail), sincronização de save, restaurar compras, "Adicionar à Tela de Início", créditos, política de privacidade.

## 4. Onboarding (primeiros 10 minutos)

| Momento | O que acontece | Regra |
|---|---|---|
| 0:00 | Tela de Acender | 1 toque |
| 0:05 | Direto para a Vigília com Aldric na Charneca (sem passar pelo Santuário) | Jogar antes de ver menus |
| 0:10 | Prompt "Deslize para mover" no joystick | some ao mover |
| 1:00 | Oco Grande telegrafando: câmera lenta leve 0,5 s + prompt "Toque duas vezes para esquivar" | 1 vez |
| 3:00 | Noviça: "Toque em ⟲ no momento do brilho para aparar" | 1 vez; se falhar 2 vezes, repete com janela +0,1 s |
| 5:00 | Primeira Fogueira: tour de 3 balões | puláveis |
| Primeiro Apagar | Resultado explica Cinzas Perdidas em 1 balão; volta ao Santuário com Iselda apresentando a árvore e 300 Almas garantidas para a primeira compra | compra guiada |
| 2ª Vigília | Prompt para escolher Relíquia (se houver) | — |
| Após 1ª Vigília completa | Sugestão "Adicionar à Tela de Início para guardar sua Brasa" | 1 vez; repete após 5 Vigílias se recusado |

## 5. Microinterações que carregam a identidade

- **Aparo:** flash branco de 2 frames, congelamento de 80 ms, som metálico agudo, câmera "aperta" 2%.
- **Esquiva perfeita:** rastro de brasas atrás do personagem, som de sopro, 4 frames de contorno branco.
- **Quebra de Postura (chefe):** a barra racha com som de vidro; texto "QUEBRADO" em fonte pixel grande por 0,5 s.
- **Level up:** a Cinza de XP "sobe" para a barra; a barra enche e emite uma faísca.
- **União:** a arma antiga queima e a nova emerge das cinzas (1,5 s, pode ser pulada).
- **Fogueira:** o Vigilante senta; a música baixa para um só instrumento.
- **Amanhecer:** a vinheta escura dissolve para âmbar; cada inimigo vira uma partícula de cinza que sobe.

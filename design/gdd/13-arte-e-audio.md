# 13 · Direção de Arte e Áudio

> Como o jogo parece e soa, com os limites de produção e de performance do iPhone na web como ponto de partida (documento 12).

---

## 1. Direção de arte

### 1.1 Estilo
**Pixel art de alta leitura** com paleta restrita e iluminação dinâmica simples (luz da brasa do personagem e das lanternas). Referências visuais: *Blasphemous* (iconografia e texturas de pedra), *Hyper Light Drifter* (paleta e silhueta), *Death's Door* (leitura de chefe), *Vampire Survivors* (densidade legível), *Hollow Knight* (melancolia sem gore). Motivo da escolha: pixel art 32 px cabe em atlases 2048², animações de 4 a 6 frames são baratas e a leitura em tela pequena é superior a arte vetorial detalhada.

### 1.2 Resoluções
| Elemento | Tamanho | Frames |
|---|---|---|
| Personagem jogável | 48×48 | idle 4, andar 6, rolar 5, aparar 3, frasco 4, apagar 6 = 28 |
| Inimigo massa | 32×32 | andar 4, morrer 3 (compartilhado por paleta) |
| Inimigo médio | 48×48 | andar 4, telegrafo 3, ataque 4, morrer 4 |
| Elite | 64×64 | andar 4, telegrafo 3, ataque 4 ×2, morrer 6 |
| Chefe Menor | 96 a 128 px | 30 a 40 frames |
| Chefe da Região | 128 a 192 px | 50 a 70 frames |
| Projéteis e efeitos | 16 a 48 px | 3 a 6 |
| Tiles | 16×16 | — |
| Retratos (UI) | 192×192 | estático + 2 expressões |

Resolução interna de jogo: 390×844 pontos lógicos (iPhone 12/13/14) renderizados a 2×; câmera mostra ≈ 12 × 26 corpos (32 px).

### 1.3 Paleta
- **Base global:** 32 cores. Fundo em azuis-pretos e cinzas frios (#0b0e14, #1a1f2b, #2b3340). Brasa: âmbar (#ffb347), laranja queimado (#e2652b), vermelho escuro (#7a1f1f). Osso/UI: #e8dcc4. Sal: #dfe8ea.
- **Por facção, 3 cores de identidade** sobre a base: Ocos (verde-musgo, pele cinza, âmbar de lanterna), Sepultadoras (branco-osso, preto, sal azulado), Ferreiros (bronze, ferro escuro, laranja de forja), Páginas (papel amarelado, tinta azul, vermelho de sinete), Caçadores (verde-pinho, cinza-lobo, marrom), Crias (preto líquido, vermelho de boca, roxo).
- **Regras de leitura:** o jogador é a coisa mais quente da tela; ataques brancos são brancos puros; ataques vermelhos são #ff2a2a puro e nada mais no jogo usa esse vermelho.

### 1.4 Iluminação
Luz 2D barata: um sprite de gradiente radial aditivo no personagem (raio 5 corpos), nas lanternas e nas Fogueiras; vinheta que escurece com as Horas. Sem sombras dinâmicas (orçamento). Em "degradação graciosa", a luz do personagem é o último efeito a sumir.

### 1.5 Animação de horda
Inimigos massa compartilham spritesheet e animação; variedade por **troca de paleta em shader** (3 variantes por tipo) e espelhamento. Toda morte de massa é a mesma animação de 3 frames virando cinza. Elites e chefes têm morte própria.

### 1.6 Chefes
Cada chefe tem: silhueta reconhecível em 1 cor; pelo menos um elemento animado permanente (lanterna oscilando, páginas voando); cores de fase (fase 2 adiciona a cor da Brasa; fase 3 adiciona vermelho). O telegrafo é parte do sprite (frames de "inspirar"), não só um efeito sobreposto.

### 1.7 UI
Painéis em "pedra e osso": bordas de 2 px em tom osso, fundo translúcido escuro, ícones de 28 pt em pixel art com contorno de 1 px. Tipografia: *fonte pixel própria* para HUD (baseada em métricas de 11 px) e uma serifa de leitura (ex.: EB Garamond ou similar com licença livre) para lore.

### 1.8 Santuário
Cena lateral de 3 telas de largura, pintada em pixel art de maior resolução (tiles 32 px), com 5 estados visuais que mudam conforme as árvores (documento 01): cada árvore adiciona 2 a 3 elementos (bigorna, janela, candelabros, cripta).

### 1.9 Orçamento de arte (lançamento)
| Item | Quantidade | Estimativa (dias de artista) |
|---|---|---|
| Personagens jogáveis | 12 × 28 frames + retrato + 1 skin alternativa | 60 |
| Inimigos | 32 | 50 |
| Chefes | 13 | 65 |
| Armas e Uniões (projéteis, efeitos) | 38 + 34 | 40 |
| Tilesets e objetos | 6 mapas | 45 |
| Santuário e NPCs | 1 cena, 7 NPCs, 5 estados | 25 |
| UI e ícones | ~200 ícones, 20 telas | 30 |
| **Total** | | **≈ 315 dias de artista** (2 artistas, ~8 meses) |

## 2. Direção de áudio

### 2.1 Música
- **Estilo:** cordas graves, coro distante, percussão de metal, sinos; motivos curtos que se repetem (o "tema da Chama" em 4 notas aparece em todo lugar). Referências: *Dark Souls* (coro e órgão), *Hollow Knight* (piano melancólico), *Blasphemous* (guitarra espanhola e canto), *Hades* (energia na luta).
- **Estrutura por mapa:** tema de exploração em **3 camadas** (Hora I: só base; Hora II: + melodia; Hora III/IV: + percussão e coro), em loop de 2 a 3 min, misturadas em tempo real. Tema de chefe em 2 camadas (fase 1-2 / fase 3). Tema do Santuário em 2 camadas (dia/noite conforme progresso). Tema de Amanhecer (30 s, não loop). Tema de Apagar (10 s).
- **Quantidade no lançamento:** 6 mapas × (1 exploração + 1 chefe) + Santuário + Amanhecer + Apagar + título + Fome = **17 faixas**, ≈ 45 min de música.
- **Formato:** Opus/OGG com fallback AAC para Safari; < 2 MB por faixa; camadas como arquivos separados sincronizados por relógio de áudio.

### 2.2 Efeitos sonoros (regras)
- **O aparo tem o som mais importante do jogo:** metálico, agudo, curto, com cauda de reverberação. Deve ser reconhecível em alto-falante de iPhone.
- **Telegrafo:** "inspirar" grave 0,5 s antes do ataque; ataques vermelhos têm um estalo seco adicional.
- **Esquiva perfeita:** sopro + tilintar de brasa.
- **Horda:** sons de massa são **agregados**: um só loop de "multidão" cuja intensidade segue a contagem de inimigos, mais no máximo 6 sons individuais por segundo (orçamento de vozes: 16 simultâneas). Mortes em massa viram um "crepitar" contínuo.
- **Armas:** cada arma tem 1 som de disparo e 1 de impacto; Uniões adicionam uma camada. Limitar a 1 impacto por 100 ms por arma.
- **UI:** toque (pedra), confirmar (brasa), erro (cinza caindo), level up (faísca em escala ascendente), compra na árvore (página virando + brasa).
- **Chefes:** cada um com 2 a 3 sons próprios (voz/rugido/sino) e um som de Quebra de Postura compartilhado (vidro + sino grave).

### 2.3 Voz
Sem dublagem completa (orçamento e tamanho). NPCs do Santuário têm **"vozes de sílaba"** (um ou dois sons por personagem, estilo Animal Crossing/Hollow Knight) para dar personalidade sem texto gravado. Chefes têm rugidos/gritos processados.

### 2.4 Mixagem para iPhone
- Mix em mono-compatível (alto-falante) com verificação em fones. Compressão suave no master para alto-falante pequeno.
- Música −6 dB em relação aos efeitos de combate; aparo e telegrafo são os picos.
- Ao pausar/level up/Fogueira: filtro passa-baixa na música (sensação de "debaixo d'água").
- Interrupções (ligações): pausa automática e retomada do contexto de áudio (documento 12).

### 2.5 Orçamento de áudio
| Item | Quantidade | Estimativa |
|---|---|---|
| Faixas musicais | 17 (≈ 45 min, em camadas) | 50 dias de compositor |
| Efeitos sonoros | ~260 | 30 dias de sound designer |
| Vozes de sílaba e rugidos | 7 NPCs + 13 chefes | 8 dias |
| Implementação e mixagem | — | 20 dias |

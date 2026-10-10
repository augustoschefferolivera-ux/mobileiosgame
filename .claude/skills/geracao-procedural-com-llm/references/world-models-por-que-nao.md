# World models e "motores neurais": por que não no iPhone (estado em 10/10/2026)

Leia quando alguém propuser "gerar o jogo quadro a quadro com IA" ou "usar o Genie/Oasis no celular".

## O que existe e onde roda

| Sistema | O que é | Resolução / fps | Memória temporal | Onde roda | Acesso |
|---|---|---|---|---|---|
| Google Genie 3 / Project Genie | world model interativo | 720p, ~24 fps, sessões de 60 s | "múltiplos minutos" de consistência visual | datacenter | assinantes US Google AI Ultra, sem API (29/01/2026) [secundário] |
| Microsoft WHAMM (Quake II) | "real-time AI rendition" | 640×360, 10+ fps | **0,9 s** (9 quadros): o que sai de vista por > 0,9 s é esquecido | datacenter (Copilot Labs) | demo |
| Microsoft Muse / WHAM-1.6B | modelo de ideação de gameplay | 300×180 | até 2 min | Azure AI Foundry | pesos abertos |
| Decart Oasis (2024) / Oasis 3 (06/2026) | Minecraft-like; Oasis 3 é world model de **direção** para AV | 512×768, 22 fps (Oasis 3) | — | CoreWeave | API, **US$ 0,02/s** |
| Tencent Hunyuan-GameCraft-1.0 | vídeo interativo | 704×1216, 25 fps | — | mínimo 24 GB VRAM, 80 GB recomendado; Linux | pesos abertos |
| Skywork Matrix-Game 3.0 | world model em streaming com memória longa | ver site do projeto | — | GPU de datacenter | MIT |
| Runway GWM Worlds 2 | preview de pesquisa | 720p/24 fps + áudio | — | nuvem Runway | formulário, sem API/preço (09/2026) [secundário] |
| World Labs Marble | **não** é frame a frame: gera ambientes 3D exportáveis (splats; .spz/.ply/.glb) | — | persistente | nuvem | World API por créditos (01/2026) [secundário] |

## Os quatro bloqueios para um jogo iOS

1. **Hardware**: todos rodam em H100-class ou ≥ 24 GB de VRAM. Nenhum roda em A19/M-series de iPhone; nem a versão "downscaled" do open-oasis (500M) é jogável no celular com 20+ fps [inferência da nota].
2. **Custo**: a US$ 0,02/s (Oasis 3), uma hora de jogador custa **US$ 72**; receita por hora de um F2P mobile está duas a três ordens de grandeza abaixo.
3. **Memória e lógica**: WHAMM esquece o que saiu de vista há 0,9 s, erra contadores de vida/dano e deixa inimigos "fuzzy"; a Microsoft diz "Think of this as playing the model as opposed to playing the game". Sem estado de jogo autoral, não há save, progressão, balanceamento ou anti-cheat.
4. **Produto**: Decart virou simulação de direção/robótica; World Labs exporta assets; Runway é preview; Project Genie é brinquedo de assinante. Ninguém vende um "motor neural" para shipping em 2026.

## O que usar no lugar

- **Assets gerados offline** (3D, texturas, sprites) consumidos por engine convencional: ver skills de arte e 3D.
- **Parâmetros gerados por LLM + geradores determinísticos** (esta skill): variedade infinita com custo de centavos e reprodutibilidade por seed.
- **Marble/World API** como fonte de ambientes 3D exportáveis, quando a licença permitir (não verificada), passando por `/otimizar-3d-para-mobile`.

## Roblox Cube e 4D generation

- Roblox roda text-to-3D **dentro do Roblox** (beta pública de 4D creation em 02/2026; `GenerateModelAsync`), com moderação própria. Não é API para apps iOS.
- O modelo aberto Cube 3D está sob "CUBE3D RESEARCH-ONLY RAIL-MS LICENSE": só "academic or research purposes"; sem concessão comercial; 24 GB de VRAM recomendados. Não use em jogo comercial.

## Fontes

- WHAMM: https://www.microsoft.com/en-us/research/articles/whamm-real-time-world-modelling-of-interactive-environments/
- Muse: https://www.microsoft.com/en-us/research/blog/introducing-muse-our-first-generative-ai-model-designed-for-gameplay-ideation/
- Oasis 3 (US$ 0,02/s): https://techcrunch.com/2026/06/10/decarts-new-world-model-can-simulate-hours-of-photorealistic-driving-with-some-caveats/
- open-oasis: https://github.com/etched-ai/open-oasis
- Hunyuan-GameCraft: https://github.com/Tencent-Hunyuan/Hunyuan-GameCraft-1.0
- Matrix-Game: https://github.com/SkyworkAI/Matrix-Game
- Project Genie [secundário]: https://9to5google.com/2026/01/29/google-project-genie/
- Runway GWM Worlds 2 [secundário]: https://atlasworldmodel.com/gwm-worlds-2
- World Labs [secundário]: https://techforum.ca/articles/ai-world-models-game-studios-marble
- Roblox Cube LICENSE: https://github.com/Roblox/cube/blob/main/LICENSE ; newsroom: https://about.roblox.com/newsroom/2026/02/accelerating-creation-powered-roblox-cube-foundation-model

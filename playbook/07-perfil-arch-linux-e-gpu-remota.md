# Perfil: desenvolvimento em Arch Linux com GPU remota (Windows + RTX) e Mac só na nuvem

Este é o perfil de máquina adotado neste repositório: **PC de desenvolvimento em Arch Linux**,
**estação Windows com RTX 5060 acessada por SSH via Tailscale** para geração local, e **macOS
remoto** (Xcode Cloud, runner do GitHub Actions ou Mac alugado) apenas para compilar, assinar e
enviar o build iOS. O objetivo é fazer o máximo no PC Linux e pagar o mínimo em API e em Mac.

## O que roda onde

| Camada | Arch Linux (PC) | Windows + RTX (via `scripts/gpu.sh`) | macOS remoto | Nuvem/API |
|---|---|---|---|---|
| Agente (Claude Code/Codex), hooks, skills, Git | **sim** | — | — | — |
| Código e verificação do jogo | **Godot 4.7** (nativo; screenshot com `xvfb-run`), **Phaser/PixiJS/Three.js** (Playwright), Unity Editor Linux (AUR) | — | Unity/Godot só para export iOS | — |
| Blender (limpeza, UV, bake, decimate) | sim (CPU) | sim (OptiX) via `ssh gpu uvx mcp-for-blender` ou `blender -b` | — | — |
| Música e SFX locais | — | **ACE-Step 1.5**, **Stable Audio 3**, DiffRhythm | — | ElevenLabs SFX v2, Lyria 3 |
| Voz | — | **Kokoro-82M**, Chatterbox, Qwen3-TTS (lotes) | — | Eleven v3, Fish S2 |
| Recorte de sprites, requantização pixel art | CPU (lento) | **BiRefNet/ToonOut** | — | — |
| Imagem HD / sprites | — | FLUX.2 [klein] 4B em ComfyUI (apertado em 8 GB) | — | **gpt-image-1.5**, Nano Banana Pro, Recraft V4 |
| LoRA de estilo/personagem | — | só com 16 GB [confirmar] | — | **fal** (treinador FLUX.2) |
| 3D | — | TripoSG (limite), rigging UniRig/Puppeteer [confirmar VRAM] | — | **Tripo/Meshy Pro** (licença comercial clara) |
| Build, assinatura, TestFlight iOS | não existe em Linux | — | **Xcode Cloud / GitHub Actions macOS** | — |
| Simulador iOS, MCP do Xcode, MobileBuildMCP | não existe em Linux | — | Mac na nuvem por hora, se precisar | — |
| Teste em iPhone real | via TestFlight | — | — | — |
| IA em runtime (Foundation Models) | código escrito no Linux, compilado no CI, testado no iPhone | — | compila | PCC/Claude |

Regra prática com 8 GB de VRAM: **áudio, voz, recorte e Blender na estação; imagem HD e 3D nas
APIs comerciais**. Tabela completa em `.claude/skills/estacao-gpu-remota/references/modelos-por-vram.md`.

## Setup em 6 passos

1. **Arch**: `sudo pacman -S git openssh rsync python uv nodejs npm godot blender xorg-server-xvfb jq`;
   Claude Code via npm; `tailscale` (pacote `tailscale`, `sudo tailscale up`); Unity Hub via AUR
   (`unityhub`) se for Unity; Playwright: `npx playwright install chromium webkit` (WebKit em Arch
   pode exigir bibliotecas manuais [confirmar]; use Chromium como fallback e o iPhone real para Safari).
2. **Estação Windows**: `/estacao-gpu-remota` → OpenSSH Server, chave, Tailscale, driver NVIDIA
   atual, Python + `uv`, WSL2 só para ferramentas Linux-only, ComfyUI escutando no IP Tailscale.
   Copie `assets/ssh_config.exemplo` para `~/.ssh/config` e `assets/gpu.env.exemplo` para
   `~/.config/mobileiosgame/gpu.env`.
3. **Teste**: `bash .claude/skills/estacao-gpu-remota/scripts/gpu.sh status` deve mostrar a GPU.
4. **Engine**: `/escolher-engine-e-alvo` com o critério "desenvolvimento em Linux" ativo favorece
   Godot (GDScript) ou web; Unity funciona mas pesa mais; nativo SwiftUI só compila no CI.
5. **Build iOS**: `/build-ios-sem-mac` → `.github/workflows/ios.yml` a partir do asset da skill;
   segredos da App Store Connect API no GitHub; `git tag v0.1.0` dispara o build; teste no iPhone
   pelo TestFlight.
6. **MCPs**: `.mcp.json` já vem só com os servidores que rodam em Linux (Blender, ElevenLabs).
   Os de macOS estão em `.mcp.macos.json` para copiar quando houver um Mac.

## Como as skills de geração usam a estação

Toda skill `gerar-*` que oferece rota local chama a estação assim:

```bash
G=.claude/skills/estacao-gpu-remota/scripts/gpu.sh
bash $G push assets/referencias/heroi.png 'C:\gpu-work\in\heroi.png'
bash $G run  'cd C:\gpu-work\birefnet && .venv\Scripts\python recortar.py in\heroi.png out\heroi.png'
bash $G pull 'C:\gpu-work\out\heroi.png' assets/_candidatos/heroi.png
```

Para ComfyUI: `scripts/comfyui_api.py --workflow <api.json> --server http://gamer-pc:8188 --out assets/_candidatos/`.
Nada do jogo roda na estação; ela só transforma prompt/imagem em PNG, WAV ou GLB.

## O que muda no roteiro (`01-roteiro-passo-a-passo.md`)

- **Fase 0**: inclui preparar a estação GPU e o CI macOS; `verificar-ambiente.sh` trata macOS como
  "remoto", não como falta.
- **Fase 3**: o loop local é Godot/Playwright; o build iOS é um job por milestone, não por feature.
- **Fase 6**: assets locais vão para a estação; LoRA e 3D ficam nas APIs salvo com 16 GB.
- **Fase 7**: Foundation Models é escrito no Linux e só compila no CI; mantenha diffs pequenos e
  teste no iPhone; alternativa que roda em qualquer lugar é a nuvem (`/ia-runtime-nuvem-claude`).
- **Fase 10**: `/build-ios-sem-mac` antes de `/submissao-app-store`.

## Limites honestos

- Sem Mac local não há simulador: bugs específicos de iOS aparecem só no iPhone via TestFlight.
  Mantenha um iPhone de teste e ciclos curtos de build.
- Rodar macOS em VM em PC viola o EULA da Apple; não é caminho para produto comercial.
- 8 GB de VRAM limitam imagem HD e 3D locais; a estação é um acelerador de pós-produção e áudio,
  não um substituto das APIs.
- Versões de driver, CUDA, flags de CLI e preços aqui vêm de conhecimento geral e do relatório;
  itens marcados [confirmar] precisam de verificação na fonte.

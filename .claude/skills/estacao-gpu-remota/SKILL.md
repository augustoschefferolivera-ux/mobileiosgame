---
name: estacao-gpu-remota
description: >
  Configura e usa uma máquina Windows com GPU NVIDIA (ex.: RTX 5060) como estação de geração
  remota acessada por SSH via Tailscale a partir de um PC Linux (Arch): OpenSSH Server no Windows,
  chaves, WSL2 com CUDA quando a ferramenta é só Linux, ComfyUI exposto na rede Tailscale, modelos
  abertos que cabem na VRAM (ACE-Step 1.5, Stable Audio 3, FLUX.2 [klein] 4B, BiRefNet, Kokoro,
  TripoSG) e o wrapper scripts/gpu.sh (status, run, push, pull, tunnel) que as outras skills
  chamam para rodar geração local sem ocupar o PC de desenvolvimento. Use sempre que o usuário
  disser "rodar na minha GPU", "tenho uma RTX", "ComfyUI remoto", "SSH para o Windows",
  "Tailscale", "não quero pagar API para gerar" ou quando uma skill de geração precisar de GPU
  e o PC local não tiver. Não use para build iOS (/build-ios-sem-mac) nem para escolher o modelo
  de imagem/áudio/3D (skills gerar-*).
license: MIT
compatibility: "PC de desenvolvimento Linux (Arch) com ssh/scp; máquina Windows 10/11 com GPU NVIDIA, OpenSSH Server e Tailscale; opcional WSL2"
metadata:
  grupo: processo
  alvo: [2d, 3d, app, web]
  fase: [0, 4, 6]
argument-hint: "[status | setup | run <comando> | push <local> <remoto> | pull <remoto> <local>]"
disable-model-invocation: false
user-invocable: true
---

# Estação GPU remota (Windows + RTX via SSH/Tailscale)

Entrega uma máquina Windows com GPU NVIDIA pronta para receber trabalho de geração vindo do PC
Linux, com `scripts/gpu.sh status` respondendo `nvidia-smi` em menos de 5 segundos e um primeiro
job (ex.: ACE-Step gerando 10 s de música) cujo arquivo volta para `assets/` do projeto.

## Quando usar / quando não usar

- **Use** na fase 0 (preparar a estação) e sempre que uma skill de geração (`/gerar-musica`,
  `/gerar-sfx` local, `/gerar-sprites-2d` com recorte BiRefNet, `/consistencia-com-lora`,
  `/gerar-ativos-3d` com modelos abertos, `/blender-automatizado` para bakes) precisar de GPU.
- **Use** para manter o PC de desenvolvimento livre: o agente, o código, o Godot/Phaser e a
  verificação ficam no Linux; a GPU só gera.
- **Não use** para nada de iOS nativo: Xcode, simulador e assinatura exigem macOS
  (`/build-ios-sem-mac`). Não use a GPU remota como "servidor" do jogo.

## Pré-requisitos

- Linux: `ssh`, `scp` (pacote `openssh`), `tailscale` conectado à mesma tailnet, opcionalmente
  `rsync` (só funciona se o destino for WSL2 ou tiver rsync).
- Windows: conta com administrador; Tailscale instalado e logado; GPU NVIDIA com driver atual
  (RTX 50 "Blackwell" exige driver 570+ e CUDA 12.8+ [confirmar]); 8 GB de VRAM na RTX 5060
  (16 GB só na 5060 Ti de 16 GB) [confirmar o seu modelo com `nvidia-smi`].
- Leia `references/setup-windows-rtx.md` para o passo a passo do Windows e
  `references/modelos-por-vram.md` para o que cabe na placa.

## Entradas

- Nome Tailscale da máquina Windows (MagicDNS, ex.: `gamer-pc`), usuário Windows, caminho de
  trabalho (ex.: `C:\gpu-work` ou, em WSL2, `/home/<user>/gpu-work`).
- Decisão nativo vs WSL2 por ferramenta (tabela em `references/setup-windows-rtx.md`).

## Passos

1. **Windows: OpenSSH Server + chave.** Siga `references/setup-windows-rtx.md` §1: ativar o
   recurso opcional "OpenSSH Server", iniciar `sshd` automático, colocar a chave pública do Linux
   em `C:\ProgramData\ssh\administrators_authorized_keys` (usuário administrador) e, opcional,
   definir PowerShell como shell padrão. Teste do Linux:

```bash
ssh <usuario>@<nome-tailscale> "nvidia-smi --query-gpu=name,memory.total,driver_version --format=csv"
```

2. **Linux: configuração do wrapper.** Copie `assets/ssh_config.exemplo` para `~/.ssh/config`
   (alias `gpu`) e `assets/gpu.env.exemplo` para `~/.config/mobileiosgame/gpu.env` (host, usuário,
   pasta de trabalho, modo `windows` ou `wsl`). Depois:

```bash
bash .claude/skills/estacao-gpu-remota/scripts/gpu.sh status      # nvidia-smi, espaço em disco, versão de Python/uv
bash .claude/skills/estacao-gpu-remota/scripts/gpu.sh run "python --version"
```

3. **Python e uv na estação.** No Windows nativo instale Python 3.11/3.12 e `uv`
   (instalador oficial da Astral). Para ferramentas só Linux (TripoSG, MV-Adapter, alguns repos
   de pesquisa) habilite WSL2 + Ubuntu e instale o CUDA Toolkit para WSL (o driver fica no
   Windows, nunca instale driver dentro do WSL). O `gpu.sh` em modo `wsl` prefixa os comandos com
   `wsl -e bash -lc`.

4. **PyTorch com CUDA para Blackwell.** Em cada ambiente (`uv venv`), instale a roda `cu128`
   (ou mais nova) do PyTorch; versões antigas não enxergam a RTX 50 [confirmar na página
   "Get Started" do PyTorch]. Smoke test: `python -c "import torch;print(torch.cuda.get_device_name(0))"`.

5. **ComfyUI na rede Tailscale** (imagens; template oficial "Sprite Sheet Generator"; FLUX.2
   [klein] 4B local): instale o ComfyUI na estação, rode com `--listen <IP-Tailscale> --port 8188`
   (nunca `0.0.0.0` se a máquina estiver em rede pública) e, do Linux, use
   `scripts/comfyui_api.py` para enviar um workflow exportado em formato API e baixar as saídas.
   Alternativa sem expor porta: `scripts/gpu.sh tunnel 8188` abre um túnel SSH e o ComfyUI fica em
   `http://localhost:8188` no Linux.

6. **Primeiro job real.** Música com ACE-Step 1.5 (MIT; <4 GB de VRAM): instale na estação
   conforme `/gerar-musica`, gere 10 s e traga de volta:

```bash
bash .claude/skills/estacao-gpu-remota/scripts/gpu.sh run "cd C:\\gpu-work\\ace && .venv\\Scripts\\python infer.py --bpm 110 --duration 10 --out saida.wav"   # [ajuste ao CLI real do ACE-Step]
bash .claude/skills/estacao-gpu-remota/scripts/gpu.sh pull "C:\\gpu-work\\ace\\saida.wav" assets/audio/_candidatos/teste.wav
```

7. **Registre em `production/ambiente.md`**: nome Tailscale, GPU e VRAM, driver, CUDA, Python,
   ferramentas instaladas por ambiente, portas expostas. Registre em `LICENCAS.md` os modelos
   baixados (id, versão, licença) antes de usar as saídas.

## Critério de pronto e evidência

- `scripts/gpu.sh status` devolve nome da GPU, VRAM e driver; `gpu.sh run "python -c 'import torch;print(torch.cuda.is_available())'"` imprime `True`.
- Um arquivo gerado na estação chegou a `./assets/audio/_candidatos/` ou `./assets/_candidatos/` via `gpu.sh pull`.
- `production/ambiente.md` atualizado; evidência (saídas dos comandos) em `production/evidencias/<data>-gpu-remota/`.

## Armadilhas conhecidas

- **VRAM de 8 GB** exclui TRELLIS.2 (≥24 GB), Hunyuan3D (~29 GB; e licença territorial), MV-Adapter
  (10–14 GB), WorldPlay/HY-World; cabe ACE-Step, Stable Audio 3 Small/Medium, DiffRhythm com
  `--chunked`, BiRefNet, Kokoro/Chatterbox, FLUX.2 [klein] 4B quantizado [confirmar]. LoRA de
  FLUX.2 em 8 GB é apertado: prefira a fal (ver `/consistencia-com-lora`).
- **Segurança**: a tailnet é privada, mas mantenha o `sshd` só com chave (`PasswordAuthentication no`),
  ComfyUI escutando só no IP Tailscale ou via túnel, e nunca exponha a porta 9876 do Blender MCP.
- **Caminhos Windows** em comandos SSH: use aspas duplas e barras invertidas duplicadas, ou
  prefira o modo `wsl` para caminhos POSIX.
- **Suspensão**: desative suspensão/hibernação na estação ou habilite Wake-on-LAN; Tailscale não
  acorda a máquina.
- **Licenças de pesos**: baixar um modelo não dá direito comercial sobre as saídas; confira a
  lista vermelha em `LICENCAS.md` antes de gerar.
- Preços, versões de driver/CUDA e requisitos exatos de VRAM não foram lidos em página oficial
  nesta pesquisa; estão marcados [confirmar].

## Fontes

- Relatório `reports/Criação de jogos totalmente por IA.md` (seções Arte 2D, Ativos 3D, Áudio: requisitos de VRAM e licenças).
- ACE-Step 1.5 (MIT; <4 GB VRAM): https://github.com/ace-step/ACE-Step-1.5
- Stable Audio 3 (CPU/CUDA; Community License): https://github.com/Stability-AI/stable-audio-3
- TRELLIS.2 (MIT; ≥24 GB VRAM): https://github.com/microsoft/TRELLIS.2
- TripoSG (MIT): https://github.com/VAST-AI-Research/TripoSG
- BiRefNet (MIT): https://github.com/ZhengPeng7/BiRefNet
- Template oficial ComfyUI "Sprite Sheet Generator": https://comfy.org/workflows/templates-sprite_sheet-fe5600667e2c/
- FLUX.2 [klein] 4B (Apache 2.0) [secundário]: https://vercel.com/ai-gateway/models/flux-2-klein-4b/faq
- Blender MCP (socket sem autenticação): https://github.com/ahujasid/blender-mcp
- Tailscale, OpenSSH no Windows, CUDA em WSL2: documentação oficial dos fabricantes (não lida nesta pesquisa; [confirmar]).

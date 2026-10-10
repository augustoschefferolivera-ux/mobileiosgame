# Setup da estação Windows com RTX (SSH + Tailscale + CUDA)

Tudo abaixo vem de documentação pública dos fabricantes conhecida até out/2026, não lida nesta
pesquisa; confira cada comando na fonte oficial se algo falhar.

## 1. OpenSSH Server no Windows

PowerShell como administrador:

```powershell
Add-WindowsCapability -Online -Name OpenSSH.Server~~~~0.0.1.0
Start-Service sshd
Set-Service -Name sshd -StartupType Automatic
# Regra de firewall "OpenSSH-Server-In-TCP" costuma ser criada automaticamente; confira:
Get-NetFirewallRule -Name *OpenSSH* | Select Name,Enabled
# (opcional) PowerShell como shell padrão do SSH
New-ItemProperty -Path "HKLM:\SOFTWARE\OpenSSH" -Name DefaultShell -Value "C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe" -PropertyType String -Force
```

Chave pública do Linux (`cat ~/.ssh/id_ed25519.pub`) em:
- usuário **administrador**: `C:\ProgramData\ssh\administrators_authorized_keys` (ACL só para
  `Administrators` e `SYSTEM`; o `sshd` ignora o arquivo se a ACL estiver aberta);
- usuário comum: `C:\Users\<user>\.ssh\authorized_keys`.

Desligue senha em `C:\ProgramData\ssh\sshd_config`: `PasswordAuthentication no`, depois
`Restart-Service sshd`. Como a tailnet é privada, limite ainda o firewall à interface Tailscale.

## 2. Tailscale

Instale o cliente Windows e faça login na mesma tailnet do Linux. Ative MagicDNS no painel para
usar o nome da máquina (`gamer-pc`) em vez do IP `100.x.y.z`. "Tailscale SSH" só existe para
destinos Linux/macOS; no Windows use o OpenSSH acima. Confirme do Linux: `tailscale status` e
`ssh <user>@gamer-pc hostname`.

## 3. Driver e CUDA

- Driver NVIDIA Game Ready/Studio atual (RTX 50 Blackwell: 570+ [confirmar]). `nvidia-smi` mostra
  nome, VRAM e versão.
- **Não** instale o CUDA Toolkit no Windows só para PyTorch: as rodas `cu128`/`cu129` já trazem o
  runtime. Instale o toolkit apenas se compilar extensões (nvdiffrast, kernels de repositórios de pesquisa).
- WSL2: `wsl --install -d Ubuntu`; dentro do Ubuntu instale o **CUDA Toolkit para WSL** da NVIDIA
  (pacote `cuda-toolkit`, sem driver). `nvidia-smi` dentro do WSL deve funcionar sem instalar nada
  de driver lá.

## 4. Nativo ou WSL2? (por ferramenta)

| Ferramenta | Onde rodar | Motivo |
|---|---|---|
| ComfyUI (+ FLUX.2 [klein] 4B, BiRefNet custom nodes) | Windows nativo | suporte de primeira classe; portátil `ComfyUI_windows_portable` |
| ACE-Step 1.5 | Windows nativo ou WSL2 | README cobre Windows; MLX só em Mac |
| Stable Audio 3 Small/Medium | Windows nativo (CPU/CUDA) | roda até em CPU |
| Kokoro-82M / Chatterbox (lotes de voz) | Windows nativo | pip simples |
| TripoSG, PartCrafter, MV-Adapter, Material Anything, UniRig/SkinTokens, Puppeteer | WSL2 | repositórios de pesquisa assumem Linux; alguns compilam CUDA |
| Treino de LoRA (ai-toolkit, kohya, diffusion-pipe) | WSL2 (se a VRAM permitir) ou fal na nuvem | 8 GB é apertado para FLUX.2; `/consistencia-com-lora` |
| Blender headless (`blender -b`) para bake/decimate | Windows nativo | OptiX/CUDA; Blender MCP via `ssh gpu uvx mcp-for-blender` |

## 5. Python, uv e PyTorch

```powershell
# Windows nativo
winget install Python.Python.3.12
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
cd C:\gpu-work\ace ; uv venv ; .venv\Scripts\activate
uv pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu128   # [confirmar índice atual]
python -c "import torch;print(torch.__version__, torch.cuda.get_device_name(0))"
```

Em WSL2 o mesmo com `curl -LsSf https://astral.sh/uv/install.sh | sh` e `source .venv/bin/activate`.

## 6. ComfyUI

1. Baixe o `ComfyUI_windows_portable` (release oficial) para `C:\gpu-work\ComfyUI`.
2. Inicie com escuta só na interface Tailscale:
   `.\python_embeded\python.exe -s ComfyUI\main.py --listen 100.x.y.z --port 8188`
   (descubra o IP em `tailscale ip -4`). Ou deixe em `127.0.0.1` e use `gpu.sh tunnel 8188`.
3. No Linux: `http://gamer-pc:8188` (ou `http://localhost:8188` com túnel). Carregue o template
   oficial "Sprite Sheet Generator" (usa Nano Banana Pro via API nodes do ComfyUI, com conta e
   créditos) ou um workflow local com FLUX.2 [klein] 4B (Apache 2.0) — pesos em
   `ComfyUI\models\diffusion_models`, text encoder e VAE conforme o README do modelo [confirmar].
4. Exporte o workflow em **formato API** (menu Dev mode → "Save (API Format)") e use
   `scripts/comfyui_api.py --workflow sheet_api.json --set "6.inputs.text=<prompt>" --out assets/_candidatos/`.
5. Mantenha a estação como *worker*: nada do jogo roda nela; só entra prompt/imagem e sai PNG/WAV/GLB.

## 7. Serviço sempre pronto

- Energia: desative suspensão (`powercfg /change standby-timeout-ac 0`) ou configure Wake-on-LAN.
- ComfyUI como tarefa agendada no logon (Task Scheduler) para subir sozinho.
- Espaço: modelos somam dezenas de GB; `gpu.sh status` mostra o disco.

## 8. Segurança mínima

- `sshd` só com chave; firewall limitado ao adaptador Tailscale.
- ComfyUI nunca em `0.0.0.0` se a máquina tiver IP público ou rede compartilhada.
- Blender MCP (porta 9876) e MCP first-party do Unreal não têm autenticação: só via SSH.
- Não guarde chaves de API no Windows em texto puro; use variáveis de ambiente do usuário.

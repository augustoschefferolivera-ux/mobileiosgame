# Riscos e licenças (resumo operacional)

Versão condensada do "Checklist de riscos" do relatório, com a skill que trata cada item.
Fontes e datas completas em `reports/Criação de jogos totalmente por IA.md`. Nada aqui é
parecer jurídico; para LGPD e direito autoral, valide com advogado.

## Lista verde (saída comercial global, sem atribuição ou com atribuição simples)

MIT/Apache: FLUX.2 [klein] 4B, FLUX.1 [schnell], Qwen-Image, BiRefNet/ToonOut, TRELLIS.2,
TripoSG, PartCrafter, UniRig, SkinTokens, Puppeteer, Audio2Face-3D (SDK), ACE-Step 1.5,
HeartMuLa, Kokoro-82M, Chatterbox, Qwen3-TTS, FluidAudio, swift-tts, Spark, MetalSplatter,
meshoptimizer, glTF-Transform, pyloudnorm, PyMusicLooper, c2pa-rs, MCP for Unity, Godot AI,
Blender MCP, MobileBuildMCP.
APIs comerciais por plano: gpt-image-1.5/GPT Image 2, Nano Banana Pro/2, Recraft V4,
Ideogram 3, Midjourney, Tripo Pro, Meshy Pro, ElevenLabs SFX/TTS, Fish Audio S2, Lyria 3,
World Labs Marble.

## Lista amarela (use só após confirmar por escrito)

PixelLab hosted e Retro Diffusion (termos comerciais), Eleven Music ("except … Studio Games"
em self-serve), Stable Audio 3 (limiar de receita da Community License), SPAR3D (<US$ 1M),
Unity AI (créditos; metadados "AI-generated"), Llama 4 ("Built with Llama"), Gemma (termos
próprios), YuE2 (empresas precisam de licença), Meshy free (CC BY 4.0), Lyria RealTime (v1alpha).

## Lista vermelha (não use em jogo comercial global)

Hunyuan3D 2.x / HunyuanWorld / HY-World 2.0 (licença exclui UE, UK e Coreia e proíbe saídas
fora do território); FLUX.1 [dev] e FLUX.2 [dev]/[klein] 9B servidos em produto; Roblox Cube
(research-only); MMAudio e ThinkSound (checkpoints não comerciais); spine-animation-ai
(PolyForm NC); LUFSNormalizer (PolyForm NC); AudioCraft/MusicGen (CC BY-NC); Suno e Udio em
assets lançados (litígio UMG/Sony, "model laundering", downloads restritos).

## Riscos e onde são tratados

| Risco | Mitigação | Skill |
|---|---|---|
| 4.3(b)/4.2 jogo genérico ou mínimo | mecânica e arte próprias; brief com diferencial em uma frase | `/brief-do-jogo`, `/submissao-app-store` |
| 2.1(a) placeholders e prompts no build | hooks `scan-placeholders`/`validate-commit`; `scan_placeholders.sh` | `/submissao-app-store` |
| 4.1(c)/5.2.1 marcas e personagens de terceiros | varredura em todo asset; prompts proíbem nomes/logos | `diretor-de-arte`, `/licencas-e-proveniencia` |
| 5.1.2(i) dados a IA de terceiros sem consentimento | Foundation Models primeiro; tela de consentimento antes da 1ª transmissão | `/ia-runtime-foundation-models`, `/ia-runtime-nuvem-claude` |
| 1.2/4.7.1 chatbot sem filtro/denúncia/bloqueio | moderação + denúncia + bloqueio + contato | `/npc-e-dialogo-dinamico`, `/submissao-app-store` |
| Classificação etária errada | questionário honesto; Brasil loot box = A18 | `/classificacao-etaria` |
| ECA Digital / LGPD | verificação de idade, sem dark patterns, labels coerentes | `/privacidade-lgpd-e-eca-digital` |
| Licença territorial / não comercial no pipeline | `LICENCAS.md` por versão; listas acima | `/licencas-e-proveniencia` |
| Saída pura de IA sem direito autoral | `PROVENANCE.md` com seleção/edição humana | `/licencas-e-proveniencia` |
| Divulgação vaga e backlash | texto específico; correção rápida | `/divulgacao-de-uso-de-ia` |
| Perder a propriedade do código | diff pequeno; arquitetura pequena; revisor | `/escopo-e-anti-padroes`, `revisor-de-codigo` |
| Construtor avaliando o próprio trabalho | crítico em contexto limpo com métrica | `/critico-independente` |
| Documentação no lugar de rodar o jogo | launch + screenshot como critério de pronto | `/montar-loop-de-verificacao`, hooks |
| Dependências frágeis (Mixamo, Sora 2, Veo 3, Udio) | alternativas abertas; masters arquivados; nunca depender de regenerar | regras `assets.md` |
| MCPs sem autenticação | loopback/VM | `04-ferramentas-e-mcps.md` |
| Custo de tokens/créditos | Haiku para QA; Batch; orçamento por sessão | `02-regras-e-habitos.md` |
| Expectativa de receita | primeiro título como validação; ads + IAP leve | `/monetizacao-iap-e-ads` |
| Revisão da App Store subestimada | tratar submissão como feature própria | `/submissao-app-store` |

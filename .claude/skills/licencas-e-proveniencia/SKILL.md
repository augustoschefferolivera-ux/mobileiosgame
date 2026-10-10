---
name: licencas-e-proveniencia
description: >
  Mantém o registro de licenças (LICENCAS.md) de cada ferramenta, modelo e versão usados
  no jogo, com classe (Apache/MIT, comercial por plano, não comercial, territorial) e lista
  vermelha (Hunyuan3D/HY-World fora de UE/UK/Coreia, FLUX.1 [dev] servido, Cube 3D,
  MMAudio, ThinkSound, spine-animation-ai, LUFSNormalizer, YuE2 para empresas, AudioCraft,
  Meshy free CC BY, Tripo free não comercial, Eleven Music "Studio Games", Suno/Udio em
  litígio), e o registro de proveniência por asset (PROVENANCE.md: modelo, versão, seed,
  prompt, referência, edição humana, data) como prova de intervenção humana, com C2PA via
  c2pa-rs e masters WAV/PNG arquivados. Use sempre que um asset for gerado, uma ferramenta
  for adicionada ao pipeline, antes de publicar em qualquer loja ou quando perguntarem
  "posso usar isso comercialmente?". Não use para redigir o texto de divulgação ao
  jogador (divulgacao-de-uso-de-ia).
license: MIT
compatibility: "Claude Code ou Codex; Python 3.9+ para scripts/check_provenance.py; c2patool opcional"
metadata:
  grupo: publicacao
  alvo: [2d, 3d, app, web]
  fase: [0, 6, 9]
argument-hint: "[auditar|registrar <asset>|adicionar-ferramenta <nome>]"
disable-model-invocation: false
user-invocable: true
---

# Licenças e proveniência

Entrega `LICENCAS.md` e `PROVENANCE.md` completos na raiz do projeto, `scripts/check_provenance.py` saindo com 0, nenhum item da lista vermelha no build e masters arquivados em `masters/`, com evidência em `production/evidencias/<data>-licencas/`.

## Quando usar / quando não usar

Use (a) na fase 0 ao escolher ferramentas (antes de gastar créditos em algo que não pode ser vendido); (b) na fase 6 a cada asset gerado (o registro é parte de "gerar"); (c) na fase 9 como auditoria antes da submissão. Toda skill de asset deste banco deve chamar esta para registrar.

Não use para: texto de divulgação de IA na loja (`/divulgacao-de-uso-de-ia`); privacidade de dados (`/privacidade-lgpd-e-eca-digital`). Nada aqui é aconselhamento jurídico: licenças e jurisprudência mudam; valide com advogado antes de lançar em UE/UK/Coreia ou com música gerada.

## Pré-requisitos

- `templates/LICENCAS.md` e `templates/PROVENANCE.md` copiados para a raiz do projeto.
- Python 3.9+ (`scripts/check_provenance.py --help`).
- Opcional: `c2patool` (CLI do `contentauth/c2pa-rs`, MIT/Apache-2.0) para assinar manifestos C2PA em PNG/JPEG/MP3/MP4 [instalação e formatos: confirmar no README do repositório].
- Git com as transcrições/sessões do agente versionadas (Xcode mantém transcrições por conversa; o GPTK persiste estado em `.porting/`).

## Entradas

- Lista de ferramentas/modelos do pipeline (das skills de arte, 3D, áudio, código).
- Para cada asset: arquivo final, master (PNG/PSD/WAV/GLB fonte), prompt, seed, referências, descrição da edição humana, data, licença da ferramenta.
- Países de lançamento (do brief): decide se a lista vermelha territorial bloqueia.

## Passos

1. **Classificar cada ferramenta/modelo** em `LICENCAS.md` com a versão exata e a URL da licença lida. Classes: `A` Apache/MIT/BSD (saída e modelo livres); `B` comercial por plano/API (saída liberada enquanto pagar; guarde recibo e termos da data); `C` não comercial ou pesquisa (não pode ir ao build); `D` territorial (proíbe uso da saída em certos países); `E` atribuição obrigatória; `F` litígio em curso. Tabela pronta em `references/tabela-de-licencas.md`.
2. **Aplicar a lista vermelha** (texto das licenças lido no GitHub quando indicado; detalhes na referência):
   - `D` **Hunyuan3D 2.x/Omni/Part, HunyuanWorld, HY-World 1.5/2.0** (Tencent Community License): "DOES NOT APPLY IN THE EUROPEAN UNION, UNITED KINGDOM AND SOUTH KOREA"; "You must not use... Output or results... outside the Territory". Jogo global na App Store: não use.
   - `C` **FLUX.1 [dev]** servido/produção (Non-Commercial License; saídas liberadas, modelo não); **FLUX.2 [dev]** e **[klein] 9B** idem [secundário]. Use FLUX.1 [schnell] ou FLUX.2 [klein] 4B (Apache 2.0) ou a API da BFL (direitos comerciais).
   - `C` **MMAudio** (checkpoints CC-BY-NC 4.0), **ThinkSound** (README: "Commercial use is NOT permitted"), **AudioCraft/MusicGen** (pesos CC-BY-NC 4.0), **spine-animation-ai** (PolyForm Noncommercial), **LUFSNormalizer** (PolyForm NC 1.0.0 → use pyloudnorm, MIT), **Tripo free tier** (não comercial), **Cube 3D** (Roblox; restritiva segundo o relatório [texto não citado nas notas; confirmar em github.com/Roblox/cube]).
   - `C`/`B` **YuE2**: pesos CC BY-NC 4.0 + "creator permission" (16/09/2026) para criadores individuais; **empresas precisam de licença comercial**.
   - `E` **Meshy free** (saídas CC BY 4.0: atribuição a Meshy); **Llama 4** ("Built with Llama" em destaque; licença acima de 700 M MAU).
   - `B` com cláusula: **Eleven Music** self-serve exclui "film, TV, radio, & Studio Games"; exija esclarecimento escrito ou Enterprise antes de usar em jogo.
   - `F` **Suno/Udio**: UMG e Sony processaram a Suno em 18/09/2026 (v6, "model laundering"); Sony processou a Udio em 20/07/2026; Udio sem downloads desde 29/10/2025. Não use em assets lançados; free tier da Suno é só pessoal.
   - Revenue cap: **Stable Audio 3 / SD 3.5 / SPAR3D** (Stability AI Community License: registro; >US$ 1 M/ano exige Enterprise).
3. **Registrar cada asset em `PROVENANCE.md`** (formato em `templates/PROVENANCE.md`): caminho do arquivo no projeto, tipo, ferramenta e versão, seed, arquivo de prompt, referências usadas, **edição humana** (o que você mudou, quando, quem), master, data, licença (`LICENCAS.md#id`), C2PA sim/não. A edição humana é o campo que importa juridicamente (passo 5).
4. **Arquivar masters**: `masters/<tipo>/<nome>.<png|psd|aseprite|wav|glb|blend>` sem compressão com perda. Nunca dependa de regenerar: Mixamo teve falhas de auth em 2025–26, Sora 2 foi encerrado, Veo 3 substituído, Udio perdeu downloads, Suno limita downloads por mês e deprecia modelos.
5. **Documentar a intervenção humana** (fatos em `references/autoria-e-c2pa.md`): nos EUA, o Copyright Office (Parte 2, 29/01/2025) diz que "prompts do not alone provide sufficient control" mas "assistive uses of AI... do not affect the availability of copyright protection"; a Suprema Corte negou certiorari em Thaler v. Perlmutter (02/03/2026), mantendo a exigência de autoria humana. No Brasil, a doutrina lê o art. 11 da Lei 9.610/98 (autor é pessoa física) como exigindo "intervenção criativa humana mínima", sem jurisprudência consolidada. Logo: seleção, arranjo, edição e composição são o que você pode proteger; registre-os.
6. **C2PA onde couber**: assinar PNG/JPEG/MP3 finais com `c2patool` (manifesto com `claim_generator`, ferramenta de IA usada e edição humana). Eleven Music já assina MP3 (`sign_with_c_2_pa`); Lyria carrega SynthID; Chatterbox embute Perth; Unity AI grava metadados "AI-generated". Não remova metadados existentes (o Código de Prática do EU AI Act proíbe remoção por usuários [secundário]).
7. **Auditar**:
   ```bash
   python3 .claude/skills/licencas-e-proveniencia/scripts/check_provenance.py \
     --provenance PROVENANCE.md --licenses LICENCAS.md --assets assets/ --masters masters/ \
     | tee production/evidencias/$(date +%Y-%m-%d)-licencas/check_provenance.log
   ```
   O script lista assets sem entrada, entradas sem master existente, campos obrigatórios ausentes e licenças de classe `C`/`D`/`F` referenciadas por assets do build; sai ≠ 0 se houver problema.
8. **Decidir e registrar**: para cada item vermelho, substituir (modelo Apache/MIT ou API comercial) ou remover do build; anotar a decisão em `LICENCAS.md` e em `feature_list.json` se afetar feature.

## Exportar para mobile

Masters ficam fora do bundle (`masters/` no `.gitignore` do build, não do repositório ou com Git LFS); o build recebe só os derivados (PNG/ASTC/KTX2, AAC/CAF). Metadados C2PA sobrevivem em PNG/JPEG/MP3, mas **não** em atlas texturais ou CAF: guarde o manifesto ao lado do master.

## Critério de pronto e evidência

Pronto quando `production/evidencias/<data>-licencas/check_provenance.log` terminar em "OK", `LICENCAS.md` tiver URL de licença e versão para cada ferramenta, `PROVENANCE.md` cobrir 100% dos assets em `assets/`, e `masters/` contiver um master por asset. Um README dizendo "tudo comercial" não é evidência; o log do script é.

## Armadilhas conhecidas

- **Territory da Tencent** vale para a saída, não só para o modelo: Brasil está dentro, UE/UK/Coreia fora — bloqueia App Store global.
- **FLUX.1 [dev]**: outputs comerciais, mas servir o modelo é "commercial or production purposes" proibido; LoRA treinado em [dev] via fal/Replicate: saídas usáveis segundo leitura de terceiros [secundário].
- **Meshy free = CC BY 4.0**: atribuição nos créditos ou pague o plano.
- **Eleven Music "Studio Games"**: termo não definido publicamente; não presuma que indie está fora.
- **Música gerada** é a categoria de maior risco em 2026 (Sony v. Suno/Udio; summary judgment de julho/2026 sem resultado localizado).
- **Unity AI** custa créditos e grava metadados "AI-generated"; o desenvolvedor segue responsável pelas declarações nas lojas [secundário].
- **Indenização de PI** de Unity AI, Adobe Firefly, OpenAI etc. para assets de jogos não foi verificada.
- **Jurisprudência brasileira**: nenhuma decisão consolidada; PL 2338/2023 parado na Câmara (votação adiada para depois das eleições de out/2026 [secundário]).

## Fontes

- Hunyuan3D-2 LICENSE: https://raw.githubusercontent.com/Tencent-Hunyuan/Hunyuan3D-2/main/LICENSE ; HY-World 2.0: https://raw.githubusercontent.com/Tencent-Hunyuan/HY-World-2.0/main/License.txt ; HunyuanWorld-1.0: https://raw.githubusercontent.com/Tencent-Hunyuan/HunyuanWorld-1.0/main/LICENSE
- FLUX.1 [dev]: https://github.com/black-forest-labs/flux/blob/main/model_licenses/LICENSE-FLUX1-dev ; [schnell]: https://github.com/black-forest-labs/flux/blob/main/model_licenses/LICENSE-FLUX1-schnell ; API BFL: https://help.bfl.ai/articles/3670520907-can-i-use-the-api-for-a-commercial-application [secundário]
- Qwen-Image: https://github.com/QwenLM/Qwen-Image/blob/main/LICENSE ; Llama 4: https://github.com/meta-llama/llama-models/blob/main/models/llama4/LICENSE
- MMAudio: https://github.com/hkchengrex/MMAudio ; ThinkSound: https://github.com/liuhuadai/ThinkSound ; AudioCraft: https://github.com/facebookresearch/audiocraft ; YuE2: https://github.com/multimodal-art-projection/YuE/blob/main/MODEL_LICENSE ; LUFSNormalizer: https://github.com/vitaleaudio/LUFSNormalizer ; spine-animation-ai: https://github.com/GenielabsOpenSource/spine-animation-ai
- Stability AI Community License (SPAR3D): https://raw.githubusercontent.com/Stability-AI/stable-point-aware-3d/main/LICENSE.md ; Stable Audio 3: https://github.com/Stability-AI/stable-audio-3
- Meshy pricing (CC BY 4.0 no free): https://docs.meshy.ai/en/webapp/pricing [secundário]; Tripo: https://costbench.com/software/ai-3d-generation/tripo-ai/ [secundário]
- Eleven Music termos e SDK: https://github.com/elevenlabs/elevenlabs-python/blob/main/src/elevenlabs/music/client.py
- Suno/UMG/Sony 18/09/2026: https://www.billboard.com/pro/umg-sony-hit-suno-with-lawsuit-after-new-ai-music-model/ [secundário]; tracker: https://www.chartlex.com/blog/business/music-industry-ai-lawsuits-tracker-2026 [secundário]
- c2pa-rs: https://github.com/contentauth/c2pa-rs
- Copyright Office Parte 2: https://www.reedsmith.com/articles/copyright-office-anticipated-part-two-report-ai-addressing-copyrightability/ [secundário]; Thaler cert negado: https://www.jdsupra.com/legalnews/supreme-court-denies-certiorari-in-3828648/ [secundário]
- Lei 9.610/98 art. 11 (doutrina): https://revistas.ufpr.br/rrddis/article/view/103445 [secundário]; PL 2338/2023: https://monitor.lcfconsulting.com.br/proposicoes/pl-2338-2023/ [secundário]
- EU AI Act Código de Prática: https://www.twobirds.com/en/insights/2026/taking-the-eu-ai-act-to-practice-the-final-transparency-code-of-practice [secundário]
- Unity AI metadados: https://unity.com/blog/unity-ai-how-to-get-started [secundário]

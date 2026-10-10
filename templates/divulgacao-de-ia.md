# Divulgação de uso de IA — [Nome do jogo] v[versão]

Preenchido a partir de `PROVENANCE.md` (resumo por categoria). Níveis: **gerado** (usado como saiu, com curadoria), **assistido** (gerado + edição humana substancial), **humano**. Mantenha o mesmo fato em todos os canais. Data: [AAAA-MM-DD].

## 1. Fatos (copiar do PROVENANCE.md)

| Categoria | Nível | Ferramentas | O que humanos fizeram |
|---|---|---|---|
| Gráficos (sprites, UI, ícone, arte de loja) | [gerado/assistido/humano] | [ex.: gpt-image-1.5, FLUX.2 [klein] 4B + LoRA] | [ex.: repintura, paleta, ícone e screenshots retocados à mão] |
| Modelos 3D / texturas | [...] | [ex.: Tripo Pro, Blender] | [ex.: retopologia, UVs, LODs] |
| Som (SFX, música, voz) | [...] | [ex.: ElevenLabs SFX v2, ACE-Step 1.5] | [ex.: seleção entre 16 candidatos, loop, mix a −18 LUFS; vozes centrais com atores] |
| Texto e diálogo | [...] | [ex.: Claude] | [ex.: reescrita e revisão de todo o texto] |
| Código | [...] | [ex.: Claude Code] | [ex.: revisão de diffs, testes escritos à mão] |
| IA em runtime | [sim/não] | [ex.: Apple Foundation Models on-device] | [ex.: filtro de conteúdo, denúncia, bloqueio] |

## 2. Versão curta (ficha da loja — pt-BR)

> **Sobre a produção.** [Nome do jogo] foi feito por [um desenvolvedor / uma equipe de N pessoas] com ajuda de IA generativa. [Sprites, cenários e ícones] foram gerados com [ferramentas] e depois [repintados, recortados e ajustados à mão]; [efeitos sonoros e música] foram gerados com [ferramentas] e [selecionados, editados e mixados por nós]; [os diálogos foram escritos por nós / revisados a partir de rascunhos gerados]; o código foi escrito com [Claude Code] e revisado linha a linha. [O jogo não gera conteúdo durante a partida / Durante a partida, o personagem X responde com IA que roda no próprio aparelho; nenhum dado é enviado a terceiros.] Lista completa de ferramentas e licenças nos créditos.

## 2. Short version (store listing — en)

> **About the production.** [Game name] was made by [a solo developer / a team of N] with the help of generative AI. [Sprites, backgrounds and icons] were generated with [tools] and then [repainted, cut out and adjusted by hand]; [sound effects and music] were generated with [tools] and [selected, edited and mixed by us]; [dialogue was written by us / revised from generated drafts]; the code was written with [Claude Code] and reviewed line by line. [The game does not generate content during play / During play, character X answers with on-device AI; no data is sent to third parties.] Full list of tools and licenses in the credits.

## 3. Versão longa (créditos e site — pt-BR)

**Ferramentas de IA usadas**
- Arte 2D: [ferramenta, versão] — [o que gerou]; edição humana: [o quê, por quem].
- 3D: [...]
- Áudio: [...]
- Texto: [...]
- Código: [...]
- IA em runtime: [provedor; on-device/PCC/nuvem; dados enviados; como denunciar conteúdo].

**O que foi feito por pessoas**: [direção de arte, art bible, seleção de candidatos, repintura, mixagem, roteiro, design de níveis, revisão de código, testes, QA].
**Atribuições obrigatórias**: [ex.: "Built with Llama"; "Modelos 3D de teste: Meshy (CC BY 4.0)"].
**Licenças**: ver `LICENCAS.md` / página de licenças do site.

## 3. Long version (credits and website — en)

**AI tools used**: [same structure]. **Made by people**: [...]. **Required attributions**: [...]. **Licenses**: see the licenses page.

## 4. itch.io

- Generative AI Disclosure: **Yes** → subtags: [ ] Graphics [ ] Sound [ ] Text & Dialog [ ] Code (marcar conforme a tabela 1; marcar mesmo quando "assistido").
- Texto na descrição: versão curta (pt-BR e en).

## 5. Steam (content survey)

> [Game name] uses generative AI in the following shipped content: **Graphics**: [what, tool, human edit]. **Audio**: [what, tool, human edit]. **Text**: [what]. Code was written with AI assistance and reviewed by humans. **Live-generated content**: [None / character X dialogue is generated at runtime by [provider, on-device]; content is filtered and players can report it].

## 6. Aviso no jogo (IA em runtime)

- Primeira interação: "Este personagem responde com inteligência artificial. [Tudo roda no seu aparelho. / Suas mensagens são enviadas a [provedor] para gerar a resposta; veja a política de privacidade.] Toque para continuar."
- Menu de pausa: "Sobre a IA neste jogo" → versão longa + botão "Denunciar conteúdo" + "Bloquear".
- en: "This character answers using artificial intelligence. [Everything runs on your device. / Your messages are sent to [provider] to generate replies; see the privacy policy.] Tap to continue."

## 7. Onde está publicado

| Canal | Local | Data | Evidência |
|---|---|---|---|
| App Store | descrição ("Sobre a produção"); créditos no app; Notas para o App Review | | `ficha-app-store.png`, `creditos-iphone.png` |
| itch.io | tags + descrição | | `itch-tags.png` |
| Steam | content survey | | `steam-survey.png` |
| Site | página /creditos ou /ia | | URL |
| Política de privacidade | seção "IA e dados" (se runtime) | | URL |

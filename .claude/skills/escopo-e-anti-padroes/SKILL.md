---
name: escopo-e-anti-padroes
description: >
  Verifica o escopo do jogo contra o brief e contra a lista de coisas que agentes de IA tratam mal (multiplayer
  em tempo real, 3D pesado/física complexa, Unreal e formatos binários, arte só por prompt, voz central por TTS,
  chat com LLM visível, loot boxes, world models), quantifica o inchaço (features adicionadas vs. MVP), aponta
  sinais de "perder a propriedade mental do código" e aplica a regra da arquitetura pequena; devolve veredito
  PASS/CONCERNS/FAIL/NOT ASSESSED com cortes para MVP. Use sempre que o usuário disser "está grande demais",
  "cortar escopo", "MVP", "não entendo mais o código", "o agente quebrou tudo", "vale adicionar multiplayer/3D/
  chat", ou a cada marco e antes de submeter. Não use para escrever o brief inicial (/brief-do-jogo) nem para
  implementar cortes (/ciclo-de-feature com status cut).
license: MIT
compatibility: "Claude Code ou Codex"
metadata:
  grupo: processo
  alvo: [2d, 3d, app, web]
  fase: [1, 5, 8]
argument-hint: "[marco | F-xxx | 'proposta de feature']"
disable-model-invocation: false
user-invocable: true
---

# Escopo e anti-padrões

Entrega `production/escopo/<data>-escopo.md` com baseline (MVP do brief) × estado atual (`feature_list.json` + git), lista de anti-padrões encontrados, veredito e cortes propostos — sem alterar nada até o humano aprovar.

## Quando usar / quando não usar

- **Use** antes de aceitar uma feature nova fora do MVP, a cada marco (vertical slice, TestFlight), quando o verify passa mas o humano não sabe explicar um módulo, e sempre que alguém propuser multiplayer, 3D, chat com IA ou monetização nova.
- **Não use** como substituto do brief (se não há `design/game-brief.md`, o veredito é NOT ASSESSED e a ação é `/brief-do-jogo`), nem para executar cortes (isso é marcar `cut` em `/ciclo-de-feature` com aprovação).
- Esta skill é **somente leitura**: relata e recomenda; não edita `feature_list.json`, código ou brief.

## Pré-requisitos

- `design/game-brief.md` (MVP e "fora de escopo"), `feature_list.json`, histórico git.
- Opcional: `production/criticas/notas.csv` (tendência das notas) e tamanho do código por módulo.

## Entradas

- Baseline: itens do MVP e a lista "fora de escopo" do brief; `docs/decisoes/*.md`.
- Atual: features por status; features sem rastro no MVP; commits desde o último marco; contagem de TODO/FIXME; linhas por módulo.
- A proposta em avaliação (se houver): "adicionar X".

## Passos

1. **Baseline.** Extraia do brief os itens do MVP (`- [ ] F-`) e a lista fora de escopo. Se o brief existe mas não enumera itens, pare: veredito **NOT ASSESSED — baseline vazio** (um 0% calculado sobre zero itens leria como PASS; nada foi comparado).

2. **Estado atual.** Liste features e status, e o que mudou:

```bash
python3 -I -c "import json;d=json.load(open('feature_list.json'));print(*[(f['id'],f['status'],f['titulo']) for f in d['features']],sep='\n')"
git log --oneline --since="$(git log -1 --format=%cI -- design/game-brief.md 2>/dev/null || echo 30.days.ago)" | wc -l
grep -rIn --include='*.swift' --include='*.gd' --include='*.cs' --include='*.ts' -E "TODO|FIXME" . 2>/dev/null | grep -v node_modules | wc -l
```

   Conte linhas por módulo/pasta (`wc -l` nos arquivos de código) para a regra da arquitetura pequena.

3. **Compare e quantifique** (adaptado do `/scope-check` do Game Studios, MIT): adições (features sem item no MVP), remoções (itens do MVP cortados), inchaço = (adições − remoções) / itens originais. Verdito pela tabela: ≤ 10% **PASS**; 10–25% **CONCERNS**; 25–50% **FAIL — cortar ou reescrever o brief**; > 50% **FAIL — parar e replanejar**. Se o estado atual não puder ser lido (sem commits, sem features), **NOT ASSESSED** — nunca um número.

4. **Lista vermelha: o que a IA trata mal** (marque cada ocorrência no projeto ou na proposta):

| Anti-padrão | Evidência | O que fazer |
|---|---|---|
| Multiplayer em tempo real | Unity + Photon Fusion: "useless results" e gasto excessivo de tokens; o único sucesso (fly.pieter.com) foi de um dev experiente, em web | cortar; se inevitável, só com testes diferenciais e humano no loop de rede |
| 3D pesado, física complexa, mundos abertos | relatos convergem em 2D/lógico como ponto forte; geradores 3D emitem 100 mil–1 milhão de triângulos sem topologia limpa; orçamento Apple ≤ 100 mil polígonos por cena AR | 3D leve (RealityKit/Unity com props ≤ 5–10 mil tris), ou 2D |
| Unreal / formatos binários (.uasset, cenas e prefabs binários em escala) | "the worst fit because binary .uasset files are opaque to the agent" | engine texto-first; `Force Text` na Unity; cenas pequenas |
| Arte só por prompt | consistência por prompt é "unreliable at scale"; LoRA/folhas de referência/seeds fixos são o remédio | `/direcao-de-arte-e-style-card` + `/consistencia-com-lora` antes de gerar em massa |
| Voz TTS em linhas centrais | ARC Raiders regravou com atores após críticas de voz "flat" | TTS só periférico; atores no que importa |
| Chat/LLM visível ao jogador | 1.2/4.7.1 (moderação), 5.1.2(i) (consentimento), classificação etária; "Name a game that you play because of its 'AI NPCs'. You can't" | só com motivo forte; preferir Foundation Models on-device e saída estruturada |
| Loot boxes / gacha / apostas | A18 no Brasil; apostas de quota fixa exigem licença SPA | cortar ou aceitar A18 conscientemente |
| World models / "motor neural" no cliente | Genie 3: "not at all in a stage where we can just make a game"; Oasis 3 ~US$ 72/hora de jogador | nunca no MVP |
| Dependência de regeneração para rebuild | Mixamo em maintenance mode; Sora 2 encerrado; Udio sem downloads | guardar masters, seeds e prompts; `PROVENANCE.md` |
| Documentação no lugar de rodar o jogo | modo `standard` (30 docs) ficou em último no teste cego | rigor `minimal`; verify como critério de pronto |

5. **Sinais de perda de propriedade mental** (qualquer "sim" é CONCERNS; dois ou mais, FAIL):
   - O humano não consegue explicar um módulo em dois minutos sem abrir o arquivo.
   - Correções são feitas re-promptando ("tenta de novo") em vez de ler o diff — "you have to know what the issue is in order for claude to fix it".
   - Diffs > 300 linhas commitados sem leitura; dois sistemas fazendo a mesma coisa; `TODO`/`FIXME` crescendo entre marcos.
   - O verify passa, mas ninguém abriu o screenshot nesta semana.
   - Caso de referência: um RTS com todo o código escrito pelo Claude foi abandonado porque o dev "perdeu contato com a base e não conseguia mais corrigi-la".

6. **Regra da arquitetura pequena** [heurísticas deste banco, ajuste no ADR]: ≤ ~10 módulos de gameplay, cada um ≤ ~500 linhas e com um responsável nomeado em `docs/arquitetura.md` (uma página); lógica em tipos puros testáveis, cena só desenha; valores de balanceamento em dados; uma dependência externa nova = uma linha de ADR; nenhum framework "de agente" dentro do jogo. Meça com `wc -l` e liste os módulos que estouram.

7. **Relatório e cortes.** Escreva `production/escopo/<data>-escopo.md` com: baseline, atual, tabela de adições/remoções, % de inchaço, anti-padrões encontrados, sinais de propriedade, módulos acima do limite, **veredito** e três listas: **Cortar** (vira `cut`), **Adiar** (versão 2, fora do MVP), **Manter** (com justificativa). Apresente ao humano; só ele decide. Depois, as mudanças aprovadas são aplicadas por `/ciclo-de-feature` (status `cut`) ou por reescrita do brief (`/brief-do-jogo`).

## Critério de pronto e evidência

- `production/escopo/<data>-escopo.md` existe com veredito explícito (PASS / CONCERNS / FAIL / NOT ASSESSED) e, salvo NOT ASSESSED, com números (itens originais, adições, remoções, %).
- Toda ocorrência da lista vermelha aponta para feature, arquivo ou proposta concreta.
- Nenhum arquivo do jogo foi alterado por esta skill; as decisões aprovadas estão em `progress.md` (Decisões) com data.

## Armadilhas conhecidas

- **PASS por acidente**: baseline vazio ou estado ilegível produzem 0% — por isso NOT ASSESSED outranks PASS (regra herdada do Game Studios).
- **"Adição descoberta" ≠ inchaço**: algumas adições são requisitos reais; devem ser reconhecidas e trocadas por um corte, não acumuladas.
- **Cortar o núcleo da diversão**: priorize preservar o loop central e o pilar número 1; corte menus, meta-progressão, save na nuvem, modos extras.
- **Genericidade** também é risco de escopo: 4.3(b) pune apps "indistinguishable from what's already widely available"; o corte não pode remover o que diferencia o jogo.
- **Receita como justificativa**: fly.pieter.com (US$ 1 M ARR autodeclarado → US$ 144 K ARR) e Spell Cascade (US$ 4,99/30 dias) mostram que mais features não compram receita; validação primeiro.
- **Custo de tokens**: relatos de "long autonomous runs can hit plan ceilings… shipped hobby games rarely recoup token costs"; escopo pequeno é também orçamento.

## Fontes

- Medium (chierhu) — 2D/lógico rende mais; Unreal "worst fit"; RTS abandonado; custos de token: https://chierhu.medium.com/claude-code-for-game-development-7a88fcd19992
- Reddit (snapshot abr/2026) — Photon Fusion "useless results"; "you have to know what the issue is": https://reddit.sentinel-team.org/posts/1sggzzw/snapshots/2026-04-09T16%3A41%3A00.47446Z
- Layer.ai — consistência por prompt "unreliable at scale": https://layer.ai/blog/ip-consistency-ai-generation-guide-game-studios
- PCGamesN — ARC Raiders regravou vozes: https://www.pcgamesn.com/arc-raiders/ai-voices-replaced · Frisson Labs — AI NPCs: https://www.frisson-labs.com/ai-npcs-2026
- Apple — App Store Review Guidelines (1.2, 4.3(b), 4.7.1, 5.1.2(i)): https://developer.apple.com/app-store/review/guidelines/ · Age ratings (loot boxes A18 no Brasil): https://developer.apple.com/help/app-store-connect/reference/age-ratings-values-and-definitions
- TweakTown — Genie 3 "not at all in a stage…": https://www.tweaktown.com/news/110471/genie-3s-ai-generated-worlds-fall-apart-after-a-few-minutes-google-admits/index.html · TechCrunch — Oasis 3 custo: https://techcrunch.com/2026/06/10/decarts-new-world-model-can-simulate-hours-of-photorealistic-driving-with-some-caveats/
- Apple Developer Forums — orçamento 100K polígonos / 2048²: https://developer.apple.com/forums/thread/693867
- Donchitos/Claude-Code-Game-Studios — `/scope-check` (verdito e NOT ASSESSED), medição de rigor (MIT): https://github.com/Donchitos/Claude-Code-Game-Studios
- Indie Hackers — fly.pieter.com: https://www.indiehackers.com/post/2NUIOp80SUWuPmmfKoS9 · 404 Media — "yours probably won't": https://404media.co/this-game-created-by-ai-vibe-coding-makes-50-000-a-month-yours-probably-wont
- Relatório interno `reports/Criação de jogos totalmente por IA.md` ("O teto hoje…", "Checklist de riscos") e `research_notes/.../estudos_de_caso_e_boas_praticas.md` (Perguntas 3 e 6).

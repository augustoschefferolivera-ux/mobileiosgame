# Prompts de sessão (copie e cole)

O `CLAUDE.md` e o hook de início já entregam ao agente as 10 regras, a stack e o estado do projeto.
O primeiro prompt de cada sessão precisa cobrir só o que o automático não cobre: **(1) ponto de
entrada, (2) uma única tarefa, (3) o que só você sabe, (4) onde parar e perguntar, (5) encerramento.**
Quanto mais curto, melhor: o que não está aqui está nas skills.

## A. Primeira sessão do jogo (ainda não existe `design/game-brief.md`)

```text
Leia CLAUDE.md e playbook/00-leia-primeiro.md. Rode /checkpoint-e-retomada e depois /brief-do-jogo.

Ideia: <o jogo em uma frase>.
Referência: <jogo existente que mais se parece> e o que quero diferente: <uma frase>.
Público e dispositivo mínimo: <ex.: adultos casuais, iPhone 12>. Orientação: retrato. Sessão: <3–5 min>.
Monetização no primeiro título: <nenhuma | anúncios recompensados | IAP leve>. Classificação etária: <livre | 12+>.
Fora de escopo: <ex.: multiplayer, chat com IA, loot box>.

Quando o brief estiver pronto, PARE e me mostre para aprovar. Só depois derive o MVP em
feature_list.json (≤ 7 features com critério verificável) e rode /direcao-de-arte-e-style-card,
parando de novo para eu aprovar o style card antes de gerar qualquer imagem.
Ao final: /checkpoint-e-retomada e commit.
```

## B. Sessão de feature (o caso comum)

```text
/checkpoint-e-retomada
Depois /ciclo-de-feature na próxima feature de feature_list.json (ou: na F-00N).
Antes de escrever código Phaser, leia a skill oficial do assunto em node_modules/phaser/skills/.
Só feche com scripts/verify.sh verde, evidência em production/evidencias/ e /critico-independente ≥ 7.
Se precisar de decisão de design que não está no brief, pare e pergunte em vez de assumir.
Ao final: commit e /checkpoint-e-retomada.
```

## C. Sessão de assets (arte 2D, 3D pré-renderizado ou áudio)

```text
/checkpoint-e-retomada
Leia playbook/09-praticas-de-arte-2d-com-ia.md (ou 10 para 3D, ou a skill de áudio).
Se design/art-bible.md (ou sound-bible.md) não estiver aprovado, rode a skill de direção e PARE para eu aprovar.
Senão, gere <lista de assets, ex.: herói idle+walk, 3 inimigos, 8 ícones de UI> com a skill certa
(/gerar-sprites-2d, /animar-sprites, /sprites-pre-renderizados-de-3d, /ui-hud-e-icones, /gerar-sfx),
4 candidatos por asset, aprovação pelo subagente diretor-de-arte (ou diretor-de-audio),
exportação com /atlas-e-exportacao-2d-mobile (ou /pos-producao-audio-mobile) e linha no PROVENANCE.md.
Licenças: só a lista verde de LICENCAS.md; dúvida de licença ou de estilo = pare e pergunte.
Me mostre a folha de contato antes de integrar. Ao final: commit e /checkpoint-e-retomada.
```

## D. Sessão de polimento ou release

```text
/checkpoint-e-retomada
Rode /playtest-automatizado com o roteiro completo e o subagente engenheiro-de-performance; registre em production/.
Corrija só o que o crítico e o playtest apontarem, uma correção por commit, com evidência.
Antes de publicar: /licencas-e-proveniencia → /divulgacao-de-uso-de-ia → /classificacao-etaria → /publicar-jogo-web.
Qualquer item em FALHA no revisor-de-loja-e-legal: pare e me pergunte.
```

## O que nunca colocar no primeiro prompt

- "Faz rápido", "pula os testes", "não precisa de evidência": o agente vai obedecer, e o hook vai
  bloquear o encerramento; você perde a sessão.
- Mais de uma feature. Duas features na mesma sessão é a causa número um de contexto perdido.
- GDD longo colado. O brief de uma página é o formato; o resto vira features em JSON.
- Pedidos de asset sem art bible aprovado. Sai arte com "cara de IA" e inconsistente.
- Nomes de ferramentas da lista vermelha (Hunyuan3D, Suno, Udio, rembg padrão).

## Por que cada parte importa

| Parte | O que ativa |
|---|---|
| `/checkpoint-e-retomada` no início | Lê `progress.md`, `feature_list.json`, git e roda o verify antes de mudar qualquer coisa |
| Uma tarefa com ID | O ciclo de uma feature por sessão; o Stop hook sabe o que cobrar |
| "leia a skill oficial em `node_modules/phaser/skills/`" | Documentação exata da versão instalada em vez de memória do modelo |
| "só feche com verify + evidência + crítico" | Os três níveis que a pesquisa mostrou funcionar: pedir, impor por hook, julgar por subagente |
| "pare e pergunte" | Decisões de design, estilo e licença são suas; sem isso o agente assume |
| "me mostre antes de integrar" | Curadoria humana, que é o que gera direito autoral e evita arte genérica |
| `/checkpoint-e-retomada` no fim | Memória para a próxima sessão; sem isso a sessão seguinte começa cega |

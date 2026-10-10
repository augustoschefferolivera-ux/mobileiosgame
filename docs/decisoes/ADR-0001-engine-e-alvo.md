# ADR-0001: Engine e alvo: web em código puro (Phaser 4 + TypeScript + Vite), PWA primeiro

## Status

Aceito (decisão do usuário em 2026-10-10: "o melhor jogo possível com o mínimo de atrito para o
agente"). **Premissa a confirmar no brief:** jogo 2D. Se o brief exigir 3D, este ADR é substituído
por ADR-0002 com Three.js + TypeScript (mesmo alvo, mesma verificação).

## Data e última verificação

- **Escrito em:** 2026-10-10
- **Verificado pela última vez contra a versão atual da engine:** 2026-10-10 (`npm view phaser version` → 4.2.1)

## Resumo (2 frases)

O desenvolvimento acontece em Arch Linux sem Mac local, com um agente fazendo 100% do código, e o
objetivo é o maior teto de qualidade com o menor atrito para o agente. A pilha escolhida é a única
em que o agente fecha o ciclo construir → rodar → ver → ler log inteiramente no PC Linux, em texto
puro, na linguagem com mais material de treino, e é onde estão os únicos casos públicos de jogos
quase 100% IA com resultado mensurável (Three.js).

## Contexto

- **Problema:** escolher a engine antes do brief detalhado, porque o loop de verificação (fase 3)
  depende dela e precisa existir antes da primeira feature.
- **Restrições:** desenvolvedor solo em Arch Linux; GPU remota (Windows + RTX 5060) para geração;
  macOS só remoto (Xcode Cloud / GitHub Actions) — ver `playbook/07-perfil-arch-linux-e-gpu-remota.md`;
  orçamento zero em licenças de engine; iOS como alvo desejado, App Store opcional.
- **Requisitos que pesam:** agente autônomo com evidência (screenshot + log) a cada feature;
  nenhum passo de export para iterar; 60 fps em iPhone de 4 anos; PWA instalável; Capacitor como
  caminho para a App Store se e quando valer (riscos 4.2/4.7 registrados).

## Decisão

Jogo web 2D em **Phaser 4.2.1 + TypeScript + Vite 8**, código na raiz do repositório (`src/`,
`public/`, `index.html`), resolução lógica 390×844 em retrato com `Phaser.Scale.FIT`, DPR limitado
a 2, canal de depuração em `window.__GAME_DEBUG__`, verificação por Playwright (WebKit no Arch,
Chromium como fallback) via `scripts/verify.sh` → `.claude/skills/engine-web-phaser/scripts/verify.sh`.
Distribuição: PWA (hospedagem estática) primeiro; App Store via Capacitor só após o jogo ter
funcionalidade e integração nativa que passem em 4.2/4.7 (`/empacotar-web-para-app`).

### Compatibilidade com a engine e com o agente

| Campo | Valor |
|---|---|
| Engine / framework e versão FIXADA | Phaser 4.2.1 · Vite 8.3.4 · TypeScript 5.x (última 5) · Playwright 1.56.1 (casa com os navegadores pré-instalados no ambiente de CI) · Node 22 |
| Alvo(s) | web (PWA) primeiro; iOS via Capacitor opcional; Android idem |
| O agente fecha sozinho construir → rodar → ver → ler log? | sim — `npm run build` (tsc + vite) → `vite preview` → Playwright emulando iPhone (screenshot, console, `__GAME_DEBUG__`) → `production/evidencias/<data>-<id>/` |
| Formato de cena/dados é texto? | sim — tudo TypeScript/JSON; atlases JSON |
| Export iOS | PWA sem export; Capacitor gera projeto Xcode compilado no CI macOS (`/build-ios-sem-mac`) |
| IAP / anúncios | web: Stripe/ads web; app: RevenueCat/StoreKit via plug-in Capacitor [confirmar] |
| Licença da engine/tooling | Phaser MIT · Vite MIT · TypeScript Apache 2.0 · Playwright Apache 2.0 |
| Risco de conhecimento do modelo | MÉDIO: Phaser 4 é recente; a API de cenas é compatível com a v3 (muito material), mas renderer e detalhes mudaram — fornecer ao agente a documentação da 4.2 e validar por build/execução |
| APIs pós-corte usadas | Phaser 4.x (renderer novo); Vite 8 |
| O que verificar na engine real antes de confiar | áudio só após gesto no Safari; `100dvh` e barras do Safari; memória com DPR 2; `Phaser.Scale.FIT` em retrato; texturas ≤ 2048² |

## Alternativas consideradas

| Alternativa | Por que não | Quando reconsiderar |
|---|---|---|
| Godot 4.7 + GDScript | Excelente fit para agente e app nativo, mas export iOS exige macOS e o export é um passo a mais a cada milestone; GDScript tem menos material que TypeScript | Se a App Store com IAP/Game Center nativos virar requisito central, ou se a web não entregar o desempenho |
| Unity 6.3 LTS + plug-in oficial | Melhor ferramental oficial de IA, mas ciclo mais pesado, Editor como dependência, build iOS só no CI macOS, custo de assento/créditos; relatos de atrito com agentes | Se IAP + LevelPlay + 3D pesado forem o núcleo do produto |
| Three.js + TypeScript | Mesma pilha web, para 3D; casos públicos mais fortes (fly.pieter.com, FPS de Shumer) | Se o brief exigir 3D → ADR-0002 |
| Engine própria (raylib/SDL/Bevy) | Reinventa renderer, áudio, input, export e IAP; multiplica o risco de perder a propriedade mental do código | Nunca para este produto |

## Consequências

- **Positivas:** zero custo de engine; ciclo 100% local no Arch; linguagem com mais dados de treino; link compartilhável para playtest humano; Playwright como olho do agente.
- **Negativas / custos aceitos:** teto de desempenho abaixo do nativo; peculiaridades do Safari iOS (áudio, memória, barras); App Store só via web view com risco de revisão; sem Foundation Models on-device (IA em runtime via nuvem, `/ia-runtime-nuvem-claude`).
- **Riscos e mitigação:** Phaser 4 recente → fixar versão, docs da versão para o agente, build+execução como verdade; WebKit do Playwright ≠ Safari real → playtest humano no iPhone a cada milestone; dimensão 2D é premissa → confirmar no brief.

## Critérios de validação

- [ ] `scripts/verify.sh --feature F-000` gera `screenshot.png`, `console.log` e `state.json` em < 3 min, exit 0
- [ ] `state.json` traz `scene` esperado e `fps ≥ 50` no WebKit/Chromium emulando iPhone
- [ ] Build vazio abre no Safari de um iPhone real (`npx vite preview --host`) e instala como PWA
- [ ] Nenhum `pageerror` no console

## Relacionado

- Brief: `design/game-brief.md` (pendente: `/brief-do-jogo`)
- Features afetadas: `feature_list.json` → F-000
- Outros ADRs: ADR-0002 (Three.js) só se o brief pedir 3D
- Perfil de máquina: `playbook/07-perfil-arch-linux-e-gpu-remota.md`

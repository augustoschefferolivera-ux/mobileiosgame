<!--
Template: adr.md — Registro de Decisão de Arquitetura (ADR).
Adaptado de Claude-Code-Game-Studios (Donchitos, MIT), .claude/docs/templates/architecture-decision-record.md
https://github.com/Donchitos/Claude-Code-Game-Studios — encurtado para o modo `minimal` e com os campos
de engine/alvo que /escolher-engine-e-alvo preenche.

Salvar em: docs/decisoes/ADR-NNNN-<slug>.md (ADR-0001 é sempre engine e alvo).
Um ADR cabe em uma a duas telas. Se precisa de mais, provavelmente são duas decisões.
-->
# ADR-NNNN: [Título — ex.: Engine e alvo: SwiftUI + SpriteKit para iOS nativo]

## Status

[Proposto | Aceito | Deprecado | Substituído por ADR-XXXX]

> Quem move para **Aceito**: o humano responsável pelo projeto, explicitamente. Nenhuma skill ou
> subagente aceita um ADR sozinho. Uma feature que depende de ADR `Proposto` fica `bloqueada`.

## Data e última verificação

- **Escrito em:** AAAA-MM-DD
- **Verificado pela última vez contra a versão atual da engine:** AAAA-MM-DD

## Resumo (2 frases)

[Que problema esta decisão resolve e o que foi decidido. Escrito para quem varre 10 ADRs e decide se abre este.]

## Contexto

- **Problema:** [por que decidir agora; custo de não decidir]
- **Restrições:** [plataforma, dispositivo mínimo, prazo, orçamento em US$/tokens, equipe de uma pessoa]
- **Requisitos que pesam:** [ex.: IAP obrigatório; offline; export iOS pelo agente; 60 fps em iPhone 12]

## Decisão

[A decisão, com detalhe suficiente para implementar sem perguntar de novo.]

### Compatibilidade com a engine e com o agente

| Campo | Valor |
|---|---|
| Engine / framework e versão FIXADA | [ex.: Godot 4.7.2 · Unity 6000.3.x LTS · Xcode 27 / iOS 27 SDK · Phaser 4.x] |
| Alvo(s) | iOS app / web / ambos |
| O agente fecha sozinho construir → rodar → ver → ler log? | sim — como: [comandos/MCP] |
| Formato de cena/dados é texto? | sim / parcialmente / não |
| Export iOS | [nativo · projeto Xcode gerado · wrapper (Capacitor) · PWA] |
| IAP / anúncios | [StoreKit 2 nativo · plug-ins Apple para Unity · plug-in de terceiros — qual] |
| Licença da engine/tooling | [MIT · Apache 2.0 · Unity Companion License · proprietária] |
| Risco de conhecimento do modelo | BAIXO (API estável, muito material) / MÉDIO / ALTO (API pós-corte — fornecer docs da versão) |
| APIs pós-corte usadas | [lista ou "nenhuma"] |
| O que verificar na engine real antes de confiar | [comportamentos concretos] |

## Alternativas consideradas

| Alternativa | Por que não | Quando reconsiderar |
|---|---|---|
| | | |

## Consequências

- **Positivas:**
- **Negativas / custos aceitos:**
- **Riscos e mitigação:**

## Critérios de validação

- [ ] [ex.: `scripts/verify.sh` gera screenshot do simulador em < 3 min]
- [ ] [ex.: build vazio instala e abre no iPhone de teste]
- [ ] [ex.: teste unitário roda headless no CI]

## Relacionado

- Brief: `design/game-brief.md`
- Features afetadas: `feature_list.json` → [ids]
- Outros ADRs: [...]

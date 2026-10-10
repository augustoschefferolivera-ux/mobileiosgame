# Checklist do diretor de arte (critérios mensuráveis + olho humano)

Use por lote, antes do subagente `diretor-de-arte` e antes de registrar em `PROVENANCE.md`. Os números vêm de
WCAG 2.x (contraste), da HIG da Apple ("Designing for games": botão padrão 44×44 pt, mínimo 28×28 pt; texto padrão
17 pt, mínimo 11 pt) e de prática de pixel art (silhueta, squint test, teste de cinza). Os limiares dos scripts
são ponto de partida: ajuste na bible e registre.

## 1. Automático (scripts; salve a saída em `production/evidencias/<data>-<lote>/`)

| Critério | Comando | Limiar padrão |
|---|---|---|
| Legibilidade a 1/4, contraste com o cenário, silhueta, valor interno | `python3 .claude/skills/direcao-de-arte-e-style-card/scripts/verificar_legibilidade.py <pngs> --fundo "#hex" --alvo-px <pt no jogo> --folha <evidência>.png` | contraste ≥ 3:1 · silhueta IoU ≥ 0,80 · detalhe ≥ 0,35 · valor ≥ 0,06 · ocupação ≥ 0,25 |
| Paleta dentro da bible | `python3 .claude/skills/consistencia-com-lora/scripts/verificar_paleta.py <png> --paleta design/paleta.txt --tolerancia 28 --max-fora 10` | pintado ≤ 10 % fora (tol. 24–40); pixel art 0 % (tol. 0–8) |
| Contraste de UI e alvos de toque | `python3 .claude/skills/ui-hud-e-icones/scripts/verificar_contraste.py --style-card design/style-card.md --toque 44x44` | texto ≥ 4,5:1 · gráfico ≥ 3:1 · toque ≥ 44 pt |
| Alfa limpo | `contact_sheet.py --fundo xadrez` e `--fundo "#000000"`: halo claro/escuro visível = alfa reto/pré-multiplicado trocado ou recorte sujo | nenhum halo a olho em 2× |
| Dimensões e múltiplos | `python3 -c "from PIL import Image; print(Image.open('x.png').size)"` | múltiplo de 2 (@2x); pixel art = grade ou múltiplo inteiro |
| Costura (tiles/fundos) | `verificar_seamless.py --eixos hv --max-diff 12` | HD ≤ 12; pixel ≤ 4 |
| Baseline de animação | `slice_spritesheet.py fatiar --tolerancia-baseline 2` | HD ≤ 2 px; pixel 0 |

## 2. Humano (uma linha por asset na tabela do lote)

| Pergunta | Se falhar |
|---|---|
| Reconheço o que é em 1/4 e em cinza? (folha do script) | simplificar forma; aumentar contraste de valor; regenerar |
| A luz vem do lado da bible (seção 5)? Sombra na cor da bible, não preto? | regenerar (luz não se retoca barato) |
| Proporção em cabeças igual à folha de referência (±10 %)? | regenerar com a folha anexada; LoRA se recorrente |
| Traço/contorno com a mesma espessura dos vizinhos? | retocar no Aseprite/Krita; anotar em `edicao_humana` |
| Tem "assinaturas de IA": brilhos gratuitos, partículas soltas, gradiente fotográfico, mãos/olhos errados, texto ilegível, detalhe que vira ruído? | paintover humano ou regenerar com negativo reforçado |
| Lembra personagem/marca/estilo registrado de terceiros? (busca reversa nos heróis) | rejeitar (App Store 4.1(c)/5.2.1 mesmo em web: risco de marca) |
| Lê junto dos vizinhos (5+ assets na mesma tela)? | ajustar prefixo do style card; `/consistencia-com-lora` |
| Há linha em `PROVENANCE.md` com modelo, prompt, seleção, edição humana, licença? | registrar antes de aprovar |

## 3. Veredito

`OK` · `RETOCAR` (humano edita; master em `masters/`) · `REGENERAR` (prompt/seed/referência) · `BLOQUEADO` (bible
ambígua: corrigir a bible antes). Dois assets do mesmo lote com vereditos opostos para o mesmo critério = bible ambígua.

## 4. Quantos candidatos e quanto tempo (estimativas do projeto; meça as suas)

Não há estudo público com taxa de aproveitamento; uma survey acadêmica (arXiv 2503.02703) registra que
desenvolvedores preferem "muitas saídas de qualidade menor" a poucas ótimas e aceitam 1–10 min por asset. Regra
inicial deste repositório, a ser substituída pelos seus números em `production/evidencias/.../lote.json`:

| Tipo | Candidatos por asset | Aproveitamento esperado | Curadoria humana | Retoque humano |
|---|---|---|---|---|
| Item, prop, ícone | 4 | 1 em 4 na 1ª rodada (≈ 60–75 % dos assets fecham na 1ª rodada) | 1–2 min | 0–10 min |
| Inimigo, personagem secundário | 4–6 | 1 em 6; 2 rodadas comuns | 3–5 min | 15–45 min |
| Herói / folha de referência | 6–8 + 2 rodadas | 1 em 8 | 10–20 min | 1–3 h (paintover) |
| Ciclo de animação (4–8 frames) | 2–3 sheets | 1 em 3 | 5–10 min | 20–60 min (frames soltos) |
| Tile repetível | 3–4 | 1 em 3 após costura | 2–3 min | 5–20 min |
| Camada de fundo | 2–3 | 1 em 2 | 3 min | 10–30 min |

Registre por lote: candidatos gerados, aprovados, minutos de curadoria e de retoque. Após 3 lotes, substitua a tabela.

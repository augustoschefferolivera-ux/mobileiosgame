# Checklist de consistência (por lote)

Adaptado da ideia do `consistency-check` do Claude-Code-Game-Studios (MIT): existe um **registro** (aqui: art bible + paleta + folha de referência) e cada item novo é comparado com ele, campo a campo, em vez de "parece bom". Preencha uma tabela por lote e salve em `production/evidencias/<data>-consistencia-<alvo>/checklist.md`.

## Registro (fonte da verdade)

| Campo | Valor na bible/folha |
|---|---|
| Paleta (hex) | `design/paleta.txt` |
| Proporção | N cabeças; relação herói/inimigo |
| Traço | contorno px/cor; AA sim/não |
| Luz | direção; cor de sombra |
| Acessórios fixos do personagem | lista (ex.: cachecol vermelho, bolsa à esquerda) |
| Silhueta | traço distintivo |
| Câmera | vista; ângulo |

## Comparação por asset

| Asset | Paleta (% fora, `verificar_paleta.py`) | Proporção | Traço | Luz | Acessórios | Silhueta 64 px | Veredito |
|---|---|---|---|---|---|---|---|
| chr_raposa_walk_00 | 3,1% (ok ≤ 10%) | ok | ok | ok | bolsa do lado errado | ok | REGENERAR |

Classificação: **OK** · **RETOCAR** (humano corrige no Aseprite/Krita e registra em `PROVENANCE.md`) · **REGENERAR** (mudar prompt/seed/referência) · **BLOQUEADO** (a bible é ambígua: corrigir a bible antes).

## Regras de decisão

1. Paleta: pixel art 0% fora (tolerância 0–8); pintado ≤ 10% com tolerância 24–40. Acima: regenerar ou requantizar.
2. Proporção: meça altura da caixa de alfa ÷ altura da cabeça; desvio > 10% = regenerar.
3. Luz invertida = regenerar (não há retoque barato).
4. Acessório faltando/trocado = retocar se pequeno; regenerar se muda a silhueta.
5. Dois assets do mesmo lote com vereditos opostos para o mesmo campo → a bible está ambígua → BLOQUEADO.

## Rotina

- Rode o checklist a cada lote (não no fim da produção): o custo de regenerar cedo é um prompt; tarde, é um atlas inteiro.
- Compare sempre com a **folha de referência**, nunca com o asset anterior (deriva acumulada).
- Anote no final: nº de assets, OK/RETOCAR/REGENERAR, e a causa mais comum (vira ajuste de prefixo ou de dataset).

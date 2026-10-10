# Schemas de exemplo: nível 2D e loja de itens

Leia ao escrever o schema de um novo tipo de conteúdo. Os dois exemplos abaixo são compatíveis com a saída estruturada do Claude (`output_config.format`, `type: "json_schema"`): todo objeto tem `additionalProperties: false` e `required`; **não** há `minimum`/`maximum`/`minLength`/recursão (não suportados). Os limites numéricos ficam no verificador (`scripts/validar-conteudo.py`). Para Foundation Models, espelhe em `@Generable` com `@Guide` (lá faixas numéricas são permitidas).

## Princípios

1. O LLM entrega **parâmetros**; o gerador determinístico do engine entrega o conteúdo; o verificador decide se entra.
2. `enum` para tudo que o código compara (tema, tipo, raridade, dificuldade).
3. Texto livre só em campos de sabor (`titulo`, `descricao`) com limite de palavras no verificador e lista de termos proibidos.
4. `seed` inteiro sempre presente: reprodução e bug report.
5. Versione: `content/schemas/nivel-2d.v1.json`; grave `schema_version` no save.

## Nível 2D (`content/schemas/nivel-2d.json`)

```json
{
  "type": "object",
  "properties": {
    "id": { "type": "string", "description": "identificador único, kebab-case" },
    "tema": { "type": "string", "enum": ["floresta", "caverna", "ruinas", "gelo"] },
    "dificuldade": { "type": "string", "enum": ["facil", "media", "dificil"] },
    "seed": { "type": "integer", "description": "semente do gerador determinístico" },
    "largura": { "type": "integer", "description": "colunas do grid; o verificador exige 8 a 32" },
    "altura": { "type": "integer", "description": "linhas do grid; o verificador exige 8 a 32" },
    "densidade_obstaculos": { "type": "number", "description": "fração de células bloqueadas; verificador exige 0,05 a 0,45" },
    "inicio": { "$ref": "#/$defs/celula" },
    "saida": { "$ref": "#/$defs/celula" },
    "inimigos": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "tipo": { "type": "string", "enum": ["slime", "morcego", "esqueleto"] },
          "x": { "type": "integer" },
          "y": { "type": "integer" }
        },
        "required": ["tipo", "x", "y"],
        "additionalProperties": false
      }
    },
    "titulo": { "type": "string", "description": "até 6 palavras, pt-BR" },
    "descricao": { "type": "string", "description": "até 30 palavras, pt-BR, sem marcas ou pessoas reais" }
  },
  "required": ["id", "tema", "dificuldade", "seed", "largura", "altura", "densidade_obstaculos", "inicio", "saida", "inimigos", "titulo", "descricao"],
  "additionalProperties": false,
  "$defs": {
    "celula": {
      "type": "object",
      "properties": { "x": { "type": "integer" }, "y": { "type": "integer" } },
      "required": ["x", "y"],
      "additionalProperties": false
    }
  }
}
```

Propriedades verificadas pelo script (`nivel`): dimensões na faixa; densidade na faixa; início ≠ saída, ambos dentro do grid e em célula livre; **existe caminho início → saída** (BFS no grid gerado a partir do `seed`); inimigos em células livres, não sobre início/saída, quantidade por dificuldade (fácil ≤ 3, média ≤ 6, difícil ≤ 10); título ≤ 6 palavras; descrição ≤ 30 palavras; sem termos proibidos; `id` único no lote.

Equivalente `@Generable` (on-device), resumido:

```swift
@Generable struct Nivel2D {
    var id: String
    var tema: Tema; var dificuldade: Dificuldade
    var seed: Int
    @Guide(.range(8...32)) var largura: Int           // [confirmar] sintaxe do @Guide numérico
    @Guide(.range(8...32)) var altura: Int
    var densidadeObstaculos: Double
    var inicio: Celula; var saida: Celula
    var inimigos: [Inimigo]
    @Guide(description: "até 6 palavras") var titulo: String
    @Guide(description: "até 30 palavras, pt-BR") var descricao: String
}
```

Mesmo com `@Guide`, rode o verificador: a faixa garante forma, não solucionabilidade.

## Loja de itens (`content/schemas/loja.json`)

```json
{
  "type": "object",
  "properties": {
    "id": { "type": "string" },
    "nome_loja": { "type": "string", "description": "até 4 palavras" },
    "tema": { "type": "string", "enum": ["ferreiro", "alquimista", "mercador_itinerante", "templo"] },
    "itens": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id": { "type": "string" },
          "nome": { "type": "string", "description": "até 4 palavras, sem nomes reais" },
          "tipo": { "type": "string", "enum": ["arma", "armadura", "pocao", "amuleto"] },
          "raridade": { "type": "string", "enum": ["comum", "raro", "epico"] },
          "preco": { "type": "integer", "description": "moedas; faixa por raridade no verificador" },
          "stats": {
            "type": "object",
            "properties": {
              "ataque": { "type": "integer" },
              "defesa": { "type": "integer" },
              "vida": { "type": "integer" }
            },
            "required": ["ataque", "defesa", "vida"],
            "additionalProperties": false
          },
          "descricao": { "type": "string", "description": "até 25 palavras, pt-BR" }
        },
        "required": ["id", "nome", "tipo", "raridade", "preco", "stats", "descricao"],
        "additionalProperties": false
      }
    }
  },
  "required": ["id", "nome_loja", "tema", "itens"],
  "additionalProperties": false
}
```

Propriedades verificadas (`loja`): 3 a 8 itens; `id` únicos (na loja e no lote); preço por raridade (comum 5–50, raro 51–200, épico 201–1000); soma de stats ≤ orçamento por raridade (comum 10, raro 25, épico 50); stats ≥ 0; poção com `ataque`/`defesa` = 0; nome ≤ 4 palavras; descrição ≤ 25 palavras; sem termos proibidos.

Ajuste as faixas em `validar-conteudo.py` (constantes no topo) para a economia do seu jogo; o script é base, não regra.

## Prompt de lote (exemplo, Haiku 5.5)

System (fixo, em cache, ≥ 512 tokens): bíblia do mundo + regras de design + "Responda só com o JSON pedido".

User (varia por `custom_id`): `Gere um nível de tema {tema} e dificuldade {dificuldade}, com seed {seed}. Título e descrição em português do Brasil.`

O `seed` vem do seu script (não do modelo) quando precisar de distribuição controlada; o modelo pode sugerir outro, mas o verificador usa o do JSON.

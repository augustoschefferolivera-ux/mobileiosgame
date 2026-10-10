# Foundation Models: API e exemplos Swift para jogo

Leia quando for escrever o módulo Swift. **Convenção de marcação**: nomes de tipos e métodos sem marca constam nas sessões WWDC lidas (25/286, 25/301, 26/241, 26/339). Nomes com `// [confirmar]` são os usuais da API mas **não** apareceram nas fontes lidas: confira em https://developer.apple.com/documentation/foundationmodels antes de compilar. O compilador do Xcode 27 é o verificador final; não entregue código que não compilou.

## Nomes confirmados nas fontes lidas

| Elemento | Onde aparece | Observação |
|---|---|---|
| `SystemLanguageModel` | 25/286 | modelo on-device, ~3B, 2 bits |
| `LanguageModelSession` | 25/286, 25/301 | sessão com instruções e histórico |
| `@Generable`, `@Guide` | 25/286 | geração guiada por decodificação restrita |
| `PartiallyGenerated` | 25/286 | snapshots de streaming |
| protocolo `Tool` | 25/286, 25/301 | argumentos `@Generable`; tools fixas na criação da sessão |
| `GenerationOptions(sampling: .greedy)` | 25/301 | repetível só para o mesmo prompt/sessão/versão do modelo |
| `LanguageModelSession.GenerationError.exceededContextWindowSize` | 25/301 | tratar criando nova sessão |
| `DynamicGenerationSchema` | 25/301 | schema definido em runtime |
| `contextSize`, `tokenCount(for:)` | 26/241 | iOS 26.4+; slide imprime 8192 |
| `PrivateCloudComputeLanguageModel`, `reasoningLevel` | 26/241 | 32.000 tokens; entitlement; limites diários |
| protocolo `LanguageModel` | 26/241, 26/339 | qualquer modelo local ou servidor; `.iOS(.v27)` |
| `CoreAILanguageModel`, `MLXLanguageModel` | 26/241 | abertos pela Apple; MLX roda modelos do Hugging Face |
| `response.usage` | 26/241 | input / cached / output / reasoning tokens |
| `BarcodeReaderTool`, `OCRTool`, `DynamicProfile` | 26/241 | ferramentas de sistema e perfis por estado |
| CLI `fm` (macOS 27), SDK Python `apple_fm_sdk` | 26/241 | para testes fora do app |

## 1. Ficha de NPC `@Generable` (adaptada do exemplo oficial)

```swift
import FoundationModels

@Generable
struct NPC {
    @Guide(description: "Nome curto, fantasia medieval, sem nomes reais")
    var name: String

    @Guide(.range(1...10))           // [confirmar] sintaxe exata do @Guide numérico
    var level: Int

    @Guide(description: "Até três traços de humor")
    var attributes: [Attribute]

    @Guide(description: "Uma frase do encontro, em português do Brasil, até 25 palavras")
    var encounter: String

    @Generable
    enum Attribute: String { case sassy, tired, hungry }
}
```

Regras que valem para qualquer ficha:
- Declare primeiro os campos que o jogo consome (nível, atributos) e por último o texto livre; a geração segue a ordem de declaração.
- Texto livre (`encounter`) só vai para a UI depois do filtro de conteúdo e do limite de palavras; nunca para regra de jogo.
- Enum fechado em vez de `String` sempre que o jogo precisar comparar valores.

## 2. Disponibilidade e fallback

```swift
let model = SystemLanguageModel.default          // [confirmar] nome do acessor padrão

switch model.availability {                      // [confirmar] nome e casos do enum
case .available:
    dialogueSource = .foundationModels
case .unavailable(let reason):
    log("FM indisponível: \(reason)")            // sem dados pessoais
    dialogueSource = .scriptedLines               // falas escritas
}
```

Motivos esperados (nomes a confirmar): aparelho não elegível, Apple Intelligence desativada, modelo ainda não pronto (baixando). Em todos, o jogo segue com as falas escritas e **não** mostra erro.

## 3. Sessão, prompt curto e saída estruturada

```swift
let instructions = """
Você é Dona Zefa, dona da taverna de Vila Brejo. Fala pouco, com humor seco.
Só sabe o que acontece na vila. Nunca fala de marcas, pessoas reais ou do mundo fora do jogo.
Responda em português do Brasil, até 25 palavras. Nunca saia do personagem.
"""

let session = LanguageModelSession(instructions: instructions)  // [confirmar] rótulo do parâmetro

let prompt = """
Estado: noite, chuva, quest 'o poço' concluída, jogador com 3 moedas.
Jogador diz: "Tem quarto pra hoje?"
"""

do {
    let response = try await session.respond(                   // [confirmar] assinatura respond(to:generating:options:)
        to: prompt,
        generating: NPCLine.self,
        options: GenerationOptions(sampling: .greedy)
    )
    show(response.content)                                       // [confirmar] propriedade .content
} catch LanguageModelSession.GenerationError.exceededContextWindowSize {
    session = LanguageModelSession(instructions: instructions + "\nÚltima fala: \(lastLine)")
    // repetir uma vez; se falhar de novo, fala escrita
} catch {
    show(scriptedLine(for: .innRequest))                          // guardrail, idioma, outros
}
```

Observações:
- Texto digitado pelo jogador entra no **prompt**, nunca nas instruções; limite a ~200 caracteres e remova quebras de linha múltiplas.
- Para o mesmo prompt gerar fala diferente a cada visita, inclua no prompt um campo de variação do próprio jogo (ex.: `visita: 3`), não um timestamp aleatório.

## 4. Streaming para esconder latência

```swift
let stream = session.streamResponse(to: prompt, generating: NPCLine.self)  // [confirmar] nome do método
for try await partial in stream {
    // partial é NPCLine.PartiallyGenerated: campos opcionais preenchidos na ordem de declaração
    if let text = partial.text { balloon.update(text) }
}
```

Mostre o balão com "..." imediatamente e substitua pelo texto parcial; o jogador percebe resposta em < 300 ms mesmo com geração total de 2 s.

## 5. Ferramenta que lê estado do jogo

```swift
struct InventoryTool: Tool {
    let name = "inventario"
    let description = "Lista o que o jogador carrega agora."

    @Generable
    struct Arguments {
        @Guide(description: "Categoria: 'armas', 'comida' ou 'todos'")
        var category: String
    }

    func call(arguments: Arguments) async throws -> ToolOutput {   // [confirmar] tipo de retorno
        let items = GameState.shared.inventory(filter: arguments.category)
        return ToolOutput(items.map(\.displayName).joined(separator: ", "))
    }
}

let session = LanguageModelSession(tools: [InventoryTool()], instructions: instructions)  // [confirmar]
```

Ferramentas são fixadas na criação da sessão; se o conjunto muda por cena, crie uma sessão por cena. Ferramentas que **escrevem** estado (dar item, abrir porta) devem retornar uma proposta validada pelo código do jogo, nunca executar direto.

## 6. Orçamento de contexto (iOS 27)

```swift
let budget = model.contextSize                                   // 26/241
let used = try model.tokenCount(for: instructions + prompt)      // [confirmar] se é no model ou na session
precondition(used < budget / 2, "instruções + prompt grandes demais")
```

Reserve a outra metade para histórico curto da sessão e resposta. O valor 8192 do slide é exemplo; leia em runtime.

## 7. Subir degrau: PCC e provedor externo

```swift
// Degrau 2: Private Cloud Compute (iOS 27; entitlement; 32K; reasoningLevel)
let pcc = PrivateCloudComputeLanguageModel()                      // [confirmar] inicializador
let session = LanguageModelSession(model: pcc, instructions: instructions)   // [confirmar] rótulo

// Degrau 3: provedor externo pelo protocolo LanguageModel (pacote Swift do provedor)
// import <PacoteDoProvedor>                                      // nome do pacote: ver sessão 339 e docs do provedor
// let claude = <TipoDoProvedor>(…autenticação via SEU backend, nunca chave no app…)
// let session = LanguageModelSession(model: claude, instructions: instructions)
```

Só a linha do modelo muda; `@Generable`, tools e tratamento de erro ficam iguais. Antes da primeira chamada ao degrau 3, mostre a folha de consentimento 5.1.2(i) e respeite a recusa.

## 8. Entrada de imagem (iOS 27)

O modelo on-device aceita `UIImage`/`CGImage`/pixel buffers/URLs de arquivo no prompt (26/241); imagens maiores custam mais tokens e latência. Uso em jogo: descrever um desenho do jogador, classificar uma captura para dica. Reduza para ≤ 512 px antes de enviar e meça a latência no aparelho.

## 9. Teste fora do app

- macOS 27: CLI `fm` para rodar o mesmo prompt/instruções em lote e comparar saídas.
- iOS 27: framework de Evaluations para conjuntos fixos de prompt com critérios.
- Xcode: template de Instruments do Foundation Models para latência por requisição (25/286).

# Proxy mínimo em Cloudflare Worker (TypeScript)

Leia quando for escrever o backend. O mesmo desenho vale para Vercel Edge/Serverless Functions (troque `env` por `process.env` e o KV por Vercel KV/Upstash). Usa o SDK oficial `@anthropic-ai/sdk`; nomes de parâmetros conferidos pela skill `claude-api` em 10/10/2026. Antes de publicar, rode `/claude-api` e compare com a documentação atual.

## Responsabilidades do proxy (e só elas)

1. Guardar a chave (`ANTHROPIC_API_KEY` como secret do Worker: `wrangler secret put ANTHROPIC_API_KEY`).
2. Autenticar o jogo: token de instalação emitido pelo seu backend após verificação do aparelho (iOS: App Attest/DeviceCheck [confirmar na documentação da Apple]; web: token de sessão curto). Sem token válido → 401.
3. Limitar: por token/dia (KV) e por tamanho de entrada (≤ 200 caracteres do jogador).
4. Montar o prompt no servidor: a bíblia/ficha **nunca** vem do cliente (ou o jogador reescreve o personagem).
5. Chamar o Claude com cache + JSON Schema + timeout; devolver `{fallback: true}` em recusa/erro.
6. Logar só `usage`, `npcId`, `custom_id`; nunca o texto do jogador.

## Código

```ts
// src/index.ts
import Anthropic from "@anthropic-ai/sdk";

export interface Env {
  ANTHROPIC_API_KEY: string;   // secret
  RATE: KVNamespace;           // contador por token/dia
  TOKENS: KVNamespace;         // tokens de instalação válidos
}

// Bíblias congeladas no deploy. Cada uma >= 512 tokens (mínimo cacheável nos modelos 5.5).
// Sem data, sem ID, sem nada que mude entre requisições.
import { BIBLES } from "./bibles";          // Record<npcId, string>

const NPC_LINE_SCHEMA = {
  type: "object",
  properties: {
    line: { type: "string", description: "Fala em pt-BR, até 25 palavras, dentro do personagem" },
    mood: { type: "string", enum: ["neutro", "feliz", "irritado", "assustado"] },
    safe: { type: "boolean", description: "false se a fala toca em tema impróprio para a classificação do jogo" },
  },
  required: ["line", "mood", "safe"],
  additionalProperties: false,
} as const;

const LIMITE_DIARIO = 200;        // trocas por token por dia; ajuste pelo orçamento
const ENTRADA_MAX = 200;          // caracteres digitados pelo jogador

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    if (req.method !== "POST") return new Response("método", { status: 405 });

    const token = req.headers.get("x-game-token") ?? "";
    if (!token || !(await env.TOKENS.get(token))) return new Response("não autorizado", { status: 401 });

    const dia = new Date().toISOString().slice(0, 10);
    const chave = `${token}:${dia}`;
    const usado = Number((await env.RATE.get(chave)) ?? "0");
    if (usado >= LIMITE_DIARIO) return json({ fallback: true, motivo: "limite" }, 429);
    await env.RATE.put(chave, String(usado + 1), { expirationTtl: 60 * 60 * 36 });

    const body = (await req.json()) as { npcId: string; state: string; say: string; customId: string };
    const bible = BIBLES[body.npcId];
    if (!bible || body.say.length > ENTRADA_MAX) return new Response("entrada inválida", { status: 400 });

    const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
    try {
      const response = await client.messages.create(
        {
          model: "claude-haiku-5-5",
          max_tokens: 300,
          thinking: { type: "disabled" },              // aceito no Haiku 5.5 até effort "high"; latência menor
          system: [
            { type: "text", text: bible, cache_control: { type: "ephemeral" } },   // prefixo fixo em cache
          ],
          messages: [
            { role: "user", content: `Estado do jogo: ${body.state}\nJogador diz: ${body.say}` },
          ],
          output_config: { format: { type: "json_schema", schema: NPC_LINE_SCHEMA } },
        },
        { timeout: 8_000 },                              // ms no SDK TypeScript
      );

      console.log(JSON.stringify({ npc: body.npcId, id: body.customId, usage: response.usage, stop: response.stop_reason }));

      if (response.stop_reason === "refusal") return json({ fallback: true, motivo: "refusal" });
      if (response.stop_reason === "max_tokens") return json({ fallback: true, motivo: "truncado" });

      const text = response.content.find((b) => b.type === "text");
      if (!text || text.type !== "text") return json({ fallback: true, motivo: "sem texto" });
      const parsed = JSON.parse(text.text) as { line: string; mood: string; safe: boolean };
      if (!parsed.safe || parsed.line.split(/\s+/).length > 30) return json({ fallback: true, motivo: "filtro" });
      return json({ line: parsed.line, mood: parsed.mood });
    } catch (err) {
      if (err instanceof Anthropic.RateLimitError) return json({ fallback: true, motivo: "429" }, 200);
      if (err instanceof Anthropic.APIError) return json({ fallback: true, motivo: `api_${err.status}` }, 200);
      return json({ fallback: true, motivo: "rede" }, 200);
    }
  },
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });
}
```

Notas:
- O proxy devolve 200 com `fallback: true` em vez de repassar erros: o jogo não precisa distinguir, só trocar pela fala escrita.
- `Anthropic.RateLimitError` e `Anthropic.APIError` são as classes tipadas do SDK; não compare mensagens de erro por string. O SDK já tenta de novo 429/5xx duas vezes (`maxRetries` padrão 2); com `timeout` de 8 s o pior caso é ~24 s, por isso o cliente corta em 2,5 s e usa fallback.
- Para instruções que mudam durante a conversa (modo "resumido", evento de mundo), acrescente `{ role: "system", content: "..." }` ao fim de `messages` (após um turno `user`); isso preserva o prefixo em cache. Não edite o `system` de topo.
- Para streaming (fala aparecendo), use `client.messages.stream(...)` e repasse SSE; só vale a pena se a fala tiver > 40 palavras.

## wrangler.toml mínimo

```toml
name = "npc-proxy"
main = "src/index.ts"
compatibility_date = "2026-09-01"
kv_namespaces = [
  { binding = "RATE", id = "<id>" },
  { binding = "TOKENS", id = "<id>" },
]
# ANTHROPIC_API_KEY via `wrangler secret put`, nunca aqui.
```

## Cliente iOS (esboço)

```swift
struct NPCRequest: Encodable { let npcId: String; let state: String; let say: String; let customId: String }
struct NPCResponse: Decodable { let line: String?; let mood: String?; let fallback: Bool? }

func askNPC(_ r: NPCRequest) async -> String {
    guard Consent.cloudAI == .granted, Reachability.online else { return Scripted.line(for: r) }
    var req = URLRequest(url: proxyURL); req.httpMethod = "POST"
    req.timeoutInterval = 2.5                      // p95 alvo; acima disso, fala escrita
    req.setValue(InstallToken.current, forHTTPHeaderField: "x-game-token")
    req.httpBody = try? JSONEncoder().encode(r)
    guard let (data, _) = try? await URLSession.shared.data(for: req),
          let res = try? JSONDecoder().decode(NPCResponse.self, from: data),
          res.fallback != true, let line = res.line else { return Scripted.line(for: r) }
    return line
}
```

`customId` é um UUID gerado pelo jogo por troca; é o que o botão "Denunciar" envia. Nenhum identificador do jogador vai no corpo.

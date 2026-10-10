# Hospedagem estática, PWA e analytics leve

Leia quando for fazer o deploy. Limites de planos gratuitos, comandos de CLI e versões mudam com frequência e **não foram lidos nas páginas oficiais nesta pesquisa**: confirme antes de prometer custo zero ou cota.

## Escolha do host

| Host | Como publicar | Cabeçalhos customizados (COOP/COEP para Godot com threads) | Observação |
|---|---|---|---|
| Cloudflare Pages | integração Git ou CLI (`wrangler pages deploy build/web`) | arquivo `_headers` na raiz do build | HTTPS e CDN incluídos [confirmar cota em pages.cloudflare.com] |
| Vercel | integração Git ou CLI (`vercel deploy`) | `vercel.json` → `headers` | bom para Phaser/PixiJS com bundler [confirmar limites] |
| GitHub Pages | branch `gh-pages` ou GitHub Actions | não permite cabeçalhos customizados [confirmar] | só serve para builds sem threads/SharedArrayBuffer |

Exemplo de `_headers` (Cloudflare Pages):

```
/*
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Embedder-Policy: require-corp
  Cache-Control: public, max-age=31536000, immutable
/index.html
  Cache-Control: no-cache
```

Verificação: `curl -I https://seu-dominio/ | tee production/evidencias/<data>-web/headers.txt`.

## Export por engine

- **Godot 4.x**: Project > Export > Web. Use o renderer Compatibility para alcance em iOS; se o export usar threads, o host precisa dos cabeçalhos acima [docs.godotengine.org "Exporting for the Web" não lidas; confirmar]. Fixe a versão do Godot no `project.godot` e no `CLAUDE.md` do projeto.
- **Unity 6**: invoque a skill oficial `optimize-web` (unity-agent-plugin) para configurações de WebGL, compressão e tamanho.
- **Phaser/PixiJS**: bundle com Vite ou similar; `index.html` na raiz; assets com hash no nome para cache imutável.

## PWA mínimo

`manifest.webmanifest`:

```json
{
  "name": "Nome do Jogo",
  "short_name": "Jogo",
  "start_url": "./",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#000000",
  "theme_color": "#000000",
  "icons": [
    { "src": "icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

No `index.html`: `<link rel="manifest" href="manifest.webmanifest">`, `<link rel="apple-touch-icon" href="icons/icon-180.png">`, `<meta name="apple-mobile-web-app-capable" content="yes">`, `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`. Service worker: cache-first para assets com hash, network-first para `index.html`; versione o nome do cache a cada release para não servir build velho.

Limites do iOS para PWA (comportamento do Safari muda por versão; confirme em webkit.org): armazenamento pode ser limpo após inatividade; sem StoreKit; áudio só após gesto do usuário.

## Analytics leve e LGPD

Princípio: medir o jogo, não a pessoa. Envie eventos agregados sem identificador persistente: sessão iniciada, nível alcançado, tempo até o primeiro "game over", FPS médio, versão do build. Isso dispensa banner de cookies e reduz a exposição à LGPD (não há dado pessoal) — avalie com `/privacidade-lgpd-e-eca-digital`.

Se usar serviço de terceiros: prefira os que não usam cookies nem rastreiam entre sites; leia a política do fornecedor; declare na política de privacidade do jogo. Se houver SDK de anúncio ou identificador: aviso de cookies + política em pt-BR + base legal.

## Tela "toque para começar"

iOS Safari bloqueia autoplay de áudio e, em alguns casos, de WebGL até o primeiro gesto. Implemente uma tela inicial que, ao toque, inicializa o AudioContext e entra em tela cheia quando suportado.

## Fontes

- App Store Review Guidelines (4.2, 4.7): https://developer.apple.com/app-store/review/guidelines/
- Unity Agent Plugin (`optimize-web`): https://github.com/Unity-Technologies/unity-agent-plugin
- Godot export (classe de export iOS; campos de privacidade): https://github.com/godotengine/godot/blob/master/platform/ios/doc_classes/EditorExportPlatformIOS.xml
- SpawnForge (exemplo de export ZIP com PWA em engine web): https://github.com/Tristan578/project-forge [secundário]

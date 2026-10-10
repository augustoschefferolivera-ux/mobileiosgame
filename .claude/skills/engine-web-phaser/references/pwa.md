# PWA para jogos no iPhone: manifest, service worker e limites

## manifest.webmanifest

```json
{
  "name": "Meu Jogo",
  "short_name": "MeuJogo",
  "start_url": "/?source=pwa",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#000000",
  "theme_color": "#000000",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable" }
  ]
}
```

- iOS usa `apple-touch-icon` (180×180) e `apple-mobile-web-app-capable` além do manifest.
- `display: fullscreen` não é respeitado no iOS; `standalone` esconde a barra do Safari.

## Service worker (cache-first para assets, network-first para index)

- Use `vite-plugin-pwa` (gera SW com Workbox e injeta o manifest) ou um SW manual: `install` pré-cacheia `index.html`, bundle e atlases; `fetch` responde do cache; versione o nome do cache (`game-v3`) e apague caches antigos em `activate`.
- Mostre "Atualização disponível — recarregar" quando `registration.waiting` existir; no iOS a atualização só aplica após fechar o app standalone.
- Tamanho: mantenha o pré-cache < 50 MB; iOS pode descartar caches de sites pouco usados.

## Limites do iOS que afetam jogos

- Sem Web Push para jogos sem instalação em tela inicial (e com restrições); sem Bluetooth/USB; `Fullscreen API` ausente no iPhone; sem vibração (`navigator.vibrate` não existe no Safari).
- Pagamentos: só Apple Pay via Payment Request/Stripe etc. — não IAP; se o jogo vender itens e for empacotado em app, a Apple exige IAP (3.1.1).
- Armazenamento: `localStorage`/IndexedDB podem ser apagados após 7 dias sem uso em alguns modos; salve progresso também em nuvem se importar.
- Teste PWA standalone de verdade: instale em um iPhone e abra pelo ícone — comportamento de áudio e `visibilitychange` muda.

## Checklist de release web

- [ ] `vite build` sem avisos de chunk > 1 MB (divida cenas por `import()` dinâmico)
- [ ] `verify.sh` verde (WebKit) e playtest em Safari real
- [ ] Lighthouse "Installable" ok (Chrome) e `apple-touch-icon` presente
- [ ] HTTPS com `Cache-Control` adequado (index sem cache longo; assets com hash e cache de 1 ano)

Fontes: comportamento do iOS/Safari aqui vem de prática comum e deve ser revalidado em https://developer.apple.com/documentation/safari-release-notes e https://webkit.org/blog/ para a versão do iOS alvo; nenhuma dessas páginas foi lida nesta pesquisa.

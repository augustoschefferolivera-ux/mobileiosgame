# Checklist de revisão para jogos web empacotados (e receitas WKWebView)

Texto das guidelines verificado em developer.apple.com ("Last Updated: June 8, 2026"); itens marcados [secundário] vêm de blogs.

## Checklist de decisão (responda antes de empacotar)

| # | Pergunta | Se "não", risco |
|---|---|---|
| 1 | O jogo inteiro (JS, assets) está no binário (`dist/` → `webDir`)? | 2.5.2 (código que muda funcionalidade baixado em runtime) |
| 2 | O app faz algo que o site não faz (offline, progresso local, IAP, haptics, Game Center, notificações)? | 4.2 funcionalidade mínima / "not app-like" |
| 3 | O conceito é distinguível do que já existe aos montes (não é clone de categoria saturada)? | 4.3(b) spam: "indistinguishable from what's already widely available"; reincidência pode remover do Developer Program |
| 4 | Não há placeholders, telas vazias, "em breve"? | 2.1(a) completude |
| 5 | Ícone/nome/arte não usam marca ou personagem de terceiros? | 4.1(c) e 5.2.1 |
| 6 | Bens digitais só por IAP? | 3.1.1 |
| 7 | Se usa IA em nuvem com dados pessoais: há divulgação e permissão explícita antes do envio? | 5.1.2(i) |
| 8 | Classificação etária respondida com honestidade (violência, loot boxes, chat)? | 2.3.6; Brasil: loot boxes = A18 |
| 9 | Conteúdo gerado em runtime visível a outros jogadores tem filtro/denúncia/bloqueio? | 1.2 UGC |
| 10 | Privacy manifest e rótulos cobrem SDKs (RevenueCat, analytics)? | Rejeição por metadados de privacidade |

Três ou mais "não" → não empacote ainda.

## Capacitor: configuração mínima

```ts
// capacitor.config.ts
import type { CapacitorConfig } from '@capacitor/cli';
const config: CapacitorConfig = {
  appId: 'com.exemplo.meujogo',
  appName: 'Meu Jogo',
  webDir: 'dist',
  ios: { contentInset: 'never', allowsLinkPreview: false, scrollEnabled: false },
  // server: { url: '…' }  ← NUNCA em produção (2.5.2 + tela branca offline)
};
export default config;
```

- Vite: `base: './'` para caminhos relativos no WKWebView.
- Info.plist: orientação fixa; `UIRequiresFullScreen`; `UIStatusBarHidden` se o jogo for tela cheia; `ITSAppUsesNonExemptEncryption=false` se só HTTPS padrão.
- `npx cap sync ios` a cada build; abra `ios/App/App.xcworkspace` para Team/capabilities.

Comandos e chaves do Capacitor não foram verificados nesta pesquisa — confirme em https://capacitorjs.com/docs.

## Plug-ins que tornam o app "app-like"

- `@capacitor/haptics` (impacto/notificação) — conte em `__GAME_DEBUG__.hapticsPlayed`.
- `@capacitor/app` (`appStateChange` → pausar/salvar), `@capacitor/splash-screen`, `@capacitor/status-bar`.
- `@capacitor/preferences` ou Filesystem para progresso (não `localStorage`).
- IAP: `@revenuecat/purchases-capacitor` [confirme]; alternativa: plug-in StoreKit da comunidade. Botão "Restaurar compras" visível.
- Game Center: plug-ins comunitários; se for essencial, considere nativo.

## Performance e comportamento do WKWebView

- Mesmo motor do Safari: DPR ≤ 2, texturas ≤ 2048², áudio só após gesto, `visibilitychange` ao ir para background.
- Sem barra de endereço: `100dvh` vira a tela toda; `env(safe-area-inset-*)` com `viewport-fit=cover`.
- Memória: WebContent pode ser morto pelo sistema; salve progresso com frequência; o app reabre na splash.
- Service worker funciona em WKWebView com restrições; como os assets já estão locais, prefira não usar SW no app empacotado.

## PWA em vez de app: quando basta

- Sem IAP, sem Game Center, público por link/social, atualizações frequentes. Instrua "Adicionar à Tela de Início". Limites: sem Web Push confiável, sem vibração, armazenamento pode ser limpo por inatividade.

## Depois do empacotamento

- TestFlight interno (`/ci-xcode-cloud-fastlane`), playtest em dispositivo (`/playtest-automatizado`), revisão humana completa das guidelines antes da submissão (skill de submissão, fase 10). O hackathon da RevenueCat concluiu que quase nenhum app "vibe coded" passou na primeira submissão.

Fontes: https://developer.apple.com/app-store/review/guidelines/ ; https://developer.apple.com/news/?id=ey6d8onl ; https://developer.apple.com/help/app-store-connect/reference/age-ratings-values-and-definitions ; https://www.revenuecat.com/blog/company/revenuecat-vibe-coding-apps ; [secundário] https://modall.ca/blog/apple-rejecting-vibe-coded-apps

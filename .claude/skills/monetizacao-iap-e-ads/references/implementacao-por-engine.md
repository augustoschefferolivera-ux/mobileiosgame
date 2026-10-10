# Implementação de IAP e anúncios por engine

Leia quando for escrever o código. Nomes de API são os da documentação oficial de cada fabricante; onde a página não foi lida nesta pesquisa, está marcado. Não copie o conteúdo das skills da Unity (licença Unity Companion): invoque-as.

## Swift nativo (SpriteKit / RealityKit / SwiftUI) — StoreKit 2

Esqueleto mínimo (verifique assinaturas em developer.apple.com/documentation/storekit [não lido nesta pesquisa]):

```swift
import StoreKit

@MainActor final class Loja: ObservableObject {
    @Published var produtos: [Product] = []
    @Published var comprados: Set<String> = []
    private var escuta: Task<Void, Never>?

    init() { escuta = escutarTransacoes() }

    func carregar(ids: [String]) async throws {
        produtos = try await Product.products(for: ids)
        await atualizarDireitos()
    }

    func comprar(_ p: Product) async throws {
        let resultado = try await p.purchase()
        switch resultado {
        case .success(let verificacao):
            let t = try verificar(verificacao)
            comprados.insert(t.productID)
            await t.finish()
        case .pending: break      // Ask to Buy: não conceda nada ainda
        case .userCancelled: break
        @unknown default: break
        }
    }

    func restaurar() async { try? await AppStore.sync(); await atualizarDireitos() }

    private func atualizarDireitos() async {
        var ativos = Set<String>()
        for await r in Transaction.currentEntitlements {
            if let t = try? verificar(r), t.revocationDate == nil { ativos.insert(t.productID) }
        }
        comprados = ativos
    }

    private func escutarTransacoes() -> Task<Void, Never> {
        Task.detached { [weak self] in
            for await r in Transaction.updates {
                guard let self, let t = try? self.verificar(r) else { continue }
                await self.atualizarDireitos(); await t.finish()
            }
        }
    }

    private func verificar<T>(_ r: VerificationResult<T>) throws -> T {
        switch r { case .unverified: throw StoreKitError.notEntitled; case .verified(let v): return v }
    }
}
```

Teste local: File > New > File > StoreKit Configuration File (`Produtos.storekit`), associe ao scheme (Run > Options > StoreKit Configuration). No Transaction Manager do Xcode: aprovar Ask to Buy, simular reembolso, falhas. Em dispositivo: Sandbox Apple Account (App Store Connect > Users and Access > Sandbox). TestFlight usa sandbox.

Anúncios no nativo: Google Mobile Ads SDK (AdMob) via Swift Package [documentação não lida; developers.google.com/admob/ios]. Chame `ATTrackingManager.requestTrackingAuthorization` antes de inicializar o SDK com anúncios personalizados; sem autorização, peça anúncios não personalizados. Declare `NSUserTrackingUsageDescription` em pt-BR.

## Unity 6 — skills oficiais

1. `implement-in-app-purchases` (unity-agent-plugin): lê `references/pre-check.md` primeiro e roteia (projeto novo, migração v4→v5, conversão de StoreKit nativo, RevenueCat, Adapty, Essential Kit, UniPay, D2C com Stripe/Coda em v5.4+). Pontos que ela impõe: assinar eventos antes de `Connect()`, fluxo Pending → Confirm obrigatório, de-duplicar `OnPurchasePending`, consumíveis não voltam em `FetchPurchases`, `OnPurchaseDeferred` (Ask to Buy) não concede conteúdo, `RestoreTransactions`.
2. `levelplay-unity-integration`: pergunta se é integração nova/migração/troubleshooting, verifica `Assets/` e `ProjectSettings/`, pergunta o objetivo (revenue/UX/balanced), instala o pacote **Ads Mediation** (não "Ads IAP Mediation Adaptor"), configura Android/iOS, inicializa, implementa rewarded/interstitial/banner, ATT/GDPR, Test Suite.
3. Alternativa Apple-only: `apple/unityplugins` → pacote StoreKit (Apache-2.0). Requisitos dos plug-ins novos (WWDC26 sessão 378): Xcode 27, Python 3, Unity 2022 LTS ou posterior; mínimo iOS 15.6; .dSYMs vão para o `.xcarchive`.

## Godot 4.x

Sem skill oficial de IAP ou anúncios. Opções: plug-in iOS de in-app purchase mantido pela comunidade (adicionar como GDExtension/iOS plugin) ou encapsular com RevenueCat via plug-in nativo. Registre o plug-in, versão e licença em `LICENCAS.md` com "[não verificado]". O export iOS do Godot já expõe campos de privacy manifest (`privacy/collected_data/*`, `privacy/tracking_domains`), úteis para o SDK de anúncios.

## Capacitor / Phaser / PixiJS (web empacotado)

RevenueCat Capacitor SDK para IAP [não lido; confirmar em revenuecat.com/docs]. Anúncios via plug-in AdMob para Capacitor da comunidade [não verificado]. Atenção: um wrapper web precisa parecer "app-like" (Guideline 4.2) e mini games HTML5/JS entram em 4.7 (4.7.5 exige restrição por idade quando aplicável).

## RevenueCat (todas as engines)

Centraliza recibos, entitlements e restauração; SDKs iOS (Swift), Unity e Capacitor. Preço escalona pela receita rastreada: confirme a faixa gratuita vigente em revenuecat.com/pricing [não lido]. Lição do hackathon da RevenueCat: a submissão é a parte difícil; reserve tempo para metadados, privacidade e IAP.

## Roteiro de teste em sandbox (evidência obrigatória)

| Caso | Como | Evidência |
|---|---|---|
| Compra não consumível | `.storekit` no simulador | `compra-sandbox.png` |
| Cancelamento pelo usuário | fechar a folha de pagamento | log sem concessão |
| Ask to Buy | Transaction Manager → aprovar | `ask-to-buy.mov` |
| Reembolso | Transaction Manager → refund | entitlement removido |
| Restaurar após reinstalar | dispositivo + Sandbox Apple Account | `restaurar.png` |
| Falha de rede | Network Link Conditioner / modo avião | mensagem amigável |
| Anúncio recompensado | ID de teste / Test Suite | `anuncio-recompensado.mov`, recompensa única |

Salve tudo em `production/evidencias/<data>-monetizacao/` e anote o build testado.

## Fontes

- https://developer.apple.com/videos/play/wwdc2026/378/
- https://github.com/apple/unityplugins
- https://github.com/Unity-Technologies/unity-agent-plugin
- https://github.com/godotengine/godot/blob/master/platform/ios/doc_classes/EditorExportPlatformIOS.xml
- https://www.revenuecat.com/blog/company/revenuecat-vibe-coding-apps
- https://developer.apple.com/app-store/review/guidelines/

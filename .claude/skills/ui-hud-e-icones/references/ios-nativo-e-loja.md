# UI nativa (SwiftUI, SF Symbols), ícone do app e screenshots

Tudo que envolve regras da Apple deve ser confirmado nas páginas vigentes (HIG, App Store Connect Help, App Review Guidelines); as páginas da Apple não foram lidas nesta pesquisa.

## O que fazer nativo × desenhado

| Tela | Padrão | Por quê |
|---|---|---|
| Menu principal, configurações, loja/IAP, créditos, consentimentos | **SwiftUI** com `Text`, `Button`, `Image(systemName:)`; arte do jogo só como fundo/moldura | Dynamic Type, VoiceOver, localização e as telas de IAP/consentimento ficam dentro das regras sem esforço |
| HUD in-game (vida, moedas, timer, habilidades) | **Desenhado** (peças PNG/SVG do style card renderizadas pelo engine) | integração com a cena, 60 fps, sem reflow |
| Diálogos, toasts, pausa | misto: moldura desenhada + texto do engine/SwiftUI | |

SF Symbols: use só em UI nativa e só em apps para plataformas Apple (o acordo de uso dos símbolos restringe a plataformas Apple [confirmar]); para a versão web/Android do jogo, use os SVGs gerados com Recraft.

## Ícone do app

- Arte @1024×1024, PNG **sem canal alfa**, cantos retos (a Apple aplica a máscara) [confirmar em App Store Connect Help].
- Sem texto pequeno; um símbolo central grande que lê em 60 px; cor dominante = a "cor do jogo" da bible.
- Xcode 26+: Icon Composer monta camadas (fundo, meio, frente) para o ícone em vidro; exporte as camadas separadas com `/gerar-sprites-2d` (alfa nativo) [confirmar].
- Busca reversa de imagem e checagem de semelhança com ícones de jogos conhecidos antes de enviar (4.3(b), 5.2.1).
- Registre no `PROVENANCE.md` com `--categoria icn --nome app_icon`.

## Screenshots e preview da App Store

- Capturas reais do jogo rodando (simulador ou dispositivo), nas dimensões exigidas por família de tela em App Store Connect Help (confira os tamanhos vigentes — mudam com cada geração de iPhone/iPad).
- Guideline 2.3.3: screenshots devem mostrar o app em uso; não use arte-conceito como se fosse jogo [confirmar texto vigente].
- Molduras de dispositivo e legendas são opcionais; se usar, texto curto, localizado, sem prometer features inexistentes.
- Preview em vídeo: capture no simulador/dispositivo; não gere com modelo de vídeo.
- Guarde originais em `production/loja/screenshots/<locale>/` e o checklist em `production/loja/README.md` (esta pasta é da skill `/submissao-app-store`; aqui só produzimos as imagens).

## Acessibilidade na UI nativa

- `Text` com estilos dinâmicos (`.body`, `.title`), nunca tamanho fixo em pt.
- `accessibilityLabel` em botões de ícone; `accessibilityHidden(true)` em arte decorativa.
- Cores do style card em `Color(hex:)`; teste "Aumentar Contraste" e "Reduzir Movimento" nos Ajustes.
- Alvos ≥ 44×44 pt mesmo em botões de ícone (padding).

## Checklist antes de passar para `/submissao-app-store`

- [ ] Ícone 1024² sem alfa, busca reversa feita, registrado.
- [ ] Screenshots reais por família de tela e por idioma; sem placeholders, sem nomes de modelo de IA visíveis (2.1(a)).
- [ ] Nenhum logo/marca de terceiros em telas, ícones ou screenshots (5.2.1).
- [ ] Contrastes e alvos anotados em `design/ui-mapa-de-nomes.md`.

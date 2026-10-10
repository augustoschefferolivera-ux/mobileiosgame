# Checklist de submissão à App Store — [Nome do jogo] v[versão] (build [n])

**Data-alvo**: [AAAA-MM-DD] · **Responsável**: [nome] · **Status**: [ ] GO / [ ] NO-GO
**Evidências**: `production/evidencias/[AAAA-MM-DD]-submissao/`

Legenda: `[x]` feito com evidência · `[ ]` pendente · `[?]` não avaliável (diga por quê) · `N/A` não se aplica.
Estrutura adaptada do release-checklist do Claude-Code-Game-Studios (MIT, © 2026 Donchitos). Guidelines citadas pela versão de 08/06/2026.

---

## 1. Build e completude (Guideline 2.1(a))

- [ ] Build de release limpo, versão e número de build definidos, commit etiquetado: `[hash]`
- [ ] `scan_placeholders.sh` executado → `scan_placeholders.log` com **0 ocorrências** (ou justificativas abaixo)
- [ ] `strings` no executável do `.app` sem nomes de modelo, prompts ou chaves
- [ ] Todas as telas abertas manualmente; nenhuma tela vazia, botão morto ou "coming soon"
- [ ] `feature_list.json`: nenhuma feature visível fora do estado `verificado`
- [ ] Sem flags de debug, logs verbosos ou servidores `localhost`
- [ ] Nenhum crash em TestFlight nas últimas 48 h; hangs revisados
- [ ] Sessão de 10 min gravada em iPhone real (`sessao-10min.mov`)

| Ocorrência justificada | Arquivo:linha | Motivo |
|---|---|---|
| | | |

## 2. Guidelines de risco para jogo feito com IA

- [ ] **4.3(b)/4.2** Frase de diferencial escrita nas Notas para o App Review: "[...]"
- [ ] **4.3(b)** Não é variante de categoria saturada (timers, fortune telling, sound effects, wallpaper...)
- [ ] **4.1(c)** Nome e ícone pesquisados na App Store; nenhum conflito com outro desenvolvedor
- [ ] **5.2.1** Passe de marca/semelhança em todos os assets gerados (personagens, logos, fontes) registrado em `PROVENANCE.md`
- [ ] **5.2** `LICENCAS.md` completo; nenhum asset de modelo em lista vermelha ou em litígio (Suno/Udio)
- [ ] **5.1.2(i)** Se houver IA de terceiros: folha de consentimento antes da 1ª transmissão (`consentimento.png`) · N/A se só on-device/PCC
- [ ] **4.7/4.7.1/1.2** Se houver chatbot ou texto gerado visível a outros: filtro, denúncia, bloqueio, contato publicado · N/A
- [ ] **4.7.5** Restrição por idade para software não embutido · N/A
- [ ] **2.5.2** O app não baixa nem executa código que altere sua funcionalidade
- [ ] **2.3.6** Questionário etário respondido com honestidade (ver seção 3)
- [ ] **2.3.8** Screenshots e descrição adequados a 4+ mesmo que a faixa seja maior

## 3. Classificação etária (saída de `/classificacao-etaria`)

- [ ] Questionário completo (violência, horror, sexual, profanidade, drogas, apostas simuladas, loot boxes, UGC, chat, redes sociais, compras, acesso irrestrito à web, chatbot/IA)
- [ ] Faixa global resultante: [4+ / 9+ / 13+ / 16+ / 18+]; faixa Brasil: [L / A10 / A12 / A14 / A16 / A18]
- [ ] Loot boxes? → Brasil = A18 (decisão registrada em `design/monetizacao.md`)
- [ ] Apostas simuladas? → Brasil A12 (infrequente) / A18 (frequente)
- [ ] Perguntas de "social media capabilities" (09/07/2026) respondidas
- [ ] "Override to Higher Age Rating" aplicado se houver dúvida · N/A
- [ ] Não é "Unrated"; Made for Kids só se 4+/9+ e decisão irreversível aceita

## 4. Privacidade (saída de `/privacidade-lgpd-e-eca-digital`)

- [ ] Rótulos App Privacy coerentes com cada SDK (anúncios, analytics, crash, IA)
- [ ] `PrivacyInfo.xcprivacy` presente, com required reason APIs e tracking domains
- [ ] URL pública da política de privacidade em pt-BR (e en) funcionando
- [ ] ATT solicitado antes de anúncios personalizados · N/A
- [ ] LGPD: base legal, minimização, contato do encarregado; logs de LLM sem dados pessoais
- [ ] ECA Digital: sem design enganoso para menores; verificação/declaração de idade coerente com a faixa

## 5. Compras e anúncios (saída de `/monetizacao-iap-e-ads`)

- [ ] Produtos IAP "Ready to Submit" e anexados à versão; screenshot de revisão de cada um
- [ ] Botão "Restaurar compras" visível; testado em sandbox (`restaurar.png`)
- [ ] Preços revisados por região (BRL/USD); sem promo codes de IAP (descontinuados 26/03/2026)
- [ ] Probabilidades de itens aleatórios divulgadas antes da compra · N/A
- [ ] Anúncios: IDs de produção configurados; nenhum anúncio de teste

## 6. Metadados e mídia

- [ ] Nome, subtítulo, keywords, descrição, "What's New" em pt-BR e en-US, revisados por humano
- [ ] Categoria Games + subcategorias; URLs de suporte e marketing funcionando (sem página vazia)
- [ ] Screenshots em todos os tamanhos exigidos, atuais, retocados por humano (sem "cara de IA")
- [ ] Pré-visualização (opcional) atual · N/A
- [ ] Ícone final sem marca de terceiros
- [ ] Parágrafo de divulgação de IA conforme `templates/divulgacao-de-ia.md` (opcional na App Store; recomendado pela HIG)
- [ ] Créditos no app com ferramentas e licenças (`LICENCAS.md`) e divulgação de IA

## 7. TestFlight e envio

- [ ] Build interno testado; build externo aprovado no Beta App Review; ≥ 5 testadores externos (`testflight-externo.png`)
- [ ] Notas para o App Review: conta demo, caminho até features de IA/chat, local da folha de consentimento, diferencial
- [ ] Contato do App Review com telefone válido
- [ ] Export Compliance, Content Rights e Advertising Identifier respondidos conforme SDKs
- [ ] Lançamento: [ ] manual [ ] automático [ ] Phased Release
- [ ] Enviado → `waiting-for-review.png`

## 8. Pós-decisão

- [ ] Se rejeitado: mensagem copiada em `production/releases/rejeicoes.md` com guideline, data e plano
- [ ] Se aprovado: `/pos-lancamento-e-telemetria` aberto; MetricKit/Sentry recebendo dados nas primeiras 24 h

---

## Decisão

**GO / NO-GO**: ________ · **Itens bloqueantes**: [lista] · **Itens `[?]`**: [lista com motivo]
**Riscos aceitos**: [lista] · **Assinatura**: [nome, data]

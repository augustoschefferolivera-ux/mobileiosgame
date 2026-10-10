# Autoria humana, direito autoral e proveniência técnica (C2PA)

Não é aconselhamento jurídico. Fatos com fonte; onde a página oficial não foi lida, "[secundário]". Valide com advogado antes de registrar obra, licenciar ou litigar.

## Estados Unidos

- US Copyright Office, Parte 2 (copyrightability), 29/01/2025: "based on the functioning of current generally available technology, prompts do not alone provide sufficient control"; "assistive uses of AI, where the technology enhances human expression, do not affect the availability of copyright protection for the resulting work" [secundário; copyright.gov bloqueado].
- Thaler v. Perlmutter (No. 25-449): Suprema Corte negou certiorari em 02/03/2026, mantendo o D.C. Circuit (março/2025): obra protegida exige autoria humana identificável; um sistema de IA agindo sozinho não é "author". Quanto de contribuição humana basta segue em aberto [secundário].
- Parte 3 (treinamento): pré-publicação em 09/05/2025; versão final não localizada até ago/2026 [secundário].

## Brasil

- Lei 9.610/98, art. 11: autor é pessoa física. Doutrina: obras com auxílio de IA "devem ser elegíveis para proteção autoral, desde que haja uma intervenção criativa humana mínima"; não se atribui autoria automática ao desenvolvedor do sistema nem a quem só fornece comandos; domínio público aparece como alternativa para obra sem autor humano. **Nenhuma decisão judicial consolidada identificada** [secundário: Revista UFPR, CONPEDI, EMERJ].
- PL 2338/2023 (marco da IA): aprovado no Senado em dez/2024; na Câmara desde mar/2025; em comissão especial sem votação; relator anunciou votação só após as eleições de out/2026 [secundário]. Direitos autorais no treinamento são ponto sensível; fontes divergem sobre o texto.

## União Europeia (se distribuir na UE)

- AI Act, Art. 50: obrigações de transparência; Código de Prática sobre conteúdo gerado por IA finalizado por volta de 10/06/2026 e "assessed as adequate" pela Comissão e pelo AI Board; adesão voluntária, mas serve de evidência de conformidade [secundário].
- Provedores: marcação legível por máquina com ao menos duas técnicas (metadados assinados/tamper-evident + watermark imperceptível); proibir remoção de metadados por usuários. Deployers: rotular deepfakes e textos informativos; taxonomia "fully AI-generated" vs "AI-assisted"; ícone comum "AI" com variantes ("generated"/"modified") [secundário; texto do artigo não lido].
- Leitura para jogos: arte/música gerada é conteúdo criativo (obrigação primária do provedor do modelo); diálogo gerado em runtime com personagens realistas pode se aproximar de "interação com IA" → identifique (ver `/divulgacao-de-uso-de-ia`).

## O que registrar para provar intervenção humana

| Campo de `PROVENANCE.md` | Por que importa |
|---|---|
| `prompt` + `seed` + `versao` | reproduzibilidade; mostra que a geração foi instrumental |
| `referencia` | esboços, paletas e sheets feitos por humano: expressão própria anterior à IA |
| `edicao_humana` | recorte, repintura, requantização, mixagem, arranjo, seleção entre N candidatos: é isso que a Parte 2 chama de "assistive use" e a doutrina brasileira de "intervenção criativa" |
| `master` | arquivo editável (PSD/Aseprite/WAV/Blend) prova a camada humana |
| Git + transcrições do agente | linha do tempo; o Xcode mantém transcrições por conversa; o GPTK persiste estado em `.porting/` |

Seleção e arranjo (qual de 16 SFX entrou, ordem das músicas, composição de tela) também são atos autorais: registre-os mesmo quando o asset individual não foi editado.

## C2PA na prática

- `contentauth/c2pa-rs` (MIT/Apache-2.0): SDK Rust com API C e CLI `c2patool` para criar, assinar, embutir e validar manifestos [CLI e formatos suportados: confirmar no README].
- Fluxo sugerido: master editado → exportar PNG/JPEG/MP3 → `c2patool <arquivo> -m manifesto.json -o <assinado>` com certificado de teste (desenvolvimento) ou certificado próprio (produção) [sintaxe: confirmar]. Guarde `manifesto.json` ao lado do master.
- Geradores que já marcam: Eleven Music (`sign_with_c_2_pa`, MP3), Lyria (SynthID), Chatterbox (Perth), Unity AI (metadados "AI-generated"). Não remova.
- Limite: atlas, KTX2/ASTC e CAF perdem metadados; a prova fica no master + manifesto, não no bundle.
- Adoção de C2PA em pipelines de jogos e suporte nos geradores de assets 3D: não localizados [gap].

## Fontes

- https://www.reedsmith.com/articles/copyright-office-anticipated-part-two-report-ai-addressing-copyrightability/ [secundário]; https://www.akingump.com/en/insights/ai-law-and-regulation-tracker/us-copyright-office-releases-part-2-of-ai-report [secundário]; https://www.copyright.gov/ai/ [bloqueado]
- https://www.jdsupra.com/legalnews/supreme-court-denies-certiorari-in-3828648/ ; https://www.mayerbrown.com/en/insights/publications/2026/03/supreme-court-denies-review-in-ai-authorship-case [secundário]
- https://revistas.ufpr.br/rrddis/article/view/103445 ; https://site.conpedi.org.br/publicacoes/4lbcgdye/4q96nk29/4q7VfVz9J90597G8.pdf [secundário]
- https://monitor.lcfconsulting.com.br/proposicoes/pl-2338-2023/ ; https://www.dataprivacybr.org/a-construcao-da-legislacao-de-inteligencia-artificial-no-brasil-analise-tecnica-do-texto-que-sera-votado-no-plenario-do-senado-federal/ [secundário]
- https://www.twobirds.com/en/insights/2026/taking-the-eu-ai-act-to-practice-the-final-transparency-code-of-practice ; https://www.paulweiss.com/insights/client-memos/eu-finalises-transparency-rules-for-ai-generated-content ; https://digital-strategy.ec.europa.eu/en/policies/code-practice-ai-generated-content [secundário]
- https://github.com/contentauth/c2pa-rs ; https://github.com/elevenlabs/elevenlabs-python/blob/main/src/elevenlabs/music/client.py ; https://github.com/resemble-ai/chatterbox
- https://developer.apple.com/documentation/xcode/writing-code-with-intelligence-in-xcode ; https://github.com/apple/game-porting-toolkit

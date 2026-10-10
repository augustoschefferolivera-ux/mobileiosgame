# LGPD, ECA Digital e política de privacidade (Brasil)

Fatos de lei citados pelo número; interpretações marcadas. Não é aconselhamento jurídico.

## LGPD (Lei 13.709/2018)

- **Bases legais** (art. 7): consentimento; cumprimento de obrigação legal; execução de contrato; legítimo interesse (com teste documentado); entre outras. Para jogos: anúncios personalizados → consentimento; IAP e salvamento → execução de contrato; crash/analytics agregados sem identificador → legítimo interesse documentado, ou nem é dado pessoal se anonimizado.
- **Princípios** (art. 6): finalidade, adequação, necessidade (minimização), transparência, segurança, prevenção, não discriminação, responsabilização.
- **Crianças e adolescentes** (art. 14): tratamento no melhor interesse; dados de crianças exigem consentimento específico e em destaque de um dos pais ou responsável [confirmar redação vigente]; informar de forma clara e acessível.
- **Encarregado** (art. 41): identidade e contato públicos [confirmar exceções para pequenos agentes na regulamentação da ANPD].
- **Direitos do titular** (art. 18): confirmação, acesso, correção, anonimização, eliminação, portabilidade, revogação do consentimento: tenha um e-mail e um fluxo.
- **ANPD**: Mapa de Temas Prioritários 2026–2027 (Resolução CD/ANPD nº 30/2025) com crianças e adolescentes como eixo central; IA entra no centro da fiscalização a partir de 2027 [secundário].

## ECA Digital (Lei 15.211/2025)

- Em plena vigência desde março de 2026 [secundário]: verificação confiável de idade, supervisão parental, restrição de publicidade nociva, fim de "design enganoso" para crianças.
- Caso Discord (ago/2026): ANPD determinou suspensão do "Go Live" por falhas de proteção a menores [secundário].
- Para um jogo: (1) faixa etária honesta (`/classificacao-etaria`) e gate de idade coerente (declaração no primeiro uso; verificação mais forte se houver chat ou compras para menores); (2) controles parentais onde houver chat/compras; (3) sem dark patterns: contadores falsos, botões de fechar ocultos, recompensas por tempo de tela, pressão social; (4) sem anúncios inadequados; (5) dados de menores com base legal própria e minimização.

## Logs de LLM

- Não registre prompts completos com identificadores; registre categoria, tamanho, latência, resultado do filtro.
- Se precisar guardar texto para segurança/denúncia: pseudonimize, retenha por prazo curto definido, criptografe, restrinja acesso, e diga isso na política.
- Prefira on-device (Foundation Models) quando o texto do jogador entra no prompt.

## Estrutura mínima da política de privacidade (pt-BR)

1. Quem somos e contato do encarregado.
2. Quais dados tratamos, por fluxo (tabela do mapa de dados), e se saem do aparelho.
3. Finalidade e base legal de cada fluxo.
4. Compartilhamento com terceiros (SDKs de anúncio, analytics, provedor de IA) e links para as políticas deles.
5. IA e seus dados (se runtime): provedor, o que é enviado, treinamento, retenção, como denunciar/bloquear.
6. Crianças e adolescentes: faixa etária, verificação, controles parentais, consentimento dos responsáveis.
7. Retenção e exclusão.
8. Direitos do titular e como exercê-los.
9. Segurança.
10. Alterações e data de vigência.
Publique em URL estável; mesma URL no App Store Connect e no app.

## Google Play (se houver)

- Data safety form coerente com os SDKs; política de famílias para público infantil; apps de IA generativa devem ter denúncia/sinalização in-app (aviso de 30/10/2025, pelo menos 30 dias para atualizar) [secundário; página não verificada].

## Fontes

- ECA Digital/ANPD: https://abes.org.br/o-eca-digital-e-a-nova-fronteira-da-fiscalizacao-das-plataformas-no-brasil/ ; https://confidata.com.br/blog/lgpd-2026-o-que-anpd-espera ; https://cesconbarrieu.com.br/seis-anos-da-lgpd-consolidacao-regulatoria-novas-competencias-e-os-desafios-da-inteligencia-artificial/ ; https://convergenciadigital.com.br/opiniao/a-nova-era-da-regulacao-digital-no-brasil/ [secundário]
- Google Play: https://support.google.com/googleplay/android-developer/announcements/13412212?hl=en [secundário]; https://revera.legal/en/info-centr/news-and-analytical-materials/2114-ii-v-mobilnyx-prilozheniyax-trebovaniya-google-play/ [secundário]
- Texto da LGPD: planalto.gov.br (não lido nesta pesquisa; confirmar artigos citados)

# Plano de arte (decidido pelo usuário em 2026-10-12)

- **100% por IA, sem artista humano e sem gerador de imagem:** a pixel art é escrita em código (grade de índices da paleta do doc 13) e os efeitos são procedurais (partículas, rastros, brilho, shaders). O detalhe do jogo fica nos efeitos e nas armas.
- **Resolução:** personagem jogável em **24×24**; os outros, sempre do menor para o maior que der (massa em 16×16 se a leitura aguentar; médios em 24×24; chefes maiores só quando necessário). Efeitos em resolução livre, dentro da paleta.
- **Referência aprovada como ponto de partida:** `aldric24-referencia.png` (gerado por `aldric24-referencia.py`).
- **Sessão própria de gráficos**, em etapas:
  1. **Pesquisa:** referências de pixel art em baixa resolução (silhueta, leitura em tela pequena, animação com poucos quadros, efeitos), as melhores formas de produzir por código e de garantir consistência (paleta fixa, regras de contorno e luz, grade de proporções, ferramentas de checagem automática).
  2. **Style card e regras:** paleta, proporções, contorno, luz, um modelo de cada categoria; aprovação do usuário antes da produção.
  3. **Produção:** sprites e animações por categoria (jogador, massa, médios, chefes, armas, efeitos, UI), com o pipeline de atlas do projeto.
  4. **Revisão de consistência:** revisor independente com checagem automática (paleta, contorno, tamanhos, alinhamento entre quadros) e visual (folhas lado a lado, em escala real de 390 × 844).
  5. **Teste no jogo e no iPhone** (escolha do Claude): legibilidade na horda de 300 em escala real, contraste dos telegrafos e efeitos, e memória do atlas; o que falhar volta à etapa 3.
- **Quando:** depois da F-010 (B §5), salvo se o usuário antecipar.

# Revisão de consistência da arte (F-011, etapa 3)

Revisor independente (subagente, só leitura) comparou cada moldura com o `style-card.md` (§2 a §7 e §11) olhando a folha de todas as molduras em escala real (`production/evidencias/F-011/folhas.png`), as capturas 390 × 844 das cenas e as grades em `src/arte/sprites/`. A checagem automática (paleta, contorno fechado, tamanhos, linha dos pés, cor quente, cor do centro) já cobria o resto; o pedido foi procurar o que ela não pega. Cada divergência foi conferida aqui antes de corrigir (a grade ampliada ou a captura), e as correções foram verificadas de novo na prévia e nas capturas.

| # | Divergência apontada | Conferência | O que foi feito |
|---|---|---|---|
| 1 | Nas capturas com médios, o Aldric (24 px, capa escura) se perde entre corpos da mesma altura; a luz da brasa quase não aparece. | Confirmada: o halo a alfa 12–70 (de 255) some no meio da horda. | Luz da brasa com alfa 18–110 nas mesmas 4 faixas (`brilho` em `src/arte/procedural.ts`); o §3 do style card foi atualizado. |
| 2 | As faixas da luz saem marrom-oliva e roxo-acinzentado, sem leitura de âmbar. | Confirmada (é a mesma causa da 1: alfa baixo no modo aditivo sobre F). | A mesma correção da 1; o matiz (A no miolo, B fora) fica. |
| 3 | O andar do Aldric só troca as botas; o tronco não se mexe e o passo some na escala real. | Confirmada na grade ampliada. | Nos quadros de contato (1 e 3) o corpo desce 1 px, do elmo ao cinto, e a barra da capa encurta 1 linha; os pés ficam na linha 23 (`comPasso` em `src/arte/sprites/aldric.ts`). |
| 4 | As dobras `e` do Oco das Lanternas caem em colunas alternadas e formam um xadrez de ruído. | Confirmada: violava "sem pontilhado de ruído em sprite" (§5). | Duas dobras contínuas, uma em cada flanco (colunas 5 e 10), do capuz à barra, nos 2 quadros. |
| 5 | Almas e a barra de vagas ficam sobre a horda sem fundo e se perdem. | Confirmada na captura dos médios. | Cada vaga ganha fundo de pedra (K) a 55% e o texto das Almas, traço de pedra de 3 pt (`src/cenas/Hud.ts`). |
| 6 | A borda externa do golpe sai em âmbar; o Y só aparece na ponta. | Confirmada: o esfriamento do rastro dominava a regra "borda externa Y" (§6). | Os 2 px de fora do arco ficam em Y (em `a` no começo do rastro); o miolo esfria mais devagar (`arco` em `src/arte/efeitos.ts`). |
| 7 | A cunha branca do telegrafo cobre as pernas do Aldric e os vizinhos; sugere alfa máximo 0,6. | Não aplicada: a cunha sólida nos últimos 11 passos é o sinal da janela do aparo (design/decisoes-F-006.md RE5), decisão de jogo testada na F-006, não de arte. | Nada muda; fica anotado para o teste no iPhone. |
| 8 | As rachaduras das rochas são manchas K e o musgo é um disco chapado que lembra pickup. | Confirmada: linhas internas devem ser no tom escuro do material (§5) e o chão não pode lembrar pickup (§3). | Rachaduras em D (por fora do musgo); o musgo vira uma capa de 3 a 4 px na borda de cima, com a última linha em `e`. |

Fora da revisão: o que é da F-008 (borda da arena, Fogueira, relógio) não foi avaliado.

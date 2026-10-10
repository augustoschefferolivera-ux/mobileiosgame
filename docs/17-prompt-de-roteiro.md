# 17 · Prompt de Roteiro — *Vigília das Cinzas*

> Prompt pronto para ser entregue a um roteirista (humano ou IA) encarregado de escrever todo o texto do jogo. Contém a estrutura completa do roteiro, as regras de escrita, os formatos de entrega e as referências ao plano do jogo. Não trata de programação.

---

```
VOCÊ É O ROTEIRISTA-CHEFE DE "VIGÍLIA DAS CINZAS"

Vigília das Cinzas (título internacional: Ashen Vigil) é um jogo para iPhone no
estilo survivor-like (Vampire Survivors) com combate soulslike (Dark Souls),
partidas de 20 minutos chamadas Vigílias, e um hub entre partidas chamado
Santuário das Brasas. Sua tarefa é escrever TODO o texto do jogo em português
do Brasil, seguindo o Documento de Design que está no repositório, em
especial:

- docs/00-visao-geral.md ........ pitch, pilares, conteúdo do lançamento
- docs/01-mundo-e-narrativa.md .. cosmologia, deuses, Santuário, NPCs, regiões, glossário, Ciclos
- docs/02-core-loop-e-combate.md  estrutura da Vigília (4 Horas, Fogueiras, Apagar, Amanhecer)
- docs/03-personagens.md ........ os 12 Vigilantes, maldições, Memórias Finais
- docs/04-armas-passivas-e-unioes.md  38 armas, 18 passivas, 34 Uniões, 20 Relíquias
- docs/05-bestiario.md .......... 32 inimigos com linhas de Codex
- docs/06-chefes.md ............. 13 chefes, fases, Memórias de chefe
- docs/07-mapas-e-diretor-de-spawn.md  6 regiões, eventos, segredos
- docs/08-arvore-de-pesquisa-e-meta-progressao.md  112 nós com nomes de frase
- docs/11-ui-ux-e-telas.md ...... onde cada texto aparece na tela e quanto espaço tem
- docs/14-live-ops-retencao-e-comunidade.md  temporadas e eventos futuros

Leia esses documentos antes de escrever. Tudo que você escrever deve ser
coerente com eles. Quando precisar inventar algo que não está lá (um nome, um
detalhe de lore), invente dentro das regras abaixo e registre a invenção em
uma lista de "Decisões novas" no fim da entrega.

════════════════════════════════════════════════════════════════════════
1. O MUNDO EM UM PARÁGRAFO (a verdade que você nunca contradiz)
════════════════════════════════════════════════════════════════════════

Thelune era mantida acordada pela Primeira Chama. Quando ela virou brasa, a
Mortalidade falhou: tudo que morre volta Oco, sem memória e com fome de
calor. Os poucos que ainda guardam uma centelha própria são os Vigilantes,
malditos que não podem morrer de verdade. A cada noite um Vigilante desce do
Santuário das Brasas para alimentar a Chama com as almas da horda; é a
Vigília. Se chega ao Amanhecer, derrotou o Chefe da Região. Se Apaga, acorda
de novo no Santuário, um pouco mais oco, um pouco mais forte. Os quatro
deuses (Orun, o Ferreiro; Sélide, a Caçadora; Vharos, o Arquivista; Ama-Nhu,
a Sepultadora) pararam de responder e são chamados Os Calados. O que sobra
quando a Chama apaga chama-se A Fome, e é a antagonista de tudo.

════════════════════════════════════════════════════════════════════════
2. TOM E REGRAS DE ESCRITA (não negociáveis)
════════════════════════════════════════════════════════════════════════

TOM: melancolia, não gore. Os inimigos são vítimas. O mundo sugere, não
explica. Ciclo e decadência em tudo. Esperança teimosa e seca; humor raro e
sem piscadela. Referências de voz: descrições de itens de Dark Souls, diálogos
curtos de Hollow Knight, NPCs de Hades que lembram do jogador, iconografia de
Blasphemous.

REGRAS:
R1. Nenhum texto de lore na tela com mais de 60 palavras.
R2. Descrição de item/arma/nó = 1 linha funcional (o que faz) + 1 a 2 linhas
    de lore em itálico. A linha funcional é escrita pelo design; você escreve
    só a lore, mas ela precisa fazer sentido com a função.
R3. Diálogos do Santuário: no máximo 3 balões por conversa, no máximo 2 linhas
    por balão (≈ 22 palavras). Sempre puláveis.
R4. Falas pós-Vigília dos Vigilantes: UMA linha, no máximo 14 palavras.
R5. Nomes de nós da árvore de pesquisa são frases de memória, nunca nomes de
    stat. Certo: "O peso do martelo do seu pai". Errado: "Força +5%".
R6. Inimigos têm nome, não tipo. "Oco das Lanternas", nunca "Zumbi 1".
R7. Use SEMPRE o glossário oficial (docs/01, seção 8): Vigília (não "run"),
    Amanhecer (não "vitória"), Apagar (não "morrer"/"game over"), Santuário
    (não "menu"), Pesquisa/Memória recuperada (não "upgrade"), Brasa, Alma,
    Fogueira (não "checkpoint"), Oco (não "zumbi"), Ciclo (não "NG+"),
    Pacto (não "mutator"), União (não "fusão"). A palavra "roguelike" nunca
    aparece para o jogador.
R8. Nomes próprios funcionam em português e inglês sem tradução. Não crie
    nomes com acentos novos além dos já existentes (Sélide, Caël, Grôm,
    Véspera, Nhemi, Ama-Nhu).
R9. Nada de exposição direta sobre a cosmologia. O jogador junta as peças
    pelas Memórias. Nenhum personagem diz "a Primeira Chama criou o mundo".
R10. Cada texto precisa funcionar isolado: o jogador lê fora de ordem.
R11. Sem palavrões, sem sangue descrito em detalhe, sem violência sexual.
     Classificação alvo 12+.
R12. Toda informação de mecânica que aparecer em diálogo deve estar correta
     segundo docs/02, 03, 04 e 08. Na dúvida, não mencione a mecânica.

════════════════════════════════════════════════════════════════════════
3. ESTRUTURA DO ROTEIRO (o que escrever, nesta ordem)
════════════════════════════════════════════════════════════════════════

BLOCO A — TEXTOS DE SISTEMA E ABERTURA
A1. Tela de Acender: 1 frase sob o botão "Toque para acender a Chama".
A2. Primeira Vigília (onboarding, docs/11 seção 4): 6 prompts curtos de
    tutorial (mover, esquivar, aparar, Fogueira, primeiro Apagar, árvore),
    cada um com ≤ 12 palavras e tom diegético (é a Chama ou Iselda falando,
    não "o jogo").
A3. 12 frases de carregamento (uma Memória curta cada, ≤ 25 palavras).
A4. Textos das telas de Apagar ("Você se apaga.") e Amanhecer ("Amanhecer.")
    com 3 variações cada para não repetir.

BLOCO B — O SANTUÁRIO E SEUS SETE NPCS (docs/01 seção 4)
Para cada NPC (Iselda, Brann, Maestre Oto, Nhemi, Corvo de Ferro, Rook, a
Criança da Cisterna), escreva:
B1. Ficha de voz: 5 linhas descrevendo como fala (ritmo, vocabulário, tique
    verbal). O Corvo fala em frases de exatamente três palavras. A Criança
    nunca faz perguntas. Oto se corrige o tempo todo. Nhemi é alegre de um
    jeito desconfortável. Rook nunca responde direto. Brann fala de ferro
    como quem fala de gente. Iselda é a única que chama o jogador de "você"
    com carinho.
B2. Apresentação (primeira vez que o jogador toca no NPC): 3 balões.
B3. Falas de função (ao abrir o painel): 4 variações por NPC, 1 linha cada.
B4. Arco pessoal em 5 etapas, desbloqueado por Memórias (quantidades em
    docs/01): cada etapa é uma conversa de 3 balões. O arco de Iselda termina
    com a possibilidade de devolver uma Brasa a ela (Final C). O arco de
    Brann muda quando o jogador derrota O Martelo Sem Braço (ele recebe o
    braço de volta). O arco de Oto revela que ele pode ser um dos Calados ou
    um impostor, sem confirmar. O arco de Rook contém a traição do meio de
    jogo. O arco da Criança a mostra sorrindo mais a cada Pacto ativado.
B5. Reações a eventos (1 linha cada): primeiro Amanhecer do jogador; primeira
    União; primeira vez que recupera Cinzas Perdidas; cada chefe de Região
    derrotado pela primeira vez (6); entrada em cada Ciclo (3); Maldição 10.
B6. Falas de mudança visual do Santuário (docs/01 seção 4.2): quando cada
    árvore de pesquisa acrescenta um elemento, o NPC correspondente comenta
    (Brann para Orun, Iselda para Sélide, Oto para Vharos, Nhemi para Ama-Nhu).

BLOCO C — OS DOZE VIGILANTES (docs/03)
Para cada um dos 12 (Aldric, Nhara, Ulvar, Caël, Grôm, Ysolde, Oco Nº 9,
Dom Severo, Pia, Tharn, Véspera, Corvo de Ferro):
C1. Biografia de Codex: ≤ 60 palavras. Deve explicar, sem dizer o nome da
    mecânica, por que a maldição dele é a que está em docs/03 (ex.: Nhara
    não pode ficar parada; Tharn só recupera fôlego ferindo).
C2. Frase de seleção (ao escolher o personagem): 1 linha.
C3. Frase ao acender a Chama (início da Vigília): 2 variações.
C4. Falas pós-Vigília (R4), 25 por personagem, cobrindo: Apagou cedo (Hora I),
    Apagou tarde (Hora IV), Apagou para um chefe (nomeando-o), Amanheceu,
    recorde pessoal, recuperou Cinzas, perdeu Cinzas para sempre, Vigília
    com Maldição alta, primeira União, encontrou segredo. Cada fala dirigida
    a um NPC ou a outro Vigilante específico (anote o destinatário).
C5. Memória Final em 3 etapas (as etapas mecânicas estão em docs/03): para
    cada etapa, 1 Memória de ≤ 60 palavras e 1 fala do Vigilante ao
    completá-la. A terceira fecha o arco e justifica a skin/recompensa.
C6. Afinidades (docs/03 seção 5): 4 pares (Aldric–Iselda, Nhara–Ysolde,
    Grôm–Brann, Oto–Ulvar), 3 trocas de 2 balões cada, desbloqueadas por
    usar os dois personagens em Vigílias consecutivas.
C7. Oco Nº 9: ao completar sua Memória Final o jogador dá um nome a ele.
    Escreva a cena (3 balões) e 5 reações dos outros NPCs ao nome novo (sem
    conhecer o nome: use "ele").

BLOCO D — AS SEIS REGIÕES (docs/01 seção 5, docs/07)
Para cada região (Charneca das Lanternas, Abadia Ruída, Forja Afundada,
Biblioteca Invertida, Bosque de Sélide, A Cisterna):
D1. Texto de seleção de mapa: 2 linhas.
D2. Frase de entrada (aparece nos primeiros 3 s da Vigília): 1 linha, 3
    variações.
D3. 12 a 15 Memórias de região (≤ 60 palavras cada), coletadas em eventos
    de mapa, objetos regionais e Ocos Suplicantes. Juntas, devem contar a
    micro-história daquele lugar (o que era, como caiu, o que ficou) SEM
    ordem obrigatória de leitura.
D4. Textos dos objetos regionais (lanternas, confessionários, bigornas,
    livros, Corça Branca): 1 linha de interação + 1 linha após usar.
D5. Textos dos eventos de mapa (Procissão, Cerco, Revoada, Matilha, Chuva de
    Bigornas, Eclipse Pequeno, Capítulos da Biblioteca): 1 linha de aviso
    diegético cada (≤ 8 palavras), ex.: "Elas vêm em fila. Não mate."
D6. Micro-histórias de 15 segundos (docs/01 seção 9, item 5): 3 por região,
    descritas como cena (o que o jogador vê, o que acontece se ficar, a
    Memória que recebe).
D7. Segredos (docs/07 seção 5): a pista escondida em texto para cada segredo
    (deve ser descobrível, nunca explícita) e o texto de recompensa.

BLOCO E — OS TREZE CHEFES (docs/06)
Para cada chefe:
E1. Título de apresentação (aparece quando a arena fecha): nome + epíteto,
    no padrão "função + condição" (ex.: "O Lanterneiro, Que Nunca Parou").
E2. 1 frase de entrada do chefe ou do ambiente (≤ 12 palavras). Chefes não
    falam parágrafos; A Fome Vestida de Vigilante fala com as palavras do
    próprio jogador (use as falas pós-Vigília do personagem invertidas).
E3. Texto de transição de fase: 1 linha por fase (2 ou 3 por chefe), que o
    jogador lê em 1,5 s.
E4. Memória do chefe (recebida no Amanhecer): ≤ 60 palavras, a verdade
    triste por trás dele. As Memórias de docs/06 são a base; expanda sem
    contradizer.
E5. Texto do retrato na cripta do Santuário: 2 linhas.
E6. Para a Noiva da Turfa, o Não-Vigilante e A Fome: texto adicional de
    "espelho" que muda conforme o Vigilante usado (12 variações curtas cada).

BLOCO F — ARMAS, UNIÕES, PASSIVAS, RELÍQUIAS (docs/04)
F1. 38 armas: lore de 1 a 2 linhas cada (R2). Cada arma pertence a um deus;
    a lore deve carregar a voz desse deus (Orun: ferro e peso; Sélide: vento
    e precisão; Vharos: tinta e memória; Ama-Nhu: sal, sangue e votos; Fome:
    frases incompletas).
F2. 34 Uniões: lore de 1 a 2 linhas que conecte a arma e a passiva de origem
    (ex.: Espada Longa + Elmo Sem Rosto = Lâmina do Juramento Eterno: o
    juramento feito por alguém que perdeu o rosto).
F3. 18 passivas e 20 Relíquias: 1 linha de lore cada.
F4. 6 status (Sangramento, Queimadura, Sal, Postura Quebrada, Medo, Marca):
    nome final e 1 linha de descrição para o Codex.

BLOCO G — A ÁRVORE DE PESQUISA (docs/08)
G1. 112 nós: os nomes-frase já existem em docs/08; revise cada um para
    cadência e evite repetições de estrutura ("O/A ... de ..."). Proponha
    substitutos onde houver repetição e marque os trocados.
G2. Para cada nó, 1 linha de Memória (≤ 20 palavras) exibida no tooltip
    abaixo do efeito numérico. Os 20 nós-chave ganham 2 linhas e uma fala
    de Iselda ao comprar (1 linha).
G3. 4 textos de reembolso de árvore (um por deus), 2 linhas, no tom de
    "esquecer de novo para lembrar diferente".
G4. Árvore da Fome (16 nós, Ciclo II): nomes e Memórias em frases
    incompletas ou com palavras faltando, sem perder a legibilidade.

BLOCO H — O BESTIÁRIO (docs/05)
H1. 32 inimigos + 2 especiais: nome final, 1 linha de descrição (registro
    de 100 mortes) e 1 Memória de ≤ 40 palavras (registro de 500). As
    Memórias de docs/05 são a base.
H2. Falas de Maestre Oto ao completar cada facção no Codex (6), 3 balões
    cada, em que ele lembra mais de quem foi.
H3. Texto do Eco de Vigilante (o inimigo que guarda as Cinzas Perdidas):
    1 linha ao surgir, variável pelo personagem (12).

BLOCO I — FOGUEIRA, PACTOS, CICLOS
I1. Fogueira (docs/02 seção 3.1): texto de cada ação (Descansar, Forjar,
    Oferenda, Rook, Pacto Momentâneo, Partir) em 1 linha diegética + a
    consequência em 1 linha. Ex.: "Descansar: a Chama devolve os Frascos. A
    noite repara que você parou."
I2. Pactos (docs/02 seção 10): nome, 1 linha de descrição e 1 fala da
    Criança ao ativar cada um (6). Mais 1 fala para Maldição 5 e 1 para 10.
I3. Ciclos (docs/01 seção 10): texto de abertura de cada Ciclo (3 linhas),
    e os três finais do Ciclo III (A: entregar a Brasa; B: guardar; C:
    devolver a Iselda). Cada final é uma sequência de 6 a 8 cartelas de
    ≤ 30 palavras, sem narração em voz: só texto e silêncio.

BLOCO J — FEITOS, DIÁRIO, TEMPORADAS (docs/14)
J1. 300 Feitos: nome (≤ 4 palavras) e descrição mecânica (1 linha). Os
    nomes seguem o padrão de relíquia + proveniência ("Sal na ferida",
    "Sete lanternas apagadas").
J2. Corvo de Ferro: 20 anúncios de desafio diário (3 palavras cada), 10 de
    ranking.
J3. Para cada uma das 6 temporadas do primeiro ano: título, 1 parágrafo de
    sinopse (≤ 80 palavras), 1 Memória de abertura, 1 fala de cada NPC.
J4. 3 notificações push (docs/14 seção 8), ≤ 60 caracteres cada, diegéticas.

BLOCO K — FRASES SECRETAS
K1. 12 frases para "Sussurrar a Oto" (padrão dos "spells" de Vampire
    Survivors): cada frase deve estar escondida em alguma Memória escrita
    por você (anote onde) e desbloquear algo listado em docs/07 seção 5.

════════════════════════════════════════════════════════════════════════
4. FORMATO DE ENTREGA
════════════════════════════════════════════════════════════════════════

- Um arquivo Markdown por bloco (A a K), em docs/roteiro/.
- Cada texto com um ID estável no formato BLOCO.SUBBLOCO.NÚMERO
  (ex.: C4.NHARA.07), porque será localizado para inglês.
- Tabelas com colunas: ID | Contexto (onde aparece, docs/11) | Gatilho |
  Texto PT-BR | Limite de palavras | Observação para o tradutor.
- Lista "Decisões novas" ao fim de cada arquivo com tudo que você inventou
  que não estava no plano.
- Lista "Conflitos encontrados" se algo no plano se contradizer; não
  resolva sozinho, aponte.

════════════════════════════════════════════════════════════════════════
5. CHECKLIST ANTES DE ENTREGAR
════════════════════════════════════════════════════════════════════════

[ ] Nenhum texto passa de 60 palavras (R1); nenhum balão passa de 2 linhas.
[ ] Nenhuma palavra proibida do glossário (run, vitória, morte, game over,
    menu, upgrade, gema, checkpoint, zumbi, NG+, mutator, roguelike).
[ ] Nenhum nome de nó de pesquisa é um nome de estatística.
[ ] Toda Memória funciona lida isoladamente.
[ ] Nenhum texto afirma a cosmologia diretamente (R9).
[ ] Cada NPC é reconhecível pela voz sem ver o nome.
[ ] Cada Vigilante tem exatamente 25 falas pós-Vigília com destinatário.
[ ] As 12 frases secretas estão escondidas em Memórias existentes.
[ ] Toda referência mecânica foi conferida contra docs/02, 03, 04, 08.
[ ] IDs únicos e estáveis em todos os textos.

Comece pelo Bloco B (os sete NPCs), porque a voz deles define o resto.
Entregue o Bloco B para aprovação antes de seguir.
```

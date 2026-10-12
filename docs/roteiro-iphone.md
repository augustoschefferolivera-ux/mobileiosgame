# Roteiro do iPhone (build de teste da F-007, com a arte da F-011)

Este roteiro é da Q-29 do brief ("build de teste em iPhone real logo depois da F-006") e da VT10 de `design/decisoes-F-006.md`. Não é evidência do `verify`: a execução no aparelho é sua. O build é o de **debug** (aceita os parâmetros de URL abaixo), publicado pelo workflow `.github/workflows/pages-teste.yml` ou servido por `npm run build:debug` e `npx vite preview --outDir dist-debug`.

## Antes de começar

1. Ative o GitHub Pages do repositório com a fonte **GitHub Actions** (Settings > Pages) e rode o workflow **Pages de teste** (Actions > Run workflow). Repositório privado exige plano pago. A política de branches do ambiente `github-pages` pode aceitar só a branch padrão, e o botão de rodar só aparece com o arquivo na branch padrão (não foi possível verificar aqui).
2. O Pages publica um build de debug (parâmetros de URL e ganchos de escrita) numa URL pública. Despublique depois do teste.
3. No iPhone: Low Power Mode **desligado**, brilho no máximo, Safari (ou a tela inicial, se instalada), retrato. Para áudio, a chave de silêncio na posição de som, depois com ela em silêncio (item 7).
4. Todos os endereços abaixo vão depois da URL do Pages. Com `debug=1` o painel mostra fps, `maxToques` e `toquesPerdidos`.

## O que conferir

| # | Conferência | Como | Passa quando |
|---|---|---|---|
| 1 | Toques | `?debug=1`, tocar com 3 a 5 dedos e soltar | `entrada.maxToques` chega a 5 e `toquesPerdidos` fica em 0 |
| 2 | `TouchEvent.timeStamp` | `?debug=1`, um swipe e um toque duplo | a diferença entre o `timeStamp` do toque e o `performance.now()` fica abaixo de 60.000 ms (a heurística do tradutor). Se passar, swipe e toque duplo não funcionam no aparelho; a saída é o listener gravar `performance.now()` no lugar do `timeStamp` (decisão da F-010, D6 §10) |
| 3 | F-003.4 literal | `?cenario=horda&teto=300&debug=1`, 30 s; depois o mesmo com `?cenario=horda_com_ataques&teto=300&debug=1` | fps ≥ 55 nos 30 s, nas duas |
| 4 | Render | `?render=image` e `?buffer=dinamico` contra o padrão (`gpu`) | a mesma imagem e o fps do padrão ou melhor |
| 5 | Esquiva e aparo | jogo normal e `?cenario=oco_grande_sozinho`, `?cenario=novica_sozinha` | o swipe de 400 pt/s esquiva; anote as esquivas sem querer (94% das inversões rápidas do joystick viram esquiva nos traços sintéticos, 83% com janela de 50 ms) e a sensação do aparo, que é o critério de sucesso do marco (brief §9) |
| 6 | ProMotion | jogo normal, `debug=1` | o jogo não perde esquiva nem aparo em quadros sem passo; sem tremor |
| 7 | Áudio | os sons da esquiva, do aparo e do telegrafo, com a chave de silêncio nas duas posições e com a pausa | toca com som ligado, cala com a chave em silêncio; a pausa muda o som |
| 8 | Cerco e sobreposição | `?cenario=horda_com_ataques` | reavaliar a sobreposição visual (S2) e o cerco (S4) da D3 §9 |
| 9 | Toque duplo e arrasto | toque duplo seguido de arrasto (doc 12 §2.6) | a esquiva sai na direção do arrasto e o joystick segue |
| 10 | Morrer | jogar normal até o HP chegar a 0 (sem esquivar de propósito); depois `?inicio=19:00` parado | o jogo mostra "Você se apaga." em câmera lenta (≈ 1 s) e abre o Resultado sem toque; parado a 19:00 morre em ≈ 4 a 5 s (medido no contêiner: 230 a 246 passos). Anote o tempo e se a câmera lenta parece longa ou curta |
| 11 | Dois polegares | joystick e botão Aparo ao mesmo tempo | alcança os dois sem trocar a mão |
| 12 | Glifo do tutorial | `?inicio=00:00` sem `?tutorial=0` | o ⟲ aparece no texto do tutorial de esquiva |
| 13 | Aparo pelo anel | `?cenario=novica_sozinha&visto=mover,esquiva`; 10 tentativas | conte os aparos bem-sucedidos reagindo ao anel sólido; anote o número |
| 14 | Pausa | segurar joystick e Aparo por 0,5 s | a pausa não abre (B §3.5; AP1) |
| 15 | Frasco | `?cenario=sem_horda`; esperar o HP baixar (ou receber dano de `?cenario=horda_com_ataques`), tocar no botão do Frasco (72 pt acima do Aparo) | a cura corre ≈ 2 s e o trecho claro some da barra; um golpe maior que 15% do HP máximo a interrompe; as 3 marcas de carga baixam uma a uma. Anote se o botão é alcançável com o polegar junto do Aparo |
| 16 | Segurar o Frasco | com a cura em curso, segurar um 2º toque no botão por 0,3 s | a cura cancela (a carga não volta); um toque curto não cancela. Anote se cancela sem querer |
| 17 | HP, vinheta e Brasa Firme | `?cenario=horda_com_ataques`, levar golpes | o número do HP sob a barra é legível; o retardo da perda (vinho) é visível; a vinheta de acerto não incomoda e respeita Flashes; com stamina acima de 50% o dano é 20% menor (sensação) |
| 18 | HUD de Almas | `?almas=1240` | "1.240 Almas" legível no canto esquerdo, abaixo das vagas, sem encostar no polegar; some na pausa e no Resultado |
| 19 | Resultado | morrer (item 10) | cinco linhas (Tempo, Nível, Mortes causadas, Dano recebido, Almas), a linha da mancha em lilás e os dois botões de 72 pt; "Repetir Vigília" abre outra Vigília com seed nova |
| 20 | Mancha | `?inicio=19:00&almas=1000`, andar um pouco e morrer; Repetir | a seta lilás aponta a mancha na borda da tela; chegando perto aparece o anel de brasa e encostar devolve 300 Almas. Anote se a seta e o anel são claros |
| 21 | Pausa e Abandonar | abrir a pausa com a build cheia (11 linhas, depois de vários níveis) | estatísticas e o aviso do Abandonar não cobrem a build; Abandonar pede um 2º toque e leva metade das Almas, sem mancha. Confirme também em tela pequena (iPhone SE: 375 × 667), se houver |
| 22 | Save no aparelho | morrer com `?almas=1000`, fechar o Safari, abrir de novo sem `?almas` | o meta (mancha) persiste; em janela privada o jogo roda e não grava (SV8) |

Dica: `?flash=segurar` mantém o flash branco do aparo na tela para ver a intensidade; `?tutorial=0` pula os três tutoriais.

## Arte (F-011)

A arte é toda em pixel (1 px de arte = 2 pt) e não muda o jogo: o que se confere é leitura, escala e fluidez no aparelho. As regras estão em `design/arte/style-card.md`; as capturas de referência, em `production/evidencias/F-011/`.

| # | Conferência | Como | Passa quando |
|---|---|---|---|
| A1 | Nitidez | `?cenario=horda&debug=1`, olhar de perto e tirar uma captura de tela | bordas de pixel nítidas, sem borrão nem pixel de tamanho diferente nos corpos (a Retina de 3× mostra cada pixel de arte com 6 × 6 pixels da tela) |
| A2 | Achar o Aldric | `?cenario=horda_com_ataques` | o Aldric (48 pt, capa escura e brasa no peito) é encontrado em menos de 1 s no meio da horda; a luz âmbar em volta dele aparece no chão. Anote se a luz incomoda ou falta |
| A3 | Escala e facções | `?cenario=horda_com_ataques` | Oco das Lanternas (32 pt, musgo, lanterna), Oco Grande (48 pt, largo, braço-clava) e Noviça de Sal (48 pt, triângulo preto e osso) distinguíveis à primeira vista; nenhum parece pickup |
| A4 | Animação | andar em círculos no jogo normal; depois parar | o passo do Aldric aparece (o corpo sobe e desce), sem tremor na troca de quadro; parado ele respira; a horda não anda em sincronia; os inimigos olham para o Aldric |
| A5 | Armas | `?cenario=tres_armas&tutorial=0`; depois `?cenario=bau_uniao` e encostar no baú depois das 10:00 | a faca de Sal aponta para onde voa (16 direções), o golpe é um arco de brasa com o fio amarelo e a estocada uma lança de brasa, os grãos de sal do Círculo giram e o pulso se apaga; a Lâmina do Juramento Eterno tem o arco mais grosso e solta a onda de brasa |
| A6 | Ataques dos inimigos | `?cenario=oco_grande_sozinho` e `?cenario=novica_sozinha` | o corpo "inspira" com a silhueta branca antes do golpe; a cunha e a faixa no chão e os projéteis de Sal são brancos e lisos (sem contorno). Anote se a cunha sólida cobrir o Aldric a ponto de atrapalhar (revisão da etapa 3, item 7) |
| A7 | Efeitos | jogo normal com a build cheia; aparar; beber o Frasco (`?cenario=sem_horda`); morrer (item 10) | faíscas no acerto na cor da arma, a cinza dos mortos em 3 quadros, o anel de faíscas do aparo, as brasas do Frasco subindo e, no Apagar, o Aldric ajoelhando e virando cinza; nada disso derruba o fps |
| A8 | Marcadores | `?cenario=horda_com_ataques`, atordoar (aparo) e salgar (Círculo de Sal) | a estrela do Atordoado e o cristal do Sal ficam acima da cabeça sem cobrir o rosto, legíveis com dezenas de inimigos ao mesmo tempo |
| A9 | HUD em pixel | jogo normal e `?cenario=horda_com_ataques` | joystick, botões Aparo e Frasco e o botão de pausa nítidos; os ícones das vagas e "Almas" legíveis sobre a horda (fundo e traço de pedra) |
| A10 | Chão e rochas | jogo normal, andar até a borda do mapa | o chão não pisca nem mostra emenda que distraia; as rochas leem como obstáculo (tampo claro, frente escura, musgo na borda) |
| A11 | Acender e Resultado | abrir o jogo; morrer (item 10) | o Aldric grande respira na tela de Acender com a luz da brasa; no Resultado ele aparece ajoelhado virando cinza |
| A12 | Desempenho com a arte | itens 3 e 4 de novo | fps ≥ 55 com `teto=300`; `?render=image` dá a mesma imagem que o padrão |

## O que anotar

Para cada item: passou, passou com ressalva ou não passou, o modelo do aparelho, a versão do iOS e o fps do painel. Os itens 2, 5 e 13 decidem ajustes da F-010; os 10, 15, 16 e 20 decidem ajustes da F-007 (câmera lenta, Frasco, segurar e a mancha); os itens 3 e 4 decidem o TETO no aparelho; os itens A1 a A12 decidem os ajustes da arte (F-011).

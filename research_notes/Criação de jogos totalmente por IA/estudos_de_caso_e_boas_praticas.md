# Criação de jogos (quase) totalmente por IA: estudos de caso reais e boas práticas (estado em outubro/2026)

Nota metodológica: as buscas foram feitas em 10/10/2026. O acesso direto às páginas (WebFetch/curl) foi bloqueado pelo proxy do ambiente (403 em CONNECT), e a cota compartilhada de buscas na web se esgotou antes da última rodada de verificação. Portanto, os fatos abaixo vêm dos resumos de resultados de busca (com URL da fonte original), e não da leitura integral de cada página. Itens que não puderam ser confirmados estão listados em "Gaps". Fatos anteriores a 2025 estão marcados como [background].

---

## Pergunta 1 — Quais jogos/protótipos notáveis foram feitos ~100% com IA em 2025–2026, e qual foi o resultado (receita, downloads, notas, críticas)?

### Takeaway
Os casos "quase 100% IA" com números públicos são poucos e quase sempre autodeclarados: fly.pieter.com (Pieter Levels) é o único com receita relevante documentada, e mesmo ela é inconsistente entre fontes (de US$ 1 M ARR autodeclarado em 17 dias a US$ 144 K ARR dois meses depois). O restante (Vibe Jam, demos de Claude Opus 5, jogos no Reddit feitos "só com Claude Code", plataformas como Astrocade) demonstra viabilidade técnica de protótipos web 2D/3D leves, mas não há nenhum caso verificado de jogo 100% IA com sucesso comercial na Steam ou na App Store até out/2026.

### Cited Findings

**fly.pieter.com (Pieter Levels / levelsio) — simulador de voo multiplayer em Three.js, "vibe coded"**
- Levels começou a construir o jogo em 22/02/2025, majoritariamente ao vivo no X, e afirma que alcançou US$ 1 M de ARR em 17 dias; o próprio post o descreve como "my first vibecoded flight simulator" e como um jogo multiplayer com backend Python/websockets feito com IA — [levels.io](https://levels.io/full-multiplayer-python-websockets-game-ai)
- 404 Media relata que a versão inicial foi feita em ~30 minutos com ferramentas de IA e que, segundo o criador, fatura cerca de US$ 50.000/mês; o título da matéria avisa: "yours probably won't" — [404 Media](https://404media.co/this-game-created-by-ai-vibe-coding-makes-50-000-a-month-yours-probably-wont)
- Outra cobertura fala em 180 minutos de construção e US$ 87.000 em um mês, com projeção de US$ 100 K — [VGTimes](https://vgtimes.com/tech-and-hardware/122582-dutch-startup-founder-creates-game-using-ai-in-180-minutes-and-earns-87000-in-one-month.html)
- Snapshot de maio/2025: US$ 12.000 MRR / US$ 144.000 ARR, receita vinda de compras de aeronaves no jogo e anúncios — [Indie Hackers](https://www.indiehackers.com/post/2NUIOp80SUWuPmmfKoS9); contradito por um roundup de 2026 de um fornecedor de ferramenta (viés comercial) que lista US$ 138 K MRR — [Sorceress.games](https://sorceress.games/blog/real-vibe-coding-apps-what-indies-built-in-2026)
- Monetização: compras in-game e publicidade; uma das coberturas afirma que a maior parte vem de anúncios — [Xataka Móvil](https://www.xatakamovil.com/futuro/este-juego-ridiculamente-simple-le-esta-dando-a-su-creador-50-000-dolares-al-mes-se-hizo-ia-30-minutos)

**Vibe Jam 2025 / 2026 (jams de jogos "vibe coded")**
- A página de imprensa do Vibe Jam descreve a edição inaugural (2025) como evento viral com mais de 1.000 submissões no primeiro mês, julgado por Andrej Karpathy e levelsio junto a um painel de desenvolvedores; prêmios de US$ 17.500 (US$ 10.000 / 5.000 / 2.500); arquivo em vibej.am/2025 — [vibej.am/2026/press](https://vibej.am/2026/press)
- Um recap separado descreve um jam organizado por levelsio em julho/2025 com 1.170 submissões, julgamento por votação pública no Twitter mais painel de convidados, e categorias "most fun", "best vibe", "most innovative use of AI" e "community pick" — [vibecoding.app](https://vibecoding.app/ai-events/recap/pieter-levels-vibe-code-game-jam-2025). As fontes divergem sobre se este é o mesmo evento do vibej.am.
- Vibe Jam 2026 ("Cursor Vibe Jam 2026") ocorreu de 1/abr a 1/mai/2026 com prêmios de US$ 40.000 — [Summer Engine](https://www.summerengine.com/jam); [vibej.am/2026/press](https://vibej.am/2026/press)
- Houve jams derivados: "2025 Orange Vibe Jam" (web3) — [Orange](https://orange-web3.notion.site/2025-Orange-Vibe-Jam-FAQs-1c4e3ff19938808e8e74dbbd1aac63a7); e o VibeBlitz game jam, cujo primeiro vencedor foi "Idle Tactics" — [IT Brief UK](https://itbrief.co.uk/story/vibeblitz-game-jam-crowns-idle-tactics-as-first-winner)

**Demos e jogos feitos com Claude (Claude Code / Claude Opus 5)**
- Matt Shumer publicou em 25/07/2026, dois dias após o lançamento do Claude Opus 5, um FPS jogável que o modelo construiu sozinho, segundo ele "sem assets externos"; o prompt tinha três parágrafos (publicado no GitHub), pedia qualidade "nível Call of Duty", usava subagentes e fazia loop contra um crítico severo até sobreviver a uma comparação cega lado a lado com footage real — [Decrypt](https://decrypt.co/374560/dumbest-ai-prompt-claude-beat-careful-game-design)
- Detalhes técnicos citados: roda no navegador com Three.js/WebGL2, ~55.000 linhas de código em 11 subsistemas; o log do crítico mostrou a nota subindo de 3,59/10 para pouco acima de 5, ainda abaixo do jogo real; o método foi batizado de "Gauntlet Loop" (dividir o trabalho entre críticos "frescos" e nunca deixar o construtor avaliar o próprio trabalho); terceiros reexecutaram o prompt e confirmaram — [edgeX (cópia sindicada do Decrypt)](https://pro.edgex.exchange/en-US/news/article/claude-opus-5-one-shots-fps-game-gauntlet-loop); [Digg](https://digg.com/tech/fd8xb53d)
- Post no Reddit (julho/2026): shooter de slimes com jogo e arte feitos "somente com Claude Code"; o autor diz que NÃO está na Steam ("yet??") e que é remake de um jogo antigo dele no itch.io — [Reddit (snapshot)](https://reddit.sentinel-team.org/posts/1v00q2p/snapshots/2026-07-20T20%3A24%3A21.6759Z)
- "Spell Cascade": roguelite em Godot de um desenvolvedor não-engenheiro que declara "100% of code generated by Claude Code"; receita reportada de US$ 4,99 em 30 dias — [Medium (chierhu)](https://chierhu.medium.com/claude-code-for-game-development-7a88fcd19992)
- O mesmo levantamento afirma que o Claude Code funciona melhor em jogos 2D, orientados a lógica e definidos em texto/código, e que Unity e Unreal são mais difíceis — [Medium (chierhu)](https://chierhu.medium.com/claude-code-for-game-development-7a88fcd19992)
- A Anthropic publicou uma sessão "Code with Claude" intitulada "Era Online: Resurrecting a 1999 MMORPG with Claude Code" (só o título foi verificado) — [claude.com](https://claude.com/it/code-with-claude/session/sf-ext-era-online-resurrecting-a-1999-mmorpg-with-claude-code)
- Relato "How We Built a Full Browser Game in Two Evenings with Claude" — [gonzoml.substack.com](https://gonzoml.substack.com/p/how-we-built-a-full-browser-game); TechRadar mostra um "Super Mario-like" personalizado gerado em segundos com Claude, jogável de graça — [TechRadar](https://www.techradar.com/computing/artificial-intelligence/i-built-a-personalized-version-of-super-mario-like-game-in-seconds-using-claude-and-you-can-play-it-right-now-for-free-heres-how-you-can-create-your-own-game-without-coding)

**Plataformas "texto → jogo" (Rosebud AI, Astrocade, Bitmagic)**
- Rosebud AI: criador de jogos por IA (jogos 3D e histórias interativas sem código, assistente "Rosie"); estágio seed, última rodada em outubro/2025, investidores Khosla Ventures, Lux Capital, Y Combinator, Amplify Partners e Foothill Ventures — [VCBacked](https://www.vcbacked.co/company/rosebud-ai). Uma análise de concorrente (viés declarado) diz que serve para protótipos rápidos, mas é limitada para "uma página na Steam, um jogo 3D de verdade, um produto vendável" — [Summer Engine](https://www.summerengine.com/de/blog/is-rosebud-ai-worth-it)
- Astrocade: anunciou US$ 56 M (Series B liderada por Sequoia Capital e Sea) em maio/2026; afirma >20 milhões de "usuários engajados" em 8 meses e "várias centenas de milhões" de plays mensais — [Pulse 2.0](https://pulse2.com/astrocade-56-million-raised-to-build-ai-powered-interactive-entertainment-platform/); [Dentsu](https://www.group.dentsu.com/en/news/release/001671.html). Um perfil cita números diferentes da Fortune: 5 M MAU, 140 M plays/mês, 75.000+ jogos — [yespress.io](https://yespress.io/astrocade.md). Um time coordenado de agentes generativos cuida de arte, som, mecânicas e UI, transformando uma frase em jogo jogável em minutos — [komo.ai](https://komo.ai/directory/astrocade). Há programa de incentivo de US$ 10 M pagando por play; alguns criadores "já ganham milhares de dólares/mês" (autodeclarado) — [SuperDataScience ep. 997](https://superdatascience.com/997). Agente proprietário "AstroBrain"; fundadores Amir e Ali Sadeghian (IA/matemática, não game dev) — [Pulse 2.0](https://pulse2.com/astrocade-56-million-raised-to-build-ai-powered-interactive-entertainment-platform/amp/)
- Bitmagic (Helsinki): seed de US$ 4 M liderado por Korea Investment Partners com participação da Supercell, para jogos 3D jogáveis a partir de texto — [CO/AI](https://getcoai.com/news/bitmagic-secures-4m-for-text-to-3d-game-platform); produto Bitmagic Mini (engine WebGL no navegador, free tier; modo Sandbox planejado) — [neuronfeed](https://neuronfeed.com/startups/bitmagic); pivotou de um conceito de RPG em 2023 — [AI Gamechangers](https://aigamechangers.substack.com/p/there-will-be-ai-tools-and-ai-assistance)

**Demos de big tech (contexto)**
- Google DeepMind lançou o Genie 3 em 05/08/2025: modelo de mundo que gera ambientes 3D exploráveis em tempo real (24 FPS) consistentes por vários minutos; o acesso público veio em 29/01/2026 via Project Genie para assinantes AI Ultra nos EUA, com sessões limitadas a 60 segundos e cenários não fotorrealistas — [9to5Google](https://9to5google.com/2026/01/29/google-project-genie/); [Ultralytics](https://ultralytics.com/blog/google-deepmind-unveils-genie-3); [heise](https://heise.de/-11160043)

### Inferences
- A trajetória do fly.pieter.com (US$ 1 M ARR anualizado em pico viral de março/2025 → US$ 144 K ARR em maio/2025) sugere que a receita de jogos "vibe coded" virais é majoritariamente um pico de atenção, não receita recorrente; a própria 404 Media enquadra assim.
- O caso Shumer é o melhor dado público sobre "teto de qualidade" de um pipeline zero-humano: mesmo com loop de crítico e ~55 K linhas, a autoavaliação chegou a ~5/10 contra referência AAA.
- Todos os casos com tração são web/HTML5 (Three.js/WebGL) ou 2D leve; nenhum é um jogo nativo iOS com números verificáveis.

### Gaps
- Não foi possível confirmar os nomes dos vencedores do Vibe Jam 2025 nem do Cursor Vibe Jam 2026 (busca não realizada por cota esgotada; vibej.am não acessível). Verificar em vibej.am/2025.
- Não encontrei jogos específicos do showcase da Rosebud AI com dados de recepção.
- Não foi possível ler o post original do levels.io para detalhes de ferramentas (Cursor/Grok/Claude), bugs, trapaças e custos de servidor.
- Nenhum jogo na Steam com pipeline declaradamente 100% IA e vendas verificáveis foi encontrado.
- "Claude Plays Pokémon" e demos de Gemini construindo jogos: não pesquisados por cota esgotada.

---

## Pergunta 2 — Experimentos de estúdios/indústria e números de pesquisas (GDC, Google, Unity)

### Takeaway
O único experimento de "jogo só com IA" de um grande fornecedor (Keywords Studios, Project Ava, 2023) concluiu que a tecnologia "não conseguiu substituir talento" e precisou de equipes de sete estúdios [background]; em 2025–2026 as grandes empresas investem em IA para NPCs (Ubisoft Teammates), QA (Square Enix, meta de 70% até 2027) e assets (Activision, Embark), enquanto a opinião dos desenvolvedores piora: 52% dizem que a GenAI prejudica a indústria (GDC 2026), contra 30% em 2025 e 18% em 2024.

### Cited Findings

**Keywords Studios — Project Ava [background, 2023–2024]**
- Projeto de P&D de seis meses iniciado na Electric Square Malta para testar se GenAI construiria sozinha um jogo 2D; avaliou mais de 400 ferramentas; a empresa acabou usando "bench resource" de sete estúdios porque a ferramenta "was unable to replace talent"; o jogo não será lançado; divulgado no relatório anual em março/2024 — [Game Developer/Gamasutra](https://www.gamasutra.com/production/keywords-tried-to-make-a-game-using-genai-but-said-the-tech-was-unable-to-replace-talent-); [PCGamesInsider](https://www.pcgamesinsider.biz/news/74358/keywords-tried-making-game-with-generative-ai-failed); [SI Videogames](https://videogames.si.com/news/keywords-studios-ai-game-development)
- Conclusão do CEO: GenAI pode simplificar ou acelerar certos processos, mas "the best results and quality needed can only be achieved by experts in their field utilizing GenAI as a new, powerful tool" — [Exputer](https://exputer.com/news/industry/keywords-game-genai-talent/)

**Ubisoft — Teammates (2025–2026)**
- Protótipo de pesquisa jogável na engine Snowdrop, sucessor do Neo NPC (2024): FPS com dois companheiros de IA (Pablo e Sofia) e assistente "Jaspar", controlados por voz; equipe de 80 pessoas; usa Google Gemini e middleware interno — [Hitmarker](https://hitmarker.net/news/ubisoft-reveals-teammates-a-generative-ai-experiment-featuring-voice-controlled-npcs-1582502); [MobileSyrup](https://mobilesyrup.com/2025/11/28/ubisoft-unveils-ai-powered-teammates-project/)
- Nos resultados fiscais 2025-26 a Ubisoft chamou o Teammates de "first playable Generative AI experience" e confirmou desenvolvimento; relatório de maio/2026 fala em aumentar investimentos no projeto — [VGC](https://videogameschronicle.com/news/ubisoft-new-assassins-creed-far-cry-ghost-recon-playable-gen-ai-experience); [Players.com.ua](https://players.com.ua/en/news/ubisoft-expands-ai-investments-and-confirms-new-assassin-s-creed-and-far-cry-games/)
- Recepção nas redes descrita como "pretty negative", com jogadores preocupados com qualidade — [Digital Trends](https://www.digitaltrends.com/gaming/ubisoft-wants-a-comeback-with-assassins-creed-far-cry-ghost-recon-one-ai-experiment-that-has-players-worried/)

**Square Enix, Krafton, EA**
- Square Enix (nov/2025): meta de 70% do trabalho de QA e debugging feito por GenAI até o fim de 2027, em projeto conjunto com o Matsuo-Iwasawa Lab (Universidade de Tóquio), equipe de mais de dez pessoas — [VGC](https://www.videogameschronicle.com/news/square-enix-says-it-wants-generative-ai-to-be-doing-70-of-its-qa-and-debugging-by-the-end-of-2027/); [Push Square](https://www.pushsquare.com/news/2025/11/square-enix-wants-70percent-of-its-qa-and-debugging-work-done-by-gen-ai); [Hitmarker](https://hitmarker.net/news/square-enix-aims-to-automate-70-of-its-qa-and-debugging-with-ai-by-2027-1566266)
- Cobertura relacionada cita EA em parceria com a Stability AI para ferramentas generativas e a Krafton se declarando "AI-first company" — [Nintendo Wire](https://nintendowire.com/news/2025/11/06/square-enix-is-looking-to-replace-70-of-its-qa-team-with-generative-ai-by-the-end-of-2027/); um veículo brasileiro cita US$ 70 M de investimento da Krafton (não confirmado em fontes em inglês) — [Hardware.com.br](https://www.hardware.com.br/noticias/square-enix-automatizar-testes-jogos-com-ia/amp/)

**Activision — Call of Duty: Black Ops 6 e 7**
- No lançamento do Black Ops 7 (nov/2025), fãs apontaram "calling cards" (inclusive em estilo Studio Ghibli) como IA; a Activision confirmou uso de GenAI, mas se recusou a confirmar as imagens específicas; a página na Steam diz apenas "uses generative AI tools to help develop some in game assets" — [MP1st](https://mp1st.com/news/activision-responds-to-ai-claims-in-black-ops-7); [VGC](https://www.videogameschronicle.com/news/it-honestly-sucks-fans-think-call-of-duty-black-ops-7-is-filled-with-generative-ai-art); [Outlook Respawn](https://respawn.outlookindia.com/gaming/gaming-news/black-ops-7-activision-confirms-ai-use-after-fan-backlash-over-art)
- Em fevereiro/2025 a Activision já havia admitido GenAI no Black Ops 6 (loading screen do "zombie Santa" chamado de "AI slop") — [MP1st](https://mp1st.com/news/activision-responds-to-ai-claims-in-black-ops-7)
- Há relato (só manchete verificada) de que a Steam concedeu reembolsos a jogadores citando uso "egrégio" de IA; o deputado Ro Khanna pediu regulação — [Notebookcheck](https://www.notebookcheck.net/Steam-is-issuing-refunds-for-Call-of-Duty-Black-Ops-7-to-players-citing-egregious-AI-use.1171206.0.html); [Checkpoint Gaming](https://checkpointgaming.net/news/2025/11/black-ops-7-launch-misfires-with-ai-backlash-and-disasterous-sales/)

**Embark Studios — ARC Raiders (vozes por IA)**
- Jogo foi um sucesso (pico de quase 500 mil jogadores na Steam), mas as vozes TTS foram criticadas como "flat" e por questões éticas — [Top Gear](https://www.topgear.com/car-news/gaming/extraction-shooter-arc-raiders-already-a-hit-its-ai-voice-acting-has-ruffled-some)
- O CEO Patrick Söderlund disse que a Embark regravou algumas linhas pós-lançamento com atores reais, que há menos linhas de IA do que no lançamento e admitiu diferença de qualidade ("A real professional actor is better than AI, that's just how it is"); justificativa: "test 15 different lines without recording them, and then we know what to record" — [PCGamesN](https://www.pcgamesn.com/arc-raiders/ai-voices-replaced); [ScreenHub](https://www.screenhub.com.au/news/games/arc-raiders-ai-voice-actors-replaced-2695984/)
- A Embark paga atores pelo tempo de estúdio e licencia voz para TTS em linhas "menos essenciais à imersão" (sobretudo áudio do sistema de ping); não se comprometeu a remover toda a IA — [Hitmarker](https://hitmarker.net/news/embark-studios-defends-and-explains-its-use-of-ai-in-arc-raiders-ahead-of-launch-1561355); [Windows Report](https://windowsreport.com/embark-replaces-ai-dialogue-in-arc-raiders-with-human-voice-actors-after-controversy/)

**Pesquisas de indústria**
- GDC State of the Game Industry 2026 (publicado 29/01/2026, >2.300 profissionais): 52% dizem que GenAI tem impacto negativo (30% em 2025, 18% em 2024); 36% usam GenAI no trabalho; 30% nos estúdios vs 58% em publishers/suporte/marketing; ferramentas: ChatGPT 74%, Google Gemini 37%, Microsoft Copilot 22%; uso mais comum: pesquisa/brainstorming (81%), majoritariamente tarefas não criativas; 28% foram demitidos nos últimos dois anos (33% nos EUA) — [BusinessWire](https://www.businesswire.com/news/home/20260129438528/en/2026-State-of-the-Game-Industry-Report-Reveals-Widening-Effect-of-Layoffs-Broader-Perspectives-on-Generative-AI-Unionization-Tariffs-and-More); [GDC](https://gdconf.com/article/gdc-2026-state-of-the-game-industry-reveals-impact-of-layoffs-generative-ai-and-more/); [GamesBeat](https://gamesbeat.com/state-of-game-industry-survey-sheds-light-on-layoffs-genai-views-unionization-and-tariffs-gdc-survey/); [Hitmarker](https://hitmarker.net/news/over-50-of-game-developers-say-generative-ai-is-harming-the-industry-report-reveals-1635057)
- GDC 2025 (>3.000 devs, ±2%): 30% viam impacto negativo (+12 pontos); visão positiva caiu de 21% para 13%; 52% trabalham em empresas que implementaram GenAI e 36% usam pessoalmente; 27% não usam nem planejam; preocupações: roubo de PI, consumo de energia, queda de qualidade, viés, regulação — [BusinessWire](https://www.businesswire.com/news/home/20250121745145/en/The-2025-Game-Industry-Survey-Reveals-Increasing-Impact-Of-Layoffs-Concerns-With-The-Usage-Of-Generative-AI-Funding-Challenges-and-More); [Game Developer](https://www.gamedeveloper.com/business/gdc-2025-state-of-the-game-industry-devs-weigh-in-on-layoffs-ai-and-more); [GameDev Reports](https://gamedevreports.substack.com/p/gdc-the-state-of-the-game-industry)
- Google Cloud / The Harris Poll (18/08/2025; 615 devs em EUA, Coreia do Sul, Noruega, Finlândia e Suécia): ~90% já usam IA em algum ponto do fluxo; preocupações: propriedade de dados (63%), privacidade do jogador (35%), propriedade do conteúdo gerado (32%); agentes de IA para otimização de conteúdo (44%) e comportamento de NPC (34%) — [Google Cloud Press Corner](https://www.googlecloudpresscorner.com/2025-08-18-90-of-Games-Developers-Already-Using-AI-in-Workflows%2C-According-to-New-Google-Cloud-Research); [Gigazine](https://gigazine.net/gsc_news/en/20250819-games-developers-using-ai-workflows)
- Um "Game Developer Survey 2025" (publisher não identificado, listagem secundária) reporta queda no uso de GenAI para criação de conteúdo: -7% em equipes pequenas e -5% em grandes — [Game Industry Library](https://gameindustrylibrary.com/library?page=103)

### Inferences
- A divergência entre "90% usam IA" (Google, amostra pró-adoção) e "36% usam GenAI" (GDC) reflete definições diferentes (IA em geral vs GenAI) e amostras diferentes; para um indie, o dado útil é que o uso real em estúdios (30%) é bem menor que em publishers/marketing (58%).
- O padrão dos grandes estúdios é "IA nos bastidores" (QA, testes de linhas, protótipos de NPC) e recuo rápido quando a IA fica visível ao jogador (Arc Raiders, CoD, The Alters).

### Gaps
- Não foi possível ler o relatório GDC 2026 completo (diferenças indie vs AAA, políticas internas de IA).
- Não encontrei relatório oficial da Unity sobre uso de GenAI em 2025/2026.
- Netflix Games e Embark (além de vozes) não foram pesquisados por falta de cota.

---

## Pergunta 3 — Qual teto de qualidade os praticantes relatam para jogos "puro IA" e quais técnicas o elevam?

### Takeaway
As evidências convergem: pipelines zero-humano param em protótipo jogável de qualidade mediana (o próprio crítico automatizado de Shumer deu ~5/10 contra referência AAA; a Keywords precisou de sete estúdios); o que eleva a qualidade é curadoria humana forte, ambiente que a IA consiga rodar e testar sozinha (headless/CLI), documentos de decisão explícitos (CLAUDE.md, personas com autoridade), loops de crítica separados do construtor, e, na arte, âncoras de estilo (LoRA, sheets de personagem, seeds fixos) em vez de prompts soltos.

### Cited Findings

**Teto observado**
- Shumer/Opus 5: log do crítico subiu de 3,59/10 para pouco acima de 5, "still falling short of the real game", mesmo com ~55 K linhas e 11 subsistemas — [edgeX/Decrypt](https://pro.edgex.exchange/en-US/news/article/claude-opus-5-one-shots-fps-game-gauntlet-loop)
- Keywords: "the best results and quality needed can only be achieved by experts in their field utilizing GenAI" [background] — [Exputer](https://exputer.com/news/industry/keywords-game-genai-talent/)
- Embark admite diferença de qualidade entre TTS e ator profissional — [PCGamesN](https://www.pcgamesn.com/arc-raiders/ai-voices-replaced)
- Claude Code: melhor em jogos 2D, lógicos, definidos em texto/código; Unity e Unreal mais difíceis — [Medium (chierhu)](https://chierhu.medium.com/claude-code-for-game-development-7a88fcd19992)
- Um dev relata que o Claude "não tinha grounding suficiente nas peculiaridades do Godot", migrou para MonoGame e depois Zig + SDL2 por sugestão do próprio Claude; um resumo posterior diz que voltou a um front-end Godot 4.x com core de simulação em Zig — [mrphilgames.substack.com](https://mrphilgames.substack.com/p/how-i-use-claude-like-a-junior-dev)
- Dev de Unity com Photon Fusion (multiplayer) reportou resultados inúteis e consumo excessivo de tokens; usuário de Unreal: "you have to know what the issue is in order for claude to fix it", e o dev acaba como diretor criativo e playtester — [Reddit (snapshot, abr/2026)](https://reddit.sentinel-team.org/posts/1sggzzw/snapshots/2026-04-09T16%3A41%3A00.47446Z)
- Um desenvolvedor abandonou um RTS em que o Claude escreveu todo o código porque perdeu contato com a base de código e não conseguia mais corrigi-la — relato da DEV Community citado em [Medium (chierhu)](https://chierhu.medium.com/claude-code-for-game-development-7a88fcd19992)

**Técnicas que elevam a qualidade (código/design)**
- "Gauntlet Loop" (Shumer): subagentes construtores + críticos independentes e "frescos", com critério objetivo (comparação cega com footage real); nunca deixar o construtor avaliar o próprio trabalho — [edgeX/Decrypt](https://pro.edgex.exchange/en-US/news/article/claude-opus-5-one-shots-fps-game-gauntlet-loop)
- Godot headless: CLI do Godot + GitHub Actions + Docker permitiram que o Claude rodasse o ciclo completo sem GUI; personas de PM e de jogador como agentes ajudaram o Claude a decidir sozinho; "explicit decision authority reduced friction significantly" — [thebrandonwu.substack.com](https://thebrandonwu.substack.com/p/building-a-visual-novel-with-claude)
- CLAUDE.md: o conselho mais repetido nos relatos é que tempo investido escrevendo o CLAUDE.md volta em menos correção de código gerado — [Claude Code Decoded](https://echov4ult.beehiiv.com/p/claude-code-decoded); [Medium (chierhu)](https://chierhu.medium.com/claude-code-for-game-development-7a88fcd19992)
- Repositório "Claude-Code-Game-Studios" (pixel-cellar): 48 agentes especializados (design, programação, arte, áudio, narrativa, QA, produção), hooks automáticos de validação em commits, pushes, mudanças de assets e eventos de sessão; conjuntos de agentes por engine (Godot 4, Unity, Unreal); agentes apresentam opções e aguardam decisão do usuário — [SourcePulse](https://www.sourcepulse.org/projects/31857564)

**Técnicas que elevam a qualidade (arte/consistência)**
- Consistência só por prompt é "unreliable at scale and dependent on individual skill"; recomenda-se governança: bibliotecas de assets centralizadas, templates de equipe, parâmetros de geração controlados, fluxos repetíveis — [Layer.ai](https://layer.ai/blog/ip-consistency-ai-generation-guide-game-studios)
- LoRA: 10–30 imagens de referência podem bastar para travar personagem — [Anifusion](https://anifusion.ai/features/lora-training/); outra fonte sugere 30–50 imagens para estilo e 15–30 para personagens, e lista âncoras alternativas: style keyword locks, reference image anchoring, LoRA model locks, color anchoring — [invideo](https://invideo.io/blog/ai-character-consistency/)
- Sheets de personagem (turnarounds, expressões, paleta) existem como "agent skills" prontas para pipelines de IA — [Agent Skills Finder](https://agentskillsfinder.com/skills/character-design-sheet); skill "ai-game-art-generation" para o Antigravity — [SkillsElion](https://skillselion.com/skills/omer-metin/skills-for-antigravity/ai-game-art-generation)
- Guia de pipeline: usar seed fixo no ComfyUI e salvar workflows; "captions and declarations must be derived from the images, never written from memory" — [AI Character Studio](https://characters.ilans.net/)

### Inferences
- Para iOS/mobile, o recorte "2D, lógica, definido em código" é exatamente o perfil em que a IA rende mais (puzzle, idle, card, roguelite leve), o que coincide com o relato de Spell Cascade e com os jogos de jam; 3D nativo com física e multiplayer é onde os relatos de fracasso se concentram.
- O padrão de sucesso é "IA constrói, mas o humano mantém propriedade mental da base de código"; quando o dev perde essa propriedade (caso do RTS), o projeto morre.
- Loop de crítico separado + métrica objetiva é a técnica mais citada para empurrar a qualidade além do "primeiro resultado aceitável".

### Gaps
- Não encontrei medições independentes (benchmarks, notas de jogadores) comparando jogos feitos com e sem style bible/LoRA; as fontes sobre consistência são fornecedores.
- Não achei relatos de "polish prompts" específicos nem de tuning de performance (frame time, memória) em jogos vibe-coded para iOS.
- Ferramentas de playtesting por agentes para indies: não pesquisadas por cota esgotada.

---

## Pergunta 4 — Padrões de orquestração de agentes em projetos de jogos e o que as startups "AI game studio" entregam

### Takeaway
Os padrões documentados em 2026 são: (a) um arquivo de contexto do projeto (CLAUDE.md) com convenções e autoridade de decisão; (b) subagentes por papel (PM, jogador, crítico, QA) com hooks de validação em commit/push; (c) ambiente headless que a IA pode rodar e testar; (d) loops construtor-crítico. As startups com mais tração (Astrocade, Series/Rho Engine) usam times de agentes por disciplina (arte, som, mecânica, UI), mas seus números são autodeclarados e nenhuma mostra um hit de qualidade comercial.

### Cited Findings
- Claude-Code-Game-Studios: 48 agentes por disciplina, hooks em commits/pushes/assets/sessão, agentes por engine, "present options and await user decisions" — [SourcePulse](https://www.sourcepulse.org/projects/31857564)
- Personas PM/jogador como agentes com autoridade de decisão explícita; pipeline headless com Godot CLI, GitHub Actions e Docker — [thebrandonwu.substack.com](https://thebrandonwu.substack.com/p/building-a-visual-novel-with-claude)
- Gauntlet Loop com subagentes construtores e críticos independentes (prompt de três parágrafos publicado no GitHub) — [Decrypt](https://decrypt.co/374560/dumbest-ai-prompt-claude-beat-careful-game-design)
- Curso "Practical Introduction to Claude Code for Unity Developers" indica demanda por fluxos Claude Code + Unity — [Inflearn](https://www.inflearn.com/en/course/a-practical-introduc)
- Astrocade: "a coordinated team of generative AI agents handle art, sound, mechanics and UI" — [komo.ai](https://komo.ai/directory/astrocade); agente "AstroBrain" — [Pulse 2.0](https://pulse2.com/astrocade-56-million-raised-to-build-ai-powered-interactive-entertainment-platform/amp/)
- Series Entertainment / Series AI: Series A de US$ 28 M levantada discretamente com Netflix, Dell Technologies Capital e a16z (30/09/2024) — [TechCrunch](https://techcrunch.com/2024/09/30/series-the-genai-startup-reinventing-game-development-has-quietly-raised-28m-from-netflix-dell-a16z-others); Rho Engine anunciada como "first AI-native, multimodal full-stack game creation platform" (visual e áudio); empresa cresceu de 17 para mais de 100 funcionários em 2024 — [AIM Research](https://aimresearch.co/?p=11691); [GamesBeat](https://gamesbeat.com/author/vbdeantakahashi/page/324/). Material mais recente encontrado é de 2024 [background].
- Latitude (AI Dungeon): jogo "nativo de IA" chamado Voyage; infraestrutura DeepInfra/Blackwell reduziu custo de tokens ~4x — [CB Insights](https://www.cbinsights.com/company/ai-dungeon)
- Hidden Door: aparece apenas em listagem de concorrentes (Jam & Tea Studios, Shapes, Latitude) — [CB Insights](https://www.cbinsights.com/company/hidden-door/alternatives-competitors)
- Bitmagic: ver Pergunta 1 (seed US$ 4 M, Bitmagic Mini WebGL) — [CO/AI](https://getcoai.com/news/bitmagic-secures-4m-for-text-to-3d-game-platform)

### Inferences
- Receita de orquestração transferível para solo dev iOS: CLAUDE.md (engine, convenções, limites de performance, "quem decide o quê") + subagentes "crítico/QA" separados + hooks que rodam build/testes headless a cada commit + loop de avaliação com métrica objetiva.
- Startups "texto → jogo" otimizam volume e velocidade (milhares de jogos, plays pagos), não qualidade por título; são úteis como protótipo/validação, não como pipeline de produto premium.

### Gaps
- Nenhum resultado para Braindump, Ego AI, Volley e Spellbrush (busca não retornou/ cota esgotada).
- Não encontrei casos documentados de OpenAI Agents SDK, Google ADK, LangGraph ou CrewAI aplicados a desenvolvimento de jogos.
- Status 2026 de Series/Rho Engine não confirmado.

---

## Pergunta 5 — Recepção da comunidade/mercado: backlash, impacto em avaliações, disclosure na Steam e itch.io

### Takeaway
A divulgação de IA na Steam cresceu de ~7% do catálogo (7.818 de ~114.126 jogos, julho/2025) para ~30,8% dos lançamentos de 2026, e os dados disponíveis (Game Oracle; estudo acadêmico de 2026) apontam penalidade correlacional: ~52,6% menos reviews e nota média 84,6% vs 88,3%. O backlash é consistente quando a IA é visível (arte, vozes, texto residual) e vago/omitido (Activision), e menor quando o uso é explicado e corrigido (Embark, 11 bit).

### Cited Findings

**Volume de disclosure**
- Totally Human Media (Ichiro Lambe), em 13/07/2025: 7.818 de ~114.126 jogos na Steam (≈7%) têm disclosure de GenAI; Lambe chamou o resultado de "an order of magnitude more" do que esperava; como a divulgação é voluntária, o número real deve ser maior — [VGC](https://www.videogameschronicle.com/news/steam-games-disclosing-generative-ai-use-are-up-800-this-year/); [WN Hub](https://wnhub.io/news/stores-and-publishing/item-48292); [Notebookcheck](https://www.notebookcheck.net/Analysis-Nearly-8-000-games-on-Steam-have-AI-generated-content.1060558.0.html). (Um agregador data a mesma análise em junho/2026 — [TechRaptor](https://Techraptor.net/gaming/news/at-least-1000-steam-games-using-generative-ai-per-new-report); a data de 2025 é a mais consistente com a manchete "up 800% this year".)
- ~20% dos jogos lançados na Steam em 2025 declararam IA — [MP1st](https://mp1st.com/news/games-released-on-steam-reportedly-used-ai-in-2025); [ITC.ua](https://itc.ua/en/news/every-fifth-game-on-steam-in-2025-was-created-with-the-help-of-ai-report)
- Censo de Sulka Haro (~53.600 lançamentos): lançamentos com disclosure foram de 10,9% (2024) para 30,8% (2026) — [games.gg (20/07/2026)](https://games.gg/news/steam-ai-disclosure-games-2028-trend/); projeção de que a divulgação possa cobrir mais da metade dos novos jogos — [games.gg](https://games.gg/pt-BR/news/steam-ai-disclosures-could-cover-more-than-half-of-new-games/)
- Tech-Insider (28/07/2026): cerca de 1 em 5 jogos no content survey da Steam tem rótulo de IA; cita PCGuia: 40% dos jogos lançados numa semana de junho/2026 declararam GenAI — [Tech-Insider](https://tech-insider.org/steam-ai-disclosure-2026)
- Série "Three years of AI on Steam" (não foi possível ler) — [fragwyz.substack.com](https://fragwyz.substack.com/p/three-years-of-ai-on-steam)
- Mais de 19.000 jogos lançados na Steam em 2025, quase metade com menos de 10 reviews (fonte fediverse, não primária) — [peachpie.theatl.social](https://peachpie.theatl.social/post/160409)

**Penalidade em reviews/vendas**
- Game Oracle (9.879 jogos lançados jan–out/2025): jogos comparáveis com disclosure de IA recebem ~52,6% menos reviews; nota média 84,6% vs 88,3% (jogos com ≥100 reviews); reviews usados como proxy de vendas — [Digital Citizen](https://www.digitalcitizen.life/steam-games-that-disclose-ai-use-may-sell-far-less-new-study-finds/); [Notebookcheck](https://www.notebookcheck.net/Study-suggests-AI-is-hurting-video-game-sales.1328725.0.html)
- Versão posterior do estudo (16.554 jogos de 2025): 21% usam GenAI; esses jogos têm notas de primeiro mês 53% piores; versão anterior (~10.000 jogos): mediana de 4 reviews vs 14 — citado de segunda mão em [Feedbagel](https://feedbagel.com/post/ai-is-ruining-game-sales-numbers-show)
- Dataset acadêmico "The AI Disclosure Penalty in Digital Games" (25/06/2026, Nevşehir Hacı Bektaş Veli University): jogos Steam 2024–2025 com disclosure vs controles pareados — [Mendeley Data](https://data.mendeley.com/datasets/zd77888mxw/1)
- As fontes alertam que é correlação; "the findings do not prove that players are actively avoiding every game that uses AI" — [Digital Citizen](https://www.digitalcitizen.life/steam-games-that-disclose-ai-use-may-sell-far-less-new-study-finds/)

**Casos de backlash (2025–2026)**
- The Alters (11 bit studios, 2025): jogadores achavam um prompt/resposta de GenAI esquecido no jogo semanas após o lançamento; o estúdio disse que era placeholder, admitiu GenAI para traduzir diálogos de filmes licenciados e prometeu remover em update — [ScreenHub](https://www.screenhub.com.au/news/games/the-alters-ai-2671396/); [Aftermath](https://aftermath.site/the-alters-ai-controversy/)
- Jurassic World Evolution 3 (Frontier): retratos de cientistas gerados por IA removidos após feedback; comentários também citam Clair Obscur como tendo removido arte de IA discretamente após o lançamento (peças de opinião) — [WN Hub](https://wnhub.io/news/Generative_AI/item-48139); [Aftermath](https://aftermath.site/the-alters-ai-controversy/)
- Call of Duty BO6/BO7 e ARC Raiders: ver Pergunta 2.
- Um estúdio trocou cutscenes in-engine por cutscenes geradas por IA e lançou com 64 reviews majoritariamente negativas (36% de aprovação); a análise conclui que jogadores rejeitam "visible shortcuts that undercut the experience", não ferramentas em si (fonte pouco conhecida) — [Everything Edinburgh](https://everythingedinburgh.com/?p=23621)
- Steam Next Fest: usuários reclamam à Valve de "AI slop" e demos de baixo esforço; discussões separam uso de IA do problema maior de asset flips e descoberta/curadoria — [Notebookcheck](https://www.notebookcheck.net/Steam-Next-Fest-flooded-with-AI-slop-and-low-effort-demos-users-tell-Valve.1233436.0.html)
- PC Gamer (2026): capsule art gerada por IA é sinal de "low-effort churn" e piora a navegação na Steam — [PC Gamer](https://pcgamer.com/gaming-industry/steam-week-in-review-spammy-ai-generated-capsule-art-is-a-pox-and-it-makes-browsing-steam-less-fun/)
- Reviews falsas geradas por IA na Steam desde meados de 2023, com pouca aplicação de regras pela Valve — [80.lv](https://80.lv/articles/fake-ai-generated-game-reviews-are-overrunning-steam); thread de 2024 em grupo da Steam sobre jogo com 100% positivo e reviews padronizadas — [Steam Community](https://steamcommunity.com/groups/Sentinels_of_the_Store/discussions/0/4695658272798030699)

**Políticas de lojas**
- itch.io (nov/2024 [background]): campo obrigatório "Generative AI Disclosure"; "sim" adiciona tag "AI Generated" com sub-tags Graphics, Sound, Text & Dialog, Code; "não" adiciona "No AI"; assets de IA não marcados (mesmo modificados) saem das páginas de browse; traditional game AI (pathfinding) e algoritmos autocontidos não exigem tag — [80.lv](https://80.lv/articles/asset-creators-on-itch-io-now-have-to-disclose-the-use-of-generative-ai/); [PCGamesInsider](https://www.pcgamesinsider.biz/news/74828/devs-need-to-disclose-if-game-uses-genai-on-itchio/); [itch.io](https://itch.io/post/16187566). Fontes divergem se a exigência cobre jogos ou só assets; opinião do fundador em fórum: só marcar dependência se ela foi escolhida por conter IA — [itch.io fórum](https://itch.io/post/16081169)
- Steam: disclosure obrigatória no content survey; a Activision usou texto genérico ("help develop some in game assets") que não especifica onde — [MP1st](https://mp1st.com/news/activision-responds-to-ai-claims-in-black-ops-7)

### Inferences
- A penalidade de ~50% em reviews provavelmente mistura dois efeitos: aversão de jogadores e o fato de jogos de baixo esforço usarem mais IA; para um indie, o rótulo em si não é fatal, mas a IA visível e inconsistente é.
- Disclosure específica (o que foi gerado, por quê, o que foi revisado por humano) e correção rápida (Embark, 11 bit) reduzem dano; disclosure vaga combinada com arte identificável como IA (Activision) amplifica.

### Gaps
- Não encontrei estatística equivalente para App Store/Google Play (não há campo de disclosure de IA na App Store até onde as buscas mostraram; não confirmado).
- Não li as metodologias originais da Game Oracle nem do estudo acadêmico; os números vêm de cobertura secundária.
- Não foi possível confirmar detalhes dos reembolsos da Steam para BO7 além da manchete.

---

## Pergunta 6 — Checklist de armadilhas (modos de falha) e remédios, com foco em solo dev iOS

### Takeaway
Os modos de falha documentados são: receita/hype inflados; perder a propriedade mental do código; IA fraca em engines/multiplayer complexos; inconsistência de arte por prompt solto; vozes TTS "chapadas"; placeholders de IA esquecidos no build; disclosure vaga; capsule art "cara de IA"; e, no mobile, a revisão da App Store ser mais difícil do que construir o app. Os remédios são práticas de produção, não prompts: documentos de projeto, âncoras de estilo, loops de crítica, build headless com testes, revisão humana antes do envio e divulgação específica.

### Cited Findings (modo de falha → evidência → remédio documentado)
- Expectativa de receita irreal: fly.pieter.com foi de US$ 1 M ARR autodeclarado (mar/2025) a US$ 144 K ARR (mai/2025); 404 Media: "yours probably won't" — [levels.io](https://levels.io/full-multiplayer-python-websockets-game-ai); [Indie Hackers](https://www.indiehackers.com/post/2NUIOp80SUWuPmmfKoS9); [404 Media](https://404media.co/this-game-created-by-ai-vibe-coding-makes-50-000-a-month-yours-probably-wont). Spell Cascade: US$ 4,99 em 30 dias — [Medium](https://chierhu.medium.com/claude-code-for-game-development-7a88fcd19992). Remédio: tratar como protótipo/validação; monetizar via ads + IAP leve como o próprio fly.pieter.com.
- Apps mobile "vibe coded" sem tração: análise Appfigures/TechCrunch (set/2025) sobre apps dedicados de vibe coding: nenhum com downloads notáveis, poucos com receita — [Slashdot/TechCrunch](https://tech.slashdot.org/story/25/09/23/2115212). Remédio: "insight, taste, and distribution" como diferenciais — [TechRadar](https://www.techradar.com/pro/insight-taste-and-distribution-how-to-turn-vibe-coded-apps-into-cash)
- Revisão da App Store/Google Play: hackathon interno da RevenueCat concluiu que "building the app is the actual easy part" e que quase nenhum app passou na primeira submissão — [RevenueCat](https://www.revenuecat.com/blog/company/revenuecat-vibe-coding-apps). Remédio: reservar tempo para guidelines, metadados, privacidade e IAP antes do envio.
- Perda de propriedade do código: RTS 100% Claude abandonado porque o dev não conseguia mais corrigir — [Medium](https://chierhu.medium.com/claude-code-for-game-development-7a88fcd19992). Remédio: revisar diffs, manter arquitetura pequena e documentada no CLAUDE.md — [Claude Code Decoded](https://echov4ult.beehiiv.com/p/claude-code-decoded)
- Engine/escopo errado: Unity + Photon Fusion gerou "useless results" e gasto de tokens; Godot exigiu mudança de stack — [Reddit (snapshot)](https://reddit.sentinel-team.org/posts/1sggzzw/snapshots/2026-04-09T16%3A41%3A00.47446Z); [mrphilgames](https://mrphilgames.substack.com/p/how-i-use-claude-like-a-junior-dev). Remédio: 2D/lógica/texto, headless testável — [Medium](https://chierhu.medium.com/claude-code-for-game-development-7a88fcd19992); [thebrandonwu](https://thebrandonwu.substack.com/p/building-a-visual-novel-with-claude)
- Construtor avaliando o próprio trabalho: Gauntlet Loop separa críticos e usa comparação cega — [edgeX/Decrypt](https://pro.edgex.exchange/en-US/news/article/claude-opus-5-one-shots-fps-game-gauntlet-loop)
- Inconsistência visual: prompt-only "unreliable at scale" — [Layer.ai](https://layer.ai/blog/ip-consistency-ai-generation-guide-game-studios). Remédio: LoRA (15–50 imagens), character sheets, seeds fixos, paleta/estilo travados, biblioteca central de assets — [invideo](https://invideo.io/blog/ai-character-consistency/); [Anifusion](https://anifusion.ai/features/lora-training/); [AI Character Studio](https://characters.ilans.net/)
- Vozes TTS percebidas como "flat": Embark regravou linhas com atores — [PCGamesN](https://www.pcgamesn.com/arc-raiders/ai-voices-replaced). Remédio: TTS só para linhas não essenciais; ator para o que importa.
- Resíduos de IA no build (prompt esquecido): The Alters — [ScreenHub](https://www.screenhub.com.au/news/games/the-alters-ai-2671396/). Remédio: passe de QA textual antes do release.
- Disclosure vaga: Activision BO7 — [MP1st](https://mp1st.com/news/activision-responds-to-ai-claims-in-black-ops-7). Remédio: disclosure específica como exige o itch.io (gráficos/som/texto/código) — [80.lv](https://80.lv/articles/asset-creators-on-itch-io-now-have-to-disclose-the-use-of-generative-ai/)
- Capsule art/ícone "cara de IA" sinaliza baixo esforço e afeta descoberta — [PC Gamer](https://pcgamer.com/gaming-industry/steam-week-in-review-spammy-ai-generated-capsule-art-is-a-pox-and-it-makes-browsing-steam-less-fun/). Remédio: arte de loja curada/retocada por humano.
- Penalidade de reviews para jogos com disclosure (~52,6% menos reviews; 84,6% vs 88,3%) — [Digital Citizen](https://www.digitalcitizen.life/steam-games-that-disclose-ai-use-may-sell-far-less-new-study-finds/)
- Questões de propriedade/licença: devs citam propriedade de dados (63%) e do conteúdo gerado (32%) como preocupações — [Google Cloud](https://www.googlecloudpresscorner.com/2025-08-18-90-of-Games-Developers-Already-Using-AI-in-Workflows%2C-According-to-New-Google-Cloud-Research); GDC 2025 lista roubo de PI entre as principais preocupações — [BusinessWire](https://www.businesswire.com/news/home/20250121745145/en/The-2025-Game-Industry-Survey-Reveals-Increasing-Impact-Of-Layoffs-Concerns-With-The-Usage-Of-Generative-AI-Funding-Challenges-and-More)

### Inferences — receita repetível sugerida pelos casos (síntese, não citação)
1. Escopo: jogo 2D/lógico (puzzle, idle, card, roguelite leve), escopo de jam, web-first ou engine com CLI/headless testável (os casos de sucesso são todos assim).
2. Documentos antes do código: GDD curto + CLAUDE.md com engine, convenções, limites de performance, estrutura de pastas e "autoridade de decisão" (personas PM/jogador) — reduz correção e evita perder o controle do código.
3. Arte: style bible + character sheets + LoRA ou referências fixas + seed fixo; biblioteca central; retoque humano no ícone/capsule/screenshots.
4. Loop de qualidade: subagente construtor separado de subagente(s) crítico(s) com métrica objetiva (comparação com referência, checklist de game feel, FPS alvo); hooks rodando build e testes a cada commit.
5. QA final humano: varrer texto residual de prompts, inconsistências de arte, vozes; testar a submissão à App Store como um projeto em si.
6. Disclosure específica e honesta (o que foi gerado, o que foi revisado) e correção rápida quando a comunidade apontar problemas.

### Gaps
- Não encontrei casos verificados de rejeição da App Store especificamente por conteúdo gerado por IA (busca não realizada por cota esgotada).
- Não encontrei dados de performance (frame rate, memória, bateria) de jogos vibe-coded em iOS.
- Não encontrei postmortems de GDC 2025/2026 ou Gamescom/Devcom sobre jogos 100% IA.

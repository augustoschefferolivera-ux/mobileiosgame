# ADR-0010 — Decisões de implementação da F-008 (Horas, marcos e Fogueira)

- **Status:** em construção na Sessão 9 (2026-10-12). São as decisões técnicas tomadas ao implementar `design/decisoes-F-008.md` (aqui, **D8**), aprovada pelo usuário sem vetos. A parte 2a (simulação: layout v8, Coroado, arena e marcos) está aqui; as partes 2b (Fogueira e save) e 2c (render, entrada, Playwright e evidências) acrescentam suas seções e fecham as divergências e as medidas.
- **Fontes:** B §3.6, §3.10, §5.4, §5.7, §5.10 e §11.3 (F-008); D8; D2 a D7; ADR-0002 §3, §5, §8 a §10, §14 e §15; ADR-0005 a ADR-0009.

## 1. Estado v8 e determinismo (parte 2a)

- **Layout (`VERSAO_LAYOUT` 8, 76.788 bytes):** um bloco de 2.108 bytes depois dos 74.680 do v7 (`BYTES_DO_LAYOUT_7`), que ficam no mesmo lugar: `FOGUEIRA_F32` (6 Float32, em 74.680: `fogueiraX`, `fogueiraY`, `arenaX`, `arenaY`, `empurraoX`, `empurraoY`), `FOGUEIRA_U32` (2 palavras, em 74.704: `idVigilia`, `convocacoes`), `FOGUEIRA_U8` (12 bytes, em 74.712: `etapa`, `marcosIniciados`, `arenaAtiva`, `coroadosVivos`, `fogueiraAcesa`, `fogueiraHora`, `fogueiraAcoes`, `empurraoPassos` e 4 de folga), `obstaculoAtivo` (64 bytes, em 74.724), e por inimigo `ataqueId` (em 74.788) e `ataqueSeq` (u8 x 500) e `convocaEspera` (u16 x 500, em 75.788). Seção nova `fogueira` em `hashPorSecao`; `vigilia` termina em 74.680.
- **Etapa de partida (decisão da implementação):** `reiniciarEstado` conta como iniciados os marcos cujo limiar o `relogioInicial` já passou (um `?inicio=19:00` não abre os marcos de 5, 10 e 15 no 1º passo) e põe `etapa` = CHEFE de 20:00 em diante. A D8 não dizia.
- **Hashes de referência** (passo 1.000, `determinismo.test.ts`): seed 1 `a5721bcc` para `54256399` e seed 424242 `88a3a4f0` para `6d4078d9` (só o layout: os 64 `obstaculoAtivo` nascem em 1). `referencias.test.ts` (A5): `e5cba098` para `796b75a1` e `5a7d8aac` para `96b14125`.
- **Regressão v7** (`tests/logica/combate/regressao-v7.test.ts`): gravada com o código de `fc4dcbc` (a D8 ainda com o layout v7), antes de qualquer mudança de código da F-008: `horda_com_ataques` com esquiva e aparo alternados, seeds 1 e 424242, passos 1.000 e 1.800, bytes [4, 74.680), sem máscara além da palavra `CAB.versao`.

## 9. Divergências

Da D8 (aprovadas, em negrito no §0.A da D8): CR1, CR3, CR4, CR8, AR2, AR4, FG7, SV2, SV3, SV6, SV7 e HU1 já constam lá. Abaixo, só o que a implementação acrescenta.

(nenhuma até aqui)

# ADR-0011 — Decisões de implementação da F-009 (O Lanterneiro, Amanhecer e A Fome)

- **Status:** em curso, parte 2a (simulação do chefe). São as decisões técnicas tomadas ao implementar `design/decisoes-F-009.md` (aqui, **D9**), aprovada pelo usuário sem vetos em 2026-10-12. A parte 2a (layout v9, Lanterneiro, Postura, fases, Fúria, ataques e arena), a 2b (Amanhecer, A Fome, Resultado e meta) e a 2c (render, cenário, Playwright e evidências) acrescentam as suas seções.
- **Fontes:** B §3.11, §4, §5.8, §5.11 e §11.3 (F-009); D9; D2 a D8; ADR-0002 §3, §9, §14 e §15; ADR-0005 a ADR-0010.

## 1. Estado v9 e determinismo (parte 2a)

- **Layout (`VERSAO_LAYOUT` 9, 76.868 bytes):** um bloco de 80 bytes depois dos 76.788 do v8 (`BYTES_DO_LAYOUT_8`), que ficam no mesmo lugar. Todos os campos novos moram em `estado.ts`, em quatro views do `Estado`:
  - `chefeF32`, 10 Float32 em 76.788 (`CHEFE_F32`): `hpMax`, `postura`, `miraX`, `miraY`, `zonaX0..2` (índices 4 a 6), `zonaY0..2` (7 a 9);
  - `chefeU32`, 2 palavras em 76.828 (`CHEFE_U32`): `ataqueSeq` (a posição no ciclo da fase, FS2), `fomePassos` (2b);
  - `chefeU16`, 12 halfwords em 76.836 (`CHEFE_U16`): `slot` (0xFFFF = `SEM_CHEFE`), `quebraPassos`, `posturaOciosa`, `transicaoPassos`, `convocaEspera`, `explosaoEspera`, `cegoPassos`, `amanhecerPassos` (2b), `zonaTimer0..2` (8 a 10) e 1 de folga em zero. **A D9 previa 11 e 8 Uint8 (78 B + 2 de alinhamento); o 12º halfword é o alinhamento, no mesmo total de 80 B.**
  - `chefeU8`, 8 bytes em 76.860 (`CHEFE_U8`): `fase`, `faseMax`, `morto`, `presoPassos`, `explosaoAcertou`, `quebras` e 2 de folga.
  Seção nova `chefe` em `hashPorSecao` (`fogueira` passa a terminar em 76.788). `BYTES_DO_LAYOUT_8` exportado. `inimigos.ataqueId` ganha 1 a 6 para o tipo 5.
- **Constantes:** `ETAPA.amanhecer` 5; `FASE.aFome` 3 e `FASE.amanhecer` 4; `CENARIO.semFome` 16; `EVENTO` 39 a 47 (`chefeSurgiu` … `fomeDesceu`); `FORMA` 11 a 16 (`varaArco` … `agarrar`); `CAUSA.lanterneiro` 4; `ORIGEM_DO_DANO.efeito` 4 e `.fome` 5.
- **Migração do `vigilia` 8 → 9** (`migrarLayout8Para9`, `save/migracoes.ts`): estende o buffer com o bloco novo em zero, `chefeSlot` = 0xFFFF e `CAB.versao` = 9 (o `restaurar` confere a versão depois de migrar). Teste: `tests/logica/save/migracao-v9.test.ts`.
- **Hashes de referência** (passo 1.000, `determinismo.test.ts`): seed 1 `54256399` para `115fd0ca` e seed 424242 `6d4078d9` para `3b1e2566` (só o layout: `chefeSlot` nasce 0xFFFF). `referencias.test.ts` (A5): `796b75a1` para `1e823cf6` e `96b14125` para `0bdcf512`.
- **Regressão v8** (`tests/logica/combate/regressao-v8.test.ts`): gravada com o código de `4827a73` (a D9 aprovada, ainda com o layout v8), antes de qualquer mudança de código da F-009: `horda_com_ataques` com esquiva e aparo alternados, seeds 1 e 424242, passos 1.000 e 1.800 (`0eb68176`, `32e289ec`, `44f34bb3`, `9a5522d0`), bytes [4, 76.788), sem máscara além da palavra `CAB.versao`.
- **Hash e `idVigilia`:** continua contado como zero (ADR-0010 §9, item 34); o bloco novo entra no hash normalmente.
- **RNG:** nenhum fluxo novo (a D9 §0.B).

## 2. Lanterneiro, Postura e fases (parte 2a)

(preenchido nos commits do chefe)

## 3. Ataques (parte 2a)

(preenchido nos commits dos ataques)

## 9. Divergências

- Nenhuma divergência nova da D9 até aqui. As três já aprovadas na D9 (doc 02 §3 em FM2; D6 EP2 em AT4; D7 RS8 em FM3) entram na 2b/2a conforme as peças que as implementam.

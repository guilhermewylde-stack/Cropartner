Estou desenvolvendo o **Cropartner**, um app de crochê (Expo SDK 58 + Expo Router + TypeScript, iOS/Android) no
repositório `guilhermewylde-stack/Cropartner`. O trabalho está na branch `claude/epic-gates-lcp2u2` (continue nela, ou
na branch que esta sessão designar, partindo dela). Seguimos o fluxo do Matt Pocock: grill → PRD → issues (fatias
verticais) → TDD. Grill, PRD e issues já existem; as **fatias 1, 2 e 3 estão prontas e fechadas**.

**Leia primeiro:** `docs/PRD.md` (fonte da verdade), `AGENTS.md` (regras do Expo), `README.md` e as issues abertas
(#4 a #9), que trazem objetivo, critérios de aceitação, dependências e notas de teste de cada fatia.

**Tarefa desta sessão:** implementar as fatias restantes **na ordem das issues**, uma por vez, com TDD
(vermelho → verde → refatorar), testando o comportamento pela interface pública dos módulos de `src/lib/`:

4. #4 Imagem → grid (importar, recorte arrastável com grade sobreposta, leitura de cores, prévia).
5. #5 PDF → grid (começa com um spike de WebView + pdf.js no Expo Go; plano B: development build).
6. #6 Editor de cores (pincel, balde, trocar tom, renomear, mesclar, adicionar/excluir, desfazer).
7. #7 Linha I (lista de compras por cor, calibração, linhas cadastradas).
8. #8 Linha II (restante pelo progresso, estoque por cor, vai dar / vai faltar).
9. #9 Backup (exportar/importar projeto ou todos, compartilhar).

Ao fim de cada fatia: `npm test`, `npx tsc --noEmit`, `npm run lint`, capturas de tela, commit, push, comentar na issue
o que entrou / como foi verificado / o que só dá para conferir no aparelho, e fechar a issue. **Pare e me mostre o
resultado ao fim de cada fatia.** Não crie pull request sem eu pedir.

**Decisões já tomadas (não reabrir):**
- v1 100% no aparelho, sem IA, sem login, sem rede, rodando no **Expo Go**. Público: uso próprio e da namorada (iPhone).
- Técnica da v1: tapestry/pixel em carreiras retas; C2C vem depois, pela interface `WorkOrder`.
- "Sou canhota" é global e só muda o sentido (carreira 1 começa embaixo à esquerda); não espelha o desenho.
- Linha: lista de compras + "quanto falta" + estoque por cor, linhas cadastradas pela usuária (sem catálogo de marcas).
- Backup por arquivo, sem nuvem. Pós-v1: IA gratuita no aparelho, depois C2C.

**Como o código está organizado (depois das fatias 1–3):**
- `src/lib/workOrder.ts` — interface `WorkOrder` (célula ⇄ índice de trabalho, carreiras, sentido) + `straightRows` +
  `workOrderFor` (ponto de troca de técnica). Posição, progresso e linha recebem um `WorkOrder`, nunca o canto/modo.
- `src/lib/progress.ts` — o progresso é **um número**: pontos feitos na ordem de trabalho (`Project.progress`). O grid
  não guarda mais `done`, e não existe mais `lastCell`.
- `src/lib/grid.ts` — `positionInfo` (fonte única dos textos do painel, inclui `nextRun`), `rowRuns`, `colorStats`,
  `replaceColor`, `floodFill`, `createGrid`, `resizeGrid`.
- `src/lib/history.ts` — desfazer como módulo puro (já usado na tela do grid para progresso, pintura e paleta).
- `src/lib/migrate.ts` — migração dos projetos salvos; versão atual **3**. Mudou o formato de `Project`? Suba a versão,
  escreva a migração e o teste.
- `src/lib/sampling.ts`, `colors.ts`, `yarn.ts` — do protótipo, com testes; reaproveitar nas fatias 4, 6, 7 e 8.
- `src/store/projects.ts` (projetos) e `src/store/settings.ts` (ajustes do aparelho: `leftHanded`; as linhas
  cadastradas da fatia 7 devem ir aqui). `src/hooks/useWorkOrder.ts` junta projeto + ajuste global.
- Telas em `src/app/`: `index`, `settings`, `project/[id]/index`, `grid-setup`, `grid`, `yarn`. A tela do grid já tem
  modo "Pintar / cores" e `ColorEditor` do protótipo (base da fatia 6); `grid-setup` já lê imagem com recorte por
  porcentagens digitadas (base da fatia 4, que pede recorte arrastável).

**Pendências que ficaram das fatias 1–3:**
- Nada foi testado em iPhone real ainda. Conferir no aparelho: tela acesa com o grid aberto, alcance do polegar no
  botão grande, confirmações de "Zerar progresso" e de excluir projeto, e "Sou canhota".
- `Alert.alert` não funciona no build web, então fluxos com confirmação não aparecem nas capturas.

**Dicas do ambiente (sessão na nuvem):**
- Instalar dependências: `npm install --legacy-peer-deps` (há um conflito de peer do `react-dom` nas dependências do
  Expo Router).
- `npx expo install` falha porque a API do Expo é bloqueada pelo proxy; use `EXPO_OFFLINE=1 npx expo install <pkg>`.
  Os docs do Expo também podem estar bloqueados: leia os `.d.ts` do pacote em `node_modules` para conferir a API.
- Lint: `EXPO_OFFLINE=1 CI=1 npx expo lint`.
- Conferir o bundle: `EXPO_OFFLINE=1 CI=1 npx expo export --platform android --output-dir <scratchpad>`.
- Capturas de tela: instale os pacotes web **sem salvar**
  (`npm install --no-save --legacy-peer-deps react-dom@19.3.0 react-native-web@~0.21.4 @expo/metro-runtime@~58.0.17`),
  exporte com `--platform web`, sirva a pasta com um servidor estático com fallback para `index.html` e use Playwright
  (iPhone 13). Confira depois que `package.json` não mudou.
- Semear dados no `localStorage`: chave `cropartner-projects`, formato `{state:{projects:{...}}, version:3}`; ajustes
  na chave `cropartner-settings`, formato `{state:{leftHanded:false}, version:1}`.
- No build web, o toque numa célula do grid funciona por clique (`GridView` aceita `offsetX/Y`).

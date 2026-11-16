Estou desenvolvendo o **Cropartner**, um app de crochê (Expo SDK 58 + Expo Router + TypeScript, iOS/Android) no
repositório `guilhermewylde-stack/Cropartner`. O trabalho está na branch `claude/epic-gates-lcp2u2` (continue nela, ou
na branch que esta sessão designar, partindo dela). Seguimos o fluxo do Matt Pocock: grill → PRD → issues (fatias
verticais) → TDD. Grill, PRD e issues já existem; as **fatias 1, 2, 3 e 4 estão prontas e fechadas**.

**Leia primeiro:** `docs/PRD.md` (fonte da verdade), `AGENTS.md` (regras do Expo), `README.md` e as issues abertas
(#5 a #9), que trazem objetivo, critérios de aceitação, dependências e notas de teste de cada fatia.

**Tarefa desta sessão:** implementar as fatias restantes **na ordem das issues**, uma por vez, com TDD
(vermelho → verde → refatorar), testando o comportamento pela interface pública dos módulos de `src/lib/`:

5. #5 PDF → grid (começa com um spike de WebView + pdf.js no Expo Go; plano B: development build).
6. #6 Editor de cores (pincel, balde, trocar tom, renomear, mesclar, adicionar/excluir, desfazer).
7. #7 Linha I (lista de compras por cor, calibração, linhas cadastradas).
8. #8 Linha II (restante pelo progresso, estoque por cor, vai dar / vai faltar).
9. #9 Backup (exportar/importar projeto ou todos, compartilhar).

Ao fim de cada fatia: `npm test`, `npx tsc --noEmit`, `npm run lint`, capturas de tela, commit, push, comentar na issue
o que entrou / como foi verificado / o que só dá para conferir no aparelho, e fechar a issue. **Pare e me mostre o
resultado ao fim de cada fatia**, e **sempre termine a mensagem com o prompt de continuação** (num bloco para copiar):
`Leia docs/NEXT_SESSION.md na branch claude/epic-gates-lcp2u2 e continue de onde parou.` Não crie pull request sem eu pedir.

**Ao fim da sessão (ou quando o contexto estiver acabando), atualize este arquivo** com o estado atual — fatias
prontas, a branch em uso, mudanças na organização do código e no formato dos dados, pendências e dicas novas do
ambiente — e faça commit e push. A sessão seguinte começa só com "leia `docs/NEXT_SESSION.md` e continue".

**Decisões já tomadas (não reabrir):**
- v1 100% no aparelho, sem IA, sem login, sem rede, rodando no **Expo Go**. Público: uso próprio e da namorada (iPhone).
- Técnica da v1: tapestry/pixel em carreiras retas; C2C vem depois, pela interface `WorkOrder`.
- "Sou canhota" é global e só muda o sentido (carreira 1 começa embaixo à esquerda); não espelha o desenho.
- Linha: lista de compras + "quanto falta" + estoque por cor, linhas cadastradas pela usuária (sem catálogo de marcas).
- Backup por arquivo, sem nuvem. Pós-v1: IA gratuita no aparelho, depois C2C.

**Como o código está organizado (depois das fatias 1–4):**
- `src/lib/workOrder.ts` — interface `WorkOrder` (célula ⇄ índice de trabalho, carreiras, sentido) + `straightRows` +
  `workOrderFor` (ponto de troca de técnica). Posição, progresso e linha recebem um `WorkOrder`, nunca o canto/modo.
- `src/lib/progress.ts` — o progresso é **um número**: pontos feitos na ordem de trabalho (`Project.progress`). O grid
  não guarda mais `done`, e não existe mais `lastCell`.
- `src/lib/grid.ts` — `positionInfo` (fonte única dos textos do painel, inclui `nextRun`), `rowRuns`, `colorStats`,
  `replaceColor`, `floodFill`, `createGrid`, `resizeGrid`.
- `src/lib/history.ts` — desfazer como módulo puro (já usado na tela do grid para progresso, pintura e paleta).
- `src/lib/migrate.ts` — migração dos projetos salvos; versão atual **3**. Mudou o formato de `Project`? Suba a versão,
  escreva a migração e o teste.
- `src/lib/crop.ts` — recorte arrastável como funções puras: `dragCrop` (recorte no início do gesto + deslocamento total
  → novo recorte, com limites e tamanho mínimo) e `hitCropHandle` (qual alça o toque pega). Tudo em frações da imagem.
- `src/lib/sampling.ts` — `sampleGridFromRGBA` (leitura de pixels) e `cropToPixels`. `colors.ts`, `yarn.ts` — do
  protótipo, com testes; reaproveitar nas fatias 6, 7 e 8.
- `src/components/CropEditor.tsx` — imagem + moldura arrastável + grade. Usa os handlers de responder do React Native
  direto na `View` (sem `PanResponder`, que esbarra na regra de lint `react-hooks/refs`; sem gesture-handler).
- `src/lib/native/imageGrid.ts` — `readGridFromImage(uri, {rows, cols, crop, maxColors})` recebe **qualquer URI de
  imagem**; a fatia 5 (PDF) só precisa gerar uma imagem da página e reaproveitar o mesmo fluxo de recorte/leitura/prévia.
  Erros saem como `ImageReadError` com mensagem pronta para a usuária.
- `src/store/projects.ts` (projetos) e `src/store/settings.ts` (ajustes do aparelho: `leftHanded`; as linhas
  cadastradas da fatia 7 devem ir aqui). `src/hooks/useWorkOrder.ts` junta projeto + ajuste global.
- Telas em `src/app/`: `index`, `settings`, `project/[id]/index`, `grid-setup`, `grid`, `yarn`. A tela do grid já tem
  modo "Pintar / cores" e `ColorEditor` do protótipo (base da fatia 6). `grid-setup` tem os modos "Em branco" e "Da
  imagem" (importar da galeria/Arquivos ali mesmo → tamanho → recorte arrastável → ler → prévia → confirmar); os erros
  de leitura aparecem no próprio cartão, não em `Alert`.

**Pendências que ficaram das fatias 1–4:**
- Nada foi testado em iPhone real ainda. Conferir no aparelho: tela acesa com o grid aberto, alcance do polegar no
  botão grande, confirmações de "Zerar progresso" e de excluir projeto, e "Sou canhota".
- Fatia 4 no aparelho: arrastar o recorte dentro da tela rolável (a rolagem trava durante o arrasto), ler um print real
  do Pinterest e uma imagem HEIC da galeria, e a confirmação de substituir grid com progresso.
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
- A captura `fullPage` não pega o conteúdo rolável das telas; para telas longas use um viewport alto
  (`viewport: { width: 390, height: 1400 }`). O arrasto do recorte funciona com `page.mouse` no build web, e
  `readGridFromImage` também roda lá (fonte com `uri` http servida pelo mesmo servidor estático).
- No build web, o toque numa célula do grid funciona por clique (`GridView` aceita `offsetX/Y`).

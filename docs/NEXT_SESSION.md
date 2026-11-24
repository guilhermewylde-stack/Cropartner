Estou desenvolvendo o **Fio da Meada** (antes chamado Cropartner), um app de crochê (Expo SDK 58 + Expo Router + TypeScript, iOS/Android) no
repositório `guilhermewylde-stack/Cropartner`. O trabalho está na branch `claude/epic-gates-lcp2u2` (continue nela, ou
na branch que esta sessão designar, partindo dela). Seguimos o fluxo do Matt Pocock: grill → PRD → issues (fatias
verticais) → TDD. Grill, PRD e issues já existem; **todas as fatias da v1 (1 a 9) estão implementadas**; as issues #1–#4 e #6–#9 estão fechadas, e a #5 (PDF) segue
aberta só até o spike no iPhone (ver pendências).

**Leia primeiro:** `docs/PRD.md` (v1), `docs/PRD-social.md` (rede social), `AGENTS.md` (regras do Expo), `README.md`, a
issue #5 e as issues #10 a #15.

**Próximo passo:** a v1 está completa no código, e a próxima etapa (rede social) já tem PRD e issues. Ordem
combinada:
1. **Testar a v1 no iPhone pelo Expo Go** (lista em "Pendências") e corrigir o que aparecer — cada correção com teste
   quando cair num módulo de `src/lib/`.
2. Implementar as fatias da rede social **na ordem das issues**, com TDD, como na v1:
   - ~~#10 Social 1 — estante, diário e perfil no aparelho~~ **pronta e fechada** (24/11).
   - #11 Social 2 — conta por código de e-mail, convites e perfil (precisa do projeto Supabase do usuário).
   - #12 Social 3 — publicar, ver e copiar projeto.
   - #13 Social 4 — seguir, feed e perfil de outra pessoa.
   - #14 Social 5 — curtir, comentar e avisos.
   - #15 Social 6 — abrir ao público (só quando o usuário decidir).

**Rede social — leia `docs/PRD-social.md` (fonte da verdade desta etapa).** Decisões da entrevista de 24/11/2026 (não
reabrir): Supabase; login por código de e-mail; grupo fechado por convite primeiro, aberto depois; projetos privados
por padrão e publicar é escolha por projeto; publicar leva tudo, inclusive o gráfico (com campo "fonte do gráfico" e
revisão antes de abrir ao público); a nuvem guarda só o que é publicado e o perfil (sem sincronizar projetos privados;
o backup por arquivo continua); formatos: estante e diário, seguir e feed, curtir e comentar.
Antes da #11: pedir ao usuário que crie o projeto Supabase e informe a URL e a chave pública (vão em
`EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY`, nunca no repositório) e liberar o domínio do projeto na
rede da sessão na nuvem.

- Nome: **Fio da Meada** (confirmado em 24/11; app renomeado: `app.json` com slug `fio-da-meada`, scheme `fiodameada`,
  identificador `com.fiodameada.app`; textos e nome do arquivo de backup). As chaves do AsyncStorage continuam
  `cropartner-*` de propósito (mudar apagaria os dados), e o backup aceita a marca antiga `app: 'cropartner'`. O
  repositório no GitHub ainda se chama Cropartner — renomear é decisão do usuário (o GitHub redireciona o link antigo).
  Histórico da escolha: Busca de 24/11: nenhum app com esse nome nas lojas; existe um
  podcast "Fio da Meada" da Rádio Novelo (categoria diferente, mas aparece primeiro na busca) e uma loja "Fio à
  Meada" em Portugal. O usuário ficou de conferir INPI (classes 9 e 42) e domínio.

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

**Como o código está organizado (v1 completa, fatias 1–9):**
- `src/lib/workOrder.ts` — interface `WorkOrder` (célula ⇄ índice de trabalho, carreiras, sentido) + `straightRows` +
  `workOrderFor` (ponto de troca de técnica). Posição, progresso e linha recebem um `WorkOrder`, nunca o canto/modo.
- `src/lib/progress.ts` — o progresso é **um número**: pontos feitos na ordem de trabalho (`Project.progress`). O grid
  não guarda mais `done`, e não existe mais `lastCell`.
- `src/lib/grid.ts` — `positionInfo` (fonte única dos textos do painel, inclui `nextRun`), `rowRuns`, `colorStats`,
  `replaceColor`, `floodFill`, `createGrid`, `resizeGrid`, e do pincel: `paintCells` (devolve o mesmo grid se nada
  mudou), `lineCells` (Bresenham entre dois toques do arrasto) e `colorUsage` (células por cor).
- `src/lib/palette.ts` — operações do editor de cores sobre `Artwork = {grid, palette}` (o progresso fica de fora):
  `addColor`, `updateColor` (tom/nome; o id não muda), `mergeColors`, `removeColor`, `shades` (tons mais claros/escuros).
  Nomes repetidos ganham número ("Cru 2"). As fatias 7/8 podem contar com nomes únicos na paleta.
- `src/lib/history.ts` — desfazer como módulo puro. A tela do grid tem **dois históricos**: um do progresso (número) e
  um das edições (`Artwork`); desfazer no modo "Pintar / cores" nunca mexe no progresso, e vice-versa.
- `src/lib/migrate.ts` — migração dos projetos salvos; versão atual **6** (v6: `shelf` {status want/doing/done, startedAt, finishedAt}, `diary`, `referenceUrl`, `photo`; v4: metros/gramas por novelo saíram do
  projeto; entraram `yarn.defaultYarnId` e `yarn.colorYarns`; v5: `yarn.stock`, estoque por cor em novelos ou metros). Também `migrateSettingsState` (ajustes, versão **2**:
  ganhou `yarns`). Mudou o formato de `Project`? Suba a versão,
  escreva a migração e o teste.
- `src/lib/crop.ts` — recorte arrastável como funções puras: `dragCrop` (recorte no início do gesto + deslocamento total
  → novo recorte, com limites e tamanho mínimo) e `hitCropHandle` (qual alça o toque pega). Tudo em frações da imagem.
- `src/lib/sampling.ts` — `sampleGridFromRGBA` (leitura de pixels) e `cropToPixels`.
- `src/lib/yarn.ts` — lista de compras: `estimateFromGrid(grid, palette, order, yarnSettings, yarns)` → por cor
  metros, `yarn` (linha resolvida), `skeins`, `skeinsToBuy` (teto), `grams`; totais e `colorsWithoutYarn`.
  `yarnForColor` (linha da cor → linha do projeto; linha excluída cai na do projeto), `setColorYarn`, `calibrate`,
  `applyCalibration`, e o cadastro: `Yarn` (nome, metros, gramas opcionais), `addYarn`/`updateYarn`/`removeYarn`,
  `yarnInputError`; e o que falta: `estimateRemaining(..., done)` (só pontos não feitos; ponta só de bloco não
  começado; cores terminadas ficam com zero), `stockVerdict` (vai dar / vai faltar / sem veredito) e `setStock`.
  Testes em `__tests__/yarn.test.ts`.
- `src/components/CropEditor.tsx` — imagem + moldura arrastável + grade. Usa os handlers de responder do React Native
  direto na `View` (sem `PanResponder`, que esbarra na regra de lint `react-hooks/refs`; sem gesture-handler).
- `src/lib/native/imageGrid.ts` — `readGridFromImage(uri, {rows, cols, crop, maxColors})` recebe **qualquer URI de
  imagem**; a fatia 5 (PDF) só precisa gerar uma imagem da página e reaproveitar o mesmo fluxo de recorte/leitura/prévia.
  Erros saem como `ImageReadError` com mensagem pronta para a usuária.
- PDF (fatia 5): `src/lib/pdf.ts` — lógica pura (`renderScale` com limites de lado/pixels, `chunkBase64`,
  `pdfErrorMessage`, `pageImageName`). `src/lib/native/pdfHtml.ts` — a página do renderizador (`window.__pdf.begin /
  chunk / open / sizes / render`, respostas em JSON; o pdf.js roda na própria página, **sem Worker**, e desenha com
  `intent: 'print'` para não depender de `requestAnimationFrame`). `src/lib/native/pdfjsBundle.ts` — pdf.js 3.11.174
  como texto, **gerado** por `scripts/embed-pdfjs.js` (não editar; `pdfjs-dist` não é dependência do projeto).
  `src/components/PdfHost.tsx` (WebView escondida) / `PdfHost.web.tsx` (iframe, só para o build web) e
  `PdfPagePicker.tsx` (miniaturas em lotes de 12 → toque → página vira JPEG em `sources` com `kind: 'image'`).
  O formato de `Project` não mudou (versão 3).
- `src/lib/shelf.ts` — estante: `progressChange` (primeiro ponto → em andamento; último → feito; desfazer reabre;
  zerar um feito devolve `ask: 'reopen'` e a tela do grid pergunta), `setStatus`, `setShelfDates`, `parseDateBR`/
  `formatDateBR`, diário (`addDiaryEntry`/`removeDiaryEntry`) e `groupShelf`. **O `updateProject` da store aplica
  `progressChange` sempre que o progresso muda** — não chame à mão. `src/lib/stats.ts` — `profileStats` (peças, pontos e
  metros só do que foi feito, cores favoritas agrupadas por `colorName`, tempo médio).
- `src/lib/backup.ts` — backup por arquivo JSON `{app:'cropartner', format, projectsVersion, exportedAt, projects,
  yarns}` (`BACKUP_FORMAT` = 1). `buildBackup` (tira `sources` e `photo`), `yarnsUsedBy`, `backupFileName`, `parseBackup` (nunca
  lança; mensagem pronta; projetos antigos passam por `migrateProjectsState`; versão mais nova é rejeitada),
  `findConflicts`, `applyImport` (substituir / manter os dois / não importar — padrão: não toca no existente) e
  `mergeYarns`. **Decisão:** imagens/PDF de origem não vão no arquivo (pesado demais para WhatsApp; o grid basta) e
  "Sou canhota" também não. Se mudar o formato de `Project`, o backup acompanha sozinho via `PROJECTS_VERSION`; só
  suba `BACKUP_FORMAT` se o envelope mudar.
- `src/lib/native/backupFile.ts` (grava em `Paths.cache` e abre `expo-sharing`; importa com `DocumentPicker`, tipo
  `*/*`) e `backupFile.web.ts` (baixa o arquivo — só para testes). `src/hooks/useBackup.ts` (exportar um/todos).
- `src/store/projects.ts` (projetos; `setProjects` para importar) e `src/store/settings.ts` (ajustes do aparelho: `leftHanded` e `yarns`, as
  linhas cadastradas). `src/hooks/useWorkOrder.ts` junta projeto + ajuste global.
- Telas em `src/app/`: `index`, `settings`, `yarns` (Minhas linhas), `backup` (exportar/importar, conflitos na própria
  tela), `shelf` (Estante, abas por estado), `profile` (Meu perfil, local), `project/[id]/index`, `grid-setup`, `grid`,
  `yarn` (abas "Lista de compras" / "Vai dar?" — abre em "Vai dar?" quando já há progresso —, linha do projeto, seletor de linha por cor, calibração, margens, consumo por ponto). A tela do grid tem o modo "Pintar /
  cores" (ferramentas Pincel / Balde / Mover; com o Pincel o `GridView` recebe `onPaint`, trava a rolagem e o arrasto
  pinta — um traço inteiro é um passo de desfazer) e o `ColorEditor` (tom por amostras, tons claro/escuro ou hex; nome;
  mesclar; excluir com confirmação **dentro do próprio painel**, sem `Alert`). `grid-setup` tem os modos "Em branco", "Da
  imagem" e "Do PDF" (escolher PDF → miniaturas → tocar na página → cai no modo "Da imagem" com a página selecionada)
  — o "Da imagem" (importar da galeria/Arquivos ali mesmo → tamanho → recorte arrastável → ler → prévia → confirmar); os erros
  de leitura aparecem no próprio cartão, não em `Alert`.

**Pendências (testar no iPhone):**
- **Spike da fatia 5 no iPhone (Expo Go)** — única coisa que falta para fechar a #5: abrir um PDF real de receita em
  modo avião, ver se as miniaturas aparecem, quanto demora para a página virar imagem, e se dá para ler um gráfico de
  ~100 colunas. Se a WebView não renderizar (tela "Abrindo o PDF…" até dar o aviso de demora) ou o app fechar com PDF
  pesado, o plano B é development build com módulo nativo. No build web (Chromium) tudo passou.
- Fontes não embutidas no PDF usam a fonte do sistema (não levamos os arquivos de fonte/cMap do pdf.js); não afeta o
  gráfico, só o texto da miniatura.
- Nada foi testado em iPhone real ainda. Conferir no aparelho: tela acesa com o grid aberto, alcance do polegar no
  botão grande, confirmações de "Zerar progresso" e de excluir projeto, e "Sou canhota".
- Fatia 4 no aparelho: arrastar o recorte dentro da tela rolável (a rolagem trava durante o arrasto), ler um print real
  do Pinterest e uma imagem HEIC da galeria, e a confirmação de substituir grid com progresso.
- Fatia 6 no aparelho: arrastar o pincel com o dedo (traço contínuo, sem a tela rolar junto), trocar entre Pincel e
  Mover num gráfico grande com zoom, e o teclado sobre o painel "Editar cor" ao renomear.
- Fatia 7: projetos salvos antes da v4 perdem o "metros/gramas por novelo" que tinham no projeto (passou a vir da linha
  cadastrada). Ninguém usava ainda, então ficou assim.
- Fatia 9 no aparelho: a folha de compartilhamento abre com o .json; salvar em Arquivos/iCloud e mandar pelo
  WhatsApp; importar pelos Arquivos (o WhatsApp às vezes muda o tipo do arquivo — por isso o seletor aceita qualquer
  tipo); **exportar num iPhone e importar no outro** (critério da issue #9).
- `expo-sharing` foi adicionado (vem no Expo Go). O `npm install --legacy-peer-deps` reescreve o `package-lock.json`
  tirando pacotes opcionais de peer (babel preset, metro config, reanimated…); por isso o lock foi editado só com a
  entrada nova. Se precisar instalar outro pacote, confira o diff do lock antes de commitar.
- Social 1 no aparelho: tirar foto da peça com a câmera, foto da galeria, digitar data DD/MM/AAAA no teclado do
  iPhone, e a pergunta ao zerar o progresso de um projeto feito (Alert — não aparece no build web).
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
- Para testar PDF no build web: copie o PDF para a pasta exportada e semeie uma fonte `{kind: 'pdf', uri: 'http://…'}`;
  PDFs de teste (com senha, inclusive) dá para gerar com `reportlab` (Python).
- Semear dados no `localStorage`: chave `cropartner-projects`, formato `{state:{projects:{...}}, version:3}`; ajustes
  na chave `cropartner-settings`, formato `{state:{leftHanded:false}, version:1}`.
- A captura `fullPage` não pega o conteúdo rolável das telas; para telas longas use um viewport alto
  (`viewport: { width: 390, height: 1400 }`). O arrasto do recorte funciona com `page.mouse` no build web, e
  `readGridFromImage` também roda lá (fonte com `uri` http servida pelo mesmo servidor estático).
- A store grava com 400 ms de atraso: nos testes com Playwright, espere ~700 ms antes de recarregar a página, senão
  a última alteração some.
- No build web, o toque numa célula do grid funciona por clique (`GridView` aceita `offsetX/Y`).

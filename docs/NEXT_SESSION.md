Estou desenvolvendo o **Cropartner**, um app de crochê (Expo + Expo Router + TypeScript, iOS/Android) no repositório
`guilhermewylde-stack/Cropartner`, branch `ccr-e8e24010-b42rfn`. Estamos seguindo o fluxo do Matt Pocock:
grill → PRD → issues (fatias verticais) → TDD. As etapas de grill e PRD já foram feitas.

**Leia primeiro:** `docs/PRD.md` (fonte da verdade: histórias, decisões, fora do escopo), `AGENTS.md` (regras do
Expo) e `README.md`. O código atual é um protótipo: os módulos puros de `src/lib/` (grid.ts, colors.ts, sampling.ts,
yarn.ts, transcribed.ts) têm testes em `src/lib/__tests__` e devem ser reaproveitados/refatorados; a UI fica em
`src/app/` e `src/components/`.

**Decisões já tomadas (não reabrir):**
- Público: uso próprio e da namorada (iPhone, provavelmente 15 Pro), com possibilidade de ir para as lojas depois.
- v1 100% no aparelho, **sem IA, sem tokens, sem login**, rodando no **Expo Go**. Remover a integração com a API da
  Anthropic (`src/lib/ai.ts`, tela de chave em `src/app/settings.tsx`, dependência `@anthropic-ai/sdk`).
- Técnica da v1: tapestry/pixel em carreiras retas. A ordem de trabalho deve ser uma interface trocável para encaixar
  **C2C** depois.
- Ajuste global **"Sou canhota"**: só muda o sentido (carreira 1 começa embaixo à esquerda); **não** espelha o desenho.
- Uso: só celular, apoiado na perna → painel de posição compacto, **botão grande "até o fim da cor"** ao alcance do
  polegar, +1/−1/fim da carreira secundários, tela sempre acesa.
- Gráficos vêm de **PDF** e **prints/imagens**. PDF → imagem pela página escolhida (validar WebView + pdf.js no Expo Go;
  plano B: development build).
- Linha: lista de compras por cor + "quanto falta" pelo progresso + estoque por cor ("vai dar / vai faltar"), linhas
  cadastradas pelo usuário (sem catálogo de marcas) e calibração visível.
- Backup por arquivo (exportar/importar/compartilhar), sem nuvem.
- Pós-v1: IA **gratuita no aparelho** (OCR Apple Vision/ML Kit + Apple Foundation Models/Gemini Nano via `expo-ai` ou
  módulo da comunidade; exige development build), depois C2C.

**Tarefa desta sessão:**
1. Criar as **issues no GitHub** (uma por fatia, na ordem abaixo), cada uma com: objetivo, histórias do PRD cobertas
   (números), critérios de aceitação verificáveis, dependências ("bloqueada por #…") e notas de teste. Mostre a lista
   antes de criar.
   1. Limpeza: remover IA/chave/SDK; ajuste global "Sou canhota" + sentido das carreiras.
   2. Grid em branco + progresso essencial (marcar até aqui, botão grande "até o fim da cor", +1/−1, fim da carreira, desfazer).
   3. Painel de posição compacto (carreira/sentido, ponto na carreira, bloco de cor, próxima cor, destaques, tela acesa).
   4. Imagem → grid (importar, recorte com grade sobreposta, leitura de cores, prévia).
   5. PDF → grid (escolher página, renderizar em imagem; começar com um spike para validar a abordagem).
   6. Editor de cores (pincel, balde, trocar tom, renomear, mesclar, adicionar/excluir).
   7. Linha I (lista de compras por cor, calibração, linhas cadastradas).
   8. Linha II (restante pelo progresso, estoque por cor, vai dar/vai faltar).
   9. Backup (exportar/importar projeto ou todos, compartilhar).
2. Depois, implementar **uma fatia por vez com TDD** (vermelho → verde → refatorar), testando o comportamento pela
   interface pública dos módulos de `src/lib/`. Ao fim de cada fatia: `npm test`, `npx tsc --noEmit`, lint, commit,
   push para a branch e comentar/fechar a issue. Comece pelas fatias 1, 2 e 3 (já permitem testar no iPhone com um
   grid desenhado à mão). Pare e me mostre o resultado ao fim de cada fatia.

**Dicas do ambiente (sessão na nuvem):**
- `npx expo install` falha porque a API do Expo é bloqueada pelo proxy; use `EXPO_OFFLINE=1 npx expo install <pkg>`.
- Para conferir o bundle: `EXPO_OFFLINE=1 CI=1 npx expo export --platform android --output-dir <scratchpad>`.
- Para capturas de tela: instale os pacotes web **sem salvar** (`npm install --no-save react-dom@19.3.0
  react-native-web@~0.21.4 @expo/metro-runtime@~58.0.17`), exporte com `--platform web`, sirva a pasta com um servidor
  estático com fallback para `index.html` e use Playwright (iPhone 13). Dá para semear dados no `localStorage` na chave
  `cropartner-projects` (formato do zustand persist: `{state:{projects:{...}}, version:1}`).
- Não crie pull request sem eu pedir.

# Fio da Meada

App de apoio ao crochê para **iOS e Android** (Expo / React Native, TypeScript).

O app funciona **100% no aparelho**: sem IA, sem login e sem rede. O plano da v1 está em [`docs/PRD.md`](docs/PRD.md) e
as fatias de trabalho estão nas issues do repositório.

## O que já faz

- **Grid**
  - *Da imagem*: você arrasta a moldura sobre a área do gráfico (com a grade por cima), confere a prévia, e o app lê a cor de cada célula no próprio aparelho (amostra o centro da célula,
    ignorando as linhas do gráfico) e agrupa numa paleta.
  - *Do PDF*: escolha o PDF da receita, toque na página do gráfico e ela vira uma imagem, que segue o mesmo caminho do *Da imagem*. Funciona sem rede (pdf.js embutido, numa WebView
    escondida). Falta validar no iPhone.
  - *Em branco*: cria um grid para você pintar.
- **Editar cores** (modo *Pintar / cores*): pincel (tocar ou arrastar), balde e *Mover* para rolar sem pintar.
  *Editar cor* troca o tom (amostras, tons mais claros/escuros ou hex — o grid inteiro muda junto), renomeia, mescla
  com outra cor ou exclui (com confirmação). O desfazer da pintura é separado do desfazer do progresso.
- **Progresso**: tocar numa célula marca tudo até ali na ordem de trabalho. O botão grande **Até o fim da cor**
  (embaixo, ao alcance do polegar) avança o bloco de cor inteiro; `+1`, `−1`, `Fim da carreira` e `Desfazer` fazem
  os ajustes finos.
- **Posição do ponto atual** (sem contar!), num painel compacto: carreira X de Y e sentido (← ou →), ponto N de M
  na carreira e quantos faltam, posição dentro do bloco de cor e a próxima cor ("faltam 3 → depois 12 Branco"). A
  carreira e o ponto atuais ficam destacados, o grid rola sozinho até eles e a tela não apaga enquanto o grid está
  aberto.
- **Sentido de trabalho**: o ajuste global **"Sou canhota"** (em Ajustes) define de que lado a carreira 1 começa —
  embaixo à direita para destras, embaixo à esquerda para canhotas — sem espelhar o desenho. Por projeto, dá para
  escolher ida e volta ou sempre no mesmo sentido.
- **Linha**:
  - *Lista de compras* por cor: metros, novelos a comprar (arredondados para cima) e gramas, pela linha de cada cor.
  - *Minhas linhas*: cadastro das suas linhas (nome, metros e gramas por novelo), usado por todos os projetos; cada
    projeto tem uma linha padrão e cada cor pode ter a sua.
  - *Vai dar?*: quanto falta de cada cor pelo progresso marcado, quanto você tem (novelos ou metros) e o veredito
    "vai dar · sobram X m" ou "vai faltar X m · compre N novelos".
  - *Calibração*: faça N pontos, meça o fio e aplique o consumo por ponto.
- **Backup**: exportar um projeto ou todos num arquivo e compartilhar (Arquivos, WhatsApp, AirDrop); importar de
  volta ou em outro aparelho, escolhendo o que fazer com projetos repetidos. As imagens/PDF de origem e o ajuste
  "Sou canhota" não vão no arquivo.

## Rodando

```bash
npm install
npx expo start        # abra no Expo Go
npm test              # testes da lógica (grid, posição, cores, leitura de pixels, linha, backup)
npm run typecheck
npm run lint
```

Builds de loja: `npx eas-cli@latest build -p ios` / `-p android`.

## Estrutura

- `src/app/` — telas (Expo Router)
- `src/lib/` — lógica pura e testada: `workOrder.ts` (ordem de trabalho — interface trocável; hoje, carreiras
  retas), `grid.ts` (posição, pintura), `progress.ts` (marcar/avançar/voltar), `history.ts` (desfazer), `colors.ts`, `sampling.ts` (leitura de pixels), `palette.ts` (editor de cores), `yarn.ts`
  (lista de compras, quanto falta, estoque, linhas cadastradas), `backup.ts` (arquivo de backup), `migrate.ts`
  (migração dos projetos e ajustes salvos)
- `src/lib/native/` — integração com módulos nativos (arquivos, imagem, PDF, compartilhamento)
- `src/store/` — projetos e ajustes do aparelho (persistidos no AsyncStorage)
- `src/components/` — `GridView` (SVG), `ColorEditor`, componentes de UI

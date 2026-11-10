# Cropartner

App de apoio ao crochê para **iOS e Android** (Expo / React Native, TypeScript).

O app funciona **100% no aparelho**: sem IA, sem login e sem rede. O plano da v1 está em [`docs/PRD.md`](docs/PRD.md) e
as fatias de trabalho estão nas issues do repositório.

## O que já faz

- **Grid**
  - *Da imagem*: recorta a área do gráfico e lê a cor de cada célula no próprio aparelho (amostra o centro da célula,
    ignorando as linhas do gráfico) e agrupa numa paleta.
  - *Em branco*: cria um grid para você pintar.
- **Trocar cores**: segure uma cor da paleta para mudar o tom (o grid inteiro muda junto), renomear, mesclar com
  outra cor ou excluir. Pincel e balde para pintar.
- **Progresso**: tocar numa célula marca tudo até ali na ordem de trabalho. O botão grande **Até o fim da cor**
  (embaixo, ao alcance do polegar) avança o bloco de cor inteiro; `+1`, `−1`, `Fim da carreira` e `Desfazer` fazem
  os ajustes finos.
- **Posição do ponto atual** (sem contar!): carreira X de Y e sentido, ponto N de M na carreira e quantos faltam,
  posição dentro do bloco de cor e os próximos blocos.
- **Sentido de trabalho**: o ajuste global **"Sou canhota"** (em Ajustes) define de que lado a carreira 1 começa —
  embaixo à direita para destras, embaixo à esquerda para canhotas — sem espelhar o desenho. Por projeto, dá para
  escolher ida e volta ou sempre no mesmo sentido.
- **Cálculo de linha**: por cor a partir do grid (pontos × consumo por ponto + margem de perda + pontas por bloco de
  cor); metros, novelos e gramas. Consumo por ponto editável, com **calibração** (faça N pontos e meça o fio).

## Rodando

```bash
npm install
npx expo start        # abra no Expo Go
npm test              # testes da lógica (grid, posição, cores, leitura de pixels, fio)
npm run typecheck
npm run lint
```

Builds de loja: `npx eas-cli@latest build -p ios` / `-p android`.

## Estrutura

- `src/app/` — telas (Expo Router)
- `src/lib/` — lógica pura e testada: `workOrder.ts` (ordem de trabalho — interface trocável; hoje, carreiras
  retas), `grid.ts` (posição, pintura), `progress.ts` (marcar/avançar/voltar), `history.ts` (desfazer), `colors.ts`, `sampling.ts` (leitura de pixels), `yarn.ts`
  (cálculo de linha), `migrate.ts` (migração dos projetos salvos)
- `src/lib/native/` — integração com módulos nativos (arquivos, imagem)
- `src/store/` — projetos e ajustes do aparelho (persistidos no AsyncStorage)
- `src/components/` — `GridView` (SVG), `ColorEditor`, componentes de UI

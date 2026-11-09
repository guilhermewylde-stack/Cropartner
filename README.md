# Cropartner

App de apoio ao crochê para **iOS e Android** (Expo / React Native, TypeScript).

## O que já faz

- **Importar receitas** em imagem (galeria, câmera) e PDF (Arquivos).
- **Ler a receita com IA** (Claude): transcreve o texto, separa materiais, agulha, abreviações e o passo a passo
  (com checkbox por carreira/etapa), estima a contagem de cada tipo de ponto e detecta se há **gráfico em grade**
  (tamanho, área na imagem e cores).
- **Grid**
  - *Da imagem*: recorta a área do gráfico e lê a cor de cada célula no próprio aparelho (amostra o centro da célula,
    ignorando as linhas do gráfico) e agrupa numa paleta.
  - *Transcrever (IA)*: a IA transcreve célula a célula — funciona também com **PDF**.
  - *Em branco*: quando a receita não tem grid, cria um para você pintar.
- **Trocar cores**: segure uma cor da paleta para mudar o tom (o grid inteiro muda junto), renomear, mesclar com
  outra cor ou excluir. Pincel e balde para pintar.
- **Progresso**: marque o que já foi feito — tocar numa célula marca tudo até ali na ordem de trabalho; ou use
  `+1 ponto`, `Fim da cor`, `Fim da carreira`, `−1` e `Desfazer`.
- **Posição do ponto atual** (sem contar!): carreira X de Y e sentido, ponto N de M na carreira e quantos faltam,
  posição dentro do bloco de cor (“Azul: ponto 4 de 9 · faltam 5”), os próximos blocos (“Depois: 3 Branco → 12 Azul”)
  e coluna contada pela esquerda e pela direita.
- **Sentido de trabalho** configurável: canto inicial e ida e volta ou sempre no mesmo sentido.
- **Cálculo de linha**: por cor a partir do grid (pontos × consumo por ponto + margem de perda + pontas por bloco de cor)
  e pela contagem de pontos da receita; metros, novelos e gramas. Consumo por ponto editável, com **calibração**
  (faça N pontos e meça o fio).

## Rodando

```bash
npm install
npx expo start        # abra num development build (ou no Expo Go)
npm test              # testes da lógica (grid, posição, cores, leitura de pixels, fio)
npm run typecheck
```

Builds de loja: `npx eas-cli@latest build -p ios` / `-p android`.

## IA

A leitura automática usa a API da Anthropic. Em **Ajustes**, cole sua chave: ela fica no armazenamento seguro do
aparelho e as requisições vão direto do app para a API. Sem chave, tudo funciona, exceto a leitura e a transcrição por IA.

> Para publicar o app para outras pessoas, o ideal é mover essas chamadas para um backend próprio em vez de pedir a
> chave de cada usuário.

## Estrutura

- `src/app/` — telas (Expo Router)
- `src/lib/` — lógica pura e testada: `grid.ts` (ordem de trabalho, posição, progresso), `colors.ts`, `sampling.ts`
  (leitura de pixels), `yarn.ts` (cálculo de linha), `ai.ts` (Claude)
- `src/lib/native/` — integração com módulos nativos (arquivos, imagem, armazenamento seguro)
- `src/components/` — `GridView` (SVG), `ColorEditor`, componentes de UI

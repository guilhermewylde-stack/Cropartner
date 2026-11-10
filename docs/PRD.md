# PRD — Cropartner v1

> Resultado da etapa de entrevista ("grill") do fluxo de Matt Pocock: grill → **PRD** → issues (fatias verticais) → TDD.

## Problema

Quem faz crochê com gráfico em grade (tapestry, pixel) precisa **contar pontos o tempo todo**. No meio de uma carreira
longa, para saber onde está, é preciso contar de novo desde a borda ou desde a última troca de cor. Isso é lento,
gera erros e é ainda pior com o celular apoiado na perna e as mãos ocupadas. Além disso:

- Os gráficos vêm em PDF ou em imagem (print, Pinterest/Instagram) e não dá para marcar o que já foi feito.
- As cores do gráfico nem sempre são as cores da linha que a pessoa tem; trocar cores "de cabeça" confunde.
- Não há um jeito simples de saber quanta linha comprar, nem se a linha que sobrou vai dar até o fim.
- Pessoas canhotas trabalham no sentido inverso e precisam adaptar a contagem mentalmente.

## Solução

Um app para celular (iOS primeiro, Android junto pelo mesmo código), **funcionando 100% no aparelho, sem custo por
uso e sem login**, que:

1. importa o gráfico de **PDF** ou **imagem** e o transforma num **grid** editável;
2. permite **trocar e ajustar as cores** do grid;
3. deixa **marcar o progresso** com o mínimo de toques, com a ação principal "avançar até o fim do bloco de cor";
4. mostra **onde está o ponto atual** (carreira, ponto na carreira, ponto dentro do bloco de cor, próxima cor), com o
   sentido certo para destros e canhotos;
5. calcula a **linha necessária** (lista de compras) e **se a linha que ela tem vai dar** para o que falta;
6. permite **exportar/importar backup** (e compartilhar projetos entre duas pessoas).

Público inicial: uso próprio / pessoas próximas (teste por Expo Go / TestFlight), com possibilidade de ir para as lojas
depois. A leitura de receitas escritas com IA vem **depois da v1**, usando **IA gratuita no próprio aparelho**.

## Histórias de usuária

### Projetos
1. Como crocheteira, quero criar um projeto com nome, para separar cada peça que estou fazendo.
2. Como crocheteira, quero ver a lista de projetos com o percentual feito, para retomar o que estava fazendo.
3. Como crocheteira, quero excluir um projeto (com confirmação), para limpar o que já terminei.

### Importar gráfico
4. Como crocheteira, quero importar um **PDF** comprado/baixado, para usar o gráfico que já tenho.
5. Como crocheteira, quero escolher **a página do PDF** onde está o gráfico, porque PDFs têm várias páginas.
6. Como crocheteira, quero importar uma **imagem** da galeria ou de Arquivos (print, Pinterest), para usar gráficos da internet.
7. Como crocheteira, quero **ajustar a área do gráfico** na imagem (sem números e legenda), para o app ler só os quadradinhos.
8. Como crocheteira, quero informar **colunas e linhas** do gráfico, e ver uma grade sobreposta na imagem, para conferir se bate antes de ler.
9. Como crocheteira, quero que o app **leia as cores** de cada quadradinho e monte o grid automaticamente, para não pintar à mão.
10. Como crocheteira, quero limitar o **número máximo de cores**, para o app não criar cores parecidas demais.
11. Como crocheteira, quero ver uma **prévia** do grid lido antes de confirmar, para refazer se ficou errado.
12. Como crocheteira, quero **criar um grid em branco** quando não tenho gráfico, para desenhar o meu.

### Editar grid e cores
13. Como crocheteira, quero **pintar células** com a cor escolhida (pincel), para corrigir erros da leitura.
14. Como crocheteira, quero **pintar uma região inteira** (balde), para corrigir áreas grandes de uma vez.
15. Como crocheteira, quero **trocar o tom de uma cor** e ver o grid inteiro mudar, para visualizar com as cores da minha linha.
16. Como crocheteira, quero **renomear** uma cor (ex.: "Vermelho Anne 3500"), para saber qual linha usar.
17. Como crocheteira, quero **mesclar duas cores**, para juntar tons que a leitura separou por engano.
18. Como crocheteira, quero **adicionar e excluir cores**, para montar minha paleta.
19. Como crocheteira, quero **desfazer** a última alteração, para não ter medo de errar.
20. Como crocheteira, quero **dar zoom** no grid, para ver gráficos grandes no celular.

### Progresso e posição (núcleo do app)
21. Como crocheteira, quero tocar numa célula e marcar **tudo até ali** como feito, na ordem de trabalho, para registrar onde parei.
22. Como crocheteira, quero um **botão grande "até o fim da cor"**, alcançável com o polegar, para avançar sem olhar enquanto crocheto.
23. Como crocheteira, quero botões secundários **+1 ponto**, **−1 ponto** e **fim da carreira**, para ajustes finos.
24. Como crocheteira, quero ver **"Carreira X de Y" e o sentido** (← ou →), para saber de que lado começar.
25. Como crocheteira, quero ver **"Ponto N de M · faltam K"** na carreira, para não contar desde a borda.
26. Como crocheteira, quero ver **"Cor: ponto N de M do bloco · faltam K"**, para saber quando trocar de cor sem contar.
27. Como crocheteira, quero ver **a próxima cor e quantos pontos ela tem** ("faltam 3 → depois 12 Branco"), para me preparar para a troca.
28. Como crocheteira, quero que a **carreira atual e o ponto atual fiquem destacados** no grid, para me localizar visualmente.
29. Como crocheteira, quero que os pontos feitos fiquem **visualmente apagados**, para ver o que falta.
30. Como crocheteira, quero que a **tela não apague** enquanto o grid está aberto, porque estou com as mãos ocupadas.
31. Como crocheteira, quero que o painel de posição seja **compacto**, para o grid ocupar a maior parte da tela.
32. Como crocheteira, quero **zerar o progresso** (com confirmação), para refazer a peça.

### Sentido de trabalho e canhotas
33. Como crocheteira **canhota**, quero ativar **"Sou canhota"** uma vez no app, para que todos os projetos comecem pelo canto inferior **esquerdo** e a contagem siga o meu sentido — sem espelhar o desenho.
34. Como crocheteira, quero escolher **ida e volta** ou **sempre no mesmo sentido** por projeto, conforme a técnica.

### Linha
35. Como crocheteira, quero uma **lista de compras**: metros, novelos e gramas **por cor**, para comprar antes de começar.
36. Como crocheteira, quero ver **quanto falta de cada cor** com base no progresso marcado, para saber se a linha que tenho vai dar.
37. Como crocheteira, quero informar **quanto tenho de cada cor** (novelos ou metros) e ver **"vai dar / vai faltar X m"**, para não ficar sem linha no meio.
38. Como crocheteira, quero **cadastrar minhas linhas** (nome, metros e gramas por novelo) e reutilizá-las em outros projetos.
39. Como crocheteira, quero **calibrar** o consumo por ponto (faço N pontos, meço o fio), para o cálculo ficar fiel à minha mão.
40. Como crocheteira, quero ajustar a **margem de perda** e a **ponta por troca de cor**, para refletir meu jeito de arrematar.

### Backup e compartilhamento
41. Como crocheteira, quero **exportar um projeto** (ou todos) para um arquivo, para salvar no iCloud Drive/WhatsApp.
42. Como crocheteira, quero **importar um arquivo de backup/projeto**, para recuperar ou receber um projeto montado por outra pessoa.

## Decisões de implementação

**Plataforma**
- Expo (SDK atual do projeto) + Expo Router + TypeScript. A v1 deve rodar no **Expo Go** (nenhum módulo nativo fora
  do Expo Go). Teste no iPhone da usuária via Expo Go/EAS Update; TestFlight quando necessário.
- **Sem IA e sem rede na v1.** Remover a integração com a API da Anthropic, a tela de chave e a dependência do SDK.

**Módulos profundos (lógica pura, testável, sem React/Expo)**
- **Ordem de trabalho** (`WorkOrder`): interface única que mapeia célula ⇄ índice de trabalho, carreira ⇄ linha do
  grid e sentido de cada carreira. Implementação v1: *carreiras retas* (canto inicial + ida e volta / mesmo sentido).
  A interface deve permitir plugar **C2C (diagonal)** depois sem mudar a UI nem o painel de posição.
- **Posição** (`positionInfo`): dado grid + ordem de trabalho + célula → carreira, ponto na carreira, bloco de cor,
  próximos blocos, totais. É a fonte única dos textos do painel.
- **Progresso**: marcar até X, avançar por ponto / fim do bloco / fim da carreira, voltar 1, zerar.
- **Grid e cores**: criar, pintar, balde, trocar cor, mesclar, excluir; contagem por cor e por bloco.
- **Leitura de pixels** (`sampleGridFromRGBA`): recorte + amostragem do centro de cada célula + agrupamento de cores
  (k-means) com limite de cores e fusão de tons próximos.
- **Linha** (`yarn`): consumo por cor (pontos × cm/ponto × (1 + perda) + pontas por bloco), novelos/gramas, **restante
  pelo progresso** e **comparação com o estoque**.
- **Backup**: (de)serialização versionada de projetos (JSON + arquivos), com validação na importação.

**Adaptadores finos (módulos nativos, não testados por unidade)**
- Arquivos (DocumentPicker/ImagePicker/FileSystem), manipulação de imagem (recorte/redimensionamento + decodificação
  PNG), **PDF → imagem** (renderização da página escolhida numa WebView com pdf.js e captura do canvas — a validar na
  primeira fatia de PDF; plano B: development build com módulo nativo), manter tela acesa (expo-keep-awake),
  compartilhamento de arquivo (expo-sharing), persistência (AsyncStorage).

**Configurações globais (não por projeto)**
- "Sou canhota": define o canto inicial padrão (inferior esquerdo) e o sentido das carreiras.
- Linhas cadastradas.

**Modelo de dados (resumo)**
- Projeto: nome, arquivos de origem, grid (linhas, colunas, células → id de cor, progresso), paleta, sentido de
  trabalho, configurações de linha, estoque por cor, última célula.
- Persistência local com versão de esquema e migração.

**Código existente**
- O protótipo atual (branch `ccr-e8e24010-b42rfn`) é referência. Os módulos puros de `src/lib/` (grid, cores,
  amostragem, linha) já têm testes e serão **reaproveitados e refatorados** nas fatias correspondentes; a UI será
  ajustada conforme as histórias acima (painel compacto, botão principal grande, etc.).

## Decisões de teste

- **TDD** (vermelho → verde → refatorar) em cada fatia, testando **comportamento externo** dos módulos profundos pela
  interface pública — não detalhes internos.
- Jest + ts-jest para `src/lib/**`. Casos obrigatórios: ordem de trabalho para os 4 cantos × 2 modos (e canhota),
  painel de posição em blocos de cor e bordas da carreira, avanço até o fim do bloco atravessando carreiras, leitura de
  pixels com linhas de grade e transparência, cálculo de linha restante e estoque, ida-e-volta do backup e rejeição de
  arquivo inválido.
- UI: verificação manual + capturas automáticas (build web + Playwright) a cada fatia que muda tela; teste real no
  iPhone pelo Expo Go nos marcos.
- `npx tsc --noEmit` e lint antes de concluir cada fatia.

## Fora do escopo (v1)

- IA de qualquer tipo (leitura de receita escrita, transcrição de grid). → **Fatia pós-v1**: OCR no aparelho (Apple
  Vision / ML Kit) + organização com IA do aparelho (Apple Foundation Models / Gemini Nano via `expo-ai` ou módulo da
  comunidade), exige development build. Sem custo por uso.
- C2C (diagonal), voltas/espiral (amigurumi), filé. → C2C é a próxima após a v1.
- Foto de papel com correção de perspectiva (recorte de 4 cantos).
- Espelhar o gráfico.
- Botões de volume / comando de voz para avançar.
- Login, sincronização em nuvem, lojas de apps, cobrança.
- Tablet / layout paisagem.

## Perguntas em aberto

- Confirmar o aparelho da usuária (iPhone 15 Pro?) e se está no iOS 26 com Apple Intelligence ativado (necessário só
  para a fatia de IA).
- Conta Apple Developer (US$ 99/ano): necessária para TestFlight/development build a partir da fatia de IA.
- Validar a renderização de PDF via WebView + pdf.js no Expo Go (desempenho com páginas grandes).

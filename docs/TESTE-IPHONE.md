# Testar o Fio da Meada no iPhone (Expo Go)

O app roda no iPhone pelo **Expo Go**, servido pelo seu computador. Não precisa de conta Apple nem de Xcode, mas
precisa de uma **conta Expo** (gratuita), usada no computador e no iPhone.

## 1. Preparar (uma vez)

1. No iPhone, instale o **Expo Go** pela App Store. Se ele disser que o projeto é de outra versão do SDK, me avise: o
   app usa o **SDK 58**.
2. No computador, instale o **Node.js** (versão LTS, em nodejs.org) e o **Git** (git-scm.com).
3. Crie uma conta gratuita em **expo.dev/signup**. No iPhone, abra o Expo Go, toque no perfil e entre com ela.
4. Abra o terminal (no Windows: PowerShell) e baixe o projeto:

```bash
git clone https://github.com/guilhermewylde-stack/Cropartner.git
```

```bash
cd Cropartner
```

```bash
git checkout claude/epic-gates-lcp2u2
```

```bash
npm install --legacy-peer-deps
```

Os avisos amarelos `npm warn deprecated` são normais. Depois, entre na mesma conta Expo no computador (pede usuário e
senha):

```bash
npx expo login
```

No Windows, o `npx expo login` pode tentar abrir o navegador e fechar com erro (`cmd.exe /c start ... exited with
non-zero code: 1`). Nesse caso, entre com usuário e senha no terminal:

```bash
npx expo login -u SEU_USUARIO
```

Se ainda assim abrir o navegador e falhar, crie um token em expo.dev → Account settings → Access tokens e use na
janela do PowerShell (vale só para aquela janela; não compartilhe o token):

```bash
$env:EXPO_TOKEN="cole-o-token-aqui"
```

Confira com `npx expo whoami` (deve mostrar o seu usuário).

## 2. Abrir no iPhone

1. iPhone e computador na **mesma rede Wi-Fi**.
2. No terminal, dentro da pasta `Cropartner`:

```bash
npx expo start
```

3. Aparece um **QR code** no terminal. Aponte a **câmera do iPhone** para ele e toque no aviso para abrir no Expo Go.
4. No Windows, se o firewall perguntar, permita o Node.js em **redes privadas**.
5. Erro **"You need to be signed in to Expo Go and Expo CLI"**: falta entrar na mesma conta Expo no computador
   (`npx expo login`) e no Expo Go. Avisos de atualização do `expo` e do `tsconfig.json` podem ser ignorados.
6. Não conectou (rede do trabalho, roteador que isola aparelhos)? Pare com `Ctrl+C` e use o túnel:

```bash
npx expo start --tunnel
```

Para pegar as novidades depois (quando eu subir mais coisas), pare com `Ctrl+C` e rode:

```bash
git pull
```

```bash
npm install --legacy-peer-deps
```

```bash
npx expo start
```

O `npm install` pode alterar o `package-lock.json` no seu computador; tudo bem, não precisa enviar essa mudança.

## 3. O que testar

Marque o que funcionou e me conte o que não funcionou (com print de tela, se der). Prioridade de cima para baixo.

### PDF (o que mais preocupa — fecha a issue #5)
- [ ] Ative o **modo avião**. Crie um projeto → Criar grid → **Do PDF** → escolha um PDF real de receita.
- [ ] As **miniaturas** das páginas aparecem? Quanto tempo levou?
- [ ] Toque na página do gráfico: quanto tempo até virar imagem?
- [ ] Ajuste o recorte e leia um gráfico grande (~100 colunas): as cores bateram?
- [ ] Se travar em "Abrindo o PDF…" ou o app fechar, me diga o tamanho do PDF (MB) e quantas páginas.

### Imagem → grid
- [ ] **Da imagem** com um print do Pinterest/Instagram: arrastar o recorte (a tela não pode rolar junto).
- [ ] Uma foto **HEIC** da galeria (foto comum do iPhone).
- [ ] Recriar o grid de um projeto que já tem progresso: aparece a confirmação?

### Crochetando (o núcleo)
- [ ] Com o grid aberto, a **tela não apaga** sozinha.
- [ ] O botão grande **Até o fim da cor** fica ao alcance do polegar segurando o celular com uma mão.
- [ ] Os números do painel (carreira, ponto, bloco de cor) batem com o gráfico.
- [ ] **Ajustes → Sou canhota**: a carreira 1 passa a começar embaixo à esquerda.
- [ ] **Zerar progresso** (⚙ no grid) e **excluir projeto** (segurar na lista) pedem confirmação.

### Cores (modo Pintar / cores)
- [ ] **Pincel** arrastando o dedo: traço contínuo, sem a tela rolar.
- [ ] Alternar **Pincel** e **Mover** num gráfico grande com zoom.
- [ ] **Editar cor** → renomear: o teclado não cobre o campo?

### Linha
- [ ] Cadastrar uma linha em **Minhas linhas** usando vírgula nos números.
- [ ] **Vai dar?**: digitar o estoque com vírgula e tocar fora do campo — o veredito atualiza?

### Backup (precisa de dois iPhones)
- [ ] **Backup e compartilhar** → Compartilhar um projeto: abre a folha do iPhone? Salvar em **Arquivos**.
- [ ] Mandar o arquivo pelo **WhatsApp** para o outro iPhone e importar lá (Escolher arquivo).
- [ ] Importar de novo no mesmo iPhone: aparece "Manter os dois / Substituir / Não importar"?

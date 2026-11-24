# PRD — Fio da Meada: estante, diário e rede de amigas

> Segunda etapa do fluxo de Matt Pocock (grill → **PRD** → issues → TDD), depois da v1 (`docs/PRD.md`).
> Entrevista feita em 24/11/2026. As decisões abaixo foram tomadas pelo usuário e não devem ser reabertas sem ele.

## Problema

O Fio da Meada já ajuda a fazer uma peça: contar pontos, trocar cores e saber se a linha vai dar. Mas o crochê
também é social. Quem crocheta quer **guardar o que já fez**, **lembrar o que quer fazer**, **mostrar a peça pronta**
e **ver o que as amigas estão fazendo**. Hoje isso fica espalhado em fotos na galeria, grupos de WhatsApp e
Instagram, sem ligação com o gráfico, as cores e a linha usadas.

## Solução

Somar ao app uma camada no estilo dos apps de livros e filmes:

1. **Estante e diário**: cada projeto tem um estado (quero fazer / em andamento / feito), datas e uma foto da peça
   pronta; terminar uma peça gera um registro no diário. Um **perfil** mostra as estatísticas (peças feitas, metros de
   linha, cores favoritas).
2. **Conta e grupo fechado**: entrar com **código por e-mail**, só com **convite**. Perfil com nome, @usuário e foto.
3. **Publicar projetos**: cada projeto é **privado** até a pessoa tocar em "Publicar". Publicado, ele vai **inteiro**
   (gráfico, cores, progresso, linhas, foto) e outras pessoas podem copiá-lo para os próprios projetos.
4. **Seguir e feed**: seguir amigas e ver no feed quando começam, avançam e terminam projetos publicados.
5. **Curtir e comentar** nos registros do feed.

O app continua funcionando **sem internet**: os projetos ficam no aparelho como hoje, e a nuvem guarda **só o que é
publicado** (e o perfil). Trocar de celular continua sendo pelo backup por arquivo.

Público: **fechado primeiro** (o casal e amigas, por convite) e **aberto depois**, quando a fatia de abertura (moderação,
denúncia, Entrar com a Apple, termos) estiver pronta.

## Histórias de usuária

### Estante e diário (no aparelho)
1. Como crocheteira, quero marcar um projeto como **quero fazer**, **em andamento** ou **feito**, para organizar minha estante.
2. Como crocheteira, quero que o app anote **quando comecei e quando terminei** (dá para corrigir), para lembrar quanto tempo levou.
3. Como crocheteira, quero **fotografar a peça pronta** (ou escolher da galeria), para ver o resultado ao lado do gráfico.
4. Como crocheteira, quero escrever uma **nota no diário** ao terminar (o que achei, para quem foi), para lembrar depois.
5. Como crocheteira, quero ver minha **estante** por estado, com fotos, para escolher o próximo projeto.
6. Como crocheteira, quero ver no meu **perfil** quantas peças fiz, quantos metros de linha usei e minhas cores mais usadas, para acompanhar minha evolução.
7. Como crocheteira, quero criar um projeto "quero fazer" só com nome, foto ou link de referência, antes de ter o gráfico.

### Conta e grupo
8. Como convidada, quero **entrar com meu e-mail e um código** (sem senha), para não precisar lembrar de senha.
9. Como dona do grupo, quero **gerar convites**, para só quem eu chamar entrar enquanto o app é fechado.
10. Como crocheteira, quero um **perfil** com nome, @usuário e foto, para as amigas me acharem.
11. Como crocheteira, quero **sair** da conta e **excluir minha conta** (com tudo que publiquei), para ter controle dos meus dados.
12. Como crocheteira, quero continuar usando o app **sem conta e sem internet**, como hoje.

### Publicar
13. Como crocheteira, quero **publicar** um projeto com um toque (e despublicar), para decidir o que as amigas veem.
14. Como crocheteira, quero informar a **fonte do gráfico** (autoral, gratuito com link, comprado de quem), para dar crédito.
15. Como crocheteira, quero que o **progresso publicado acompanhe** o que eu marco, sem precisar publicar de novo.
16. Como amiga, quero abrir um projeto publicado e ver o gráfico, as cores e as linhas, só para leitura.
17. Como amiga, quero **copiar** um projeto publicado para os meus projetos, para fazer a minha versão.

### Seguir e feed
18. Como crocheteira, quero **procurar** pessoas do grupo e **seguir / deixar de seguir**.
19. Como crocheteira, quero um **feed** com o que as pessoas que sigo começaram, avançaram e terminaram, do mais novo para o mais antigo.
20. Como crocheteira, quero abrir o **perfil de uma amiga** e ver a estante dela (só os projetos publicados).

### Curtir e comentar
21. Como crocheteira, quero **curtir** um registro do feed.
22. Como crocheteira, quero **comentar** e apagar meus comentários.
23. Como crocheteira, quero ver quando alguém curtiu ou comentou algo meu (aviso dentro do app).

## Decisões de implementação

**Decisões da entrevista (não reabrir)**
- Servidor: **Supabase** (Postgres, login, armazenamento de fotos, regras de acesso por linha — RLS). O SDK JS roda no
  Expo Go; confirmar na documentação da versão na hora de instalar (regra do `AGENTS.md`).
- Login: **código por e-mail** (OTP de 6 dígitos, sem senha). "Entrar com a Apple" fica para a fatia de abertura.
- Grupo **fechado por convite** no início; aberto depois.
- Projetos **privados por padrão**; publicar é uma escolha por projeto.
- Publicar leva **tudo, inclusive o gráfico** (decisão do usuário). Contrapeso: campo **fonte do gráfico** e revisão
  dessa regra na fatia de abertura ao público.
- A nuvem guarda **só o que é publicado** e o perfil. Projetos privados nunca saem do aparelho. Sem sincronização entre
  aparelhos; o backup por arquivo continua sendo o caminho para trocar de celular.

**Módulos profundos (lógica pura, testável, sem React/Expo/Supabase)**
- **Estante** (`shelf`): estados e transições (quero fazer → em andamento → feito, e voltar), datas automáticas
  (começou ao marcar o primeiro ponto ou mudar para "em andamento"; terminou ao concluir o gráfico ou marcar "feito"),
  agrupamento e ordenação da estante.
- **Estatísticas** (`stats`): peças feitas por período, metros de linha usados (reaproveita `yarn.ts`), pontos, cores
  mais usadas (agrupando tons parecidos com `colors.ts`), tempo médio por peça.
- **Publicação** (`publish`): monta o retrato publicado de um projeto (reaproveita a validação do `backup.ts`), decide
  quando a publicação precisa ser atualizada (progresso mudou, estado mudou, foto mudou) e gera os eventos do feed.
- **Feed** (`feed`): agrupa eventos ("avançou" repetido vira um só por dia), texto de cada evento, paginação por data.
- **Cópia** (`copyProject`): projeto publicado → projeto local novo (progresso zerado, linhas resolvidas pelo nome).

**Adaptadores finos (não testados por unidade)**
- Cliente Supabase (sessão guardada no aparelho), login por código, upload de fotos, chamadas de publicar/seguir/curtir.
- Câmera/galeria para a foto da peça (já existe `expo-image-picker`).

**Modelo de dados**
- Local (`Project`, nova versão de migração): `shelf: { status, startedAt?, finishedAt? }`, `photo?` (arquivo local),
  `diary?: { note, date }[]`, `chartSource?: { kind: 'own' | 'free' | 'bought', name?, url? }`,
  `published?: { remoteId, lastSyncedAt }`. O backup por arquivo leva os campos novos (a foto não, como as fontes).
- Nuvem (Postgres + RLS): `profiles` (id, @usuário único, nome, foto), `invites` (código, quem criou, quem usou),
  `follows` (quem segue, quem é seguida), `published_projects` (dona, retrato do projeto em JSON, foto, fonte,
  progresso, estado, datas), `events` (quem, projeto, tipo, quando), `likes`, `comments`. Regras: cada pessoa só altera
  o que é dela; lê perfis e publicações de quem está no grupo; ninguém lê projeto não publicado (eles nem existem na
  nuvem).
- Chaves: só a URL do projeto e a chave pública (anon) do Supabase no app, por variável `EXPO_PUBLIC_*`. Nenhum
  segredo no repositório.

## Decisões de teste

- **TDD** nos módulos puros (estante, estatísticas, publicação, feed, cópia), pela interface pública, como na v1.
- Casos obrigatórios: transições de estado e datas automáticas (inclusive desfazer o progresso até zero), estatísticas
  com projetos sem grid / sem linha, retrato publicado que ida-e-volta (publicar → copiar devolve o mesmo gráfico),
  agrupamento de eventos do feed, migração do formato local.
- Regras de acesso (RLS): script SQL de verificação rodado num projeto Supabase de teste (a sessão na nuvem pode não
  alcançar o Supabase — nesse caso, o usuário roda e cola o resultado).
- UI: capturas no build web + Playwright, como na v1; login e fotos conferidos no iPhone.

## Fora do escopo (desta etapa)

- Sincronizar projetos privados entre aparelhos; usar a conta em dois celulares ao mesmo tempo.
- Notificações push (só aviso dentro do app).
- Mensagens diretas, grupos, eventos, loja/marketplace de receitas.
- Página por gráfico (ver as versões de todo mundo do mesmo gráfico) — ficou para depois.
- Versão web do app.
- IA (continua no plano pós-v1) e C2C.

## Perguntas em aberto

- Conta Supabase: o usuário cria o projeto (plano gratuito; conferir os limites atuais) e passa a URL e a chave
  pública. A rede da sessão na nuvem precisa liberar o domínio do projeto para testar daqui.
- Quem modera no grupo fechado (o próprio usuário?) e o que acontece com convites não usados.
- Limite de tamanho e compressão das fotos das peças.
- Antes de abrir ao público: revisar "publicar inclusive o gráfico", termos de uso, política de privacidade (LGPD),
  denúncia/bloqueio, Entrar com a Apple e o registro do nome (INPI, domínio).

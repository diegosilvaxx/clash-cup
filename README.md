# Clash Cup

Portal de torneios de Clash Royale em um monorepo com microfrontends.

## Requisitos

- Node.js **24.21.0**.
- npm **10 ou superior**.

## Iniciar

Na raiz do projeto:

```powershell
npm ci
```

Na primeira execução, crie o arquivo de ambiente:

```powershell
Copy-Item .env.example .env
```

Para consultar jogadores, baús e torneios na API oficial, configure `CLASH_ROYALE_API_TOKEN` no `.env`. O portal e a verificação de saúde funcionam sem token; as consultas externas retornam uma mensagem de integração não configurada.

Em hospedagens sem IP fixo, como a Vercel gratuita, é possível selecionar o proxy da RoyaleAPI com `CLASH_ROYALE_API_PROVIDER=royaleapi`. Veja a [configuração do proxy e da chave](docs/deployment.md#proxy-da-royaleapi).

Para login e vínculo do jogador, preencha os quatro campos `VITE_FIREBASE_*` e confira a [configuração da autenticação](docs/authentication.md), incluindo métodos de login, domínio autorizado e regras do Firestore. Sem essa configuração, o portal público permanece acessível e o login informa a indisponibilidade.

Para o painel administrativo, configure também as credenciais do servidor e o primeiro responsável conforme [Administração](docs/administration.md).

```powershell
npm run dev
```

| Serviço                    | Endereço                           |
| -------------------------- | ---------------------------------- |
| Shell integrado            | <http://127.0.0.1:5300>            |
| Portal independente        | <http://127.0.0.1:5301>            |
| Autenticação independente  | <http://127.0.0.1:5302/entrar>     |
| Competições independente   | <http://127.0.0.1:5303/torneios>   |
| Jogador independente       | <http://127.0.0.1:5304>            |
| Administração independente | <http://127.0.0.1:5305/admin>      |
| Saúde da API               | <http://127.0.0.1:5400/api/health> |

Use `127.0.0.1` nos endereços. Para encerrar os serviços, pressione `Ctrl+C` no terminal que executa o projeto.

### Executar separadamente

Cada comando deve ser executado em um terminal diferente, na raiz:

```powershell
npm run dev:api
```

```powershell
npm run dev:portal
```

```powershell
npm run dev:auth
```

```powershell
npm run dev:competition
```

```powershell
npm run dev:player
```

```powershell
npm run dev:admin
```

```powershell
npm run dev:shell
```

O shell depende do portal para exibir a página inicial. Se o portal estiver parado, o shell apresenta a opção de tentar novamente; a página Sobre permanece acessível. Inicie o portal e clique em **Tentar novamente** para recuperar a página inicial.

As telas de conta dependem do remoto `auth`. Shell e remoto compartilham a sessão no portal integrado; aplicações em portas diferentes mantêm sessões independentes.

A área [Meus campeonatos](docs/championships.md) permite criar chaves de 8, 16 ou 32 jogadores, registrar placares e compartilhar uma arte em JPG. Para salvar e compartilhar, publique as regras do Firestore indicadas nessa documentação.

As rotas de torneios usam o remoto `competition`. Veja [torneios e inscrições](docs/competitions.md) para dados, regras e compatibilidade com inscrições antigas.

A [área do jogador](docs/player.md) oferece perfil e próximos baús pelo BFF, além da página informativa de apoio VIP. A [loja e o ranking](docs/rewards.md) adicionam saldo, coleção de emblemas e consulta ao histórico. Para comprar, o saldo precisa estar associado à conta pela organização e as regras desta etapa precisam estar publicadas.

### Build e prévia

```powershell
npm run build
```

```powershell
npm run preview
```

A prévia usa as mesmas portas do desenvolvimento. Encerre a execução anterior antes de iniciá-la. O comando `preview` verifica os artefatos localmente; a publicação na Vercel utiliza a configuração descrita em [Produção](docs/deployment.md).

## Docker

Com o Docker Desktop aberto, Linux containers habilitados e o `.env` configurado, encerre os servidores Node e execute na raiz:

```powershell
docker compose up --build --wait
```

Abra <http://127.0.0.1:5300>. Confira os sete serviços com `docker compose ps` e encerre com `docker compose down`. Não é necessário instalar Node.js no computador para essa execução.

Para utilizar o JSON administrativo já indicado em `GOOGLE_APPLICATION_CREDENTIALS`:

```powershell
docker compose -f compose.yaml -f compose.admin.yaml up --build --wait
```

Para iniciar apenas o BFF e o shell:

```powershell
docker compose up --build --wait api shell
```

O shell permanece acessível; as áreas cujos remotos não foram iniciados mostram a opção de tentar novamente. Os comandos `up` não param serviços que já estavam ativos. Veja [Docker](docs/docker.md) para acrescentar serviços, configurar credenciais, atualizar variáveis e executar os testes isolados.

## Produção

A configuração `vercel.json` publica os sete serviços em um projeto Vercel, com uma única URL para o portal. Confira [Publicação na Vercel](docs/deployment.md) para variáveis, Firebase e validação dos builds. A integração do Clash Royale exige IP de saída autorizado para o BFF; esse requisito também precisa ser atendido na hospedagem.

## Estrutura

```text
apps/
  shell/        Navegação e carregamento dos microfrontends
  portal/       Apresentação, dúvidas, contato, apoiadores e privacidade
  auth/         Login, cadastro, vínculo e conta
  competition/  Torneios, inscrições e ranking
  player/       Perfil, baús, VIP, loja e emblemas
  admin/        Torneios, saldos, resultados e acessos administrativos
  api/          Integração com a API oficial do Clash Royale
packages/
  contracts/    Contratos e validação em execução
  http/         Cliente Axios compartilhado
  session/      Sessão Firebase e vínculo do jogador
  firebase/     Aplicação Firebase e SDKs compartilhados
  competitions/ Acesso aos torneios e transações de inscrição
  rewards/      Catálogo, compras atômicas e ranking
  ui/           Componentes e estilos compartilhados
tooling/        Configuração de build e aliases
scripts/        Inicialização e verificação de arquitetura
tests/e2e/     Testes do portal integrado e da recuperação
docker/        Configuração de containers e gateway
docs/          Arquitetura, migração e execução
```

React, React DOM, React Router e styled-components são compartilhados como singletons pelo Module Federation. O shell fornece o layout e o roteador ao conteúdo remoto. O portal também possui uma entrada independente.

## Verificações

```powershell
npm run check
```

Executa a verificação dos limites entre aplicações, tipos, lint, formatação, testes automatizados e builds.

Para os testes de navegador:

```powershell
npx playwright install chromium
```

```powershell
npm run test:e2e
```

Para verificar o formato de publicação, execute `npm run test:vercel`. Para verificar Docker com dados fictícios, encerre os servidores e containers em execução e use `npm run verify:docker`. Os dois comandos estão detalhados na [documentação de entrega](docs/deployment.md).

Os testes E2E geram builds próprios em `dist/e2e` e iniciam e encerram seus servidores; mantenha as portas da tabela livres. Há cenários de desktop e celular para o portal, autenticação, vínculo, torneios, inscrições, perfil, baús, loja, emblemas, ranking, administração, conteúdo público, teclado, execução independente, navegação, proxy da API e recuperação de falhas. Firebase e consultas externas usam respostas simuladas; os cenários automatizados não alteram contas ou dados reais.

## API

Os caminhos da integração anterior foram mantidos:

| Método | Caminho               | Parâmetro |
| ------ | --------------------- | --------- |
| GET    | `/api/health`         | —         |
| GET    | `/api/player`         | `idclash` |
| GET    | `/api/upcomingchests` | `idclash` |
| GET    | `/api/tournaments`    | `tag`     |

Para criar a chave no portal Clash Royale, informe em **Allowed IP Addresses** o IPv4 público da conexão em que o BFF será executado. No PowerShell desse computador, consulte-o com:

```powershell
Invoke-RestMethod 'https://api.ipify.org'
```

`127.0.0.1`, `localhost` e endereços privados da rede não são aceitos nesse cadastro. O portal continua sendo acessado localmente em `127.0.0.1`; a API externa identifica o IP público de saída. Copie o token gerado para `CLASH_ROYALE_API_TOKEN` no `.env` e reinicie `npm run dev`. Se o IP público mudar, gere uma chave para o novo IP.

As tags aceitam letras e números, com `#` inicial opcional. A tag é normalizada e codificada antes da consulta externa. O cliente deve codificar `#` como `%23` ao montar a query string. O token existe somente no servidor e os erros não expõem a configuração da requisição.

## Conteúdo público

As páginas de início, [regras e dúvidas](http://127.0.0.1:5300/regras), [contato](http://127.0.0.1:5300/contato), [apoiadores](http://127.0.0.1:5300/apoiadores) e [dados e privacidade](http://127.0.0.1:5300/politicas) funcionam sem login. Estão disponíveis no rodapé e também no portal independente. A página Sobre permanece no shell para continuar acessível se o remoto público estiver indisponível.

Para configurar o destino dos links que saem das aplicações independentes para o portal integrado, defina `VITE_SHELL_URL` no `.env` e reinicie o desenvolvimento ou gere outro build. O padrão local é `http://127.0.0.1:5300`.

Veja os [detalhes do conteúdo público e da navegação](docs/public-portal.md).

A [identidade visual e a responsividade](docs/design.md) seguem o universo Clash Royale, com componentes compartilhados e dados reais nos destaques da página inicial.

## Migração

As oito etapas abrangem fundação, autenticação, competições, área do jogador, loja, ranking, administração, conteúdo público e entrega. O repositório inclui CI, configuração de produção, Docker e testes dos ambientes de execução. Não há importação automática de dados anteriores.

As [regras de competições](docs/competitions.md#aplicar-as-regras) alteram as permissões do fluxo antigo de torneios. As [regras de loja e ranking](docs/rewards.md#aplicar-as-regras) também restringem as gravações antigas e exigem associação do saldo ao UID. A [administração](docs/administration.md#autorização-e-regras) usa operações autorizadas pelo BFF e mantém os comprovantes privados. Revise a transição e valide as regras em uma base de teste antes de publicá-las no Firebase compartilhado.

Veja o [levantamento das funcionalidades e as próximas etapas](docs/migration.md). Os três projetos originais permanecem como referência, sem alteração dos serviços e dados existentes.

## Créditos

Identidade visual e conteúdo inicial provenientes do projeto Clash Cup. A licença do template do site original está preservada em [licenses/legacy-site.txt](licenses/legacy-site.txt). Recursos e marcas de Clash Royale pertencem aos respectivos titulares.

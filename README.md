# Clash Cup

Portal de torneios de Clash Royale em um monorepo com microfrontends.

## Requisitos

- Node.js **24.21.0**.
- npm **10 ou superior**.

## Iniciar

Na raiz do projeto:

```powershell
npm install
```

Na primeira execução, crie o arquivo de ambiente:

```powershell
Copy-Item .env.example .env
```

Para consultar jogadores, baús e torneios na API oficial, configure `CLASH_ROYALE_API_TOKEN` no `.env`. O portal e a verificação de saúde funcionam sem token; as consultas externas retornam uma mensagem de integração não configurada.

Para login e vínculo do jogador, preencha os quatro campos `VITE_FIREBASE_*` e confira a [configuração da autenticação](docs/authentication.md), incluindo métodos de login, domínio autorizado e regras do Firestore. Sem essa configuração, o portal público permanece acessível e o login informa a indisponibilidade.

```powershell
npm run dev
```

| Serviço                   | Endereço                           |
| ------------------------- | ---------------------------------- |
| Shell integrado           | <http://127.0.0.1:5300>            |
| Portal independente       | <http://127.0.0.1:5301>            |
| Autenticação independente | <http://127.0.0.1:5302/entrar>     |
| Saúde da API              | <http://127.0.0.1:5400/api/health> |

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
npm run dev:shell
```

O shell depende do portal para exibir a página inicial. Se o portal estiver parado, o shell apresenta a opção de tentar novamente; a página Sobre permanece acessível. Inicie o portal e clique em **Tentar novamente** para recuperar a página inicial.

As telas de conta dependem do remoto `auth`. Shell e remoto compartilham a sessão no portal integrado; aplicações em portas diferentes mantêm sessões independentes.

### Build e prévia

```powershell
npm run build
```

```powershell
npm run preview
```

A prévia usa as mesmas portas do desenvolvimento. Encerre a execução anterior antes de iniciá-la. O comando `preview` verifica os artefatos localmente; a configuração de hospedagem será tratada na etapa de deploy.

## Estrutura

```text
apps/
  shell/        Navegação e carregamento dos microfrontends
  portal/       Primeiro microfrontend: apresentação pública
  auth/         Login, cadastro, vínculo e conta
  api/          Integração com a API oficial do Clash Royale
packages/
  contracts/    Contratos e validação em execução
  http/         Cliente Axios compartilhado
  session/      Sessão Firebase e vínculo do jogador
  ui/           Componentes e estilos compartilhados
tooling/        Configuração de build e aliases
scripts/        Inicialização e verificação de arquitetura
tests/e2e/     Testes do portal integrado e da recuperação
docs/          Arquitetura e plano de migração
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

Os testes geram builds próprios em `dist/e2e` e iniciam e encerram seus servidores; mantenha as portas da tabela livres. Há cenários de desktop e celular para o portal, autenticação, vínculo, execução independente, navegação, proxy da API e recuperação de falhas. Firebase e consultas externas usam respostas simuladas; os cenários automatizados não alteram contas ou dados reais.

## API

Os caminhos da integração anterior foram mantidos:

| Método | Caminho               | Parâmetro |
| ------ | --------------------- | --------- |
| GET    | `/api/health`         | —         |
| GET    | `/api/player`         | `idclash` |
| GET    | `/api/upcomingchests` | `idclash` |
| GET    | `/api/tournaments`    | `tag`     |

As tags aceitam letras e números, com `#` inicial opcional. A tag é normalizada e codificada antes da consulta externa. O cliente deve codificar `#` como `%23` ao montar a query string. O token existe somente no servidor e os erros não expõem a configuração da requisição.

## Migração

Estão implementadas a fundação e a **etapa 2 de autenticação**: login, cadastro, sessão compartilhada, reconhecimento do vínculo antigo e criação do novo vínculo por UID. Inscrições, ranking, perfil completo, loja e administração serão migrados nas próximas etapas. Não há importação automática de dados anteriores.

Veja o [levantamento das funcionalidades e as próximas etapas](docs/migration.md). Os três projetos originais permanecem como referência, sem alteração dos serviços e dados existentes.

## Créditos

Identidade visual e conteúdo inicial provenientes do projeto Clash Cup. A licença do template do site original está preservada em [licenses/legacy-site.txt](licenses/legacy-site.txt). Recursos e marcas de Clash Royale pertencem aos respectivos titulares.

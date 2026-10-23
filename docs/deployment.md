# Publicação na Vercel

## Estrutura do deploy

O `vercel.json` define sete Services: `shell`, `portal`, `auth`, `competition`, `player`, `admin` e `api`. O projeto tem uma única URL pública. Os módulos ficam em `/remotes/<nome>/` e o BFF em `/api/`; as demais rotas seguem para o shell.

Cada serviço tem instalação, build e diretório de saída definidos. As dependências de desenvolvimento são instaladas explicitamente, pois TypeScript e Vite são necessários durante o build. Os caminhos dos módulos são relativos à origem do deploy, funcionando também em URLs de preview. O BFF exporta um handler HTTP chamável, sem abrir uma porta; a plataforma gerencia o servidor e as requisições. A inicialização local e Docker envolve esse mesmo handler em um servidor Node.

Essa configuração segue o modelo atual de [Vercel Services](https://vercel.com/kb/guide/vercel-services). Serviços no mesmo projeto são publicados juntos. O Docker é uma opção local e não é enviado à Vercel.

O `package.json` fixa `jose@5.10.0` somente na dependência de `jwks-rsa`, usada pelo Firebase Admin. Essa versão oferece uma entrada CommonJS e evita `ERR_REQUIRE_ESM` nos ambientes que não permitem `require()` de módulos ESM. Mantenha o `package-lock.json` atualizado junto com esse override. O teste `firebase-compatibility.test.ts` carrega as dependências reais em outro processo Node com esse recurso desativado e verifica uma assinatura usando uma chave JWKS local, sem credenciais ou chamadas externas. Reavalie o override quando a cadeia de dependências corrigir o carregamento, conforme o [relato no Firebase Admin](https://github.com/firebase/firebase-admin-node/issues/3181).

## Chamadas e bindings

| Origem da chamada                                    | Destino                             | Caminho utilizado                      |
| ---------------------------------------------------- | ----------------------------------- | -------------------------------------- |
| Navegador, executando o shell                        | Módulos dos cinco remotos           | `/remotes/<nome>/remoteEntry.js`       |
| Navegador, executando autenticação e área do jogador | BFF                                 | `/api/*`                               |
| Navegador, executando administração                  | BFF com token de sessão             | `/api/admin/*`                         |
| Navegador                                            | Firebase Authentication e Firestore | SDK público do Firebase                |
| BFF                                                  | Clash Royale e Firebase Admin       | Integrações externas ao projeto Vercel |

Os seis frontends são aplicações estáticas. Não executam Functions que chamem outro serviço do projeto. Por isso, esta arquitetura não declara bindings: as chamadas do navegador usam as rewrites públicas, e o único backend consulta serviços externos. A sessão compartilhada por Module Federation também existe no navegador.

Os [bindings da Vercel](https://vercel.com/docs/services/bindings) aplicam-se a chamadas entre Functions durante a execução. Se outro backend interno for adicionado, o binding deve ser declarado no serviço chamador e a URL injetada deve ser lida no servidor, sem defini-la manualmente nem copiá-la para `VITE_*`.

Todos os sete serviços possuem uma rota pública. O remoto `admin` expõe os arquivos da interface; acesso aos dados e operações continua protegido no BFF. Os nomes `api:5400` e `<remoto>:8080` pertencem somente à rede Docker, e as portas 5300–5400 são padrões de desenvolvimento. Nenhum deles é utilizado para descobrir serviços no deploy Vercel.

Os serviços mantêm `root: "."` para instalar os workspaces pelo lockfile da raiz; os comandos selecionam a aplicação correta. O backend usa `runtime: "node"` e o entrypoint HTTP específico da Vercel, exportando uma função `(request, response)`.

## Configurar o projeto

1. Importe o repositório do monorepo na Vercel e selecione a raiz do repositório como **Root Directory**.
2. Se houver seleção de framework, use **Services**. Mantenha os comandos e diretórios definidos por serviço no `vercel.json`, sem sobrescrever tudo com o diretório de apenas uma aplicação.
3. Selecione Node.js **24.x**, em uma versão que atenda ao mínimo do projeto.
4. Cadastre as variáveis abaixo para os ambientes desejados, antes de gerar o deploy.

| Variável                      | Uso                                                                |
| ----------------------------- | ------------------------------------------------------------------ |
| `VITE_FIREBASE_API_KEY`       | Configuração pública do app Web Firebase                           |
| `VITE_FIREBASE_AUTH_DOMAIN`   | Domínio do app Web Firebase                                        |
| `VITE_FIREBASE_PROJECT_ID`    | Projeto do app Web Firebase                                        |
| `VITE_FIREBASE_APP_ID`        | Identificador do app Web Firebase                                  |
| `VITE_VIP_SUPPORT_URL`        | Endereço de apoio, atualmente `https://patreon.com/clashcupbrasil` |
| `CLASH_ROYALE_API_TOKEN`      | Token do jogo, usado somente pelo BFF                              |
| `CLASH_ROYALE_API_PROVIDER`   | `official` (padrão) ou `royaleapi` para utilizar o proxy           |
| `FIREBASE_PROJECT_ID`         | Mesmo projeto Firebase utilizado no frontend                       |
| `FIREBASE_ADMIN_CLIENT_EMAIL` | Campo `client_email` do JSON da conta de serviço                   |
| `FIREBASE_ADMIN_PRIVATE_KEY`  | Campo `private_key` do JSON da conta de serviço                    |

As variáveis administrativas e o token do jogo devem ser marcados como sensíveis na plataforma. Nunca utilize prefixo `VITE_` para esses segredos. A chave privada aceita quebras de linha reais ou a sequência literal `\n`. Não coloque o JSON no repositório nem informe o caminho Windows em `GOOGLE_APPLICATION_CREDENTIALS` na Vercel.

No modo Vercel, os links para o portal usam a origem atual; não é necessário configurar `VITE_SHELL_URL`. Também não configure endereços `127.0.0.1` ou nomes de containers em `CUP_*_REMOTE_URL` para esse deploy.

O arquivo `.env` local não é enviado à plataforma. Após modificar variáveis, gere um novo deploy, especialmente para alterações em `VITE_*`.

## IP autorizado da API do Clash Royale

A chave do jogo precisa autorizar o IP público de saída do BFF. A Vercel utiliza IPs dinâmicos por padrão; o IP do domínio do site não é o IP de saída das Functions.

Se `/api/health` responder normalmente, mas uma consulta do jogo falhar, confira o código do JSON e os Runtime Logs da requisição. O BFF registra `Clash Royale request failed` com o código controlado e o status recebido da API, sem token, cabeçalhos ou resposta original.

| Código                       | Significado                                                                          |
| ---------------------------- | ------------------------------------------------------------------------------------ |
| `UPSTREAM_AUTH_FAILED`       | A API respondeu 401 e recusou a credencial do servidor.                              |
| `UPSTREAM_IP_NOT_ALLOWED`    | A API respondeu 403 com `accessDenied.invalidIp`, confirmando a restrição de IP.     |
| `UPSTREAM_ACCESS_DENIED`     | A API respondeu 403 sem confirmar bloqueio de IP; confira a configuração de acesso.  |
| `UPSTREAM_CONNECTION_FAILED` | Falha de conexão ou resolução de nome antes de receber uma resposta HTTP.            |
| `UPSTREAM_UNAVAILABLE`       | Outra falha; o campo `upstreamStatus` dos logs informa o status HTTP, quando houver. |

### Proxy da RoyaleAPI

Para utilizar o BFF na Vercel gratuita, o servidor pode encaminhar as consultas pelo proxy da RoyaleAPI. Esse é um serviço de terceiros: ele recebe o token do jogo ao encaminhar as chamadas e passa a fazer parte da disponibilidade da integração. As credenciais administrativas do Firebase continuam no BFF e não são enviadas ao proxy.

1. No [portal de desenvolvedores do Clash Royale](https://developer.clashroyale.com/), crie uma chave específica para esse deploy, autorizando o IP `45.79.218.79`, informado na [documentação da RoyaleAPI](https://docs.royaleapi.com/proxy.html).
2. Na Vercel, abra **Settings → Environment Variables** e configure para **Production**:

   ```dotenv
   CLASH_ROYALE_API_PROVIDER=royaleapi
   CLASH_ROYALE_API_TOKEN=TOKEN_DA_NOVA_CHAVE
   ```

   Informe somente o token, sem o prefixo `Bearer`. Configure também em Preview se quiser testar nesse ambiente.

3. Gere um novo deploy após salvar as variáveis.
4. Confira `/api/health`, `/api/player?idclash=89CLLQ08R` e `/api/upcomingchests?idclash=89CLLQ08R`. A saúde confirma o BFF; as outras consultas verificam a chave e o proxy.

Com `royaleapi`, o BFF usa exclusivamente `https://proxy.royaleapi.dev/v1`. As três consultas de jogo usam o mesmo provedor; o navegador continua acessando `/api/*`. Não há troca automática de provedor após falhas. A configuração aceita apenas `official` e `royaleapi`, impedindo destinos arbitrários para o token. Um valor inválido mantém a saúde disponível e retorna `API_PROVIDER_NOT_CONFIGURED` nas consultas externas.

Para testar localmente ou com Docker, configure essas mesmas variáveis no `.env` e reinicie o BFF. Para voltar à API direta, utilize `CLASH_ROYALE_API_PROVIDER=official` e uma chave que autorize o IP de saída desse ambiente.

### API direta com IP fixo

Para consultar diretamente o Clash Royale a partir da Vercel, configure [Static IPs](https://vercel.com/docs/networking/static-ips) em uma região compatível com as Functions e cadastre todos os IPs fornecidos na chave do jogo. O recurso depende de plano e contratação na Vercel; a configuração do repositório não o habilita automaticamente.

Se o ambiente não oferecer IP de saída fixo, a alternativa é hospedar o BFF em um servidor que tenha esse IP. Nesse caso, mantenha os frontends na Vercel e substitua a primeira rewrite `/api/(.*)` por um destino HTTPS absoluto, como `https://seu-bff.example/api/$1`. Preserve a validação do token e das permissões no BFF; mova para esse servidor as credenciais administrativas e o token do jogo. Essa alternativa exige configurar e validar o servidor externo antes da publicação.

Um `/api/health` saudável não confirma a autorização da chave no Clash Royale. Consulte um perfil conhecido depois de configurar o IP e o token.

## Firebase

Adicione o domínio de produção e os previews utilizados em **Authentication → Settings → Authorized domains**. Habilite os provedores de email/senha e Google usados no projeto. Use as instruções de [Autenticação](authentication.md) para conferir os demais requisitos.

As regras em `firebase/firestore.rules` precisam estar aplicadas ao projeto correto após a revisão da transição dos dados antigos. O deploy na Vercel não publica essas regras, não importa dados e não concede papéis administrativos. O primeiro responsável continua sendo configurado conforme [Administração](administration.md).

## Verificar antes de publicar

Para testar pelo orquestrador da própria plataforma, execute na raiz, em um terminal separado:

```powershell
npx vercel dev -L
```

O modo `-L` funciona localmente sem autenticação na Vercel. Abra o endereço informado pelo CLI e confira `/api/health`, a página inicial e uma rota direta, como `/contato`. Encerre com `Ctrl+C` antes dos demais testes. Para um projeto já vinculado, também pode usar `vercel dev`.

Cada frontend tem um `devCommand` próprio, que usa `PORT` ou o argumento `--port` fornecido pelo CLI e preserva os prefixos dos remotos. Esse comando não inicia o conjunto de serviços Docker nem usa as portas fixas do `npm run dev`.

Com as portas locais livres e as dependências instaladas:

```powershell
npm run check
```

```powershell
npm run test:e2e
```

```powershell
npm run test:vercel
```

O último comando gera os sete builds no formato de publicação e testa quatro cenários de navegador com Firebase simulado e gateway local. Não faz deploy nem reproduz toda a infraestrutura da Vercel. Os servidores de teste são encerrados ao final.

Para gerar somente os artefatos usando sua configuração pública local:

```powershell
npm run build:vercel
```

Depois da publicação, confira `/api/health`, `/runtime-config.json` e `/remotes/portal/remoteEntry.js`. Abra diretamente `/contato`, `/entrar`, `/torneios` e `/perfil`, recarregue as páginas, teste os dois métodos de login e consulte perfil e baús com sua conta. Confira a área administrativa com uma conta autorizada, sem criar ou alterar registros reais apenas para testar o deploy.

Se a configuração apontar para `localhost`, verifique se o build foi feito pelos comandos de Services. Se aparecer `tsc: command not found`, confira o comando de instalação definido no arquivo. Se a API responder `403`, confira a chave e o IP de saída autorizado.

## CI

O workflow do GitHub usa a versão de `.nvmrc` e instalação com lockfile. Ele verifica arquitetura, tipos, lint, formatação, testes, builds, os fluxos E2E locais e os artefatos Vercel. Um segundo job verifica Docker, inicialização parcial, gateway e navegação dos serviços. Relatórios são preservados quando há falha.

Os testes usam configuração fictícia e não precisam das credenciais reais. O workflow não publica a aplicação nem modifica o Firebase. Configure o projeto Vercel para o repositório e acompanhe os checks antes de promover um deploy.

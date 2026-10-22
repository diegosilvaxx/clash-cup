# Docker

## Iniciar o portal

Instale o Docker Desktop com suporte a containers Linux e Compose v2. Abra-o e aguarde a inicialização. Para esta execução, Node.js no computador não é necessário.

Na raiz do repositório, crie o ambiente somente se ainda não existir:

```powershell
Copy-Item .env.example .env
```

Preencha o Firebase e o token do Clash Royale conforme o README. Sem essas configurações, as páginas públicas e a saúde dos serviços funcionam; login e consultas ao jogo dependem das respectivas integrações. Não copie o `.env` por cima de um arquivo já configurado.

Encerre os servidores Node que utilizam as portas 5300 a 5305 e 5400. Execute:

```powershell
docker compose up --build --wait
```

```powershell
docker compose ps
```

Os sete serviços devem aparecer como `healthy`. Abra <http://127.0.0.1:5300>. Os endereços independentes e a API usam as mesmas portas da tabela do README. As portas ficam publicadas somente em `127.0.0.1`.

Para acompanhar erros ou encerrar:

```powershell
docker compose logs --tail=100
```

```powershell
docker compose down
```

O build usa Node.js 24.21.0; as telas são servidas por Nginx e o BFF executa o JavaScript compilado. Os containers usam usuários sem privilégios e sistema de arquivos somente leitura, com `/tmp` temporário. O estado de contas e competições continua no Firebase.

## Administração com o JSON local

O caminho Windows de `GOOGLE_APPLICATION_CREDENTIALS` não existe dentro do container. Para utilizar o arquivo já configurado no `.env`, acrescente o arquivo de Compose administrativo:

```powershell
docker compose -f compose.yaml -f compose.admin.yaml up --build --wait
```

O JSON precisa existir no caminho informado. Ele será montado somente no BFF, em modo de leitura; não é copiado para a imagem. `FIREBASE_PROJECT_ID` deve corresponder ao projeto do frontend. As permissões da conta continuam sendo as concedidas no Firebase; iniciar o container não concede acesso administrativo.

Ao usar esse modo, mantenha os dois `-f` nos comandos de atualização do ambiente. Para encerrar, `docker compose down` na mesma pasta remove os serviços do projeto.

Também é possível configurar `FIREBASE_ADMIN_CLIENT_EMAIL` e `FIREBASE_ADMIN_PRIVATE_KEY` no ambiente do servidor, sem o arquivo adicional. Use uma forma de credencial por ambiente. Veja [Administração](administration.md).

## Executar apenas alguns serviços

Cada serviço pode iniciar separadamente. Para BFF e shell:

```powershell
docker compose up --build --wait api shell
```

A navegação do shell e a página Sobre funcionam; a página inicial informa a ausência do remoto público. Para adicionar a apresentação pública:

```powershell
docker compose up --build --wait portal
```

Use **Tentar novamente** na tela com erro. Para login, adicione `auth`; para torneios e ranking, `competition`; para a área do jogador, `player`; e para administração, `admin`. Iniciar o container `admin` não substitui as credenciais e permissões do BFF.

Os comandos `up` acrescentam serviços sem parar os que já estavam ativos. Para começar outra combinação a partir de um ambiente parado, execute `docker compose down` primeiro.

O build de uma imagem pode compilar todas as aplicações para compartilhar as camadas de dependências; somente os serviços nomeados pelo comando ficam em execução.

## Variáveis e roteamento

O shell encaminha `/api/*` para `api:5400` e `/remotes/<nome>/*` para o container correspondente. Esses nomes existem apenas na rede Docker. O navegador carrega os módulos pela URL do shell; não precisa resolver nomes de containers.

Os campos `VITE_FIREBASE_*`, `VITE_SHELL_URL` e `VITE_VIP_SUPPORT_URL` são configurações públicas aplicadas no build. Após alterá-los, repita `up --build`. Os tokens e as credenciais administrativas são exclusivos do BFF e não são argumentos de build. Após alterar um segredo no `.env`, repita `up -d api` usando os mesmos arquivos de Compose do ambiente; `restart` sozinho não reaplica variáveis.

A saúde dos containers verifica o processo de cada serviço. Não confirma token do jogo, IP autorizado, Firebase, permissões da conta ou disponibilidade de todos os remotos.

## Testes isolados

Para executar os testes automatizados, instale as dependências Node e o Chromium conforme o README. Encerre o ambiente real com `docker compose down` e mantenha as portas livres.

```powershell
npm run verify:docker
```

O comando usa `docker/test.env`, com dados fictícios, e o projeto Compose separado `clash-cup-test`. Ele inicia apenas API e shell, verifica a ausência do remoto, adiciona os demais serviços, testa o gateway e executa quatro cenários de navegador em desktop e celular. As chamadas de conta e banco são simuladas; não utiliza a chave administrativa nem grava no Firebase real.

Ao terminar, mostra **Verificação Docker concluída.** e encerra os containers de teste, inclusive se ocorrer falha. Portanto, não deixa um portal rodando ao final. Para voltar ao ambiente real, execute o comando de inicialização da primeira seção, com o arquivo administrativo se necessário.

Se aparecer `ports are not available`, encerre os servidores Node ou containers que utilizam as portas indicadas. Se o daemon não responder, confira se o Docker Desktop está aberto.

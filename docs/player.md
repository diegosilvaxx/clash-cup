# Área do jogador

## Iniciar

Configure o Firebase conforme [Autenticação](authentication.md) e preencha `CLASH_ROYALE_API_TOKEN` no `.env`. O token da API oficial pertence somente ao BFF. Reinicie os serviços após alterar o ambiente.

```powershell
npm run dev
```

Entre pelo portal em <http://127.0.0.1:5300/entrar> e confira o vínculo do jogador em Minha conta. O link **Ver perfil do jogo** abre a nova área.

| Rota        | Conteúdo                                         |
| ----------- | ------------------------------------------------ |
| `/perfil`   | Nome, tag, estatísticas, clã, arena e deck atual |
| `/baus`     | Próximos baús do jogador vinculado               |
| `/area-vip` | Informações públicas de apoio à comunidade       |

Perfil e baús exigem uma sessão autenticada com jogador vinculado. A aplicação espera a restauração da sessão e o carregamento do vínculo antes de consultar o jogo. Uma falha de permissão no vínculo apresenta erro e opção de tentar novamente.

Sem token, a página VIP continua disponível e as consultas do jogo apresentam uma mensagem de indisponibilidade. Confirme também que a chave da API oficial permite o IP de saída do ambiente que executa o BFF.

## Dados e atualização

O novo remoto utiliza os caminhos existentes `/api/player` e `/api/upcomingchests`, pelo mesmo domínio da aplicação. O proxy encaminha as consultas ao BFF. Axios transporta as requisições e Zod valida os campos consumidos tanto no BFF quanto no cliente.

A tag é obtida da sessão compartilhada; não é escolhida por um parâmetro da página. A resposta do perfil deve corresponder à tag consultada. As estatísticas opcionais ausentes são apresentadas como não informadas, preservando valores válidos iguais a zero. Um deck vazio não impede a leitura do restante do perfil.

A lista de baús é ordenada pelo índice informado pela API. O índice zero representa o próximo baú; os seguintes indicam quantos baús o antecedem na sequência. Os nomes são apresentados conforme a resposta do jogo. Não há previsão de horário de abertura.

Cada tela consulta os dados ao abrir e oferece um botão de atualização. **Não há cache próprio nesta etapa**, nem persistência de estatísticas no navegador. Uma política de cache poderá ser adicionada posteriormente com prazo de validade definido para cada recurso.

Ao sair de uma tela, trocar de usuário ou iniciar outra consulta, `AbortController` cancela a requisição anterior. Respostas que chegam depois do cancelamento são ignoradas. Ao detectar a desconexão do cliente, o BFF também cancela a consulta à API externa. Perfil e baús carregam separadamente; uma falha em um deles não impede o outro.

Esta etapa não cria novas coleções nem altera documentos ou regras do Firestore. Os vínculos atuais e antigos continuam sendo carregados pelo pacote `session`. O token oficial não é incluído nos builds do frontend.

## Área VIP

O legado possui apenas uma página informativa de apoio pelo Patreon. Esse comportamento foi preservado, sem inferir se uma conta é ou não assinante e sem conceder benefícios ou permissões a partir da interface.

O botão de apoio é opcional. Configure um endereço HTTPS confirmado em:

```dotenv
VITE_VIP_SUPPORT_URL=https://patreon.com/clashcupbrasil
```

Sem endereço válido, a página informa que os detalhes de apoio serão divulgados em breve. Pagamentos, sincronização com assinaturas e autorização de benefícios exigem uma integração própria antes de serem disponibilizados.

## Execução independente e recuperação

```powershell
npm run dev:player
```

O remoto independente abre em <http://127.0.0.1:5304> e apresenta a área VIP. Para autenticar e consultar o jogo, os links encaminham ao portal integrado em `127.0.0.1:5300`. As portas possuem sessões independentes.

Se o remoto `player` estiver parado, o shell mantém as outras áreas acessíveis e mostra **Tentar novamente**. Inicie o remoto e use esse botão; a recuperação deve continuar válida ao navegar para outra tela e voltar.

## Conferência

```powershell
npm run check
```

```powershell
npm run test:e2e
```

Os testes cobrem campos opcionais, números iguais a zero, resposta de outro jogador, ordenação e ausência de baús, tentativas após falha, cancelamento, respostas atrasadas após troca de conta, proteção das telas e recuperação do remoto. Os cenários de navegador usam respostas simuladas e não dependem do token real.

Para conferir com a API real, entre com uma conta de teste vinculada, abra Perfil e Baús e use os botões de atualização. Navegue entre as telas durante uma consulta lenta e confira se o navegador cancela a chamada anterior. Saia da conta e tente abrir `/perfil` novamente: o portal deve solicitar login. A conferência real confirma o token e a conectividade, que os testes simulados não validam.

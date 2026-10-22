# Autenticação

## Configuração

Use um app Web do mesmo projeto Firebase que contém as contas existentes. Em **Configurações do projeto → Seus apps**, copie os campos da configuração Web para o `.env`:

```dotenv
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_APP_ID=
```

São parâmetros públicos do SDK Web. Credenciais de conta de serviço e chaves privadas não pertencem ao frontend. `CLASH_ROYALE_API_TOKEN` continua sendo exclusivo do backend.

Em **Authentication → Sign-in method**, habilite Google e Email/senha. Em **Authentication → Settings → Authorized domains**, adicione `127.0.0.1` para a execução local. O domínio de produção deverá ser autorizado quando o deploy for preparado.

Após mudar o `.env`, reinicie o desenvolvimento ou gere novamente os builds.

## Regras do Firestore

[firebase/firestore.rules](../firebase/firestore.rules) foi preparado a partir das regras existentes fornecidas durante a migração. Revise o arquivo e aplique seu conteúdo em **Firestore Database → Regras** antes de usar o novo vínculo com dados reais.

O arquivo protege `playerProfiles`: cada usuário consulta e cria apenas seu próprio documento, identificado pelo UID. Somente os quatro campos do vínculo são aceitos; alterações, exclusões, listagem e acesso a outros usuários ficam negados.

As permissões de diferentes `match` são combinadas: basta uma permitir a operação. Por isso a permissão geral exclui expressamente as coleções já protegidas. Uma regra restrita para essa coleção, acompanhada de acesso geral irrestrito, não protege os documentos.

**Ranking, loja e outras coleções ainda não migradas conservam permissões amplas para usuários autenticados.** Torneios e inscrições já têm uma política específica: consulte [a transição das regras de competições](competitions.md#aplicar-as-regras) antes de publicar o arquivo. A restrição de acesso das demais funcionalidades será tratada nas próximas etapas.

Não há publicação automática de regras. Os testes com respostas simuladas não executam as regras no Firebase. No simulador do console, confira:

- Consulta autenticada do próprio `playerProfiles/{uid}`: permitida.
- Consulta sem login ou de outro UID: negada.
- Criação do próprio documento com os quatro campos válidos: permitida.
- Criação para outro UID, campos extras ou alteração de um documento existente: negada.

## Fluxo e rotas

| Endereço            | Comportamento                                 |
| ------------------- | --------------------------------------------- |
| `/entrar`           | Login com Google ou email/senha               |
| `/cadastro`         | Cadastro com confirmação de senha             |
| `/vincular-jogador` | Consulta da tag pela API e criação do vínculo |
| `/minha-conta`      | Jogador vinculado à sessão                    |

As rotas antigas `/signup`, `/registerIdClashRoyale` e `/dashboard` redirecionam para as telas novas. `/dashboard` abre Minha conta; os torneios estão em `/torneios`.

O Firebase restaura a sessão antes de uma rota decidir se exige login. Após autenticar, o sistema procura o vínculo existente. Contas sem vínculo seguem para o formulário da tag. Falhas de leitura apresentam erro e opção de tentar novamente, sem serem tratadas como ausência de cadastro.

O Google abre uma janela ao clicar no botão. Cancelamento, pop-up bloqueado, domínio não autorizado e método desabilitado possuem mensagens específicas. A política de senha configurada no Firebase também é aplicada pelo provedor.

## Dados

Novos vínculos são criados em `playerProfiles/{uid}`:

```text
uid              UID do Firebase Authentication
idUser           Email atual, quando disponível
idClashRoyale    Tag normalizada com #
nome             Nome retornado pela API do Clash Royale
```

A criação exige que o documento não exista, evitando sobrescrita em tentativas concorrentes. Consultar uma tag na API identifica um jogador, mas não comprova a propriedade da conta do jogo.

Para uma conta com email confirmado e sem documento novo, o sistema consulta `users/{email}` do legado e valida `idUser`, `idClashRoyale` e `nome`. O registro deve corresponder ao email autenticado. Essa leitura não altera nem duplica o documento antigo. Contas sem email confirmado não usam a recuperação pelo email.

Os identificadores antigos de inscrições, loja e ranking permanecem preservados para adaptação nas próximas etapas.

## Sessão compartilhada

`@clash-cup/firebase` reúne a aplicação Firebase e os SDKs compartilhados. `@clash-cup/session` contém o driver Firebase, o repositório do vínculo e o estado consumido com `useSyncExternalStore`. O Module Federation compartilha o pacote como singleton: shell e remoto observam a mesma sessão dentro do portal.

A persistência usa a sessão da aba. Recarregar mantém o login; encerrar a sessão da aba encerra essa persistência. O SDK administra os tokens. Aplicações independentes abertas em portas diferentes têm origens distintas e sessões separadas.

Respostas atrasadas após troca de usuário ou logout são descartadas. Operações pendentes bloqueiam envios duplicados; uma falha no vínculo preserva a tag digitada.

## Conferência manual

1. Configure o Firebase, os métodos de login, o domínio autorizado e as regras.
2. Configure `CLASH_ROYALE_API_TOKEN` para consultar jogadores.
3. Execute `npm run dev` e abra o shell.
4. Confira a validação de senhas diferentes no cadastro.
5. Entre com Google ou uma conta de teste por email/senha. O pop-up do Google precisa ser testado no navegador real.
6. Para uma conta nova, vincule a tag e confira o jogador em Minha conta.
7. Navegue para Início, volte para Minha conta e recarregue: a sessão e o vínculo devem permanecer.
8. Clique em Sair e abra `/minha-conta`: o sistema deve solicitar login.
9. Para uma conta antiga com email confirmado, confira o reconhecimento do vínculo existente sem regravá-lo.

Os testes de navegador usam o SDK real com respostas de rede simuladas e configuração fictícia. Seus builds ficam em `dist/e2e`, separados dos normais. Eles não confirmam as configurações do console, OAuth real, validade do token externo nem execução das regras do Firestore.

Referências: [login Google](https://firebase.google.com/docs/auth/web/google-signin), [persistência](https://firebase.google.com/docs/auth/web/auth-state-persistence) e [Firestore REST com Firebase ID token](https://firebase.google.com/docs/firestore/use-rest-api).

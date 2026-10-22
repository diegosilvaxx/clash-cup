# Administração

## Configurar o servidor

O remoto `admin` usa o BFF para todas as operações administrativas. Configure no `.env` da raiz:

```dotenv
FIREBASE_PROJECT_ID=ID_DO_PROJETO_FIREBASE
GOOGLE_APPLICATION_CREDENTIALS=C:/caminho/fora/do/repositorio/firebase-admin.json
```

Use o mesmo projeto informado em `VITE_FIREBASE_PROJECT_ID`. Em **Configurações do projeto → Contas de serviço** no console Firebase, gere a chave privada da conta de serviço e salve o JSON fora do repositório. `GOOGLE_APPLICATION_CREDENTIALS` recebe o caminho desse arquivo, não seu conteúdo. Nunca use o prefixo `VITE_` em credenciais administrativas. Em uma hospedagem com identidade de serviço configurada, as Application Default Credentials podem vir do ambiente, sem arquivo local.

As credenciais do servidor precisam das permissões de Authentication e Firestore correspondentes às operações utilizadas. O projeto de teste deve ter Firestore e os métodos de login configurados. Saúde da API e consultas públicas continuam disponíveis sem configurar a administração.

## Primeiro administrador responsável

Crie ou utilize uma conta de login existente. Em **Authentication → Users**, copie seu UID. No terminal da raiz, substitua os dois valores e execute:

```powershell
npm run admin:role -- --project ID_DO_PROJETO_FIREBASE --uid UID_DA_SUA_CONTA --grant --super-admin
```

Esse comando utiliza as credenciais locais do servidor para definir `admin: true` e `superAdmin: true`. Ele preserva outras custom claims e não usa emails fixos nem documentos da coleção antiga `admins` para conceder privilégios.

Reinicie `npm run dev`, entre na conta e abra <http://127.0.0.1:5300/admin>. Se a conta já estava conectada, use **Atualizar permissões** na tela de acesso restrito ou entre novamente. O menu **Administração** aparece depois da atualização do token.

O procedimento equivalente para revogar uma conta é:

```powershell
npm run admin:role -- --project ID_DO_PROJETO_FIREBASE --uid UID_DA_CONTA --revoke
```

A revogação também invalida as sessões anteriores. Mantenha um administrador responsável disponível para gerir os acessos. O painel protege o papel de responsável e a alteração do próprio acesso; mudanças desse papel usam o procedimento confiável acima.

## Rotas e responsabilidades

| Rota                | Função                                                               |
| ------------------- | -------------------------------------------------------------------- |
| `/admin`            | Resumo e atualização dos dados                                       |
| `/admin/torneios`   | Cadastro, edição de capacidade e abertura/encerramento de inscrições |
| `/admin/saldos`     | Associação de saldo existente ao UID verificado                      |
| `/admin/resultados` | Prévia, confirmação e retomada de importações                        |
| `/admin/acessos`    | Concessão/revogação de administração pelo responsável                |

O remoto usa a porta **5305**, com execução independente por `npm run dev:admin`. O login deve ser realizado pelo portal integrado; portas diferentes mantêm sessões próprias.

A edição de torneios mantém o ID do documento, o identificador antigo e o contador de inscritos. A transação reavalia a ocupação antes de reduzir a capacidade. O encerramento de inscrições preserva o torneio e seu histórico; não há exclusão de torneios neste painel.

A associação de saldo exige UID, registro da verificação de titularidade e confirmação explícita do operador. O servidor verifica a conta no Authentication, o vínculo da tag e a unicidade do saldo. Gold, itens adquiridos e demais campos antigos são preservados. Um saldo já associado a outra conta exige revisão fora deste fluxo; o painel não faz transferência automática.

O responsável pode conceder ou revogar `admin` para contas existentes. O servidor valida seu papel atual, preserva outras claims e invalida as sessões ao revogar. Concessões precisam de atualização do token para aparecer no cliente. Authentication e Firestore são serviços distintos: a auditoria registra a solicitação antes de alterar o papel e a conclusão depois. Um registro de auditoria pendente deve ser confrontado com as claims atuais antes de repetir uma alteração.

## Importação de resultados

1. Informe a tag de um torneio oficial **encerrado**, o ano e o mês da pontuação.
2. Consulte e confira a prévia. Ela ainda não grava créditos.
3. Confirme que o período está correto e que o torneio **não foi creditado pelo sistema antigo**. Os registros antigos não possuem comprovantes suficientes para detectar essa duplicação automaticamente.
4. Confirme a importação. O servidor consulta novamente a API e compara a impressão digital do resultado com a prévia; uma alteração exige nova conferência.
5. Acompanhe o progresso. É possível pausar após o lote atual ou retomar uma importação registrada.

O servidor aceita apenas os resultados consultados na API oficial; o navegador não envia a pontuação a creditar. A importação depende de `CLASH_ROYALE_API_TOKEN` e do IP de saída autorizado no portal Clash Royale.

O registro `resultImports/{tagSemCerquilha}` guarda o período e uma cópia imutável dos participantes consultados. Cada `players/{tag}` registra o comprovante daquele jogador. Na mesma transação, são atualizados:

- Classificação em `ranking`.
- Pontuação do mês em `rankingHistory`.
- Gold em `shop`, na proporção de um Gold por ponto.
- Comprovante do jogador e progresso da importação.

Cada requisição processa até cinco jogadores. A atomicidade é **por jogador**: uma falha não deixa seu crédito incompleto, e jogadores anteriores já concluídos ficam preservados. Retomar pula os comprovantes existentes, inclusive em disputas entre administradores ou após perda da resposta HTTP. O mesmo torneio não pode ser importado em outro período para gerar créditos novamente.

Participantes com zero pontos também recebem comprovante. Saldos existentes com ID não canônico são preservados quando o vínculo é único. Duplicidades e valores inconsistentes interrompem aquele processamento para revisão. Novos saldos não recebem proprietário automaticamente; a associação continua exigindo verificação administrativa.

O painel não oferece edição arbitrária de pontuações, exclusão de comprovantes ou reversão automática de uma importação. Correções de resultados já publicados exigem conciliação pela organização. Não use uma nova tag ou outro período para tentar corrigir créditos anteriores.

## Autorização e regras

O BFF valida o ID token assinado, verifica revogação e consulta as claims atuais da conta antes de cada requisição administrativa. Ocultar o menu ou alterar o estado React não concede acesso ao servidor. Apenas o responsável com `superAdmin` pode gerenciar os acessos.

Publique a versão revisada de [firebase/firestore.rules](../firebase/firestore.rules) após validá-la em uma base de teste. Operações de torneios, associação, ranking e importação administrativa passam pelo SDK do servidor e suas permissões IAM. Gravações administrativas diretas pelo SDK do navegador ficam negadas, inclusive para um token com claim `admin`. As inscrições e compras dos usuários continuam com suas transações e validações específicas.

`resultImports`, seus comprovantes, `adminAudit` e a coleção antiga `admins` não possuem leitura/escrita pelo cliente. As demais coleções ainda não migradas continuam com a política de transição. **A publicação altera o funcionamento de gravações feitas pelo painel antigo.** Planeje a transição no Firebase compartilhado.

## Verificar

```powershell
npm run check
```

```powershell
npm run test:e2e
```

Os testes usam autenticação, banco e respostas externas simulados. Eles cobrem autorização, concessão/revogação, transações, importação repetida/concorrente, falhas de gravação, mudanças no resultado e fluxos da interface. Não alteram papéis nem dados reais e não executam as regras publicadas do Firestore.

Antes de habilitar operações reais, confira em um Firebase de teste: conta comum e token inválido recebem recusa do BFF; administrador comum não gerencia papéis; revogar acesso impede a requisição seguinte; o navegador não escreve em ranking, auditoria ou comprovantes; a conta proprietária continua comprando e se inscrevendo normalmente. Confira também uma importação de teste com reenvio, pausa/retomada e consulta dos três totais.

Referências: [custom claims e validação no servidor](https://firebase.google.com/docs/auth/admin/custom-claims), [configuração do Admin SDK](https://firebase.google.com/docs/admin/setup) e [transações](https://firebase.google.com/docs/firestore/manage-data/transactions).

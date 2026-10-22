# Torneios e inscrições

## Execução

Configure os quatro campos `VITE_FIREBASE_*` no `.env`, conforme [Autenticação](authentication.md). Execute `npm run dev` e abra <http://127.0.0.1:5300/torneios>.

| Rota             | Conteúdo                                  |
| ---------------- | ----------------------------------------- |
| `/torneios`      | Lista pública dos torneios do Firestore   |
| `/torneios/:id`  | Detalhes, vagas, inscrição e cancelamento |
| `/meus-torneios` | Inscrições da conta autenticada           |

O endereço antigo `/torneio` redireciona para a lista. O remoto independente está em <http://127.0.0.1:5303/torneios>, iniciado por `npm run dev:competition`. Para entrar e participar, use o portal integrado; aplicações em portas diferentes possuem sessões separadas.

O token da API oficial não é necessário para listar torneios ou inscrever uma conta que já possui jogador vinculado. A consulta da tag durante um novo vínculo continua dependendo do BFF.

## Documentos e compatibilidade

A origem é a coleção **`tournament` do Firestore**. Não há importação automática de MySQL.

O endereço do torneio usa o ID do documento, que permanece estável. O campo antigo `id` é preservado apenas como referência de compatibilidade: no sistema anterior, ele podia representar uma data e repetir entre torneios.

| Campo antigo                  | Interpretação                                                  |
| ----------------------------- | -------------------------------------------------------------- |
| `name`, `description`, `date` | Nome, descrição e data informada pela organização              |
| `vacancies`                   | Capacidade total                                               |
| `vacanciesAvailable`          | **Vagas ocupadas**, apesar do nome antigo                      |
| `tournamentLink`              | Link externo; a interface aceita somente HTTPS sem credenciais |
| `id`                          | Identificador antigo, opcional e sem garantia de unicidade     |

Contagens antigas em texto são aceitas. Após uma inscrição ou cancelamento, `vacanciesAvailable` passa a ser um inteiro. Documentos inválidos não oferecem vagas; a lista informa quantos precisam de revisão. A capacidade não é corrigida automaticamente. Todas as entradas válidas são consultadas, sem o limite de cinco registros existente no fluxo anterior.

O campo opcional `status: "closed"` encerra novas inscrições; sua ausência equivale a `"open"`. Datas antigas não definem encerramento automático, pois não há um fuso horário consistente nos registros originais.

Novas inscrições ficam em:

```text
competitionRegistrations/{uid}/tournaments/{tournamentDocumentId}
  uid
  tournamentId
  idClashRoyale
  registeredAt       timestamp do servidor
```

A conta precisa ter jogador vinculado. A chave por UID e torneio permite repetir uma tentativa sem consumir outra vaga. A tag é um vínculo cadastral, não uma comprovação de propriedade da conta do jogo.

### Inscrições antigas

Registros de `myTournament` são consultados pelo email confirmado da conta. Havendo um único torneio compatível, a inscrição aparece associada a ele. Duplicidades e torneios removidos aparecem com uma mensagem de revisão, sem escolher um vínculo arbitrário.

**Inscrições antigas são somente leitura nesta etapa.** Para alterá-las, a organização precisa conferir o torneio correto e a contagem de vagas. Ler os registros não os migra, exclui ou regrava. Uma inscrição antiga conhecida impede nova inscrição no mesmo torneio; as regras também verificam o identificador de documento utilizado pelo fluxo original.

## Transações e permissões

O pacote `competitions` usa `runTransaction` do Firestore Lite. A transação lê o torneio e a inscrição antes de gravar e aplica as duas alterações juntas. Em conflitos, o SDK repete a leitura e reavalia a capacidade. A última vaga pode ser ocupada; falhas não confirmam inscrições na interface.

O cancelamento remove somente a inscrição da conta atual e decrementa a ocupação na mesma transação. Tentativas repetidas não decrementam novamente. Contagens inconsistentes impedem alterações e exigem revisão. O documento do torneio registra `lastRegistrationChange` com UID, operação e horário do servidor para validar a gravação conjunta nas regras.

`@clash-cup/firebase` é singleton no Module Federation. Ele reúne a aplicação Firebase e os SDKs de autenticação e Firestore, compartilhando o mesmo usuário autenticado entre shell e remotos.

### Aplicar as regras

Revise [firebase/firestore.rules](../firebase/firestore.rules) antes de publicar pelo console. Não há publicação automática.

**A política desta etapa substitui a escrita antiga em `tournament` e `myTournament`.** Ao aplicá-la no projeto Firebase compartilhado, o cadastro e o cancelamento não atômicos do site antigo deixam de funcionar; o painel antigo também perde escrita de torneios. Planeje a transição antes de publicar em uma base usada pelo sistema antigo. Faça a conferência inicial em um projeto Firebase de teste.

As regras exigem:

- Leitura pública dos torneios e leitura de inscrições somente pelo proprietário.
- Criação ou remoção da inscrição acompanhada da alteração correspondente no contador.
- Contador entre zero e a capacidade, sem alteração dos outros campos do torneio.
- Jogador vinculado para nova inscrição e horário atribuído pelo servidor.
- Escrita de inscrições antigas negada.

A gestão de torneios fica reservada à custom claim `admin: true`, concedida por ambiente confiável; nenhuma tela desta etapa concede esse papel. Enquanto o painel novo não é migrado, o console Firebase pode administrar os torneios. As coleções `shop`, `ranking` e `rankingHistory` também possuem regras específicas, descritas em [Loja, emblemas e ranking](rewards.md). As demais coleções antigas conservam sua política de transição e ainda precisam de revisão nas respectivas etapas.

## Conferência

```powershell
npm run check
```

```powershell
npm run test:e2e
```

Os testes cobrem validação do legado, última vaga, inscrição repetida, cancelamento, conflito, falha de gravação, troca de usuário, leitura pública e recuperação do remoto. Os testes de navegador executam os SDKs reais com respostas de rede simuladas e não alteram documentos reais.

**Esses testes não executam as regras do Firestore.** Antes de publicar a política em produção, valide em uma base de teste: usuário A não pode ler nem alterar inscrições de B; criar inscrição ou alterar contador isoladamente deve falhar; um par de operações válido deve funcionar; duas contas disputando uma vaga devem produzir apenas uma inscrição. Confira também que criar, alterar ou excluir torneios sem papel administrativo é negado.

Para testar a interface com dados reais em uma base isolada, crie pelo console um documento em `tournament` com `name`, `vacancies: 1` e `vacanciesAvailable: 0`. Entre com uma conta de teste vinculada, inscreva-se, recarregue e confira Meus torneios. Cancele e confirme a liberação da vaga. Não use torneios reais para essa verificação.

Referências: [transações](https://firebase.google.com/docs/firestore/manage-data/transactions), [Firestore Lite](https://firebase.google.com/docs/firestore/solutions/firestore-lite) e [validação do estado após a gravação](https://firebase.google.com/docs/reference/rules/rules.firestore#getAfter).

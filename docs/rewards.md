# Loja, emblemas e ranking

## Acessar

Com o Firebase configurado, execute `npm run dev` e abra o portal integrado:

| Rota             | Acesso                      | Conteúdo                                      |
| ---------------- | --------------------------- | --------------------------------------------- |
| `/ranking`       | Público                     | Classificação atual, anual e histórico mensal |
| `/loja`          | Conta com jogador vinculado | Saldo e catálogo de emblemas                  |
| `/meus-emblemas` | Conta com jogador vinculado | Coleção e escolha do emblema em uso           |

O ranking pertence ao remoto `competition` e também abre em <http://127.0.0.1:5303/ranking>. Loja e coleção pertencem ao remoto `player`. Não há novas portas. As consultas desta etapa usam Firestore; o token Clash Royale só é necessário ao consultar o jogo ou vincular uma nova tag.

## Dados preservados

O pacote `rewards` reúne os adaptadores, as transações e o catálogo de 22 emblemas do legado. Os identificadores técnicos e preços foram mantidos. Itens desconhecidos continuam no documento, sem ser removidos ou convertidos automaticamente.

| Coleção          | Campos utilizados                                                            |
| ---------------- | ---------------------------------------------------------------------------- |
| `shop`           | `idClashRoyale`, `gold`, `emotesBuy`, `use`, novo `ownerUid` e `lastUpdated` |
| `ranking`        | `tag`, `name`, `score`, `clan.name` opcional                                 |
| `rankingHistory` | Os campos do ranking, `month` e `year` numéricos                             |

**Gold é uma pontuação interna da comunidade, sem integração com a moeda do jogo ou pagamentos.** Esta etapa não concede Gold nem importa resultados. A administração e a importação idempotente de resultados serão implementadas na etapa 6; não use o importador antigo, que pode creditar o mesmo resultado várias vezes.

### Associação do saldo

Informar uma tag pública não comprova que a conta é dona daquele saldo. Por isso, compras e trocas de emblema exigem `ownerUid` associado por um administrador confiável. O próprio usuário não pode criar saldo, alterar o proprietário ou conceder Gold.

O saldo antigo permanece no mesmo documento e aparece somente para consulta até essa associação. Para habilitar uma conta, a organização deve confirmar a titularidade por um processo próprio e, pelo console Firebase, adicionar `ownerUid` com o UID correto ao documento existente de `shop`. Não duplique o saldo em um novo documento. Confira que existe apenas um registro com aquela `idClashRoyale` e que a tag está no formato `#ABC`, em maiúsculas. A leitura não faz migração nem corrige valores.

Para uma conta sem saldo anterior, um administrador pode criar um documento de teste com:

```text
shop/{tag}
  idClashRoyale: "#P0Y"
  ownerUid: "UID_DA_CONTA_DE_TESTE"
  gold: 10                         inteiro
  emotesBuy: []                     array
  use: ""                          string
```

Use uma base isolada para essa conferência. Não conceda saldo real para executar testes. Documentos duplicados ou valores de saldo inválidos bloqueiam a operação e pedem revisão.

## Compras e propriedade

Cada compra lê o documento atualizado dentro de uma transação e grava saldo, aquisição, emblema equipado e horário do servidor juntos. A transação reavalia o saldo quando o Firestore detecta concorrência. A interface confirma somente após a gravação; erros mantêm o estado anterior e oferecem atualização do saldo.

- Uma compra equipa o item adquirido. Repetir a tentativa de um item já adquirido não cobra novamente.
- O item gratuito também passa a fazer parte da coleção, corrigindo o comportamento do legado.
- Equipar um item já adquirido mantém o saldo. Um item de evento pode ser equipado se já pertencer à conta, mas não pode ser comprado.
- Novas operações ficam desabilitadas enquanto a gravação está em andamento. Respostas de uma conta anterior não atualizam a tela após a troca de sessão.
- A atualização altera somente os campos da compra; outros campos antigos são preservados.

Os preços são verificados nas regras do banco, além da interface. O arquivo `packages/rewards/src/catalog.json` é a fonte para gerar a função de preços:

```powershell
node scripts/shop-rules.mjs
```

`npm run architecture` verifica se catálogo e regras estão sincronizados. Alterar um preço exige regenerar, revisar e publicar as regras junto da versão correspondente do catálogo.

## Classificação

**Atual** usa somente `ranking`, sem atribuir um mês que os dados não comprovam. **Anual** soma os meses de `rankingHistory` do ano escolhido, sem adicionar novamente o ranking atual. **Histórico mensal** apresenta apenas os pares de mês/ano existentes nos registros válidos.

Pontuações zero e classificações com um único participante são exibidas. Empates compartilham a posição, com ordem estável pela tag. A tabela mostra até 25 participantes por página. Registros inválidos e grupos duplicados de tag/período ficam fora da soma e são informados para revisão. A ausência de clã ou emblema não impede a exibição da pontuação.

As três coleções são lidas ao entrar ou atualizar o ranking, e os filtros operam sobre essa consulta. Não há atualização automática ou cache persistente. O volume de leituras cresce com o histórico; uma próxima evolução para grandes volumes deve materializar totais e consultar páginas no servidor.

## Aplicar as regras

Revise [firebase/firestore.rules](../firebase/firestore.rules). Não há publicação automática. **A nova política retira a escrita genérica de usuários autenticados em `shop`, `ranking` e `rankingHistory`.** Compras antigas e importações pelo painel legado deixam de funcionar depois da publicação. Combine a transição antes de aplicar em uma base compartilhada.

Escrita de ranking e concessão/associação de saldo exigem a custom claim `admin: true`, concedida em ambiente confiável, ou o console Firebase. A coleção antiga `admins` não concede esse papel. A leitura pública de `shop`, já utilizada pelo ranking legado, foi mantida; esses documentos não devem conter credenciais nem informações pessoais. As demais coleções ainda não migradas mantêm a política de transição descrita em [Autenticação](authentication.md).

### Verificar em uma base de teste

Os testes automatizados usam dados e rede simulados. **Eles não executam as regras do Firestore.** Antes de publicar em produção, valide a política em um projeto Firebase isolado:

1. Uma conta sem `ownerUid` correspondente não pode comprar, equipar, atribuir proprietário ou criar saldo, mesmo com a mesma tag.
2. A conta proprietária com jogador vinculado consegue comprar pelo preço publicado; saldo e propriedade mudam juntos. Item gratuito é adquirido sem débito.
3. Alterar o payload para aumentar Gold, omitir o débito, reduzir o preço, remover itens adquiridos, trocar `ownerUid`/tag ou adicionar um item de evento deve ser negado.
4. Equipar um item não adquirido deve falhar; equipar um adquirido mantém Gold.
5. Duas compras disputando o mesmo saldo não podem deixá-lo negativo. Repetir uma aquisição não deve cobrar de novo.
6. Visitantes podem ler o ranking; usuários comuns não podem escrever em `ranking` ou `rankingHistory`.

Execute também `npm run check` e `npm run test:e2e`. Os cenários cobrem compras, concorrência, repetição, recuperação de falha, navegação/recarregamento, histórico e acesso público em desktop e celular, sem alterar dados reais.

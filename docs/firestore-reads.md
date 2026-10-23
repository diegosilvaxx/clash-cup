# Leituras do Firestore

A cota mede documentos lidos, não apenas requisições HTTP. Uma consulta que retorna 5 mil documentos consome aproximadamente 5 mil leituras de documentos; também podem existir leituras adicionais de regras e índices. Consulte a [documentação de cobrança do Firebase](https://firebase.google.com/docs/firestore/pricing). A cota exibida é do projeto Firebase inteiro: outros sites e serviços ligados à mesma base também contribuem.

## Consultas públicas

- A home consulta torneios e classificação atual. Não consulta `rankingHistory` nem `shop` para montar os destaques; usa o escudo padrão para os jogadores.
- A página de ranking carrega o histórico apenas ao selecionar Anual ou Histórico mensal. Trocar períodos usa os dados carregados, sem refazer a consulta a cada filtro.
- Catálogo, classificação atual, histórico e emblemas possuem cache em memória de dois minutos. Não há atualização automática por timer. Após expirar, a próxima consulta busca dados novos.
- Chamadas simultâneas para o mesmo recurso compartilham uma Promise. Isso evita consultas duplicadas na montagem de componentes e no Strict Mode do desenvolvimento.
- Os repositórios `competitions` e `rewards` são compartilhados pelo Module Federation: navegar entre home, torneios e ranking reutiliza o mesmo cache na aba.
- Os botões de atualização e de tentar novamente podem ignorar o cache. Cliques enquanto a mesma consulta está em andamento continuam compartilhando aquela consulta. Falhas ficam retidas por dez segundos para evitar repetição causada por remontagens; uma tentativa manual pode ocorrer antes disso.
- Uma inscrição ou cancelamento confirmado invalida o catálogo. Alterar o emblema invalida a consulta pública de emblemas. As transações continuam lendo os dados atuais para validar vagas e saldo.

O cache não guarda respostas em localStorage e é descartado ao recarregar ou fechar a aba. Dados de saldo e inscrições não entram nesse cache público. A listagem pública de torneios não carrega as inscrições privadas da conta; detalhes e Minhas inscrições continuam consultando os dados necessários.

## Limites da otimização

A primeira consulta do catálogo e da classificação ainda lê a coleção correspondente. A primeira abertura do histórico lê os registros históricos, e o ranking completo consulta a coleção de emblemas. O painel administrativo também pode ler coleções inteiras para montar seu resumo. A paginação do ranking atual acontece na interface e não reduz as leituras dessa primeira consulta.

O cache em uma aba não é compartilhado com outros visitantes. Para bases maiores ou tráfego alto, a próxima evolução deve ser paginação no banco e resumos públicos pré-calculados ou cache no servidor. Não há garantia de ficar dentro da cota diária só com o cache do cliente, e uma atualização do código não restaura uma cota já consumida.

## Verificação

`packages/firebase/src/read-cache.test.ts` verifica deduplicação, expiração, atualização explícita, falhas e invalidação de consultas pendentes. Os testes dos repositórios conferem quais coleções são consultadas. `tests/e2e/read-volume.spec.ts` mede chamadas simuladas ao navegar entre os remotos, confirma o carregamento tardio do histórico e verifica a atualização manual.

As fixtures são isoladas e não acessam o Firebase real. Seus contadores medem consultas, não reproduzem a cobrança total do Firestore ou as leituras feitas pelas regras. O total diário real deve ser acompanhado no console depois de publicar a correção.

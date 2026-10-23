# Campeonatos da comunidade

Em **Meus campeonatos**, uma conta autenticada pode organizar uma disputa com 8, 16 ou 32 jogadores. Não é necessário ter jogador do Clash Royale vinculado. Esses campeonatos são independentes dos torneios oficiais, das inscrições e do ranking.

## Primeiro uso

1. Configure o Firebase como descrito em [Autenticação](authentication.md).
2. No console Firebase, abra **Firestore Database → Regras**, revise e publique o conteúdo completo de [firebase/firestore.rules](../firebase/firestore.rules). O bloco `communityChampionships` precisa da exclusão correspondente na política genérica do início do arquivo. Não adicione apenas o bloco mantendo uma regra genérica que autorize qualquer usuário autenticado.
3. Execute `npm run dev`, entre no portal e abra **Meus campeonatos → Criar campeonato**.

Não há nova dependência, variável de ambiente ou serviço de Storage. A capa é recortada para 1000 × 500, convertida para JPEG e limitada a 200 mil caracteres antes de ser salva no documento. O arquivo original pode ser JPG, PNG ou WebP de até 8 MB; o original não é armazenado.

## Criar e publicar

Informe o nome, o tamanho da chave e os participantes. A lista pode ser preenchida manualmente ou importada com um nome por linha. A ordem forma os pares 1 × 2, 3 × 4 etc.; **Sortear confrontos** embaralha essa lista antes da publicação. Os nomes precisam ser distintos, com até 40 caracteres.

Escolha partida única, melhor de 3 ou melhor de 5. A data e o horário são opcionais: o formulário usa seu fuso local, salva o instante em UTC e apresenta a data no fuso de quem acessa. Também é possível informar regras e habilitar a disputa de terceiro lugar.

**Salvar rascunho** exige um nome e permite jogadores ainda não preenchidos. O rascunho fica privado. **Publicar e gerar chaveamento** exige a lista completa. Após publicar, a capa, o formato e os participantes ficam definidos; somente os placares podem mudar.

Use apelidos e imagens que você tenha autorização para divulgar: nomes, capa, regras, data e resultados ficam públicos pelo link após publicar. Email e dados do perfil não são copiados para o campeonato.

## Resultados

O organizador registra os resultados. Um confronto só aceita placar quando seus dois jogadores estão definidos. Não há empate: o vencedor precisa alcançar 1, 2 ou 3 vitórias conforme o formato, e o adversário deve ficar abaixo desse limite.

Os vencedores avançam de rodada; os perdedores das semifinais disputam o terceiro lugar quando habilitado. O campeão recebe destaque ao concluir a final. Os resultados são declarados pelo organizador, sem confirmação automática na API do jogo.

Corrigir um placar pede confirmação e limpa apenas os resultados seguintes dependentes daquele confronto, incluindo o terceiro lugar quando necessário. Resultados independentes permanecem. A interface só confirma o avanço depois da gravação.

Gravações usam transação e revisão do documento. Uma alteração concorrente em outra aba é recusada para não sobrescrever resultados novos. Atualize a página antes de tentar novamente. A leitura é feita ao abrir a página; esta etapa não inclui atualização em tempo real.

## Compartilhar

Um campeonato publicado oferece link público, compartilhamento pelo WhatsApp e download de uma arte JPEG de 1080 × 1350. A arte usa a capa, o nome, o formato, a data, o endereço e, quando houver, o campeão. O arquivo é gerado no navegador e pode ser enviado como imagem em redes sociais.

Nesta etapa, não há QR Code nem imagem dinâmica de prévia ao colar o link em mensageiros. O botão do WhatsApp abre o compartilhamento do link; a arte é baixada separadamente para o usuário anexar.

No celular, os botões de rodada mostram uma fase por vez. No desktop, a chave completa fica disponível com rolagem horizontal dentro do painel quando necessário.

## Dados e permissões

| Rota                      | Acesso                                                  |
| ------------------------- | ------------------------------------------------------- |
| `/meus-campeonatos`       | Lista da conta autenticada                              |
| `/campeonatos/novo`       | Criação autenticada                                     |
| `/campeonatos/:id`        | Pública quando publicado; rascunho exclusivo do criador |
| `/campeonatos/:id/editar` | Edição de rascunho pelo criador                         |

Os documentos ficam em `communityChampionships/{id}`. O UID do criador é atribuído a partir da sessão; as regras conferem propriedade, revisão crescente, horário do servidor, campos permitidos e imutabilidade da configuração publicada. A listagem exige filtro por proprietário. Nenhum visitante pode gravar placares de outro usuário. A política genérica não se aplica à coleção nova.

O modelo e o algoritmo de chaves pertencem a `packages/competitions`; as telas e a geração da arte ficam em `apps/competition`. O shell direciona as novas rotas para o mesmo remoto. A validação detalhada da lista e dos placares é feita por Zod no cliente; as regras protegem o acesso entre contas e a estrutura do documento, sem certificar a veracidade de resultados declarados pelo próprio organizador.

## Conferência

Execute `npm run check` e `npm run test:e2e`, com os serviços de desenvolvimento encerrados. Os testes cobrem geração das três capacidades, validação, avanço, terceiro lugar, correção de resultados, revisão concorrente, troca de sessão, falha de gravação, rascunho, publicação e exportação da arte.

Os testes de navegador usam respostas Firebase simuladas e não publicam regras nem alteram a base real. Antes de usar em produção, valide as regras em um projeto de teste:

- A cria e edita seu rascunho; B e um visitante anônimo não conseguem lê-lo.
- A lista seus campeonatos; B não lista nem altera os campeonatos de A.
- Um visitante abre uma publicação pelo link e não consegue alterar placares.
- A registra um placar; uma segunda aba com revisão antiga recebe conflito.
- A não altera jogadores, formato ou capa após publicar.
- Alterar proprietário, inserir campos extras ou usar revisão e horário inválidos é negado.

As regras do Firestore precisam ser validadas no emulador ou nessa base de teste; as fixtures de navegador não substituem essa validação.

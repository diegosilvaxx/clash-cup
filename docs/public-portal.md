# Portal público

## Páginas

| Rota          | Conteúdo                                                              |
| ------------- | --------------------------------------------------------------------- |
| `/`           | Apresentação e acesso aos torneios, cadastro e ranking                |
| `/sobre`      | Apresentação resumida, disponível no shell mesmo sem o remoto público |
| `/regras`     | Orientações de participação e perguntas frequentes                    |
| `/contato`    | Email da organização e grupo da comunidade                            |
| `/apoiadores` | Bellezi Studio, Jovem Clash e CR Brasil                               |
| `/politicas`  | Dados utilizados por conta, inscrições, ranking, loja e sessão        |

As páginas não exigem login. Início, regras, contato, apoiadores e privacidade são responsabilidade do remoto `portal`. O shell encaminha apenas esses caminhos exatos; endereços desconhecidos continuam mostrando a página não encontrada. A entrada independente do portal também permite acesso direto e recarregamento dessas rotas.

## Conteúdo migrado

Os destinos de email, WhatsApp e dos três apoiadores foram confirmados antes da publicação no código. As imagens dos apoiadores foram copiadas do site original para os assets locais. Os espaços de publicidade sem parceiro definido não foram migrados.

As dúvidas descrevem os fluxos implementados. Não foram preservadas as afirmações antigas de passaportes, prazos de premiação ou frequência garantida dos torneios. Condições específicas devem constar nos detalhes de cada competição. O texto de privacidade descreve a integração atual com Firebase e a API do jogo; não reproduz as ferramentas de publicidade e rastreamento citadas pelo template antigo.

O email utiliza `mailto:contato@clashcup.com.br`. O grupo e os perfis dos apoiadores abrem em nova aba, com esse comportamento indicado no texto e com `noopener noreferrer`. Não há formulário de contato nem integração de envio de mensagens.

## Navegação e acessibilidade

- Cabeçalho e rodapé identificam a página ativa. Os links de navegação e botões têm área de interação de pelo menos 44 px de altura.
- O primeiro link de teclado permite pular para o conteúdo. Ao mudar de rota, o foco acompanha a área principal; não há foco automático na abertura inicial nem a cada atualização de dados.
- O título do documento acompanha o primeiro título principal, inclusive quando o remoto termina de carregar. O contorno de foco permanece nos controles interativos.
- As perguntas frequentes usam `details` e `summary` nativos, com abertura por teclado.
- Grids e navegação se reorganizam em telas estreitas. Tabelas extensas têm região de rolagem acessível por teclado. A preferência por movimento reduzido é respeitada.

Nas aplicações independentes de conta, competições, jogador e administração, os links de início e informações públicas levam ao shell integrado. Os links locais de cada aplicação permanecem locais. Os atalhos do portal independente para cadastro, torneios e ranking também levam ao shell. Esse endereço usa `VITE_SHELL_URL`, com padrão local `http://127.0.0.1:5300`; alterações exigem reinício do desenvolvimento ou novo build.

## Verificar

Execute `npm run check` e `npm run test:e2e` conforme o README. Os cenários adicionados verificam as rotas diretas, contato, apoiadores, destinos das aplicações independentes, títulos, foco, perguntas por teclado, imagens e ausência de rolagem horizontal no conteúdo público em telas de 320 px. O fluxo existente de falha e recuperação do remoto continua verificando o acesso à página Sobre.

Para uma conferência manual, abra as páginas pelo rodapé, recarregue cada endereço e navegue com Tab e Enter. Confira também a exibição no celular, o endereço de cada link e a expansão das perguntas frequentes. Os testes não enviam mensagens nem publicam conteúdo nos serviços externos.

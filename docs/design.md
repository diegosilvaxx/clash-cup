# Identidade visual

O portal utiliza uma base azul-escura, detalhes dourados, ações azuis e ilustrações do universo Clash Royale. A navegação lateral fica fixa no desktop e se transforma em um menu recolhível até 900px. O menu pode ser fechado por seleção, pelo botão de fechar, pelo fundo ou pela tecla Escape. O link para pular ao conteúdo e o foco após navegação continuam disponíveis.

As cores, os botões, os ícones, o escudo e os cards de torneios pertencem a `packages/ui`. As telas de autenticação, competições, jogador, administração e páginas públicas utilizam a mesma base. Não há dependência de uma biblioteca de ícones ou de fontes externas.

A home consulta os repositórios compartilhados de competições e recompensas. Exibe até dois torneios, priorizando inscrições abertas com vagas, e os três primeiros jogadores do ranking atual. Os empates preservam a posição compartilhada. Falhas em uma consulta não ocultam a outra área, e os estados vazios não criam torneios, jogadores ou pontuações ilustrativas.

As artes locais em `packages/ui/src/assets` foram reaproveitadas dos repositórios anteriores: `site-login/src/assets` e `clash-cup-site/img/parallax1.jpg`. Os elementos de Clash Royale pertencem à Supercell e não são abrangidos pela licença do template antigo. Referências: [fankit da Supercell](https://fankit.supercell.com/d/BmehSDJrZNff/game-assets-1) e [política de conteúdo de fãs](https://supercell.com/en/fan-content-policy/). O escudo e os ícones de navegação são elementos SVG do portal.

No build, os endereços das imagens importadas pelo JavaScript são relativos ao próprio módulo. Isso preserva a origem do remoto nos previews com portas separadas e o prefixo `/remotes/<nome>/` na publicação. A configuração usa as [opções de URLs de assets do Vite](https://vite.dev/guide/build#advanced-base-options).

`tests/e2e/layout.spec.ts` verifica imagens, dados reais dos repositórios com fixtures isoladas, navegação, fechamento por teclado e ausência de rolagem horizontal em 320, 360, 768 e 1440px. As capturas de referência são salvas nos artefatos dos testes.

A listagem de torneios limita cada card a 400px, mantendo a largura disponível em telas menores. As páginas têm uma entrada suave; cards e botões respondem ao cursor e ao clique com movimentos curtos. As animações respeitam `prefers-reduced-motion` e os efeitos de elevação ficam restritos a dispositivos com hover.

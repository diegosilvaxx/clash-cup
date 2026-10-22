import { Panel, Questions, ReadingPage, SupportersGrid } from './styles';
import bellezi from '../assets/supporters/bellezi.png';
import jovemClash from '../assets/supporters/jovemclash.jpg';
import crBrasil from '../assets/supporters/crbrasil.jpeg';

const questions = [
  [
    'Como começo a participar?',
    'Crie uma conta por email e senha ou entre com Google. Depois, vincule a tag do seu jogador de Clash Royale. Consulte os torneios e abra os detalhes para conferir datas, vagas e orientações antes de se inscrever.',
  ],
  [
    'Preciso ser jogador profissional?',
    'Não. A comunidade reúne jogadores de diferentes níveis. Confira os critérios de cada torneio para saber se ele é adequado para você.',
  ],
  [
    'A inscrição tem cobrança ou exige passaporte?',
    'O fluxo atual de inscrição não cobra pagamento nem exige passaportes. Confira as condições e eventuais premiações na descrição de cada torneio; o portal não garante prêmios para todas as competições.',
  ],
  [
    'Onde acompanho ou cancelo uma inscrição?',
    'Entre em Meus torneios para acompanhar suas inscrições. As inscrições feitas no novo portal podem ser canceladas enquanto o torneio aceitar essa ação. Registros antigos disponíveis somente para consulta precisam ser tratados com a organização.',
  ],
  [
    'Quando os resultados aparecem no ranking?',
    'A organização importa os resultados após o encerramento do torneio. O ranking mostra os dados publicados e permite consultar o histórico. A classificação da comunidade é diferente dos troféus e das posições do jogo.',
  ],
  [
    'O que é o Gold da loja?',
    'Gold é o saldo de pontos da comunidade, usado para obter emblemas no portal. Ele não é moeda do Clash Royale nem dinheiro. O saldo precisa ser associado à sua conta pela organização.',
  ],
  [
    'Por que meu perfil ou meus baús não carregam?',
    'Essas consultas dependem da API do Clash Royale. Em caso de indisponibilidade, aguarde e use Tentar novamente. Confira também se a tag vinculada está correta; se o problema continuar, entre em contato.',
  ],
];

export function Rules() {
  return (
    <ReadingPage>
      <h1>Regras e dúvidas</h1>
      <p>
        Entenda como participar e consulte as orientações da competição antes de confirmar sua
        inscrição.
      </p>
      <Panel aria-labelledby="fair-play-title">
        <h2 id="fair-play-title">Respeito dentro e fora da arena</h2>
        <p>
          Use sua própria conta, respeite os participantes e siga as orientações da organização.
          Informe problemas pelo canal de contato, com a identificação do torneio e da sua tag.
        </p>
        <p>
          Datas, formato, critérios de participação e eventuais prêmios devem ser conferidos nos
          detalhes de cada torneio.
        </p>
      </Panel>
      <h2>Perguntas frequentes</h2>
      <Questions>
        {questions.map(([question, answer]) => (
          <details key={question}>
            <summary>{question}</summary>
            <p>{answer}</p>
          </details>
        ))}
      </Questions>
    </ReadingPage>
  );
}

export function Contact() {
  return (
    <ReadingPage>
      <h1>Contato</h1>
      <p>Fale com a organização sobre inscrições, resultados, sua conta ou parcerias.</p>
      <Panel aria-labelledby="email-title">
        <h2 id="email-title">Email</h2>
        <p>
          <a href="mailto:contato@clashcup.com.br">contato@clashcup.com.br</a>
        </p>
        <p>
          Ao relatar um problema, informe sua tag e o torneio envolvido. Não envie senhas ou códigos
          de acesso.
        </p>
      </Panel>
      <Panel aria-labelledby="community-contact-title">
        <h2 id="community-contact-title">Grupo da comunidade</h2>
        <p>Converse com outros jogadores e acompanhe os avisos da comunidade.</p>
        <a
          href="https://chat.whatsapp.com/IqS9d0CjV9NBbxsXZuSlCO"
          target="_blank"
          rel="noopener noreferrer"
        >
          Entrar no grupo do WhatsApp (nova aba)
        </a>
      </Panel>
    </ReadingPage>
  );
}

const supporters = [
  {
    name: 'Bellezi Studio',
    handle: '@bellezi_studio',
    url: 'https://www.instagram.com/bellezi_studio/',
    image: bellezi,
  },
  {
    name: 'Jovem Clash',
    handle: '@jovemclash',
    url: 'https://www.instagram.com/jovemclash/',
    image: jovemClash,
  },
  {
    name: 'CR Brasil',
    handle: '@crbrasil1',
    url: 'https://www.instagram.com/crbrasil1/',
    image: crBrasil,
  },
];

export function Supporters() {
  return (
    <ReadingPage>
      <h1>Apoiadores</h1>
      <p>Conheça quem apoia a comunidade Clash Cup Brasil.</p>
      <SupportersGrid>
        {supporters.map(({ name, handle, url, image }) => (
          <article key={name}>
            <img src={image} alt="" width="160" height="160" loading="lazy" />
            <h2>{name}</h2>
            <a href={url} target="_blank" rel="noopener noreferrer">
              {handle} (nova aba)
            </a>
          </article>
        ))}
      </SupportersGrid>
      <Panel>
        <h2>Quer apoiar a comunidade?</h2>
        <p>
          Para conversar sobre uma parceria, escreva para{' '}
          <a href="mailto:contato@clashcup.com.br">contato@clashcup.com.br</a>.
        </p>
      </Panel>
    </ReadingPage>
  );
}

export function Privacy() {
  return (
    <ReadingPage>
      <h1>Dados e privacidade</h1>
      <p>Saiba quais dados são utilizados nas funcionalidades atuais do portal.</p>
      <h2>Conta e jogador</h2>
      <p>
        O login é realizado pelo Firebase Authentication, por email e senha ou Google. O portal
        utiliza o identificador da conta, nome, email e a tag vinculada para identificar o
        participante. A autenticação e as credenciais de login são tratadas pelo Firebase.
      </p>
      <h2>Participação na comunidade</h2>
      <p>
        Vínculos de jogador, inscrições, resultados e registros de emblemas ficam armazenados no
        Firebase. Sair da conta ou limpar os dados do navegador não exclui esses registros.
      </p>
      <p>
        O ranking é público e apresenta informações como nome do jogador, tag, clã, pontuação e
        emblema. Os registros públicos de ranking e loja também podem incluir saldo de Gold e
        identificador da conta, conforme os dados da comunidade.
      </p>
      <h2>Consultas ao jogo</h2>
      <p>
        A tag é utilizada para consultar o perfil e os próximos baús na API do Clash Royale. Essas
        consultas dependem da disponibilidade do serviço externo.
      </p>
      <h2>Sessão neste navegador</h2>
      <p>
        O Firebase utiliza armazenamento do navegador para manter o acesso à conta. Em um
        dispositivo compartilhado, use Sair ao terminar.
      </p>
      <h2>Links e contato</h2>
      <p>
        Os links de apoiadores, grupo e apoio levam a serviços externos, sujeitos às respectivas
        políticas. O contato por email abre seu aplicativo de email; não há formulário de envio de
        mensagens neste portal.
      </p>
      <p>
        Para dúvidas sobre seus dados ou solicitações relacionadas à conta, escreva para{' '}
        <a href="mailto:contato@clashcup.com.br">contato@clashcup.com.br</a>.
      </p>
    </ReadingPage>
  );
}

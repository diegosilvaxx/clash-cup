import { Link } from 'react-router-dom';
import { ActionLink, artwork, Crest, Icon, TournamentTile } from '@clash-cup/ui';
import { findEmblem } from '@clash-cup/rewards';
import { useHighlights } from './useHighlights';
import {
  HomePage,
  Hero,
  HeroActions,
  SecondaryAction,
  Pillars,
  Dashboard,
  Section,
  TournamentGrid,
  RankingPanel,
  ChestShortcut,
  EmptyPanel,
  Community,
} from './home.styles';

export function Home({ shellOrigin = '' }: { shellOrigin?: string }) {
  const destination = (path: string) => (shellOrigin ? new URL(path, shellOrigin).href : path);
  const { tournaments, ranking, leaders, retry } = useHighlights();
  return (
    <HomePage>
      <Hero>
        <img
          className="prince"
          src={artwork.darkPrince}
          alt=""
          width="485"
          height="581"
          fetchPriority="high"
        />
        <img className="archer" src={artwork.magicArcher} alt="" width="700" height="542" />
        <div className="hero-copy">
          <div className="eyebrow">
            <Icon name="crown" size={19} />A sua comunidade de Clash Royale
          </div>
          <h1>
            Entre na arena. <span>Conquiste seu lugar.</span>
          </h1>
          <p>Dispute torneios, suba no ranking e faça parte da comunidade.</p>
          <HeroActions>
            <ActionLink as={Link} to={destination('/torneios')}>
              Explorar torneios
              <Icon name="arrow" size={18} />
            </ActionLink>
            <SecondaryAction as={Link} to={destination('/ranking')}>
              <Icon name="ranking" size={18} />
              Ver ranking
            </SecondaryAction>
          </HeroActions>
        </div>
      </Hero>
      <Pillars aria-label="Na Clash Cup">
        <div>
          <img src={artwork.tournament} width="46" height="46" alt="" />
          <div>
            <strong>COMPITA</strong>
            <span>Torneios da comunidade</span>
          </div>
        </div>
        <div>
          <img src={artwork.trophy} width="46" height="46" alt="" />
          <div>
            <strong>EVOLUA</strong>
            <span>Seu lugar no ranking</span>
          </div>
        </div>
        <div>
          <Crest size={40} />
          <div>
            <strong>CONQUISTE</strong>
            <span>Emblemas exclusivos</span>
          </div>
        </div>
      </Pillars>
      <Dashboard>
        <Section aria-labelledby="featured-title">
          <div className="section-heading">
            <h2 id="featured-title">Torneios em destaque</h2>
            <Link to={destination('/torneios')}>
              Ver todos
              <Icon name="arrow" size={16} />
            </Link>
          </div>
          {tournaments.status === 'loading' ? (
            <EmptyPanel role="status">
              <Icon name="trophy" size={30} />
              <p>Carregando torneios…</p>
            </EmptyPanel>
          ) : tournaments.status === 'error' ? (
            <EmptyPanel>
              <p>Não foi possível carregar os torneios em destaque.</p>
              <button onClick={retry}>Recarregar destaques</button>
            </EmptyPanel>
          ) : !tournaments.data?.length ? (
            <EmptyPanel>
              <Icon name="trophy" size={32} />
              <h3>A próxima disputa vem aí.</h3>
              <p>
                Nenhum torneio disponível no momento. Acompanhe a comunidade para saber das próximas
                inscrições.
              </p>
            </EmptyPanel>
          ) : (
            <TournamentGrid>
              {tournaments.data.map((item) => (
                <TournamentTile
                  key={item.id}
                  name={item.name}
                  description={item.description}
                  date={item.date}
                  occupied={item.occupied}
                  capacity={item.capacity}
                  open={item.open}
                  to={destination(`/torneios/${encodeURIComponent(item.id)}`)}
                />
              ))}
            </TournamentGrid>
          )}
        </Section>
        <div>
          <RankingPanel aria-labelledby="ranking-title">
            <div className="section-heading">
              <h2 id="ranking-title">
                <Icon name="trophy" />
                Ranking da temporada
              </h2>
            </div>
            {ranking.status === 'loading' ? (
              <p role="status">Carregando ranking…</p>
            ) : ranking.status === 'error' ? (
              <p>O ranking está indisponível no momento.</p>
            ) : !leaders.length ? (
              <p>A classificação aparecerá aqui quando os primeiros resultados forem publicados.</p>
            ) : (
              <ol>
                {leaders.map((row) => {
                  const position = leaders.findIndex((leader) => leader.score === row.score) + 1;
                  const emblem = findEmblem(ranking.data?.badges[row.tag] ?? '');
                  return (
                    <li key={row.tag} value={position}>
                      <span className="position">{position}</span>
                      {emblem ? (
                        <img
                          className="emblem"
                          src={emblem.image}
                          alt=""
                          width="30"
                          height="30"
                          loading="lazy"
                        />
                      ) : (
                        <Crest size={25} />
                      )}
                      <span className="name">{row.name}</span>
                      <span className="points">{row.score.toLocaleString('pt-BR')} pts</span>
                    </li>
                  );
                })}
              </ol>
            )}
            <Link className="all-ranking" to={destination('/ranking')}>
              Ver classificação
              <Icon name="arrow" size={17} />
            </Link>
          </RankingPanel>
          <ChestShortcut to={destination('/baus')}>
            <img src={artwork.chest} width="85" height="80" alt="" loading="lazy" />
            <div>
              <strong>Seus próximos baús</strong>
              <p>Fique de olho nas próximas recompensas.</p>
              <span>Acompanhar sequência →</span>
            </div>
          </ChestShortcut>
        </div>
      </Dashboard>
      <Community id="como-funciona">
        <div>
          <h2>Seu próximo desafio começa aqui.</h2>
          <p>Jogue de onde estiver, evolua a cada partida e faça parte da comunidade.</p>
        </div>
        <ActionLink as={Link} to={destination('/cadastro')}>
          Criar minha conta
          <Icon name="arrow" size={18} />
        </ActionLink>
      </Community>
    </HomePage>
  );
}

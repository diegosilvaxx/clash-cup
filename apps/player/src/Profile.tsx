import type { PlayerProfile } from '@clash-cup/session';
import { playerClient, safeExternalUrl } from './api';
import { usePlayerResource } from './usePlayerResource';
import { Button, Deck, Panel, Stats } from './styles';
const format = (value: number | undefined) =>
  value === undefined ? 'Não informado' : value.toLocaleString('pt-BR');
export function Profile({ profile }: { profile: PlayerProfile }) {
  const result = usePlayerResource(profile.uid, profile.idClashRoyale, playerClient.profile);
  const player = result.data;
  return (
    <>
      <h1>Perfil do jogador</h1>
      {result.loading ? (
        <p role="status">Carregando perfil…</p>
      ) : result.error ? (
        <Panel role="alert">
          <p>{result.error}</p>
          <Button onClick={result.refresh}>Tentar novamente</Button>
        </Panel>
      ) : (
        player && (
          <Panel>
            <h2>{player.name}</h2>
            <p>{player.tag}</p>
            <Stats>
              <div>
                <dt>Nível</dt>
                <dd>{format(player.expLevel)}</dd>
              </div>
              <div>
                <dt>Troféus</dt>
                <dd>{format(player.trophies)}</dd>
              </div>
              <div>
                <dt>Recorde de troféus</dt>
                <dd>{format(player.bestTrophies)}</dd>
              </div>
              <div>
                <dt>Vitórias</dt>
                <dd>{format(player.wins)}</dd>
              </div>
              <div>
                <dt>Derrotas</dt>
                <dd>{format(player.losses)}</dd>
              </div>
              <div>
                <dt>Batalhas</dt>
                <dd>{format(player.battleCount)}</dd>
              </div>
              <div>
                <dt>Vitórias de três coroas</dt>
                <dd>{format(player.threeCrownWins)}</dd>
              </div>
              <div>
                <dt>Doações totais</dt>
                <dd>{format(player.totalDonations)}</dd>
              </div>
            </Stats>
            <p>
              <strong>Clã:</strong> {player.clan?.name ?? 'Sem clã'}
            </p>
            <p>
              <strong>Arena:</strong> {player.arena?.name ?? 'Não informada'}
            </p>
            <h2>Deck atual</h2>
            {!player.currentDeck?.length ? (
              <p>O deck atual não foi informado.</p>
            ) : (
              <Deck aria-label="Deck atual">
                {player.currentDeck.map((card) => {
                  const image = safeExternalUrl(card.iconUrls?.medium);
                  return (
                    <li key={card.id}>
                      {image && (
                        <img
                          src={image}
                          alt={card.name}
                          width={80}
                          height={96}
                          loading="lazy"
                          referrerPolicy="no-referrer"
                        />
                      )}
                      <span>{card.name}</span>
                    </li>
                  );
                })}
              </Deck>
            )}
            <Button onClick={result.refresh}>Atualizar perfil</Button>
          </Panel>
        )
      )}
    </>
  );
}

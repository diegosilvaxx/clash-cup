import type { PlayerProfile } from '@clash-cup/session';
import { playerClient } from './api';
import { usePlayerResource } from './usePlayerResource';
import { Button, ChestList, Panel } from './styles';
export function Chests({ profile }: { profile: PlayerProfile }) {
  const result = usePlayerResource(profile.uid, profile.idClashRoyale, playerClient.chests);
  return (
    <>
      <h1>Próximos baús</h1>
      <p>
        Sequência de baús de {profile.nome} · {profile.idClashRoyale}
      </p>
      {result.loading ? (
        <p role="status">Carregando próximos baús…</p>
      ) : result.error ? (
        <Panel role="alert">
          <p>{result.error}</p>
          <Button onClick={result.refresh}>Tentar novamente</Button>
        </Panel>
      ) : (
        result.data && (
          <Panel>
            {result.data.items.length === 0 ? (
              <p>Nenhum baú disponível para este jogador no momento.</p>
            ) : (
              <ChestList aria-label="Sequência de baús">
                {result.data.items.map((item, position) => (
                  <li key={`${item.index}:${position}`}>
                    <strong>{item.name}</strong>
                    <span>
                      {item.index === 0
                        ? 'Próximo baú'
                        : `Após ${item.index} ${item.index === 1 ? 'baú' : 'baús'}`}
                    </span>
                  </li>
                ))}
              </ChestList>
            )}
            <Button onClick={result.refresh}>Atualizar baús</Button>
          </Panel>
        )
      )}
    </>
  );
}

import { useEffect, useState } from 'react';
import { competitions, type Competition } from '@clash-cup/competitions';
import { rewards, selectRanking, type RankingData } from '@clash-cup/rewards';

type Resource<T> =
  { status: 'loading' | 'ready'; data: T | null } | { status: 'error'; data: null };
export function useHighlights() {
  const [revision, setRevision] = useState(0);
  const [tournaments, setTournaments] = useState<Resource<Competition[]>>({
    status: 'loading',
    data: null,
  });
  const [ranking, setRanking] = useState<Resource<RankingData>>({ status: 'loading', data: null });
  useEffect(() => {
    let active = true;
    void competitions.list().then(
      (result) => {
        if (active)
          setTournaments({
            status: 'ready',
            data: [...result.items]
              .sort((a, b) => Number(b.open && b.remaining > 0) - Number(a.open && a.remaining > 0))
              .slice(0, 2),
          });
      },
      () => {
        if (active) setTournaments({ status: 'error', data: null });
      },
    );
    void rewards.ranking().then(
      (result) => {
        if (active) setRanking({ status: 'ready', data: result });
      },
      () => {
        if (active) setRanking({ status: 'error', data: null });
      },
    );
    return () => {
      active = false;
    };
  }, [revision]);
  function retry() {
    setTournaments({ status: 'loading', data: null });
    setRanking({ status: 'loading', data: null });
    setRevision((value) => value + 1);
  }
  return {
    tournaments,
    ranking,
    leaders: ranking.data
      ? selectRanking(ranking.data, { mode: 'current', period: '' }).slice(0, 3)
      : [],
    retry,
  };
}

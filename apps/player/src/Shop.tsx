import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { session, type PlayerProfile } from '@clash-cup/session';
import { emblems, findEmblem, rewards, rewardError, type Wallet } from '@clash-cup/rewards';
import { Button, EmblemGrid, Panel } from './styles';

export function Shop({ profile }: { profile: PlayerProfile }) {
  const ownedOnly = useLocation().pathname === '/meus-emblemas';
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<{
    revision: number;
    wallet: Wallet | null;
    error: string | null;
  } | null>(null);
  const [message, setMessage] = useState<{ error: boolean; text: string } | null>(null);
  const [pending, setPending] = useState(false);
  const busy = useRef(false);
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    let active = true;
    void rewards.wallet(profile).then(
      (wallet) => {
        if (active) setResult({ revision, wallet, error: null });
      },
      (error) => {
        if (active) setResult({ revision, wallet: null, error: rewardError(error) });
      },
    );
    return () => {
      active = false;
    };
  }, [profile, revision]);
  const loading = result?.revision !== revision;
  const wallet = loading ? null : result?.wallet;
  const enabled = wallet?.ownerUid === profile.uid;
  const items = ownedOnly ? emblems.filter((item) => wallet?.emotesBuy.includes(item.id)) : emblems;
  async function act(id: string, action: 'buy' | 'equip') {
    if (!wallet || !enabled || busy.current) return;
    busy.current = true;
    setPending(true);
    setMessage(null);
    try {
      const updated = await rewards.change(profile, wallet.id, id, action);
      if (!mounted.current || session.getSnapshot().user?.uid !== profile.uid) return;
      setResult({ revision, wallet: updated, error: null });
      setMessage({
        error: false,
        text: action === 'buy' ? 'Emblema adquirido e equipado.' : 'Emblema equipado.',
      });
    } catch (error) {
      if (mounted.current && session.getSnapshot().user?.uid === profile.uid)
        setMessage({ error: true, text: rewardError(error) });
    } finally {
      busy.current = false;
      if (mounted.current) setPending(false);
    }
  }
  return (
    <>
      <h1>{ownedOnly ? 'Meus emblemas' : 'Loja de emblemas'}</h1>
      <p>
        Gold é a pontuação da comunidade e pode ser trocado por emblemas do portal. Não é a moeda do
        jogo.
      </p>
      {loading ? (
        <p role="status">Carregando saldo…</p>
      ) : result?.error ? (
        <Panel>
          <p role="alert">{result.error}</p>
          <Button onClick={() => setRevision((value) => value + 1)}>Tentar novamente</Button>
        </Panel>
      ) : (
        <>
          <Panel>
            <h2>Seu saldo: {wallet ? wallet.gold.toLocaleString('pt-BR') : '—'} Gold</h2>
            {!enabled && (
              <p role="status">
                {wallet
                  ? 'Seu saldo anterior está preservado. Peça à organização que associe este saldo à sua conta para comprar ou equipar emblemas.'
                  : 'Seu saldo ainda não foi habilitado. Entre em contato com a organização.'}
              </p>
            )}
            {wallet?.use && (
              <p>Emblema em uso: {findEmblem(wallet.use)?.name ?? 'Emblema antigo'}</p>
            )}
            {wallet?.emotesBuy.some((id) => !findEmblem(id)) && (
              <p>
                Você também possui emblemas antigos que aguardam revisão do catálogo. Eles
                permanecem salvos.
              </p>
            )}
            <Button
              disabled={pending}
              onClick={() => {
                setMessage(null);
                setRevision((value) => value + 1);
              }}
            >
              Atualizar saldo
            </Button>
          </Panel>
          {message && <p role={message.error ? 'alert' : 'status'}>{message.text}</p>}
          {ownedOnly && items.length === 0 && <p>Você ainda não possui emblemas deste catálogo.</p>}
          <EmblemGrid aria-label={ownedOnly ? 'Emblemas adquiridos' : 'Catálogo de emblemas'}>
            {items.map((item) => {
              const owned = wallet?.emotesBuy.includes(item.id);
              const equipped = wallet?.use === item.id && owned;
              return (
                <li key={item.id}>
                  <img src={item.image} alt="" width="90" height="90" loading="lazy" />
                  <h2>{item.name}</h2>
                  <p>
                    {owned
                      ? 'Adquirido'
                      : item.event
                        ? 'Exclusivo de eventos'
                        : item.price === 0
                          ? 'Gratuito'
                          : `${item.price} Gold`}
                  </p>
                  <Button
                    aria-label={`${equipped ? 'Equipado' : owned ? 'Equipar' : 'Adquirir'}: ${item.name}`}
                    disabled={
                      !enabled ||
                      pending ||
                      equipped ||
                      (!owned && (item.event || (wallet?.gold ?? 0) < item.price))
                    }
                    onClick={() => void act(item.id, owned ? 'equip' : 'buy')}
                  >
                    {equipped ? 'Equipado' : owned ? 'Equipar' : item.event ? 'Evento' : 'Adquirir'}
                  </Button>
                </li>
              );
            })}
          </EmblemGrid>
        </>
      )}
    </>
  );
}
